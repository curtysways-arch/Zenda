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
            where: {
                negocioId: negocio.id,
                OR: [
                    { id: id },
                    ...(isNaN(Number(id)) ? [] : [{ numeroPedido: Number(id) }])
                ]
            },
            select: {
                id: true,
                numeroPedido: true,
                estado: true,
                estadoDisponibilidad: true,
                tipoEntrega: true,
                nombreCliente: true,
                telefonoCliente: true,
                direccionCliente: true,
                subtotal: true,
                costoEnvio: true,
                total: true,
                extraInfo: true,
                notas: true,
                createdAt: true,
                updatedAt: true,
                payment: {
                    select: {
                        id: true,
                        estado: true,
                        observaciones: true,
                        motivoRechazo: true,
                        evidences: {
                            select: {
                                id: true,
                                fileUrl: true,
                                createdAt: true
                            },
                            orderBy: { createdAt: 'desc' },
                            take: 1
                        }
                    }
                },
                items: {
                    select: {
                        id: true,
                        productoId: true,
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

        const parsedExtraInfo = typeof order.extraInfo === 'string'
            ? JSON.parse(order.extraInfo || '{}')
            : (order.extraInfo || {});

        // Serializar Decimal a número para el cliente
        const serialized = {
            ...order,
            extraInfo: parsedExtraInfo,
            estadoDisponibilidad: (order as any).estadoDisponibilidad || parsedExtraInfo.estadoDisponibilidad || null,
            subtotal: order.subtotal ? Number(order.subtotal) : null,
            costoEnvio: order.costoEnvio ? Number(order.costoEnvio) : null,
            total: order.total ? Number(order.total) : null,
            items: order.items.map((item: any) => ({
                ...item,
                precioUnitario: Number(item.precioUnitario) || 0,
            }))
        };

        return NextResponse.json({ order: serialized });
    } catch (error) {
        console.error('[API Order Track Error]:', error);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ slug: string; id: string }> }
) {
    const { slug, id } = await params;
    try {
        const body = await request.json();
        const { driverRating, driverComment, driverTags, restaurantRating, restaurantComment, rater } = body;

        const negocio = await prisma.negocio.findUnique({ where: { slug }, select: { id: true } });
        if (!negocio) {
            return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
        }

        const order = await (prisma as any).pedido.findFirst({
            where: {
                negocioId: negocio.id,
                OR: [{ id }, ...(isNaN(Number(id)) ? [] : [{ numeroPedido: Number(id) }])]
            }
        });

        if (!order) {
            return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
        }

        let extra: any = {};
        if (order.extraInfo) {
            extra = typeof order.extraInfo === 'string' ? JSON.parse(order.extraInfo) : order.extraInfo;
        }

        if (rater === 'DRIVER') {
            // Repartidor califica al cliente
            extra.customerRating = {
                stars: Number(driverRating) || 5,
                comment: driverComment || '',
                tags: driverTags || [],
                createdAt: new Date().toISOString()
            };
        } else {
            // Cliente califica al repartidor y al restaurante
            extra.clientReview = {
                driverStars: Number(driverRating) || 5,
                driverTags: driverTags || [],
                driverComment: driverComment || '',
                restaurantStars: Number(restaurantRating) || 5,
                restaurantComment: restaurantComment || '',
                createdAt: new Date().toISOString()
            };
        }

        const updatedOrder = await (prisma as any).pedido.update({
            where: { id: order.id },
            data: { extraInfo: extra }
        });

        return NextResponse.json({ success: true, order: updatedOrder });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Error guardando calificación' }, { status: 500 });
    }
}
