import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'SUPERADMIN') {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // Obtener pagos pendientes con el negocio asociado
        const pendingPayments = await prisma.payment.findMany({
            where: { estado_pago: 'pending' },
            include: {
                Negocio: true
            },
            orderBy: { fecha_pago: 'desc' }
        });

        // Obtener nombres de planes
        const plans = await prisma.plan.findMany();
        const plansMap = plans.reduce((acc, plan) => {
            acc[plan.id] = plan.name;
            return acc;
        }, {} as Record<string, string>);

        return NextResponse.json({
            payments: pendingPayments,
            plansMap
        });
    } catch (error) {
        console.error('Error fetching pending payments data for superadmin:', error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}
