import prisma from '../prisma';
import crypto from 'crypto';
import { getBusinessTimeZone, getSubscriptionDates } from '@/lib/dateUtils';
import { TRIAL_DAYS, addDays } from '@/lib/subscription/lifecycle';

// Re-exportar el motor canónico de precios para que el resto del sistema
// pueda importarlo desde planService (retrocompatibilidad) o desde pricingService.
export { pricingService } from '@/lib/services/pricingService';
export type {
  EffectiveSubscriptionPriceResult,
  EffectivePriceSource,
  ApplyNegotiatedPriceParams,
} from '@/lib/services/pricingService';

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
            founderLockedPrice: lockedPriceConfig ? parseFloat(lockedPriceConfig.valor) : 9.99,
            founderMax: founderMaxConfig ? parseInt(founderMaxConfig.valor, 10) : 25
        };
    } catch (_) {
        return {
            founderLockedPrice: 9.99,
            founderMax: 25
        };
    }
}

/**
 * Precio mensual efectivo — misma precedencia que pricingService:
 *   1. Precio negociado vigente (temporal o permanente).
 *   2. Precio de Socio Fundador de por vida (lockedPrice).
 *   3. Precio del plan.
 * Cuando un precio negociado TEMPORAL termina, vuelve al de fundador o al del plan.
 */
export function getEffectiveSubscriptionPrice(subscription: {
    lockedPrice?: number | null;
    isFounder?: boolean;
    customFeatures?: any;
    Plan?: { price: number } | null;
    plan?: { price: number } | null;
    pricingOverrides?: any[] | null;
}): number {
    const now = new Date();
    const override = (subscription?.pricingOverrides || []).find((o: any) => {
        if (!o || o.status !== 'ACTIVE') return false;
        if (o.type === 'PERMANENT') return true;
        if (o.endAt) return new Date(o.endAt) > now;
        return o.totalCycles == null || Number(o.currentCycle || 1) <= Number(o.totalCycles);
    });
    if (override) return Number(override.amount);
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

export interface SubscriptionPricingDetails {
    subscriptionId: string;
    basePlanPrice: number;
    isFounder: boolean;
    lockedPrice: number | null;
    planName: string;
    addons: Array<{
        id: string;
        code: string;
        name: string;
        quantity: number;
        priceContracted: number;
        subtotal: number;
        cancelAtPeriodEnd: boolean;
        effectiveUntil: Date | null;
        status: string;
    }>;
    addonsTotal: number;
    effectiveTotalMonthly: number;
}

/**
 * Obtiene el desglose financiero consolidado canónico de una suscripción:
 * Plan base (respetando lockedPrice de Fundadores) + Add-ons activos contratados.
 * NUNCA suma ni muta lockedPrice en la base de datos.
 */
export async function getEffectiveSubscriptionPricingDetails(subscriptionId: string): Promise<SubscriptionPricingDetails | null> {
    const sub = await prisma.suscripcion.findUnique({
        where: { id: subscriptionId },
        include: {
            Plan: true,
            pricingOverrides: { where: { status: 'ACTIVE' }, orderBy: { createdAt: 'desc' } },
            subscriptionAddons: {
                include: {
                    addon: true
                }
            }
        }
    });

    if (!sub) return null;

    const basePrice = getEffectiveSubscriptionPrice(sub);
    const now = new Date();

    const activeAddons = (sub.subscriptionAddons || []).filter(sa => {
        if (sa.status === 'ACTIVE') return true;
        if (sa.cancelAtPeriodEnd && sa.effectiveUntil && new Date(sa.effectiveUntil) > now) return true;
        return false;
    });

    const addonsBreakdown = activeAddons.map(sa => {
        const price = Number(sa.priceContracted);
        const qty = Number(sa.quantity || 1);
        return {
            id: sa.id,
            code: sa.addon.code,
            name: sa.addon.name,
            quantity: qty,
            priceContracted: price,
            subtotal: price * qty,
            cancelAtPeriodEnd: sa.cancelAtPeriodEnd,
            effectiveUntil: sa.effectiveUntil,
            status: sa.status
        };
    });

    const addonsTotal = addonsBreakdown.reduce((sum, item) => sum + item.subtotal, 0);

    return {
        subscriptionId: sub.id,
        basePlanPrice: basePrice,
        isFounder: Boolean(sub.isFounder),
        lockedPrice: sub.lockedPrice !== null && sub.lockedPrice !== undefined ? Number(sub.lockedPrice) : null,
        planName: sub.Plan?.name || 'Plan',
        addons: addonsBreakdown,
        addonsTotal,
        effectiveTotalMonthly: basePrice + addonsTotal
    };
}

export const planService = {
    /**
     * Obtiene todos los planes disponibles (excluye el plan interno 'founder' si existiera)
     */
    async getPlanes() {
        return await prisma.plan.findMany({
            where: { id: { not: 'founder' }, isFree: false },
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

        const currentSub = await (prisma.suscripcion as any).findUnique({ where: { negocioId: businessId } });

        // Cambiar de plan NO reinicia la prueba ni regala tiempo: conserva estado y fechas,
        // y también el beneficio de fundador y los precios negociados.
        if (currentSub) {
            return await (prisma.suscripcion as any).update({
                where: { negocioId: businessId },
                data: { planId, updatedAt: new Date() }
            });
        }

        // Negocio sin suscripción: empieza con la prueba estándar de 30 días
        const now = new Date();
        const end = addDays(now, TRIAL_DAYS);
        return await (prisma.suscripcion as any).create({
            data: {
                id: crypto.randomUUID(),
                negocioId: businessId,
                planId,
                estado: 'trial',
                fechaInicio: now,
                fechaFin: end,
                trial_inicio: now,
                trial_fin: end,
                renovacion_automatica: false,
                isFounder: false,
                founderPosition: null,
                lockedPrice: null,
                updatedAt: now
            }
        });
    },

    /**
     * El superadmin marca a un negocio como Socio Fundador a mano (por ejemplo, ya pagó por fuera).
     * Usa el programa de fundadores de SU tipo de negocio: consume un cupo y toma su precio,
     * salvo que se indique un precio especial.
     */
    /** Quita el beneficio de fundador y libera su cupo para otro negocio del mismo tipo. */
    async removeFounder(businessId: string) {
        const sub = await (prisma.suscripcion as any).findUnique({
            where: { negocioId: businessId },
            include: { Plan: { include: { family: { include: { founderProgram: true } } } } }
        });
        if (!sub?.isFounder) return;
        const prog = sub.Plan?.family?.founderProgram;
        await prisma.$transaction(async (tx) => {
            await (tx.suscripcion as any).update({ where: { id: sub.id }, data: { isFounder: false, founderPosition: null, lockedPrice: null, updatedAt: new Date() } });
            if (prog && prog.currentMembers > 0) {
                await tx.founderProgram.update({ where: { id: prog.id }, data: { currentMembers: prog.currentMembers - 1 } });
            }
        });
    },

    async grantFounderManually(businessId: string, customPrice?: number | null, performedBy = 'SUPERADMIN') {
        const sub = await (prisma.suscripcion as any).findUnique({
            where: { negocioId: businessId },
            include: { Plan: { include: { family: { include: { founderProgram: true } } } } }
        });
        if (!sub) return { ok: false as const, error: 'El negocio no tiene suscripción' };
        if (sub.isFounder) return { ok: true as const, position: sub.founderPosition, lockedPrice: sub.lockedPrice };

        const program = sub.Plan?.family?.founderProgram;
        if (!program?.enabled) return { ok: false as const, error: 'El tipo de negocio no tiene programa de Socios Fundadores activo' };

        return await prisma.$transaction(async (tx) => {
            const prog = await tx.founderProgram.findUnique({ where: { id: program.id } });
            if (!prog || prog.currentMembers >= prog.maxMembers) {
                return { ok: false as const, error: `Ya se ocuparon los ${prog?.maxMembers ?? 0} cupos de fundador de este tipo de negocio` };
            }
            const position = prog.currentMembers + 1;
            const lockedPrice = customPrice !== undefined && customPrice !== null && !isNaN(Number(customPrice)) ? Number(customPrice) : prog.founderPrice;
            await tx.founderProgram.update({ where: { id: prog.id }, data: { currentMembers: position } });
            const custom = (sub.customFeatures && typeof sub.customFeatures === 'object') ? sub.customFeatures : {};
            await (tx.suscripcion as any).update({
                where: { id: sub.id },
                data: {
                    isFounder: true,
                    founderPosition: position,
                    lockedPrice,
                    customFeatures: { ...custom, founderCandidate: false, founderConfirmed: true, founderActivatedAt: new Date().toISOString(), founderGrantedBy: performedBy },
                    updatedAt: new Date()
                }
            });
            return { ok: true as const, position, lockedPrice };
        });
    },

    /**
     * Plan inicial de un negocio que se registra desde la web (o que crea un vendedor/superadmin).
     *
     * Regla única de Citiox:
     *  - Plan predeterminado de su tipo de negocio (familia de planes).
     *  - 30 días de prueba COMPLETA desde el registro (TRIAL_DAYS).
     *  - Si su tipo de negocio tiene programa de Socios Fundadores con cupos libres, queda como
     *    CANDIDATO: el cupo y el precio de por vida ($9.99 o lo que fije el programa) se confirman
     *    al aprobarse su primer pago, venga de la pantalla que venga.
     *  - Nadie se vuelve fundador ni queda "activo" sin pagar.
     * Si el negocio ya tiene suscripción no se toca nada.
     */
    async assignDefaultPlan(businessId: string, selectedPlanId?: string) {
        const existingSub = await prisma.suscripcion.findUnique({ where: { negocioId: businessId } });
        if (existingSub) return existingSub;

        const business = await (prisma.negocio as any).findUnique({
            where: { id: businessId },
            select: { id: true, tipoNegocio: true, businessTypeId: true, configuracion: true }
        });

        // 1. Familia de planes según el tipo de negocio
        let family: any = null;
        if (business) {
            const whereOr: any[] = [];
            if (business.businessTypeId) whereOr.push({ id: business.businessTypeId });
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
                                founderProgram: { include: { founderPlan: true } },
                                plans: { where: { activo: true }, orderBy: { displayOrder: 'asc' } }
                            }
                        }
                    }
                });
                family = bType?.planFamily || null;
            }
        }

        // 2. Plan: el elegido (si existe) o el predeterminado de la familia
        let basePlan: any = null;
        if (selectedPlanId) {
            basePlan = await (prisma.plan as any).findFirst({
                where: { OR: [{ id: selectedPlanId }, { slug: selectedPlanId }, { name: { equals: selectedPlanId } }], activo: true }
            });
        }
        const program = family?.founderProgram;
        const founderSeatsLeft = Boolean(program?.enabled && program.currentMembers < program.maxMembers);
        if (!basePlan && family) {
            const familyPlans = (family.plans || []).filter((p: any) => !p.isFree);
            basePlan = (founderSeatsLeft && program?.founderPlan) || familyPlans.find((p: any) => p.isDefault) || familyPlans[0] || null;
        }
        if (!basePlan) {
            basePlan = await (prisma.plan as any).findFirst({ where: { isDefault: true, activo: true, isFree: false, id: { not: 'founder' } } })
                || await (prisma.plan as any).findFirst({ where: { activo: true, isFree: false, id: { not: 'founder' } }, orderBy: { price: 'asc' } });
        }
        if (!basePlan) {
            console.warn('[planService] assignDefaultPlan: no hay planes activos.');
            return;
        }

        // 3. Prueba de 30 días desde hoy
        const now = new Date();
        const trialEnd = addDays(now, TRIAL_DAYS);

        return await (prisma.suscripcion as any).create({
            data: {
                id: crypto.randomUUID(),
                negocioId: businessId,
                planId: basePlan.id,
                estado: 'trial',
                pagoPendiente: false,
                isFounder: false,
                founderPosition: null,
                lockedPrice: null,
                customFeatures: founderSeatsLeft
                    ? { founderCandidate: true, founderReservedPrice: program.founderPrice, familyId: family.id }
                    : {},
                fechaInicio: now,
                fechaFin: trialEnd,
                trial_inicio: now,
                trial_fin: trialEnd,
                renovacion_automatica: false,
                updatedAt: now
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
    },

    getPricingDetails(subscriptionId: string) {
        return getEffectiveSubscriptionPricingDetails(subscriptionId);
    },

    /**
     * Activa formalmente la condición de Socio Fundador tras confirmar el pago de los primeros $10.
     * Valida atómicamente la disponibilidad de cupo en el FounderProgram de la familia.
     */
    async activateFounderOnPayment(businessId: string, paidAmount: number, performedBy: string = 'SYSTEM', opts: { keepDates?: boolean } = {}) {
        const sub = await (prisma.suscripcion as any).findUnique({
            where: { negocioId: businessId },
            include: {
                Plan: {
                    include: {
                        family: {
                            include: { founderProgram: true }
                        }
                    }
                }
            }
        });

        if (!sub) return { success: false, reason: 'Suscripción no encontrada' };

        // Si ya es fundador, preservar sin recalcular ni duplicar cupo
        if (sub.isFounder) {
            return {
                success: true,
                isFounder: true,
                founderPosition: sub.founderPosition,
                lockedPrice: sub.lockedPrice,
                alreadyFounder: true
            };
        }

        const family = sub.Plan?.family;
        const founderProgram = family?.founderProgram;

        if (!founderProgram || !founderProgram.enabled) {
            return { success: false, reason: 'No hay programa de fundadores activo para esta familia de planes' };
        }

        return await prisma.$transaction(async (tx) => {
            // Bloquear y releer programa para evitar condiciones de carrera
            const prog = await tx.founderProgram.findUnique({
                where: { id: founderProgram.id }
            });

            if (!prog || !prog.enabled || prog.currentMembers >= prog.maxMembers) {
                return {
                    success: false,
                    reason: 'Cupos de Socio Fundador agotados al momento de registrar el pago'
                };
            }

            const nextPosition = prog.currentMembers + 1;

            // Consumir formalmente el cupo histórico (+1)
            await tx.founderProgram.update({
                where: { id: prog.id },
                data: { currentMembers: nextPosition }
            });

            const currentCustom = (typeof sub.customFeatures === 'object' && sub.customFeatures !== null)
                ? (sub.customFeatures as Record<string, any>)
                : {};

            const customFeatures = {
                ...currentCustom,
                founderCandidate: false,
                founderConfirmed: true,
                founderActivatedAt: new Date().toISOString()
            };

            // Extender vigencia a 1 mes desde hoy
            const now = new Date();
            const fechaFin = new Date(now);
            fechaFin.setMonth(fechaFin.getMonth() + 1);

            // Activar estatus formal de Fundador (si quien aprueba ya fijó el período, no se tocan fechas)
            const updatedSub = await (tx.suscripcion as any).update({
                where: { id: sub.id },
                data: {
                    isFounder: true,
                    founderPosition: nextPosition,
                    lockedPrice: prog.founderPrice,
                    ...(opts.keepDates ? {} : {
                        estado: 'active',
                        pagoPendiente: false,
                        fechaInicio: now,
                        fechaFin: fechaFin,
                    }),
                    customFeatures,
                    updatedAt: new Date()
                }
            });

            // Registrar auditoría de activación
            await tx.planAuditLog.create({
                data: {
                    who: performedBy,
                    what: 'FOUNDER_ACTIVATED_ON_PAYMENT',
                    targetType: 'FAMILY',
                    targetId: family.id,
                    newValue: {
                        businessId,
                        position: nextPosition,
                        lockedPrice: prog.founderPrice,
                        paidAmount,
                        planId: sub.planId
                    },
                    description: `Socio Fundador #${nextPosition} activado tras confirmación de primer pago ($${paidAmount}) para negocio ${businessId}`
                }
            });

            return {
                success: true,
                isFounder: true,
                founderPosition: nextPosition,
                lockedPrice: prog.founderPrice,
                subscription: updatedSub
            };
        });
    }
};

