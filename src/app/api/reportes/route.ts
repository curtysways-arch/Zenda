import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { startOfMonth, endOfMonth, eachDayOfInterval, format, startOfToday, endOfToday, subDays } from 'date-fns';

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const negocioId = (session.user as any).negocioId;
        const { searchParams } = new URL(req.url);
        const range = searchParams.get('range') || 'month'; // 'today', 'week', 'month'

        let startDate = startOfMonth(new Date());
        let endDate = endOfMonth(new Date());

        if (range === 'today') {
            startDate = startOfToday();
            endDate = endOfToday();
        } else if (range === 'week') {
            startDate = subDays(new Date(), 7);
            endDate = new Date();
        }

        const reservas = await prisma.appointment.findMany({
            where: {
                negocioId,
                fecha: {
                    gte: startDate,
                    lte: endDate
                },
                estado: { in: ['confirmed', 'CONFIRMADA', 'completed', 'COMPLETADA', 'COMPLETED'] }
            },
            select: {
                total: true,
                fecha: true
            }
        });

        // Calcular total de ingresos
        const totalIngresos = reservas.reduce((acc, r) => acc + Number(r.total), 0);

        // Agrupar por día para el gráfico
        const chartData = reservas.reduce((acc: any, curr) => {
            const dateKey = format(curr.fecha, 'yyyy-MM-dd');
            if (!acc[dateKey]) acc[dateKey] = 0;
            acc[dateKey] += Number(curr.total);
            return acc;
        }, {});

        const formattedChartData = Object.entries(chartData).map(([date, total]) => ({
            date,
            total
        })).sort((a, b) => a.date.localeCompare(b.date));

        return NextResponse.json({
            summary: {
                totalIngresos,
                totalReservas: reservas.length,
            },
            chartData: formattedChartData
        });
    } catch (error) {
        console.error('Report error:', error);
        return NextResponse.json({ error: 'Error al generar reporte' }, { status: 500 });
    }
}
