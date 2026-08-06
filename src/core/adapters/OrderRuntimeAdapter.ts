/**
 * @file OrderRuntimeAdapter.ts
 * @module core/adapters
 * @description Adaptador puente entre solicitudes legacy de pedidos y el nuevo OrderRuntime.
 * @responsibility Traducir peticiones legacy al OrderRuntime e inyectar respuestas al flujo de producción actual sin alterar endpoints ni esquemas de BD.
 * @dependencies OrderRuntime, CommercialOrderState, VersionedEventBus
 * @status Experimental (Core Runtime - v1.0)
 */

import { OrderRuntime, CommercialOrderState, OrderCommercialStatus } from '../runtimes/OrderRuntime';
import { VersionedEventBus } from '../events/EventBus';

export class OrderRuntimeAdapter {
  private orderRuntime: OrderRuntime;

  constructor(eventBus: VersionedEventBus) {
    this.orderRuntime = new OrderRuntime(eventBus);
  }

  /**
   * Adapta la creación de un pedido legacy a CommercialOrderState y procesa la transición inicial.
   */
  public async createFromLegacyOrder(legacyOrderData: any): Promise<CommercialOrderState> {
    const initialState: CommercialOrderState = {
      orderId: legacyOrderData.id || `ord-${Date.now()}`,
      businessId: legacyOrderData.negocioId || legacyOrderData.businessId || 'demo-biz',
      tenantId: legacyOrderData.tenantId || 'tenant-default',
      status: 'WAITING_ACCEPTANCE',
      subtotal: legacyOrderData.subtotal || 0,
      total: legacyOrderData.total || 0,
      items: legacyOrderData.items || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return initialState;
  }

  /**
   * Procesa un cambio de estado legacy (ej. ACEPTAR, CONFIRMAR, RECHAZAR) utilizando OrderRuntime.
   */
  public async processStatusChange(
    currentState: CommercialOrderState,
    targetStatus: OrderCommercialStatus,
    reason?: string
  ): Promise<CommercialOrderState> {
    return await this.orderRuntime.transitionOrder(currentState, targetStatus, reason);
  }
}
