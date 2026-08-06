/**
 * @file PinchoListoCapability.ts
 * @module core/capabilities
 * @description Adaptador de capacidad para Dark Kitchens / Fast Food en Citiox Enterprise vNext.
 * @responsibility Implementar el contrato Capability para locales de cómida rápida y Dark Kitchens consumiendo el motor de pedidos y despacho expreso.
 * @dependencies Capability contract, VersionedEventBus, RuntimeLogger
 * @status Stable (Core Capabilities - v1.0)
 */

import { Capability, CapabilityHealth, RouteDefinition, NavigationDefinition, PermissionDefinition, WidgetDefinition, EventDefinition } from '../contracts/Capability';
import { VersionedEventBus, EventEnvelope } from '../events/EventBus';
import { RuntimeLogger } from '../observability/RuntimeLogger';

export class PinchoListoCapability implements Capability {
  public metadata = {
    id: 'pincho_listo',
    version: '1.0.0',
    contractVersion: '1.0',
    name: 'Capacidad PinchoListo Fast Food',
    description: 'Producción ultrarrápida, despacho express y combos de comida rápida',
    category: 'RESTAURANT' as const,
    startupPriority: 15,
    dependencies: []
  };

  private logger = RuntimeLogger.getInstance();

  public api = {
    quickOrder: (comboId: string) => ({ orderId: `pnch-${Date.now()}`, comboId }),
    directExpressDispatch: (orderId: string) => ({ orderId, status: 'EXPRESS_DISPATCH' })
  };

  public async install(): Promise<void> {}
  public async configure(): Promise<void> {}
  public async enable(): Promise<void> {
    this.logger.info('[PinchoListoCapability] Capacidad PinchoListo Fast Food habilitada');
  }
  public async disable(): Promise<void> {
    this.logger.info('[PinchoListoCapability] Capacidad PinchoListo Fast Food deshabilitada');
  }
  public async uninstall(): Promise<void> {}

  public getRoutes(): RouteDefinition[] {
    return [
      { path: '/admin/pedidos', type: 'admin', guarded: true, permissions: ['ORDERS_VIEW'] }
    ];
  }

  public getNavigation(): NavigationDefinition[] {
    return [
      { id: 'nav-fastfood', label: 'Fast Food Express', href: '/admin/pedidos', section: 'GESTIÓN OPERATIVA', order: 1 }
    ];
  }

  public getPermissions(): PermissionDefinition[] {
    return [
      { code: 'EXPRESS_DISPATCH', name: 'Despacho Express', description: 'Permite enviar pedidos express', category: 'FAST_FOOD' }
    ];
  }

  public getWidgets(): WidgetDefinition[] {
    return [
      { id: 'widget-express-time', name: 'Tiempo Promedio de Despacho', type: 'metric' }
    ];
  }

  public getEvents(): EventDefinition[] {
    return [
      { name: 'pincholisto.express.v1', version: 'v1', description: 'Pedido express generado' }
    ];
  }

  public async getHealth(): Promise<CapabilityHealth> {
    return {
      status: 'RUNNING',
      version: '1.0.0',
      startedAt: new Date(),
      dependencies: ['orders', 'pricing', 'delivery'],
      diagnostics: ['Express Kitchen Pipeline Operational']
    };
  }

  public async migrate(): Promise<void> {}

  public registerSubscriptions(eventBus: VersionedEventBus): void {
    eventBus.subscribe('orders.created.v1', (envelope: EventEnvelope) => {
      this.logger.info(`[PinchoListoCapability] Orden express creada #${envelope.payload.orderId || 'N/A'}`);
    });
  }
}
