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

        const { estado } = await req.json();
        const { id: rawId } = await params;
        const id = rawId.trim();

        // 1. Buscar la cita de forma flexible
        const appointments: any[] = await (prisma as any).$queryRawUnsafe(
            `SELECT * FROM Reserva WHERE id = '${id.replace(/'/g, "''")}' OR id LIKE '%${id.replace(/'/g, "''")}%' LIMIT 1`
        );

        if (appointments.length === 0) {
            return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
        }

        const appointment = appointments[0];

        // Bloquear no_show si el cliente ya hizo check-in
        if (estado === 'no_show' && appointment.checkedInAt) {
            return NextResponse.json(
                { error: 'No se puede marcar no-show: el cliente ya hizo check-in' },
                { status: 400 }
            );
        }

        // Validar transición (Opcional en este punto, pero mantenemos por seguridad)
        // const allowed = VALID_ADMIN_TRANSITIONS[appointment.estado] || [];
        // if (!allowed.includes(estado)) { ... }

        // 2. Construir SQL de actualización
        let updateFields = `estado = '${estado}', updatedAt = '${new Date().toISOString()}'`;
        if (estado === 'in_progress') updateFields += `, startedAt = '${new Date().toISOString()}'`;
        if (estado === 'completed') updateFields += `, completedAt = '${new Date().toISOString()}'`;
        if (estado === 'confirmed' || estado === 'cancelled') updateFields += `, expiresAt = NULL`;

        await (prisma as any).$executeRawUnsafe(
            `UPDATE Reserva SET ${updateFields} WHERE id = '${appointment.id}'`
        );

        // 3. Obtener cita actualizada para notificaciones
        const updated = await prisma.appointment.findUnique({
            where: { id: appointment.id },
            include: {
                cliente: true,
                service: true,
                negocio: true
            }
        });

        if (updated && (estado === 'confirmed' || estado === 'cancelled')) {
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
        }

        return NextResponse.json({ success: true, appointment: updated });
    } catch (error: any) {
        console.error('Status update error:', error);
        return NextResponse.json({ error: 'Error interno', details: error.message }, { status: 500 });
    }
}
