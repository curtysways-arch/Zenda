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

        // 1. Obtener todas las ventas reales creadas en el negocio (POS, Mesas, Landing, Pickup)
        const pedidos = await prisma.pedido.findMany({
            where: {
                negocioId,
                createdAt: {
                    gte: startDate,
                    lte: endDate
                },
                estado: { notIn: ['CANCELADO', 'CANCELLED', 'RECHAZADO'] }
            },
            include: {
                payment: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // 2. Obtener pagos de citas y movimientos manuales de caja (Ingresos / Gastos)
        const payments = await prisma.pagoReserva.findMany({
            where: {
                OR: [
                    { Appointment: { negocioId } },
                    { notas: { contains: negocioId } },
                    { referencia: { contains: 'GASTO' } },
                    { referencia: { contains: 'INGRESO_MANUAL' } }
                ],
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

            const pStatus = (p.paymentStatus || extra.paymentStatus || '').toUpperCase();
            const payEstado = (p.payment?.estado || p.payment?.status || '').toUpperCase();
            const orderEstado = (p.estado || '').toUpperCase();
            const saldoPendiente = extra.saldoPendiente !== undefined ? Number(extra.saldoPendiente) : null;
            const montoPagadoAcumulado = Number(extra.montoPagadoAcumulado || 0);
            const totalOrder = Number(p.total || 0);

            const isPaid = (
                pStatus === 'PAGADO' ||
                pStatus === 'CONFIRMADO' ||
                payEstado === 'CONFIRMADO' ||
                payEstado === 'PAGADO' ||
                payEstado === 'PAID' ||
                orderEstado === 'FINALIZADO' ||
                orderEstado === 'COMPLETADO' ||
                (saldoPendiente !== null && saldoPendiente <= 0) ||
                (montoPagadoAcumulado >= totalOrder && totalOrder > 0)
            );

            let amountPaid = 0;
            if (isPaid) {
                amountPaid = totalOrder;
            } else if (montoPagadoAcumulado > 0) {
                amountPaid = montoPagadoAcumulado;
            }

            if (amountPaid > 0) {
                const metodo = (extra.metodoPago || p.payment?.metodo || p.payment?.method || 'EFECTIVO').toUpperCase();
                totalVentas += amountPaid;

                if (metodo.includes('TARJETA')) ventasTarjeta += amountPaid;
                else if (metodo.includes('TRANSF')) ventasTransferencia += amountPaid;
                else if (metodo.includes('OTRO') || metodo.includes('MIXTO')) ventasOtros += amountPaid;
                else ventasEfectivo += amountPaid;
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
