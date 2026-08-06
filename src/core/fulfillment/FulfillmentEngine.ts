/**
 * @file FulfillmentEngine.ts
 * @module core/fulfillment
 * @description Motor universal de cumplimiento por etapas declarativas para Citiox Enterprise vNext.
 * @responsibility Ejecutar pipelines de cumplimiento por etapas definidos por el Blueprint sin contener lógica específica de industria.
 * @dependencies VersionedEventBus, RuntimeLogger
 * @status Stable (Core Runtime - v1.0)
 */

import { VersionedEventBus, EventEnvelope } from '../events/EventBus';
import { RuntimeLogger } from '../observability/RuntimeLogger';

export interface FulfillmentPipelineConfig {
  blueprintId: string;
  stages: string[]; // e.g. ['CONFIRMED', 'PREPARING', 'READY', 'WAITING_DISPATCH']
}

export interface FulfillmentTicket {
  ticketId: string;
  orderId: string;
  businessId: string;
  blueprintId: string;
  currentStage: string;
  history: Array<{ stage: string; timestamp: string }>;
}

export class FulfillmentEngine {
  private logger = RuntimeLogger.getInstance();
  private pipelines = new Map<string, FulfillmentPipelineConfig>();

  constructor(private eventBus: VersionedEventBus) {
    // Pipelines por defecto registradas
    this.registerPipeline({
      blueprintId: 'RESTAURANT',
      stages: ['CONFIRMED', 'PREPARING', 'READY', 'WAITING_DISPATCH']
    });
    this.registerPipeline({
      blueprintId: 'LAUNDRY',
      stages: ['RECEIVED', 'WASHING', 'DRYING', 'IRONING', 'READY']
    });
    this.registerPipeline({
      blueprintId: 'SPA',
      stages: ['BOOKED', 'IN_SERVICE', 'FINISHED']
    });
  }

  public registerPipeline(config: FulfillmentPipelineConfig): void {
    this.pipelines.set(config.blueprintId, config);
    this.logger.info(`[FulfillmentEngine] Pipeline registrado para Blueprint: ${config.blueprintId} (${config.stages.join(' -> ')})`);
  }

  public createTicket(orderId: string, businessId: string, blueprintId: string): FulfillmentTicket {
    const pipeline = this.pipelines.get(blueprintId) || {
      blueprintId,
      stages: ['CONFIRMED', 'PROCESSING', 'READY']
    };

    const initialStage = pipeline.stages[0] || 'CONFIRMED';
    const now = new Date().toISOString();

    const ticket: FulfillmentTicket = {
      ticketId: `tkt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      orderId,
      businessId,
      blueprintId,
      currentStage: initialStage,
      history: [{ stage: initialStage, timestamp: now }]
    };

    this.logger.info(`[FulfillmentEngine] Ticket de cumplimiento creado: ${ticket.ticketId} (Mesa/Pedido: ${orderId}, Etapa inicial: ${initialStage})`);
    return ticket;
  }

  public async advanceStage(ticket: FulfillmentTicket): Promise<FulfillmentTicket> {
    const pipeline = this.pipelines.get(ticket.blueprintId);
    if (!pipeline) throw new Error(`[FulfillmentEngine] No existe pipeline para blueprint ${ticket.blueprintId}`);

    const currentIndex = pipeline.stages.indexOf(ticket.currentStage);
    if (currentIndex === -1 || currentIndex >= pipeline.stages.length - 1) {
      throw new Error(`[FulfillmentEngine] El ticket ${ticket.ticketId} ya se encuentra en la etapa final: ${ticket.currentStage}`);
    }

    const nextStage = pipeline.stages[currentIndex + 1];
    const now = new Date().toISOString();

    ticket.currentStage = nextStage;
    ticket.history.push({ stage: nextStage, timestamp: now });

    this.logger.info(`[FulfillmentEngine] Ticket ${ticket.ticketId} avanzado a etapa: ${nextStage}`);

    // Emitir evento de fulfillment
    const envelope: EventEnvelope = {
      eventId: `evt-ful-${Date.now()}`,
      name: `fulfillment.${nextStage.toLowerCase()}`,
      version: 'v1',
      timestamp: now,
      correlationId: `corr-tkt-${ticket.ticketId}`,
      businessId: ticket.businessId,
      source: 'FulfillmentEngine',
      payload: ticket
    };

    await this.eventBus.publish(envelope);
    return ticket;
  }
}
