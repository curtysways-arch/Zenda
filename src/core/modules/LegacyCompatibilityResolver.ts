/**
 * @file LegacyCompatibilityResolver.ts
 * @module core/modules
 * @description Adaptador de compatibilidad de solo lectura para campos legacy como 'customFeatures'.
 * 
 * REGLAS FUNDAMENTALES:
 * 1. 'customFeatures' es estrictamente READ-ONLY para preservar compatibilidad con cuentas históricas.
 * 2. Ningún módulo nuevo se almacena en customFeatures; las nuevas capacidades deben gobernarse
 *    exclusivamente por PlanEntitlement y PlanLimit.
 * 3. Banderas como 'tournaments_module' o 'automatic_discounts' se resuelven como capability flags
 *    virtuales sin contaminar el catálogo canónico de 34 módulos de BusinessModuleCatalog.
 */

export const LEGACY_FEATURE_MAP: Record<string, string> = {
  courses_module: 'COURSES',
  communications_module: 'COMMUNICATION_CENTER',
  whatsapp_notifications: 'NOTIFICATIONS',
  loyalty_module: 'LOYALTY',
  tournaments_module: 'TOURNAMENTS',
  automatic_discounts: 'AUTOMATIC_DISCOUNTS',
  online_booking: 'APPOINTMENTS',
  qr_menu: 'QR_TABLE',
  inventory_control: 'INVENTORY'
};

export class LegacyCompatibilityResolver {
  /**
   * Parsea de forma segura el contenido de customFeatures (ya sea string JSON u objeto).
   */
  public static parseCustomFeatures(raw: any): Record<string, any> {
    if (!raw) return {};
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw);
      } catch {
        return {};
      }
    }
    if (typeof raw === 'object' && raw !== null) {
      return raw;
    }
    return {};
  }

  /**
   * Resuelve y normaliza todas las banderas legacy en un mapa de capacidades canónicas y virtuales.
   */
  public static resolveLegacyCapabilities(rawCustomFeatures: any): Record<string, boolean> {
    const parsed = this.parseCustomFeatures(rawCustomFeatures);
    const resolved: Record<string, boolean> = {};

    for (const [legacyKey, canonicalCode] of Object.entries(LEGACY_FEATURE_MAP)) {
      if (parsed[legacyKey] !== undefined) {
        resolved[canonicalCode] = Boolean(parsed[legacyKey]);
        resolved[canonicalCode.toLowerCase()] = Boolean(parsed[legacyKey]);
      }
    }

    // Si tiene add-ons embebidos en el payload legacy
    if (Array.isArray(parsed.addons)) {
      for (const add of parsed.addons) {
        const id = typeof add === 'string' ? add : add?.id;
        if (id) {
          resolved[id.toUpperCase()] = true;
          resolved[id.toLowerCase()] = true;
        }
      }
    }

    return resolved;
  }

  /**
   * Evalúa si una clave o bandera específica está habilitada en el blob legacy.
   */
  public static isLegacyFeatureActive(rawCustomFeatures: any, featureKey: string): boolean {
    const parsed = this.parseCustomFeatures(rawCustomFeatures);
    
    // Búsqueda directa
    if (parsed[featureKey] !== undefined) {
      return Boolean(parsed[featureKey]);
    }

    // Búsqueda inversa a través del mapa
    for (const [legacyKey, canonicalCode] of Object.entries(LEGACY_FEATURE_MAP)) {
      if (canonicalCode === featureKey.toUpperCase() && parsed[legacyKey] !== undefined) {
        return Boolean(parsed[legacyKey]);
      }
    }

    return false;
  }
}
