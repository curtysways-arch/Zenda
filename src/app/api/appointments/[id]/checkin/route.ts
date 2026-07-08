import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { notificationService } from '@/lib/notifications';
import { NotificationService } from '@/lib/notifications/notificationService';

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        let shareToken = '';
        
        try {
            const body = await req.json();
            shareToken = body.shareToken;
        } catch (e) {
            // Si no hay body, intentaremos validar por sesión o simplemente fallar si es requerido
        }

        // Buscar la cita con su shareToken
        const appointment = await prisma.appointment.findUnique({
            where: { id },
            include: {
                cliente: { select: { nombre: true, telefono: true } },
                service: { select: { nombre: true } },
                staff: { select: { name: true } },
                negocio: { select: { nombre: true, id: true } },
            },
        });

        if (!appointment) {
            return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
        }

        // Validar shareToken si se provee o si es necesario
        if (shareToken && appointment.shareToken !== shareToken) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        // Validar estado — solo puede hacer check-in si está pending o confirmed
        if (!['pending', 'confirmed'].includes(appointment.estado)) {
            return NextResponse.json(
                { error: `No se puede hacer check-in con estado: ${appointment.estado}` },
                { status: 400 }
            );
        }

        const now = new Date();
        const [h, m] = appointment.horaInicio.split(':').map(Number);
        
        // Construir fecha de forma segura evitando desfases de zona horaria
        const dateObj = new Date(appointment.fecha);
        const year = dateObj.getUTCFullYear();
        const month = dateObj.getUTCMonth();
        const day = dateObj.getUTCDate();
        
        const citaTimestamp = new Date(year, month, day, h, m, 0, 0);

        const diffMs = now.getTime() - citaTimestamp.getTime();
        const diffMin = diffMs / 60000; // positivo = después de la cita (atrasado)

        if (diffMin < -60) {
            return NextResponse.json(
                { error: 'Aún es muy temprano para hacer check-in' },
                { status: 400 }
            );
        }
        if (diffMin > 12 * 60) {
            return NextResponse.json(
                { error: 'La ventana de check-in ha expirado' },
                { status: 400 }
            );
        }

        // Actualizar estado usando extraServices como contenedor (Workaround para cliente Prisma atascado)
        const updated = await prisma.appointment.update({
            where: { id },
            data: {
                estado: 'client_checked_in',
                checkedInAt: new Date(),
            },
            include: {
                cliente: { select: { nombre: true, telefono: true } },
                service: { select: { nombre: true } },
                negocio: { select: { id: true } }
            }
        });

        // Enviar Push Notification al negocio (non-blocking)
        const hora = appointment.horaInicio;
        const clienteNombre = updated.cliente.nombre;
        const servicio = updated.service.nombre;
        const negocioId = updated.negocio.id;

        // Enviar notificación inteligente al negocio (tiempo real + push FCM)
        NotificationService.createNotification({
            negocioId,
            tipo: 'RESERVA',
            categoria: 'RESERVAS',
            titulo: '🚶 Cliente ha llegado',
            descripcion: `${clienteNombre} está esperando para ${servicio} (${hora})`,
            prioridad: 'INFO',
            priority: 'HIGH',
            recipientType: 'ALL',
            actionType: 'VER_RESERVA',
            actionPayload: { screen: 'appointment', appointmentId: id, url: '/admin' },
            channels: ['APP', 'PUSH']
        }).catch(console.error);

        // Enviar WhatsApp al negocio
        notificationService.sendCheckInNotification(
            negocioId,
            clienteNombre,
            servicio,
            hora
        ).catch(console.error);

        return NextResponse.json({ 
            success: true, 
            estado: updated.estado, 
            extraServices: updated.extraServices 
        });
    } catch (error: any) {
        console.error('Check-in error:', error);
        return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
    }
}
