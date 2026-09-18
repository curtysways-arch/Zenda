// src/app/api/appointments/[id]/pagos/route.ts
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getEffectiveAdminSession();
        if (!session || !session.user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const { id: rawId } = await params;
        const id = rawId.trim();

        const appointment = await prisma.appointment.findFirst({
            where: {
                OR: [{ id }, { id: { contains: id } }]
            },
            include: {
                pagoReserva: {
                    orderBy: { fecha: 'desc' }
                }
            }
        });

        if (!appointment) {
            return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
        }

        const sessionNegocioId = (session.user as any).negocioId;
        const userRole = ((session.user as any).role || '').toUpperCase();
        const isSuperAdmin = userRole === 'SUPERADMIN' || (session.user as any).roles?.includes('SUPERADMIN');

        if (!isSuperAdmin && sessionNegocioId !== appointment.negocioId) {
            return NextResponse.json({ error: 'Acceso no autorizado a esta reserva' }, { status: 403 });
        }

        const total = appointment.total || 0;
        const pagos = appointment.pagoReserva || [];
        const pagado = pagos.reduce((acc, p) => acc + (p.monto || 0), 0);
        const pendiente = Math.max(0, Math.round((total - pagado) * 100) / 100);

        return NextResponse.json({
            success: true,
            total,
            pagado,
            pendiente,
            pagoEstado: appointment.pagoEstado,
            pagos
        });
    } catch (error: any) {
        console.error('Error obteniendo pagos de reserva:', error);
        return NextResponse.json({ error: 'Error al consultar pagos' }, { status: 500 });
    }
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getEffectiveAdminSession();
        if (!session || !session.user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const { id: rawId } = await params;
        const id = rawId.trim();
        const body = await req.json();
        const { monto, metodo, referencia, notas } = body;

        const montoNum = parseFloat(monto);
        if (isNaN(montoNum) || montoNum <= 0) {
            return NextResponse.json({ error: 'Monto inválido. Debe ser un número mayor a 0.' }, { status: 400 });
        }

        // 1. Buscar la cita
        const appointment = await prisma.appointment.findFirst({
            where: {
                OR: [{ id }, { id: { contains: id } }]
            }
        });

        if (!appointment) {
            return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
        }

        const sessionNegocioId = (session.user as any).negocioId;
        const userRole = ((session.user as any).role || '').toUpperCase();
        const isSuperAdmin = userRole === 'SUPERADMIN' || (session.user as any).roles?.includes('SUPERADMIN');

        if (!isSuperAdmin && sessionNegocioId !== appointment.negocioId) {
            return NextResponse.json({ error: 'Acceso denegado a este recurso' }, { status: 403 });
        }

        const realId = appointment.id;
        const totalCita = appointment.total || 0;

        // 2. Crear el pago en PagoReserva
        const pago = await prisma.pagoReserva.create({
            data: {
                id: crypto.randomUUID(),
                appointmentId: realId,
                monto: montoNum,
                metodo: metodo || 'EFECTIVO',
                referencia: referencia ? referencia.trim() : null,
                notas: notas ? notas.trim() : null,
                fecha: new Date(),
            }
        });

        // 3. Recalcular estado de pago
        const todosLosPagos = await prisma.pagoReserva.findMany({
            where: { appointmentId: realId }
        });

        const totalPagado = Math.round(todosLosPagos.reduce((acc, p) => acc + (p.monto || 0), 0) * 100) / 100;
        
        let nuevoPagoEstado = 'PENDIENTE';
        if (totalPagado >= totalCita) {
            nuevoPagoEstado = 'PAGADO';
        } else if (totalPagado > 0) {
            nuevoPagoEstado = 'PARCIAL';
        }

        const saldoPendiente = Math.max(0, Math.round((totalCita - totalPagado) * 100) / 100);

        // 4. Actualizar la cita
        const updated = await prisma.appointment.update({
            where: { id: realId },
            data: {
                pagoEstado: nuevoPagoEstado,
                pagoAnticipo: totalPagado,
                updatedAt: new Date()
            }
        });

        // 5. Auditoría
        try {
            await prisma.adminAuditLog.create({
                data: {
                    id: crypto.randomUUID(),
                    adminUserId: (session.user as any).id,
                    accion: 'PAYMENT_REGISTERED',
                    modulo: 'SPORTS_COURTS',
                    targetId: realId,
                    targetType: 'Appointment',
                    descripcion: `Pago registrado de $${montoNum} (${metodo || 'EFECTIVO'}). Nuevo saldo pendiente: $${saldoPendiente}`,
                    datosAntes: JSON.stringify({ pagoEstado: appointment.pagoEstado, pagadoAnterior: appointment.pagoAnticipo }),
                    datosDespues: JSON.stringify({ nuevoPagoEstado, totalPagado, saldoPendiente, pagoId: pago.id }),
                    resultado: 'EXITOSO'
                }
            });
        } catch (auditErr) {
            console.error('[AdminAuditLog] Error guardando auditoría de pago:', auditErr);
        }

        return NextResponse.json({
            success: true,
            pago,
            total: totalCita,
            pagado: totalPagado,
            pendiente: saldoPendiente,
            pagoEstado: nuevoPagoEstado
        });
    } catch (error: any) {
        console.error('Error creando pago:', error);
        return NextResponse.json({ 
            error: 'Error al procesar pago', 
            details: error.message 
        }, { status: 500 });
    }
}
