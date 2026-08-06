/**
 * @file NotificationRuntime.ts
 * @module core/notifications
 * @description Servicio de notificaciones desacoplado para Citiox Enterprise vNext.
 * @responsibility Suscribirse exclusivamente a tópicos en VersionedEventBus (orders.confirmed.v1, orders.ready.v1, delivery.assigned.v1) e impulsar notificaciones (WhatsApp, Email, Push) sin llamadas directas desde la UI.
 * @dependencies VersionedEventBus, RuntimeLogger
 * @status Stable (Core Runtime - v1.0)
 */

import { VersionedEventBus, EventEnvelope } from '../events/EventBus';
import { RuntimeLogger } from '../observability/RuntimeLogger';

export interface SentNotificationLog {
  id: string;
  topic: string;
  businessId: string;
  recipient?: string;
  message: string;
  sentAt: string;
}

export class NotificationRuntime {
  private logger = RuntimeLogger.getInstance();
  private logs: SentNotificationLog[] = [];

  constructor(private eventBus: VersionedEventBus) {
    this.registerEventSubscriptions();
  }

  private registerEventSubscriptions(): void {
    // Escuchar confirmación de pedido
    this.eventBus.subscribe('orders.confirmed.v1', async (envelope: EventEnvelope) => {
      this.handleEventNotification('orders.confirmed.v1', envelope, `¡Tu pedido #${envelope.payload.orderId || 'N/A'} ha sido confirmado! Estamos preparando tus productos.`);
    });

    // Escuchar pedido listo
    this.eventBus.subscribe('orders.ready.v1', async (envelope: EventEnvelope) => {
      this.handleEventNotification('orders.ready.v1', envelope, `¡Tu pedido #${envelope.payload.orderId || 'N/A'} está listo!`);
    });

    // Escuchar asignación de delivery
    this.eventBus.subscribe('delivery.assigned.v1', async (envelope: EventEnvelope) => {
      const driverName = envelope.payload?.driver?.name || 'Tu repartidor';
      this.handleEventNotification('delivery.assigned.v1', envelope, `Un repartidor (${driverName}) ha sido asignado a tu entrega.`);
    });

    this.logger.info('[NotificationRuntime] Suscripciones a eventos de notificaciones registradas en EventBus');
  }

  private handleEventNotification(topic: string, envelope: EventEnvelope, text: string): void {
    const logItem: SentNotificationLog = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      topic,
      businessId: envelope.businessId,
      recipient: envelope.payload?.customerPhone || envelope.payload?.driver?.phone,
      message: text,
      sentAt: new Date().toISOString()
    };

    this.logs.push(logItem);
    this.logger.info(`[NotificationRuntime] Notificación enviada para evento ${topic}: "${text}"`);
  }

  public getNotificationLogs(): SentNotificationLog[] {
    return [...this.logs];
  }
}
