import prisma from "@/lib/prisma";
import SuperAdminPagosTabs from "./SuperAdminPagosTabs";

export const dynamic = 'force-dynamic';

export default async function SuperAdminPagosPage() {
    // Cargar pagos pendientes directamente desde la base de datos
    const pendingPayments = await (prisma.payment as any).findMany({
        where: { estado_pago: 'pending' },
        include: {
            Negocio: true
        },
        orderBy: { fecha_pago: 'desc' }
    });

    const [plans, addons] = await Promise.all([
        (prisma.plan as any).findMany(),
        (prisma.addon as any).findMany()
    ]);

    const plansMap: Record<string, string> = {};
    plans.forEach((p: any) => { plansMap[p.id] = p.name; });
    addons.forEach((a: any) => {
        plansMap[a.id] = `[ADD-ON] ${a.name}`;
        plansMap[a.code] = `[ADD-ON] ${a.name}`;
        plansMap[`ADDON:${a.id}`] = `[ADD-ON] ${a.name}`;
        plansMap[`ADDON:${a.code}`] = `[ADD-ON] ${a.name}`;
    });

    const enrichedPayments = pendingPayments.map((p: any) => {
        const isAddon = p.plan_id?.startsWith('ADDON:') || Boolean(plansMap[p.plan_id]?.startsWith('[ADD-ON]'));
        return {
            ...p,
            itemType: isAddon ? 'ADDON' : 'PLAN',
            itemName: plansMap[p.plan_id] || p.plan_id
        };
    });

    const serializedPayments = JSON.parse(JSON.stringify(enrichedPayments));

    return (
        <SuperAdminPagosTabs
            initialPayments={serializedPayments}
            plansMap={plansMap}
        />
    );
}

