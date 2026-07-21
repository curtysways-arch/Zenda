import prisma from '../prisma';
import { WalletService } from './walletService';
import { GlobalLevel } from '@prisma/client';

export class LevelResolver {
  private static cache: GlobalLevel[] | null = null;
  private static cacheExpiry: number = 0;
  private static TTL_MS = 5 * 60 * 1000; // Cache por 5 minutos

  /**
   * Obtiene todos los niveles globales activos ordenados por orden ascendente,
   * utilizando una estrategia de caché en memoria para evitar consultas recurrentes.
   */
  static async getGlobalLevels(): Promise<GlobalLevel[]> {
    const now = Date.now();
    if (this.cache && now < this.cacheExpiry) {
      return this.cache;
    }

    console.log('[LevelResolver] Recargando niveles globales desde la base de datos...');
    const levels = await prisma.globalLevel.findMany({
      where: { activo: true },
      orderBy: { orden: 'asc' }
    });

    this.cache = levels;
    this.cacheExpiry = now + this.TTL_MS;
    return levels;
  }

  /**
   * Invalida la caché de niveles globales (ej. cuando el Superadmin edita niveles).
   */
  static invalidateCache(): void {
    console.log('[LevelResolver] Invalidando caché de niveles globales.');
    this.cache = null;
    this.cacheExpiry = 0;
  }

  /**
   * Resuelve el nivel actual del usuario de forma dinámica a partir de su saldo de XP.
   */
  static async resolveUserLevel(userId: string): Promise<{
    currentLevel: GlobalLevel;
    nextLevel: GlobalLevel | null;
    currentXp: number;
    progressPercent: number;
    xpNeededForNext: number;
  }> {
    // 1. Obtener XP acumulada de la Wallet de tipo XP del usuario
    const currentXp = await WalletService.getWalletBalance(userId, 'USUARIO', 'XP');

    // 2. Obtener niveles globales
    const levels = await this.getGlobalLevels();

    if (levels.length === 0) {
      // Retornar un nivel por defecto temporal si no hay niveles creados aún
      const defaultLevel: GlobalLevel = {
        id: 'default-level',
        nombre: 'Novato',
        titulo: 'Novato de Citiox',
        descripcion: 'Nivel inicial en la plataforma',
        xpRequerida: 0,
        orden: 1,
        version: '1.0.0',
        activo: true,
        beneficios: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      return {
        currentLevel: defaultLevel,
        nextLevel: null,
        currentXp,
        progressPercent: 100,
        xpNeededForNext: 0
      };
    }

    // 3. Encontrar el nivel más alto donde xpRequerida <= currentXp
    const currentLevel = [...levels].reverse().find(l => currentXp >= l.xpRequerida) || levels[0];

    // 4. Encontrar el siguiente nivel
    const currentIdx = levels.findIndex(l => l.id === currentLevel.id);
    const nextLevel = currentIdx !== -1 && currentIdx + 1 < levels.length ? levels[currentIdx + 1] : null;

    let progressPercent = 100;
    let xpNeededForNext = 0;

    if (nextLevel) {
      const baseXP = currentLevel.xpRequerida;
      const targetXP = nextLevel.xpRequerida;
      const diffTotal = targetXP - baseXP;
      const diffCurrent = currentXp - baseXP;

      xpNeededForNext = Math.max(0, targetXP - currentXp);
      progressPercent = diffTotal > 0
        ? Math.min(100, Math.max(0, (diffCurrent / diffTotal) * 100))
        : 100;
    }

    return {
      currentLevel,
      nextLevel,
      currentXp,
      progressPercent,
      xpNeededForNext
    };
  }
}
