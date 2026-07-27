import { NextRequest, NextResponse } from 'next/server';
import { PinchoOrderService } from '@/modules/pinchos/services/pinchoOrderService';
import { PinchoCheckoutSessionService } from '@/modules/pinchos/services/pinchoCheckoutSessionService';
import { PinchoNotificationService } from '@/modules/pinchos/services/pinchoNotificationService';
import { PinchoAnalyticsService } from '@/modules/pinchos/services/pinchoAnalyticsService';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { 
            slug, storeId, sessionId, clientName, clientPhone, 
            deliveryType, clientAddress, clientReference, lat, lng, 
            deliveryDate, timeSlot, items 
        } = body;

        let targetStoreId = storeId;
        let storeName = 'PinchoListo';

        if (!targetStoreId && slug) {
            const negocio = await prisma.negocio.findUnique({ where: { slug } });
            if (!negocio) {
                return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
            }
            targetStoreId = negocio.id;
            storeName = negocio.nombre;
        }

        if (!targetStoreId || !clientName || !clientPhone || !items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'Datos de pedido inválidos o faltantes.' }, { status: 400 });
        }

        // Create order via PinchoOrderService
        const { newOrder, initialPayment, friendlyCode } = await PinchoOrderService.createOrderFromCheckout({
            storeId: targetStoreId,
            clientName,
            clientPhone,
            deliveryType,
            clientAddress,
            clientReference,
            lat,
            lng,
            deliveryDate,
            timeSlot,
            items
        });

        // Delete temporary checkout draft upon order creation
        if (sessionId) {
            await PinchoCheckoutSessionService.deleteSession(sessionId);
            await PinchoAnalyticsService.trackStep({
                storeId: targetStoreId,
                sessionId,
                stepName: 'PAYMENT_PAGE_VIEW',
                stepIndex: 5,
                metadata: { orderId: newOrder.id, friendlyCode }
            });
        }

        // Notify business & client
        await PinchoNotificationService.notifyStatusChange({
            storeId: targetStoreId,
            storeName,
            pedidoId: newOrder.id,
            numeroPedido: newOrder.numeroPedido,
            friendlyCode,
            clientName,
            clientPhone,
            newStatus: 'PENDIENTE_PAGO',
            total: newOrder.total
        }).catch(() => {});

        return NextResponse.json({ 
            success: true, 
            pedido: {
                ...newOrder,
                friendlyCode
            }, 
            payment: initialPayment,
            friendlyCode
        });
    } catch (e: any) {
        console.error('[API_PINCHOS_ORDERS_POST]', e);
        return NextResponse.json({ error: e.message || 'Error al crear el pedido' }, { status: 500 });
    }
}
