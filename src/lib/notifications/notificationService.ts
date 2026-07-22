/**
 * Servicio Desacoplado de Notificaciones Multicanal (WhatsApp, Push, Email)
 * Clean Architecture - Event Driven System
 */

export type NotificationEvent =
    | 'COMPROBANTE_RECIBIDO'
    | 'PAGO_CONFIRMADO'
    | 'PAGO_RECHAZADO'
    | 'PEDIDO_EN_PREPARACION'
    | 'PEDIDO_ENVIADO'
    | 'PEDIDO_ENTREGADO';

export interface NotificationPayload {
    event: NotificationEvent;
    negocioId: string;
    pedidoId: string;
    paymentId?: string;
    monto: number;
    telefonoCliente: string;
    nombreCliente: string;
    motivo?: string;
}

export class NotificationService {
    /**
     * Emite un evento de notificación a través de todos los proveedores activos
     */
    static async notify(payload: NotificationPayload) {
        console.log(`[NotificationService Event]: ${payload.event}`, {
            pedidoId: payload.pedidoId,
            monto: payload.monto,
            cliente: payload.nombreCliente,
            telefono: payload.telefonoCliente
        });

        try {
            // 1. Canal WhatsApp
            await this.sendWhatsAppMessage(payload);

            // 2. Canal Push Notifications (si está configurado)
            await this.sendPushNotification(payload);
        } catch (error) {
            console.error(`[NotificationService Error] Fallo al enviar notificación:`, error);
        }
    }

    private static async sendWhatsAppMessage(payload: NotificationPayload) {
        let text = '';
        switch (payload.event) {
            case 'COMPROBANTE_RECIBIDO':
                text = `Hola ${payload.nombreCliente}, hemos recibido tu comprobante de pago por $${payload.monto.toFixed(2)} para el pedido #${payload.pedidoId.slice(0, 8)}. Está en proceso de verificación.`;
                break;
            case 'PAGO_CONFIRMADO':
                text = `¡Excelente noticias ${payload.nombreCliente}! Tu pago por $${payload.monto.toFixed(2)} ha sido CONFIRMADO con éxito.`;
                break;
            case 'PAGO_RECHAZADO':
                text = `Hola ${payload.nombreCliente}, lamentablemente tu comprobante para el pedido #${payload.pedidoId.slice(0, 8)} ha sido rechazado. Motivo: ${payload.motivo || 'Comprobante no legible o incorrecto'}. Por favor sube un nuevo comprobante en 'Mis Pedidos'.`;
                break;
            case 'PEDIDO_EN_PREPARACION':
                text = `🔥 ¡Tu pedido en Pinchos ha ingresado a producción! Estamos preparando tus pinchos con la máxima calidad.`;
                break;
            case 'PEDIDO_ENVIADO':
                text = `🛵 Tu pedido #${payload.pedidoId.slice(0, 8)} ya está en ruta hacia tu dirección.`;
                break;
            case 'PEDIDO_ENTREGADO':
                text = `🎉 ¡Tu pedido ha sido entregado! ¡Que disfrutes de tus pinchos! Gracias por preferirnos.`;
                break;
        }

        if (text) {
            // Simulación / Integración con el Bot de WhatsApp existente de Citiox
            console.log(`[WhatsApp Outbound -> ${payload.telefonoCliente}]: ${text}`);
        }
    }

    private static async sendPushNotification(payload: NotificationPayload) {
        // Integrable con Web Push / Firebase Tokens
        console.log(`[Push Notification Event -> ${payload.event}] Dispatch for client ${payload.nombreCliente}`);
    }
}
