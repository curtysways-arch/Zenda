/**
 * @file RestaurantRuntimeAdapter.ts
 * @module core/adapters
 * @description Puente entre el ciclo de pedidos legacy (Prisma) y la arquitectura Enterprise vNext.
 * @responsibility Traducir entidades legacy (Pedido, PedidoDetalle, Cliente, Producto, Delivery) a los
 *   contratos del Core (CommercialOrderState, FulfillmentTicket, DeliveryTask) y orquestar el ciclo
 *   completo OrderRuntime → FulfillmentEngine → DeliveryEngine → NotificationRuntime.
 * @dependencies OrderRuntime, FulfillmentEngine, DeliveryEngine, PricingEngine, VersionedEventBus,
 *              FeatureFlagProvider, RuntimeLogger, RuntimeKernel
 * @status Stable (Core Adapters - v1.0)
 */

import { OrderRuntime, CommercialOrderState, OrderCommercialStatus } from '../runtimes/OrderRuntime';
import { FulfillmentEngine, FulfillmentTicket } from '../fulfillment/FulfillmentEngine';
import { DeliveryEngine, DeliveryTask } from '../delivery/DeliveryEngine';
import { PricingEngine, PricingResult } from '../pricing/PricingEngine';
import { VersionedEventBus } from '../events/EventBus';
import { FeatureFlagProvider } from '../kernel/FeatureFlagProvider';
import { RuntimeLogger } from '../observability/RuntimeLogger';
import { RuntimeKernel } from '../kernel/RuntimeKernel';

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

export interface RestaurantRuntimeResult {
  processed: boolean;
  orderState: CommercialOrderState;
  fulfillmentTicket?: FulfillmentTicket;
  deliveryTask?: DeliveryTask;
  pricingResult?: PricingResult;
  skippedReason?: string;
}

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

export class RestaurantRuntimeAdapter {
  private logger = RuntimeLogger.getInstance();
  private featureFlags = FeatureFlagProvider.getInstance();
  private orderRuntime: OrderRuntime;
  private fulfillmentEngine: FulfillmentEngine;
  private deliveryEngine: DeliveryEngine;

  constructor(private eventBus: VersionedEventBus, kernel?: RuntimeKernel) {
    if (kernel) {
      this.deliveryEngine = kernel.getDeliveryEngine();
    } else {
      this.deliveryEngine = new DeliveryEngine(eventBus);
    }
    this.orderRuntime = new OrderRuntime(eventBus);
    this.fulfillmentEngine = new FulfillmentEngine(eventBus);
  }

  private isEnabled(pedido?: LegacyPedido): boolean {
    const globalEnabled = this.featureFlags.isEnabled('runtime.enabled');
    if (globalEnabled) return true;

    if (pedido?.extraInfo) {
      const extra = typeof pedido.extraInfo === 'string'
        ? (() => { try { return JSON.parse(pedido.extraInfo); } catch { return {}; } })()
        : pedido.extraInfo;
      if (extra.useEnterpriseRuntime || extra.enterpriseRuntime) return true;
    }

    return false;
  }

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

  public static mapLegacyStatus(legacyEstado: string): OrderCommercialStatus {
    return LEGACY_TO_COMMERCIAL_STATUS[legacyEstado] || 'WAITING_ACCEPTANCE';
  }

  public recalculatePricing(pedido: LegacyPedido, config?: any): PricingResult {
    const negocioConfig = config || {};
    return PricingEngine.calculate({
      items: pedido.items.map(i => ({
        productId: i.productoId,
        name: i.nombreProducto,
        unitPrice: i.precioUnitario,
        quantity: i.cantidad,
      })),
      deliveryType: this.mapDeliveryType(pedido.tipoEntrega),
      deliveryConfig: negocioConfig.deliveryConfig || { enabled: true, baseCost: 1.50, costPerKm: 0.25 },
    });
  }

  private mapDeliveryType(tipo: string): 'PICKUP_ORDER' | 'DELIVERY_ORDER' | 'TABLE_ORDER' {
    if (tipo === 'RETIRO' || tipo === 'PICKUP') return 'PICKUP_ORDER';
    if (tipo === 'MESA' || tipo === 'TABLE') return 'TABLE_ORDER';
    return 'DELIVERY_ORDER';
  }

  private isDeliveryOrder(tipo: string): boolean {
    return tipo !== 'RETIRO' && tipo !== 'PICKUP' && tipo !== 'MESA' && tipo !== 'TABLE';
  }

  public async processNewOrder(pedido: LegacyPedido): Promise<RestaurantRuntimeResult> {
    if (!this.isEnabled(pedido)) {
      return { processed: false, orderState: this.toLegacyOrderState(pedido), skippedReason: 'Runtime deshabilitado' };
    }

    this.logger.info(`[RestaurantRuntimeAdapter] Procesando pedido nuevo #${pedido.numeroPedido} (${pedido.id})`);
    const orderState = this.toLegacyOrderState(pedido);

    await this.eventBus.publish({
      eventId: `evt-rra-new-${Date.now()}`,
      name: 'orders.created',
      version: 'v1',
      timestamp: new Date().toISOString(),
      correlationId: `corr-rra-${pedido.id}`,
      businessId: pedido.negocioId,
      source: 'RestaurantRuntimeAdapter',
      payload: { order: pedido, orderState },
    });

    return { processed: true, orderState };
  }

  public async processOrderConfirmed(pedido: LegacyPedido): Promise<RestaurantRuntimeResult> {
    if (!this.isEnabled(pedido)) {
      return { processed: false, orderState: this.toLegacyOrderState(pedido), skippedReason: 'Runtime deshabilitado' };
    }

    this.logger.info(`[RestaurantRuntimeAdapter] Confirmación de pedido #${pedido.numeroPedido} (${pedido.id})`);

    const orderState = this.toLegacyOrderState(pedido);
    const confirmedState = await this.orderRuntime.transitionOrder(orderState, 'CONFIRMED');

    const fulfillmentTicket = this.fulfillmentEngine.createTicket(
      pedido.id,
      pedido.negocioId,
      'RESTAURANT'
    );

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

  public async processStatusChange(
    pedido: LegacyPedido,
    nuevoEstado: string,
    reason?: string
  ): Promise<RestaurantRuntimeResult> {
    if (!this.isEnabled(pedido)) {
      return { processed: false, orderState: this.toLegacyOrderState(pedido), skippedReason: 'Runtime deshabilitado' };
    }

    const targetStatus = LEGACY_TO_COMMERCIAL_STATUS[nuevoEstado] || 'WAITING_ACCEPTANCE';
    const currentState = this.toLegacyOrderState(pedido);
    const updatedState = await this.orderRuntime.transitionOrder(currentState, targetStatus, reason);

    return { processed: true, orderState: updatedState };
  }
}
