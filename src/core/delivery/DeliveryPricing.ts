// src/core/delivery/DeliveryPricing.ts
// Motor de cálculo de distancias y costos de envío del Delivery Engine de Citiox

export interface DeliveryZone {
  minKm: number;
  maxKm: number;
  cost: number;
}

export interface DeliveryConfig {
  enabled: boolean;
  baseCost: number;
  costPerKm: number;
  zones?: DeliveryZone[];
  latitudNegocio?: number;
  longitudNegocio?: number;
}

export interface DeliveryPricingResult {
  distanceKm: number;
  deliveryCost: number;
  appliedZone?: DeliveryZone | null;
}

// Cálculo de distancia mediante fórmula de Haversine (en kilómetros)
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100; // Redondeado a 2 decimales
}

export function calculateDeliveryCost(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  config: DeliveryConfig
): DeliveryPricingResult {
  if (!config.enabled) {
    return { distanceKm: 0, deliveryCost: 0, appliedZone: null };
  }

  const distance = calculateHaversineDistance(originLat, originLng, destLat, destLng);

  // Si hay zonas/rangos configurados, buscar la zona correspondiente
  if (config.zones && config.zones.length > 0) {
    const matchedZone = config.zones.find(
      (z) => distance >= z.minKm && distance <= z.maxKm
    );
    if (matchedZone) {
      return {
        distanceKm: distance,
        deliveryCost: matchedZone.cost,
        appliedZone: matchedZone,
      };
    }
  }

  // Fallback: cálculo por tarifa base + costo por km
  const calculatedCost = config.baseCost + distance * config.costPerKm;
  return {
    distanceKm: distance,
    deliveryCost: Math.round(calculatedCost * 100) / 100,
    appliedZone: null,
  };
}
