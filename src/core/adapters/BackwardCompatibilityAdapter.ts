/**
 * @file BackwardCompatibilityAdapter.ts
 * @module core/adapters
 * @description Adaptador puro de traducción entre la arquitectura legacy y Citiox Enterprise vNext.
 * @responsibility Traducir objetos de negocio antiguos (tipoNegocio, configuracion JSON) a BusinessRuntimeContext y mapear eventos legacy a versioned envelopes sin incluir lógica de negocio.
 * @dependencies BusinessRuntimeContext, EventEnvelope
 * @status Experimental (Core Foundation - v1.0)
 */

import { BusinessRuntimeContext } from '../kernel/BusinessRuntimeContext';
import { EventEnvelope } from '../events/EventBus';

export class BackwardCompatibilityAdapter {
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

    const activeCapabilities: string[] = [];
    const tipo = legacyBusiness.tipoNegocio || 'RESTAURANT';

    // Mapeo automático de capacidades legacy según tipo de negocio
    if (tipo === 'RESTAURANT' || tipo === 'PRODUCTOS') {
      activeCapabilities.push('orders', 'pricing', 'catalog', 'pickup', 'delivery');
      if (tipo === 'RESTAURANT') {
        activeCapabilities.push('kitchen', 'tables', 'takeOrders');
      }
    } else if (tipo === 'RESERVA' || tipo === 'SPA') {
      activeCapabilities.push('appointments', 'catalog', 'services');
    } else if (tipo === 'SPORTS_COURTS') {
      activeCapabilities.push('courts', 'appointments');
    } else if (tipo === 'SHOE_CARE' || tipo === 'ordenes-servicio') {
      activeCapabilities.push('services', 'orders');
    }

    return {
      businessId: legacyBusiness.id || 'demo-biz-id',
      tenantId: legacyBusiness.tenantId || 'tenant-default',
      slug: legacyBusiness.slug || 'demo-slug',
      blueprint: tipo,
      activeCapabilities,
      configuration: cfg,
      permissions: ['ADMIN', 'STAFF', 'MESERO', 'DRIVER']
    };
  }

  /**
   * Mapea un payload de evento legacy a un EventEnvelope vNext.
   */
  public static toEventEnvelope(legacyEvent: string, businessId: string, data: any): EventEnvelope {
    return {
      eventId: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
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
