import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { notificationService } from '@/lib/notifications';
import { PaymentService } from '@/lib/payments/PaymentService';
import { formatToEcuadorPhone, getPhoneSearchConditions } from '@/lib/phoneUtils';
import { hasModule } from '@/lib/business/BusinessModuleResolver';

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
        let negocio = await prisma.negocio.findUnique({ where: { slug } });
        if (!negocio && (slug === 'lavado' || slug === 'demo-lavado')) {
            negocio = await prisma.negocio.findFirst({ where: { tipoNegocio: 'SHOE_CARE' } });
            if (!negocio) {
                negocio = {
                    id: 'sneaker-wash-id',
                    nombre: 'BubbleWash',
                    slug: slug,
                    tipoNegocio: 'SHOE_CARE'
                } as any;
            }
        }

        if (!negocio) {
            return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
        }

        // 🟢 Validación de Módulo (bypass para negocios Enterprise Runtime)
        const negocioConfigGet = (typeof negocio.configuracion === 'string'
            ? (() => { try { return JSON.parse(negocio.configuracion as string); } catch { return {}; } })()
            : (negocio.configuracion as any)) || {};
        const isEnterpriseGet = negocioConfigGet.useEnterpriseRuntime || negocioConfigGet.enterpriseRuntime;

        if (!isEnterpriseGet && !hasModule(negocio.tipoNegocio, 'ORDERS')) {
            return NextResponse.json({ error: 'MODULE_NOT_AVAILABLE', message: 'El módulo de pedidos no está disponible para este negocio.' }, { status: 403 });
        }

        const phoneConditions = getPhoneSearchConditions(phone);

        // 🔒 Consulta delimitada ESTRICTAMENTE por negocioId (sin fallbacks cross-tenant)
        const orders = await (prisma as any).pedido.findMany({
            where: {
                negocioId: negocio.id,
                OR: phoneConditions
            },
            include: {
                items: true,
                payment: true
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
        const deliveryType = body.deliveryType || body.tipoEntrega || 'DOMICILIO';
        const clientName = body.clientName || body.nombreCliente;
        const clientPhone = body.clientPhone || body.telefonoCliente;
        const clientAddress = body.clientAddress || body.direccionCliente;
        const clientReference = body.clientReference || body.referenciaCliente;
        const lat = body.lat !== undefined ? body.lat : body.latitud;
        const lng = body.lng !== undefined ? body.lng : body.longitud;
        const deliveryDate = body.deliveryDate || body.fechaEntrega;
        const timeSlot = body.timeSlot || body.franjaHoraria || 'ASAP';
        const items = body.items;

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

        // 🟢 Validación de Módulo (bypass para negocios Enterprise Runtime)
        const negocioConfig = (typeof negocio.configuracion === 'string'
            ? (() => { try { return JSON.parse(negocio.configuracion as string); } catch { return {}; } })()
            : (negocio.configuracion as any)) || {};
        const isEnterprise = negocioConfig.useEnterpriseRuntime || negocioConfig.enterpriseRuntime;

        if (!isEnterprise && !hasModule(negocio.tipoNegocio, 'ORDERS')) {
            return NextResponse.json({ error: 'MODULE_NOT_AVAILABLE', message: 'El módulo de pedidos no está disponible para este negocio.' }, { status: 403 });
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
            const R = 6371;
            const dLat = (lat2 - lat1) * (Math.PI / 180);
            const dLon = (lon2 - lon1) * (Math.PI / 180);
            const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
        };

        // Configuración de envío y empaque
        const config = (negocio.configuracion as any) || {};

        // Validar monto mínimo en productos
        const minOrderAmount = config.montoMinimoPedido !== undefined ? parseFloat(config.montoMinimoPedido) : 0;
        if (minOrderAmount > 0 && subtotal < minOrderAmount) {
            return NextResponse.json({
                error: `El pedido mínimo en productos es de $${minOrderAmount.toFixed(2)} (sin incluir costo de envío).`
            }, { status: 400 });
        }

        // Usar PricingEngine para cálculo desglosado
        const { PricingEngine } = await import('@/core/pricing/PricingEngine');
        const latNegocio = config.latitudNegocio !== undefined ? parseFloat(config.latitudNegocio) : -0.180653;
        const lngNegocio = config.longitudNegocio !== undefined ? parseFloat(config.longitudNegocio) : -78.467838;

        const pricingResult = PricingEngine.calculate({
            items: itemsToCreate.map(i => ({
                productId: i.productoId,
                nombreProducto: i.nombreProducto,
                precioUnitario: i.precioUnitario,
                cantidad: i.cantidad
            })),
            deliveryType: deliveryType || (body.channel === 'DELIVERY' ? 'DOMICILIO' : 'RETIRO'),
            deliveryConfig: config.deliveryConfig || {
                enabled: true,
                baseCost: config.costoEnvio !== undefined ? parseFloat(config.costoEnvio) : 1.50,
                costPerKm: config.costoEnvioPorKm !== undefined ? parseFloat(config.costoEnvioPorKm) : 0.25
            },
            packagingConfig: config.packagingConfig || { enabled: true, type: 'PER_PRODUCT', amount: 0.25 },
            originCoords: { lat: latNegocio, lng: lngNegocio },
            destinationCoords: lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : undefined
        });

        const costoEnvio = pricingResult.deliveryCost;
        const total = pricingResult.total;

        // Resolver fecha de entrega
        let dateToDeliver = new Date();
        if (deliveryDate === 'MANANA') {
            dateToDeliver.setDate(dateToDeliver.getDate() + 1);
        } else if (deliveryDate && deliveryDate.includes('-')) {
            dateToDeliver = new Date(deliveryDate + 'T00:00:00');
        }
        dateToDeliver.setHours(0, 0, 0, 0);

        // Generar número de pedido secuencial por negocio (transacción segura)
        const txResult = await prisma.$transaction(async (tx) => {
            const lastOrder = await (tx as any).pedido.findFirst({
                where: { negocioId: negocio.id },
                orderBy: { numeroPedido: 'desc' },
                select: { numeroPedido: true }
            });

            const nextOrderNumber = lastOrder ? lastOrder.numeroPedido + 1 : 1;

            // Crear el pedido con desglose de precios en extraInfo
            const newOrder = await (tx as any).pedido.create({
                data: {
                    negocioId: negocio.id,
                    numeroPedido: nextOrderNumber,
                    tipoEntrega: deliveryType || (body.channel === 'DELIVERY' ? 'DOMICILIO' : 'RETIRO'),
                    nombreCliente: clientName,
                    telefonoCliente: formatToEcuadorPhone(clientPhone || '0999999999'),
                    direccionCliente: clientAddress || null,
                    referenciaCliente: clientReference || (body.tableCode ? `Mesa: ${body.tableCode}` : null),
                    latitud: lat || null,
                    longitud: lng || null,
                    fechaEntrega: dateToDeliver,
                    franjaHoraria: timeSlot || 'Inmediata',
                    subtotal: pricingResult.subtotal,
                    costoEnvio: pricingResult.deliveryCost,
                    total: pricingResult.total,
                    estado: 'WAITING_CONFIRMATION',
                    extraInfo: {
                        ...(body.extraInfo || {}),
                        channel: body.channel || 'WEB',
                        tableCode: body.tableCode || null,
                        packagingCost: pricingResult.packagingCost,
                        pricingBreakdown: pricingResult
                    },
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

            // Upsert cliente para vincular nombre y teléfono en el ámbito del negocio actual
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

        // FASE 5C: Invocación desatendida del Enterprise Runtime (si está habilitado para el negocio)
        try {
            const { RestaurantOrderFlowAdapter } = await import('@/core/adapters/RestaurantOrderFlowAdapter');
            await RestaurantOrderFlowAdapter.processNewOrder(negocio, {
                id: order.id,
                negocioId: negocio.id,
                numeroPedido: order.numeroPedido,
                estado: order.estado,
                tipoEntrega: order.tipoEntrega,
                nombreCliente: order.nombreCliente,
                telefonoCliente: order.telefonoCliente,
                direccionCliente: order.direccionCliente,
                referenciaCliente: order.referenciaCliente,
                latitud: order.latitud,
                longitud: order.longitud,
                subtotal: order.subtotal,
                costoEnvio: order.costoEnvio,
                total: order.total,
                extraInfo: order.extraInfo,
                items: order.items || itemsToCreate
            });
        } catch (runtimeErr) {
            console.error('[PUBLIC_ORDERS_RUNTIME_FLOW_ERROR]', runtimeErr);
        }

        // Notificaciones en segundo plano
        try {
            const { whatsappService } = require('@/lib/whatsapp');
            const { sseEmitter } = require('@/lib/notifications/notificationService');

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
            console.error('[ORDER_NOTIF_ERROR]', notifErr);
        }

        return NextResponse.json({ pedido: order, payment });

    } catch (error) {
        console.error('[ORDERS_POST_API] Error creating order:', error);
        return NextResponse.json({ error: 'Ocurrió un error al procesar el pedido. Inténtalo de nuevo.' }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    try {
        const body = await request.json();
        const { orderId, estado, kitchenStatus } = body;

        if (!orderId || (!estado && !kitchenStatus)) {
            return NextResponse.json({ error: 'orderId y estado son requeridos' }, { status: 400 });
        }

        const negocio = await prisma.negocio.findUnique({ where: { slug } });
        if (!negocio) {
            return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
        }

        const order = await (prisma as any).pedido.findFirst({
            where: { id: orderId, negocioId: negocio.id }
        });

        if (!order) {
            return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
        }

        const currentExtra = typeof order.extraInfo === 'string' ? JSON.parse(order.extraInfo || '{}') : (order.extraInfo || {});
        const updatedExtra = {
            ...currentExtra,
            kitchenStatus: kitchenStatus || estado || currentExtra.kitchenStatus
        };

        const updatedOrder = await (prisma as any).pedido.update({
            where: { id: orderId },
            data: {
                estado: estado || order.estado,
                extraInfo: updatedExtra,
                updatedAt: new Date()
            }
        });

        return NextResponse.json({ success: true, order: updatedOrder });
    } catch (e: any) {
        console.error('[ORDERS_PATCH_API]', e);
        return NextResponse.json({ error: e.message || 'Error actualizando comanda' }, { status: 500 });
    }
}
