// src/core/subscription/SubscriptionEngine.ts
// Motor central de suscripciones y gobernanza de límites (v3.0.0)
// Responsabilidad ÚNICA: Evaluar permisos, calcular límites efectivos y verificar cuotas.

import prisma from '@/lib/prisma';
import { SUBSCRIPTION_PLANS, SUBSCRIPTION_ADDONS } from './plans';
import { 
  FeatureAccess, 
  FeatureAccessLevels, 
  ResourceLimitKey, 
  ResourceLimits, 
  PlanId, 
  BusinessSubscriptionData 
} from './types';
import { UsageEngine } from './UsageEngine';

export class SubscriptionEngine {
  /**
   * Carga los datos de suscripción de un negocio desde PostgreSQL.
   */
  static async getSubscriptionData(businessId: string): Promise<BusinessSubscriptionData> {
    if (!businessId) {
      return this.getDefaultSubscriptionData('FREE');
    }

    try {
      const negocio = await (prisma as any).negocio.findUnique({
        where: { id: businessId },
        include: {
          Suscripcion: {
            include: { Plan: true }
          }
        }
      });

      if (!negocio || !negocio.Suscripcion) {
        return this.getDefaultSubscriptionData('FREE', businessId);
      }

      const sub = negocio.Suscripcion;
      const planName = (sub.Plan?.name || '').toUpperCase();
      let planId: PlanId = 'FREE';

      if (planName.includes('ENTERPRISE')) planId = 'ENTERPRISE';
      else if (planName.includes('PRO') || planName.includes('BUSINESS')) planId = 'PRO';
      else if (planName.includes('GROWTH') || planName.includes('PLUS')) planId = 'GROWTH';
      else if (planName.includes('STARTER') || planName.includes('BEGIN')) planId = 'STARTER';
      else if (planName.includes('FREE')) planId = 'FREE';
      else planId = 'STARTER'; // Default

      const parseJson = (raw: any) => {
        if (!raw) return {};
        if (typeof raw === 'string') {
          try { return JSON.parse(raw); } catch { return {}; }
        }
        return raw;
      };

      const customFeatures = parseJson(sub.customFeatures);
      const activeAddons = Array.isArray(customFeatures.addons) ? customFeatures.addons : [];

      return {
        businessId: negocio.id,
        planId,
        status: (sub.estado || 'active').toLowerCase() as any,
        activeAddons,
        customLimitOverrides: customFeatures.limitOverrides || {},
        customFeatureOverrides: customFeatures.featureOverrides || {},
        currentPeriodStart: sub.fechaInicio || new Date(),
        currentPeriodEnd: sub.fechaFin || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      };
    } catch (err) {
      console.error('[SubscriptionEngine.getSubscriptionData] Error loading subscription:', err);
      return this.getDefaultSubscriptionData('FREE', businessId);
    }
  }

  /**
   * Helper para generar la estructura de suscripción por defecto.
   */
  private static getDefaultSubscriptionData(planId: PlanId, businessId: string = 'default'): BusinessSubscriptionData {
    return {
      businessId,
      planId,
      status: 'active',
      activeAddons: [],
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    };
  }

  /**
   * Evalúa y devuelve el nivel de acceso a una característica (getFeatureAccess).
   * Devuelve: 'none' | 'basic' | 'standard' | 'advanced' | 'enterprise'
   */
  static async getFeatureAccess(
    businessId: string,
    featureKey: keyof FeatureAccessLevels
  ): Promise<FeatureAccess | string | boolean> {
    const sub = await this.getSubscriptionData(businessId);
    const basePlan = SUBSCRIPTION_PLANS[sub.planId] || SUBSCRIPTION_PLANS.FREE;

    // Overrides directos en la suscripción
    if (sub.customFeatureOverrides && sub.customFeatureOverrides[featureKey] !== undefined) {
      return sub.customFeatureOverrides[featureKey]!;
    }

    let access = basePlan.features[featureKey];

    // Evaluar bonos de addons activos
    for (const addonId of sub.activeAddons) {
      const addon = SUBSCRIPTION_ADDONS[addonId];
      if (addon?.featureAccessBonus && addon.featureAccessBonus[featureKey] !== undefined) {
        access = addon.featureAccessBonus[featureKey]! as any;
      }
    }

    return access;
  }

  /**
   * Calcula el límite efectivo total para un recurso (Plan Base + Addons + Overrides).
   */
  static async getEffectiveLimit(
    businessId: string,
    limitKey: ResourceLimitKey
  ): Promise<number> {
    const sub = await this.getSubscriptionData(businessId);
    const basePlan = SUBSCRIPTION_PLANS[sub.planId] || SUBSCRIPTION_PLANS.FREE;

    // Límite base del plan
    let limit = basePlan.limits[limitKey] ?? 0;

    // Sumar bonos de addons activos
    for (const addonId of sub.activeAddons) {
      const addon = SUBSCRIPTION_ADDONS[addonId];
      if (addon?.limitBonus && typeof addon.limitBonus[limitKey] === 'number') {
        limit += addon.limitBonus[limitKey]!;
      }
    }

    // Overrides específicos del negocio
    if (sub.customLimitOverrides && typeof sub.customLimitOverrides[limitKey] === 'number') {
      limit = sub.customLimitOverrides[limitKey]!;
    }

    return limit;
  }

  /**
   * Compara el consumo actual registrado en UsageEngine contra el límite efectivo.
   * Devuelve true si el negocio aún tiene cuota disponible para el recurso.
   */
  static async hasRemainingQuota(
    businessId: string,
    limitKey: ResourceLimitKey
  ): Promise<boolean> {
    const limit = await this.getEffectiveLimit(businessId, limitKey);
    // Si el límite es 999999 o superior, se considera ilimitado
    if (limit >= 999999) return true;

    const currentUsage = await UsageEngine.getUsage(businessId, limitKey);
    return currentUsage < limit;
  }

  /**
   * Devuelve un objeto consolidado con todos los accesos y límites del negocio.
   */
  static async getSubscriptionSummary(businessId: string) {
    const sub = await this.getSubscriptionData(businessId);
    const plan = SUBSCRIPTION_PLANS[sub.planId] || SUBSCRIPTION_PLANS.FREE;

    const limits: Partial<ResourceLimits> = {};
    const limitKeys: ResourceLimitKey[] = [
      'transactions', 'branches', 'users', 'employees', 'customers',
      'products', 'services', 'resources', 'storage', 'whatsappMessages', 'aiCredits'
    ];

    for (const key of limitKeys) {
      limits[key] = await this.getEffectiveLimit(businessId, key);
    }

    const usages: Partial<ResourceLimits> = {};
    for (const key of limitKeys) {
      usages[key] = await UsageEngine.getUsage(businessId, key);
    }

    return {
      planId: sub.planId,
      planName: plan.name,
      status: sub.status,
      activeAddons: sub.activeAddons,
      features: plan.features,
      limits,
      usages,
      periodEnd: sub.currentPeriodEnd
    };
  }
}
