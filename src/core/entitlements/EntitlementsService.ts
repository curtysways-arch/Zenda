/**
 * @file EntitlementsService.ts
 * @module core/entitlements
 * @description Fuente única de verdad para la resolución de Entitlements (Derechos Efectivos, Capacidades, Límites y Add-ons) de Citiox.
 * @responsibility Consolidar los Presets por Tipo de Negocio, el Plan del negocio, sus Add-ons, la configuración legacy y los límites reales.
 */

import prisma from '@/lib/prisma';
import { AddonRegistry } from './AddonRegistry';
import { AccessPolicyService } from '@/core/security/AccessPolicyService';
import { resolveModuleDependencies } from '@/core/modules/resolveModuleDependencies';
import { LegacyCompatibilityResolver } from '@/core/modules/LegacyCompatibilityResolver';

export interface EffectiveEntitlements {
  businessId: string;
  planId: string;
  planName: string;
  familyId?: string | null;
  familySlug?: string | null;
  businessType: string;
  status: 'active' | 'trial' | 'expired' | 'canceled';
  isFounder?: boolean;
  lockedPrice?: number | null;
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

    // 1. Obtener negocio y su suscripción
    const negocio = await (prisma as any).negocio.findUnique({
      where: { id: businessId },
      include: {
        Suscripcion: {
          include: {
            subscriptionAddons: {
              include: { addon: true }
            }
          }
        }
      }
    });

    if (!negocio) {
      return this.getFallbackEntitlements(businessId);
    }

    const suscripcion = negocio.Suscripcion;

    // 2. Resolver el Effective Plan canónico (en runtime degrada al Free de la familia si expiró)
    const { plan, context } = await AccessPolicyService.getEffectivePlan(businessId);

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

    // 3. Extraer información base del plan y presets
    const planId = plan?.id || 'ENTERPRISE_DEMO';
    const planName = plan?.name || 'Plan Citiox Enterprise';
    const familyId = plan?.familyId || context.planFamilyId || null;
    const familySlug = plan?.family?.slug || null;
    const subStatus = context.isExpired ? 'expired' : ((suscripcion?.estado || 'active').toLowerCase() as any);
    const isFounder = context.isFounder;
    const lockedPrice = context.lockedPrice !== undefined ? context.lockedPrice : null;

    // Resolver capacidades: si tiene planEntitlements canónicos, usarlos como fuente de verdad
    let planCapabilities: Record<string, boolean> = {};
    if (plan?.planEntitlements && plan.planEntitlements.length > 0) {
      for (const ent of plan.planEntitlements) {
        if (ent.module?.code) {
          planCapabilities[ent.module.code] = Boolean(ent.enabled);
        }
      }
      // Resolver dependencias recursivas universales
      const activeModuleList = Object.keys(planCapabilities).filter(k => planCapabilities[k]);
      const expandedModules = resolveModuleDependencies(activeModuleList);
      for (const m of expandedModules) {
        planCapabilities[m] = true;
      }
    } else {
      // Fallback para planes legacy sin planEntitlements
      let rawPlanFeatures: Record<string, boolean> = {};
      if (plan?.features) {
        if (typeof plan.features === 'string') {
          try { rawPlanFeatures = JSON.parse(plan.features); } catch { rawPlanFeatures = {}; }
        } else if (typeof plan.features === 'object') {
          rawPlanFeatures = plan.features as Record<string, boolean>;
        }
      }
      const presetCaps = this.getPresetCapabilities(negocio.tipoNegocio, negocio.slug, negocio.nombre);
      planCapabilities = {
        ...presetCaps,
        ...rawPlanFeatures
      };
    }

    const capabilities: Record<string, boolean> = {
      ...planCapabilities
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

    // 3. Normalización agnóstica de customFeatures de Suscripcion (Compatibilidad estricta de solo lectura)
    const customFeaturesObj = LegacyCompatibilityResolver.parseCustomFeatures(suscripcion?.customFeatures);
    const legacyResolved = LegacyCompatibilityResolver.resolveLegacyCapabilities(suscripcion?.customFeatures);
    for (const [code, isEnabled] of Object.entries(legacyResolved)) {
      capabilities[code] = isEnabled;
    }

    // Mapeo canónico bidireccional y aliases para retrocompatibilidad
    Object.keys({ ...capabilities }).forEach(k => {
      const lowerKey = k.toLowerCase();
      const upperKey = k.toUpperCase();
      capabilities[lowerKey] = capabilities[k];
      capabilities[upperKey] = capabilities[k];
    });

    // Mapeo explícito de aliases retrocompatibles
    if (capabilities.PRODUCTS !== undefined) capabilities.catalog = capabilities.PRODUCTS;
    if (capabilities.QR_TABLE !== undefined) capabilities.qr = capabilities.QR_TABLE;
    if (capabilities.APPOINTMENTS !== undefined) capabilities.booking = capabilities.APPOINTMENTS;
    if (capabilities.COURSES !== undefined) capabilities.courses = capabilities.COURSES;
    if (capabilities.COMMUNICATION_CENTER !== undefined) capabilities.communications = capabilities.COMMUNICATION_CENTER;

    // 4. Límites base del plan y resolución de PlanLimit
    const baseLimits: Record<string, number> = {
      branches: plan?.max_locations ?? 1,
      professionals: plan?.maxStaff ?? 5,
      appointmentsMonthly: plan?.maxAppointmentsMonthly ?? plan?.max_reservations_per_month ?? 500,
      products: plan?.max_fields ?? 1000
    };

    if (plan?.planLimits && plan.planLimits.length > 0) {
      for (const pl of plan.planLimits) {
        const val = pl.limitValue === -1 ? 999999 : pl.limitValue;
        if (pl.limitKey === 'MAX_BRANCHES') baseLimits.branches = val;
        if (pl.limitKey === 'MAX_USERS') baseLimits.users = val;
        if (pl.limitKey === 'MAX_PRODUCTS') baseLimits.products = val;
        if (pl.limitKey === 'MAX_TABLES') baseLimits.tables = val;
        if (pl.limitKey === 'MAX_COURTS') baseLimits.courts = val;
        if (pl.limitKey === 'MAX_STAFF') baseLimits.professionals = val;
        if (pl.limitKey === 'MAX_APPOINTMENTS_MONTHLY') baseLimits.appointmentsMonthly = val;
        if (pl.limitKey === 'MAX_ORDERS_MONTHLY') baseLimits.ordersMonthly = val;
        baseLimits[pl.limitKey] = val;
      }
    }

    // 5. Procesar Add-ons contratados (SubscriptionAddon como Fuente Primaria + customFeatures como Fallback)
    const activeAddonsList: EffectiveEntitlements['addons'] = [];
    const limitAddonBonus: Record<string, number> = {};
    const processedAddonCodes = new Set<string>();

    const now = new Date();

    // A. Fuente Primaria: SubscriptionAddon en base de datos
    const dbContracts: any[] = suscripcion?.subscriptionAddons || [];
    for (const contract of dbContracts) {
      const addon = contract.addon;
      const isContractActive = contract.status === 'ACTIVE' || 
        (contract.cancelAtPeriodEnd && contract.effectiveUntil && new Date(contract.effectiveUntil) > now);

      if (addon && addon.active && isContractActive) {
        processedAddonCodes.add(addon.code);
        processedAddonCodes.add(addon.id);

        activeAddonsList.push({
          id: addon.id,
          name: addon.name,
          type: addon.type,
          targetKey: addon.targetKey,
          amount: addon.amount ?? undefined,
          quantity: contract.quantity || 1
        });

        if (addon.type === 'CAPABILITY') {
          capabilities[addon.targetKey] = true;
          capabilities[addon.targetKey.toLowerCase()] = true;
          capabilities[addon.targetKey.toUpperCase()] = true;

          // Si el add-on activa E-commerce o venta online, desbloquear capabilities de órdenes, productos y catálogo
          if (addon.targetKey === 'ECOMMERCE') {
            capabilities.ECOMMERCE = true;
            capabilities.ecommerce = true;
            capabilities.ORDERS = true;
            capabilities.orders = true;
            capabilities.PRODUCTS = true;
            capabilities.products = true;
            capabilities.catalog = true;
            capabilities.POS = true;
            capabilities.pos = true;
            capabilities.INVENTORY = true;
            capabilities.inventory = true;
          }
        } else if (addon.type === 'LIMIT' && addon.targetKey) {
          const qty = contract.quantity || 1;
          const bonus = (addon.amount || 0) * qty;
          limitAddonBonus[addon.targetKey] = (limitAddonBonus[addon.targetKey] || 0) + bonus;

          // Mapeo canónico a claves de baseLimits
          if (addon.targetKey === 'MAX_BRANCHES') limitAddonBonus.branches = (limitAddonBonus.branches || 0) + bonus;
          if (addon.targetKey === 'MAX_STAFF') limitAddonBonus.professionals = (limitAddonBonus.professionals || 0) + bonus;
          if (addon.targetKey === 'MAX_APPOINTMENTS_MONTHLY') limitAddonBonus.appointmentsMonthly = (limitAddonBonus.appointmentsMonthly || 0) + bonus;
          if (addon.targetKey === 'MAX_PRODUCTS') limitAddonBonus.products = (limitAddonBonus.products || 0) + bonus;
          if (addon.targetKey === 'MAX_USERS') limitAddonBonus.users = (limitAddonBonus.users || 0) + bonus;
          if (addon.targetKey === 'MAX_ORDERS_MONTHLY') limitAddonBonus.ordersMonthly = (limitAddonBonus.ordersMonthly || 0) + bonus;
        }
      }
    }

    // B. Fallback Legacy: customFeatures.addons (Solo si no fue procesado por DB)
    const rawAddonEntries = customFeaturesObj.addons || [];
    if (Array.isArray(rawAddonEntries)) {
      for (const entry of rawAddonEntries) {
        const addonId = typeof entry === 'string' ? entry : entry.id;
        const qty = typeof entry === 'object' && entry.quantity ? parseInt(entry.quantity, 10) : 1;

        if (addonId && !processedAddonCodes.has(addonId)) {
          const addonDef = AddonRegistry.get(addonId);
          if (addonDef && addonDef.active) {
            processedAddonCodes.add(addonDef.id);
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
            } else if (addonDef.type === 'LIMIT' && addonDef.targetKey) {
              const bonus = (addonDef.amount || 0) * qty;
              limitAddonBonus[addonDef.targetKey] = (limitAddonBonus[addonDef.targetKey] || 0) + bonus;
              if (addonDef.targetKey === 'branches') limitAddonBonus.branches = (limitAddonBonus.branches || 0) + bonus;
              if (addonDef.targetKey === 'professionals') limitAddonBonus.professionals = (limitAddonBonus.professionals || 0) + bonus;
              if (addonDef.targetKey === 'appointmentsMonthly') limitAddonBonus.appointmentsMonthly = (limitAddonBonus.appointmentsMonthly || 0) + bonus;
              if (addonDef.targetKey === 'products') limitAddonBonus.products = (limitAddonBonus.products || 0) + bonus;
            }
          }
        }
      }
    }

    // Calibrar límites efectivos universales (Plan Base + Bonos de Addons)
    const branchBonus = limitAddonBonus.branches || limitAddonBonus.MAX_BRANCHES || 0;
    const staffBonus = limitAddonBonus.professionals || limitAddonBonus.MAX_STAFF || 0;
    const apptBonus = limitAddonBonus.appointmentsMonthly || limitAddonBonus.MAX_APPOINTMENTS_MONTHLY || 0;
    const prodBonus = limitAddonBonus.products || limitAddonBonus.MAX_PRODUCTS || 0;
    const userBonus = limitAddonBonus.users || limitAddonBonus.MAX_USERS || 0;
    const orderBonus = limitAddonBonus.ordersMonthly || limitAddonBonus.MAX_ORDERS_MONTHLY || 0;

    const effectiveLimits: any = {
      ...baseLimits,
      branches: (baseLimits.branches === -1 || baseLimits.branches >= 999) ? 999 : baseLimits.branches + branchBonus,
      MAX_BRANCHES: (baseLimits.branches === -1 || baseLimits.branches >= 999) ? 999 : baseLimits.branches + branchBonus,
      professionals: (baseLimits.professionals === -1 || baseLimits.professionals >= 999) ? 999 : baseLimits.professionals + staffBonus,
      MAX_STAFF: (baseLimits.professionals === -1 || baseLimits.professionals >= 999) ? 999 : baseLimits.professionals + staffBonus,
      appointmentsMonthly: (baseLimits.appointmentsMonthly === -1 || baseLimits.appointmentsMonthly >= 9999) ? 9999 : baseLimits.appointmentsMonthly + apptBonus,
      MAX_APPOINTMENTS_MONTHLY: (baseLimits.appointmentsMonthly === -1 || baseLimits.appointmentsMonthly >= 9999) ? 9999 : baseLimits.appointmentsMonthly + apptBonus,
      products: (baseLimits.products === -1 || baseLimits.products >= 9999) ? 9999 : baseLimits.products + prodBonus,
      MAX_PRODUCTS: (baseLimits.products === -1 || baseLimits.products >= 9999) ? 9999 : baseLimits.products + prodBonus,
      users: (baseLimits.users === -1 || (baseLimits.users && baseLimits.users >= 999)) ? 999 : ((baseLimits.users || 1) + userBonus),
      MAX_USERS: (baseLimits.users === -1 || (baseLimits.users && baseLimits.users >= 999)) ? 999 : ((baseLimits.users || 1) + userBonus),
      ordersMonthly: (baseLimits.ordersMonthly === -1 || (baseLimits.ordersMonthly && baseLimits.ordersMonthly >= 9999)) ? 9999 : ((baseLimits.ordersMonthly || 50) + orderBonus),
      MAX_ORDERS_MONTHLY: (baseLimits.ordersMonthly === -1 || (baseLimits.ordersMonthly && baseLimits.ordersMonthly >= 9999)) ? 9999 : ((baseLimits.ordersMonthly || 50) + orderBonus)
    };

    // Añadir bonos para cualquier otra clave personalizada
    const standardKeys = new Set([
      'branches', 'MAX_BRANCHES',
      'professionals', 'MAX_STAFF',
      'appointmentsMonthly', 'MAX_APPOINTMENTS_MONTHLY',
      'products', 'MAX_PRODUCTS',
      'users', 'MAX_USERS',
      'ordersMonthly', 'MAX_ORDERS_MONTHLY'
    ]);

    for (const [key, bonusVal] of Object.entries(limitAddonBonus)) {
      if (!standardKeys.has(key)) {
        effectiveLimits[key] = (effectiveLimits[key] || 0) + bonusVal;
      }
    }

    // 6. Contar uso real actual en la BD (Evaluando sucursales activas)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [branchCount, staffCount, appointmentCount, productCount] = await Promise.all([
      (prisma as any).branch
        ? (prisma as any).branch.count({ where: { businessId, active: true } }).catch(() => 1)
        : (prisma as any).ubicacion
        ? (prisma as any).ubicacion.count({ where: { negocioId: businessId } }).catch(() => 1)
        : Promise.resolve(1),
      (prisma as any).staff ? (prisma as any).staff.count({ where: { businessId } }).catch(() => 1) : Promise.resolve(1),
      (prisma as any).appointment ? (prisma as any).appointment.count({ where: { negocioId: businessId, createdAt: { gte: startOfMonth } } }).catch(() => 0) : Promise.resolve(0),
      (prisma as any).producto ? (prisma as any).producto.count({ where: { negocioId: businessId } }).catch(() => 0) : Promise.resolve(0)
    ]);

    return {
      businessId,
      planId,
      planName,
      familyId,
      familySlug,
      businessType: negocio.tipoNegocio || 'PRODUCTOS',
      status: subStatus,
      isFounder,
      lockedPrice,
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
