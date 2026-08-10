/**
 * @file EntitlementsService.ts
 * @module core/entitlements
 * @description Fuente única de verdad para la resolución de Entitlements (Derechos Efectivos, Capacidades, Límites y Add-ons) de Citiox.
 * @responsibility Consolidar el Plan del negocio, sus add-ons y límites reales sin modificar ningún motor funcional de la aplicación.
 */

import prisma from '@/lib/prisma';
import { AddonRegistry } from './AddonRegistry';

export interface EffectiveEntitlements {
  businessId: string;
  planId: string;
  planName: string;
  status: 'active' | 'trial' | 'expired' | 'canceled';
  capabilities: Record<string, boolean>;
  limits: {
    branches: number;
    professionals: number;
    appointmentsMonthly: number;
    products: number;
    [key: string]: number;
  };
  usage: {
    branches: number;
    professionals: number;
    appointmentsMonthly: number;
    products: number;
    [key: string]: number;
  };
  addons: {
    id: string;
    name: string;
    type: 'CAPABILITY' | 'LIMIT';
    targetKey: string;
    amount?: number;
    quantity: number;
  }[];
}

export interface LimitCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  message?: string;
}

export class EntitlementsService {
  /**
   * Resuelve los derechos efectivos completos (capabilities, límites, uso y add-ons) para un negocio.
   */
  public static async resolve(businessId: string): Promise<EffectiveEntitlements> {
    if (!businessId) {
      throw new Error('[EntitlementsService] businessId es requerido para resolver entitlements.');
    }

    // 1. Obtener negocio y su suscripción actual con su plan
    const negocio = await (prisma as any).negocio.findUnique({
      where: { id: businessId },
      include: {
        Suscripcion: {
          include: {
            Plan: true
          }
        }
      }
    });

    if (!negocio) {
      // Fallback seguro de desarrollo o demo
      return this.getFallbackEntitlements(businessId);
    }

    const suscripcion = negocio.Suscripcion;
    const plan = suscripcion?.Plan;

    // 2. Extraer información base del plan
    const planId = plan?.id || 'ENTERPRISE_DEMO';
    const planName = plan?.name || 'Plan Citiox Enterprise';
    const subStatus = (suscripcion?.estado || 'active').toLowerCase() as any;

    // Capabilities base declaradas en el plan
    let rawPlanFeatures: Record<string, boolean> = {};
    if (plan?.features) {
      if (typeof plan.features === 'string') {
        try { rawPlanFeatures = JSON.parse(plan.features); } catch { rawPlanFeatures = {}; }
      } else if (typeof plan.features === 'object') {
        rawPlanFeatures = plan.features as Record<string, boolean>;
      }
    }

    // Si el plan no tiene features JSON explícito, dar acceso por defecto completo a las funciones base
    const capabilities: Record<string, boolean> = {
      PRODUCTS: rawPlanFeatures.PRODUCTS !== false,
      APPOINTMENTS: rawPlanFeatures.APPOINTMENTS !== false,
      RESERVATIONS: rawPlanFeatures.RESERVATIONS !== false,
      POS: rawPlanFeatures.POS !== false,
      DELIVERY: rawPlanFeatures.DELIVERY !== false,
      PROMOTIONS: rawPlanFeatures.PROMOTIONS !== false,
      ECOMMERCE: Boolean(rawPlanFeatures.ECOMMERCE),
      RESTAURANT: rawPlanFeatures.RESTAURANT !== false,
      SPA: rawPlanFeatures.SPA !== false,
      LAUNDRY: rawPlanFeatures.LAUNDRY !== false,
      COURTS: rawPlanFeatures.COURTS !== false,
      ...rawPlanFeatures
    };

    // 3. Límites base del plan (campos reales de la BD)
    const baseLimits = {
      branches: plan?.max_locations ?? 1,
      professionals: plan?.maxStaff ?? 5,
      appointmentsMonthly: plan?.maxAppointmentsMonthly ?? plan?.max_reservations_per_month ?? 500,
      products: plan?.max_fields ?? 1000
    };

    // 4. Procesar Add-ons contratados (desde customFeatures de Suscripcion)
    const activeAddonsList: EffectiveEntitlements['addons'] = [];
    let customFeaturesObj: any = {};
    if (suscripcion?.customFeatures) {
      if (typeof suscripcion.customFeatures === 'string') {
        try { customFeaturesObj = JSON.parse(suscripcion.customFeatures); } catch { customFeaturesObj = {}; }
      } else {
        customFeaturesObj = suscripcion.customFeatures;
      }
    }

    const rawAddonEntries = customFeaturesObj.addons || [];
    const limitAddonBonus: Record<string, number> = {
      branches: 0,
      professionals: 0,
      appointmentsMonthly: 0,
      products: 0
    };

    if (Array.isArray(rawAddonEntries)) {
      for (const entry of rawAddonEntries) {
        const addonId = typeof entry === 'string' ? entry : entry.id;
        const qty = typeof entry === 'object' && entry.quantity ? parseInt(entry.quantity, 10) : 1;
        const addonDef = AddonRegistry.get(addonId);

        if (addonDef && addonDef.active) {
          activeAddonsList.push({
            id: addonDef.id,
            name: addonDef.name,
            type: addonDef.type,
            targetKey: addonDef.targetKey,
            amount: addonDef.amount,
            quantity: qty
          });

          if (addonDef.type === 'CAPABILITY') {
            capabilities[addonDef.targetKey] = true;
          } else if (addonDef.type === 'LIMIT') {
            const currentBonus = limitAddonBonus[addonDef.targetKey] || 0;
            limitAddonBonus[addonDef.targetKey] = currentBonus + ((addonDef.amount || 0) * qty);
          }
        }
      }
    }

    // Calibrar límites efectivos (Plan + Addons)
    const effectiveLimits = {
      branches: (baseLimits.branches === -1 || baseLimits.branches >= 999) ? 999 : baseLimits.branches + (limitAddonBonus.branches || 0),
      professionals: (baseLimits.professionals === -1 || baseLimits.professionals >= 999) ? 999 : baseLimits.professionals + (limitAddonBonus.professionals || 0),
      appointmentsMonthly: (baseLimits.appointmentsMonthly === -1 || baseLimits.appointmentsMonthly >= 9999) ? 9999 : baseLimits.appointmentsMonthly + (limitAddonBonus.appointmentsMonthly || 0),
      products: (baseLimits.products === -1 || baseLimits.products >= 9999) ? 9999 : baseLimits.products + (limitAddonBonus.products || 0)
    };

    // 5. Contar uso real actual en la BD de forma delegada
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [branchCount, staffCount, appointmentCount, productCount] = await Promise.all([
      (prisma as any).ubicacion ? (prisma as any).ubicacion.count({ where: { negocioId: businessId } }).catch(() => 1) : Promise.resolve(1),
      (prisma as any).staff ? (prisma as any).staff.count({ where: { negocioId: businessId } }).catch(() => 1) : Promise.resolve(1),
      (prisma as any).appointment ? (prisma as any).appointment.count({ where: { negocioId: businessId, createdAt: { gte: startOfMonth } } }).catch(() => 0) : Promise.resolve(0),
      (prisma as any).producto ? (prisma as any).producto.count({ where: { negocioId: businessId } }).catch(() => 0) : Promise.resolve(0)
    ]);

    return {
      businessId,
      planId,
      planName,
      status: subStatus,
      capabilities,
      limits: effectiveLimits,
      usage: {
        branches: branchCount,
        professionals: staffCount,
        appointmentsMonthly: appointmentCount,
        products: productCount
      },
      addons: activeAddonsList
    };
  }

  /**
   * Verifica si un negocio tiene habilitada una capacidad dada.
   */
  public static async hasCapability(businessId: string, capabilityId: string): Promise<boolean> {
    const ent = await this.resolve(businessId);
    return Boolean(ent.capabilities[capabilityId] || ent.capabilities[capabilityId.toUpperCase()]);
  }

  /**
   * Verifica límite para la creación de Sucursales.
   */
  public static async checkBranchLimit(businessId: string): Promise<LimitCheckResult> {
    const ent = await this.resolve(businessId);
    const current = ent.usage.branches;
    const limit = ent.limits.branches;
    const allowed = current < limit;

    return {
      allowed,
      current,
      limit,
      remaining: Math.max(0, limit - current),
      message: allowed ? undefined : `Has alcanzado el límite de ${limit} sucursales de tu plan. Actualiza tu plan o contrata una sucursal adicional.`
    };
  }

  /**
   * Verifica límite para la creación de Profesionales / Personal de Agenda.
   */
  public static async checkProfessionalLimit(businessId: string): Promise<LimitCheckResult> {
    const ent = await this.resolve(businessId);
    const current = ent.usage.professionals;
    const limit = ent.limits.professionals;
    const allowed = current < limit;

    return {
      allowed,
      current,
      limit,
      remaining: Math.max(0, limit - current),
      message: allowed ? undefined : `Has alcanzado el límite de ${limit} profesionales de tu plan. Actualiza tu plan o agrega profesionales adicionales.`
    };
  }

  /**
   * Verifica límite para la creación de Citas mensuales.
   */
  public static async checkAppointmentLimit(businessId: string): Promise<LimitCheckResult> {
    const ent = await this.resolve(businessId);
    const current = ent.usage.appointmentsMonthly;
    const limit = ent.limits.appointmentsMonthly;
    const allowed = current < limit;

    return {
      allowed,
      current,
      limit,
      remaining: Math.max(0, limit - current),
      message: allowed ? undefined : `Has alcanzado la cuota de ${limit} citas mensuales de tu plan para este mes.`
    };
  }

  /**
   * Fallback seguro cuando un negocio no tiene suscripción explícita.
   */
  private static getFallbackEntitlements(businessId: string): EffectiveEntitlements {
    return {
      businessId,
      planId: 'PLAN_STARTER_DEFAULT',
      planName: 'Plan Starter Citiox',
      status: 'active',
      capabilities: {
        PRODUCTS: true,
        APPOINTMENTS: true,
        RESERVATIONS: true,
        POS: true,
        DELIVERY: true,
        PROMOTIONS: true,
        ECOMMERCE: true,
        RESTAURANT: true,
        SPA: true,
        LAUNDRY: true,
        COURTS: true
      },
      limits: {
        branches: 3,
        professionals: 10,
        appointmentsMonthly: 500,
        products: 1000
      },
      usage: {
        branches: 1,
        professionals: 1,
        appointmentsMonthly: 0,
        products: 10
      },
      addons: []
    };
  }
}
