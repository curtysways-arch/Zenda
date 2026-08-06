/**
 * @file BackwardCompatibilityAdapter.ts
 * @module core/adapters
 * @description Adaptador puro de traducción entre la arquitectura legacy y Citiox Enterprise vNext.
 * @responsibility Traducir objetos de negocio antiguos (tipoNegocio, configuracion JSON) a BusinessRuntimeContext, mapear a BlueprintManifests y mapear eventos legacy a versioned envelopes sin incluir lógica de negocio.
 * @dependencies BusinessRuntimeContext, EventEnvelope, BlueprintManifests
 * @status Stable (Core Adapters - v1.0)
 */

import { BusinessRuntimeContext } from '../kernel/BusinessRuntimeContext';
import { EventEnvelope } from '../events/EventBus';
import { BlueprintManifest } from '../blueprints/BlueprintComposer';
import { ALL_BLUEPRINT_MANIFESTS, RESTAURANT_BLUEPRINT_MANIFEST } from '../blueprints/BlueprintManifests';

export class BackwardCompatibilityAdapter {
  /**
   * Obtiene el BlueprintManifest correspondiente a un tipo de negocio legacy.
   */
  public static toBlueprintManifest(legacyType: string): BlueprintManifest {
    const key = (legacyType || 'RESTAURANT').toUpperCase();
    return ALL_BLUEPRINT_MANIFESTS[key] || ALL_BLUEPRINT_MANIFESTS['RESTAURANT'] || RESTAURANT_BLUEPRINT_MANIFEST;
  }

  /**
   * Traduce la entidad de negocio de la BD legacy a un BusinessRuntimeContext puro.
   */
  public static toRuntimeContext(legacyBusiness: any): BusinessRuntimeContext {
    let cfg: Record<string, unknown> = {};
    if (typeof legacyBusiness.configuracion === 'string') {
      try { cfg = JSON.parse(legacyBusiness.configuracion); } catch { cfg = {}; }
    } else {
      cfg = legacyBusiness.configuracion || {};
    }

    const tipo = legacyBusiness.tipoNegocio || 'RESTAURANT';
    const manifest = this.toBlueprintManifest(tipo);
    const activeCapabilities = manifest.capabilities.filter(c => c.enabled).map(c => c.id);

    return {
      businessId: legacyBusiness.id || 'demo-biz-id',
      tenantId: legacyBusiness.tenantId || 'tenant-default',
      slug: legacyBusiness.slug || 'demo-slug',
      blueprint: manifest.id, // ID canónico del Blueprint, no el string legacy
      activeCapabilities,
      configuration: { ...manifest.defaultConfiguration, ...cfg },
      permissions: ['ADMIN', 'STAFF', 'MESERO', 'DRIVER']
    };
  }

  /**
   * Mapea un payload de evento legacy a un EventEnvelope vNext.
   */
  public static toEventEnvelope(legacyEvent: string, businessId: string, data: any): EventEnvelope {
    return {
      eventId: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: legacyEvent.toLowerCase().replace('_', '.'),
      version: 'v1',
      timestamp: new Date().toISOString(),
      correlationId: `corr-${Date.now()}`,
      businessId,
      source: 'legacy-adapter',
      payload: data
    };
  }
}
