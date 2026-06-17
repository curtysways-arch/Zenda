import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: rawId } = await params;
        const id = rawId.trim();
        const body = await req.json();
        const { monto, metodo, referencia, notas } = body;

        if (!monto || isNaN(monto)) {
            return NextResponse.json({ error: 'Monto inválido' }, { status: 400 });
        }

        // 1. Buscar la cita usando Prisma (más seguro que raw queries)
        const appointment = await prisma.appointment.findFirst({
            where: {
                OR: [
                    { id: id },
                    { id: { contains: id } }
                ]
            }
        });

        if (!appointment) {
            return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
        }

        const realId = appointment.id;
        const totalCita = appointment.total || 0;

        // 2. Crear el pago con un ID generado
        const pago = await prisma.pagoReserva.create({
            data: {
                id: crypto.randomUUID(),
                appointmentId: realId,
                monto: parseFloat(monto.toString()),
                metodo: metodo || 'EFECTIVO',
                referencia: referencia || '',
                notas: notas || '',
            }
        });

        // 3. Recalcular estado de pago
        const todosLosPagos = await prisma.pagoReserva.findMany({
            where: { appointmentId: realId }
        });

        const totalPagado = todosLosPagos.reduce((acc, p) => acc + (p.monto || 0), 0);
        
        let nuevoPagoEstado = 'PENDIENTE';
        if (totalPagado >= totalCita) {
            nuevoPagoEstado = 'PAGADO';
        } else if (totalPagado > 0) {
            nuevoPagoEstado = 'PARCIAL';
        }

        // 4. Actualizar la cita usando Prisma
        await prisma.appointment.update({
            where: { id: realId },
            data: {
                pagoEstado: nuevoPagoEstado,
                pagoAnticipo: totalPagado
            }
        });

        return NextResponse.json({ success: true, pago });
    } catch (error: any) {
        console.error('Error creando pago:', error);
        return NextResponse.json({ 
            error: 'Error al procesar pago', 
            details: error.message 
        }, { status: 500 });
    }
}
