import prisma from '../prisma';
import { Prisma } from '@prisma/client';
import { publishDomainEvent } from './eventBus';
import { RewardDispatcher } from './rewardDispatcher';

// ─── RULE COMPILER ────────────────────────────────────────────────────────────
export class RuleCompiler {
  /**
   * Compila reglas serializables (JSON o equivalentes) a una estructura ejecutable.
   */
  static compile(rules: any): any {
    if (!rules) return null;
    return typeof rules === 'string' ? JSON.parse(rules) : rules;
  }
}

// ─── CONDITION EVALUATOR ──────────────────────────────────────────────────────
export class ConditionEvaluator {
  /**
   * Evalúa las condiciones estructuradas contra el payload del evento.
   */
  static evaluate(payload: any, compiledRules: any): boolean {
    if (!compiledRules) return true;
    
    // Si es un grupo de reglas (AND / OR)
    if (compiledRules.condition === 'AND' && Array.isArray(compiledRules.rules)) {
      return compiledRules.rules.every((r: any) => this.evaluateRule(payload, r));
    }
    if (compiledRules.condition === 'OR' && Array.isArray(compiledRules.rules)) {
      return compiledRules.rules.some((r: any) => this.evaluateRule(payload, r));
    }

    return this.evaluateRule(payload, compiledRules);
  }

  private static evaluateRule(payload: any, rule: any): boolean {
    if (!rule || !rule.field) return true;
    
    const value = payload[rule.field];
    const target = rule.value;

    switch (rule.operator) {
      case 'EQUALS':
      case '==':
        return String(value) === String(target);
      case 'GREATER_THAN':
      case '>':
        return parseFloat(String(value)) > parseFloat(String(target));
      case 'LESS_THAN':
      case '<':
        return parseFloat(String(value)) < parseFloat(String(target));
      case 'CONTAINS':
        return Array.isArray(value) ? value.includes(target) : String(value).includes(String(target));
      default:
        return true;
    }
  }
}

// ─── TRIGGER RESOLVER ─────────────────────────────────────────────────────────
export class TriggerResolver {
  /**
   * Resuelve qué misiones o campañas activas escuchan este evento.
   */
  static async resolveActiveQuests(negocioId: string, eventType: string): Promise<any[]> {
    return await prisma.quest.findMany({
      where: {
        negocioId,
        triggerEvent: eventType,
        activa: true
      }
    });
  }
}

// ─── PROGRESS UPDATER ─────────────────────────────────────────────────────────
export class ProgressUpdater {
  /**
   * Actualiza el progreso de la misión de forma atómica en una transacción.
   */
  static async updateProgress(
    userId: string,
    questId: string,
    amount: number,
    targetProgress: number,
    tx: Prisma.TransactionClient
  ): Promise<{ completada: boolean; previouslyCompleted: boolean }> {
    let progress = await tx.questProgress.findUnique({
      where: { questId_userId: { questId, userId } }
    });

    if (!progress) {
      progress = await tx.questProgress.create({
        data: {
          id: crypto.randomUUID(),
          questId,
          userId,
          progresoActual: 0,
          progresoRequerido: targetProgress,
          estado: 'EN_PROGRESO'
        }
      });
    }

    if (progress.estado === 'COMPLETADA' || progress.estado === 'RECLAMADA') {
      return { completada: true, previouslyCompleted: true };
    }

    const nuevoProgreso = progress.progresoActual + amount;
    const completada = nuevoProgreso >= targetProgress;

    await tx.questProgress.update({
      where: { id: progress.id },
      data: {
        progresoActual: completada ? targetProgress : nuevoProgreso,
        estado: completada ? 'COMPLETADA' : 'EN_PROGRESO',
        fechaCompletada: completada ? new Date() : null
      }
    });

    return { completada, previouslyCompleted: false };
  }
}

// ─── EVENT PUBLISHER ──────────────────────────────────────────────────────────
export class EventPublisher {
  /**
   * Emite eventos de dominio correspondientes a la gamificación.
   */
  static async publishQuestCompleted(userId: string, questId: string, payload: any): Promise<void> {
    await publishDomainEvent('USER_QUEST', `${userId}_${questId}`, 'QUEST_COMPLETED', payload);
  }

  static async publishXpGranted(userId: string, xp: number, motive: string): Promise<void> {
    await publishDomainEvent('USER', userId, 'XP_GRANTED', { xp, motive });
  }
}

// ─── MISSION ENGINE (ORCHESTRATOR) ───────────────────────────────────────────
export class MissionEngine {
  /**
   * Procesa de forma unificada el avance de misiones locales y globales.
   * Ahora incluye también el nuevo sistema de BusinessMission desacoplado.
   */
  static async processEvent(negocioId: string, userId: string, eventType: string, payload: any): Promise<void> {
    console.log(`[MissionEngine] Iniciando procesamiento de evento ${eventType} para usuario ${userId}`);

    // 1. Resolver misiones del negocio asociadas al evento (sistema legacy Quest)
    const quests = await TriggerResolver.resolveActiveQuests(negocioId, eventType);

    for (const quest of quests) {
      try {
        // A. Validar segmentación / prerrequisitos
        if (quest.servicioId && payload.servicioId !== quest.servicioId) continue;
        if (quest.montoMinimo && (!payload.monto || payload.monto < quest.montoMinimo)) continue;

        // B. Compilar y evaluar condiciones variables del Rule Engine
        if (quest.condicionesExtra) {
          const compiled = RuleCompiler.compile(quest.condicionesExtra);
          const isConditionValid = ConditionEvaluator.evaluate(payload, compiled);
          if (!isConditionValid) continue;
        }

        // C. Ejecutar actualización atómica en una transacción
        await prisma.$transaction(async (tx) => {
          const targetProgress = quest.cantidadMeta || 1;
          const { completada, previouslyCompleted } = await ProgressUpdater.updateProgress(
            userId,
            quest.id,
            1,
            targetProgress,
            tx
          );

          // D. Si se completó por primera vez, despachar premios y publicar eventos
          if (completada && !previouslyCompleted) {
            console.log(`[MissionEngine] 🎉 Misión completada con éxito: ${quest.nombre} para usuario ${userId}`);
            
            // Publicar evento de dominio
            await EventPublisher.publishQuestCompleted(userId, quest.id, {
              questName: quest.nombre,
              negocioId
            });

            // Despachar recompensas declaradas
            if (quest.acciones) {
              const actions = typeof quest.acciones === 'string' ? JSON.parse(quest.acciones) : quest.acciones;
              if (Array.isArray(actions)) {
                for (const act of actions) {
                  // Acreditar cada recompensa a través del despachador
                  await RewardDispatcher.dispatchReward(
                    userId,
                    'USUARIO',
                    {
                      tipo: act.action || act.tipo,
                      valor: act.value || act.valor
                    },
                    `Completó Misión: ${quest.nombre}`,
                    quest.id,
                    tx
                  );
                }
              }
            }
          }
        });
      } catch (err: any) {
        console.error(`[MissionEngine] Error procesando misión ${quest.id}:`, err.message);
      }
    }

    // 2. Procesar BusinessMissions del nuevo sistema desacoplado Citiox
    //    Usa composición — no duplica lógica, delega al BusinessMissionService
    try {
      const { BusinessMissionService } = await import('./businessMissionService');
      await BusinessMissionService.processUserProgress(negocioId, userId, eventType, payload);
    } catch (err: any) {
      console.error(`[MissionEngine] Error procesando BusinessMissions para ${userId}:`, err.message);
    }
  }
}
