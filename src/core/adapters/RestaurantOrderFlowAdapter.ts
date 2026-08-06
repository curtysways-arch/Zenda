/**
 * @file RestaurantOrderFlowAdapter.ts
 * @module core/adapters
 * @description Adaptador condicional del flujo de pedidos de restaurante (FASE 5C).
 * @responsibility Si Enterprise Runtime está activo para el negocio, canalizar la orden hacia
 *   RestaurantRuntimeAdapter y OrderRuntime. Si está inactivo (legacy), mantener el flujo tradicional sin alterar.
 * @dependencies BusinessRuntimeResolver, RestaurantRuntimeAdapter, VersionedEventBus, RuntimeLogger
 * @status Experimental (FASE 5C - UI Integration)
 */

import { BusinessRuntimeResolver, ResolvedBusinessRuntime } from '../runtime/BusinessRuntimeResolver';
import { RestaurantRuntimeAdapter, LegacyPedido, RestaurantRuntimeResult } from './RestaurantRuntimeAdapter';
import { VersionedEventBus } from '../events/EventBus';
import { RuntimeLogger } from '../observability/RuntimeLogger';

export interface OrderFlowExecutionResult {
  isEnterprise: boolean;
  businessRuntime: ResolvedBusinessRuntime;
  runtimeResult?: RestaurantRuntimeResult;
  legacyAllowed: boolean;
}

export class RestaurantOrderFlowAdapter {
  private static logger = RuntimeLogger.getInstance();

  /**
   * Procesa la creación de un nuevo pedido en el flujo de restaurante.
   */
  public static async processNewOrder(
    negocio: any,
    pedidoData: LegacyPedido,
    sharedEventBus?: VersionedEventBus
  ): Promise<OrderFlowExecutionResult> {
    const runtime = await BusinessRuntimeResolver.resolve(negocio);

    if (!runtime.isEnterprise) {
      this.logger.info(`[RestaurantOrderFlowAdapter] Flujo LEGACY mantenido para negocio ${negocio.slug || negocio.id}`);
      return {
        isEnterprise: false,
        businessRuntime: runtime,
        legacyAllowed: true,
      };
    }

    this.logger.info(`[RestaurantOrderFlowAdapter] Flujo ENTERPRISE activado para negocio ${negocio.slug || negocio.id}`);

    const bus = sharedEventBus || runtime.kernel?.getEventBus() || new VersionedEventBus();
    const adapter = new RestaurantRuntimeAdapter(bus);
    const runtimeResult = await adapter.processNewOrder(pedidoData);

    return {
      isEnterprise: true,
      businessRuntime: runtime,
      runtimeResult,
      legacyAllowed: true, // Se mantiene guardado en Prisma como almacenamiento principal de BD
    };
  }

  /**
   * Procesa la confirmación o cambio de estado de un pedido.
   */
  public static async processOrderStatusChange(
    negocio: any,
    pedidoData: LegacyPedido,
    nuevoEstado: string,
    sharedEventBus?: VersionedEventBus
  ): Promise<OrderFlowExecutionResult> {
    const runtime = await BusinessRuntimeResolver.resolve(negocio);

    if (!runtime.isEnterprise) {
      return {
        isEnterprise: false,
        businessRuntime: runtime,
        legacyAllowed: true,
      };
    }

    this.logger.info(
      `[RestaurantOrderFlowAdapter] Transición ENTERPRISE para negocio ${negocio.slug || negocio.id}: ` +
      `${pedidoData.estado} -> ${nuevoEstado}`
    );

    const bus = sharedEventBus || runtime.kernel?.getEventBus() || new VersionedEventBus();
    const adapter = new RestaurantRuntimeAdapter(bus);

    let runtimeResult: RestaurantRuntimeResult;
    const isConfirmation = ['CONFIRMED', 'PREPARACION', 'EN_PREPARACION', 'RECIBIDO'].includes(nuevoEstado);

    if (isConfirmation) {
      runtimeResult = await adapter.processOrderConfirmed(pedidoData);
    } else {
      runtimeResult = await adapter.processStatusChange(pedidoData, nuevoEstado);
    }

    return {
      isEnterprise: true,
      businessRuntime: runtime,
      runtimeResult,
      legacyAllowed: true,
    };
  }
}
