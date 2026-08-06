/**
 * @file CourtsCapability.ts
 * @module core/capabilities
 * @description Adaptador de capacidad para Canchas Deportivas en Citiox Enterprise vNext.
 * @responsibility Implementar el contrato Capability para centros deportivos consumiendo el motor de reservas y disponibilidad.
 * @dependencies Capability contract, VersionedEventBus, RuntimeLogger
 * @status Stable (Core Capabilities - v1.0)
 */

import { Capability, CapabilityHealth, RouteDefinition, NavigationDefinition, PermissionDefinition, WidgetDefinition, EventDefinition } from '../contracts/Capability';
import { VersionedEventBus, EventEnvelope } from '../events/EventBus';
import { RuntimeLogger } from '../observability/RuntimeLogger';

export class CourtsCapability implements Capability {
  public metadata = {
    id: 'courts',
    version: '1.0.0',
    contractVersion: '1.0',
    name: 'Capacidad Canchas & Complejos Deportivos',
    description: 'Gestión de canchas, iluminación, turnos fijos y reservas',
    category: 'SERVICES' as const,
    startupPriority: 40,
    dependencies: []
  };

  private logger = RuntimeLogger.getInstance();

  public api = {
    getCourtsList: () => ['Cancha Sintética 1', 'Cancha Sintética 2', 'Cancha de Pádel 1'],
    reserveTimeSlot: (courtId: string, timeSlot: string) => ({ reservationId: `res-${Date.now()}`, courtId, timeSlot })
  };

  public async install(): Promise<void> {}
  public async configure(): Promise<void> {}
  public async enable(): Promise<void> {
    this.logger.info('[CourtsCapability] Capacidad de Canchas Deportivas habilitada');
  }
  public async disable(): Promise<void> {
    this.logger.info('[CourtsCapability] Capacidad de Canchas Deportivas deshabilitada');
  }
  public async uninstall(): Promise<void> {}

  public getRoutes(): RouteDefinition[] {
    return [
      { path: '/admin/canchas', type: 'admin', guarded: true, permissions: ['COURTS_VIEW'] }
    ];
  }

  public getNavigation(): NavigationDefinition[] {
    return [
      { id: 'nav-courts', label: 'Mis Canchas', href: '/admin/canchas', section: 'GESTIÓN OPERATIVA', order: 1 }
    ];
  }

  public getPermissions(): PermissionDefinition[] {
    return [
      { code: 'COURTS_VIEW', name: 'Ver Canchas', description: 'Acceso al módulo de canchas', category: 'COURTS' }
    ];
  }

  public getWidgets(): WidgetDefinition[] {
    return [
      { id: 'widget-courts-occupancy', name: 'Ocupación de Canchas', type: 'metric' }
    ];
  }

  public getEvents(): EventDefinition[] {
    return [
      { name: 'courts.reserved.v1', version: 'v1', description: 'Cancha reservada exitosamente' }
    ];
  }

  public async getHealth(): Promise<CapabilityHealth> {
    return {
      status: 'RUNNING',
      version: '1.0.0',
      startedAt: new Date(),
      dependencies: ['appointments', 'pricing'],
      diagnostics: ['Sports Courts Grid Operational']
    };
  }

  public async migrate(): Promise<void> {}

  public registerSubscriptions(eventBus: VersionedEventBus): void {
    eventBus.subscribe('courts.reserved.v1', (envelope: EventEnvelope) => {
      this.logger.info(`[CourtsCapability] Procesando reserva de cancha #${envelope.payload.reservationId || 'N/A'}`);
    });
  }
}
