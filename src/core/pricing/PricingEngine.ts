/**
 * @file PricingEngine.ts
 * @module core/pricing
 * @description Adaptador del motor de precios para Citiox Enterprise vNext con precisión Decimal.
 * @responsibility Envolver la lógica actual de cálculo de subtotales, reglas de empaque por producto (NOT_REQUIRED, OPTIONAL, REQUIRED, SPECIAL), costo delivery GPS por distancia (Haversine/Zonas), descuentos y total final bajo precisión Decimal y redondeo bancario exacto.
 * @dependencies RuntimeLogger, decimal.ts
 * @status Stable (Core Runtime - v1.1 Decimal Compatible)
 */

import { RuntimeLogger } from '../observability/RuntimeLogger';
import {
  toDecimal,
  decimalAdd,
  decimalSub,
  decimalMul,
  decimalDiv,
  roundMoney,
  roundQty,
  DecimalInput
} from '@/lib/math/decimal';
import { Prisma } from '@prisma/client';

export type PackagingRequirement = 'NOT_REQUIRED' | 'OPTIONAL' | 'REQUIRED' | 'SPECIAL';

export interface PricingItem {
  productId: string;
  name: string;
  unitPrice: DecimalInput;
  quantity: DecimalInput;
  takeawayQty?: DecimalInput;
  packagingRequirement?: PackagingRequirement;
}

export interface CalculatePricingInput {
  items: PricingItem[];
  deliveryType: 'PICKUP_ORDER' | 'DELIVERY_ORDER' | 'TABLE_ORDER';
  packagingUnitPrice?: DecimalInput;
  distanceKm?: DecimalInput;
  tipoNegocio?: string;
  isRoundTrip?: boolean;
  deliveryConfig?: {
    enabled?: boolean;
    baseCost?: DecimalInput;
    costPerKm?: DecimalInput;
    zones?: Array<{ minKm: number; maxKm: number; cost: DecimalInput }>;
  };
  discountAmount?: DecimalInput;
}

export interface PricingResult {
  subtotal: number;
  packagingCost: number;
  totalTakeawayUnits: number;
  deliveryCost: number;
  pickupFee?: number;
  deliveryFee?: number;
  totalLogisticsFee?: number;
  discountAmount: number;
  total: number;
  // Campos Decimal nativos para consumidores contables de alta precisión
  subtotalDecimal?: Prisma.Decimal;
  totalDecimal?: Prisma.Decimal;
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
   * Calcula el resumen financiero total aplicando empaque por producto y delivery dinámico
   * con precisión Decimal y sin truncamiento de cantidades fraccionarias.
   */
  public calculate(input: CalculatePricingInput): PricingResult {
    const packagingUnitPrice = toDecimal(input.packagingUnitPrice, '0.25');
    let subtotalDec = toDecimal(0);
    let totalTakeawayUnitsDec = toDecimal(0);

    for (const item of (input.items || [])) {
      const price = toDecimal(item.unitPrice ?? (item as any).precioUnitario ?? 0);
      const qty = roundQty(item.quantity ?? (item as any).cantidad ?? 1);
      const itemSubtotal = decimalMul(price, qty);
      subtotalDec = decimalAdd(subtotalDec, itemSubtotal);

      const req = item.packagingRequirement || 'OPTIONAL';
      if (req === 'NOT_REQUIRED') {
        // Cero empaque
      } else if (req === 'REQUIRED') {
        totalTakeawayUnitsDec = decimalAdd(totalTakeawayUnitsDec, qty);
      } else if (req === 'OPTIONAL') {
        const takeawayQty = roundQty(item.takeawayQty ?? 0);
        const applicableUnits = qty.lessThan(takeawayQty) ? qty : takeawayQty;
        totalTakeawayUnitsDec = decimalAdd(totalTakeawayUnitsDec, applicableUnits);
      } else if (req === 'SPECIAL') {
        const specialUnits = decimalMul(qty, '1.5');
        totalTakeawayUnitsDec = decimalAdd(totalTakeawayUnitsDec, specialUnits);
      }
    }

    const packagingCostDec = roundMoney(decimalMul(totalTakeawayUnitsDec, packagingUnitPrice));

    // Cálculo dinámico de Delivery
    let deliveryCostDec = toDecimal(0);
    if (input.deliveryType === 'DELIVERY_ORDER') {
      const distDec = toDecimal(input.distanceKm ?? 0);
      const distNum = distDec.toNumber();
      const isLaundry = Boolean(
        input.isRoundTrip ||
        (input.tipoNegocio && ['LAVANDERIA', 'SHOE_CARE', 'ORDENES-SERVICIO'].includes(input.tipoNegocio.toUpperCase()))
      );
      const billableDistDec = isLaundry ? decimalMul(distDec, 2) : distDec;

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
        const matchedZone = cfg.zones.find(z => distNum >= z.minKm && distNum < z.maxKm);
        if (matchedZone) {
          deliveryCostDec = roundMoney(matchedZone.cost);
        } else {
          const baseCost = toDecimal(cfg.baseCost ?? 1.5);
          const costPerKm = toDecimal(cfg.costPerKm ?? 0.25);
          deliveryCostDec = roundMoney(decimalAdd(baseCost, decimalMul(billableDistDec, costPerKm)));
        }
      } else {
        const baseCost = toDecimal(cfg.baseCost ?? 1.5);
        const costPerKm = toDecimal(cfg.costPerKm ?? 0.25);
        deliveryCostDec = roundMoney(decimalAdd(baseCost, decimalMul(billableDistDec, costPerKm)));
      }
    }

    const discountAmountDec = roundMoney(input.discountAmount ?? 0);
    const grossTotalDec = decimalSub(
      decimalAdd(decimalAdd(subtotalDec, packagingCostDec), deliveryCostDec),
      discountAmountDec
    );
    const totalDec = roundMoney(grossTotalDec.isNegative() ? toDecimal(0) : grossTotalDec);

    const isLaundry = Boolean(
      input.isRoundTrip ||
      (input.tipoNegocio && ['LAVANDERIA', 'SHOE_CARE', 'ORDENES-SERVICIO'].includes(input.tipoNegocio.toUpperCase()))
    );

    const pickupFeeDec = isLaundry ? roundMoney(decimalDiv(deliveryCostDec, 2)) : toDecimal(0);
    const driverDeliveryFeeDec = isLaundry ? decimalSub(deliveryCostDec, pickupFeeDec) : deliveryCostDec;

    const subtotalFinal = roundMoney(subtotalDec);

    const result: PricingResult = {
      subtotal: subtotalFinal.toNumber(),
      packagingCost: packagingCostDec.toNumber(),
      totalTakeawayUnits: totalTakeawayUnitsDec.toNumber(),
      deliveryCost: deliveryCostDec.toNumber(),
      pickupFee: pickupFeeDec.toNumber(),
      deliveryFee: driverDeliveryFeeDec.toNumber(),
      totalLogisticsFee: deliveryCostDec.toNumber(),
      discountAmount: discountAmountDec.toNumber(),
      total: totalDec.toNumber(),
      subtotalDecimal: subtotalFinal,
      totalDecimal: totalDec
    };

    this.logger.info(`[PricingEngine] Cálculo completado: Subtotal=$${result.subtotal}, Empaque=$${result.packagingCost}, Delivery=$${result.deliveryCost}, Total=$${result.total}`);
    return result;
  }
}
