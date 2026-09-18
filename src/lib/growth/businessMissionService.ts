import prisma from '@/lib/prisma';
import { BusinessMissionStatus } from '@prisma/client';
import { publishDomainEvent } from '@/lib/growth/eventBus';
import { RewardDispatcher } from '@/lib/growth/rewardDispatcher';

export interface InstallMissionInput {
  missionDefinitionId: string;
  negocioId: string;
  rewardConfiguration?: any;
}

export interface ConfigureRewardInput {
  rewardType: string;   // CASHBACK | COUPON | FREE_SERVICE | PRODUCT | DISCOUNT | OTHER
  value?: number;
  serviceId?: string;
  productId?: string;
  couponId?: string;
  descripcion?: string;
  [key: string]: any;
}

export class BusinessMissionService {
  /**
   * Instala una MissionDefinition en un negocio.
   * NO copia la definición. Solo referencia por ID.
   * Si requiresBusinessReward=true → status: PENDING_REWARD
   * Si requiresBusinessReward=false → status: ACTIVE y publishedAt ahora
   */
  static async install(input: InstallMissionInput) {
    const definition = await prisma.missionDefinition.findUniqueOrThrow({
      where: { id: input.missionDefinitionId },
    });

    if (definition.status !== 'PUBLISHED') {
      throw new Error('Solo se pueden instalar misiones publicadas.');
    }

    const requiresReward = definition.requiresBusinessReward && !input.rewardConfiguration;
    const status: BusinessMissionStatus = requiresReward ? 'PENDING_REWARD' : 'ACTIVE';

    const businessMission = await prisma.businessMission.create({
      data: {
        missionDefinitionId: input.missionDefinitionId,
        negocioId: input.negocioId,
        rewardConfiguration: input.rewardConfiguration ?? null,
        status,
        publishedAt: status === 'ACTIVE' ? new Date() : null,
      },
      include: {
        MissionDefinition: {
          include: { Rewards: { include: { RewardCatalog: true }, orderBy: { orden: 'asc' } } },
        },
      },
    });

    await publishDomainEvent('BUSINESS_MISSION', businessMission.id, 'MISSION_INSTALLED', {
      missionDefinitionId: input.missionDefinitionId,
      negocioId: input.negocioId,
      status,
    });

    return businessMission;
  }

  /**
   * Configura el premio local del negocio para una BusinessMission en PENDING_REWARD.
   * Activa la misión automáticamente tras configurar.
   */
  static async configureReward(businessMissionId: string, config: ConfigureRewardInput) {
    const bm = await prisma.businessMission.findUniqueOrThrow({
      where: { id: businessMissionId },
    });

    if (bm.status !== 'PENDING_REWARD') {
      throw new Error('Esta misión no está pendiente de configuración de premio.');
    }

    const updated = await prisma.businessMission.update({
      where: { id: businessMissionId },
      data: {
        rewardConfiguration: config,
        status: 'ACTIVE',
        publishedAt: new Date(),
      },
    });

    await publishDomainEvent('BUSINESS_MISSION', businessMissionId, 'BUSINESS_REWARD_SELECTED', {
      negocioId: bm.negocioId,
      rewardType: config.rewardType,
    });

    return updated;
  }

  /**
   * Pausa o activa una BusinessMission instalada.
   */
  static async setStatus(businessMissionId: string, status: 'ACTIVE' | 'PAUSED' | 'ENDED') {
    const updated = await prisma.businessMission.update({
      where: { id: businessMissionId },
      data: { status },
    });

    const eventType = status === 'ACTIVE' ? 'MISSION_ACTIVATED'
      : status === 'PAUSED' ? 'MISSION_DEACTIVATED'
      : 'MISSION_ARCHIVED';

    await publishDomainEvent('BUSINESS_MISSION', businessMissionId, eventType, {
      negocioId: updated.negocioId,
      status,
    });

    return updated;
  }

  /**
   * Obtiene las misiones instaladas de un negocio con su definición y recompensas.
   */
  static async getByNegocio(negocioId: string, status?: BusinessMissionStatus) {
    return prisma.businessMission.findMany({
      where: {
        negocioId,
        ...(status && { status }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        MissionDefinition: {
          include: {
            Rewards: { include: { RewardCatalog: true }, orderBy: { orden: 'asc' } },
          },
        },
      },
    });
  }

  /**
   * Obtiene el catálogo de misiones publicadas disponibles para instalar.
   * Excluye las que el negocio ya instaló.
   */
  static async getAvailableCatalog(negocioId: string) {
    const installedIds = (
      await prisma.businessMission.findMany({
        where: { negocioId },
        select: { missionDefinitionId: true },
      })
    ).map((bm) => bm.missionDefinitionId);

    return prisma.missionDefinition.findMany({
      where: {
        status: 'PUBLISHED',
        id: { notIn: installedIds },
      },
      orderBy: [{ createdAt: 'desc' }],
      include: {
        Rewards: { include: { RewardCatalog: true }, orderBy: { orden: 'asc' } },
        Publications: {
          where: { status: 'ACTIVE' },
          orderBy: { prioridad: 'desc' },
          take: 1,
        },
      },
    });
  }

  /**
   * Procesa el avance de un usuario en las BusinessMissions activas del negocio.
   * Se invoca desde el MissionEngine extendido.
   */
  static async processUserProgress(
    negocioId: string,
    userId: string,
    eventType: string,
    payload: any
  ) {
    // 1. Resolver sinónimos de eventos de negocio para interoperabilidad universal
    const matchingEventTypes = [eventType];
    if (eventType === 'APPOINTMENT_COMPLETED' || eventType === 'BOOKING_COMPLETED') {
      matchingEventTypes.push('APPOINTMENT_COMPLETED', 'BOOKING_COMPLETED');
    } else if (eventType === 'RESERVATION_COMPLETED') {
      matchingEventTypes.push('RESERVATION_COMPLETED', 'BOOKING_COMPLETED', 'APPOINTMENT_COMPLETED');
    } else if (eventType === 'LAUNDRY_ORDER_COMPLETED') {
      matchingEventTypes.push('LAUNDRY_ORDER_COMPLETED', 'ORDER_COMPLETED');
    } else if (eventType === 'ORDER_COMPLETED') {
      matchingEventTypes.push('ORDER_COMPLETED', 'PURCHASE_COMPLETED');
    } else if (eventType === 'GYM_ATTENDANCE' || eventType === 'CHECKIN') {
      matchingEventTypes.push('GYM_ATTENDANCE', 'CHECKIN', 'CLASS_ATTENDED');
    }

    // Resolver misiones activas del negocio que escuchan este evento
    const activeMissions = await prisma.businessMission.findMany({
      where: {
        negocioId,
        status: 'ACTIVE',
        MissionDefinition: {
          triggerEvent: { in: Array.from(new Set(matchingEventTypes)) },
          status: 'PUBLISHED',
        },
      },
      include: {
        MissionDefinition: {
          include: {
            Rewards: { include: { RewardCatalog: true }, orderBy: { orden: 'asc' } },
          },
        },
      },
    });

    for (const bm of activeMissions) {
      try {
        const def = bm.MissionDefinition;

        // 2. Evaluar condiciones estructuradas si existen
        if (def.condicionesExtra) {
          const { RuleCompiler, ConditionEvaluator } = await import('@/lib/growth/missionEngine');
          const compiled = RuleCompiler.compile(def.condicionesExtra);
          if (!ConditionEvaluator.evaluate(payload, compiled)) continue;
        }

        // 3. Determinar incremento según tipo de agregación (COUNT | QUANTITY | AMOUNT)
        const config = (def.config as any) || {};
        const condExtra = (def.condicionesExtra as any) || {};
        const aggregation = config.aggregation || condExtra.aggregation || 'COUNT';

        let increment = 1;
        if (aggregation === 'AMOUNT') {
          const rawAmount = payload.monto !== undefined ? payload.monto : (payload.total !== undefined ? payload.total : 1);
          increment = Math.max(1, Math.round(Number(rawAmount)));
        } else if (aggregation === 'QUANTITY') {
          const rawQty = payload.cantidad !== undefined ? payload.cantidad : (payload.itemsCount !== undefined ? payload.itemsCount : 1);
          increment = Math.max(1, Math.round(Number(rawQty)));
        } else {
          increment = 1; // COUNT
        }

        let completionEventToPublish: any = null;
        let businessRewardEventToPublish: any = null;

        await prisma.$transaction(async (tx) => {
          // 4. Idempotencia a nivel de transacción: verificar si entityId ya impactó esta misión
          if (payload.entityId) {
            const alreadyProcessed = await tx.domainEvent.findFirst({
              where: {
                aggregate: 'BUSINESS_MISSION_PROGRESS',
                aggregateId: `${bm.id}_${userId}_${payload.entityId}`
              }
            });
            if (alreadyProcessed) {
              console.log(`[BusinessMissionService] ℹ️ Entidad ${payload.entityId} ya procesada para misión ${bm.id}`);
              return;
            }
          }

          // Buscar o crear progreso
          let progress = await tx.businessMissionProgress.findUnique({
            where: { businessMissionId_userId: { businessMissionId: bm.id, userId } },
          });

          if (!progress) {
            progress = await tx.businessMissionProgress.create({
              data: {
                businessMissionId: bm.id,
                userId,
                progresoActual: 0,
                progresoRequerido: def.cantidadMeta,
                estado: 'EN_PROGRESO',
              },
            });
          }

          if (progress.estado === 'COMPLETADA' || progress.estado === 'RECOMPENSADA') return;

          const nuevoProgreso = progress.progresoActual + increment;
          const completada = nuevoProgreso >= def.cantidadMeta;

          await tx.businessMissionProgress.update({
            where: { id: progress.id },
            data: {
              progresoActual: completada ? def.cantidadMeta : nuevoProgreso,
              estado: completada ? 'COMPLETADA' : 'EN_PROGRESO',
              fechaCompletada: completada ? new Date() : null,
            },
          });

          // Registrar en DomainEvent para trazabilidad e idempotencia
          if (payload.entityId) {
            await tx.domainEvent.create({
              data: {
                aggregate: 'BUSINESS_MISSION_PROGRESS',
                aggregateId: `${bm.id}_${userId}_${payload.entityId}`,
                eventType: completada ? 'MISSION_COMPLETED' : 'PROGRESS_INCREMENTED',
                payload: {
                  businessMissionId: bm.id,
                  userId,
                  entityId: payload.entityId,
                  increment,
                  nuevoProgreso,
                  completada
                },
                status: 'PROCESSED',
                processedAt: new Date()
              }
            });
          }

          if (completada) {
            console.log(`[BusinessMissionService] 🎉 Misión completada: ${def.nombre} para usuario ${userId}`);

            // 1. Despachar recompensas Citiox
            for (const reward of def.Rewards) {
              await RewardDispatcher.dispatchReward(
                userId,
                'USUARIO',
                {
                  tipo: reward.RewardCatalog.tipo,
                  valor: {
                    ...(reward.RewardCatalog.valor as any || {}),
                    ...(reward.RewardCatalog.config as any || {}),
                    negocioId: bm.negocioId,
                  },
                  version: reward.RewardCatalog.version,
                },
                `Completó Misión Citiox: ${def.nombre}`,
                bm.id,
                tx
              );
            }

            // 2. Despachar recompensa local del negocio si existe
            if (bm.rewardConfiguration) {
              const rc = bm.rewardConfiguration as any;
              await RewardDispatcher.dispatchReward(
                userId,
                'USUARIO',
                {
                  tipo: rc.rewardType,
                  valor: {
                    ...rc,
                    negocioId: bm.negocioId,
                  },
                },
                `Premio del negocio: ${def.nombre}`,
                bm.id,
                tx
              );

              // Marcar recompensa dada
              await tx.businessMissionProgress.update({
                where: { id: progress.id },
                data: { recompensaDada: true, estado: 'RECOMPENSADA' },
              });

              businessRewardEventToPublish = {
                userId,
                negocioId,
                missionDefinitionId: def.id,
                rewardType: rc.rewardType,
              };
            } else {
              await tx.businessMissionProgress.update({
                where: { id: progress.id },
                data: { recompensaDada: true, estado: 'RECOMPENSADA' },
              });
            }

            // 3. Preparar evento QUEST_COMPLETED para emisión posterior a la transacción
            completionEventToPublish = {
              userId,
              negocioId,
              missionName: def.nombre,
              missionDefinitionId: def.id,
            };
          }
        });

        // Emisión asíncrona de eventos de dominio fuera de la transacción atómica
        if (businessRewardEventToPublish) {
          await publishDomainEvent('BUSINESS_MISSION', bm.id, 'BUSINESS_REWARD_GRANTED', businessRewardEventToPublish);
        }
        if (completionEventToPublish) {
          await publishDomainEvent('BUSINESS_MISSION', bm.id, 'QUEST_COMPLETED', completionEventToPublish);
        }
      } catch (err: any) {
        console.error(`[BusinessMissionService] Error procesando BusinessMission ${bm.id}:`, err.message);
        await publishDomainEvent('BUSINESS_MISSION', bm.id, 'GLOBAL_REWARD_FAILED', {
          userId,
          error: err.message,
        });
      }
    }
  }

  /**
   * Garantiza que todas las MissionDefinitions con estado PUBLISHED estén instaladas
   * y activas para el negocio correspondiente.
   */
  static async ensureAllMissionsInstalledForNegocio(negocioId: string) {
    const publishedDefs = await prisma.missionDefinition.findMany({
      where: { status: 'PUBLISHED' }
    });

    for (const def of publishedDefs) {
      const existing = await prisma.businessMission.findFirst({
        where: { negocioId, missionDefinitionId: def.id }
      });

      if (!existing) {
        await prisma.businessMission.create({
          data: {
            negocioId,
            missionDefinitionId: def.id,
            status: 'ACTIVE',
            publishedAt: new Date()
          }
        });
      }
    }
  }
}

