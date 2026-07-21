import prisma from '@/lib/prisma';
import { RewardCatalogType, WalletCurrencyType, Prisma } from '@prisma/client';
import { WalletService } from './walletService';
import { RewardService } from './rewardService';
import { SeasonService } from './seasonService';
import { NotificationService } from '../notifications/notificationService';

export class AutomationEngine {
  /**
   * Procesa un evento de dominio e identifica si gatilla alguna regla de misión (Rule Engine) o logro (Achievement).
   */
  static async handleDomainEvent(event: {
    eventType: string;
    negocioId: string;
    userId?: string;
    payload: any;
  }) {
    console.log(`[AutomationEngine] Procesando evento de dominio: ${event.eventType}`);
    
    // 1. Evaluar reglas de misiones del Rule Engine
    await this.evaluateQuestRules(event);

    // 2. Evaluar logros permanentes
    await this.evaluateAchievements(event);
  }

  /**
   * Evalúa las reglas relacionales del Rule Engine (QuestRule) y ejecuta sus acciones.
   */
  private static async evaluateQuestRules(event: {
    eventType: string;
    negocioId: string;
    userId?: string;
    payload: any;
  }) {
    const { eventType, negocioId, userId, payload } = event;

    // Buscar reglas activas que coincidan con el triggerEvent de este negocio
    const rules = await prisma.questRule.findMany({
      where: {
        triggerEvent: eventType,
        Quest: {
          negocioId,
          activa: true,
        },
      },
      include: {
        Quest: true,
        Actions: {
          include: {
            Reward: true
          }
        },
      },
    });

    if (rules.length === 0) return;

    for (const rule of rules) {
      try {
        // Evaluar la regla (Ej: cantidad >= 3 o monto >= 100)
        let isMetaReached = false;
        const valorEvaluable = payload[rule.campo] !== undefined ? payload[rule.campo] : payload.valor || payload.amount || 0;
        const valorMetaNumerico = parseFloat(rule.valorMeta);
        const valorEvaluableNumerico = parseFloat(String(valorEvaluable));

        switch (rule.operador) {
          case 'GREATER_THAN_OR_EQUAL':
          case 'GTE':
            isMetaReached = valorEvaluableNumerico >= valorMetaNumerico;
            break;
          case 'GREATER_THAN':
          case 'GT':
            isMetaReached = valorEvaluableNumerico > valorMetaNumerico;
            break;
          case 'EQUALS':
          case 'EQ':
            isMetaReached = valorEvaluableNumerico === valorMetaNumerico;
            break;
          default:
            isMetaReached = valorEvaluableNumerico >= valorMetaNumerico;
            break;
        }

        if (isMetaReached) {
          // Si cumple la regla, ejecutar las acciones asociadas
          await prisma.$transaction(async (tx) => {
            for (const action of rule.Actions) {
              const targetId = userId || negocioId;
              const targetType = userId ? 'USUARIO' : 'NEGOCIO';
              const motive = `Gatillado por regla de misión: ${rule.Quest.nombre}`;

              if (action.rewardCatalogId && action.Reward) {
                // Si la acción está ligada a un premio del catálogo
                await RewardService.processReward(
                  targetId,
                  targetType,
                  action.rewardCatalogId,
                  motive,
                  rule.Quest.id,
                  tx
                );
              } else {
                // Ejecutar acción directa
                await RewardService.processRewardAction(
                  targetId,
                  targetType,
                  action.actionType,
                  action.parametros,
                  motive,
                  rule.Quest.id,
                  tx
                );
              }
            }
          });
        }
      } catch (err: any) {
        console.error(`[AutomationEngine] Error evaluando la regla ${rule.id}:`, err.message);
      }
    }
  }

  /**
   * Evalúa y otorga logros permanentes a negocios o usuarios.
   */
  private static async evaluateAchievements(event: {
    eventType: string;
    negocioId: string;
    userId?: string;
    payload: any;
  }) {
    const { eventType, negocioId, userId, payload } = event;

    // Buscar logros activos
    const achievements = await prisma.achievement.findMany({
      where: {
        tipoTarget: userId ? 'USUARIO' : 'NEGOCIO',
      },
    });

    if (achievements.length === 0) return;

    for (const achievement of achievements) {
      try {
        const targetId = userId || negocioId;
        const targetType = userId ? 'USUARIO' : 'NEGOCIO';

        // Validar si el logro ya fue obtenido
        const alreadyEarned = userId
          ? await prisma.userAchievement.findUnique({
              where: { achievementId_userId: { achievementId: achievement.id, userId: targetId } }
            })
          : await prisma.businessAchievement.findUnique({
              where: { achievementId_negocioId: { achievementId: achievement.id, negocioId: targetId } }
            });

        if (alreadyEarned) continue;

        // Evaluar condiciones del logro (JSON estructurado)
        const cond = typeof achievement.condiciones === 'string'
          ? JSON.parse(achievement.condiciones)
          : (achievement.condiciones as Record<string, any>);

        if (cond.eventType === eventType) {
          const valorEvaluable = payload[cond.campo] !== undefined ? payload[cond.campo] : payload.valor || payload.amount || 0;
          const valorMeta = parseFloat(String(cond.valorMeta));
          const actual = parseFloat(String(valorEvaluable));

          if (actual >= valorMeta) {
            // Desbloquear logro
            await prisma.$transaction(async (tx) => {
              if (userId) {
                await tx.userAchievement.create({
                  data: {
                    achievementId: achievement.id,
                    userId: targetId,
                  },
                });
              } else {
                await tx.businessAchievement.create({
                  data: {
                    achievementId: achievement.id,
                    negocioId: targetId,
                  },
                });
              }

              // Otorgar premio en XP por el logro
              if (achievement.puntosXP > 0) {
                await WalletService.addFunds(
                  targetId,
                  targetType,
                  'XP',
                  achievement.puntosXP,
                  `Logro desbloqueado: ${achievement.nombre}`,
                  achievement.id,
                  tx
                );
              }
            });

            // Enviar notificación de logro
            await NotificationService.createNotification({
              negocioId,
              userId: userId || '',
              tipo: 'PREMIO',
              categoria: 'NOTICIAS',
              titulo: `🏆 ¡Logro Desbloqueado: ${achievement.nombre}!`,
              descripcion: `${achievement.descripcion} (+${achievement.puntosXP} XP)`,
              icono: achievement.icono || 'Award',
              prioridad: 'SUCCESS',
              recipientType: userId ? 'USER' : 'ALL',
            });
          }
        }
      } catch (err: any) {
        console.error(`[AutomationEngine] Error evaluando el logro ${achievement.id}:`, err.message);
      }
    }
  }
}
