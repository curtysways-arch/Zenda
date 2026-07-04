import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { format } from 'date-fns';

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const negocioId = (session.user as any).negocioId;

        if (!negocioId) {
            // Si es un Super Admin sin negocio asociado, devolvemos lista vacía por ahora
            // o podrías devolver todas si eso es lo que se espera.
            return NextResponse.json([]);
        }

        const now = new Date();

        /*
        // Limpieza automática: Expirar reservas que ya pasaron
        try {
            const today = new Date();
            today.setHours(0,0,0,0);
            const nowTime = format(new Date(), 'HH:mm');

            // 1. Citas de días anteriores
            await (prisma as any).appointment.updateMany({
                where: {
                    negocioId,
                    estado: { in: ['pending', 'PENDIENTE'] },
                    fecha: { lt: today }
                },
                data: { estado: 'expired' }
            });

            // 2. Citas de hoy que ya pasaron la hora
            await (prisma as any).appointment.updateMany({
                where: {
                    negocioId,
                    estado: { in: ['pending', 'PENDIENTE'] },
                    fecha: today,
                    horaInicio: { lt: nowTime }
                },
                data: { estado: 'expired' }
            });

            // 3. Expiración por token/timeout
            await (prisma as any).appointment.updateMany({
                where: {
                    negocioId,
                    estado: { in: ['pending', 'PENDIENTE'] },
                    expiresAt: { not: null, lt: new Date() }
                },
                data: { estado: 'expired' }
            });
        } catch (cleanupError) {
            console.error('Error en limpieza de reservas:', cleanupError);
        }
        */

        const appointments = await prisma.appointment.findMany({
            where: { negocioId },
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
        console.error('Error obteniendo reservas:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
