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
        const {
            id, action, estado, estadoDisponibilidad, franjaHoraria, fechaEntrega, notas,
            subtotal, costoEnvio, costoEmpaque, descuento, total, pricingBreakdown,
            prepTimeMinutes, extraInfoUpdates, proposedItems, outOfStockProductIds,
            disableOutOfStock, metodoDevolucion, referenciaDevolucion, observacionDevolucion, motivoRechazo
        } = body;

        if (!id) {
            return NextResponse.json({ error: 'El ID es obligatorio' }, { status: 400 });
        }

        // Validar propiedad del negocio
        const pedido = await (prisma as any).pedido.findUnique({
            where: { id },
            include: { negocio: true, payment: true, items: true }
        });

        if (!pedido || pedido.negocioId !== negocioId) {
            return NextResponse.json({ error: 'No autorizado o pedido no encontrado' }, { status: 403 });
        }

        const updateData: any = {};
        let currentExtra: any = {};
        if (typeof pedido.extraInfo === 'string') {
            try {
                currentExtra = JSON.parse(pedido.extraInfo);
            } catch {
                currentExtra = {};
            }
        } else if (pedido.extraInfo && typeof pedido.extraInfo === 'object') {
            currentExtra = { ...pedido.extraInfo };
        }

        // 1. ACCIÓN: CONFIRMAR DISPONIBILIDAD DE PRODUCTOS
        if (action === 'CONFIRMAR_DISPONIBILIDAD' || estadoDisponibilidad === 'PRODUCTOS_CONFIRMADOS') {
            updateData.estadoDisponibilidad = 'PRODUCTOS_CONFIRMADOS';
            if (pedido.estado === 'RECIBIDO') {
                updateData.estado = 'RECIBIDO'; // Permanece en RECIBIDO en espera de verificación de pago
            }
        }

        // 2. ACCIÓN: SOLICITAR CAMBIOS POR PRODUCTO AGOTADO (NO genera reembolso aún hasta que cliente acepte)
        if (action === 'SOLICITAR_CAMBIOS' || estado === 'CAMBIOS_SOLICITADOS') {
            updateData.estadoDisponibilidad = 'CAMBIOS_SOLICITADOS';
            updateData.estado = 'CAMBIOS_SOLICITADOS';

            if (proposedItems && Array.isArray(proposedItems)) {
                currentExtra.proposedItems = proposedItems;
                currentExtra.outOfStockItemsList = body.outOfStockItemsList || [];
                currentExtra.proposedSubtotal = subtotal !== undefined ? parseFloat(subtotal) : pedido.subtotal;
                currentExtra.proposedTotal = total !== undefined ? parseFloat(total) : pedido.total;
            }

            // Disponibilidad rápida de productos en catálogo
            if (disableOutOfStock && outOfStockProductIds && Array.isArray(outOfStockProductIds) && outOfStockProductIds.length > 0) {
                try {
                    await (prisma as any).producto.updateMany({
                        where: { id: { in: outOfStockProductIds }, negocioId },
                        data: { activo: false }
                    });
                } catch (pErr) {
                    console.warn('[ADMIN_PEDIDOS_DISABLE_PRODUCTS_ERROR]', pErr);
                }
            }
        }

        // 3. ACCIÓN: VERIFICAR O RECHAZAR PAGO
        if (action === 'VERIFICAR_PAGO' || estado === 'PAGO_VERIFICADO') {
            if (pedido.payment) {
                await (prisma as any).orderPayment.update({
                    where: { id: pedido.payment.id },
                    data: { estado: 'PAGO_VERIFICADO' }
                });
            }
        } else if (action === 'RECHAZAR_PAGO' || estado === 'PAGO_RECHAZADO') {
            if (pedido.payment) {
                await (prisma as any).orderPayment.update({
                    where: { id: pedido.payment.id },
                    data: { estado: 'PAGO_RECHAZADO', motivoRechazo: motivoRechazo || 'Comprobante inválido o no legible' }
                });
            }
        }

        // 4. ACCIÓN: ACEPTACIÓN DEFINITIVA DEL PEDIDO (PRODUCTOS OK + PAGO VERIFICADO) -> Pasa a ACEPTADO -> EN_PREPARACION (Cocina)
        if (action === 'ACEPTAR_PEDIDO' || estado === 'ACEPTADO' || estado === 'EN_PREPARACION') {
            updateData.estado = 'EN_PREPARACION';
            if (pedido.payment && pedido.payment.estado !== 'CONFIRMADO') {
                await (prisma as any).orderPayment.update({
                    where: { id: pedido.payment.id },
                    data: { estado: 'CONFIRMADO' }
                }).catch(() => {});
            }
        } else if (estado) {
            updateData.estado = estado;
        }

        // 5. ACCIÓN FINANCIERA INDEPENDIENTE: CONFIRMAR DEVOLUCIÓN DE REEMBOLSO (OrderPayment.estado = REEMBOLSADO)
        if (action === 'CONFIRMAR_DEVOLUCION' && pedido.payment) {
            await (prisma as any).orderPayment.update({
                where: { id: pedido.payment.id },
                data: {
                    estado: 'REEMBOLSADO',
                    metodoDevolucion: metodoDevolucion || 'TRANSFERENCIA',
                    referenciaDevolucion: referenciaDevolucion || null,
                    observacionDevolucion: observacionDevolucion || null,
                    devolucionAt: new Date(),
                    devolucionUser: (session.user as any).name || (session.user as any).email || 'Administrador'
                }
            });
            // NOTA: El estado del pedido no se modifica en lo absoluto para preservar el flujo operativo.
        }

        if (franjaHoraria) updateData.franjaHoraria = franjaHoraria;
        if (fechaEntrega) updateData.fechaEntrega = new Date(fechaEntrega);
        if (notas !== undefined) updateData.notas = notas;

        if (subtotal !== undefined) updateData.subtotal = parseFloat(subtotal);
        if (costoEnvio !== undefined) updateData.costoEnvio = parseFloat(costoEnvio);
        if (total !== undefined) updateData.total = parseFloat(total);

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

        if (updateData.estadoDisponibilidad) {
            newExtraInfo.estadoDisponibilidad = updateData.estadoDisponibilidad;
        }

        updateData.extraInfo = newExtraInfo;

        let pedidoActualizado: any;
        try {
            pedidoActualizado = await (prisma as any).pedido.update({
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
        } catch (updateErr: any) {
            console.warn('[ADMIN_PEDIDOS_UPDATE_FALLBACK]', updateErr?.message || updateErr);
            // Fallback si la columna estadoDisponibilidad aún no existe en la base de datos de producción
            if (updateData.estadoDisponibilidad) {
                delete updateData.estadoDisponibilidad;
                pedidoActualizado = await (prisma as any).pedido.update({
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
            } else {
                throw updateErr;
            }
        }

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

        // Si el pedido llega a ENTREGADO, asegurar que el pago (ej. Contra Entrega) quede CONFIRMADO
        if (estado === 'ENTREGADO' && pedido.payment && pedido.payment.estado !== 'CONFIRMADO') {
            try {
                await (prisma as any).orderPayment.update({
                    where: { id: pedido.payment.id },
                    data: { estado: 'CONFIRMADO' }
                });
            } catch (pErr) {
                console.warn('[ORDER_DELIVERED_SYNC_PAYMENT_ERROR]', pErr);
            }
        }

        // Notificaciones Push + SSE + WhatsApp del Bot al Cliente
        try {
            const { whatsappService } = require('@/lib/whatsapp');
            const { sseEmitter } = require('@/lib/notifications/notificationService');
            const { notificationService } = require('@/lib/notifications');

            // Emitir evento SSE en tiempo real
            if (sseEmitter) {
                sseEmitter.emit('realtime_event', {
                    negocioId: pedido.negocioId,
                    type: 'ESTADO_CAMBIADO',
                    title: `🔄 Pedido #${pedido.numeroPedido} Actualizado`,
                    message: `Nuevo Estado: ${estado || pedido.estado}`,
                    pedidoId: pedido.id
                });
            }

            // Notificación Push al negocio
            if (notificationService?.sendPushToBusiness) {
                await notificationService.sendPushToBusiness(
                    pedido.negocioId,
                    `Pedido #${pedido.numeroPedido} -> ${estado || pedido.estado}`,
                    `Cliente: ${pedido.nombreCliente}`
                ).catch(() => {});
            }

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
                    case 'ACEPTADO':
                        mensaje = `✅ *¡Tu pedido #${pedido.numeroPedido} ha sido ACEPTADO!*\n\nEl equipo de *${pedido.negocio.nombre}* ingresará tu pedido a preparación en breve. 🔥`;
                        break;
                    case 'PREPARACION':
                    case 'EN_PREPARACION':
                    case 'RECIBIDO':
                        mensaje = `✅ *¡Tu pedido #${pedido.numeroPedido} está en PREPARACIÓN!*\n\nEn *${pedido.negocio.nombre}* ya estamos preparando tus productos con la máxima calidad. 🔥\n\n📅 *Fecha y Hora de Entrega Confirmada:* ${formattedFechaEntrega}\n\n¡Gracias por tu compra!`;
                        break;
                    case 'LISTO':
                        mensaje = pedido.tipoEntrega === 'DOMICILIO' 
                            ? `📦 *Tu pedido #${pedido.numeroPedido} está listo* y empacado. El repartidor saldrá en breve.`
                            : `🏪 *Tu pedido #${pedido.numeroPedido} está listo para retirar* en el local de *${pedido.negocio.nombre}*. ¡Te esperamos!`;
                        break;
                    case 'RUTA':
                    case 'EN_CAMINO':
                    case 'EN_RUTA':
                        mensaje = `🛵 *Tu pedido #${pedido.numeroPedido} está en ruta* hacia tu domicilio. ¡El repartidor llegará en breve!`;
                        break;
                    case 'ESPERANDO_CLIENTE':
                        mensaje = `🛵 *¡EL REPARTIDOR HA LLEGADO!*\n\nHola ${pedido.nombreCliente}, tu repartidor ya se encuentra en tu dirección de entrega con tu pedido #${pedido.numeroPedido}. ¡Por favor sal a recibirlo! 📦✨`;
                        break;
                    case 'ENTREGADO':
                    case 'FINALIZADO':
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
    } catch (e: any) {
        console.error('[API_PEDIDOS_PUT_FATAL_ERROR]', e?.message || e, e?.stack);
        return NextResponse.json({ error: e?.message || 'Error interno al actualizar pedido' }, { status: 500 });
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
