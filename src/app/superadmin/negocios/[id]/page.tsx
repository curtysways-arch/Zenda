import prisma from "@/lib/prisma";
import { getTeamContext, canAccessBusinessId } from "@/lib/admin/teamGuard";
import { notFound } from "next/navigation";
import BusinessDetailClient from "./BusinessDetailClient";
import { plansForBusiness } from "@/lib/superadmin/plansForBusiness";

export default async function BusinessDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const ctx = await getTeamContext();
    if (!ctx || !(await canAccessBusinessId(ctx, id))) notFound();

    const negocio = await (prisma.negocio as any).findUnique({
        where: { id },
        include: {
            Suscripcion: { include: { Plan: true } },
            SubscriptionHistory: {
                include: {
                    Plan_SubscriptionHistory_plan_anterior_idToPlan: true,
                    Plan_SubscriptionHistory_plan_nuevo_idToPlan: true
                },
                orderBy: { fecha_cambio: 'desc' }
            },
            Payment: { orderBy: { fecha_pago: 'desc' } },
            Usuario: {
                select: { id: true, nombre: true, email: true, phone: true, role: true, createdAt: true }
            },
            _count: {
                select: { Service: true, Appointment: true, Usuario: true, Ubicacion: true }
            }
        }
    });

    if (!negocio) notFound();

    // Solo los planes que corresponden al tipo de este negocio (familia de planes del tipo)
    const planesInfo = await plansForBusiness(id);

    // Plan pedido en una solicitud pendiente (puede no estar en la lista filtrada)
    const solicitudPlanId = negocio.Suscripcion?.solicitudPlanId;
    const planSolicitado = solicitudPlanId
        ? await prisma.plan.findUnique({ where: { id: solicitudPlanId }, select: { id: true, name: true, price: true } })
        : null;

    return (
        <BusinessDetailClient
            negocio={JSON.parse(JSON.stringify(negocio))}
            planes={JSON.parse(JSON.stringify(planesInfo.plans))}
            familia={planesInfo.familia}
            tipo={planesInfo.tipo}
            origenPlanes={planesInfo.origen}
            planSolicitado={planSolicitado ? JSON.parse(JSON.stringify(planSolicitado)) : null}
        />
    );
}
