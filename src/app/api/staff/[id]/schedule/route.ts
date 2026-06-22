import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const schedules = await prisma.staffSchedule.findMany({
            where: { staffId: id },
            orderBy: { dayOfWeek: 'asc' }
        });

        const exceptions = await prisma.staffException.findMany({
            where: { 
                staffId: id,
                date: { gte: new Date() }
            },
            orderBy: { date: 'asc' },
            take: 20
        });

        return NextResponse.json({ schedules, exceptions });
    } catch (error) {
        return NextResponse.json({ error: 'Error al obtener horarios' }, { status: 500 });
    }
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { schedules, exceptions } = await req.json();

        // 1. Actualizar horarios semanales
        if (schedules && Array.isArray(schedules)) {
            for (const schedule of schedules) {
                await prisma.staffSchedule.upsert({
                    where: {
                        staffId_dayOfWeek: {
                            staffId: id,
                            dayOfWeek: schedule.dayOfWeek
                        }
                    },
                    update: {
                        startTime: schedule.startTime,
                        endTime: schedule.endTime,
                        breaks: typeof schedule.breaks === 'string' ? schedule.breaks : JSON.stringify(schedule.breaks),
                        active: schedule.active ?? true
                    },
                    create: {
                        id: crypto.randomUUID(),
                        staffId: id,
                        dayOfWeek: schedule.dayOfWeek,
                        startTime: schedule.startTime,
                        endTime: schedule.endTime,
                        breaks: typeof schedule.breaks === 'string' ? schedule.breaks : JSON.stringify(schedule.breaks),
                        active: schedule.active ?? true
                    }
                });
            }
        }

        // 2. Manejar excepciones (aquí simplificado, normalmente querrías limpiar las antiguas o manejar IDs)
        if (exceptions && Array.isArray(exceptions)) {
             // Por ahora solo permitimos añadir/actualizar
             for (const ex of exceptions) {
                 await prisma.staffException.upsert({
                     where: {
                         staffId_date: {
                             staffId: id,
                             date: new Date(ex.date)
                         }
                     },
                     update: {
                         type: ex.type,
                         customStart: ex.customStart,
                         customEnd: ex.customEnd,
                         reason: ex.reason
                     },
                     create: {
                        id: crypto.randomUUID(),
                        staffId: id,
                        date: new Date(ex.date),
                        type: ex.type,
                        customStart: ex.customStart,
                        customEnd: ex.customEnd,
                        reason: ex.reason
                    }
                 });
             }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error saving schedule:', error);
        return NextResponse.json({ error: 'Error al guardar horarios', details: error.message }, { status: 500 });
    }
}
