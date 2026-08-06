/**
 * @file BlueprintManifests.ts
 * @module core/blueprints
 * @description Declaración pura de manifiestos de Blueprints para Citiox Enterprise vNext.
 * @responsibility Definir la configuración declarativa de capacidades y parámetros iniciales para cada tipo de negocio sin incluir código ejecutable ni efectos secundarios.
 * @dependencies BlueprintManifest
 * @status Stable (Core Blueprints - v1.0)
 */

import { BlueprintManifest } from './BlueprintComposer';

export const RESTAURANT_BLUEPRINT_MANIFEST: BlueprintManifest = {
  id: 'RESTAURANT',
  version: '1.0.0',
  name: 'Blueprint Restaurante & Comanda KDS',
  description: 'Solución integral para restaurantes, cafeterías, mesas, comanda KDS y delivery',
  capabilities: [
    { id: 'restaurant', version: '1.0.0', enabled: true, configuration: { tablesCount: 20 }, dependencies: [] }
  ],
  defaultConfiguration: {
    packagingUnitPrice: 0.25,
    allowTableOrders: true,
    allowDelivery: true,
    allowPickup: true
  }
};

export const SPA_BLUEPRINT_MANIFEST: BlueprintManifest = {
  id: 'SPA',
  version: '1.0.0',
  name: 'Blueprint SPA & Centro de Estética',
  description: 'Gestión de agenda, citas, cabinas y profesionales para spas y peluquerías',
  capabilities: [
    { id: 'spa', version: '1.0.0', enabled: true, configuration: { maxConcurrentAppointments: 5 }, dependencies: [] }
  ],
  defaultConfiguration: {
    slotIntervalMinutes: 30,
    requirePrepayment: false
  }
};

export const LAUNDRY_BLUEPRINT_MANIFEST: BlueprintManifest = {
  id: 'LAUNDRY',
  version: '1.0.0',
  name: 'Blueprint Lavandería & Tintorería',
  description: 'Control de recepción por kilos, prendas, etapas de lavado y entrega',
  capabilities: [
    { id: 'laundry', version: '1.0.0', enabled: true, configuration: { defaultPricePerKg: 1.50 }, dependencies: [] }
  ],
  defaultConfiguration: {
    pricingMode: 'WEIGHT_AND_UNIT',
    expressSurcharge: 2.00
  }
};

export const COURTS_BLUEPRINT_MANIFEST: BlueprintManifest = {
  id: 'SPORTS_COURTS',
  version: '1.0.0',
  name: 'Blueprint Canchas Deportivo',
  description: 'Reservas por hora, turnos de iluminación y canchas sintéticas o pádel',
  capabilities: [
    { id: 'courts', version: '1.0.0', enabled: true, configuration: { courtsCount: 3 }, dependencies: [] }
  ],
  defaultConfiguration: {
    lightingCostPerHour: 3.00,
    reservationDurationMinutes: 60
  }
};

export const PINCHO_LISTO_BLUEPRINT_MANIFEST: BlueprintManifest = {
  id: 'PINCHO_LISTO',
  version: '1.0.0',
  name: 'Blueprint Fast Food / PinchoListo',
  description: 'Producción ultrarrápida para comida rápida y despacho express consolidado en RestaurantCapability',
  capabilities: [
    { id: 'restaurant', version: '1.0.0', enabled: true, configuration: { expressMode: true, fastFulfillment: true }, dependencies: [] }
  ],
  defaultConfiguration: {
    expressMode: true,
    fastFulfillment: true,
    averagePrepTimeMinutes: 8,
    expressDispatchEnabled: true
  }
};

export const ALL_BLUEPRINT_MANIFESTS: Record<string, BlueprintManifest> = {
  // Claves Enterprise (canónicas)
  RESTAURANT: RESTAURANT_BLUEPRINT_MANIFEST,
  SPA: SPA_BLUEPRINT_MANIFEST,
  LAUNDRY: LAUNDRY_BLUEPRINT_MANIFEST,
  SPORTS_COURTS: COURTS_BLUEPRINT_MANIFEST,
  PINCHO_LISTO: PINCHO_LISTO_BLUEPRINT_MANIFEST,

  // Alias legacy (tipoNegocio en Prisma) → Blueprint Enterprise
  RESERVA: SPA_BLUEPRINT_MANIFEST,
  PELUQUERIA: SPA_BLUEPRINT_MANIFEST,
  PRODUCTOS: RESTAURANT_BLUEPRINT_MANIFEST,
  SHOE_CARE: LAUNDRY_BLUEPRINT_MANIFEST,
  CANCHAS: COURTS_BLUEPRINT_MANIFEST,
  'ordenes-servicio': LAUNDRY_BLUEPRINT_MANIFEST
};
