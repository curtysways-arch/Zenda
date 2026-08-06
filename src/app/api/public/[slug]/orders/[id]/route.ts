// src/app/api/public/[slug]/orders/[id]/route.ts
// API pública para obtener el estado de un pedido específico (tracking)

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ slug: string; id: string }> }
) {
    const { slug, id } = await params;

    try {
        const negocio = await prisma.negocio.findUnique({ where: { slug }, select: { id: true } });
        if (!negocio) {
            return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
        }

        const order = await (prisma as any).pedido.findFirst({
            where: { id, negocioId: negocio.id },
            select: {
                id: true,
                numeroPedido: true,
                estado: true,
                tipoEntrega: true,
                nombreCliente: true,
                telefonoCliente: true,
                direccionCliente: true,
                subtotal: true,
                costoEnvio: true,
                total: true,
                notas: true,
                createdAt: true,
                updatedAt: true,
                items: {
                    select: {
                        id: true,
                        nombreProducto: true,
                        cantidad: true,
                        precioUnitario: true,
                    }
                }
            }
        });

        if (!order) {
            return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
        }

        // Serializar Decimal a número para el cliente
        const serialized = {
            ...order,
            subtotal: order.subtotal ? Number(order.subtotal) : null,
            costoEnvio: order.costoEnvio ? Number(order.costoEnvio) : null,
            total: order.total ? Number(order.total) : null,
            items: order.items.map((item: any) => ({
                ...item,
                precioUnitario: Number(item.precioUnitario) || 0,
            }))
        };

        return NextResponse.json({ success: true, order: serialized });
    } catch (e: any) {
        console.error('[ORDER_TRACKING_GET]', e);
        return NextResponse.json({ error: e.message || 'Error interno' }, { status: 500 });
    }
}
