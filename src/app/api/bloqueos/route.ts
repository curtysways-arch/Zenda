import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { checkDemoRestriction } from '@/lib/demo-protection';

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const negocioId = (session.user as any).negocioId;

        const bloqueos = await prisma.bloqueo.findMany({
            where: { negocioId },
            include: { 
                service: true,
                staff: true
            },
            orderBy: { fecha: 'asc' }
        });

        return NextResponse.json(bloqueos);
    } catch (error) {
        console.error('Error fetching blocks:', error);
        return NextResponse.json({ error: 'Error al obtener bloqueos' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        // PROTECCIÓN MODO DEMO
        const demoCheck = await checkDemoRestriction();
        if (demoCheck.restricted) {
            return demoCheck.response;
        }

        const negocioId = (session.user as any).negocioId;
        const { fecha, horaInicio, horaFin, staffId, serviceId, canchaId, motivo } = await req.json();

        // Normalizar fecha a UTC medianoche para consistencia
        const [year, month, day] = fecha.split('-').map(Number);
        const fechaUTC = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

        const bloqueo = await prisma.bloqueo.create({
            data: {
                fecha: fechaUTC,
                horaInicio,
                horaFin,
                staffId: staffId || null,
                serviceId: serviceId || canchaId || null,
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
