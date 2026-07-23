import prisma from '@/lib/prisma';
import { MissionDefStatus, MissionCategory, QuestDifficulty } from '@prisma/client';
import { publishDomainEvent } from '@/lib/growth/eventBus';

export interface CreateMissionDefinitionInput {
  nombre: string;
  descripcion: string;
  imagenUrl?: string;
  categoria?: MissionCategory;
  dificultad?: QuestDifficulty;
  triggerEvent: string;
  cantidadMeta?: number;
  condicionesExtra?: any;
  config?: any;
  metadata?: any;
  requiresBusinessReward?: boolean;
  rewardIds?: string[];
}

export interface UpdateMissionDefinitionInput extends Partial<CreateMissionDefinitionInput> {
  status?: MissionDefStatus;
  version?: string;
}

export class MissionDefinitionService {
  /**
   * Crea una nueva definición de misión en estado DRAFT.
   */
  static async create(input: CreateMissionDefinitionInput) {
    const mission = await prisma.missionDefinition.create({
      data: {
        nombre: input.nombre,
        descripcion: input.descripcion,
        imagenUrl: input.imagenUrl ?? null,
        categoria: input.categoria ?? 'RESERVAS',
        dificultad: input.dificultad ?? 'MEDIUM',
        triggerEvent: input.triggerEvent,
        cantidadMeta: input.cantidadMeta ?? 1,
        condicionesExtra: input.condicionesExtra ?? null,
        config: input.config ?? null,
        metadata: input.metadata ?? null,
        requiresBusinessReward: input.requiresBusinessReward ?? false,
        status: 'DRAFT',
      },
      include: { Rewards: { include: { RewardCatalog: true } }, Publications: true },
    });

    if (input.rewardIds && input.rewardIds.length > 0) {
      await prisma.missionRewardDefinition.createMany({
        data: input.rewardIds.map((rewardCatalogId, index) => ({
          missionDefinitionId: mission.id,
          rewardCatalogId,
          orden: index + 1,
        })),
      });
    }

    await publishDomainEvent('MISSION_DEFINITION', mission.id, 'MISSION_DEFINITION_CREATED', {
      nombre: mission.nombre,
      status: mission.status,
    });

    return mission;
  }

  /**
   * Actualiza una definición existente.
   */
  static async update(id: string, input: UpdateMissionDefinitionInput) {
    const existing = await prisma.missionDefinition.findUniqueOrThrow({ where: { id } });

    if (existing.status === 'ARCHIVED') {
      throw new Error('No se puede editar una misión archivada.');
    }

    const updated = await prisma.missionDefinition.update({
      where: { id },
      data: {
        ...(input.nombre && { nombre: input.nombre }),
        ...(input.descripcion !== undefined && { descripcion: input.descripcion }),
        ...(input.imagenUrl !== undefined && { imagenUrl: input.imagenUrl }),
        ...(input.categoria && { categoria: input.categoria }),
        ...(input.dificultad && { dificultad: input.dificultad }),
        ...(input.triggerEvent && { triggerEvent: input.triggerEvent }),
        ...(input.cantidadMeta !== undefined && { cantidadMeta: input.cantidadMeta }),
        ...(input.condicionesExtra !== undefined && { condicionesExtra: input.condicionesExtra }),
        ...(input.config !== undefined && { config: input.config }),
        ...(input.metadata !== undefined && { metadata: input.metadata }),
        ...(input.requiresBusinessReward !== undefined && { requiresBusinessReward: input.requiresBusinessReward }),
        ...(input.status && { status: input.status }),
        ...(input.version && { version: input.version }),
      },
      include: { Rewards: { include: { RewardCatalog: true } }, Publications: true },
    });

    if (input.rewardIds !== undefined) {
      await prisma.missionRewardDefinition.deleteMany({
        where: { missionDefinitionId: id },
      });
      if (input.rewardIds.length > 0) {
        await prisma.missionRewardDefinition.createMany({
          data: input.rewardIds.map((rewardCatalogId, index) => ({
            missionDefinitionId: id,
            rewardCatalogId,
            orden: index + 1,
          })),
        });
      }
    }

    return updated;
  }

  /**
   * Publica una misión: cambia status a PUBLISHED.
   * Puede crear o actualizar la MissionPublication asociada.
   */
  static async publish(id: string, publicationData?: {
    globalSeasonId?: string;
    fechaInicio?: string;
    fechaFin?: string;
    prioridad?: number;
    segmentacion?: any;
  }) {
    const mission = await prisma.missionDefinition.findUniqueOrThrow({
      where: { id },
      include: { Rewards: true },
    });

    // Verificar que tenga al menos un trigger definido
    if (!mission.triggerEvent) {
      throw new Error('La misión debe tener un trigger definido antes de publicarse.');
    }

    // Cambiar estado a PUBLISHED
    const updated = await prisma.missionDefinition.update({
      where: { id },
      data: { status: 'PUBLISHED' },
    });

    // Crear o actualizar publicación
    if (publicationData) {
      await prisma.missionPublication.upsert({
        where: {
          // Buscar publicación DRAFT existente para esta definición
          id: (await prisma.missionPublication.findFirst({
            where: { missionDefinitionId: id, status: 'DRAFT' },
            select: { id: true },
          }))?.id ?? 'new',
        },
        create: {
          missionDefinitionId: id,
          globalSeasonId: publicationData.globalSeasonId ?? null,
          fechaInicio: publicationData.fechaInicio ? new Date(publicationData.fechaInicio) : null,
          fechaFin: publicationData.fechaFin ? new Date(publicationData.fechaFin) : null,
          prioridad: publicationData.prioridad ?? 0,
          segmentacion: publicationData.segmentacion ?? null,
          status: 'ACTIVE',
        },
        update: {
          status: 'ACTIVE',
          globalSeasonId: publicationData.globalSeasonId ?? null,
          fechaInicio: publicationData.fechaInicio ? new Date(publicationData.fechaInicio) : null,
          fechaFin: publicationData.fechaFin ? new Date(publicationData.fechaFin) : null,
          prioridad: publicationData.prioridad ?? 0,
          segmentacion: publicationData.segmentacion ?? null,
        },
      });
    }

    await publishDomainEvent('MISSION_DEFINITION', id, 'MISSION_PUBLISHED', {
      nombre: mission.nombre,
      status: 'PUBLISHED',
    });

    return updated;
  }

  /**
   * Archiva una misión. No la elimina.
   */
  static async archive(id: string) {
    const updated = await prisma.missionDefinition.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    // Desactivar publicaciones activas
    await prisma.missionPublication.updateMany({
      where: { missionDefinitionId: id, status: 'ACTIVE' },
      data: { status: 'ENDED' },
    });

    await publishDomainEvent('MISSION_DEFINITION', id, 'MISSION_ARCHIVED', {
      nombre: updated.nombre,
    });

    return updated;
  }

  /**
   * Elimina una misión solo si está en DRAFT y sin instalaciones.
   */
  static async delete(id: string) {
    const mission = await prisma.missionDefinition.findUniqueOrThrow({
      where: { id },
      include: { BusinessMissions: { take: 1 } },
    });

    if (mission.status !== 'DRAFT') {
      throw new Error('Solo se pueden eliminar misiones en estado DRAFT.');
    }
    if (mission.BusinessMissions.length > 0) {
      throw new Error('Esta misión ya fue instalada por negocios. Archívala en su lugar.');
    }

    await prisma.missionDefinition.delete({ where: { id } });
    return { deleted: true };
  }

  /**
   * Obtiene todas las definiciones con sus recompensas y publicaciones.
   */
  static async getAll(filters?: { status?: MissionDefStatus; categoria?: MissionCategory }) {
    return prisma.missionDefinition.findMany({
      where: {
        ...(filters?.status && { status: filters.status }),
        ...(filters?.categoria && { categoria: filters.categoria }),
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: {
        Rewards: { include: { RewardCatalog: true }, orderBy: { orden: 'asc' } },
        Publications: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { BusinessMissions: true } },
      },
    });
  }

  /**
   * Obtiene una definición por ID con todos sus datos.
   */
  static async getById(id: string) {
    return prisma.missionDefinition.findUniqueOrThrow({
      where: { id },
      include: {
        Rewards: { include: { RewardCatalog: true }, orderBy: { orden: 'asc' } },
        Publications: { orderBy: { createdAt: 'desc' } },
        _count: { select: { BusinessMissions: true } },
      },
    });
  }

  // ─── Gestión de Recompensas Citiox ────────────────────────────────────────

  static async addReward(missionDefinitionId: string, rewardCatalogId: string, orden?: number) {
    const maxOrden = await prisma.missionRewardDefinition.aggregate({
      where: { missionDefinitionId },
      _max: { orden: true },
    });
    return prisma.missionRewardDefinition.create({
      data: {
        missionDefinitionId,
        rewardCatalogId,
        orden: orden ?? (maxOrden._max.orden ?? 0) + 1,
      },
      include: { RewardCatalog: true },
    });
  }

  static async removeReward(missionDefinitionId: string, rewardCatalogId: string) {
    return prisma.missionRewardDefinition.deleteMany({
      where: { missionDefinitionId, rewardCatalogId },
    });
  }

  static async getRewards(missionDefinitionId: string) {
    return prisma.missionRewardDefinition.findMany({
      where: { missionDefinitionId },
      orderBy: { orden: 'asc' },
      include: { RewardCatalog: true },
    });
  }
}
