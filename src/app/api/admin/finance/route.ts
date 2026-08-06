import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const negocioId = (session.user as any).negocioId;
        const { searchParams } = new URL(req.url);
        const filter = searchParams.get('filter') || 'day'; // day, week, month, custom
        const startDateParam = searchParams.get('startDate');
        const endDateParam = searchParams.get('endDate');
        const cashierParam = searchParams.get('cashier');

        let startDate: Date;
        let endDate: Date;
        const now = new Date();

        if (filter === 'day') {
            startDate = startOfDay(now);
            endDate = endOfDay(now);
        } else if (filter === 'week') {
            startDate = startOfWeek(now, { weekStartsOn: 1 });
            endDate = endOfWeek(now, { weekStartsOn: 1 });
        } else if (filter === 'month') {
            startDate = startOfMonth(now);
            endDate = endOfMonth(now);
        } else if (filter === 'custom' && startDateParam && endDateParam) {
            startDate = new Date(startDateParam);
            endDate = new Date(endDateParam);
        } else {
            startDate = startOfDay(now);
            endDate = endOfDay(now);
        }

        // Fetch all payments for this business in the date range
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
                        cliente: { select: { nombre: true, email: true } },
                        service: { select: { nombre: true } }
                    }
                }
            },
            orderBy: {
                fecha: 'desc'
            }
        });

        // Filter by cashier if parameter passed
        const filteredPayments = cashierParam
            ? payments.filter(p => (p.Appointment?.extraInfo as any)?.cashier === cashierParam)
            : payments;

        // Financial Metrics Breakdown
        let totalVentas = 0;
        let ingresosManuales = 0;
        let gastos = 0;
        let ventasEfectivo = 0;
        let ventasTarjeta = 0;
        let ventasTransferencia = 0;
        let ventasOtros = 0;

        filteredPayments.forEach(p => {
            const amount = Number(p.monto) || 0;
            const metodo = (p.metodo || 'EFECTIVO').toUpperCase();
            const tipoMov = (p.referencia || '').startsWith('GASTO') ? 'GASTO' 
                : (p.referencia || '').startsWith('INGRESO_MANUAL') ? 'INGRESO_MANUAL' 
                : 'VENTA';

            if (tipoMov === 'GASTO') {
                gastos += amount;
            } else if (tipoMov === 'INGRESO_MANUAL') {
                ingresosManuales += amount;
            } else {
                totalVentas += amount;
                if (metodo.includes('EFECTIVO')) ventasEfectivo += amount;
                else if (metodo.includes('TARJETA')) ventasTarjeta += amount;
                else if (metodo.includes('TRANSF')) ventasTransferencia += amount;
                else ventasOtros += amount;
            }
        });

        // Expected Cash in Register = (Ventas Efectivo + Ingresos Manuales Efectivo) - Gastos
        const totalEsperadoEfectivo = Math.max(0, ventasEfectivo + ingresosManuales - gastos);

        return NextResponse.json({
            success: true,
            filter,
            range: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
            metrics: {
                totalVentas,
                ingresosManuales,
                gastos,
                ventasEfectivo,
                ventasTarjeta,
                ventasTransferencia,
                ventasOtros,
                totalEsperadoEfectivo,
                totalGeneral: totalVentas + ingresosManuales - gastos
            },
            payments: filteredPayments.map(p => ({
                id: p.id,
                monto: p.monto,
                metodo: p.metodo || 'EFECTIVO',
                referencia: p.referencia,
                fecha: p.fecha,
                clienteNombre: p.Appointment?.cliente?.nombre || 'Cliente Presencial',
                servicioNombre: p.Appointment?.service?.nombre || 'Venta POS / Pedido',
                cashier: (p.Appointment?.extraInfo as any)?.cashier || 'Cajero Principal'
            }))
        });
    } catch (error) {
        console.error('Error in finance GET API:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const negocioId = (session.user as any).negocioId;
        const body = await req.json();
        const { action, monto, concepto, metodo = 'EFECTIVO', dineroContado } = body;

        if (!action || !monto) {
            return NextResponse.json({ error: 'Faltan parámetros requeridos (action, monto)' }, { status: 400 });
        }

        // Create virtual appointment container for movement
        const now = new Date();
        const fakeAppt = await prisma.appointment.create({
            data: {
                id: `appt-fin-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                negocioId,
                date: now,
                startTime: now.toISOString().substring(11, 16),
                endTime: now.toISOString().substring(11, 16),
                status: 'COMPLETED',
                extraInfo: {
                    financialMovement: true,
                    movementType: action,
                    cashier: (session.user as any).name || (session.user as any).email || 'Cajero'
                }
            }
        });

        const refCode = action === 'ADD_EXPENSE' ? `GASTO: ${concepto || 'Egreso de caja'}` : `INGRESO_MANUAL: ${concepto || 'Ingreso manual de caja'}`;

        const payment = await prisma.pagoReserva.create({
            data: {
                id: `pago-fin-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                appointmentId: fakeAppt.id,
                monto: parseFloat(monto),
                metodo,
                referencia: refCode,
                fecha: now
            }
        });

        return NextResponse.json({
            success: true,
            movement: payment
        });
    } catch (error) {
        console.error('Error in finance POST API:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
