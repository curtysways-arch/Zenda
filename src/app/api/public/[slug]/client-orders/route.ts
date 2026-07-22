import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await context.params;
        const { searchParams } = new URL(req.url);
        const phone = searchParams.get('phone');

        if (!phone) {
            return NextResponse.json(
                { success: false, error: 'El parámetro teléfono es requerido.' },
                { status: 400 }
            );
        }

        const negocio = await prisma.negocio.findUnique({
            where: { slug }
        });

        if (!negocio) {
            return NextResponse.json(
                { success: false, error: 'Negocio no encontrado.' },
                { status: 404 }
            );
        }

        const cleanPhone = phone.replace(/\D/g, '');

        const orders = await prisma.pedido.findMany({
            where: {
                negocioId: negocio.id,
                telefonoCliente: {
                    contains: cleanPhone.slice(-7) // Coincidencia por últimos dígitos
                }
            },
            include: {
                items: true,
                payment: {
                    include: {
                        evidences: {
                            orderBy: { createdAt: 'desc' }
                        },
                        history: {
                            orderBy: { createdAt: 'desc' }
                        },
                        method: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({
            success: true,
            orders
        });
    } catch (error: any) {
        console.error('Error al consultar pedidos del cliente:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
