import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { getServerSession } from "next-auth";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ share_code: string }> }
) {
    try {
        const { share_code } = await params;
        const body = await req.json();
        const { nombre, equipo_a_nombre, equipo_b_nombre } = body;

        const partido = await (prisma as any).sharedMatch.findUnique({
            where: { share_code },
            include: { reserva: { include: { cliente: true } } }
        });

        if (!partido) return NextResponse.json({ error: "Reserva/Partido Compartido no encontrado" }, { status: 404 });

        const count = await (prisma as any).sharedMatchGame.count({ where: { sharedMatchId: partido.id } });

        const newGame = await (prisma as any).sharedMatchGame.create({
            data: {
                sharedMatchId: partido.id,
                nombre: nombre || "Partido " + (count + 1),
                estado: "pendiente",
                equipo_a_nombre: equipo_a_nombre || "Equipo A",
                equipo_b_nombre: equipo_b_nombre || "Equipo B"
            }
        });

        return NextResponse.json({ success: true, game: newGame });
    } catch (error) {
        console.error('Error creando partido interno:', error);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}
