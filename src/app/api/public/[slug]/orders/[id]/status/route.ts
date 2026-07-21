import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ slug: string; id: string }> }
) {
    const { id } = await params;

    try {
        const pedido = await (prisma as any).pedido.findUnique({
            where: { id },
            select: { estado: true }
        });

        if (!pedido) {
            return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
        }

        return NextResponse.json({ estado: pedido.estado });
    } catch (error) {
        console.error('[ORDER_STATUS_API] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
