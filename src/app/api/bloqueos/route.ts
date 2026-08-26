import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const negocioId = (session.user as any).negocioId;

        const bloqueos = await prisma.bloqueo.findMany({
            where: { negocioId },
            include: { Service: true },
            orderBy: { fecha: 'asc' }
        });

        const formatted = bloqueos.map((b: any) => ({
            ...b,
            cancha: b.Service
        }));

        return NextResponse.json(formatted);
    } catch (error) {
        console.error('Error fetching blocks:', error);
        return NextResponse.json({ error: 'Error al obtener bloqueos' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const negocioId = (session.user as any).negocioId;
        const { fecha, horaInicio, horaFin, canchaId, serviceId, motivo } = await req.json();

        const targetServiceId = serviceId || canchaId;
        if (!fecha || !horaInicio || !horaFin) {
            return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
        }

        const [year, month, day] = fecha.split('-').map(Number);
        const fechaUTC = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

        const bloqueo = await prisma.bloqueo.create({
            data: {
                id: `blk_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                fecha: fechaUTC,
                horaInicio,
                horaFin,
                serviceId: targetServiceId || null,
                negocioId,
                motivo
            }
        });

        return NextResponse.json(bloqueo);
    } catch (error) {
        console.error('Error creating block:', error);
        return NextResponse.json({ error: 'Error al crear bloqueo' }, { status: 500 });
    }
}
