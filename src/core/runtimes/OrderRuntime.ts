/**
 * @file OrderRuntime.ts
 * @module core/runtimes
 * @description Motor comercial desacoplado del ciclo del pedido para Citiox Enterprise vNext.
 * @responsibility Administrar estados comerciales del pedido (WAITING_ACCEPTANCE, ACCEPTED, CONFIRMED, PAID, REJECTED, CANCELLED, COMPLETED) y emitir eventos versionados sin conocimiento de UI ni de industria.
 * @dependencies VersionedEventBus, RuntimeLogger
 * @status Stable (Core Runtime - v1.0)
 */

import { VersionedEventBus, EventEnvelope } from '../events/EventBus';
import { RuntimeLogger } from '../observability/RuntimeLogger';

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
  rejectionReason?: string;
  subtotal: number;
  total: number;
  items: any[];
  createdAt: string;
  updatedAt: string;
}

export class OrderRuntime {
  private logger = RuntimeLogger.getInstance();

  constructor(private eventBus: VersionedEventBus) {}

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
      updatedAt: new Date().toISOString()
    };

    // Mapear y publicar evento de dominio versionado (v1)
    const eventName = `orders.${nextStatus.toLowerCase()}.v1`;
    const envelope: EventEnvelope = {
      eventId: `evt-ord-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: `orders.${nextStatus.toLowerCase()}`,
      version: 'v1',
      timestamp: updatedOrder.updatedAt,
      correlationId: `corr-ord-${order.orderId}`,
      businessId: order.businessId,
      source: 'OrderRuntime',
      payload: updatedOrder
    };

    await this.eventBus.publish(envelope);
    return updatedOrder;
  }
}
