import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { notificationService } from '@/lib/notifications';
import { PaymentService } from '@/lib/payments/PaymentService';

export const dynamic = 'force-dynamic';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    if (!phone) {
        return NextResponse.json({ error: 'Teléfono requerido' }, { status: 400 });
    }

    try {
        const negocio = await prisma.negocio.findUnique({ where: { slug } });
        if (!negocio) {
            return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
        }

        const cleanPhone = phone.replace(/\D/g, '');

        const orders = await (prisma as any).pedido.findMany({
            where: {
                negocioId: negocio.id,
                telefonoCliente: {
                    contains: cleanPhone.slice(-7)
                }
            },
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

        return NextResponse.json({ success: true, orders, pedidos: orders });
    } catch (e: any) {
        console.error('[ORDERS_GET_API]', e);
        return NextResponse.json({ error: e.message || 'Error interno' }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;

    try {
        const body = await request.json();
        const { 
            deliveryType, clientName, clientPhone, clientAddress, 
            clientReference, lat, lng, deliveryDate, timeSlot, items 
        } = body;

        // Validaciones básicas
        if (!clientName || !clientPhone || !items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'Datos del cliente o productos inválidos.' }, { status: 400 });
        }
        if (deliveryType === 'DOMICILIO' && !clientAddress) {
            return NextResponse.json({ error: 'La dirección es obligatoria para envíos a domicilio.' }, { status: 400 });
        }

        // Buscar negocio
        const negocio = await prisma.negocio.findUnique({
            where: { slug }
        });

        if (!negocio) {
            return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
        }

        // Obtener productos de la base de datos para calcular el precio correcto
        const productIds = items.map(item => item.productId);
        const dbProducts = await (prisma as any).producto.findMany({
            where: { id: { in: productIds }, negocioId: negocio.id }
        });

        if (dbProducts.length !== productIds.length) {
            return NextResponse.json({ error: 'Algunos productos no están disponibles.' }, { status: 400 });
        }

        // Calcular subtotal e items formateados
        let subtotal = 0;
        const itemsToCreate = [];

        for (const item of items) {
            const product = dbProducts.find(p => p.id === item.productId);
            if (!product || !product.activo) {
                return NextResponse.json({ error: `El producto ${product?.nombre || ''} no está activo.` }, { status: 400 });
            }
            const itemSubtotal = product.precio * item.cantidad;
            subtotal += itemSubtotal;

            itemsToCreate.push({
                productoId: product.id,
                nombreProducto: product.nombre,
                precioUnitario: product.precio,
                cantidad: item.cantidad
            });
        }

        // Helper para distancia Haversine
        const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
            const R = 6371; // Radio de la Tierra en km
            const dLat = (lat2 - lat1) * (Math.PI / 180);
            const dLon = (lon2 - lon1) * (Math.PI / 180);
            const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const d = R * c; // Distancia en km
            return d;
        };

        // Configuración de envío y monto mínimo
        const config = (negocio.configuracion as any) || {};

        // Validar monto mínimo en productos (sin incluir envío)
        const minOrderAmount = config.montoMinimoPedido !== undefined ? parseFloat(config.montoMinimoPedido) : 0;
        if (minOrderAmount > 0 && subtotal < minOrderAmount) {
            return NextResponse.json({
                error: `El pedido mínimo en productos es de $${minOrderAmount.toFixed(2)} (sin incluir costo de envío).`
            }, { status: 400 });
        }

        let costoEnvio = 0;
        if (deliveryType === 'DOMICILIO') {
            const baseCost = config.costoEnvio !== undefined ? parseFloat(config.costoEnvio) : 1.50;
            if (lat && lng) {
                const latNegocio = config.latitudNegocio !== undefined ? parseFloat(config.latitudNegocio) : -0.180653;
                const lngNegocio = config.longitudNegocio !== undefined ? parseFloat(config.longitudNegocio) : -78.467838;
                const distance = getDistanceFromLatLonInKm(latNegocio, lngNegocio, parseFloat(lat), parseFloat(lng));
                const kmCost = distance * (config.costoEnvioPorKm !== undefined ? parseFloat(config.costoEnvioPorKm) : 0.25);
                costoEnvio = parseFloat((baseCost + kmCost).toFixed(2));
            } else {
                costoEnvio = baseCost;
            }
        }
        const total = subtotal + costoEnvio;

        // Resolver fecha de entrega
        let dateToDeliver = new Date();
        if (deliveryDate === 'MANANA') {
            dateToDeliver.setDate(dateToDeliver.getDate() + 1);
        } else if (deliveryDate && deliveryDate.includes('-')) {
            dateToDeliver = new Date(deliveryDate + 'T00:00:00');
        }
        // Limpiar hora de la fecha
        dateToDeliver.setHours(0, 0, 0, 0);

        // Generar número de pedido secuencial por negocio (transacción segura)
        const txResult = await prisma.$transaction(async (tx) => {
            const lastOrder = await (tx as any).pedido.findFirst({
                where: { negocioId: negocio.id },
                orderBy: { numeroPedido: 'desc' },
                select: { numeroPedido: true }
            });

            const nextOrderNumber = lastOrder ? lastOrder.numeroPedido + 1 : 1;

            // Crear el pedido
            const newOrder = await (tx as any).pedido.create({
                data: {
                    negocioId: negocio.id,
                    numeroPedido: nextOrderNumber,
                    tipoEntrega: deliveryType,
                    nombreCliente: clientName,
                    telefonoCliente: clientPhone,
                    direccionCliente: clientAddress || null,
                    referenciaCliente: clientReference || null,
                    latitud: lat || null,
                    longitud: lng || null,
                    fechaEntrega: dateToDeliver,
                    franjaHoraria: timeSlot,
                    subtotal,
                    costoEnvio,
                    total,
                    estado: 'PENDIENTE_PAGO',
                    items: {
                        create: itemsToCreate
                    }
                },
                include: {
                    items: true
                }
            });

            const initialPayment = await PaymentService.createInitialPayment({
                pedidoId: newOrder.id,
                negocioId: negocio.id,
                monto: total
            }, tx);

            // Upsert cliente para vincular nombre y teléfono desde su primer pedido
            const cleanPhoneDigits = clientPhone.replace(/\D/g, '');
            const existingCliente = await (tx as any).cliente.findFirst({
                where: {
                    negocioId: negocio.id,
                    OR: [
                        { telefono: clientPhone },
                        { telefono: cleanPhoneDigits },
                        { telefono: { endsWith: cleanPhoneDigits.slice(-7) } }
                    ]
                }
            });

            if (existingCliente) {
                if (clientName && (!existingCliente.nombre || existingCliente.nombre === 'Usuario' || existingCliente.nombre === 'Cliente')) {
                    await (tx as any).cliente.update({
                        where: { id: existingCliente.id },
                        data: { nombre: clientName }
                    });
                }
            } else {
                await (tx as any).cliente.create({
                    data: {
                        id: crypto.randomUUID(),
                        negocioId: negocio.id,
                        nombre: clientName || "Cliente",
                        telefono: clientPhone,
                        updatedAt: new Date()
                    }
                });
            }

            return { newOrder, initialPayment };
        });

        const order = txResult.newOrder;
        const payment = txResult.initialPayment;

        // Notificar al negocio en segundo plano (Push + SSE + WhatsApp del Bot al Negocio)
        try {
            const { whatsappService } = require('@/lib/whatsapp');
            const { sseEmitter } = require('@/lib/notifications/notificationService');

            // 1. Notificación Push al admin y evento SSE en tiempo real
            await notificationService.sendPushToBusiness(
                negocio.id,
                `🛒 ¡Nuevo Pedido #${order.numeroPedido}!`,
                `De ${clientName} (${deliveryType === 'DOMICILIO' ? 'Domicilio' : 'Retiro'}) por $${total.toFixed(2)}.`
            ).catch(() => {});

            sseEmitter.emit('realtime_event', {
                negocioId: negocio.id,
                type: 'NUEVO_PEDIDO',
                title: `🛒 Nuevo Pedido #${order.numeroPedido}`,
                message: `Cliente: ${clientName} | Total: $${total.toFixed(2)}`,
                pedidoId: order.id
            });

            // 2. Enviar mensaje de WhatsApp DEL BOT AL NEGOCIO con detalles y ubicación GPS
            const bizPhone = negocio.whatsapp || (negocio as any).telefono || '0998877665';
            const itemsList = order.items ? order.items.map((i: any) => `• ${i.cantidad}x ${i.nombreProducto} ($${(i.precioUnitario * i.cantidad).toFixed(2)})`).join('\n') : '';
            
            let gpsLocation = '';
            if (order.latitud && order.longitud) {
                gpsLocation = `📍 *Ubicación GPS:* https://maps.google.com/?q=${order.latitud},${order.longitud}\n`;
            }

            let bizMsg = `🛒 *¡NUEVO PEDIDO REGISTRADO #${order.numeroPedido}!*\n\n`;
            bizMsg += `👤 *Cliente:* ${clientName}\n`;
            bizMsg += `📞 *Teléfono:* ${clientPhone}\n`;
            bizMsg += `🚚 *Tipo:* ${deliveryType === 'DOMICILIO' ? 'Entrega a Domicilio' : 'Retiro en Local'}\n`;
            if (deliveryType === 'DOMICILIO') {
                bizMsg += `🏠 *Dirección:* ${clientAddress || 'No especificada'}\n`;
                if (clientReference) bizMsg += `📝 *Referencia:* ${clientReference}\n`;
                if (gpsLocation) bizMsg += gpsLocation;
            }
            const requestedDateFormatted = dateToDeliver 
                ? new Date(dateToDeliver).toLocaleDateString('es-EC', { 
                    weekday: 'short', 
                    day: 'numeric', 
                    month: 'short', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                }) 
                : 'No especificada';
            bizMsg += `📅 *Horario Referencial Solicitado:* ${requestedDateFormatted}\n\n`;
            bizMsg += `📦 *Detalle del Pedido:*\n${itemsList}\n\n`;
            bizMsg += `💰 *Subtotal:* $${subtotal.toFixed(2)}\n`;
            if (deliveryType === 'DOMICILIO') bizMsg += `🛵 *Envío:* $${costoEnvio.toFixed(2)}\n`;
            bizMsg += `💵 *TOTAL:* $${total.toFixed(2)}\n`;

            await whatsappService.sendWhatsApp(bizPhone, bizMsg).catch(() => {});
        } catch (notifErr) {
            console.error('[ORDER_NOTIF_ERROR] Failed to send notifications/whatsapp:', notifErr);
        }

        return NextResponse.json({ pedido: order, payment });

    } catch (error) {
        console.error('[ORDERS_POST_API] Error creating order:', error);
        return NextResponse.json({ error: 'Ocurrió un error al procesar el pedido. Inténtalo de nuevo.' }, { status: 500 });
    }
}
