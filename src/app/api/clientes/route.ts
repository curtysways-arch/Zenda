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
                    where: { estado: { in: ['confirmed', 'CONFIRMADA'] } },
                    select: { total: true }
                }
            },
            orderBy: { nombre: 'asc' }
        });

        // Calcular el total gastado manualmente ya que Prisma _sum en relación anidada es complejo sin raw query
        const clientesConStats = clientes.map(c => {
            const totalGastado = (c as any).Appointment.reduce((acc: number, current: any) => acc + Number(current.total), 0);
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

        return NextResponse.json(clientesConStats);
    } catch (error) {
        console.error('Error fetching clients:', error);
        return NextResponse.json({ error: 'Error al obtener clientes' }, { status: 500 });
    }
}
