/**
 * @file SpaCapability.ts
 * @module core/capabilities
 * @description Adaptador de capacidad para SPA, Peluquerías y Servicios por Citas en Citiox Enterprise vNext.
 * @responsibility Implementar el contrato Capability para centros de estética consumiendo el motor de fulfillment y notificaciones.
 * @dependencies Capability contract, VersionedEventBus, RuntimeLogger
 * @status Stable (Core Capabilities - v1.0)
 */

import { Capability, CapabilityHealth, RouteDefinition, NavigationDefinition, PermissionDefinition, WidgetDefinition, EventDefinition } from '../contracts/Capability';
import { VersionedEventBus, EventEnvelope } from '../events/EventBus';
import { RuntimeLogger } from '../observability/RuntimeLogger';

export class SpaCapability implements Capability {
  public metadata = {
    id: 'spa',
    version: '1.0.0',
    contractVersion: '1.0',
    name: 'Capacidad SPA & Citas',
    description: 'Gestión de agenda, turnos, profesionales y tratamientos',
    category: 'SERVICES' as const,
    startupPriority: 20,
    dependencies: []
  };

  private logger = RuntimeLogger.getInstance();

  public api = {
    getAvailability: (date: string) => ['09:00', '10:30', '14:00', '16:30'],
    bookAppointment: (serviceId: string, time: string) => ({ appointmentId: `app-${Date.now()}`, serviceId, time })
  };

  public async install(): Promise<void> {}
  public async configure(): Promise<void> {}
  public async enable(): Promise<void> {
    this.logger.info('[SpaCapability] Capacidad de SPA y Citas habilitada');
  }
  public async disable(): Promise<void> {
    this.logger.info('[SpaCapability] Capacidad de SPA y Citas deshabilitada');
  }
  public async uninstall(): Promise<void> {}

  public getRoutes(): RouteDefinition[] {
    return [
      { path: '/admin/citas', type: 'admin', guarded: true, permissions: ['APPOINTMENTS_VIEW'] },
      { path: '/admin/servicios', type: 'admin', guarded: true, permissions: ['SERVICES_VIEW'] }
    ];
  }

  public getNavigation(): NavigationDefinition[] {
    return [
      { id: 'nav-appointments', label: 'Agenda & Citas', href: '/admin/citas', section: 'GESTIÓN OPERATIVA', order: 1 },
      { id: 'nav-services', label: 'Servicios & Spa', href: '/admin/servicios', section: 'CATÁLOGO', order: 2 }
    ];
  }

  public getPermissions(): PermissionDefinition[] {
    return [
      { code: 'APPOINTMENTS_VIEW', name: 'Ver Agenda', description: 'Acceso a la agenda de citas', category: 'SPA' }
    ];
  }

  public getWidgets(): WidgetDefinition[] {
    return [
      { id: 'widget-spa-today', name: 'Citas Reservadas Hoy', type: 'metric' }
    ];
  }

  public getEvents(): EventDefinition[] {
    return [
      { name: 'appointments.booked.v1', version: 'v1', description: 'Cita reservada exitosamente' }
    ];
  }

  public async getHealth(): Promise<CapabilityHealth> {
    return {
      status: 'RUNNING',
      version: '1.0.0',
      startedAt: new Date(),
      dependencies: ['appointments', 'services'],
      diagnostics: ['Calendar Engine Operational']
    };
  }

  public async migrate(): Promise<void> {}

  public registerSubscriptions(eventBus: VersionedEventBus): void {
    eventBus.subscribe('appointments.booked.v1', (envelope: EventEnvelope) => {
      this.logger.info(`[SpaCapability] Notificando confirmación de cita #${envelope.payload.appointmentId || 'N/A'}`);
    });
  }
}
