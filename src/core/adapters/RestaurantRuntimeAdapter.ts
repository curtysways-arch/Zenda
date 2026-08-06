/**
 * @file RestaurantRuntimeAdapter.ts
 * @module core/adapters
 * @description Puente entre el ciclo de pedidos legacy (Prisma) y la arquitectura Enterprise vNext.
 * @responsibility Traducir entidades legacy (Pedido, PedidoDetalle, Cliente, Producto, Delivery) a los
 *   contratos del Core (CommercialOrderState, FulfillmentTicket, DeliveryTask) y orquestar el ciclo
 *   completo OrderRuntime → FulfillmentEngine → DeliveryEngine → NotificationRuntime de forma
 *   pasiva y opcional, controlada por FeatureFlagProvider.
 * @dependencies OrderRuntime, FulfillmentEngine, DeliveryEngine, PricingEngine, VersionedEventBus,
 *              FeatureFlagProvider, RuntimeLogger
 * @status Experimental (FASE 5B - Restaurant Runtime Pilot)
 */

import { OrderRuntime, CommercialOrderState, OrderCommercialStatus } from '../runtimes/OrderRuntime';
import { FulfillmentEngine, FulfillmentTicket } from '../fulfillment/FulfillmentEngine';
import { DeliveryEngine, DeliveryTask } from '../delivery/DeliveryEngine';
import { PricingEngine, PricingResult } from '../pricing/PricingEngine';
import { VersionedEventBus, EventEnvelope } from '../events/EventBus';
import { FeatureFlagProvider } from '../kernel/FeatureFlagProvider';
import { RuntimeLogger } from '../observability/RuntimeLogger';

// ────────────────────────────────────────────────────────────
// Tipos de traducción Legacy → Enterprise
// ────────────────────────────────────────────────────────────

/** Forma simplificada de un pedido tal como llega desde Prisma */
export interface LegacyPedido {
  id: string;
  negocioId: string;
  numeroPedido: number;
  estado: string;
  tipoEntrega: string;
  nombreCliente: string;
  telefonoCliente: string;
  direccionCliente?: string | null;
  referenciaCliente?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  subtotal: number;
  costoEnvio: number;
  total: number;
  fechaEntrega?: Date | string | null;
  franjaHoraria?: string | null;
  extraInfo?: any;
  items: LegacyPedidoItem[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface LegacyPedidoItem {
  id?: string;
  productoId: string;
  nombreProducto: string;
  precioUnitario: number;
  cantidad: number;
}

/** Resultado del procesamiento completo a través del Core */
export interface RestaurantRuntimeResult {
  processed: boolean;
  orderState: CommercialOrderState;
  fulfillmentTicket?: FulfillmentTicket;
  deliveryTask?: DeliveryTask;
  pricingResult?: PricingResult;
  skippedReason?: string;
}

// ────────────────────────────────────────────────────────────
// Tabla de mapeo: estado legacy → OrderCommercialStatus
// ────────────────────────────────────────────────────────────

const LEGACY_TO_COMMERCIAL_STATUS: Record<string, OrderCommercialStatus> = {
  'WAITING_CONFIRMATION': 'WAITING_ACCEPTANCE',
  'RECIBIDO':             'ACCEPTED',
  'CONFIRMED':            'CONFIRMED',
  'PREPARACION':          'CONFIRMED',
  'EN_PREPARACION':       'CONFIRMED',
  'LISTO':                'CONFIRMED',
  'RUTA':                 'CONFIRMED',
  'EN_CAMINO':            'CONFIRMED',
  'ENTREGADO':            'COMPLETED',
  'CANCELADO':            'CANCELLED',
  'RECHAZADO':            'REJECTED',
};

// ────────────────────────────────────────────────────────────
// RestaurantRuntimeAdapter
// ────────────────────────────────────────────────────────────

export class RestaurantRuntimeAdapter {
  private logger = RuntimeLogger.getInstance();
  private featureFlags = FeatureFlagProvider.getInstance();
  private orderRuntime: OrderRuntime;
  private fulfillmentEngine: FulfillmentEngine;
  private deliveryEngine: DeliveryEngine;

  constructor(private eventBus: VersionedEventBus) {
    this.orderRuntime = new OrderRuntime(eventBus);
    this.fulfillmentEngine = new FulfillmentEngine(eventBus);
    this.deliveryEngine = new DeliveryEngine(eventBus);
  }

  // ──────────────────────────────────────────────────────────
  // Guard: ¿Está habilitado el runtime para restaurantes?
  // ──────────────────────────────────────────────────────────

  private isEnabled(): boolean {
    return this.featureFlags.isEnabled('runtime.enabled')
      && this.featureFlags.isEnabled('runtime.capabilities');
  }

  // ──────────────────────────────────────────────────────────
  // 1. Traducción: Pedido Legacy → CommercialOrderState
  // ──────────────────────────────────────────────────────────

  public toLegacyOrderState(pedido: LegacyPedido): CommercialOrderState {
    return {
      orderId: pedido.id,
      businessId: pedido.negocioId,
      status: LEGACY_TO_COMMERCIAL_STATUS[pedido.estado] || 'WAITING_ACCEPTANCE',
      subtotal: pedido.subtotal,
      total: pedido.total,
      items: pedido.items.map(item => ({
        productId: item.productoId,
        name: item.nombreProducto,
        unitPrice: item.precioUnitario,
        quantity: item.cantidad,
      })),
      createdAt: pedido.createdAt ? new Date(pedido.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: pedido.updatedAt ? new Date(pedido.updatedAt).toISOString() : new Date().toISOString(),
    };
  }

  // ──────────────────────────────────────────────────────────
  // 2. Traducción: estado legacy → OrderCommercialStatus
  // ──────────────────────────────────────────────────────────

  public static mapLegacyStatus(legacyEstado: string): OrderCommercialStatus {
    return LEGACY_TO_COMMERCIAL_STATUS[legacyEstado] || 'WAITING_ACCEPTANCE';
  }

  // ──────────────────────────────────────────────────────────
  // 3. Recalcular pricing usando PricingEngine del Core
  // ──────────────────────────────────────────────────────────

  public recalculatePricing(pedido: LegacyPedido, config?: any): PricingResult {
    const negocioConfig = config || {};
    return PricingEngine.calculate({
      items: pedido.items.map(i => ({
        productId: i.productoId,
        nombreProducto: i.nombreProducto,
        precioUnitario: i.precioUnitario,
        cantidad: i.cantidad,
      })),
      deliveryType: this.mapDeliveryType(pedido.tipoEntrega),
      deliveryConfig: negocioConfig.deliveryConfig || { enabled: true, baseCost: 1.50, costPerKm: 0.25 },
      packagingConfig: negocioConfig.packagingConfig || { enabled: true, type: 'PER_PRODUCT', amount: 0.25 },
    });
  }

  // ──────────────────────────────────────────────────────────
  // 4. Procesar pedido nuevo (creación inicial)
  // ──────────────────────────────────────────────────────────

  public async processNewOrder(pedido: LegacyPedido): Promise<RestaurantRuntimeResult> {
    if (!this.isEnabled()) {
      return { processed: false, orderState: this.toLegacyOrderState(pedido), skippedReason: 'Runtime deshabilitado' };
    }

    this.logger.info(`[RestaurantRuntimeAdapter] Procesando pedido nuevo #${pedido.numeroPedido} (${pedido.id})`);

    const orderState = this.toLegacyOrderState(pedido);

    // Emitir evento de creación en el VersionedEventBus
    await this.eventBus.publish({
      eventId: `evt-rra-new-${Date.now()}`,
      name: 'orders.created',
      version: 'v1',
      timestamp: new Date().toISOString(),
      correlationId: `corr-rra-${pedido.id}`,
      businessId: pedido.negocioId,
      source: 'RestaurantRuntimeAdapter',
      payload: orderState,
    });

    return { processed: true, orderState };
  }

  // ──────────────────────────────────────────────────────────
  // 5. Procesar confirmación de pedido (ciclo completo)
  // ──────────────────────────────────────────────────────────

  public async processOrderConfirmed(pedido: LegacyPedido): Promise<RestaurantRuntimeResult> {
    if (!this.isEnabled()) {
      return { processed: false, orderState: this.toLegacyOrderState(pedido), skippedReason: 'Runtime deshabilitado' };
    }

    this.logger.info(`[RestaurantRuntimeAdapter] Confirmación de pedido #${pedido.numeroPedido} (${pedido.id})`);

    // 5a. Transicionar estado comercial → CONFIRMED
    const orderState = this.toLegacyOrderState(pedido);
    const confirmedState = await this.orderRuntime.transitionOrder(orderState, 'CONFIRMED');

    // 5b. Crear ticket de cumplimiento (FulfillmentEngine)
    const fulfillmentTicket = this.fulfillmentEngine.createTicket(
      pedido.id,
      pedido.negocioId,
      'RESTAURANT'
    );

    // 5c. Si es delivery, crear tarea de entrega (DeliveryEngine)
    let deliveryTask: DeliveryTask | undefined;
    if (this.isDeliveryOrder(pedido.tipoEntrega)) {
      deliveryTask = this.deliveryEngine.createDeliveryTask({
        orderId: pedido.id,
        businessId: pedido.negocioId,
        customerName: pedido.nombreCliente,
        customerPhone: pedido.telefonoCliente,
        address: pedido.direccionCliente || '',
        lat: pedido.latitud ?? undefined,
        lng: pedido.longitud ?? undefined,
        distanceKm: pedido.extraInfo?.pricingBreakdown?.distanceKm || 0,
        deliveryCost: pedido.costoEnvio,
        driverId: undefined,
      });
    }

    this.logger.info(
      `[RestaurantRuntimeAdapter] Pedido #${pedido.numeroPedido} procesado: ` +
      `Estado=${confirmedState.status}, Ticket=${fulfillmentTicket.ticketId}` +
      (deliveryTask ? `, Delivery=${deliveryTask.taskId}` : '')
    );

    return {
      processed: true,
      orderState: confirmedState,
      fulfillmentTicket,
      deliveryTask,
    };
  }

  // ──────────────────────────────────────────────────────────
  // 6. Procesar cambio de estado genérico
  // ──────────────────────────────────────────────────────────

  public async processStatusChange(
    pedido: LegacyPedido,
    nuevoEstado: string,
    reason?: string
  ): Promise<RestaurantRuntimeResult> {
    if (!this.isEnabled()) {
      return { processed: false, orderState: this.toLegacyOrderState(pedido), skippedReason: 'Runtime deshabilitado' };
    }

    const orderState = this.toLegacyOrderState(pedido);
    const targetStatus = RestaurantRuntimeAdapter.mapLegacyStatus(nuevoEstado);

    this.logger.info(
      `[RestaurantRuntimeAdapter] Cambio de estado pedido #${pedido.numeroPedido}: ` +
      `${pedido.estado} → ${nuevoEstado} (commercial: ${targetStatus})`
    );

    const updatedState = await this.orderRuntime.transitionOrder(orderState, targetStatus, reason);
    return { processed: true, orderState: updatedState };
  }

  // ──────────────────────────────────────────────────────────
  // 7. Puente: coreEventBus ORDER_CONFIRMED → VersionedEventBus
  // ──────────────────────────────────────────────────────────

  public async bridgeLegacyOrderConfirmed(
    negocioId: string,
    legacyPedidoData: any,
    orderId: string
  ): Promise<RestaurantRuntimeResult | null> {
    if (!this.isEnabled()) {
      this.logger.info('[RestaurantRuntimeAdapter] Bridge legacy deshabilitado (runtime.enabled=false)');
      return null;
    }

    // Construir un LegacyPedido a partir de los datos crudos del evento
    const pedido: LegacyPedido = {
      id: orderId || legacyPedidoData.id,
      negocioId,
      numeroPedido: legacyPedidoData.numeroPedido || 0,
      estado: legacyPedidoData.estado || 'CONFIRMED',
      tipoEntrega: legacyPedidoData.tipoEntrega || 'PICKUP_ORDER',
      nombreCliente: legacyPedidoData.nombreCliente || 'Cliente',
      telefonoCliente: legacyPedidoData.telefonoCliente || '',
      direccionCliente: legacyPedidoData.direccionCliente,
      referenciaCliente: legacyPedidoData.referenciaCliente,
      latitud: legacyPedidoData.latitud,
      longitud: legacyPedidoData.longitud,
      subtotal: legacyPedidoData.subtotal || 0,
      costoEnvio: legacyPedidoData.costoEnvio || 0,
      total: legacyPedidoData.total || 0,
      fechaEntrega: legacyPedidoData.fechaEntrega,
      franjaHoraria: legacyPedidoData.franjaHoraria,
      extraInfo: legacyPedidoData.extraInfo,
      items: (legacyPedidoData.items || []).map((i: any) => ({
        productoId: i.productoId || i.id,
        nombreProducto: i.nombreProducto || i.nombre || 'Producto',
        precioUnitario: i.precioUnitario || i.precio || 0,
        cantidad: i.cantidad || 1,
      })),
      createdAt: legacyPedidoData.createdAt,
      updatedAt: legacyPedidoData.updatedAt,
    };

    return this.processOrderConfirmed(pedido);
  }

  // ──────────────────────────────────────────────────────────
  // Helpers internos
  // ──────────────────────────────────────────────────────────

  private isDeliveryOrder(tipoEntrega: string): boolean {
    return ['DELIVERY_ORDER', 'DOMICILIO', 'DELIVERY'].includes((tipoEntrega || '').toUpperCase());
  }

  private mapDeliveryType(tipoEntrega: string): 'PICKUP_ORDER' | 'DELIVERY_ORDER' | 'TABLE_ORDER' {
    const upper = (tipoEntrega || '').toUpperCase();
    if (['DELIVERY_ORDER', 'DOMICILIO', 'DELIVERY'].includes(upper)) return 'DELIVERY_ORDER';
    if (['TABLE_ORDER', 'MESA'].includes(upper)) return 'TABLE_ORDER';
    return 'PICKUP_ORDER';
  }

  // ──────────────────────────────────────────────────────────
  // Accesores para pruebas y diagnóstico
  // ──────────────────────────────────────────────────────────

  public getOrderRuntime(): OrderRuntime { return this.orderRuntime; }
  public getFulfillmentEngine(): FulfillmentEngine { return this.fulfillmentEngine; }
  public getDeliveryEngine(): DeliveryEngine { return this.deliveryEngine; }
}
