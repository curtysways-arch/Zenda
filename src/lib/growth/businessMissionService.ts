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
    // Resolver misiones activas del negocio que escuchan este evento
    const activeMissions = await prisma.businessMission.findMany({
      where: {
        negocioId,
        status: 'ACTIVE',
        MissionDefinition: {
          triggerEvent: eventType,
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

        // Evaluar condicionesExtra si existen (reutiliza ConditionEvaluator existente)
        if (def.condicionesExtra) {
          const { RuleCompiler, ConditionEvaluator } = await import('@/lib/growth/missionEngine');
          const compiled = RuleCompiler.compile(def.condicionesExtra);
          if (!ConditionEvaluator.evaluate(payload, compiled)) continue;
        }

        await prisma.$transaction(async (tx) => {
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

          const nuevoProgreso = progress.progresoActual + 1;
          const completada = nuevoProgreso >= def.cantidadMeta;

          await tx.businessMissionProgress.update({
            where: { id: progress.id },
            data: {
              progresoActual: completada ? def.cantidadMeta : nuevoProgreso,
              estado: completada ? 'COMPLETADA' : 'EN_PROGRESO',
              fechaCompletada: completada ? new Date() : null,
            },
          });

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
                  valor: rc,
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

              await publishDomainEvent('BUSINESS_MISSION', bm.id, 'BUSINESS_REWARD_GRANTED', {
                userId,
                negocioId,
                missionDefinitionId: def.id,
                rewardType: rc.rewardType,
              });
            } else {
              await tx.businessMissionProgress.update({
                where: { id: progress.id },
                data: { recompensaDada: true, estado: 'RECOMPENSADA' },
              });
            }

            // 3. Emitir QUEST_COMPLETED al DomainEvent store
            await publishDomainEvent('BUSINESS_MISSION', bm.id, 'QUEST_COMPLETED', {
              userId,
              negocioId,
              missionName: def.nombre,
              missionDefinitionId: def.id,
            });
          }
        });
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

