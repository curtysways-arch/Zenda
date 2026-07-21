import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { RewardService } from './rewardService';
import { NotificationService } from '../notifications/notificationService';

export class GlobalClientMissionEngine {
  /**
   * Evalúa y procesa el avance de clientes finales en campañas estacionales activas de Citiox (Eventos Citiox).
   */
  static async processClientGlobalCampaigns(
    negocioId: string,
    userId: string,
    eventType: string,
    payload: any,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx || prisma;
    const now = new Date();

    // 1. Buscar campañas de clientes estacionales activas para la fecha actual
    const activeCampaigns = await client.clientGlobalCampaign.findMany({
      where: {
        activa: true,
        fechaInicio: { lte: now },
        fechaFin: { gte: now },
      },
    });

    if (activeCampaigns.length === 0) return;

    for (const campaign of activeCampaigns) {
      try {
        // 2. Verificar participación/opt-in del negocio en esta campaña
        const participation = await client.clientGlobalCampaignParticipation.findUnique({
          where: {
            campaignId_negocioId: {
              campaignId: campaign.id,
              negocioId,
            },
          },
        });

        // Si existe participación y tiene opt-out (participa === false), no procesar
        if (participation && !participation.participa) {
          continue; 
        }

        // 3. Evaluar reglas de la campaña (reglas JSON)
        const reglas = typeof campaign.reglas === 'string'
          ? JSON.parse(campaign.reglas)
          : (campaign.reglas as Record<string, any>);

        if (reglas.triggerEvent !== eventType) {
          continue; // El evento no coincide con el trigger de la campaña
        }

        // Evaluar servicioId o condiciones adicionales si vienen especificadas
        if (reglas.servicioId && payload.servicioId !== reglas.servicioId) {
          continue; 
        }

        if (reglas.montoMinimo && (!payload.monto || payload.monto < reglas.montoMinimo)) {
          continue; 
        }

        const cantidadMeta = reglas.cantidadMeta ? parseInt(String(reglas.cantidadMeta)) : 1;

        // 4. Registrar o actualizar progreso de forma atómica
        // Usamos prisma.$transaction directamente (no client, que puede ser TransactionClient sin $transaction)
        const executeProgress = async (transactionClient: Prisma.TransactionClient) => {
          let progress = await transactionClient.clientGlobalQuestProgress.findUnique({
            where: {
              campaignId_negocioId_userId: {
                campaignId: campaign.id,
                negocioId,
                userId,
              },
            },
          });

          if (!progress) {
            progress = await transactionClient.clientGlobalQuestProgress.create({
              data: {
                campaignId: campaign.id,
                negocioId,
                userId,
                progresoActual: 0,
                completada: false,
              },
            });
          }

          if (progress.completada) return;

          const nuevoProgreso = progress.progresoActual + 1;
          const completada = nuevoProgreso >= cantidadMeta;

          await transactionClient.clientGlobalQuestProgress.update({
            where: { id: progress.id },
            data: {
              progresoActual: completada ? cantidadMeta : nuevoProgreso,
              completada,
              fechaCompletada: completada ? new Date() : null,
            },
          });

          // 5. Si se completó, otorgar recompensa estacional
          if (completada) {
            const recompensas = typeof campaign.recompensas === 'string'
              ? JSON.parse(campaign.recompensas)
              : (campaign.recompensas as Record<string, any>);

            await RewardService.processRewardAction(
              userId,
              'USUARIO',
              recompensas.tipo,
              recompensas.valor,
              `Completó Evento Citiox: ${campaign.nombre}`,
              campaign.id,
              transactionClient
            );

            // Enviar notificación de evento completado
            await NotificationService.createNotification({
              negocioId,
              userId,
              tipo: 'PREMIO',
              categoria: 'PREMIOS',
              titulo: `✨ ¡Evento Citiox Completado: ${campaign.nombre}!`,
              descripcion: `Felicidades, ganaste la recompensa del evento de temporada.`,
              icono: 'Award',
              prioridad: 'SUCCESS',
              recipientType: 'USER',
            });
          }
        };

        if (tx) {
          await executeProgress(tx);
        } else {
          await prisma.$transaction(executeProgress);
        }
      } catch (err: any) {
        console.error(`[GlobalClientMissionEngine] Error procesando campaña ${campaign.id}:`, err.message);
      }
    }
  }
}
