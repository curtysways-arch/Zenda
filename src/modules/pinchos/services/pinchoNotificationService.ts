import { notificationService } from '@/lib/notifications/notificationService';
import { whatsappService } from '@/lib/whatsapp';

export class PinchoNotificationService {
    public static async notifyStatusChange(payload: {
        storeId: string;
        storeName: string;
        storePhone?: string | null;
        pedidoId: string;
        numeroPedido: number;
        friendlyCode: string;
        clientName: string;
        clientPhone: string;
        newStatus: string;
        paymentStatus?: string;
        total: number;
    }) {
        const { storeId, storeName, storePhone, numeroPedido, friendlyCode, clientName, clientPhone, newStatus, paymentStatus, total } = payload;

        let title = '';
        let message = '';

        switch (newStatus) {
            case 'PENDIENTE_PAGO':
                title = `🛒 Pedido Registrado #${friendlyCode}`;
                message = `Hola ${clientName}, tu pedido por $${total.toFixed(2)} fue registrado. Recuerda subir tu comprobante de pago.`;
                break;
            case 'PAGO_EN_REVISION':
            case 'COMPROBANTE_ENVIADO':
                title = `⏳ Comprobante Recibido #${friendlyCode}`;
                message = `Hola ${clientName}, recibimos tu comprobante. El equipo de ${storeName} está verificando tu pago.`;
                break;
            case 'EN_PREPARACION':
            case 'PREPARANDO_PEDIDO':
                title = `🎉 ¡Pago Confirmado! #${friendlyCode}`;
                message = `¡Buenas noticias ${clientName}! Tu pago fue confirmado. Ya comenzamos a preparar tus pinchos maridados y empacados.`;
                break;
            case 'LISTO':
                title = `🍢 ¡Pedido Listo! #${friendlyCode}`;
                message = `Hola ${clientName}, tu pedido #${friendlyCode} está listo en ${storeName}.`;
                break;
            case 'EN_RUTA':
            case 'RUTA':
                title = `🛵 ¡Pedido en Ruta! #${friendlyCode}`;
                message = `Hola ${clientName}, tu pedido #${friendlyCode} va en camino a tu dirección.`;
                break;
            case 'ENTREGADO':
                title = `🎉 ¡Pedido Entregado! #${friendlyCode}`;
                message = `¡Gracias por tu compra en ${storeName}, ${clientName}! Que disfrutes tus pinchos.`;
                break;
            case 'PAGO_EXPIRADO':
                title = `⏰ Pedido Expirado #${friendlyCode}`;
                message = `Hola ${clientName}, tu pedido #${friendlyCode} ha expirado. Puedes reactivarlo desde nuestra app sin perder tu carrito.`;
                break;
            default:
                title = `Actualización de Pedido #${friendlyCode}`;
                message = `Tu pedido en ${storeName} se encuentra en estado: ${newStatus}.`;
                break;
        }

        // WhatsApp notification to Client
        if (clientPhone) {
            try {
                await whatsappService.sendWhatsApp(clientPhone, `${title}\n\n${message}`);
            } catch (e) {
                console.error('[PinchoNotificationService] Error sending WhatsApp to client:', e);
            }
        }

        // Push notification & Real-time SSE to Admin
        try {
            await notificationService.sendPushToBusiness(storeId, title, message).catch(() => {});
        } catch (e) {
            // Ignore push errors
        }

        return { success: true, title, message };
    }
}
