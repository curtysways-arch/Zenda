// src/core/pricing/PricingEngine.ts
// Motor de Cálculo de Precios y Costos Adicionales Basado en Reglas Declarativas

import { calculateDeliveryCost, DeliveryConfig } from '../delivery/DeliveryPricing';

export interface OrderItemInput {
  productId: string;
  nombreProducto: string;
  precioUnitario: number;
  cantidad: number;
  categoriaKey?: string;
}

export interface PackagingConfig {
  enabled: boolean;
  type: 'FREE' | 'FLAT' | 'PER_PRODUCT';
  amount: number;
}

export interface PricingInput {
  items: OrderItemInput[];
  deliveryType: 'TABLE_ORDER' | 'DELIVERY_ORDER' | 'PICKUP_ORDER' | 'MESA' | 'DOMICILIO' | 'RETIRO';
  discountAmount?: number;
  serviceFee?: number;
  deliveryConfig?: DeliveryConfig;
  packagingConfig?: PackagingConfig;
  originCoords?: { lat: number; lng: number };
  destinationCoords?: { lat: number; lng: number };
}

export interface PricingCalculationResult {
  subtotal: number;
  packagingCost: number;
  deliveryCost: number;
  discountAmount: number;
  serviceFee: number;
  total: number;
  breakdown: {
    itemCount: number;
    itemsTotal: number;
    packagingType: string;
    packagingAmountPerItem: number;
    distanceKm?: number;
    appliedDeliveryZone?: any;
    ruleLogs: string[];
  };
}

export class PricingEngine {
  public static calculate(input: PricingInput): PricingCalculationResult {
    const ruleLogs: string[] = [];

    // 1. Subtotal de productos
    let subtotal = 0;
    let totalItemsCount = 0;

    for (const item of input.items) {
      subtotal += item.precioUnitario * item.cantidad;
      totalItemsCount += item.cantidad;
    }
    subtotal = Math.round(subtotal * 100) / 100;
    ruleLogs.push(`Subtotal calculado para ${totalItemsCount} items: $${subtotal.toFixed(2)}`);

    // 2. Costo de Empaque (Packaging)
    let packagingCost = 0;
    const pkgConfig = input.packagingConfig || { enabled: false, type: 'FREE', amount: 0 };
    
    // El empaque se aplica para pedidos para llevar / retiro / delivery
    const isTakeAway = ['PICKUP_ORDER', 'RETIRO', 'DELIVERY_ORDER', 'DOMICILIO'].includes(input.deliveryType);
    
    if (isTakeAway && pkgConfig.enabled) {
      if (pkgConfig.type === 'FLAT') {
        packagingCost = pkgConfig.amount;
        ruleLogs.push(`Empaque tarifa fija (FLAT): $${packagingCost.toFixed(2)}`);
      } else if (pkgConfig.type === 'PER_PRODUCT') {
        packagingCost = pkgConfig.amount * totalItemsCount;
        ruleLogs.push(`Empaque por producto (${totalItemsCount} x $${pkgConfig.amount}): $${packagingCost.toFixed(2)}`);
      } else {
        ruleLogs.push(`Empaque sin costo (FREE)`);
      }
    } else {
      ruleLogs.push(`Empaque omitido (Consumo en local o empaque desactivado)`);
    }
    packagingCost = Math.round(packagingCost * 100) / 100;

    // 3. Costo de Delivery por distancia
    let deliveryCost = 0;
    let distanceKm = 0;
    let appliedZone = null;

    const isDelivery = ['DELIVERY_ORDER', 'DOMICILIO'].includes(input.deliveryType);
    if (isDelivery && input.deliveryConfig?.enabled) {
      if (input.originCoords && input.destinationCoords) {
        const result = calculateDeliveryCost(
          input.originCoords.lat,
          input.originCoords.lng,
          input.destinationCoords.lat,
          input.destinationCoords.lng,
          input.deliveryConfig
        );
        deliveryCost = result.deliveryCost;
        distanceKm = result.distanceKm;
        appliedZone = result.appliedZone;
        ruleLogs.push(`Delivery por distancia (${distanceKm} km): $${deliveryCost.toFixed(2)}`);
      } else {
        deliveryCost = input.deliveryConfig.baseCost || 0;
        ruleLogs.push(`Delivery tarifa base por defecto: $${deliveryCost.toFixed(2)}`);
      }
    }
    deliveryCost = Math.round(deliveryCost * 100) / 100;

    // 4. Descuentos y Tarifa de Servicio
    const discountAmount = Math.max(0, input.discountAmount || 0);
    const serviceFee = Math.max(0, input.serviceFee || 0);

    if (discountAmount > 0) ruleLogs.push(`Descuento aplicado: -$${discountAmount.toFixed(2)}`);
    if (serviceFee > 0) ruleLogs.push(`Cargo por servicio aplicado: +$${serviceFee.toFixed(2)}`);

    // 5. Total Final
    const totalRaw = subtotal + packagingCost + deliveryCost + serviceFee - discountAmount;
    const total = Math.max(0, Math.round(totalRaw * 100) / 100);
    ruleLogs.push(`Total final calculado: $${total.toFixed(2)}`);

    return {
      subtotal,
      packagingCost,
      deliveryCost,
      discountAmount,
      serviceFee,
      total,
      breakdown: {
        itemCount: totalItemsCount,
        itemsTotal: subtotal,
        packagingType: pkgConfig.type,
        packagingAmountPerItem: pkgConfig.amount,
        distanceKm,
        appliedDeliveryZone: appliedZone,
        ruleLogs
      }
    };
  }
}
