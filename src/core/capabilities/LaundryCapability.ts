/**
 * @file LaundryCapability.ts
 * @module core/capabilities
 * @description Adaptador de capacidad para Lavanderías en Citiox Enterprise vNext.
 * @responsibility Implementar el contrato Capability para lavanderías consumiendo el motor de fulfillment (RECEIVED -> WASHING -> DRYING -> IRONING -> READY).
 * @dependencies Capability contract, VersionedEventBus, FulfillmentEngine, RuntimeLogger
 * @status Stable (Core Capabilities - v1.0)
 */

import { Capability, CapabilityHealth, RouteDefinition, NavigationDefinition, PermissionDefinition, WidgetDefinition, EventDefinition } from '../contracts/Capability';
import { VersionedEventBus, EventEnvelope } from '../events/EventBus';
import { RuntimeLogger } from '../observability/RuntimeLogger';
import { FulfillmentEngine } from '../fulfillment/FulfillmentEngine';

export class LaundryCapability implements Capability {
  public metadata = {
    id: 'laundry',
    version: '1.0.0',
    contractVersion: '1.0',
    name: 'Capacidad Lavandería & Tintorería',
    description: 'Recepción por peso, prendas, lavado, secado y despacho',
    category: 'OPERATIONS' as const,
    startupPriority: 30,
    dependencies: []
  };

  private logger = RuntimeLogger.getInstance();
  private fulfillmentEngine?: FulfillmentEngine;

  public api = {
    createLaundryOrder: (weightKg: number, itemsCount: number) => ({ orderId: `lnd-${Date.now()}`, weightKg, itemsCount }),
    updateStage: (ticketId: string, stage: string) => ({ ticketId, stage })
  };

  public async install(): Promise<void> {}
  public async configure(context: any): Promise<void> {
    if (context?.services?.fulfillmentEngine) {
      this.fulfillmentEngine = context.services.fulfillmentEngine;
    }
  }

  public async enable(context: any): Promise<void> {
    this.logger.info('[LaundryCapability] Capacidad de Lavandería habilitada');
  }

  public async disable(context: any): Promise<void> {
    this.logger.info('[LaundryCapability] Capacidad de Lavandería deshabilitada');
  }

  public async uninstall(): Promise<void> {}

  public getRoutes(): RouteDefinition[] {
    return [
      { path: '/lavado', type: 'admin', guarded: true, permissions: ['LAUNDRY_VIEW'] }
    ];
  }

  public getNavigation(): NavigationDefinition[] {
    return [
      { id: 'nav-laundry', label: 'Procesamiento Lavandería', href: '/lavado', section: 'GESTIÓN OPERATIVA', order: 1 }
    ];
  }

  public getPermissions(): PermissionDefinition[] {
    return [
      { code: 'LAUNDRY_VIEW', name: 'Ver Lavandería', description: 'Acceso a consola de lavado', category: 'LAUNDRY' }
    ];
  }

  public getWidgets(): WidgetDefinition[] {
    return [
      { id: 'widget-laundry-kg', name: 'Kilos Procesados Hoy', type: 'metric' }
    ];
  }

  public getEvents(): EventDefinition[] {
    return [
      { name: 'laundry.received.v1', version: 'v1', description: 'Prendas recibidas para lavandería' }
    ];
  }

  public async getHealth(): Promise<CapabilityHealth> {
    return {
      status: 'RUNNING',
      version: '1.0.0',
      startedAt: new Date(),
      dependencies: ['orders', 'fulfillment'],
      diagnostics: ['Laundry Pipeline Stage Engine Operational']
    };
  }

  public async migrate(): Promise<void> {}

  public registerSubscriptions(eventBus: VersionedEventBus): void {
    eventBus.subscribe('orders.created.v1', (envelope: EventEnvelope) => {
      this.logger.info(`[LaundryCapability] Generando ticket de lavado para orden #${envelope.payload.orderId || 'N/A'}`);
      if (this.fulfillmentEngine) {
        this.fulfillmentEngine.createTicket(envelope.payload.orderId, envelope.businessId, 'LAUNDRY');
      }
    });
  }
}
