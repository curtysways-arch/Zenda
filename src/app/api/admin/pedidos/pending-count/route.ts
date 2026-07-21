import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ count: 0 });
    }
    const negocioId = (session.user as any).negocioId;
    if (!negocioId) {
        return NextResponse.json({ count: 0 });
    }

    try {
        const count = await (prisma as any).pedido.count({
            where: {
                negocioId,
                estado: { in: ['RECIBIDO', 'PREPARACION', 'LISTO', 'RUTA'] }
            }
        });
        return NextResponse.json({ count });
    } catch (e) {
        console.error('[API_PEDIDOS_PENDING_COUNT]', e);
        return NextResponse.json({ count: 0 });
    }
}
