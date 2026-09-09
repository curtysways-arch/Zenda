/**
 * @file addonService.ts
 * @module lib/services
 * @description Servicio canónico para la gestión comercial y ciclo de vida de Add-ons en Citiox.
 */

import prisma from '@/lib/prisma';
import { Addon, SubscriptionAddon, SubscriptionAddonStatus, SubscriptionAddonAction } from '@prisma/client';

export interface AddonAvailabilityDTO {
  addon: Addon;
  isPurchased: boolean;
  activeContract?: {
    id: string;
    quantity: number;
    priceContracted: number;
    status: SubscriptionAddonStatus;
    cancelAtPeriodEnd: boolean;
    effectiveUntil: Date | null;
  };
  available: boolean;
  ineligibilityReason?: string;
}

export const addonService = {
  /**
   * Obtiene todos los add-ons del catálogo (para Superadmin o vista global).
   */
  async getAllAddons(includeInactive = false) {
    return prisma.addon.findMany({
      where: includeInactive ? {} : { active: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
    });
  },

  /**
   * Obtiene el catálogo de add-ons evaluando disponibilidad para un negocio específico.
   */
  async getAddonsForBusiness(businessId: string): Promise<AddonAvailabilityDTO[]> {
    const business = await prisma.negocio.findUnique({
      where: { id: businessId },
      include: {
        BusinessType: {
          include: { planFamily: true }
        },
        Suscripcion: {
          include: {
            Plan: {
              include: {
                planEntitlements: {
                  where: { enabled: true },
                  include: { module: true }
                }
              }
            },
            subscriptionAddons: {
              include: { addon: true }
            }
          }
        }
      }
    });

    if (!business) {
      throw new Error('Negocio no encontrado');
    }

    const sub = business.Suscripcion;
    const plan = sub?.Plan;
    const familyCode = business.BusinessType?.planFamily?.code;
    const activeModuleCodes = new Set(plan?.planEntitlements.map(pe => pe.module.code) || []);

    const [allAddons, dependencies] = await Promise.all([
      prisma.addon.findMany({
        where: { active: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
      }),
      prisma.moduleDependency.findMany()
    ]);

    // Mapear contratos existentes del negocio
    const contractMap = new Map<string, SubscriptionAddon>();
    if (sub?.subscriptionAddons) {
      for (const sa of sub.subscriptionAddons) {
        contractMap.set(sa.addonId, sa);
      }
    }

    const result: AddonAvailabilityDTO[] = [];

    for (const addon of allAddons) {
      const contract = contractMap.get(addon.id);
      const isPurchased = Boolean(
        contract && (contract.status === 'ACTIVE' || (contract.cancelAtPeriodEnd && contract.effectiveUntil && new Date(contract.effectiveUntil) > new Date()))
      );

      let available = true;
      let ineligibilityReason: string | undefined = undefined;

      // 1. Validar compatibilidad de familia si está restringida
      if (addon.applicableFamilies) {
        try {
          const families = JSON.parse(addon.applicableFamilies);
          if (Array.isArray(families) && familyCode && !families.includes(familyCode)) {
            available = false;
            ineligibilityReason = `No compatible con la familia de negocio actual (${familyCode})`;
          }
        } catch (_) {}
      }

      // 2. Si es CAPABILITY y el plan base ya lo incluye por entitlement
      if (available && addon.type === 'CAPABILITY') {
        if (activeModuleCodes.has(addon.targetKey)) {
          available = false;
          ineligibilityReason = 'Ya incluido de base en tu plan actual';
        }
      }

      // 3. Validar dependencias requeridas
      if (available && addon.type === 'CAPABILITY') {
        const requiredDeps = dependencies.filter(d => d.moduleCode === addon.targetKey);
        for (const dep of requiredDeps) {
          if (!activeModuleCodes.has(dep.dependsOnCode)) {
            available = false;
            ineligibilityReason = `Requiere que el módulo '${dep.dependsOnCode}' esté habilitado en tu plan`;
            break;
          }
        }
      }

      // 4. Si ya está comprado y no es stackable
      if (available && isPurchased && !addon.stackable) {
        available = false;
        ineligibilityReason = 'Ya se encuentra activo en tu suscripción';
      }

      result.push({
        addon,
        isPurchased,
        activeContract: contract ? {
          id: contract.id,
          quantity: contract.quantity,
          priceContracted: contract.priceContracted,
          status: contract.status,
          cancelAtPeriodEnd: contract.cancelAtPeriodEnd,
          effectiveUntil: contract.effectiveUntil
        } : undefined,
        available,
        ineligibilityReason
      });
    }

    return result;
  },

  /**
   * Contrata un Add-on para un negocio (o incrementa cantidad si es stackable).
   */
  async purchaseAddon(businessId: string, addonCodeOrId: string, requestedQuantity = 1, performedBy = 'ADMIN') {
    if (requestedQuantity < 1) {
      throw new Error('La cantidad debe ser al menos 1');
    }

    const business = await prisma.negocio.findUnique({
      where: { id: businessId },
      include: {
        Suscripcion: {
          include: { subscriptionAddons: true }
        }
      }
    });

    if (!business || !business.Suscripcion) {
      throw new Error('Suscripción activa no encontrada para el negocio');
    }

    const sub = business.Suscripcion;

    const addon = await prisma.addon.findFirst({
      where: {
        OR: [
          { id: addonCodeOrId },
          { code: addonCodeOrId }
        ],
        active: true
      }
    });

    if (!addon) {
      throw new Error('Add-on no encontrado o inactivo comercialmente');
    }

    // Comprobar cantidad máxima permitida
    const maxQty = addon.stackable ? (addon.maxQuantity || 99) : 1;
    if (requestedQuantity > maxQty) {
      throw new Error(`Cantidad excede el máximo permitido (${maxQty})`);
    }

    // Buscar contrato existente
    const existing = await prisma.subscriptionAddon.findUnique({
      where: {
        subscriptionId_addonId: {
          subscriptionId: sub.id,
          addonId: addon.id
        }
      }
    });

    const now = new Date();
    const priceContracted = addon.priceMonthly; // Fijado server-side desde el catálogo

    let subscriptionAddon: SubscriptionAddon;

    if (existing) {
      if (!addon.stackable && existing.status === 'ACTIVE' && !existing.cancelAtPeriodEnd) {
        throw new Error('Este Add-on ya está activo en tu cuenta');
      }

      const qtyBefore = existing.quantity;
      const statusBefore = existing.status;
      const finalQuantity = addon.stackable ? requestedQuantity : 1;

      subscriptionAddon = await prisma.subscriptionAddon.update({
        where: { id: existing.id },
        data: {
          quantity: finalQuantity,
          priceContracted,
          status: 'ACTIVE',
          cancelAtPeriodEnd: false,
          effectiveUntil: null,
          cancelledAt: null,
          updatedAt: now
        }
      });

      // Auditoría
      await prisma.subscriptionAddonHistory.create({
        data: {
          businessId,
          subscriptionId: sub.id,
          addonId: addon.id,
          subscriptionAddonId: existing.id,
          action: existing.status === 'ACTIVE' ? 'QUANTITY_CHANGED' : 'RESUMED',
          quantityBefore: qtyBefore,
          quantityAfter: finalQuantity,
          priceBefore: existing.priceContracted,
          priceAfter: priceContracted,
          statusBefore,
          statusAfter: 'ACTIVE',
          performedBy,
          reason: 'Actualización o reactivación de add-on'
        }
      });
    } else {
      subscriptionAddon = await prisma.subscriptionAddon.create({
        data: {
          subscriptionId: sub.id,
          addonId: addon.id,
          quantity: addon.stackable ? requestedQuantity : 1,
          priceContracted,
          currency: addon.currency,
          status: 'ACTIVE',
          startedAt: now
        }
      });

      // Auditoría
      await prisma.subscriptionAddonHistory.create({
        data: {
          businessId,
          subscriptionId: sub.id,
          addonId: addon.id,
          subscriptionAddonId: subscriptionAddon.id,
          action: 'PURCHASED',
          quantityBefore: 0,
          quantityAfter: subscriptionAddon.quantity,
          priceBefore: 0,
          priceAfter: priceContracted,
          statusBefore: null,
          statusAfter: 'ACTIVE',
          performedBy,
          reason: 'Contratación inicial de add-on'
        }
      });
    }

    return subscriptionAddon;
  },

  /**
   * Programa la cancelación de un Add-on al finalizar el período actual de suscripción.
   */
  async cancelAddonAtPeriodEnd(arg1: string, arg2: string, performedBy = 'ADMIN', reason = 'Cancelación voluntaria del cliente') {
    // Soportar tanto (subscriptionAddonId, businessId) como (businessId, subscriptionAddonId)
    let contract = await prisma.subscriptionAddon.findUnique({
      where: { id: arg1 },
      include: {
        subscription: true,
        addon: true
      }
    });
    let businessId = arg2;

    if (!contract) {
      contract = await prisma.subscriptionAddon.findUnique({
        where: { id: arg2 },
        include: {
          subscription: true,
          addon: true
        }
      });
      businessId = arg1;
    }

    if (!contract || contract.subscription.negocioId !== businessId) {
      throw new Error('Contrato de Add-on no encontrado para este negocio');
    }

    if (contract.status !== 'ACTIVE' || contract.cancelAtPeriodEnd) {
      return contract;
    }

    const effectiveUntil = contract.subscription.fechaFin || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const updated = await prisma.subscriptionAddon.update({
      where: { id: contract.id },
      data: {
        cancelAtPeriodEnd: true,
        effectiveUntil,
        cancelledAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Auditoría
    await prisma.subscriptionAddonHistory.create({
      data: {
        businessId,
        subscriptionId: contract.subscriptionId,
        addonId: contract.addonId,
        subscriptionAddonId: contract.id,
        action: 'CANCELLED',
        quantityBefore: contract.quantity,
        quantityAfter: contract.quantity,
        priceBefore: contract.priceContracted,
        priceAfter: contract.priceContracted,
        statusBefore: 'ACTIVE',
        statusAfter: 'ACTIVE (CANCEL_AT_PERIOD_END)',
        performedBy,
        reason: `${reason} - Vigente hasta: ${effectiveUntil.toISOString().split('T')[0]}`
      }
    });

    return updated;
  }
};
