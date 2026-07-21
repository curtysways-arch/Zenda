import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export class SeasonService {
  /**
   * Obtiene o crea una tabla de clasificación (Leaderboard) asociada a una temporada.
   */
  static async getOrCreateLeaderboard(
    seasonId: string | null,
    tipo: 'SEMANAL' | 'MENSUAL' | 'TEMPORADA' | 'HISTORICO',
    nombre: string,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx || prisma;
    const filter = seasonId 
      ? { seasonId, tipo } 
      : { seasonId: null, tipo };

    let leaderboard = await client.leaderboard.findFirst({
      where: filter,
    });

    if (!leaderboard) {
      leaderboard = await client.leaderboard.create({
        data: {
          seasonId,
          tipo,
          nombre,
          activa: true,
        },
      });
    }

    return leaderboard;
  }

  /**
   * Suma puntos a un usuario o negocio en una tabla de clasificación y actualiza los rangos atómicamente.
   */
  static async updateLeaderboardPoints(
    leaderboardId: string,
    targetId: string,
    targetType: 'NEGOCIO' | 'USUARIO',
    pointsToAdd: number,
    tx?: Prisma.TransactionClient
  ) {
    const execute = async (client: Prisma.TransactionClient) => {
      // Buscar o crear la entrada de clasificación
      const filter = targetType === 'NEGOCIO'
        ? { leaderboardId, negocioId: targetId }
        : { leaderboardId, usuarioId: targetId };

      let entry = await client.leaderboardEntry.findFirst({
        where: filter,
      });

      if (!entry) {
        const data = targetType === 'NEGOCIO'
          ? { leaderboardId, negocioId: targetId, puntos: pointsToAdd, rango: 0 }
          : { leaderboardId, usuarioId: targetId, puntos: pointsToAdd, rango: 0 };
        
        entry = await client.leaderboardEntry.create({ data });
      } else {
        await client.leaderboardEntry.update({
          where: { id: entry.id },
          data: {
            puntos: {
              increment: pointsToAdd,
            },
          },
        });
      }

      // Recalcular los rangos del Leaderboard de forma atómica
      const allEntries = await client.leaderboardEntry.findMany({
        where: { leaderboardId },
        orderBy: { puntos: 'desc' },
      });

      // Actualizar rangos en lote secuencial transaccional
      for (let index = 0; index < allEntries.length; index++) {
        const item = allEntries[index];
        const newRango = index + 1;
        
        if (item.rango !== newRango) {
          await client.leaderboardEntry.update({
            where: { id: item.id },
            data: { rango: newRango },
          });
        }
      }
    };

    if (tx) {
      await execute(tx);
    } else {
      await prisma.$transaction(async (client) => {
        await execute(client);
      });
    }
  }

  /**
   * Obtiene la tabla de posiciones clasificada de un Leaderboard.
   */
  static async getLeaderboardRankings(leaderboardId: string, limit: number = 50) {
    return await prisma.leaderboardEntry.findMany({
      where: { leaderboardId },
      include: {
        Negocio: {
          select: { nombre: true, logoUrl: true },
        },
        Usuario: {
          select: { nombre: true },
        },
      },
      orderBy: { rango: 'asc' },
      take: limit,
    });
  }
}
