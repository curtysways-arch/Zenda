/**
 * @file EntitlementsService.ts
 * @module core/entitlements
 * @description Fuente única de verdad para la resolución de Entitlements (Derechos Efectivos, Capacidades, Límites y Add-ons) de Citiox.
 * @responsibility Consolidar los Presets por Tipo de Negocio, el Plan del negocio, sus Add-ons, la configuración legacy y los límites reales.
 */

import prisma from '@/lib/prisma';
import { AddonRegistry } from './AddonRegistry';

export interface EffectiveEntitlements {
  businessId: string;
  planId: string;
  planName: string;
  businessType: string;
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
   * Genera los presets de capabilities base según el tipo de negocio.
   */
  public static getPresetCapabilities(tipoNegocio?: string, slug?: string, nombre?: string): Record<string, boolean> {
    const tipoUpper = (tipoNegocio || '').toUpperCase();
    const slugUpper = (slug || '').toUpperCase();
    const nameUpper = (nombre || '').toUpperCase();

    const isRestaurant = tipoUpper === 'RESTAURANTE' || tipoUpper === 'GASTRONOMIA' || tipoUpper === 'RESTAURANT' ||
      nameUpper.includes('PARRILLA') || nameUpper.includes('RESTAURANTE') || nameUpper.includes('GASTRONOMIA') || nameUpper.includes('BURGER') || nameUpper.includes('PIZZA') || nameUpper.includes('TACO');
    const isPinchos = tipoUpper === 'PINCHOS' || slugUpper === 'PINCHOS';
    const isCanchas = tipoUpper === 'SPORTS_COURTS' || tipoUpper === 'CANCHAS' || slugUpper === 'CANCHAS';
    const isServiceBiz = !isRestaurant && !isPinchos && !isCanchas && (
      tipoUpper === 'SPA' ||
      tipoUpper === 'CENTRO_ESTETICA' ||
      tipoUpper === 'PELUQUERIA' ||
      tipoUpper === 'BARBERIA' ||
      tipoUpper === 'SHOE_CARE' ||
      tipoUpper === 'LAVANDERIA' ||
      tipoUpper === 'ORDENES-SERVICIO' ||
      tipoUpper === 'BEAUTY_SPA' ||
      tipoUpper === 'RESERVA' ||
      slugUpper.includes('SPA') ||
      slugUpper.includes('BARBER') ||
      slugUpper.includes('NAILS') ||
      slugUpper.includes('DENTAL') ||
      slugUpper.includes('CITAS') ||
      nameUpper.includes('SPA') ||
      nameUpper.includes('ESTETICA') ||
      nameUpper.includes('PELUQUERIA') ||
      nameUpper.includes('BARBERIA')
    );

    if (isPinchos) {
      return {
        PRODUCTS: true,
        CATEGORIES: true,
        ORDERS: true,
        POS: true,
        DELIVERY: true,
        DISPATCH: true,
        KITCHEN: true,
        PROMOTIONS: true,
        LOYALTY: true,
        TABLES: false,
        APPOINTMENTS: false,
        SERVICES: false,
        COURTS: false,
        INVENTORY: false
      };
    }

    if (isRestaurant) {
      return {
        PRODUCTS: true,
        CATEGORIES: true,
        ORDERS: true,
        POS: true,
        DELIVERY: true,
        DISPATCH: true,
        TABLES: true,
        KITCHEN: true,
        PROMOTIONS: true,
        LOYALTY: false,
        APPOINTMENTS: false,
        SERVICES: false,
        COURTS: false,
        INVENTORY: false
      };
    }

    if (isCanchas) {
      return {
        COURTS: true,
        APPOINTMENTS: true,
        PAYMENTS: true,
        PROMOTIONS: true,
        PRODUCTS: false,
        CATEGORIES: false,
        ORDERS: false,
        POS: false,
        DELIVERY: false,
        DISPATCH: false,
        TABLES: false,
        KITCHEN: false,
        SERVICES: false,
        INVENTORY: false
      };
    }

    if (isServiceBiz) {
      const isLaundryOrShoe = tipoUpper === 'SHOE_CARE' || tipoUpper === 'LAVANDERIA' || tipoUpper === 'ORDENES-SERVICIO';
      return {
        SERVICES: true,
        APPOINTMENTS: !isLaundryOrShoe,
        ORDERS: isLaundryOrShoe,
        DISPATCH: isLaundryOrShoe,
        DELIVERY: isLaundryOrShoe,
        PAYMENTS: true,
        PROMOTIONS: true,
        PRODUCTS: false,
        CATEGORIES: false,
        POS: false,
        TABLES: false,
        KITCHEN: false,
        COURTS: false,
        INVENTORY: false
      };
    }

    // Preset de TIENDA / ECOMMERCE / PRODUCTOS
    return {
      PRODUCTS: true,
      CATEGORIES: true,
      ORDERS: true,
      POS: true,
      DELIVERY: true,
      DISPATCH: true,
      PAYMENTS: true,
      PROMOTIONS: true,
      TABLES: false,
      KITCHEN: false,
      APPOINTMENTS: false,
      COURTS: false,
      SERVICES: false,
      INVENTORY: false
    };
  }

  /**
   * Resuelve los derechos efectivos completos para un negocio.
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
      return this.getFallbackEntitlements(businessId);
    }

    const suscripcion = negocio.Suscripcion;
    const plan = suscripcion?.Plan;

    if (!suscripcion && !plan) {
      return this.getFallbackEntitlements(businessId, negocio.tipoNegocio, negocio.slug, negocio.nombre);
    }

    // Extraer configuración legacy
    let legacyCfg: any = {};
    if (typeof negocio.configuracion === 'string') {
      try { legacyCfg = JSON.parse(negocio.configuracion); } catch { legacyCfg = {}; }
    } else {
      legacyCfg = negocio.configuracion || {};
    }
    const legacyCaps = legacyCfg.activeCapabilities || legacyCfg.capabilities || {};

    // 2. Extraer información base del plan y presets
    const planId = plan?.id || 'ENTERPRISE_DEMO';
    const planName = plan?.name || 'Plan Citiox Enterprise';
    const subStatus = (suscripcion?.estado || 'active').toLowerCase() as any;

    let rawPlanFeatures: Record<string, boolean> = {};
    if (plan?.features) {
      if (typeof plan.features === 'string') {
        try { rawPlanFeatures = JSON.parse(plan.features); } catch { rawPlanFeatures = {}; }
      } else if (typeof plan.features === 'object') {
        rawPlanFeatures = plan.features as Record<string, boolean>;
      }
    }

    // Preset según tipoNegocio
    const presetCaps = this.getPresetCapabilities(negocio.tipoNegocio, negocio.slug, negocio.nombre);

    // Consolidar capacidades (Preset ➔ Legacy Config ➔ Plan Features)
    const capabilities: Record<string, boolean> = {
      ...presetCaps,
      ...rawPlanFeatures
    };

    // Aplicar overrides de legacyConfig si existen explícitamente
    if (legacyCaps.orders !== undefined) capabilities.ORDERS = Boolean(legacyCaps.orders);
    if (legacyCaps.catalog !== undefined || legacyCaps.products !== undefined) capabilities.PRODUCTS = Boolean(legacyCaps.catalog || legacyCaps.products);
    if (legacyCaps.tables !== undefined) capabilities.TABLES = Boolean(legacyCaps.tables);
    if (legacyCaps.kitchen !== undefined) capabilities.KITCHEN = Boolean(legacyCaps.kitchen);
    if (legacyCaps.delivery !== undefined) capabilities.DELIVERY = Boolean(legacyCaps.delivery);
    if (legacyCaps.dispatch !== undefined) capabilities.DISPATCH = Boolean(legacyCaps.dispatch);
    if (legacyCaps.appointments !== undefined) capabilities.APPOINTMENTS = Boolean(legacyCaps.appointments);
    if (legacyCaps.courts !== undefined) capabilities.COURTS = Boolean(legacyCaps.courts);
    if (legacyCaps.services !== undefined) capabilities.SERVICES = Boolean(legacyCaps.services);
    if (legacyCaps.promotions !== undefined) capabilities.PROMOTIONS = Boolean(legacyCaps.promotions);
    if (legacyCaps.inventory !== undefined) capabilities.INVENTORY = Boolean(legacyCaps.inventory);

    // Mapeo bidireccional en minúsculas y mayúsculas para compatibilidad
    Object.keys({ ...capabilities }).forEach(k => {
      const lowerKey = k.toLowerCase();
      const upperKey = k.toUpperCase();
      capabilities[lowerKey] = capabilities[k];
      capabilities[upperKey] = capabilities[k];
    });

    // 3. Límites base del plan
    const baseLimits = {
      branches: plan?.max_locations ?? 1,
      professionals: plan?.maxStaff ?? 5,
      appointmentsMonthly: plan?.maxAppointmentsMonthly ?? plan?.max_reservations_per_month ?? 500,
      products: plan?.max_fields ?? 1000
    };

    // 4. Procesar Add-ons contratados
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
            capabilities[addonDef.targetKey.toLowerCase()] = true;
            capabilities[addonDef.targetKey.toUpperCase()] = true;
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

    // 5. Contar uso real actual en la BD
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
      businessType: negocio.tipoNegocio || 'PRODUCTOS',
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
   * Fallback seguro en desarrollo o modo demo respetando el tipoNegocio.
   */
  private static getFallbackEntitlements(businessId: string, tipoNegocio?: string, slug?: string, nombre?: string): EffectiveEntitlements {
    const preset = this.getPresetCapabilities(tipoNegocio, slug, nombre);
    const caps: Record<string, boolean> = {};

    Object.keys(preset).forEach(k => {
      caps[k.toUpperCase()] = preset[k];
      caps[k.toLowerCase()] = preset[k];
    });

    return {
      businessId,
      planId: 'ENTERPRISE_DEMO',
      planName: 'Plan Citiox Enterprise Demo',
      businessType: tipoNegocio || 'PRODUCTOS',
      status: 'active',
      capabilities: caps,
      limits: {
        branches: 999,
        professionals: 999,
        appointmentsMonthly: 9999,
        products: 9999
      },
      usage: {
        branches: 1,
        professionals: 1,
        appointmentsMonthly: 0,
        products: 0
      },
      addons: []
    };
  }

  /**
   * Verifica si un negocio tiene habilitada una capacidad dada.
   */
  public static async hasCapability(businessId: string, capabilityKey: string): Promise<boolean> {
    const entitlements = await this.resolve(businessId);
    return Boolean(entitlements.capabilities[capabilityKey.toUpperCase()] || entitlements.capabilities[capabilityKey.toLowerCase()]);
  }

  /**
   * Verifica el estado de un límite para un negocio.
   */
  public static async checkLimit(businessId: string, limitKey: 'branches' | 'professionals' | 'appointmentsMonthly' | 'products'): Promise<LimitCheckResult> {
    const entitlements = await this.resolve(businessId);
    const limit = entitlements.limits[limitKey] ?? 9999;
    const current = entitlements.usage[limitKey] ?? 0;
    const allowed = current < limit;
    const remaining = Math.max(0, limit - current);

    return {
      allowed,
      current,
      limit,
      remaining,
      message: allowed ? undefined : `Has alcanzado el límite permitido de ${limitKey} (${current}/${limit}) para tu plan actual.`
    };
  }

  public static async checkProfessionalLimit(businessId: string): Promise<LimitCheckResult> {
    return this.checkLimit(businessId, 'professionals');
  }

  public static async checkAppointmentLimit(businessId: string): Promise<LimitCheckResult> {
    return this.checkLimit(businessId, 'appointmentsMonthly');
  }

  public static async checkBranchLimit(businessId: string): Promise<LimitCheckResult> {
    return this.checkLimit(businessId, 'branches');
  }

  public static async checkProductLimit(businessId: string): Promise<LimitCheckResult> {
    return this.checkLimit(businessId, 'products');
  }
}
