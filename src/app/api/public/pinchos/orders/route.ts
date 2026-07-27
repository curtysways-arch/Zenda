import { NextRequest, NextResponse } from 'next/server';
import { PinchoOrderService } from '@/modules/pinchos/services/pinchoOrderService';
import { PinchoCheckoutSessionService } from '@/modules/pinchos/services/pinchoCheckoutSessionService';
import { PinchoNotificationService } from '@/modules/pinchos/services/pinchoNotificationService';
import { PinchoAnalyticsService } from '@/modules/pinchos/services/pinchoAnalyticsService';
import prisma from '@/lib/prisma';
import { getPhoneSearchConditions } from '@/lib/phoneUtils';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    if (!phone) {
        return NextResponse.json({ error: 'Teléfono requerido' }, { status: 400 });
    }

    try {
        const phoneConditions = getPhoneSearchConditions(phone);

        const negocio = await prisma.negocio.findFirst({
            where: {
                OR: [
                    { slug: 'pinchos' },
                    { slug: 'pincholisto' }
                ]
            }
        });

        let orders = negocio ? await (prisma as any).pedido.findMany({
            where: {
                negocioId: negocio.id,
                OR: phoneConditions
            },
            include: {
                items: true,
                payment: true
            },
            orderBy: { createdAt: 'desc' }
        }) : [];

        if (orders.length === 0) {
            orders = await (prisma as any).pedido.findMany({
                where: {
                    OR: phoneConditions
                },
                include: {
                    items: true,
                    payment: true
                },
                orderBy: { createdAt: 'desc' }
            });
        }

        return NextResponse.json({ success: true, orders, pedidos: orders });
    } catch (e: any) {
        console.error('[API_PINCHOS_ORDERS_GET]', e);
        return NextResponse.json({ error: e.message || 'Error interno' }, { status: 500 });
    }
}


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

        // Delete temporary checkout draft — safe if table not yet migrated
        if (sessionId) {
            try {
                await PinchoCheckoutSessionService.deleteSession(sessionId);
                await PinchoAnalyticsService.trackStep({
                    storeId: targetStoreId,
                    sessionId,
                    stepName: 'PAYMENT_PAGE_VIEW',
                    stepIndex: 5,
                    metadata: { orderId: newOrder.id, friendlyCode }
                });
            } catch (_) {
                // Tables not yet migrated — ignore silently
            }
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
