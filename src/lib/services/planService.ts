import prisma from '../prisma';
import crypto from 'crypto';

/** Precio congelado de por vida para los primeros 25 fundadores */
const FOUNDER_LOCKED_PRICE = 15.0;
/** Cupo máximo de fundadores */
const FOUNDER_MAX = 25;

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

        const startDate = new Date();
        const endDate = new Date();

        const hasTrial = (plan as any).trial_days > 0;
        const estado = hasTrial ? 'trial' : 'activa';

        if (hasTrial) {
            endDate.setDate(startDate.getDate() + (plan as any).trial_days);
        } else {
            endDate.setMonth(startDate.getMonth() + 1);
        }

        // Leer suscripción actual para preservar beneficio de fundador
        const currentSub = await (prisma.suscripcion as any).findUnique({
            where: { negocioId: businessId }
        });

        // El estado de fundador se preserva al cambiar de plan
        const keepFounder = currentSub?.isFounder === true;
        const isFounder = keepFounder;
        const founderPosition = keepFounder ? currentSub.founderPosition : null;
        const lockedPrice = keepFounder ? (currentSub.lockedPrice ?? FOUNDER_LOCKED_PRICE) : null;

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

        const startDate = new Date();
        const endDate = new Date();

        if (activeFoundersCount < FOUNDER_MAX) {
            // ── ASIGNAR COMO FUNDADOR ──
            // Precio activo → 1 mes sin trial
            endDate.setMonth(startDate.getMonth() + 1);

            return await (prisma.suscripcion as any).create({
                data: {
                    id: crypto.randomUUID(),
                    negocioId: businessId,
                    planId: basePlan.id,
                    estado: 'activa',
                    isFounder: true,
                    founderPosition: activeFoundersCount + 1,
                    lockedPrice: FOUNDER_LOCKED_PRICE,
                    fechaInicio: startDate,
                    fechaFin: endDate,
                    renovacion_automatica: true,
                    updatedAt: new Date()
                }
            });
        }

        // ── ASIGNAR PLAN PRO TRIAL ──
        const trialDays = (basePlan as any).trial_days || 14;
        endDate.setDate(startDate.getDate() + trialDays);

        return await (prisma.suscripcion as any).create({
            data: {
                id: crypto.randomUUID(),
                negocioId: businessId,
                planId: basePlan.id,
                estado: 'trial',
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
