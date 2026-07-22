import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { notificationService } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

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
        const order = await prisma.$transaction(async (tx) => {
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

            // Importar dinámicamente PaymentService e inicializar entidad de pago
            const { PaymentService } = require('@/lib/payments/PaymentService');
            const initialPayment = await PaymentService.createInitialPayment({
                pedidoId: newOrder.id,
                negocioId: negocio.id,
                monto: total
            });

            return { newOrder, initialPayment };
        });

        const order = result.newOrder;
        const payment = result.initialPayment;

        // Intentar notificar al administrador en segundo plano (sin bloquear la respuesta)
        try {
            // Notificar vía Push al negocio (Citiox original)
            await notificationService.sendPushToBusiness(
                negocio.id,
                `Nuevo Pedido #${order.numeroPedido} (Pendiente de Pago)`,
                `De ${clientName} por un total de $${total.toFixed(2)}.`
            ).catch(() => {});
        } catch (notifErr) {
            console.error('[ORDER_NOTIF_ERROR] Failed to send notifications:', notifErr);
        }

        return NextResponse.json({ pedido: order, payment });

    } catch (error) {
        console.error('[ORDERS_POST_API] Error creating order:', error);
        return NextResponse.json({ error: 'Ocurrió un error al procesar el pedido. Inténtalo de nuevo.' }, { status: 500 });
    }
}
