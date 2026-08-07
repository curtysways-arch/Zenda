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
        const { id, estado, franjaHoraria, fechaEntrega, notas, subtotal, costoEnvio, costoEmpaque, descuento, total, pricingBreakdown, prepTimeMinutes, extraInfoUpdates } = body;

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

        // Actualizaciones financieras de Caja via PricingEngine
        if (subtotal !== undefined) updateData.subtotal = parseFloat(subtotal);
        if (costoEnvio !== undefined) updateData.costoEnvio = parseFloat(costoEnvio);
        if (total !== undefined) updateData.total = parseFloat(total);

        // Guardar desglose de auditoría, prepTimeMinutes y extraInfoUpdates en extraInfo
        const currentExtra = (pedido.extraInfo as any) || {};
        const newExtraInfo = {
            ...currentExtra,
            ...(extraInfoUpdates || {}),
            ...(prepTimeMinutes ? { 
                prepTimeMinutes: parseInt(prepTimeMinutes, 10),
                acceptedAt: new Date().toISOString(),
                estimatedReadyAt: new Date(Date.now() + parseInt(prepTimeMinutes, 10) * 60 * 1000).toISOString()
            } : {})
        };

        if (pricingBreakdown || costoEmpaque !== undefined || descuento !== undefined) {
            newExtraInfo.packagingCost = costoEmpaque ?? currentExtra.packagingCost ?? 0;
            newExtraInfo.discountAmount = descuento ?? currentExtra.discountAmount ?? 0;
            newExtraInfo.pricingBreakdown = pricingBreakdown || currentExtra.pricingBreakdown;
        }

        updateData.extraInfo = newExtraInfo;

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

        // FASE 5C: Invocación del Enterprise Runtime (si está habilitado para el negocio)
        try {
            const { RestaurantOrderFlowAdapter } = await import('@/core/adapters/RestaurantOrderFlowAdapter');
            await RestaurantOrderFlowAdapter.processOrderStatusChange(
                pedido.negocio,
                {
                    id: pedidoActualizado.id,
                    negocioId: pedidoActualizado.negocioId,
                    numeroPedido: pedidoActualizado.numeroPedido,
                    estado: pedidoActualizado.estado,
                    tipoEntrega: pedidoActualizado.tipoEntrega,
                    nombreCliente: pedidoActualizado.nombreCliente,
                    telefonoCliente: pedidoActualizado.telefonoCliente,
                    subtotal: pedidoActualizado.subtotal,
                    costoEnvio: pedidoActualizado.costoEnvio,
                    total: pedidoActualizado.total,
                    extraInfo: pedidoActualizado.extraInfo,
                    items: pedidoActualizado.items || []
                },
                estado || pedidoActualizado.estado
            );
        } catch (rErr) {
            console.error('[ADMIN_PEDIDOS_RUNTIME_FLOW_ERROR]', rErr);
        }

        // Si la caja confirma el pedido (CONFIRMED, PREPARACION, EN_PREPARACION), emitir evento desacoplado CoreEventBus
        const isConfirmation = estado && ['CONFIRMED', 'PREPARACION', 'EN_PREPARACION'].includes(estado);
        if (isConfirmation) {
            try {
                const { coreEventBus } = require('@/core/events/EventBus');
                await coreEventBus.emit('ORDER_CONFIRMED', negocioId, pedidoActualizado, id);
            } catch (evErr) {
                console.error('[CORE_EVENT_ORDER_CONFIRMED_ERROR]', evErr);
            }
        }

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
                const formattedFechaEntrega = pedidoActualizado.fechaEntrega 
                    ? new Date(pedidoActualizado.fechaEntrega).toLocaleDateString('es-EC', { 
                        weekday: 'long', 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    }) 
                    : 'Por definir';

                switch (estado) {
                    case 'PREPARACION':
                    case 'EN_PREPARACION':
                    case 'RECIBIDO':
                        mensaje = `✅ *¡Tu pedido #${pedido.numeroPedido} ha sido CONFIRMADO!*\n\nEn *${pedido.negocio.nombre}* ya estamos preparando tus productos con la máxima calidad. 🔥\n\n📅 *Fecha y Hora de Entrega Confirmada:* ${formattedFechaEntrega}\n\n¡Gracias por tu compra!`;
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

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const negocioId = (session.user as any).negocioId;
    if (!negocioId) {
        return NextResponse.json({ error: 'Sin negocio asociado' }, { status: 400 });
    }

    try {
        const body = await req.json();
        const { 
            nombreCliente, telefonoCliente, direccionCliente, referenciaCliente, 
            tipoEntrega, items, autoConfirm, descuentoAmount, mesaCode 
        } = body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'Debe incluir al menos un producto' }, { status: 400 });
        }

        const negocio = await prisma.negocio.findUnique({ where: { id: negocioId } });
        if (!negocio) {
            return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
        }

        const config = (negocio.configuracion as any) || {};
        const { PricingEngine } = await import('@/core/pricing/PricingEngine');

        const pricingResult = PricingEngine.calculate({
            items: items.map((i: any) => ({
                productId: i.productoId || i.id,
                nombreProducto: i.nombreProducto || i.nombre,
                precioUnitario: parseFloat(i.precioUnitario || i.precio || 0),
                cantidad: parseInt(i.cantidad || 1, 10)
            })),
            deliveryType: tipoEntrega || 'PICKUP_ORDER',
            discountAmount: parseFloat(descuentoAmount || 0),
            deliveryConfig: config.deliveryConfig || { enabled: true, baseCost: 1.50, costPerKm: 0.25 },
            packagingConfig: config.packagingConfig || { enabled: true, type: 'PER_PRODUCT', amount: 0.25 }
        });

        const txResult = await prisma.$transaction(async (tx) => {
            const lastOrder = await (tx as any).pedido.findFirst({
                where: { negocioId },
                orderBy: { numeroPedido: 'desc' },
                select: { numeroPedido: true }
            });
            const nextNumber = lastOrder ? lastOrder.numeroPedido + 1 : 1;

            const estadoInicial = autoConfirm ? 'EN_PREPARACION' : 'WAITING_CONFIRMATION';

            const newOrder = await (tx as any).pedido.create({
                data: {
                    negocioId,
                    numeroPedido: nextNumber,
                    tipoEntrega: tipoEntrega || 'PICKUP_ORDER',
                    nombreCliente: nombreCliente || 'Cliente Caja',
                    telefonoCliente: telefonoCliente || '0999999999',
                    direccionCliente: direccionCliente || null,
                    referenciaCliente: referenciaCliente || (mesaCode ? `Mesa: ${mesaCode}` : null),
                    fechaEntrega: new Date(),
                    franjaHoraria: 'Inmediata',
                    subtotal: pricingResult.subtotal,
                    costoEnvio: pricingResult.deliveryCost,
                    total: pricingResult.total,
                    estado: estadoInicial,
                    extraInfo: {
                        origin: 'POS_CAJA',
                        mesaCode: mesaCode || null,
                        packagingCost: pricingResult.packagingCost,
                        discountAmount: pricingResult.discountAmount,
                        pricingBreakdown: pricingResult
                    },
                    items: {
                        create: items.map((i: any) => ({
                            productoId: i.productoId || i.id,
                            nombreProducto: i.nombreProducto || i.nombre,
                            precioUnitario: parseFloat(i.precioUnitario || i.precio || 0),
                            cantidad: parseInt(i.cantidad || 1, 10)
                        }))
                    }
                },
                include: { items: true }
            });

            return newOrder;
        });

        if (autoConfirm) {
            try {
                const { coreEventBus } = require('@/core/events/EventBus');
                await coreEventBus.emit('ORDER_CONFIRMED', negocioId, txResult, txResult.id);
            } catch (e) {
                console.error('[POST_PEDIDOS_EVENT_ERROR]', e);
            }
        }

        return NextResponse.json({ success: true, order: txResult });
    } catch (e: any) {
        console.error('[API_PEDIDOS_POST]', e);
        return NextResponse.json({ error: e.message || 'Error creando pedido' }, { status: 500 });
    }
}
