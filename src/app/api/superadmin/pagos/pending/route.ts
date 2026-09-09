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

        // Obtener nombres de planes y add-ons
        const [plans, addons] = await Promise.all([
            prisma.plan.findMany(),
            prisma.addon.findMany()
        ]);

        const plansMap = plans.reduce((acc, plan) => {
            acc[plan.id] = plan.name;
            return acc;
        }, {} as Record<string, string>);

        const addonsMap = addons.reduce((acc, addon) => {
            acc[addon.id] = addon.name;
            acc[`ADDON:${addon.id}`] = addon.name;
            acc[addon.code] = addon.name;
            acc[`ADDON:${addon.code}`] = addon.name;
            return acc;
        }, {} as Record<string, string>);

        // Asignar en plansMap los add-ons con prefijo claro
        for (const [key, name] of Object.entries(addonsMap)) {
            plansMap[key] = `[ADD-ON] ${name}`;
        }

        const enrichedPayments = pendingPayments.map(p => {
            const isAddon = p.plan_id.startsWith('ADDON:') || Boolean(addonsMap[p.plan_id]);
            return {
                ...p,
                itemType: isAddon ? 'ADDON' : 'PLAN',
                itemName: plansMap[p.plan_id] || p.plan_id
            };
        });

        return NextResponse.json({
            payments: enrichedPayments,
            plansMap
        });
    } catch (error) {
        console.error('Error fetching pending payments data for superadmin:', error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}
