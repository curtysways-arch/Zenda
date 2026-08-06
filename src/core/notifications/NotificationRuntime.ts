/**
 * @file NotificationRuntime.ts
 * @module core/notifications
 * @description Servicio de notificaciones desacoplado para Citiox Enterprise vNext.
 * @responsibility Suscribirse a eventos en VersionedEventBus (orders.created, orders.confirmed, fulfillment.stage_changed,
 *   delivery.assigned, delivery.on_route, delivery.delivered) e impulsar notificaciones vía WhatsApp (Baileys) sin llamadas directas desde la UI.
 * @dependencies VersionedEventBus, RuntimeLogger, whatsappService
 * @status Stable (Core Runtime - v1.0)
 */

import { VersionedEventBus, EventEnvelope } from '../events/EventBus';
import { RuntimeLogger } from '../observability/RuntimeLogger';
import { whatsappService } from '@/lib/whatsapp';

export interface SentNotificationLog {
  id: string;
  topic: string;
  businessId: string;
  recipient?: string;
  message: string;
  sentAt: string;
  status: 'SENT' | 'FAILED';
}

export class NotificationRuntime {
  private logger = RuntimeLogger.getInstance();
  private logs: SentNotificationLog[] = [];

  constructor(private eventBus: VersionedEventBus) {
    this.registerEventSubscriptions();
  }

  private registerEventSubscriptions(): void {
    // 1. Pedido creado
    this.eventBus.subscribe('orders.created.v1', async (envelope: EventEnvelope) => {
      const order = envelope.payload?.order || envelope.payload;
      const phone = order?.telefonoCliente || order?.clientPhone;
      const num = order?.numeroPedido || order?.id;
      const msg = `🛵 *La Parrilla Citiox*: Hemos recibido tu pedido #${num}. ¡Gracias por preferirnos! Te avisaremos tan pronto sea aceptado por cocina.`;
      await this.sendWhatsAppNotification('orders.created.v1', envelope.businessId, phone, msg);
    });

    // 2. Pedido confirmado/aceptado
    this.eventBus.subscribe('orders.confirmed.v1', async (envelope: EventEnvelope) => {
      const order = envelope.payload?.order || envelope.payload;
      const phone = order?.telefonoCliente || order?.clientPhone;
      const num = order?.numeroPedido || order?.id;
      const msg = `🔥 *La Parrilla Citiox*: ¡Tu pedido #${num} ha sido aceptado! El equipo de cocina ya se encuentra preparándolo.`;
      await this.sendWhatsAppNotification('orders.confirmed.v1', envelope.businessId, phone, msg);
    });

    // 3. Cambio de etapa KDS (Preparando / Listo)
    this.eventBus.subscribe('fulfillment.stage_changed.v1', async (envelope: EventEnvelope) => {
      const ticket = envelope.payload?.ticket;
      const stage = envelope.payload?.nextStage;
      const phone = ticket?.customerPhone || envelope.payload?.customerPhone;
      const num = ticket?.orderId || ticket?.ticketId;

      if (stage === 'PREPARING') {
        const msg = `👨‍🍳 *La Parrilla Citiox*: Tu pedido #${num} está actualmente en los parrilleros.`;
        await this.sendWhatsAppNotification('fulfillment.stage_changed.v1', envelope.businessId, phone, msg);
      } else if (stage === 'READY' || stage === 'WAITING_DISPATCH') {
        const msg = `✨ *La Parrilla Citiox*: ¡Tu pedido #${num} está listo y empacado!`;
        await this.sendWhatsAppNotification('fulfillment.stage_changed.v1', envelope.businessId, phone, msg);
      }
    });

    // 4. Repartidor asignado
    this.eventBus.subscribe('delivery.assigned.v1', async (envelope: EventEnvelope) => {
      const task = envelope.payload?.task;
      const driver = envelope.payload?.driver;
      const phone = task?.customerPhone;
      const driverName = driver?.name || 'Asignado';
      const msg = `🛵 *La Parrilla Citiox*: Se ha asignado al repartidor ${driverName} para la entrega de tu pedido.`;
      await this.sendWhatsAppNotification('delivery.assigned.v1', envelope.businessId, phone, msg);

      // Notificar también al Repartidor
      if (driver?.phone) {
        const driverMsg = `🔔 *Nuevo Pedido Asignado*: Cliente ${task?.customerName || 'Cliente'}, Dirección: ${task?.address || 'Ubicación'}. Revisa tu panel para Aceptar o Rechazar.`;
        await this.sendWhatsAppNotification('delivery.driver_assigned_notice', envelope.businessId, driver.phone, driverMsg);
      }
    });

    // 5. Repartidor en camino
    this.eventBus.subscribe('delivery.on_route.v1', async (envelope: EventEnvelope) => {
      const task = envelope.payload;
      const phone = task?.customerPhone;
      const msg = `🚀 *La Parrilla Citiox*: ¡Tu repartidor va en camino a tu ubicación con tu pedido recién hecho!`;
      await this.sendWhatsAppNotification('delivery.on_route.v1', envelope.businessId, phone, msg);
    });

    // 6. Pedido entregado
    this.eventBus.subscribe('delivery.delivered.v1', async (envelope: EventEnvelope) => {
      const task = envelope.payload;
      const phone = task?.customerPhone;
      const msg = `✅ *La Parrilla Citiox*: Tu pedido ha sido entregado exitosamente. ¡Que lo disfrutes mucho!`;
      await this.sendWhatsAppNotification('delivery.delivered.v1', envelope.businessId, phone, msg);
    });

    this.logger.info('[NotificationRuntime] Suscripciones a eventos de notificaciones activas con integración WhatsApp Baileys');
  }

  private async sendWhatsAppNotification(topic: string, businessId: string, recipientPhone?: string, message?: string): Promise<void> {
    if (!message) return;

    let status: 'SENT' | 'FAILED' = 'SENT';
    if (recipientPhone && recipientPhone.length >= 8) {
      try {
        await whatsappService.sendWhatsApp(recipientPhone, message, true, 'order_status');
        this.logger.info(`[NotificationRuntime] WhatsApp enviado a ${recipientPhone}: "${message}"`);
      } catch (err: any) {
        status = 'FAILED';
        this.logger.error(`[NotificationRuntime] Error enviando WhatsApp a ${recipientPhone}:`, err);
      }
    } else {
      this.logger.warn(`[NotificationRuntime] No se especificó teléfono válido para notificación (${topic})`);
    }

    const logItem: SentNotificationLog = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      topic,
      businessId,
      recipient: recipientPhone,
      message,
      sentAt: new Date().toISOString(),
      status,
    };

    this.logs.push(logItem);
  }

  public getNotificationLogs(): SentNotificationLog[] {
    return [...this.logs];
  }
}
