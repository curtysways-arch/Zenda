import { getEffectiveAdminSession } from "@/lib/delegatedAuth";
import { subscriptionService } from "@/lib/services/subscriptionService";
import prisma from "@/lib/prisma";
import PlanDashboardClient from "./PlanDashboardClient";

export default async function AdminPlanPage() {
    const session = await getEffectiveAdminSession();
    const negocioId = (session?.user as any)?.negocioId;

    if (!negocioId) return <div className="p-8 font-black uppercase text-center text-slate-500">No autorizado</div>;

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
                tipoNegocio: true,
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
    const annualDiscount = parseFloat(annualDiscountRaw) / 100;

    const defaultLimits = {
        staff: { used: 1, max: 10, percentage: 10 },
        appointments: { used: 0, max: 500, percentage: 0 },
        services: { used: 1, max: 20, percentage: 5 },
        locations: { used: 1, max: 2, percentage: 50 }
    };

    const planData = data ? {
        ...data,
        limits: {
            staff: data.limits?.staff || defaultLimits.staff,
            appointments: data.limits?.appointments || defaultLimits.appointments,
            services: data.limits?.services || defaultLimits.services,
            locations: data.limits?.locations || defaultLimits.locations
        }
    } : {
        planName: 'Plan Inicial',
        planStatus: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        lockedPrice: 49,
        interval: 'monthly',
        limits: defaultLimits,
        features: ['Gestión Comercial', 'Órdenes & Ventas', 'Notificaciones WhatsApp', 'Soporte 24/7']
    };

    return (
        <PlanDashboardClient
            data={planData}
            allPlans={JSON.parse(JSON.stringify(allPlans || []))}
            currentPlanId={business?.Suscripcion?.planId}
            businessName={business?.nombre || ''}
            businessId={business?.id || ''}
            tipoNegocio={business?.tipoNegocio || 'GENERAL'}
            adminWhatsApp={adminWhatsApp}
            annualDiscount={annualDiscount}
        />
    );
}
