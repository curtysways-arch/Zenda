import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ share_code: string }> }
) {
    try {
        const { share_code } = await params;
        const body = await req.json();
        const { jugadores_necesarios, dividir_pago, precio_total } = body;

        const partido = await (prisma as any).sharedMatch.findUnique({
            where: { share_code },
            include: { reserva: { include: { cliente: true } } }
        });

        if (!partido) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });

        await (prisma as any).sharedMatch.update({
            where: { id: partido.id },
            data: {
                jugadores_necesarios: parseInt(jugadores_necesarios) || 10,
                dividir_pago: Boolean(dividir_pago),
                precio_total: typeof precio_total === 'number' ? precio_total : (parseFloat(precio_total) || partido.precio_total)
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error configurando partido:', error);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}
