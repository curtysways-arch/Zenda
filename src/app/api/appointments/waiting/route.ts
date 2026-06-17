import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const negocioId = (session.user as any).negocioId;
        const role = (session.user as any).role;
        const staffId = (session.user as any).staffId;

        const isStaff = role === 'STAFF' || role === 'PROFESIONAL';

        const waiting = await prisma.appointment.findMany({
            where: {
                negocioId,
                estado: 'client_checked_in',
                ...(isStaff && staffId ? { staffId } : {}),
            },
            include: {
                cliente: { select: { nombre: true, telefono: true } },
                service: { select: { nombre: true } },
                staff: { select: { name: true, avatar: true } },
            },
            orderBy: { checkedInAt: 'asc' },
        });

        const now = new Date();
        const result = waiting.map(a => ({
            id: a.id,
            clienteNombre: a.cliente.nombre,
            clienteTelefono: a.cliente.telefono,
            servicio: a.service.nombre,
            horaInicio: a.horaInicio,
            especialista: a.staff?.name || null,
            especialistaAvatar: a.staff?.avatar || null,
            checkedInAt: a.checkedInAt,
            minutosEsperando: a.checkedInAt
                ? Math.floor((now.getTime() - new Date(a.checkedInAt).getTime()) / 60000)
                : 0,
        }));

        return NextResponse.json(result);
    } catch (error) {
        console.error('Waiting list error:', error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}
