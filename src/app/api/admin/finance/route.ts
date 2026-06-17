import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from 'date-fns';

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const negocioId = (session.user as any).negocioId;
        const { searchParams } = new URL(req.url);
        const filter = searchParams.get('filter') || 'month'; // day, week, month

        let startDate: Date;
        let endDate: Date;
        const now = new Date();

        if (filter === 'day') {
            startDate = new Date(new Date().setUTCHours(0, 0, 0, 0));
            endDate = new Date(new Date().setUTCHours(23, 59, 59, 999));
        } else if (filter === 'week') {
            startDate = startOfWeek(now, { weekStartsOn: 1 });
            startDate.setUTCHours(0, 0, 0, 0);
            endDate = endOfWeek(now, { weekStartsOn: 1 });
            endDate.setUTCHours(23, 59, 59, 999);
        } else {
            startDate = startOfMonth(now);
            startDate.setUTCHours(0, 0, 0, 0);
            endDate = endOfMonth(now);
            endDate.setUTCHours(23, 59, 59, 999);
        }

        const payments = await prisma.pagoReserva.findMany({
            where: {
                Appointment: {
                    negocioId
                },
                fecha: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                Appointment: {
                    include: {
                        cliente: { select: { nombre: true } },
                        service: { select: { nombre: true } }
                    }
                }
            },
            orderBy: {
                fecha: 'desc'
            }
        });

        const total = payments.reduce((acc, p) => acc + (p.monto || 0), 0);

        return NextResponse.json({
            payments,
            total,
            range: { startDate: startDate.toISOString(), endDate: endDate.toISOString() }
        });
    } catch (error) {
        console.error('Error in finance API:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
