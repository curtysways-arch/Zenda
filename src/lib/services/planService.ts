import prisma from '../prisma';
import crypto from 'crypto';
import { getBusinessTimeZone, getSubscriptionDates } from '@/lib/dateUtils';

export async function getFounderConfig() {
    try {
        const configs = await prisma.globalConfig.findMany({
            where: {
                clave: { in: ['FOUNDER_LOCKED_PRICE', 'FOUNDER_MAX'] }
            }
        });

        const lockedPriceConfig = configs.find(c => c.clave === 'FOUNDER_LOCKED_PRICE');
        const founderMaxConfig = configs.find(c => c.clave === 'FOUNDER_MAX');

        return {
            founderLockedPrice: lockedPriceConfig ? parseFloat(lockedPriceConfig.valor) : 15.0,
            founderMax: founderMaxConfig ? parseInt(founderMaxConfig.valor, 10) : 25
        };
    } catch (_) {
        return {
            founderLockedPrice: 15.0,
            founderMax: 25
        };
    }
}

/**
 * Función canónica universal de cálculo de precio efectivo de suscripción.
 * REGLA: Si lockedPrice !== null, prevalece siempre como precio contractual histórico.
 */
export function getEffectiveSubscriptionPrice(subscription: {
    lockedPrice?: number | null;
    isFounder?: boolean;
    customFeatures?: any;
    Plan?: { price: number } | null;
    plan?: { price: number } | null;
}): number {
    if (subscription?.lockedPrice !== null && subscription?.lockedPrice !== undefined) {
        return Number(subscription.lockedPrice);
    }
    // Soporte para precio especial legado en customFeatures si lockedPrice no fue definido
    if (subscription?.customFeatures) {
        let features = subscription.customFeatures;
        if (typeof features === 'string') {
            try { features = JSON.parse(features); } catch (_) {}
        }
        if (features && typeof features === 'object' && features.specialPrice !== undefined && features.specialPrice !== null) {
            return Number(features.specialPrice);
        }
    }
    const plan = subscription?.Plan || subscription?.plan;
    return plan?.price !== undefined ? Number(plan.price) : 0;
}

export const planService = {
    /**
     * Obtiene todos los planes disponibles (excluye el plan interno 'founder' si existiera)
     */
    async getPlanes() {
        return await prisma.plan.findMany({
            where: { id: { not: 'founder' } },
            orderBy: { price: 'asc' } as any
        });
    },

    /**
     * Crea un nuevo plan
     */
    async createPlan(data: {
        name: string;
        description?: string;
        price: number;
        trial_days: number;
        max_fields: number;
        max_reservations_per_month: number;
        tournaments_enabled: boolean;
        max_locations: number;
    }) {
        return await (prisma.plan as any).create({
            data
        });
    },

    /**
     * Actualiza un plan existente.
     * Si el plan tiene suscripciones fundadoras activas, NO actualiza lockedPrice de esas suscripciones.
     */
    async updatePlan(id: string, data: Partial<{
        name: string;
        description: string;
        price: number;
        trial_days: number;
        max_fields: number;
        max_reservations_per_month: number;
        tournaments_enabled: boolean;
        max_locations: number;
    }>) {
        return await (prisma.plan as any).update({
            where: { id },
            data
        });
    },

    /**
     * Asigna un plan a un negocio (acción de Super Admin).
     * Preserva el beneficio de fundador si el negocio ya lo tenía.
     * NO elimina el estado de fundador al cambiar de plan.
     */
    async assignPlanToBusiness(businessId: string, planId: string) {
        const plan = await prisma.plan.findUnique({ where: { id: planId } });
        if (!plan) throw new Error('Plan no encontrado');

        const business = await (prisma.negocio as any).findUnique({
            where: { id: businessId },
            select: { configuracion: true }
        });
        const timeZone = getBusinessTimeZone(business?.configuracion);

        const hasTrial = (plan as any).trial_days > 0;
        const estado = hasTrial ? 'trial' : 'activa';

        const { startDate, endDate } = getSubscriptionDates(
            timeZone, 
            hasTrial ? { durationDays: (plan as any).trial_days } : { durationMonths: 1 }
        );

        // Leer suscripción actual para preservar beneficio de fundador
        const currentSub = await (prisma.suscripcion as any).findUnique({
            where: { negocioId: businessId }
        });

        // El estado de fundador se preserva al cambiar de plan
        const keepFounder = currentSub?.isFounder === true;
        const isFounder = keepFounder;
        const founderPosition = keepFounder ? currentSub.founderPosition : null;
        const { founderLockedPrice } = await getFounderConfig();
        const lockedPrice = keepFounder ? (currentSub.lockedPrice ?? founderLockedPrice) : null;

        return await (prisma.suscripcion as any).upsert({
            where: { negocioId: businessId },
            create: {
                id: crypto.randomUUID(),
                negocioId: businessId,
                planId: planId,
                estado: estado,
                fechaInicio: startDate,
                fechaFin: endDate,
                trial_inicio: hasTrial ? startDate : null,
                trial_fin: hasTrial ? endDate : null,
                renovacion_automatica: true,
                isFounder,
                founderPosition,
                lockedPrice,
                updatedAt: new Date()
            },
            update: {
                planId: planId,
                estado: estado,
                fechaInicio: startDate,
                fechaFin: endDate,
                trial_inicio: hasTrial ? startDate : null,
                trial_fin: hasTrial ? endDate : null,
                isFounder,
                founderPosition,
                lockedPrice,
                customFeatures: currentSub?.customFeatures,
                updatedAt: new Date()
            }
        });
    },

    /**
     * Proceso de asignación automática de plan para nuevos negocios.
     * - Si existen menos de 25 fundadores activos:
     *     Asigna el plan PRO (o el activo más alto) con isFounder=true y lockedPrice=$15/mes.
     * - Si ya hay 25 o más fundadores activos:
     *     Asigna el plan PRO con trial de 14 días.
     *
     * IMPORTANTE: NO existe un plan separado llamado "Founder".
     * El beneficio de fundador es un flag dentro de Suscripcion.
     */
    async assignDefaultPlan(businessId: string, selectedPlanId?: string) {
        let basePlan: any = null;

        const business = await (prisma.negocio as any).findUnique({
            where: { id: businessId },
            select: { 
                id: true,
                tipoNegocio: true,
                businessTypeId: true,
                configuracion: true 
            }
        });

        // 1. Si se especificó selectedPlanId, buscar directamente dicho plan
        if (selectedPlanId) {
            basePlan = await (prisma.plan as any).findFirst({
                where: {
                    OR: [
                        { id: selectedPlanId },
                        { slug: selectedPlanId },
                        { name: { equals: selectedPlanId } }
                    ],
                    activo: true
                },
                include: {
                    family: {
                        include: {
                            founderProgram: {
                                include: { founderPlan: true }
                            }
                        }
                    }
                }
            });
        }

        // 2. Si no se especificó o no se halló, resolver por PlanFamily según BusinessType o tipoNegocio
        if (!basePlan && business) {
            const whereOr: any[] = [];
            if (business.businessTypeId) {
                whereOr.push({ id: business.businessTypeId });
            }
            if (business.tipoNegocio && business.tipoNegocio.trim() !== '') {
                whereOr.push({ slug: business.tipoNegocio.toLowerCase().trim() });
                whereOr.push({ name: { contains: business.tipoNegocio.trim() } });
            }

            if (whereOr.length > 0) {
                const bType = await (prisma as any).businessType.findFirst({
                    where: { OR: whereOr },
                    include: {
                        planFamily: {
                            include: {
                                founderProgram: {
                                    include: { founderPlan: true }
                                },
                                plans: {
                                    where: { activo: true },
                                    orderBy: { displayOrder: 'asc' }
                                }
                            }
                        }
                    }
                });

                const family = bType?.planFamily;
                const familyPlans = family?.plans || [];
                if (familyPlans.length > 0) {
                    basePlan = familyPlans.find((p: any) => p.isDefault) || familyPlans[0];
                }

                // Si hay programa de fundadores activo en la familia y tiene plan asignado, usarlo como base preferencial
                const familyFounderProgram = family?.founderProgram;
                if (familyFounderProgram?.enabled && familyFounderProgram?.founderPlan) {
                    basePlan = familyFounderProgram.founderPlan;
                }
            }
        }

        // 3. Fallback: plan por defecto o primer plan activo
        if (!basePlan) {
            basePlan = await (prisma.plan as any).findFirst({
                where: {
                    isDefault: true,
                    activo: true,
                    id: { not: 'founder' }
                }
            }) || await (prisma.plan as any).findFirst({
                where: {
                    activo: true,
                    id: { not: 'founder' }
                },
                orderBy: { price: 'asc' }
            });
        }

        if (!basePlan) {
            console.warn('❌ assignDefaultPlan: No se encontró ningún plan activo.');
            return;
        }
        const timeZone = getBusinessTimeZone(business?.configuracion);

        // ── PROGRAMA SOCIO FUNDADOR (POR FAMILIA O GLOBAL ATÓMICO) ──
        // Determinar familia del plan asignado
        const planFamilyId = basePlan.familyId;
        const founderProgram = planFamilyId ? await prisma.founderProgram.findUnique({
            where: { familyId: planFamilyId }
        }) : null;

        // Si la familia tiene FounderProgram explícito
        if (founderProgram && founderProgram.enabled && founderProgram.currentMembers < founderProgram.maxMembers) {
            // Asignación atómica dentro de transacción
            const assignedSub = await prisma.$transaction(async (tx) => {
                // Bloquear/releer programa para evitar condición de carrera
                const prog = await tx.founderProgram.findUnique({
                    where: { id: founderProgram.id }
                });

                if (!prog || !prog.enabled || prog.currentMembers >= prog.maxMembers) {
                    return null;
                }

                // Siguiente posición histórica (nunca se reutiliza)
                const nextPosition = prog.currentMembers + 1;

                // Actualizar contador del programa de fundador
                await tx.founderProgram.update({
                    where: { id: prog.id },
                    data: { currentMembers: nextPosition }
                });

                // Registrar auditoría de asignación
                await tx.planAuditLog.create({
                    data: {
                        who: 'SYSTEM:ASSIGN_DEFAULT_PLAN',
                        what: 'FOUNDER_ASSIGNED',
                        targetType: 'FAMILY',
                        targetId: planFamilyId,
                        newValue: {
                            businessId,
                            position: nextPosition,
                            lockedPrice: prog.founderPrice,
                            planId: basePlan.id
                        },
                        description: `Asignado Socio Fundador #${nextPosition} a negocio ${businessId}`
                    }
                });

                const { startDate, endDate } = getSubscriptionDates(timeZone, { durationMonths: 1 });

                return await tx.suscripcion.create({
                    data: {
                        id: crypto.randomUUID(),
                        negocioId: businessId,
                        planId: basePlan.id,
                        estado: 'activa',
                        isFounder: true,
                        founderPosition: nextPosition,
                        lockedPrice: prog.founderPrice,
                        fechaInicio: startDate,
                        fechaFin: endDate,
                        renovacion_automatica: true,
                        updatedAt: new Date()
                    }
                });
            });

            if (assignedSub) {
                return assignedSub;
            }
        }

        // Fallback: Si no hay FounderProgram por familia, usar la configuración global legacy si aplica
        const { founderLockedPrice, founderMax } = await getFounderConfig();
        const activeFoundersCount = await (prisma.suscripcion as any).count({
            where: {
                isFounder: true,
                estado: { in: ['active', 'activa', 'ACTIVA'] }
            }
        });

        if (activeFoundersCount < founderMax && !founderProgram) {
            const { startDate, endDate } = getSubscriptionDates(timeZone, { durationMonths: 1 });

            return await (prisma.suscripcion as any).create({
                data: {
                    id: crypto.randomUUID(),
                    negocioId: businessId,
                    planId: basePlan.id,
                    estado: 'activa',
                    isFounder: true,
                    founderPosition: activeFoundersCount + 1,
                    lockedPrice: founderLockedPrice,
                    fechaInicio: startDate,
                    fechaFin: endDate,
                    renovacion_automatica: true,
                    updatedAt: new Date()
                }
            });
        }

        // ── ASIGNAR PLAN PRO TRIAL ──
        const trialDays = (basePlan as any).trial_days || 14;
        const { startDate, endDate } = getSubscriptionDates(timeZone, { durationDays: trialDays });

        const features = basePlan.features ? (typeof basePlan.features === 'string' ? JSON.parse(basePlan.features) : basePlan.features) : {};
        const citasActivacion = Number((features as any)?.citas_activacion ?? 1);
        const estadoInicial = citasActivacion > 0 ? 'trial_pending' : 'trial';

        return await (prisma.suscripcion as any).create({
            data: {
                id: crypto.randomUUID(),
                negocioId: businessId,
                planId: basePlan.id,
                estado: estadoInicial,
                isFounder: false,
                founderPosition: null,
                lockedPrice: null,
                fechaInicio: startDate,
                fechaFin: endDate,
                trial_inicio: startDate,
                trial_fin: endDate,
                renovacion_automatica: false,
                updatedAt: new Date()
            }
        });
    },

    /**
     * Verifica si el negocio ha alcanzado las citas requeridas para activar su período de prueba
     */
    async checkAndActivateSubscription(businessId: string) {
        try {
            const sub = await (prisma.suscripcion as any).findUnique({
                where: { negocioId: businessId },
                include: { Plan: true }
            });

            if (!sub || sub.estado !== 'trial_pending') return;

            const plan = sub.Plan;
            const features = plan.features ? (typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features) : {};
            const citasActivacion = Number((features as any)?.citas_activacion ?? 1);

            // Contar citas históricas del negocio (excluyendo canceladas y rechazadas)
            const count = await prisma.appointment.count({
                where: {
                    negocioId: businessId,
                    estado: { notIn: ['rejected', 'RECHAZADA', 'cancelled', 'CANCELADA', 'expired', 'EXPIRADA'] }
                }
            });

            if (count >= citasActivacion) {
                const trialDays = plan.trial_days || 14;
                const now = new Date();
                const fechaFin = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

                await (prisma.suscripcion as any).update({
                    where: { id: sub.id },
                    data: {
                        estado: 'trial',
                        fechaInicio: now,
                        fechaFin: fechaFin,
                        trial_inicio: now,
                        trial_fin: fechaFin,
                        updatedAt: new Date()
                    }
                });
                console.log(`🚀 [SUSCRIPCION] Negocio ${businessId} activado tras alcanzar ${count} citas. Vence el ${fechaFin}`);
            }
        } catch (e) {
            console.error('Error en checkAndActivateSubscription:', e);
        }
    },

    /**
     * Determina el precio a cobrar en una renovación.
     * Si la suscripción es de un fundador activo, usa lockedPrice.
     * De lo contrario, usa el precio actual del plan.
     */
    getEffectivePrice(suscripcion: {
        isFounder: boolean;
        lockedPrice: number | null;
        plan?: { price: number } | null;
    }): number {
        return getEffectiveSubscriptionPrice(suscripcion);
    }
};
