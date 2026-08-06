/**
 * @file PricingEngine.ts
 * @module core/pricing
 * @description Adaptador del motor de precios para Citiox Enterprise vNext.
 * @responsibility Envolver la lógica actual de cálculo de subtotales, reglas de empaque por producto (NOT_REQUIRED, OPTIONAL, REQUIRED, SPECIAL), costo delivery GPS por distancia (Haversine/Zonas), descuentos y total final bajo la interfaz del ServiceRegistry.
 * @dependencies RuntimeLogger
 * @status Stable (Core Runtime - v1.0)
 */

import { RuntimeLogger } from '../observability/RuntimeLogger';

export type PackagingRequirement = 'NOT_REQUIRED' | 'OPTIONAL' | 'REQUIRED' | 'SPECIAL';

export interface PricingItem {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  takeawayQty?: number;
  packagingRequirement?: PackagingRequirement;
}

export interface CalculatePricingInput {
  items: PricingItem[];
  deliveryType: 'PICKUP_ORDER' | 'DELIVERY_ORDER' | 'TABLE_ORDER';
  packagingUnitPrice?: number;
  distanceKm?: number;
  deliveryConfig?: {
    enabled?: boolean;
    baseCost?: number;
    costPerKm?: number;
    zones?: Array<{ minKm: number; maxKm: number; cost: number }>;
  };
  discountAmount?: number;
}

export interface PricingResult {
  subtotal: number;
  packagingCost: number;
  totalTakeawayUnits: number;
  deliveryCost: number;
  discountAmount: number;
  total: number;
}

export class PricingEngine {
  private logger = RuntimeLogger.getInstance();

  public static calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    return new PricingEngine().calculateHaversineDistance(lat1, lon1, lat2, lon2);
  }

  public static calculate(input: any): PricingResult {
    return new PricingEngine().calculate(input);
  }

  /**
   * Fórmula Haversine para calcular distancia en Km entre dos coordenadas GPS.
   */
  public calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 100) / 100;
  }

  /**
   * Calcula el resumen financiero total aplicando empaque por producto y delivery dinámico.
   */
  public calculate(input: CalculatePricingInput): PricingResult {
    const packagingUnitPrice = input.packagingUnitPrice ?? 0.25;
    let subtotal = 0;
    let totalTakeawayUnits = 0;

    for (const item of input.items) {
      subtotal += item.unitPrice * item.quantity;

      const req = item.packagingRequirement || 'OPTIONAL';
      if (req === 'NOT_REQUIRED') {
        // Cero empaque
      } else if (req === 'REQUIRED') {
        totalTakeawayUnits += item.quantity;
      } else if (req === 'OPTIONAL') {
        totalTakeawayUnits += Math.min(item.quantity, item.takeawayQty || 0);
      } else if (req === 'SPECIAL') {
        totalTakeawayUnits += item.quantity * 1.5; // Coeficiente especial
      }
    }

    const packagingCost = totalTakeawayUnits * packagingUnitPrice;

    // Cálculo dinámico de Delivery
    let deliveryCost = 0;
    if (input.deliveryType === 'DELIVERY_ORDER') {
      const dist = input.distanceKm || 0;
      const cfg = input.deliveryConfig || {
        enabled: true,
        baseCost: 1.50,
        costPerKm: 0.25,
        zones: [
          { minKm: 0, maxKm: 3, cost: 1.50 },
          { minKm: 3, maxKm: 5, cost: 2.50 },
          { minKm: 5, maxKm: 10, cost: 4.00 }
        ]
      };

      if (cfg.zones && Array.isArray(cfg.zones) && cfg.zones.length > 0) {
        const matchedZone = cfg.zones.find(z => dist >= z.minKm && dist < z.maxKm);
        if (matchedZone) {
          deliveryCost = matchedZone.cost;
        } else {
          deliveryCost = Math.round(((cfg.baseCost || 1.5) + (dist * (cfg.costPerKm || 0.25))) * 100) / 100;
        }
      } else {
        deliveryCost = Math.round(((cfg.baseCost || 1.5) + (dist * (cfg.costPerKm || 0.25))) * 100) / 100;
      }
    }

    const discountAmount = input.discountAmount || 0;
    const total = Math.max(0, subtotal + packagingCost + deliveryCost - discountAmount);

    const result: PricingResult = {
      subtotal: Math.round(subtotal * 100) / 100,
      packagingCost: Math.round(packagingCost * 100) / 100,
      totalTakeawayUnits,
      deliveryCost: Math.round(deliveryCost * 100) / 100,
      discountAmount: Math.round(discountAmount * 100) / 100,
      total: Math.round(total * 100) / 100
    };

    this.logger.info(`[PricingEngine] Cálculo completado: Subtotal=$${result.subtotal}, Empaque=$${result.packagingCost}, Delivery=$${result.deliveryCost}, Total=$${result.total}`);
    return result;
  }
}
