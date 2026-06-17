import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const canchaId = searchParams.get('canchaId');
        const fecha = searchParams.get('fecha');

        if (!canchaId || !fecha) {
            return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
        }

        const rawFecha = searchParams.get('fecha')!;

        // Extraer solo la parte de fecha (yyyy-mm-dd) ignorando zona horaria
        const dateStr = rawFecha.substring(0, 10); // "2026-03-05"
        const [year, month, day] = dateStr.split('-').map(Number);

        const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
        const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

        const cancha = await prisma.Service.findUnique({
            where: { id: canchaId },
            select: { negocioId: true }
        });

        if (!cancha) {
            return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 });
        }

        const dayOfWeek = startOfDay.getUTCDay();

        const [reservas, bloqueos, courseSchedules, discounts] = await Promise.all([
            prisma.Appointment.findMany({
                where: {
                    serviceId: canchaId,
                    fecha: {
                        gte: startOfDay,
                        lte: endOfDay
                    },
                    OR: [
                        { estado: { in: ['confirmed', 'CONFIRMADA', 'confirmada', 'confirmado', 'PAGADO', 'pagado', 'COMPLETADA', 'completada'] } },
                        {
                            AND: [
                                { estado: { in: ['pending', 'PENDIENTE', 'pendiente', 'solicitada', 'SOLICITADA'] } },
                                { 
                                    OR: [
                                        { expiresAt: null },
                                        { expiresAt: { gt: new Date() } }
                                    ]
                                }
                            ]
                        }
                    ]
                },
                select: {
                    horaInicio: true,
                    horaFin: true,
                    estado: true,
                    expiresAt: true
                }
            }),
            prisma.Bloqueo.findMany({
                where: {
                    serviceId: canchaId,
                    fecha: {
                        gte: startOfDay,
                        lte: endOfDay
                    }
                },
                select: {
                    horaInicio: true,
                    horaFin: true,
                    motivo: true
                }
            }),
            prisma.CourseSchedule.findMany({
                where: {
                    serviceId: canchaId,
                    day_of_week: dayOfWeek,
                    Course: {
                        status: 'active',
                        AND: [
                            {
                                OR: [
                                    { start_date: null },
                                    { start_date: { lte: endOfDay } }
                                ]
                            },
                            {
                                OR: [
                                    { end_date: null },
                                    { end_date: { gte: startOfDay } }
                                ]
                            }
                        ]
                    }
                },
                select: {
                    start_time: true,
                    end_time: true,
                    Course: {
                        select: { name: true }
                    }
                }
            }),
            prisma.AutomaticDiscount.findMany({
                where: {
                    businessId: cancha.negocioId,
                    OR: [
                        { serviceId: canchaId },
                        { serviceId: null }
                    ]
                }
            })
        ]);

        // Adaptar nombres para el frontend
        const courseBlocks = courseSchedules.map((cs: any) => ({
            horaInicio: cs.start_time,
            horaFin: cs.end_time,
            motivo: `Curso: ${cs.Course.name}`
        }));

        // Adaptar descuentos automáticos (cambiar serviceId a courtId si el frontend lo espera así)
        const mappedDiscounts = discounts.map((d: any) => ({
            ...d,
            courtId: d.serviceId
        }));

        // Combinar bloqueos manuales con horarios de cursos
        const allBlocks = [...bloqueos, ...courseBlocks];

        // Prioridad: 1. Cancha específica, 2. General (serviceId: null)
        const automaticDiscount = mappedDiscounts.find(d => d.serviceId === canchaId) || mappedDiscounts.find(d => d.serviceId === null);

        return NextResponse.json({ reservas, bloqueos: allBlocks, automaticDiscount });
    } catch (error) {
        console.error('Error fetching availability:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
