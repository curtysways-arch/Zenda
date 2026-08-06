/**
 * @file FulfillmentEngine.ts
 * @module core/fulfillment
 * @description Orquestador Maestro de Cadenas y Pipelines de Cumplimiento (Fulfillment) para Citiox Enterprise vNext.
 * @responsibility Definir y ejecutar el pipeline de cumplimiento por Blueprint (ACCEPTED -> PRODUCTION/KITCHEN -> STAGE -> COMPLETED).
 *   Soporta entregas en mesa, retiro, despacho local por repartidor/vehículo, couriers externos y entregas digitales.
 * @dependencies VersionedEventBus, RuntimeLogger, DispatchEngine
 * @status Stable (Core Fulfillment - v1.0)
 */

import { VersionedEventBus, EventEnvelope } from '../events/EventBus';
import { RuntimeLogger } from '../observability/RuntimeLogger';
import { DispatchEngine, DispatchTask } from '../dispatch/DispatchEngine';

export type FulfillmentChannel =
  | 'TABLE_SERVICE'
  | 'PICKUP'
  | 'DELIVERY'
  | 'SHIPPING'
  | 'DIGITAL'
  | 'ONSITE';

export type FulfillmentStage =
  | 'ACCEPTED'
  | 'KITCHEN'
  | 'PRODUCTION'
  | 'READY'
  | 'DISPATCH'
  | 'TABLE_SERVICE'
  | 'PICKUP'
  | 'SERVICE'
  | 'DIGITAL_DELIVERY'
  | 'COMPLETED'
  | 'CANCELLED';

export interface FulfillmentTicket {
  ticketId: string;
  orderId: string;
  businessId: string;
  channel: FulfillmentChannel;
  currentStage: FulfillmentStage;
  pipeline: FulfillmentStage[];
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  dispatchTaskId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export class FulfillmentEngine {
  private static instance: FulfillmentEngine;
  private logger = RuntimeLogger.getInstance();
  private tickets = new Map<string, FulfillmentTicket>();
  private dispatchEngine = DispatchEngine.getInstance();

  constructor(private eventBus?: VersionedEventBus) {
    if (eventBus) {
      this.subscribeToEvents(eventBus);
    }
  }

  public static getInstance(eventBus?: VersionedEventBus): FulfillmentEngine {
    if (!FulfillmentEngine.instance) {
      FulfillmentEngine.instance = new FulfillmentEngine(eventBus);
    }
    return FulfillmentEngine.instance;
  }

  public setEventBus(eventBus: VersionedEventBus): void {
    this.eventBus = eventBus;
    this.subscribeToEvents(eventBus);
  }

  private subscribeToEvents(eventBus: VersionedEventBus): void {
    // Escuchar evento desacoplado dispatch.completed emitido por DispatchEngine
    eventBus.subscribe('dispatch.completed', async (envelope: EventEnvelope) => {
      const dispatchTask = envelope.payload as DispatchTask;
      if (dispatchTask?.fulfillmentTicketId) {
        this.logger.info(
          `[FulfillmentEngine] Evento dispatch.completed recibido para ticket ${dispatchTask.fulfillmentTicketId}. Avanzando a COMPLETED.`
        );
        await this.completeFulfillment(dispatchTask.fulfillmentTicketId);
      }
    });
  }

  /**
   * Obtener pipeline por defecto según el canal de cumplimiento.
   */
  public getDefaultPipeline(channel: FulfillmentChannel): FulfillmentStage[] {
    switch (channel) {
      case 'DELIVERY':
        return ['ACCEPTED', 'KITCHEN', 'READY', 'DISPATCH', 'COMPLETED'];
      case 'TABLE_SERVICE':
        return ['ACCEPTED', 'KITCHEN', 'READY', 'TABLE_SERVICE', 'COMPLETED'];
      case 'PICKUP':
        return ['ACCEPTED', 'KITCHEN', 'READY', 'PICKUP', 'COMPLETED'];
      case 'SHIPPING':
        return ['ACCEPTED', 'PRODUCTION', 'READY', 'DISPATCH', 'COMPLETED'];
      case 'DIGITAL':
        return ['ACCEPTED', 'DIGITAL_DELIVERY', 'COMPLETED'];
      case 'ONSITE':
      default:
        return ['ACCEPTED', 'SERVICE', 'COMPLETED'];
    }
  }

  /**
   * Iniciar la cadena de cumplimiento para una orden.
   */
  public async beginFulfillment(
    orderId: string,
    businessId: string,
    channel: FulfillmentChannel = 'DELIVERY',
    customPipeline?: FulfillmentStage[],
    metadata?: Record<string, any>
  ): Promise<FulfillmentTicket> {
    const ticketId = `flf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const pipeline = customPipeline || this.getDefaultPipeline(channel);
    const now = new Date().toISOString();

    const ticket: FulfillmentTicket = {
      ticketId,
      orderId,
      businessId,
      channel,
      currentStage: pipeline[0] || 'ACCEPTED',
      pipeline,
      status: 'IN_PROGRESS',
      metadata,
      createdAt: now,
      updatedAt: now,
    };

    this.tickets.set(ticketId, ticket);
    this.logger.info(`[FulfillmentEngine] Inciado ticket de cumplimiento ${ticketId} (Orden ${orderId}, Canal ${channel})`);

    if (this.eventBus) {
      const envelope: EventEnvelope = {
        eventId: `evt-flf-start-${Date.now()}`,
        name: 'fulfillment.started',
        version: 'v1',
        timestamp: now,
        correlationId: `corr-flf-${ticketId}`,
        businessId,
        source: 'FulfillmentEngine',
        payload: ticket,
      };
      await this.eventBus.publish(envelope);
    }

    return ticket;
  }

  /**
   * Avanzar la etapa del pipeline de cumplimiento.
   */
  public async advanceStage(ticketId: string, nextStage: FulfillmentStage): Promise<FulfillmentTicket> {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) throw new Error(`[FulfillmentEngine] Ticket de cumplimiento ${ticketId} no encontrado.`);

    const now = new Date().toISOString();
    ticket.currentStage = nextStage;
    ticket.updatedAt = now;

    this.logger.info(`[FulfillmentEngine] Ticket ${ticketId} avanzó a la etapa: ${nextStage}`);

    // Si la etapa es DISPATCH y canal es DELIVERY/SHIPPING, delegar la creación de la tarea a DispatchEngine
    if (nextStage === 'DISPATCH' && (ticket.channel === 'DELIVERY' || ticket.channel === 'SHIPPING')) {
      const dispatchTask = await this.dispatchEngine.createDispatchTask({
        fulfillmentTicketId: ticketId,
        orderId: ticket.orderId,
        businessId: ticket.businessId,
        channel: ticket.channel,
        customer: ticket.metadata?.customer || { name: 'Cliente', phone: '' },
        address: ticket.metadata?.address || '',
        lat: ticket.metadata?.lat,
        lng: ticket.metadata?.lng,
        instructions: ticket.metadata?.instructions,
      });
      ticket.dispatchTaskId = dispatchTask.taskId;
    }

    // Emitir evento de cambio de etapa
    if (this.eventBus) {
      const envelope: EventEnvelope = {
        eventId: `evt-flf-stage-${Date.now()}`,
        name: 'fulfillment.stage_changed',
        version: 'v1',
        timestamp: now,
        correlationId: `corr-flf-${ticketId}`,
        businessId: ticket.businessId,
        source: 'FulfillmentEngine',
        payload: { ticket, stage: nextStage },
      };
      await this.eventBus.publish(envelope);
    }

    // Si la etapa llega a COMPLETED o etapas finales de auto-cierre (TABLE_SERVICE, PICKUP sin dispatch), completar
    if (nextStage === 'COMPLETED') {
      await this.completeFulfillment(ticketId);
    }

    return ticket;
  }

  /**
   * Completar la cadena de cumplimiento y emitir fulfillment.completed.
   */
  public async completeFulfillment(ticketId: string): Promise<FulfillmentTicket> {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) throw new Error(`[FulfillmentEngine] Ticket de cumplimiento ${ticketId} no encontrado.`);

    const now = new Date().toISOString();
    ticket.currentStage = 'COMPLETED';
    ticket.status = 'COMPLETED';
    ticket.updatedAt = now;

    this.logger.info(`[FulfillmentEngine] Ticket de cumplimiento ${ticketId} completado (Orden ${ticket.orderId}).`);

    if (this.eventBus) {
      const envelope: EventEnvelope = {
        eventId: `evt-flf-comp-${Date.now()}`,
        name: 'fulfillment.completed',
        version: 'v1',
        timestamp: now,
        correlationId: `corr-flf-${ticketId}`,
        businessId: ticket.businessId,
        source: 'FulfillmentEngine',
        payload: ticket,
      };
      await this.eventBus.publish(envelope);
    }

    return ticket;
  }

  public getTicket(ticketId: string): FulfillmentTicket | undefined {
    return this.tickets.get(ticketId);
  }

  public getTicketByOrder(orderId: string): FulfillmentTicket | undefined {
    return Array.from(this.tickets.values()).find(t => t.orderId === orderId);
  }

  public getTickets(businessId?: string): FulfillmentTicket[] {
    const all = Array.from(this.tickets.values());
    return businessId ? all.filter(t => t.businessId === businessId) : all;
  }
}
