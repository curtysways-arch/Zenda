import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { startOfToday } from 'date-fns';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const negocioId = (session.user as any).negocioId;
        if (!negocioId) {
            return NextResponse.json({ count: 0 }); // SUPER_ADMIN might hit this, return 0
        }

        const count = await prisma.appointment.count({
            where: {
                negocioId,
                estado: 'pending',
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } }
                ]
            }
        });

        return NextResponse.json({ count });
    } catch (error) {
        console.error("Error al obtener pendientes:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
