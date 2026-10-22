import prisma from "@/lib/prisma";
import { getTeamContext, visibleBusinessIds } from "@/lib/admin/teamGuard";
import NegociosGrid from "@/components/superadmin/NegociosGrid";

export default async function NegociosPage() {
    // Vendedores con cartera asignada solo ven sus negocios
    const ctx = await getTeamContext();
    const ids = ctx ? await visibleBusinessIds(ctx) : [];
    const negocios = await (prisma.negocio as any).findMany({
        where: ids === null ? undefined : { id: { in: ids } },
        include: {
            Suscripcion: {
                include: { Plan: true }
            },
            Imagen: true,
            _count: {
                select: { Service: true, Appointment: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    const serializedNegocios = JSON.parse(JSON.stringify(negocios));

    return (
        <NegociosGrid initialNegocios={serializedNegocios} />
    );
}
