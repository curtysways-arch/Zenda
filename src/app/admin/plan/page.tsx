import { getEffectiveAdminSession } from "@/lib/delegatedAuth";
import { subscriptionService } from "@/lib/services/subscriptionService";
import prisma from "@/lib/prisma";
import PlanDashboardClient from "./PlanDashboardClient";

export default async function AdminPlanPage() {
    const session = await getEffectiveAdminSession();
    const negocioId = (session?.user as any)?.negocioId;

    if (!negocioId) return <div className="p-8 font-black uppercase text-center text-slate-500">No autorizado</div>;

    // Obtener datos del negocio primero para resolver su familia correspondiente
    const [data, business, whatsappConfig, discountConfig] = await Promise.all([
        subscriptionService.getSubscriptionDashboardData(negocioId),
        (prisma.negocio as any).findUnique({
            where: { id: negocioId },
            select: {
                id: true,
                nombre: true,
                slug: true,
                tipoNegocio: true,
                businessTypeId: true,
                BusinessType: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        planFamilyId: true,
                        planFamily: {
                            select: { id: true, name: true, code: true, slug: true }
                        }
                    }
                },
                Suscripcion: {
                    select: {
                        planId: true,
                        Plan: {
                            select: {
                                id: true,
                                name: true,
                                familyId: true
                            }
                        }
                    }
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

    // Resolver la familia de planes: por BusinessType -> planFamilyId, o por el plan actual, o por fallback
    let targetFamilyId = business?.BusinessType?.planFamilyId || business?.Suscripcion?.Plan?.familyId;

    if (!targetFamilyId) {
        // Fallback por tipoNegocio / slug
        const tipoUpper = (business?.tipoNegocio || '').toUpperCase();
        const slugUpper = (business?.slug || '').toUpperCase();
        const nameUpper = (business?.nombre || '').toUpperCase();

        let familyCode = 'SERVICIOS';
        if (tipoUpper === 'RESTAURANTE' || tipoUpper === 'GASTRONOMIA' || tipoUpper === 'PRODUCTOS' || nameUpper.includes('PARRILLA') || nameUpper.includes('PINCHO')) {
            familyCode = 'RESTAURANTE';
        } else if (tipoUpper === 'SPORTS_COURTS' || tipoUpper === 'CANCHAS' || slugUpper.includes('CANCHA')) {
            familyCode = 'CANCHAS';
        } else if (tipoUpper === 'SHOE_CARE' || tipoUpper === 'LAVANDERIA') {
            familyCode = 'LAVANDERIA';
        } else if (tipoUpper === 'TIENDA') {
            familyCode = 'TIENDA';
        }

        const fallbackFam = await prisma.planFamily.findFirst({
            where: { code: familyCode }
        });
        targetFamilyId = fallbackFam?.id;
    }

    // Cargar los planes de la familia con sus entitlements canónicos
    let allPlans = await prisma.plan.findMany({
        where: {
            activo: true,
            id: { not: 'founder' },
            ...(targetFamilyId ? { familyId: targetFamilyId } : {})
        },
        include: {
            planEntitlements: {
                where: { enabled: true },
                include: { module: true }
            },
            planLimits: true
        },
        orderBy: { displayOrder: 'asc' } as any
    });

    // Si por alguna razón la familia no tuviese planes, fallback a planes activos públicos
    if (!allPlans || allPlans.length === 0) {
        allPlans = await prisma.plan.findMany({
            where: { activo: true, id: { not: 'founder' } },
            include: {
                planEntitlements: {
                    where: { enabled: true },
                    include: { module: true }
                },
                planLimits: true
            },
            orderBy: { price: 'asc' } as any
        });
    }

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
