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

        // Helper seguro para parsear fechas de SQLite / ISO
        function parseSafeDate(rawDate: any): Date {
          if (!rawDate) return new Date();
          if (rawDate instanceof Date) return rawDate;
          if (typeof rawDate === 'number') return new Date(rawDate);
          if (typeof rawDate === 'string') {
            const isoString = rawDate.includes(' ') && !rawDate.includes('T') 
              ? rawDate.replace(' ', 'T') 
              : rawDate;
            const parsed = new Date(isoString);
            if (!isNaN(parsed.getTime())) return parsed;
          }
          const fallback = new Date(rawDate);
          return isNaN(fallback.getTime()) ? new Date() : fallback;
        }

        // Helper para obtener YYYY-MM-DD en fecha local
        function toYYYYMMDD(d: Date): string {
          const validDate = parseSafeDate(d);
          const y = validDate.getFullYear();
          const m = String(validDate.getMonth() + 1).padStart(2, '0');
          const day = String(validDate.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}`;
        }

        const todayStr = toYYYYMMDD(now);

        // 1. Obtener todas las ventas reales creadas en el negocio
        const allPedidos = await prisma.pedido.findMany({
            where: {
                negocioId,
                estado: { notIn: ['CANCELADO', 'CANCELLED', 'RECHAZADO'] }
            },
            include: {
                payment: true
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 500
        });

        const isSameCalendarDay = (d1: Date, d2: Date) => {
          return d1.getFullYear() === d2.getFullYear() &&
                 d1.getMonth() === d2.getMonth() &&
                 d1.getDate() === d2.getDate();
        };

        const isSameUTCDay = (d1: Date, d2: Date) => {
          return d1.getUTCFullYear() === d2.getUTCFullYear() &&
                 d1.getUTCMonth() === d2.getUTCMonth() &&
                 d1.getUTCDate() === d2.getUTCDate();
        };

        const pedidos = allPedidos.filter((p: any) => {
            const pDate = parseSafeDate(p.createdAt);
            const uDate = parseSafeDate(p.updatedAt);

            const isTodayCreated = (pDate >= startDate && pDate <= endDate) || 
                                   toYYYYMMDD(pDate) === todayStr || 
                                   isSameCalendarDay(pDate, now) || 
                                   isSameUTCDay(pDate, now);
                                   
            const isTodayUpdated = (uDate >= startDate && uDate <= endDate) || 
                                   toYYYYMMDD(uDate) === todayStr || 
                                   isSameCalendarDay(uDate, now) || 
                                   isSameUTCDay(uDate, now);

            if (filter === 'day') {
                return isTodayCreated || isTodayUpdated;
            } else if (filter === 'week' || filter === 'month' || filter === 'custom') {
                return pDate >= startDate && pDate <= endDate;
            }
            return isTodayCreated || isTodayUpdated;
        });

        // 2. Obtener pagos de citas y movimientos manuales de caja del negocio autenticado
        const allPayments = await prisma.pagoReserva.findMany({
            where: {
                OR: [
                    { Appointment: { negocioId } },
                    { notas: { contains: negocioId } }
                ]
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
            },
            take: 500
        });

        const payments = allPayments.filter((p: any) => {
            const pDate = parseSafeDate(p.fecha);
            const isToday = (pDate >= startDate && pDate <= endDate) || 
                            toYYYYMMDD(pDate) === todayStr || 
                            isSameCalendarDay(pDate, now) || 
                            isSameUTCDay(pDate, now);

            if (filter === 'day') {
                return isToday;
            } else if (filter === 'week' || filter === 'month' || filter === 'custom') {
                return pDate >= startDate && pDate <= endDate;
            }
            return isToday;
        });

        // Filtrar por cajero si se pasa el parámetro
        const filteredPayments = cashierParam
            ? payments.filter(p => p.notas?.includes(cashierParam) || p.referencia?.includes(cashierParam))
            : payments;

        // Desglose de Métricas Financieras Reales
        let totalVentas = 0;
        let ingresosManuales = 0;
        let gastos = 0;
        let ventasEfectivo = 0;
        let ventasTarjeta = 0;
        let ventasTransferencia = 0;
        let ventasOtros = 0;

        // Sumar ventas reales desde Pedidos
        pedidos.forEach((p: any) => {
            let extra: any = {};
            if (typeof p.extraInfo === 'string') {
                try { extra = JSON.parse(p.extraInfo); } catch {}
            } else if (p.extraInfo && typeof p.extraInfo === 'object') {
                extra = p.extraInfo;
            }

            const itemsTotal = (p.items || []).reduce((acc: number, it: any) => acc + (Number(it.precioUnitario) || 0) * (Number(it.cantidad) || 1), 0);
            const totalOrder = Number(p.total) > 0 ? Number(p.total) : itemsTotal;
            const orderEstado = (p.estado || '').toUpperCase();

            // Incluir cualquier pedido que no haya sido cancelado o rechazado
            if (totalOrder > 0 && !['CANCELADO', 'CANCELLED', 'RECHAZADO'].includes(orderEstado)) {
                const metodo = (extra.metodoPago || p.payment?.metodo || p.payment?.method || 'EFECTIVO').toUpperCase();
                totalVentas += totalOrder;

                if (metodo.includes('TARJETA')) ventasTarjeta += totalOrder;
                else if (metodo.includes('TRANSF')) ventasTransferencia += totalOrder;
                else if (metodo.includes('OTRO') || metodo.includes('MIXTO')) ventasOtros += totalOrder;
                else ventasEfectivo += totalOrder;
            }
        });

        // Sumar movimientos manuales (Ingresos / Gastos / Citas)
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

        // Total Esperado en Gaveta = (Ventas Efectivo + Ingresos Manuales) - Gastos
        const totalEsperadoEfectivo = Math.max(0, ventasEfectivo + ingresosManuales - gastos);

        // Lista unificada para el historial de transacciones
        const allTransactions = [
            ...pedidos.map((p: any) => {
                let extra: any = {};
                if (typeof p.extraInfo === 'string') {
                    try { extra = JSON.parse(p.extraInfo); } catch {}
                } else if (p.extraInfo && typeof p.extraInfo === 'object') {
                    extra = p.extraInfo;
                }
                return {
                    id: p.id,
                    monto: p.total,
                    metodo: (extra.metodoPago || p.payment?.metodo || 'EFECTIVO').toUpperCase(),
                    referencia: `VENTA #${p.numeroPedido} (${p.tipoEntrega || 'POS'})`,
                    fecha: p.createdAt,
                    clienteNombre: p.nombreCliente || 'Cliente POS',
                    servicioNombre: `Venta Directa (${p.items?.length || 0} prod)`,
                    cashier: 'Cajero Principal'
                };
            }),
            ...filteredPayments.map(p => ({
                id: p.id,
                monto: p.monto,
                metodo: p.metodo || 'EFECTIVO',
                referencia: p.referencia,
                fecha: p.fecha,
                clienteNombre: p.Appointment?.cliente?.nombre || 'Caja Central',
                servicioNombre: (p.referencia || '').startsWith('GASTO') ? 'Egreso / Gasto' : (p.referencia || '').startsWith('INGRESO_MANUAL') ? 'Ingreso Manual' : 'Pago Cita',
                cashier: 'Cajero Principal'
            }))
        ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

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
            payments: allTransactions
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
        const { action, monto, concepto, metodo = 'EFECTIVO' } = body;

        if (!action || !monto) {
            return NextResponse.json({ error: 'Faltan parámetros requeridos (action, monto)' }, { status: 400 });
        }

        const now = new Date();
        const cashierName = (session.user as any).name || (session.user as any).email || 'Cajero';
        const refCode = action === 'ADD_EXPENSE' ? `GASTO: ${concepto || 'Egreso de caja'}` : `INGRESO_MANUAL: ${concepto || 'Ingreso manual de caja'}`;

        // Garantizar o buscar cita/servicio/cliente base para el negocio
        let apptId: string | null = null;
        const existingAppt = await prisma.appointment.findFirst({
            where: { negocioId },
            select: { id: true }
        });

        if (existingAppt) {
            apptId = existingAppt.id;
        } else {
            let service = await prisma.service.findFirst({ where: { negocioId }, select: { id: true } });
            if (!service) {
                service = await prisma.service.create({
                    data: {
                        id: `serv-fin-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                        negocioId,
                        nombre: 'Caja & Finanzas General',
                        precio: 0,
                        duracion: 30,
                        updatedAt: now
                    },
                    select: { id: true }
                });
            }

            let cliente = await prisma.cliente.findFirst({ where: { negocioId }, select: { id: true } });
            if (!cliente) {
                cliente = await prisma.cliente.create({
                    data: {
                        id: `cli-fin-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                        negocioId,
                        nombre: 'Caja Central / Movimientos Manuales',
                        telefono: '0000000000',
                        updatedAt: now
                    },
                    select: { id: true }
                });
            }

            const fakeAppt = await prisma.appointment.create({
                data: {
                    id: `appt-fin-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                    negocioId,
                    clienteId: cliente.id,
                    serviceId: service.id,
                    fecha: now,
                    horaInicio: now.toISOString().substring(11, 16),
                    horaFin: now.toISOString().substring(11, 16),
                    estado: 'COMPLETED',
                    total: parseFloat(monto),
                    updatedAt: now
                }
            });
            apptId = fakeAppt.id;
        }

        const payment = await prisma.pagoReserva.create({
            data: {
                id: `pago-fin-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                appointmentId: apptId,
                monto: parseFloat(monto),
                metodo,
                referencia: refCode,
                notas: `Registrado por: ${cashierName} [Negocio: ${negocioId}]`,
                fecha: now
            }
        });

        return NextResponse.json({
            success: true,
            movement: payment
        });
    } catch (error: any) {
        console.error('Error in finance POST API:', error);
        return NextResponse.json({ error: error?.message || 'Error interno registrando movimiento' }, { status: 500 });
    }
}
