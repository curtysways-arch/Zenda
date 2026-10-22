/**
 * pricingService.ts — Motor canónico de precios efectivos por suscripción.
 *
 * REGLA ARQUITECTÓNICA:
 *   Plan.price        = precio oficial de catálogo (NUNCA se muta por negociación individual)
 *   lockedPrice       = precio congelado para Founders (precio comercial histórico)
 *   SubscriptionPricingOverride = override temporal o permanente por negociación comercial
 *
 * JERARQUÍA DE PRECIO EFECTIVO (mayor prioridad primero):
 *   1. SubscriptionPricingOverride activo y vigente → Source: "NEGOTIATED_PRICE"
 *   2. isFounder=true && lockedPrice!=null          → Source: "FOUNDER"
 *   3. lockedPrice!=null (sin Founder)              → Source: "LOCKED_PRICE"
 *   4. Plan.price (catálogo oficial)                → Source: "PLAN"
 *
 * REGLA DE EXPIRACIÓN:
 *   Override temporal expira → vuelve al precio antes del override (lockedPrice si Founder,
 *   o Plan.price si suscripción regular). NUNCA al precio de catálogo si hay lockedPrice.
 *
 * ADDONS: se suman siempre de forma independiente; no afectan lockedPrice ni overrides.
 */

import prisma from '../prisma';
import crypto from 'crypto';

// ─── Tipos Públicos ───────────────────────────────────────────────────────────

export type EffectivePriceSource =
  | 'PLAN'
  | 'LOCKED_PRICE'
  | 'FOUNDER'
  | 'NEGOTIATED_PRICE';

export type OverrideType = 'PERMANENT' | 'TEMPORARY';
export type OverrideStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

export interface EffectiveSubscriptionPriceResult {
  /** Monto en USD que se cobra en este ciclo */
  amount: number;
  currency: string;
  /** Origen que determinó el precio */
  source: EffectivePriceSource;
  /** Precio oficial del Plan (catálogo) */
  planPrice: number;
  /** Precio negociado activo (si aplica) */
  negotiatedPrice?: number;
  /** Tipo de override activo (si aplica) */
  overrideType?: OverrideType;
  /** Ciclo actual dentro del override temporal */
  currentCycle?: number;
  /** Total de ciclos del override temporal */
  totalCycles?: number;
  /** Ciclos restantes del override temporal */
  remainingCycles?: number;
  /** ID del override activo (si aplica) */
  overrideId?: string;
  /** Precio que regirá en la próxima renovación */
  nextRenewalPrice: number;
  /** Source del precio de renovación */
  nextRenewalSource: EffectivePriceSource;
  /** Fecha desde la que rige el override (si aplica) */
  validFrom?: Date;
  /** Fecha en que expira el override (si aplica) */
  validUntil?: Date;
}

export interface ApplyNegotiatedPriceParams {
  subscriptionId: string;
  amount: number;
  currency?: string;
  /** 'PERMANENT' = permanente; number = cantidad de ciclos de facturación */
  duration: 'PERMANENT' | number;
  reason?: string;
  /** ID del administrador que aplica la negociación */
  createdByAdminId: string;
}

// ─── Lógica Interna ───────────────────────────────────────────────────────────

/**
 * Obtiene el suscripcion con Plan y override activo desde la BD.
 * Función interna — no exportada.
 */
async function fetchSubscriptionWithPricing(subscriptionId: string) {
  return prisma.suscripcion.findUnique({
    where: { id: subscriptionId },
    include: {
      Plan: true,
      pricingOverrides: {
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });
}

// ─── Exportaciones del Servicio ───────────────────────────────────────────────

export const pricingService = {
  /**
   * Función canónica que determina el precio efectivo de una suscripción
   * para el ciclo de facturación actual.
   *
   * Es el único punto de verdad del sistema. Frontend, Billing y APIs
   * deben llamar a este método en lugar de leer Plan.price directamente.
   */
  async getEffectivePrice(subscriptionId: string): Promise<EffectiveSubscriptionPriceResult | null> {
    const sub = await fetchSubscriptionWithPricing(subscriptionId);
    if (!sub) return null;

    const planPrice = Number(sub.Plan?.price ?? 0);
    const currency = (sub as any).currency || 'USD';
    const now = new Date();

    // ── 1. Override de precio negociado activo ──────────────────────────
    const override = sub.pricingOverrides?.[0];
    if (override && override.status === 'ACTIVE') {
      const overrideAmount = Number(override.amount);
      const overrideType = override.type as OverrideType;

      if (overrideType === 'PERMANENT') {
        return {
          amount: overrideAmount,
          currency: override.currency || currency,
          source: 'NEGOTIATED_PRICE',
          planPrice,
          negotiatedPrice: overrideAmount,
          overrideType: 'PERMANENT',
          overrideId: override.id,
          nextRenewalPrice: overrideAmount,
          nextRenewalSource: 'NEGOTIATED_PRICE',
          validFrom: override.startAt ? new Date(override.startAt) : undefined,
        };
      }

      // Override TEMPORAL: verificar ciclos restantes
      const currentCycle = override.currentCycle ?? 1;
      const totalCycles = override.totalCycles ?? 1;
      const remainingCycles = Math.max(0, totalCycles - currentCycle + 1);

      if (remainingCycles > 0) {
        // Determinar el precio de la próxima renovación al expirar el override
        const fallbackPrice = sub.lockedPrice !== null && sub.lockedPrice !== undefined
          ? Number(sub.lockedPrice)
          : planPrice;
        const fallbackSource: EffectivePriceSource = (sub.isFounder && sub.lockedPrice !== null)
          ? 'FOUNDER'
          : (sub.lockedPrice !== null ? 'LOCKED_PRICE' : 'PLAN');

        const isLastCycle = remainingCycles === 1;

        return {
          amount: overrideAmount,
          currency: override.currency || currency,
          source: 'NEGOTIATED_PRICE',
          planPrice,
          negotiatedPrice: overrideAmount,
          overrideType: 'TEMPORARY',
          overrideId: override.id,
          currentCycle,
          totalCycles,
          remainingCycles,
          nextRenewalPrice: isLastCycle ? fallbackPrice : overrideAmount,
          nextRenewalSource: isLastCycle ? fallbackSource : 'NEGOTIATED_PRICE',
          validFrom: override.startAt ? new Date(override.startAt) : undefined,
          validUntil: override.endAt ? new Date(override.endAt) : undefined,
        };
      }

      // El override está marcado ACTIVE pero los ciclos ya se agotaron
      // (puede ocurrir si advanceSubscriptionCycle no se ejecutó aún)
      await pricingService.expireOverride(override.id, 'Ciclos agotados — expiración automática');
    }

    // ── 2. Founder con lockedPrice ──────────────────────────────────────
    if (sub.isFounder && sub.lockedPrice !== null && sub.lockedPrice !== undefined) {
      const founderPrice = Number(sub.lockedPrice);
      return {
        amount: founderPrice,
        currency,
        source: 'FOUNDER',
        planPrice,
        nextRenewalPrice: founderPrice,
        nextRenewalSource: 'FOUNDER',
      };
    }

    // ── 3. lockedPrice sin ser Founder (precio histórico congelado) ─────
    if (sub.lockedPrice !== null && sub.lockedPrice !== undefined) {
      const locked = Number(sub.lockedPrice);
      return {
        amount: locked,
        currency,
        source: 'LOCKED_PRICE',
        planPrice,
        nextRenewalPrice: locked,
        nextRenewalSource: 'LOCKED_PRICE',
      };
    }

    // ── 4. Precio oficial del Plan ──────────────────────────────────────
    return {
      amount: planPrice,
      currency,
      source: 'PLAN',
      planPrice,
      nextRenewalPrice: planPrice,
      nextRenewalSource: 'PLAN',
    };
  },

  /**
   * Aplica un precio negociado a una suscripción existente.
   * Cancela cualquier override previo antes de crear el nuevo.
   *
   * Protección: NO modifica isFounder, founderPosition ni lockedPrice.
   */
  async applyNegotiatedPrice(params: ApplyNegotiatedPriceParams): Promise<{ overrideId: string }> {
    const { subscriptionId, amount, currency = 'USD', duration, reason, createdByAdminId } = params;

    // Validar que la suscripción existe
    const sub = await prisma.suscripcion.findUnique({
      where: { id: subscriptionId },
      include: { Plan: true },
    });
    if (!sub) throw new Error(`Suscripción no encontrada: ${subscriptionId}`);

    const isPermanent = duration === 'PERMANENT';
    const totalCycles = isPermanent ? null : Number(duration);

    if (!isPermanent && (totalCycles === null || totalCycles < 1)) {
      throw new Error('La duración debe ser "PERMANENT" o un número entero positivo de ciclos');
    }

    // Cancelar overrides activos previos
    const existingOverrides = await prisma.subscriptionPricingOverride.findMany({
      where: { subscriptionId, status: 'ACTIVE' },
    });

    for (const existing of existingOverrides) {
      await pricingService.cancelOverride(
        existing.id,
        createdByAdminId,
        `Reemplazado por nueva negociación — ${reason || 'sin razón especificada'}`,
      );
    }

    // Crear el nuevo override
    const overrideId = crypto.randomUUID();
    const now = new Date();

    await prisma.subscriptionPricingOverride.create({
      data: {
        id: overrideId,
        subscription: { connect: { id: subscriptionId } },
        type: isPermanent ? 'PERMANENT' : 'TEMPORARY',
        amount,
        currency,
        status: 'ACTIVE',
        totalCycles: isPermanent ? null : totalCycles,
        currentCycle: 1,
        startAt: now,

        endAt: null, // Se calcula por ciclos, no por fechas absolutas
        reason: reason || null,
        createdBy: createdByAdminId,
      },
    });


    // Registrar en auditoría
    await prisma.subscriptionPricingAudit.create({
      data: {
        id: crypto.randomUUID(),
        subscriptionId,
        businessId: (sub as any).negocioId,
        action: 'NEGOTIATED_PRICE_CREATED',
        previousPrice: sub.lockedPrice !== null ? Number(sub.lockedPrice) : Number((sub as any).Plan?.price ?? 0),
        newPrice: amount,
        overrideType: isPermanent ? 'PERMANENT' : 'TEMPORARY',
        durationCycles: isPermanent ? null : totalCycles,
        reason: reason || null,
        userId: createdByAdminId,
      },
    });

    return { overrideId };
  },

  /**
   * Avanza el ciclo de facturación de un override temporal.
   * Se debe llamar cada vez que se aprueba un pago (billing/approve).
   *
   * Si el override llega a su último ciclo, lo expira automáticamente.
   */
  async advanceSubscriptionCycle(subscriptionId: string): Promise<void> {
    const sub = await fetchSubscriptionWithPricing(subscriptionId);
    if (!sub) return;

    const override = sub.pricingOverrides?.[0];
    if (!override || override.status !== 'ACTIVE' || override.type !== 'TEMPORARY') return;

    const currentCycle = override.currentCycle ?? 1;
    const totalCycles = override.totalCycles ?? 1;

    if (currentCycle >= totalCycles) {
      // Último ciclo completado — expirar el override
      await pricingService.expireOverride(override.id, `Ciclo ${currentCycle}/${totalCycles} completado — expiración automática`);
    } else {
      // Avanzar al siguiente ciclo
      await prisma.subscriptionPricingOverride.update({
        where: { id: override.id },
        data: { currentCycle: currentCycle + 1 },
      });
    }
  },

  /**
   * Expira un override (lo marca como EXPIRED).
   * No lanza error si ya está expirado o cancelado.
   */
  async expireOverride(overrideId: string, reason?: string): Promise<void> {
    const override = await prisma.subscriptionPricingOverride.findUnique({ where: { id: overrideId } });
    if (!override || override.status !== 'ACTIVE') return;

    // Obtener suscripción para el businessId
    const sub = await prisma.suscripcion.findUnique({
      where: { id: override.subscriptionId },
      include: { Plan: true },
    });

    await prisma.subscriptionPricingOverride.update({
      where: { id: overrideId },
      data: { status: 'EXPIRED', endAt: new Date() },
    });

    await prisma.subscriptionPricingAudit.create({
      data: {
        id: crypto.randomUUID(),
        subscriptionId: override.subscriptionId,
        businessId: (sub as any)?.negocioId || override.subscriptionId,
        action: 'NEGOTIATED_PRICE_EXPIRED',
        previousPrice: Number(override.amount),
        newPrice: Number((sub as any)?.Plan?.price ?? 0),
        overrideType: override.type,
        reason: reason || 'Expirado automáticamente',
        userId: 'SYSTEM',
      },
    });
  },

  /**
   * Cancela manualmente un override activo.
   * Registra auditoría con el admin que realizó la cancelación.
   */
  async cancelOverride(overrideId: string, adminId: string, reason?: string): Promise<void> {
    const override = await prisma.subscriptionPricingOverride.findUnique({ where: { id: overrideId } });
    if (!override || override.status !== 'ACTIVE') return;

    // Obtener suscripción para el businessId
    const sub = await prisma.suscripcion.findUnique({
      where: { id: override.subscriptionId },
      include: { Plan: true },
    });

    await prisma.subscriptionPricingOverride.update({
      where: { id: overrideId },
      data: { status: 'CANCELLED', endAt: new Date() },
    });

    await prisma.subscriptionPricingAudit.create({
      data: {
        id: crypto.randomUUID(),
        subscriptionId: override.subscriptionId,
        businessId: (sub as any)?.negocioId || override.subscriptionId,
        action: 'NEGOTIATED_PRICE_CANCELLED',
        previousPrice: Number(override.amount),
        newPrice: Number((sub as any)?.Plan?.price ?? 0),
        overrideType: override.type,
        reason: reason || 'Cancelado por administrador',
        userId: adminId,
      },
    });
  },


  /**
   * Obtiene el historial completo de auditoría de precios de una suscripción.
   */
  async getAuditHistory(subscriptionId: string) {
    return prisma.subscriptionPricingAudit.findMany({
      where: { subscriptionId },
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Obtiene todos los overrides (activos, expirados, cancelados) de una suscripción.
   */
  async getOverrides(subscriptionId: string) {
    return prisma.subscriptionPricingOverride.findMany({
      where: { subscriptionId },
      orderBy: { createdAt: 'desc' },
    });
  },
};
