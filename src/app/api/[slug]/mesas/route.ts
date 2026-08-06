import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    try {
        const negocio = await prisma.negocio.findUnique({ where: { slug } });
        if (!negocio) {
            return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
        }

        // Consultar mesas registradas como OperableResource con category = 'TABLE'
        const resources = await (prisma as any).operableResource.findMany({
            where: {
                negocioId: negocio.id,
                category: 'TABLE'
            },
            orderBy: { name: 'asc' }
        });

        const mesas = resources.map((r: any) => {
            const meta = typeof r.metadata === 'string' ? JSON.parse(r.metadata || '{}') : (r.metadata || {});
            return {
                id: r.id,
                code: meta.code || r.name.replace(/\s+/g, ''),
                name: r.name,
                capacity: r.capacity || 4,
                status: r.estado || 'LIBRE', // LIBRE | OCUPADA | RESERVADA | LIMPIEZA
                waiterName: meta.waiterName || null,
                waiterId: meta.waiterId || null,
                accountRequested: Boolean(meta.accountRequested)
            };
        });

        return NextResponse.json({ success: true, mesas });
    } catch (e: any) {
        console.error('[MESAS_GET_API]', e);
        return NextResponse.json({ error: e.message || 'Error consultando mesas' }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    try {
        const body = await request.json();
        const { name, code, capacity, status, waiterId, waiterName } = body;

        if (!name) {
            return NextResponse.json({ error: 'El nombre de la mesa es requerido' }, { status: 400 });
        }

        const negocio = await prisma.negocio.findUnique({ where: { slug } });
        if (!negocio) {
            return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
        }

        const mesaCode = code || name.replace(/\s+/g, '');

        const newMesa = await (prisma as any).operableResource.create({
            data: {
                negocioId: negocio.id,
                name: name,
                resourceType: 'INFRASTRUCTURE',
                category: 'TABLE',
                capacity: capacity ? parseInt(capacity) : 4,
                estado: status || 'LIBRE',
                metadata: {
                    code: mesaCode,
                    waiterId: waiterId || null,
                    waiterName: waiterName || null
                }
            }
        });

        return NextResponse.json({ success: true, mesa: newMesa });
    } catch (e: any) {
        console.error('[MESAS_POST_API]', e);
        return NextResponse.json({ error: e.message || 'Error creando mesa' }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    try {
        const body = await request.json();
        const { mesaId, status, accountRequested, waiterId, waiterName } = body;

        if (!mesaId) {
            return NextResponse.json({ error: 'mesaId es requerido' }, { status: 400 });
        }

        const mesa = await (prisma as any).operableResource.findUnique({
            where: { id: mesaId }
        });

        if (!mesa) {
            return NextResponse.json({ error: 'Mesa no encontrada' }, { status: 404 });
        }

        const currentMeta = typeof mesa.metadata === 'string' ? JSON.parse(mesa.metadata || '{}') : (mesa.metadata || {});
        const updatedMeta = {
            ...currentMeta,
            ...(waiterId !== undefined ? { waiterId } : {}),
            ...(waiterName !== undefined ? { waiterName } : {}),
            ...(accountRequested !== undefined ? { accountRequested } : {})
        };

        const updatedMesa = await (prisma as any).operableResource.update({
            where: { id: mesaId },
            data: {
                estado: status || mesa.estado,
                metadata: updatedMeta,
                updatedAt: new Date()
            }
        });

        return NextResponse.json({ success: true, mesa: updatedMesa });
    } catch (e: any) {
        console.error('[MESAS_PATCH_API]', e);
        return NextResponse.json({ error: e.message || 'Error actualizando mesa' }, { status: 500 });
    }
}
