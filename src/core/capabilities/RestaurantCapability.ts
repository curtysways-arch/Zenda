/**
 * @file RestaurantCapability.ts
 * @module core/capabilities
 * @description Adaptador de capacidad para Restaurantes en Citiox Enterprise vNext.
 * @responsibility Implementar el contrato Capability para restaurantes consumiendo OrderRuntime, FulfillmentEngine y PricingEngine sin duplicar lógica.
 * @dependencies Capability contract, VersionedEventBus, FulfillmentEngine, RuntimeLogger
 * @status Stable (Core Capabilities - v1.0)
 */

import { Capability, CapabilityHealth, RouteDefinition, NavigationDefinition, PermissionDefinition, WidgetDefinition, EventDefinition } from '../contracts/Capability';
import { VersionedEventBus, EventEnvelope } from '../events/EventBus';
import { RuntimeLogger } from '../observability/RuntimeLogger';
import { FulfillmentEngine } from '../fulfillment/FulfillmentEngine';

export class RestaurantCapability implements Capability {
  public metadata = {
    id: 'restaurant',
    version: '1.0.0',
    contractVersion: '1.0',
    name: 'Capacidad Restaurante & KDS',
    description: 'Gestión de comandas, cocina KDS, mesas y reglas de empaque',
    category: 'RESTAURANT' as const,
    startupPriority: 10,
    dependencies: []
  };

  private logger = RuntimeLogger.getInstance();
  private fulfillmentEngine?: FulfillmentEngine;

  public api = {
    getTables: () => ['Mesa 01', 'Mesa 02', 'Mesa 03', 'Mesa 04', 'Mesa 05'],
    setPackagingRule: (productId: string, rule: string) => ({ productId, rule }),
    createKitchenTicket: (orderId: string, businessId: string) => {
      if (this.fulfillmentEngine) {
        return this.fulfillmentEngine.createTicket(orderId, businessId, 'RESTAURANT');
      }
      return null;
    }
  };

  public async install(): Promise<void> {}
  public async configure(context: any): Promise<void> {
    if (context?.services?.fulfillmentEngine) {
      this.fulfillmentEngine = context.services.fulfillmentEngine;
    }
  }

  public async enable(context: any): Promise<void> {
    this.logger.info('[RestaurantCapability] Capacidad de Restaurante habilitada');
  }

  public async disable(context: any): Promise<void> {
    this.logger.info('[RestaurantCapability] Capacidad de Restaurante deshabilitada');
  }

  public async uninstall(): Promise<void> {}

  public getRoutes(): RouteDefinition[] {
    return [
      { path: '/admin/pedidos', type: 'admin', guarded: true, permissions: ['ORDERS_VIEW'] },
      { path: '/admin/cocina', type: 'admin', guarded: true, permissions: ['KITCHEN_VIEW'] },
      { path: '/admin/mesas', type: 'admin', guarded: true, permissions: ['TABLES_VIEW'] }
    ];
  }

  public getNavigation(): NavigationDefinition[] {
    return [
      { id: 'nav-orders', label: 'Pedidos & Caja', href: '/admin/pedidos', section: 'GESTIÓN OPERATIVA', order: 1 },
      { id: 'nav-kitchen', label: 'Cocina KDS', href: '/admin/cocina', section: 'GESTIÓN OPERATIVA', order: 2 },
      { id: 'nav-tables', label: 'Mesas & QR', href: '/admin/mesas', section: 'GESTIÓN OPERATIVA', order: 3 }
    ];
  }

  public getPermissions(): PermissionDefinition[] {
    return [
      { code: 'ORDERS_VIEW', name: 'Ver Pedidos', description: 'Acceso a la consola de pedidos', category: 'RESTAURANT' },
      { code: 'KITCHEN_VIEW', name: 'Ver Cocina KDS', description: 'Acceso a la pantalla de cocina', category: 'RESTAURANT' }
    ];
  }

  public getWidgets(): WidgetDefinition[] {
    return [
      { id: 'widget-kds-active', name: 'Comandas Activas en Cocina', type: 'metric' }
    ];
  }

  public getEvents(): EventDefinition[] {
    return [
      { name: 'orders.confirmed.v1', version: 'v1', description: 'Pedido confirmado y enviado a cocina' }
    ];
  }

  public async getHealth(): Promise<CapabilityHealth> {
    return {
      status: 'RUNNING',
      version: '1.0.0',
      startedAt: new Date(),
      dependencies: ['orders', 'pricing', 'fulfillment'],
      diagnostics: ['KDS Operational', 'Tables Engine Ready']
    };
  }

  public async migrate(): Promise<void> {}

  public registerSubscriptions(eventBus: VersionedEventBus): void {
    // Suscribir solo a eventos necesarios: orders.confirmed.v1 para generar ticket de cocina KDS
    eventBus.subscribe('orders.confirmed.v1', (envelope: EventEnvelope) => {
      this.logger.info(`[RestaurantCapability] Creando comanda KDS para pedido confirmado #${envelope.payload.orderId || 'N/A'}`);
      if (this.fulfillmentEngine) {
        this.fulfillmentEngine.createTicket(envelope.payload.orderId, envelope.businessId, 'RESTAURANT');
      }
    });
  }
}
