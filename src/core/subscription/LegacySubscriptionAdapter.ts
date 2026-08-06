// src/core/subscription/LegacySubscriptionAdapter.ts
// Adaptador retrocompatible para migrar los planes y suscripciones existentes a SubscriptionEngine v3.0

import { SubscriptionEngine } from './SubscriptionEngine';
import { UsageEngine } from './UsageEngine';
import { FeatureAccessLevels, ResourceLimitKey } from './types';

export class LegacySubscriptionAdapter {
  /**
   * Mapea banderas booleanas antiguas (ej: "whatsapp_notifications", "remove_zenda_branding")
   * al nivel de acceso de SubscriptionEngine.
   */
  static async canUseLegacyFeature(businessId: string, featureFlag: string): Promise<boolean> {
    if (!businessId) return false;

    // Negocio especial de prueba
    if (businessId === 'sneaker-wash-id') {
      return true;
    }

    if (featureFlag === 'remove_zenda_branding') {
      const branding = await SubscriptionEngine.getFeatureAccess(businessId, 'branding');
      return branding === 'custom_logo' || branding === 'white_label';
    }

    if (featureFlag.startsWith('whatsapp')) {
      const comms = await SubscriptionEngine.getFeatureAccess(businessId, 'communications');
      return comms !== 'none';
    }

    if (featureFlag === 'analytics') {
      const reports = await SubscriptionEngine.getFeatureAccess(businessId, 'reports');
      return reports === 'advanced' || reports === 'enterprise';
    }

    if (featureFlag === 'automation') {
      const automations = await SubscriptionEngine.getFeatureAccess(businessId, 'automations');
      return automations !== 'none';
    }

    if (featureFlag === 'multi_branch') {
      const limit = await SubscriptionEngine.getEffectiveLimit(businessId, 'branches');
      return limit > 1;
    }

    if (featureFlag === 'multi_staff') {
      const limit = await SubscriptionEngine.getEffectiveLimit(businessId, 'employees');
      return limit > 1;
    }

    // Default: consultar feature de forma directa si existe en FeatureAccessLevels
    const access = await SubscriptionEngine.getFeatureAccess(businessId, featureFlag as keyof FeatureAccessLevels);
    return access !== 'none' && access !== false;
  }

  /**
   * Mapea claves de límites numéricos antiguos (ej: "max_staff", "max_appointments_monthly")
   * a ResourceLimitKey de SubscriptionEngine.
   */
  static async getLegacyLimit(businessId: string, limitKey: string): Promise<number> {
    const keyMap: Record<string, ResourceLimitKey> = {
      max_staff: 'employees',
      max_appointments_monthly: 'transactions',
      max_locations: 'branches',
      max_services: 'services'
    };

    const targetKey = keyMap[limitKey] || (limitKey as ResourceLimitKey);
    return await SubscriptionEngine.getEffectiveLimit(businessId, targetKey);
  }
}
