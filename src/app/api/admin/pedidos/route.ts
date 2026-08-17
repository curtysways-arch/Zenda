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

        // 1. ACCIÓN: ADICIONAR PRODUCTOS A PEDIDO EXISTENTE
        if (action === 'ADD_ITEMS_TO_ORDER' && body.newItems && Array.isArray(body.newItems) && body.newItems.length > 0) {
            const isPreviouslyPaid = currentExtra.paymentStatus === 'PAGADO' || pedido.payment?.estado === 'CONFIRMADO';
            const previousPaidAmount = isPreviouslyPaid 
                ? (currentExtra.montoPagadoAcumulado || pedido.total) 
                : (currentExtra.montoPagadoAcumulado || 0);

            await (prisma as any).pedidoItem.createMany({
                data: body.newItems.map((i: any) => ({
                    id: `pi_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                    pedidoId: id,
                    productoId: i.productoId || i.id,
                    nombreProducto: i.nombreProducto || i.nombre,
                    precioUnitario: parseFloat(i.precioUnitario || i.precio || 0),
                    cantidad: parseInt(i.cantidad || 1, 10)
                }))
            });

            const updatedAllItems = await (prisma as any).pedidoItem.findMany({ where: { pedidoId: id } });
            const newSubtotal = updatedAllItems.reduce((sum: number, item: any) => sum + (item.precioUnitario * item.cantidad), 0);
            updateData.subtotal = newSubtotal;
            const newTotal = newSubtotal + (pedido.costoEnvio || 0) + (currentExtra.packagingCost || 0) - (currentExtra.discountAmount || 0);
            updateData.total = newTotal;

            if (previousPaidAmount > 0) {
                currentExtra.montoPagadoAcumulado = previousPaidAmount;
                currentExtra.saldoPendiente = Math.round(Math.max(0, newTotal - previousPaidAmount) * 100) / 100;
                currentExtra.paymentStatus = currentExtra.saldoPendiente > 0 ? 'PARCIALMENTE_PAGADO' : 'PAGADO';
            }

            // Si existen cuentas divididas, asignar la adición a una subcuenta pendiente o crear una nueva subcuenta adicional
            if (currentExtra.splitAccounts && Array.isArray(currentExtra.splitAccounts)) {
                const addedSubtotal = body.newItems.reduce((s: number, i: any) => s + (parseFloat(i.precioUnitario || 0) * parseInt(i.cantidad || 1, 10)), 0);
                const unpaidAccount = currentExtra.splitAccounts.find((sa: any) => sa.estado === 'PENDIENTE');

                if (unpaidAccount) {
                    unpaidAccount.items.push(...body.newItems.map((i: any) => ({
                        productoId: i.productoId || i.id,
                        nombreProducto: i.nombreProducto || i.nombre,
                        cantidad: parseInt(i.cantidad || 1, 10),
                        precioUnitario: parseFloat(i.precioUnitario || 0)
                    })));
                    unpaidAccount.total = Math.round((unpaidAccount.total + addedSubtotal) * 100) / 100;
                } else {
                    const nextIdx = currentExtra.splitAccounts.length + 1;
                    currentExtra.splitAccounts.push({
                        id: `split_${Date.now()}`,
                        name: `Cuenta ${nextIdx} (Adición)`,
                        total: Math.round(addedSubtotal * 100) / 100,
                        items: body.newItems.map((i: any) => ({
                            productoId: i.productoId || i.id,
                            nombreProducto: i.nombreProducto || i.nombre,
                            cantidad: parseInt(i.cantidad || 1, 10),
                            precioUnitario: parseFloat(i.precioUnitario || 0)
                        })),
                        estado: 'PENDIENTE'
                    });
                }
            }

            if (body.kitchenNotes) {
                currentExtra.kitchenNotes = (currentExtra.kitchenNotes ? `${currentExtra.kitchenNotes} | ` : '') + body.kitchenNotes;
            }
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
                currentExtra.originalSubtotal = currentExtra.originalSubtotal || pedido.subtotal;
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
        if (action === 'MARCAR_PAGADO' || action === 'VERIFICAR_PAGO' || estado === 'PAGO_VERIFICADO') {
            currentExtra.paymentStatus = 'PAGADO';
            if (pedido.payment) {
                await (prisma as any).orderPayment.update({
                    where: { id: pedido.payment.id },
                    data: { estado: 'CONFIRMADO' }
                }).catch(() => {});
            } else {
                await (prisma as any).orderPayment.create({
                    data: {
                        pedidoId: id,
                        montoTotal: pedido.total,
                        montoPagado: pedido.total,
                        montoExcedente: 0,
                        estado: 'CONFIRMADO'
                    }
                }).catch(() => {});
            }
        } else if (action === 'RECHAZAR_PAGO' || estado === 'PAGO_RECHAZADO') {
            currentExtra.paymentStatus = 'RECHAZADO';
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
        } else if (action === 'PAY_SPLIT_ACCOUNT' && body.splitAccountId) {
            const splits = currentExtra.splitAccounts || [];
            const updatedSplits = splits.map((s: any) => {
                if (s.id === body.splitAccountId) {
                    return {
                        ...s,
                        estado: 'PAGADO',
                        metodoPago: body.metodoPago || 'EFECTIVO',
                        paidAt: new Date().toISOString(),
                        montoRecibido: body.montoRecibido || s.total,
                        vuelto: body.vuelto || 0
                    };
                }
                return s;
            });

            currentExtra.splitAccounts = updatedSplits;

            // Verificar si todas las cuentas divididas están pagadas
            const allPaid = updatedSplits.length > 0 && updatedSplits.every((s: any) => s.estado === 'PAGADO');
            if (allPaid) {
                updateData.estado = 'FINALIZADO';
                currentExtra.paymentStatus = 'PAGADO';
                if (pedido.payment) {
                    await (prisma as any).orderPayment.update({
                        where: { id: pedido.payment.id },
                        data: { estado: 'CONFIRMADO' }
                    }).catch(() => {});
                }
            }
        } else if (estado) {
            updateData.estado = estado;
        }

        // 5. ACCIÓN FINANCIERA INDEPENDIENTE: CONFIRMAR DEVOLUCIÓN O REGISTRAR REEMBOLSO
        if (action === 'CONFIRMAR_DEVOLUCION') {
            if (pedido.payment) {
                await (prisma as any).orderPayment.update({
                    where: { id: pedido.payment.id },
                    data: {
                        estado: 'REEMBOLSADO',
                        montoExcedente: 0,
                        metodoDevolucion: metodoDevolucion || 'TRANSFERENCIA',
                        referenciaDevolucion: referenciaDevolucion || null,
                        observacionDevolucion: observacionDevolucion || null,
                        devolucionAt: new Date(),
                        devolucionUser: (session.user as any).name || (session.user as any).email || 'Administrador'
                    }
                });
            }
            currentExtra.refundCompleted = true;
            currentExtra.montoExcedente = 0;
            currentExtra.paymentStatus = 'REEMBOLSADO';
        } else if (action === 'REGISTRAR_REEMBOLSO_PENDIENTE') {
            const amount = parseFloat(body.montoReembolso || 0);
            if (pedido.payment) {
                await (prisma as any).orderPayment.update({
                    where: { id: pedido.payment.id },
                    data: {
                        montoExcedente: amount,
                        estado: 'REEMBOLSO_PENDIENTE'
                    }
                });
            }
            currentExtra.montoExcedente = amount;
            currentExtra.paymentStatus = 'REEMBOLSO_PENDIENTE';
            currentExtra.refundCompleted = false;
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

            const currentEffectiveStatus = estado || ((action === 'SOLICITAR_CAMBIOS' || (updateData as any).estadoDisponibilidad === 'CAMBIOS_SOLICITADOS') ? 'CAMBIOS_SOLICITADOS' : pedido.estado);

            // Emitir evento SSE en tiempo real para el landing / tracking del cliente
            if (sseEmitter) {
                sseEmitter.emit('realtime_event', {
                    negocioId: pedido.negocioId,
                    type: currentEffectiveStatus === 'CAMBIOS_SOLICITADOS' ? 'CAMBIOS_SOLICITADOS' : 'ESTADO_CAMBIADO',
                    title: currentEffectiveStatus === 'CAMBIOS_SOLICITADOS' 
                        ? `🚨 Cambios Solicitados en Pedido #${pedido.numeroPedido || pedido.id.slice(0, 8)}`
                        : `🔄 Pedido #${pedido.numeroPedido} Actualizado`,
                    message: currentEffectiveStatus === 'CAMBIOS_SOLICITADOS'
                        ? `Algunos productos no están disponibles. Revisa la propuesta ajustada.`
                        : `Nuevo Estado: ${currentEffectiveStatus}`,
                    pedidoId: pedido.id
                });
            }

            // Notificación Push al negocio y al cliente
            if (notificationService?.sendPushToBusiness) {
                await notificationService.sendPushToBusiness(
                    pedido.negocioId,
                    `Pedido #${pedido.numeroPedido} -> ${currentEffectiveStatus}`,
                    `Cliente: ${pedido.nombreCliente}`
                ).catch(() => {});
            }

            // Notificación de WhatsApp DEL BOT AL CLIENTE
            if (pedido.telefonoCliente) {
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

                switch (currentEffectiveStatus) {
                    case 'CAMBIOS_SOLICITADOS':
                        const outOfStockItemsText = (body.outOfStockItemsList || []).map((i: any) => `• ${i.cantidad || 1}x ${i.nombreProducto || i.nombre}`).join('\n');
                        const trackingUrl = `https://citiox.com/${pedido.negocio.slug}/pedidos/${pedido.id}`;
                        mensaje = `🚨 *¡Aviso de Disponibilidad en tu Pedido #${pedido.numeroPedido || pedido.id.slice(0, 8)}!*\n\nHola *${pedido.nombreCliente || 'Cliente'}*, en *${pedido.negocio.nombre}* revisamos tu comanda.\n\n⚠️ *Productos Agotados:* \n${outOfStockItemsText || 'Falta de insumos en cocina'}\n\nPor favor ingresa para aceptar la propuesta o elegir productos de reemplazo:\n👉 ${trackingUrl}`;
                        break;
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
            tipoEntrega, items, autoConfirm, descuentoAmount, mesaCode, kitchenNotes,
            metodoPago, montoRecibido, vuelto, paymentStatus
        } = body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'Debe incluir al menos un producto' }, { status: 400 });
        }

        const negocio = await prisma.negocio.findUnique({ where: { id: negocioId } });
        if (!negocio) {
            return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
        }

        let cleanRef = referenciaCliente || null;
        if (!cleanRef && mesaCode && mesaCode !== 'POS' && mesaCode !== 'POS-Virtual') {
            cleanRef = mesaCode.toLowerCase().startsWith('mesa') ? mesaCode : `Mesa ${mesaCode}`;
        }

        const config = (negocio.configuracion as any) || {};
        const { PricingEngine } = await import('@/core/pricing/PricingEngine');

        const pricingResult = PricingEngine.calculate({
            items: items.map((i: any) => ({
                productId: i.productoId || i.id,
                name: i.nombreProducto || i.nombre,
                unitPrice: parseFloat(i.precioUnitario || i.precio || 0),
                precioUnitario: parseFloat(i.precioUnitario || i.precio || 0),
                quantity: parseInt(i.cantidad || i.quantity || 1, 10),
                cantidad: parseInt(i.cantidad || i.quantity || 1, 10)
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

            const numRecibido = montoRecibido !== undefined && montoRecibido !== null ? parseFloat(montoRecibido) : pricingResult.total;
            const numVuelto = vuelto !== undefined && vuelto !== null ? parseFloat(vuelto) : Math.max(0, numRecibido - pricingResult.total);

            const newOrder = await (tx as any).pedido.create({
                data: {
                    negocioId,
                    numeroPedido: nextNumber,
                    tipoEntrega: tipoEntrega || 'PICKUP_ORDER',
                    nombreCliente: nombreCliente || 'Cliente Caja',
                    telefonoCliente: telefonoCliente || '0999999999',
                    direccionCliente: direccionCliente || null,
                    referenciaCliente: cleanRef,
                    fechaEntrega: new Date(),
                    franjaHoraria: 'Inmediata',
                    subtotal: pricingResult.subtotal,
                    costoEnvio: pricingResult.deliveryCost,
                    total: pricingResult.total,
                    estado: estadoInicial,
                    extraInfo: {
                        origin: 'POS_CAJA',
                        mesaCode: mesaCode || null,
                        kitchenNotes: kitchenNotes || null,
                        packagingCost: pricingResult.packagingCost,
                        discountAmount: pricingResult.discountAmount,
                        pricingBreakdown: pricingResult,
                        metodoPago: metodoPago || 'EFECTIVO',
                        montoRecibido: numRecibido,
                        vuelto: numVuelto,
                        paymentStatus: paymentStatus || 'PAGADO'
                    },
                    payment: {
                        create: {
                            negocioId,
                            monto: pricingResult.total,
                            estado: paymentStatus === 'PAGADO' ? 'CONFIRMADO' : 'PENDIENTE'
                        }
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
                include: { items: true, payment: true }
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
