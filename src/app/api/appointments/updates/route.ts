import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const negocioId = (session.user as any).negocioId;

        if (!negocioId) {
            return NextResponse.json([]);
        }

        const { searchParams } = new URL(req.url);
        const sinceParam = searchParams.get('since');

        if (!sinceParam) {
            return NextResponse.json({ error: 'Falta el parámetro "since"' }, { status: 400 });
        }

        const sinceDate = new Date(sinceParam);
        if (isNaN(sinceDate.getTime())) {
            return NextResponse.json({ error: 'Parámetro "since" con formato de fecha inválido' }, { status: 400 });
        }

        // Consultar únicamente citas modificadas después del timestamp dado (updatedAt > since)
        const appointments = await prisma.appointment.findMany({
            where: { 
                negocioId,
                updatedAt: {
                    gt: sinceDate
                }
            },
            include: {
                cliente: true,
                service: {
                    include: {
                        imageMedia: true
                    }
                },
                staff: {
                    include: {
                        imageMedia: true
                    }
                },
                pagoReserva: {
                    orderBy: {
                        fecha: 'desc'
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        const { planLimitValidator } = await import('@/lib/services/planLimitValidator');
        const processedAppointments = await planLimitValidator.obfuscateOverLimitAppointments(negocioId, appointments);

        return NextResponse.json(processedAppointments);
    } catch (error) {
        console.error('Error obteniendo actualizaciones de reservas:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
