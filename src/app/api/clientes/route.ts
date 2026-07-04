import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const negocioId = (session.user as any).negocioId;

        const clientes = await prisma.cliente.findMany({
            where: { negocioId },
            include: {
                _count: {
                    select: { Appointment: true }
                },
                Appointment: {
                    where: { estado: { in: ['completed', 'finalizada', 'completed', 'finalizada'] } },
                    include: {
                        pagoReserva: true
                    }
                }
            },
            orderBy: { nombre: 'asc' }
        });

        // Calcular el total gastado manualmente sumando únicamente los montos de pagos (pagoReserva) ingresados al finalizar la cita
        const clientesConStats = clientes.map(c => {
            const totalGastado = c.Appointment.reduce((acc: number, app: any) => {
                if (app.pagoReserva && app.pagoReserva.length > 0) {
                    const sumaPagos = app.pagoReserva.reduce((sum: number, p: any) => sum + Number(p.monto), 0);
                    return acc + sumaPagos;
                }
                return acc;
            }, 0);

            return {
                id: c.id,
                nombre: c.nombre,
                telefono: c.telefono,
                email: c.email,
                totalReservas: (c as any)._count.Appointment,
                totalGastado: totalGastado.toFixed(2),
                ratingPromedio: c.ratingPromedio || 0,
                totalReviews: c.totalReviews || 0,
                createdAt: c.createdAt
            };
        });

        const { planLimitValidator } = await import('@/lib/services/planLimitValidator');
        const processedClientes = await planLimitValidator.obfuscateOverLimitClients(negocioId, clientesConStats);

        return NextResponse.json(processedClientes);
    } catch (error) {
        console.error('Error fetching clients:', error);
        return NextResponse.json({ error: 'Error al obtener clientes' }, { status: 500 });
    }
}
