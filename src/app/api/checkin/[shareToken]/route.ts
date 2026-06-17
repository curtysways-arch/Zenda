import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ shareToken: string }> }
) {
    try {
        const { shareToken } = await params;

        const appointment = await prisma.appointment.findUnique({
            where: { shareToken },
            include: {
                cliente: { select: { nombre: true } },
                service: { select: { nombre: true } },
                staff: { select: { name: true, avatar: true } },
                negocio: {
                    select: {
                        nombre: true,
                        slug: true,
                        logoUrl: true,
                        colorPrimario: true,
                    },
                },
            },
        });

        if (!appointment) {
            return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
        }

        return NextResponse.json({
            id: appointment.id,
            shareToken: appointment.shareToken,
            fecha: appointment.fecha,
            horaInicio: appointment.horaInicio,
            horaFin: appointment.horaFin,
            estado: appointment.estado,
            checkedInAt: appointment.checkedInAt,
            servicio: appointment.service.nombre,
            clienteNombre: appointment.cliente.nombre,
            especialista: appointment.staff?.name || null,
            especialistaAvatar: appointment.staff?.avatar || null,
            negocio: appointment.negocio.nombre,
            negocioSlug: appointment.negocio.slug,
            logoUrl: appointment.negocio.logoUrl,
            primaryColor: appointment.negocio.colorPrimario,
        });
    } catch (error) {
        console.error('Check-in page data error:', error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}
