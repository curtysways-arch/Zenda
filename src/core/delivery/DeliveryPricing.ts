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
  tipoNegocio?: string;
  isRoundTrip?: boolean;
}

export interface DeliveryPricingResult {
  distanceKm: number;
  billableDistanceKm: number;
  deliveryCost: number;
  pickupFee?: number;
  deliveryFee?: number;
  totalLogisticsFee?: number;
  appliedZone?: DeliveryZone | null;
  isRoundTrip?: boolean;
}

// Helper para determinar si el tipo de negocio es lavandería / shoe care (desplazamiento doble)
export function isLaundryBusinessType(tipoNegocio?: string | null): boolean {
  if (!tipoNegocio) return false;
  const t = tipoNegocio.toUpperCase().trim();
  return t === 'LAVANDERIA' || t === 'SHOE_CARE' || t === 'ORDENES-SERVICIO';
}

// Cálculo de distancia mediante fórmula de Haversine (en kilómetros - distancia aérea)
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

/**
 * Obtiene la distancia vial real de conducción por calles (no línea recta)
 * utilizando el servicio de rutas gratuito de OpenStreetMap (OSRM).
 * Si el servicio no responde a tiempo, aplica el factor de curvatura vial urbano
 * (~1.30x de la distancia aérea) para garantizar que jamás se use línea recta.
 */
export async function getRoadDistanceKm(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<{ distanceKm: number; durationMin: number; isRoadRoute: boolean }> {
  const haversine = calculateHaversineDistance(originLat, originLng, destLat, destLng);
  if (haversine <= 0.05) {
    return { distanceKm: 0.1, durationMin: 2, isRoadRoute: true };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const url = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=false`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Citiox-Delivery-Engine/1.0' },
      cache: 'no-store'
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes[0]) {
        const roadDistKm = Math.round((data.routes[0].distance / 1000) * 100) / 100;
        const roadDurationMin = Math.ceil(data.routes[0].duration / 60);
        return {
          distanceKm: roadDistKm,
          durationMin: roadDurationMin,
          isRoadRoute: true
        };
      }
    }
  } catch {
    // Si OSRM da timeout o falla temporalmente, usar factor vial urbano
  }

  // Factor de tortuosidad vial urbana: las rutas por calles recorren en promedio un 30% más que la línea recta aérea
  const roadFallbackKm = Math.round(haversine * 1.30 * 100) / 100;
  const estimatedMin = Math.ceil(roadFallbackKm * 2.5) + 4;
  return {
    distanceKm: roadFallbackKm,
    durationMin: estimatedMin,
    isRoadRoute: false
  };
}

export function calculateDeliveryCost(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  config: DeliveryConfig,
  precalculatedRoadDistanceKm?: number
): DeliveryPricingResult {
  if (!config.enabled) {
    return { distanceKm: 0, billableDistanceKm: 0, deliveryCost: 0, appliedZone: null, isRoundTrip: false };
  }

  // La distancia no debe ser en línea recta:
  // Si viene precalculada por OSRM, se usa directamente; de lo contrario, se aplica el factor vial urbano (~1.30x)
  const distance = (precalculatedRoadDistanceKm !== undefined && precalculatedRoadDistanceKm > 0)
    ? precalculatedRoadDistanceKm
    : Math.round(calculateHaversineDistance(originLat, originLng, destLat, destLng) * 1.30 * 100) / 100;

  // Determinar si aplica desplazamiento doble (Recogida + Entrega)
  // Únicamente aplica al vertical LAVANDERÍA / SHOE_CARE o cuando se solicita explícitamente isRoundTrip
  const isLaundry = Boolean(config.isRoundTrip || isLaundryBusinessType(config.tipoNegocio));

  // Lavandería: son DOS viajes (retiro: local → cliente → local; entrega: local → cliente).
  // Cada viaje cuesta lo mismo que un envío normal y lo cobra un repartidor distinto:
  //   envío al cliente = 2 × tarifa de un viaje · pago a cada repartidor = 1 tarifa.
  const billableDistance = isLaundry ? Math.round(distance * 2 * 100) / 100 : distance;

  let oneTrip: number;
  let matchedZone: DeliveryZone | null = null;
  if (config.zones && config.zones.length > 0) {
    matchedZone = config.zones.find((z) => distance >= z.minKm && distance <= z.maxKm) || null;
  }
  if (matchedZone) {
    oneTrip = matchedZone.cost;
  } else {
    oneTrip = config.baseCost + distance * config.costPerKm;
  }
  oneTrip = Math.round(oneTrip * 100) / 100;

  const total = isLaundry ? Math.round(oneTrip * 2 * 100) / 100 : oneTrip;
  return {
    distanceKm: distance,
    billableDistanceKm: billableDistance,
    deliveryCost: total,
    pickupFee: isLaundry ? oneTrip : 0,
    deliveryFee: oneTrip,
    totalLogisticsFee: total,
    appliedZone: matchedZone,
    isRoundTrip: isLaundry,
  };
}

/**
 * Versión asíncrona que consulta la ruta vial real por calles en OSRM (OpenStreetMap gratis)
 */
export async function calculateDeliveryCostAsync(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  config: DeliveryConfig
): Promise<DeliveryPricingResult> {
  const roadInfo = await getRoadDistanceKm(originLat, originLng, destLat, destLng);
  return calculateDeliveryCost(originLat, originLng, destLat, destLng, config, roadInfo.distanceKm);
}

