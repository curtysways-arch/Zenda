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

    const planData = data || {
        planName: 'Plan Pro Canchas & Clubes',
        planStatus: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        lockedPrice: 49,
        interval: 'monthly',
        maxStaff: 10,
        currentStaff: 2,
        maxAppointments: 500,
        appointmentsThisMonth: 15,
        maxLocations: 2,
        currentLocations: 1,
        maxServices: 20,
        currentServices: 3,
        features: ['Canchas Ilimitadas', 'Gestión de Reservas', 'Notificaciones WhatsApp', 'Torneos & Academias']
    };

    return (
        <PlanDashboardClient
            data={planData}
            allPlans={JSON.parse(JSON.stringify(allPlans))}
            currentPlanId={business?.Suscripcion?.planId}
            businessName={business?.nombre || ''}
            businessId={business?.id || ''}
            adminWhatsApp={adminWhatsApp}
            annualDiscount={annualDiscount}
        />
    );
}
