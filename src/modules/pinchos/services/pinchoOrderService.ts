import prisma from '@/lib/prisma';
import { PinchoFriendlyCodeService } from './pinchoFriendlyCodeService';
import { PaymentService } from '@/lib/payments/PaymentService';

export type PinchoOrderStatus = 
    | 'BORRADOR'
    | 'PENDIENTE_PAGO'
    | 'PAGO_INICIADO'
    | 'COMPROBANTE_ENVIADO'
    | 'EN_REVISION'
    | 'PAGO_CONFIRMADO'
    | 'PREPARANDO_PEDIDO'
    | 'LISTO'
    | 'EN_RUTA'
    | 'ENTREGADO'
    | 'CANCELADO'
    | 'PAGO_EXPIRADO';

/** Safe helper: registers a timeline entry only if the table exists in production */
async function safeTimelineCreate(data: {
    pedidoId: string;
    estadoAnterior?: string | null;
    estadoNuevo: string;
    comentario?: string;
    creadoPor?: string;
}) {
    try {
        await (prisma as any).pinchoOrderTimeline.create({
            data: {
                pedidoId: data.pedidoId,
                estadoAnterior: data.estadoAnterior ?? null,
                estadoNuevo: data.estadoNuevo,
                comentario: data.comentario || `Estado: ${data.estadoNuevo}`,
                creadoPor: data.creadoPor || 'SISTEMA'
            }
        });
    } catch (_) {
        // Table not yet migrated in production — skip silently
    }
}

export class PinchoOrderService {
    public static async createOrderFromCheckout(payload: {
        storeId: string;
        clientName: string;
        clientPhone: string;
        deliveryType: 'RETIRO' | 'DOMICILIO';
        clientAddress?: string | null;
        clientReference?: string | null;
        lat?: number | null;
        lng?: number | null;
        deliveryDate?: string | null;
        timeSlot?: string | null;
        items: Array<{
            productId: string;
            cantidad: number;
        }>;
    }) {
        const { storeId, clientName, clientPhone, deliveryType, clientAddress, clientReference, lat, lng, deliveryDate, timeSlot, items } = payload;

        const negocio = await prisma.negocio.findUnique({
            where: { id: storeId }
        });

        if (!negocio) {
            throw new Error('Negocio no encontrado');
        }

        // Backend verification of products and prices
        const productIds = items.map(i => i.productId);
        const dbProducts = await (prisma as any).producto.findMany({
            where: { id: { in: productIds }, negocioId: storeId }
        });

        if (dbProducts.length !== productIds.length) {
            throw new Error('Algunos productos ya no están disponibles.');
        }

        let subtotal = 0;
        const itemsToCreate = [];

        for (const item of items) {
            const prod = dbProducts.find((p: any) => p.id === item.productId);
            if (!prod || !prod.activo) {
                throw new Error(`El producto ${prod?.nombre || ''} no está activo.`);
            }
            const itemSubtotal = prod.precio * item.cantidad;
            subtotal += itemSubtotal;
            itemsToCreate.push({
                productoId: prod.id,
                nombreProducto: prod.nombre,
                precioUnitario: prod.precio,
                cantidad: item.cantidad
            });
        }

        // Shipping Cost
        const config = (negocio.configuracion as any) || {};
        let costoEnvio = 0;
        if (deliveryType === 'DOMICILIO') {
            const baseCost = config.costoEnvio !== undefined ? parseFloat(config.costoEnvio) : 1.50;
            costoEnvio = baseCost;
        }

        const total = subtotal + costoEnvio;

        // Resolve delivery date
        let dateToDeliver = new Date();
        if (deliveryDate === 'MANANA') {
            dateToDeliver.setDate(dateToDeliver.getDate() + 1);
        } else if (deliveryDate && deliveryDate.includes('-')) {
            dateToDeliver = new Date(deliveryDate + 'T00:00:00');
        }
        dateToDeliver.setHours(0, 0, 0, 0);

        // Atomic Transaction — ONLY core order + payment. Timeline is done separately.
        const result = await prisma.$transaction(async (tx) => {
            const lastOrder = await (tx as any).pedido.findFirst({
                where: { negocioId: storeId },
                orderBy: { numeroPedido: 'desc' },
                select: { numeroPedido: true }
            });

            const nextSeq = lastOrder ? lastOrder.numeroPedido + 1 : 1;
            const friendlyCode = PinchoFriendlyCodeService.formatFriendlyCode(nextSeq, 'PIN');

            const newOrder = await (tx as any).pedido.create({
                data: {
                    negocioId: storeId,
                    numeroPedido: nextSeq,
                    tipoEntrega: deliveryType,
                    nombreCliente: clientName,
                    telefonoCliente: clientPhone,
                    direccionCliente: clientAddress || null,
                    referenciaCliente: clientReference || null,
                    latitud: lat || null,
                    longitud: lng || null,
                    fechaEntrega: dateToDeliver,
                    franjaHoraria: timeSlot || '',
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
                negocioId: storeId,
                monto: total
            }, tx);

            return { newOrder, initialPayment, friendlyCode };
        });

        // Log timeline AFTER transaction — safe, won't roll back the order if table missing
        await safeTimelineCreate({
            pedidoId: result.newOrder.id,
            estadoAnterior: null,
            estadoNuevo: 'PENDIENTE_PAGO',
            comentario: `Pedido registrado con código amigable ${result.friendlyCode}`,
            creadoPor: 'CLIENTE'
        });

        return result;
    }

    public static async transitionOrderStatus(pedidoId: string, nextStatus: PinchoOrderStatus, performedBy: string = 'SISTEMA', comment?: string) {
        const order = await (prisma as any).pedido.findUnique({
            where: { id: pedidoId },
            include: { payment: true }
        });

        if (!order) {
            throw new Error('Pedido no encontrado');
        }

        const currentStatus = order.estado;

        // State Machine Enforcement
        if (nextStatus === 'PREPARANDO_PEDIDO') {
            const paymentStatus = order.payment?.estado;
            if (paymentStatus !== 'CONFIRMADO') {
                throw new Error('No se puede iniciar la preparación sin un pago verificado y CONFIRMADO.');
            }
        }

        const updatedOrder = await (prisma as any).pedido.update({
            where: { id: pedidoId },
            data: { estado: nextStatus }
        });

        // Safe timeline — won't crash if table doesn't exist
        await safeTimelineCreate({
            pedidoId,
            estadoAnterior: currentStatus,
            estadoNuevo: nextStatus,
            comentario: comment || `Estado cambiado a ${nextStatus}`,
            creadoPor: performedBy
        });

        return updatedOrder;
    }
}
