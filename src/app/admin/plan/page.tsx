import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { subscriptionService } from "@/lib/services/subscriptionService";
import { Package } from "lucide-react";
import prisma from "@/lib/prisma";
import PlanDashboardClient from "./PlanDashboardClient";

export default async function AdminPlanPage() {
    const session = await getServerSession(authOptions);
    const negocioId = (session?.user as any)?.negocioId;

    if (!negocioId) return <div>No autorizado</div>;

    // Obtener datos del plan, planes disponibles y configuraciones globales
    const [data, allPlans, business, whatsappConfig, discountConfig] = await Promise.all([
        subscriptionService.getSubscriptionDashboardData(negocioId),
        prisma.plan.findMany({
            where: { activo: true, id: { not: 'founder' } },
            orderBy: { price: 'asc' } as any
        }),
        (prisma.negocio as any).findUnique({
            where: { id: negocioId },
            select: {
                id: true,
                nombre: true,
                Suscripcion: {
                    select: { planId: true }
                }
            }
        }),
        (prisma as any).globalConfig.findUnique({
            where: { clave: 'NUMERO_WHATSAPP_ADMIN' }
        }),
        (prisma as any).globalConfig.findUnique({
            where: { clave: 'DESCUENTO_ANUAL_PORCENTAJE' }
        })
    ]);

    const adminWhatsApp = whatsappConfig?.valor || "5491112223334";
    const annualDiscountRaw = discountConfig?.valor || "20";
    const annualDiscount = parseFloat(annualDiscountRaw) / 100; // Convertir 20 a 0.20

    if (!data) {
        return (
            <div className="p-8 text-center bg-white rounded-3xl border border-slate-200">
                <Package className="mx-auto text-slate-300 mb-4" size={48} />
                <h2 className="text-xl font-bold text-slate-900">No se encontró información del plan</h2>
                <p className="text-slate-500">Contacta con soporte si crees que esto es un error.</p>
            </div>
        );
    }

    return (
        <PlanDashboardClient
            data={data}
            allPlans={JSON.parse(JSON.stringify(allPlans))}
            currentPlanId={business?.Suscripcion?.planId}
            businessName={business?.nombre || ''}
            businessId={business?.id || ''}
            adminWhatsApp={adminWhatsApp}
            annualDiscount={annualDiscount}
        />
    );
}
