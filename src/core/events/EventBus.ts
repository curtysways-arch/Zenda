/**
 * @file EventBus.ts
 * @module core/events
 * @description Event Bus desacoplado con soporte para Event Envelopes versionados y compatibilidad hacia atrás.
 * @responsibility Administrar suscripciones y emisión de eventos de dominio versionados (v1) e eventos internos de sistema sin acoplamiento a capacidades concretas.
 * @dependencies RuntimeLogger
 * @status Stable (Core Foundation - v1.0)
 */

import { RuntimeLogger } from '../observability/RuntimeLogger';

// ----------------------------------------------------------------------
// 1. LEGACY EVENT BUS (100% Backward Compatible - Untouched API Contract)
// ----------------------------------------------------------------------
export type CoreEventType =
  | 'ORDER_CREATED'
  | 'ORDER_CONFIRMED'
  | 'ORDER_CANCELLED'
  | 'ORDER_READY'
  | 'ORDER_COMPLETED'
  | 'PAYMENT_CONFIRMED'
  | 'DELIVERY_ASSIGNED';

export interface CoreEventPayload<T = any> {
  event: CoreEventType;
  businessId: string;
  orderId?: string;
  data: T;
  timestamp: string;
}

type LegacyEventHandler<T = any> = (payload: CoreEventPayload<T>) => Promise<void> | void;

class LegacyEventBus {
  private handlers: Map<CoreEventType, LegacyEventHandler[]> = new Map();

  on<T = any>(event: CoreEventType, handler: LegacyEventHandler<T>) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
  }

  async emit<T = any>(event: CoreEventType, businessId: string, data: T, orderId?: string) {
    const payload: CoreEventPayload<T> = {
      event,
      businessId,
      orderId,
      data,
      timestamp: new Date().toISOString(),
    };

    const listeners = this.handlers.get(event) || [];
    console.log(`[CoreEventBus] Evento legacy '${event}' emitido para el negocio ${businessId}. Listeners: ${listeners.length}`);

    for (const handler of listeners) {
      try {
        await handler(payload);
      } catch (err) {
        console.error(`[CoreEventBus] Error en listener para evento '${event}':`, err);
      }
    }
  }
}

export const coreEventBus = new LegacyEventBus();

// ----------------------------------------------------------------------
// 2. ENTERPRISE vNEXT EVENT BUS (Event Envelopes Versionados)
// ----------------------------------------------------------------------
export interface EventEnvelope<T = any> {
  eventId: string;
  name: string;
  version: string; // e.g. "v1"
  timestamp: string;
  correlationId: string;
  traceId?: string;
  parentEventId?: string;
  causationId?: string;
  businessId: string;
  tenantId?: string;
  userId?: string;
  actor?: string;
  environment?: string;
  source: string;
  payload: T;
}

export type VersionedEventHandler<T = any> = (envelope: EventEnvelope<T>) => Promise<void> | void;

export class VersionedEventBus {
  private subscribers = new Map<string, VersionedEventHandler[]>();
  private logger = RuntimeLogger.getInstance();

  public subscribe<T = any>(eventName: string, handler: VersionedEventHandler<T>): void {
    if (!this.subscribers.has(eventName)) {
      this.subscribers.set(eventName, []);
    }
    this.subscribers.get(eventName)!.push(handler);
    this.logger.info(`[VersionedEventBus] Suscripción registrada para evento: ${eventName}`);
  }

  public async publish<T = any>(envelope: EventEnvelope<T>): Promise<void> {
    const topic = `${envelope.name}.${envelope.version}`;
    const handlers = this.subscribers.get(topic) || [];
    this.logger.info(`[VersionedEventBus] Publicando evento: ${topic} [ID: ${envelope.eventId}] (${handlers.length} suscriptores)`);

    for (const handler of handlers) {
      try {
        await handler(envelope);
      } catch (err: any) {
        this.logger.error(`[VersionedEventBus] Error procesando suscriptor de ${topic}`, err);
      }
    }
  }

  public clear(): void {
    this.subscribers.clear();
  }
}
