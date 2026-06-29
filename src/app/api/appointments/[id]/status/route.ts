import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { notificationService } from '@/lib/notifications';

const VALID_ADMIN_TRANSITIONS: Record<string, string[]> = {
    pending: ['confirmed', 'cancelled', 'no_show'],
    confirmed: ['in_progress', 'no_show', 'cancelled'],
    client_checked_in: ['in_progress', 'cancelled'],
    in_progress: ['completed', 'cancelled'],
    completed: [],
    no_show: [],
    cancelled: [],
};

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { estado, montoCobrado } = await req.json();
        const { id: rawId } = await params;
        const id = rawId.trim();

        // 1. Buscar la cita de forma flexible con Prisma ORM
        let appointment = await prisma.appointment.findUnique({
            where: { id }
        });

        if (!appointment) {
            appointment = await prisma.appointment.findFirst({
                where: {
                    id: {
                        contains: id
                    }
                }
            });
        }

        if (!appointment) {
            return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
        }

        // Bloquear no_show si el cliente ya hizo check-in
        if (estado === 'no_show' && appointment.checkedInAt) {
            return NextResponse.json(
                { error: 'No se puede marcar no-show: el cliente ya hizo check-in' },
                { status: 400 }
            );
        }

        // 2. Construir datos de actualización
        const updateData: any = {
            estado,
            updatedAt: new Date()
        };
        if (estado === 'in_progress') updateData.startedAt = new Date();
        if (estado === 'completed') updateData.completedAt = new Date();
        if (estado === 'confirmed' || estado === 'cancelled') updateData.expiresAt = null;

        await prisma.appointment.update({
            where: { id: appointment.id },
            data: updateData
        });

        // Registrar/actualizar pago de la reserva si se finaliza y se pasa el monto
        if (estado === 'completed' && typeof montoCobrado === 'number' && montoCobrado > 0) {
            const pagoExistente = await prisma.pagoReserva.findFirst({
                where: { appointmentId: appointment.id }
            });

            if (pagoExistente) {
                await prisma.pagoReserva.update({
                    where: { id: pagoExistente.id },
                    data: {
                        monto: montoCobrado
                    }
                });
            } else {
                const crypto = require('crypto');
                await prisma.pagoReserva.create({
                    data: {
                        id: crypto.randomUUID(),
                        appointmentId: appointment.id,
                        monto: montoCobrado,
                        metodo: 'EFECTIVO',
                        fecha: new Date(),
                        notas: 'Registrado automáticamente al finalizar cita'
                    }
                });
            }
        }

        // 3. Obtener cita actualizada para notificaciones (incluyendo staff)
        const updated = await prisma.appointment.findUnique({
            where: { id: appointment.id },
            include: {
                cliente: true,
                service: true,
                negocio: true,
                staff: true
            }
        });

        if (updated) {
            if (estado === 'confirmed' || estado === 'cancelled') {
                try {
                    const isConfirmed = estado === 'confirmed';
                    await notificationService.sendBookingConfirmation(
                        updated.negocioId,
                        updated.cliente.nombre,
                        updated.cliente.telefono,
                        updated.fecha,
                        updated.horaInicio,
                        updated.negocio.nombre,
                        updated.service.nombre,
                        updated.duracion,
                        isConfirmed,
                        updated.negocio.direccion || '',
                        '', // mapUrl
                        updated.id,
                        updated.comentarios || ''
                    );
                } catch (notifyError) {
                    console.error('Error enviando notificación de estado:', notifyError);
                }
            } else if (estado === 'completed') {
                try {
                    await notificationService.sendAppointmentCompletedNotification(
                        updated.negocioId,
                        updated.cliente.nombre,
                        updated.cliente.telefono,
                        updated.negocio.nombre,
                        updated.service.nombre,
                        updated.staff?.name || 'nuestro profesional',
                        updated.id,
                        updated.negocio.slug
                    );
                } catch (notifyError) {
                    console.error('Error enviando notificación de cita finalizada:', notifyError);
                }
            }
        }

        return NextResponse.json({ success: true, appointment: updated });
    } catch (error: any) {
        console.error('Status update error:', error);
        return NextResponse.json({ error: 'Error interno', details: error.message }, { status: 500 });
    }
}
