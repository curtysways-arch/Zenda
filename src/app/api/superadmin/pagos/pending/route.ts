import { NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const session = await getEffectiveAdminSession();
        const user = session?.user as any;
        const role = user?.role;
        const roles = user?.roles || [];
        const isSuper = role === 'SUPERADMIN' || role === 'SUPER_ADMIN' || role === 'ADMIN' || roles.includes('SUPERADMIN') || user?.isAdminUser;
        if (!session || !isSuper) {
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

        const { getLandingDesign } = await import('@/lib/landingDesigns');
        const enrichedPayments = pendingPayments.map(p => {
            if (p.plan_id.startsWith('LANDING:')) {
                const design = getLandingDesign(p.plan_id.slice('LANDING:'.length));
                const label = `[DISEÑO] Página ${design?.nombre || p.plan_id.slice(8)}`;
                plansMap[p.plan_id] = label;
                return { ...p, itemType: 'ADDON', itemName: label };
            }
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
