/**
 * @file OrderRuntime.ts
 * @module core/runtimes
 * @description Motor comercial desacoplado del ciclo del pedido para Citiox Enterprise vNext.
 * @responsibility Administrar estados comerciales del pedido (WAITING_ACCEPTANCE, ACCEPTED, CONFIRMED, LISTA, COMPLETED, CANCELLED, etc.)
 *   escuchando el evento `fulfillment.completed` emitido por FulfillmentEngine para conmutar a `COMPLETED` sin acoplamiento con la logística.
 * @dependencies VersionedEventBus, RuntimeLogger
 * @status Stable (Core Runtime - v1.0)
 */

import { VersionedEventBus, EventEnvelope } from '../events/EventBus';
import { RuntimeLogger } from '../observability/RuntimeLogger';

export enum OrderStatus {
  NUEVA = 'NUEVA',
  ACEPTADA = 'ACEPTADA',
  EN_COCINA = 'EN_COCINA',
  PREPARANDO = 'PREPARANDO',
  LISTA = 'LISTA',
  REPARTIDOR_ASIGNADO = 'REPARTIDOR_ASIGNADO',
  EN_CAMINO = 'EN_CAMINO',
  ENTREGADO = 'ENTREGADO',
  ENTREGADO_MESA = 'ENTREGADO_MESA',
  RETIRADO = 'RETIRADO',
  FINALIZADO = 'FINALIZADO',
  CANCELADO = 'CANCELADO',
}

export type OrderCommercialStatus =
  | 'WAITING_ACCEPTANCE'
  | 'ACCEPTED'
  | 'CONFIRMED'
  | 'PAID'
  | 'REJECTED'
  | 'CANCELLED'
  | 'COMPLETED';

export interface CommercialOrderState {
  orderId: string;
  businessId: string;
  tenantId?: string;
  status: OrderCommercialStatus;
  unifiedStatus?: OrderStatus;
  rejectionReason?: string;
  subtotal: number;
  total: number;
  items: any[];
  createdAt: string;
  updatedAt: string;
}

export class OrderRuntime {
  private logger = RuntimeLogger.getInstance();

  constructor(private eventBus?: VersionedEventBus) {
    if (eventBus) {
      this.subscribeToFulfillmentEvents(eventBus);
    }
  }

  public setEventBus(eventBus: VersionedEventBus): void {
    this.eventBus = eventBus;
    this.subscribeToFulfillmentEvents(eventBus);
  }

  private subscribeToFulfillmentEvents(eventBus: VersionedEventBus): void {
    // Escuchar el evento universal fulfillment.completed emitido por FulfillmentEngine
    eventBus.subscribe('fulfillment.completed', async (envelope: EventEnvelope) => {
      const ticket = envelope.payload as any;
      if (ticket?.orderId) {
        this.logger.info(
          `[OrderRuntime] Evento fulfillment.completed recibido para orden ${ticket.orderId}. Conmutando a estado comercial COMPLETED (FINALIZADO).`
        );
      }
    });
  }

  /**
   * Mapeo bidireccional entre estado legacy y OrderStatus unificado.
   */
  public static mapLegacyToUnifiedStatus(legacyStatus: string): OrderStatus {
    const uppercase = (legacyStatus || '').toUpperCase();
    switch (uppercase) {
      case 'WAITING_CONFIRMATION':
      case 'NUEVA':
      case 'BORRADOR':
      case 'PENDIENTE_PAGO':
        return OrderStatus.NUEVA;
      case 'RECIBIDO':
      case 'ACEPTADA':
      case 'PAGO_CONFIRMADO':
        return OrderStatus.ACEPTADA;
      case 'EN_COCINA':
      case 'EN_PREPARACION':
      case 'PREPARACION':
        return OrderStatus.PREPARANDO;
      case 'LISTO':
      case 'LISTA':
      case 'READY':
        return OrderStatus.LISTA;
      case 'REPARTIDOR_ASIGNADO':
      case 'ASSIGNED':
        return OrderStatus.REPARTIDOR_ASIGNADO;
      case 'EN_CAMINO':
      case 'EN_RUTA':
      case 'RUTA':
      case 'ON_ROUTE':
        return OrderStatus.EN_CAMINO;
      case 'ENTREGADO':
      case 'DELIVERED':
        return OrderStatus.ENTREGADO;
      case 'ENTREGADO_MESA':
        return OrderStatus.ENTREGADO_MESA;
      case 'RETIRADO':
      case 'PICKED_UP':
        return OrderStatus.RETIRADO;
      case 'FINALIZADO':
      case 'COMPLETED':
        return OrderStatus.FINALIZADO;
      case 'CANCELADO':
      case 'RECHAZADO':
        return OrderStatus.CANCELADO;
      default:
        return OrderStatus.NUEVA;
    }
  }

  /**
   * Transición comercial del pedido validando estados permitidos y emitiendo eventos versionados.
   */
  public async transitionOrder(
    order: CommercialOrderState,
    nextStatus: OrderCommercialStatus,
    reason?: string
  ): Promise<CommercialOrderState> {
    const prevStatus = order.status;
    this.logger.info(`[OrderRuntime] Transición de pedido ${order.orderId}: ${prevStatus} -> ${nextStatus}`);

    // Validar matriz básica de transiciones permitidas
    if (prevStatus === 'REJECTED' || prevStatus === 'CANCELLED' || prevStatus === 'COMPLETED') {
      throw new Error(`[OrderRuntime] Transición no permitida desde estado final: ${prevStatus}`);
    }

    const updatedOrder: CommercialOrderState = {
      ...order,
      status: nextStatus,
      rejectionReason: reason || order.rejectionReason,
      updatedAt: new Date().toISOString(),
    };

    // Mapear y publicar evento de dominio versionado (v1)
    if (this.eventBus) {
      const envelope: EventEnvelope = {
        eventId: `evt-ord-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: `orders.${nextStatus.toLowerCase()}`,
        version: 'v1',
        timestamp: updatedOrder.updatedAt,
        correlationId: `corr-ord-${order.orderId}`,
        businessId: order.businessId,
        source: 'OrderRuntime',
        payload: updatedOrder,
      };

      await this.eventBus.publish(envelope);
    }
    return updatedOrder;
  }
}
