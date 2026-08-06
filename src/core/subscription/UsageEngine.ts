// src/core/subscription/UsageEngine.ts
// Motor unificado de registro de consumos en tiempo real (v1.0.0)
// Responsabilidad ÚNICA: Registrar, consultar y reiniciar consumos por recurso.

import prisma from '@/lib/prisma';
import { ResourceLimitKey } from './types';

export class UsageEngine {
  /**
   * Registra e incrementa el consumo de un recurso para un negocio.
   * Ej: UsageEngine.increment(businessId, "transactions", 1)
   */
  static async increment(
    businessId: string,
    resourceKey: ResourceLimitKey,
    amount: number = 1
  ): Promise<number> {
    if (!businessId) return 0;
    const now = new Date();
    const periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    try {
      const recordKey = `usage_${resourceKey}_${periodKey}`;
      const existing = await (prisma as any).configuracion.findUnique({
        where: { clave_negocioId: { clave: recordKey, negocioId: businessId } }
      });

      const currentVal = existing ? parseInt(existing.valor || '0', 10) : 0;
      const newVal = currentVal + amount;

      await (prisma as any).configuracion.upsert({
        where: { clave_negocioId: { clave: recordKey, negocioId: businessId } },
        create: {
          id: crypto.randomUUID(),
          clave: recordKey,
          valor: String(newVal),
          negocioId: businessId
        },
        update: {
          valor: String(newVal)
        }
      });

      return newVal;
    } catch (err) {
      console.error(`[UsageEngine.increment] Error incrementing ${resourceKey} for business ${businessId}:`, err);
      return 0;
    }
  }

  /**
   * Obtiene el consumo acumulado de un recurso para un negocio durante el periodo actual.
   */
  static async getUsage(
    businessId: string,
    resourceKey: ResourceLimitKey
  ): Promise<number> {
    if (!businessId) return 0;
    const now = new Date();
    const periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    try {
      const recordKey = `usage_${resourceKey}_${periodKey}`;
      const record = await (prisma as any).configuracion.findUnique({
        where: { clave_negocioId: { clave: recordKey, negocioId: businessId } }
      });
      return record ? parseInt(record.valor || '0', 10) : 0;
    } catch (err) {
      console.error(`[UsageEngine.getUsage] Error reading ${resourceKey} for business ${businessId}:`, err);
      return 0;
    }
  }

  /**
   * Reinicia el contador de consumo para un recurso en el negocio.
   */
  static async resetPeriod(
    businessId: string,
    resourceKey: ResourceLimitKey
  ): Promise<void> {
    if (!businessId) return;
    const now = new Date();
    const periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const recordKey = `usage_${resourceKey}_${periodKey}`;

    try {
      await (prisma as any).configuracion.upsert({
        where: { clave_negocioId: { clave: recordKey, negocioId: businessId } },
        create: {
          id: crypto.randomUUID(),
          clave: recordKey,
          valor: '0',
          negocioId: businessId
        },
        update: {
          valor: '0'
        }
      });
    } catch (err) {
      console.error(`[UsageEngine.resetPeriod] Error resetting ${resourceKey} for business ${businessId}:`, err);
    }
  }
}
