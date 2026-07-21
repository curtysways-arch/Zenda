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
    async assignDefaultPlan(businessId: string) {
        // 1. Contar fundadores activos
        const activeFoundersCount = await (prisma.suscripcion as any).count({
            where: {
                isFounder: true,
                estado: { in: ['active', 'activa', 'ACTIVA'] }
            }
        });

        // 2. Buscar el plan base (PRO o el disponible más relevante)
        let basePlan = await (prisma.plan as any).findFirst({
            where: {
                OR: [
                    { id: 'plan_pro' },
                    { name: { contains: 'PRO' } },
                    { name: { contains: 'Pro' } }
                ],
                activo: true,
                id: { not: 'founder' }
            }
        });

        // Fallback: primer plan activo no-founder
        if (!basePlan) {
            basePlan = await (prisma.plan as any).findFirst({
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

        const business = await (prisma.negocio as any).findUnique({
            where: { id: businessId },
            select: { configuracion: true }
        });
        const timeZone = getBusinessTimeZone(business?.configuracion);

        const { founderLockedPrice, founderMax } = await getFounderConfig();

        if (activeFoundersCount < founderMax) {
            // ── ASIGNAR COMO FUNDADOR ──
            // Precio activo → 1 mes sin trial
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
        if (suscripcion.isFounder && suscripcion.lockedPrice !== null) {
            return suscripcion.lockedPrice;
        }
        return suscripcion.plan?.price ?? 0;
    }
};
