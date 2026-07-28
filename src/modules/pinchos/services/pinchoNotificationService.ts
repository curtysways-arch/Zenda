import { notificationService } from '@/lib/notifications/notificationService';
import { sseEmitter } from '@/lib/notifications/notificationService';
import { whatsappService } from '@/lib/whatsapp';
import prisma from '@/lib/prisma';
import { formatToEcuadorPhone } from '@/lib/phoneUtils';

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
        items?: any[];
        deliveryType?: string;
        clientAddress?: string;
        clientReference?: string;
        lat?: number;
        lng?: number;
    }) {
        const { storeId, storeName, storePhone, pedidoId, numeroPedido, friendlyCode, clientName, clientPhone, newStatus, paymentStatus, total, items, deliveryType, clientAddress, clientReference, lat, lng } = payload;

        let title = '';
        let message = '';

        switch (newStatus) {
            case 'PENDIENTE_PAGO':
                title = `🛒 Pedido Registrado #${friendlyCode}`;
                message = `Hola ${clientName}, tu pedido por $${total.toFixed(2)} fue registrado. Recuerda subir tu comprobante de pago.`;
                break;
            case 'PAGO_EN_REVISION':
            case 'COMPROBANTE_ENVIADO':
                title = `💳 Comprobante Recibido #${friendlyCode}`;
                message = `Hola ${clientName}, recibimos tu comprobante. El equipo de ${storeName} está verificando tu pago.`;
                break;
            case 'EN_PREPARACION':
            case 'PREPARANDO_PEDIDO':
                title = `🎉 ¡Pago Confirmado! #${friendlyCode}`;
                message = `¡Buenas noticias ${clientName}! Tu pago fue confirmado. Ya comenzamos a preparar tus pinchos maridados.`;
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

        // 1. WhatsApp al CLIENTE
        if (clientPhone) {
            try {
                const formattedClientPhone = formatToEcuadorPhone(clientPhone);
                console.log(`[PinchoNotificationService] Enviando WhatsApp a CLIENTE: ${formattedClientPhone}`);
                await whatsappService.sendWhatsApp(formattedClientPhone, `*${title}*\n\n${message}`);
            } catch (e) {
                console.error('[PinchoNotificationService] Error enviando WhatsApp al cliente:', e);
            }
        }

        // Pausa de 3 segundos para evitar colisión en el socket del bot de WhatsApp
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 2. Notificación al NEGOCIO (Push + SSE + WhatsApp al Administrador del Negocio)
        try {
            const negocio = await prisma.negocio.findUnique({
                where: { id: storeId },
                select: { whatsapp: true, nombre: true, configuracion: true }
            });

            const bizPhone = storePhone || negocio?.whatsapp || (negocio?.configuracion as any)?.whatsapp || (negocio as any)?.telefono;

            // Push Notification al negocio
            await notificationService.sendPushToBusiness(storeId, title, message).catch(() => {});

            // Evento SSE en tiempo real
            sseEmitter.emit('realtime_event', {
                negocioId: storeId,
                type: newStatus === 'PENDIENTE_PAGO' ? 'NUEVO_PEDIDO' : 'ESTADO_ACTUALIZADO',
                title: `${title} (${clientName})`,
                message: `$${total.toFixed(2)} - ${newStatus}`,
                pedidoId
            });

            // WhatsApp al Negocio/Dueño
            if (bizPhone) {
                const formattedBizPhone = formatToEcuadorPhone(bizPhone);
                console.log(`[PinchoNotificationService] Enviando WhatsApp a NEGOCIO: ${formattedBizPhone}`);

                let itemsList = '';
                if (items && Array.isArray(items) && items.length > 0) {
                    itemsList = items.map((i: any) => `• ${i.cantidad || 1}x ${i.nombreProducto || i.nombre || 'Producto'} ($${((i.precioUnitario || i.precio || 0) * (i.cantidad || 1)).toFixed(2)})`).join('\n');
                }

                let gpsLocation = '';
                if (lat && lng) {
                    gpsLocation = `📍 *Ubicación GPS:* https://maps.google.com/?q=${lat},${lng}\n`;
                }

                let bizMsg = `🛒 *¡NOTIFICACIÓN DE PEDIDO #${friendlyCode}!*\n\n`;
                bizMsg += `📌 *Estado:* ${newStatus}\n`;
                bizMsg += `👤 *Cliente:* ${clientName}\n`;
                bizMsg += `📞 *Teléfono:* ${clientPhone}\n`;
                if (deliveryType) bizMsg += `🚚 *Tipo:* ${deliveryType === 'DOMICILIO' ? 'Entrega a Domicilio' : 'Retiro en Local'}\n`;
                if (clientAddress) bizMsg += `🏠 *Dirección:* ${clientAddress}\n`;
                if (clientReference) bizMsg += `📝 *Referencia:* ${clientReference}\n`;
                if (gpsLocation) bizMsg += gpsLocation;
                if (itemsList) bizMsg += `\n📦 *Detalle:*\n${itemsList}\n\n`;
                bizMsg += `💰 *TOTAL:* $${total.toFixed(2)}\n`;

                await whatsappService.sendWhatsApp(formattedBizPhone, bizMsg).catch((err: any) => {
                    console.error('[PinchoNotificationService] Error enviando WhatsApp al negocio:', err);
                });
            } else {
                console.warn(`[PinchoNotificationService] No se encontró número de WhatsApp para el negocio ID: ${storeId}`);
            }
        } catch (e) {
            console.error('[PinchoNotificationService] Error procesando notificación de negocio:', e);
        }

        return { success: true, title, message };
    }
}

