import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const waiterId = searchParams.get('waiterId') || searchParams.get('waiterName');

    if (!waiterId) {
        return NextResponse.json({ error: 'waiterId o waiterName es requerido' }, { status: 400 });
    }

    try {
        const negocio = await prisma.negocio.findUnique({ where: { slug } });
        if (!negocio) {
            return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
        }

        // 1. Consultar mesas asignadas al mesero
        const rawMesas = await (prisma as any).operableResource.findMany({
            where: {
                negocioId: negocio.id,
                category: 'TABLE'
            }
        });

        const myMesas = rawMesas.filter((r: any) => {
            const meta = typeof r.metadata === 'string' ? JSON.parse(r.metadata || '{}') : (r.metadata || {});
            return meta.waiterId === waiterId || meta.waiterName?.toLowerCase() === waiterId.toLowerCase();
        }).map((r: any) => {
            const meta = typeof r.metadata === 'string' ? JSON.parse(r.metadata || '{}') : (r.metadata || {});
            return {
                id: r.id,
                code: meta.code || r.name.replace(/\s+/g, ''),
                name: r.name,
                capacity: r.capacity || 4,
                status: r.estado || 'LIBRE',
                accountRequested: Boolean(meta.accountRequested)
            };
        });

        const tableCodes = myMesas.map(m => m.code);

        // 2. Consultar únicamente las órdenes pertenecientes a las mesas del mesero
        const orders = await (prisma as any).pedido.findMany({
            where: {
                negocioId: negocio.id,
                OR: [
                    { referenciaCliente: { in: tableCodes.map(c => `Mesa: ${c}`) } },
                    { referenciaCliente: { in: tableCodes } }
                ]
            },
            include: {
                items: true,
                payment: true
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({
            success: true,
            waiterId,
            mesas: myMesas,
            orders
        });
    } catch (e: any) {
        console.error('[WAITER_GET_API]', e);
        return NextResponse.json({ error: e.message || 'Error en consulta de mesero' }, { status: 500 });
    }
}
