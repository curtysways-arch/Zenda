import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const negocioId = (session.user as any).negocioId;
    if (!negocioId) {
        return NextResponse.json({ error: 'No tienes un negocio asociado' }, { status: 400 });
    }

    try {
        const pedidos = await (prisma as any).pedido.findMany({
            where: { negocioId },
            include: { 
                items: true,
                payment: {
                    include: {
                        evidences: { orderBy: { createdAt: 'desc' } },
                        method: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(pedidos);
    } catch (e) {
        console.error('[API_PEDIDOS_GET]', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const negocioId = (session.user as any).negocioId;

    try {
        const body = await req.json();
        const { id, estado, franjaHoraria, fechaEntrega, notas } = body;

        if (!id) {
            return NextResponse.json({ error: 'El ID es obligatorio' }, { status: 400 });
        }

        // Validar propiedad del negocio
        const pedido = await (prisma as any).pedido.findUnique({
            where: { id },
            include: { negocio: true, payment: true }
        });

        if (!pedido || pedido.negocioId !== negocioId) {
            return NextResponse.json({ error: 'No autorizado o pedido no encontrado' }, { status: 403 });
        }

        const updateData: any = {};
        if (estado) updateData.estado = estado;
        if (franjaHoraria) updateData.franjaHoraria = franjaHoraria;
        if (fechaEntrega) updateData.fechaEntrega = new Date(fechaEntrega);
        if (notas !== undefined) updateData.notas = notas;

        const pedidoActualizado = await (prisma as any).pedido.update({
            where: { id },
            data: updateData,
            include: {
                items: true,
                payment: {
                    include: {
                        evidences: { orderBy: { createdAt: 'desc' } },
                        method: true
                    }
                }
            }
        });

        // Si se aprueba el pedido a PREPARACION o RECIBIDO, sincronizar el estado del pago a CONFIRMADO
        if (estado && ['PREPARACION', 'EN_PREPARACION', 'RECIBIDO'].includes(estado) && pedido.payment) {
            try {
                await (prisma as any).orderPayment.update({
                    where: { id: pedido.payment.id },
                    data: { estado: 'CONFIRMADO' }
                });
            } catch (pErr) {
                console.warn('[ORDER_STATUS_SYNC_PAYMENT_ERROR]', pErr);
            }
        }

        // Notificaciones Push + SSE + WhatsApp del Bot al Cliente
        try {
            const { whatsappService } = require('@/lib/whatsapp');
            const { sseEmitter, notificationService } = require('@/lib/notifications/notificationService');

            // Emitir evento SSE en tiempo real
            sseEmitter.emit('realtime_event', {
                negocioId: pedido.negocioId,
                type: 'ESTADO_CAMBIADO',
                title: `🔄 Pedido #${pedido.numeroPedido} Actualizado`,
                message: `Nuevo Estado: ${estado || pedido.estado}`,
                pedidoId: pedido.id
            });

            // Notificación Push al negocio
            await notificationService.sendPushToBusiness(
                pedido.negocioId,
                `Pedido #${pedido.numeroPedido} -> ${estado || pedido.estado}`,
                `Cliente: ${pedido.nombreCliente}`
            ).catch(() => {});

            // Notificación de WhatsApp DEL BOT AL CLIENTE
            if (pedido.telefonoCliente && estado) {
                let mensaje = '';
                const deliveryDateStr = pedidoActualizado.fechaEntrega ? new Date(pedidoActualizado.fechaEntrega).toISOString().split('T')[0] : '';
                const timeSlotStr = pedidoActualizado.franjaHoraria || '';

                switch (estado) {
                    case 'PREPARACION':
                    case 'EN_PREPARACION':
                    case 'RECIBIDO':
                        mensaje = `✅ *¡Tu pedido #${pedido.numeroPedido} ha sido CONFIRMADO!*\n\nEn *${pedido.negocio.nombre}* ya estamos preparando tus productos con la máxima calidad. 🔥\n\n📅 *Entrega Programada:* ${deliveryDateStr} (${timeSlotStr} hrs)\n\n¡Gracias por tu compra!`;
                        break;
                    case 'LISTO':
                        mensaje = pedido.tipoEntrega === 'DOMICILIO' 
                            ? `📦 *Tu pedido #${pedido.numeroPedido} está listo* y empacado. El repartidor saldrá en breve.`
                            : `🏪 *Tu pedido #${pedido.numeroPedido} está listo para retirar* en el local de *${pedido.negocio.nombre}*. ¡Te esperamos!`;
                        break;
                    case 'RUTA':
                    case 'EN_CAMINO':
                        mensaje = `🛵 *Tu pedido #${pedido.numeroPedido} está en ruta* hacia tu domicilio. ¡El repartidor llegará en breve!`;
                        break;
                    case 'ENTREGADO':
                        mensaje = `🎉 *Tu pedido #${pedido.numeroPedido} ha sido entregado*. ¡Gracias por tu compra en *${pedido.negocio.nombre}*! Que lo disfrutes.`;
                        break;
                    case 'CANCELADO':
                    case 'RECHAZADO':
                        mensaje = `❌ *Tu pedido #${pedido.numeroPedido} ha sido cancelado* por el establecimiento. Si tienes dudas, contáctanos.`;
                        break;
                }

                if (mensaje) {
                    await whatsappService.sendWhatsApp(pedido.telefonoCliente, mensaje).catch(() => {});
                }
            }
        } catch (notifErr) {
            console.error('[ORDER_STATUS_NOTIF_ERROR]', notifErr);
        }

        return NextResponse.json(pedidoActualizado);
    } catch (e) {
        console.error('[API_PEDIDOS_PUT]', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
