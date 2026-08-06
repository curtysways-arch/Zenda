// src/core/events/EventBus.ts
// Event Bus desacoplado del Core Runtime de Citiox

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

type EventHandler<T = any> = (payload: CoreEventPayload<T>) => Promise<void> | void;

class EventBus {
  private handlers: Map<CoreEventType, EventHandler[]> = new Map();

  on<T = any>(event: CoreEventType, handler: EventHandler<T>) {
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
    console.log(`[CoreEventBus] Evento '${event}' emitido para el negocio ${businessId}. Listeners: ${listeners.length}`);

    for (const handler of listeners) {
      try {
        await handler(payload);
      } catch (err) {
        console.error(`[CoreEventBus] Error en listener para evento '${event}':`, err);
      }
    }
  }
}

export const coreEventBus = new EventBus();
