import prisma from '@/lib/prisma';
import { FeatureFlag, PlanLimit, DEFAULT_PLAN_CAPABILITIES, DEFAULT_PLAN_LIMITS, resolvePlanTier } from '../features';

/**
 * Helper interno: carga el negocio con suscripción y plan.
 */
async function loadBusinessWithPlan(businessId: string) {
    if (!businessId) return null;
    return await (prisma.negocio as any).findUnique({
        where: { id: businessId },
        include: {
            Suscripcion: {
                include: { Plan: true }
            }
        }
    });
}

/**
 * Parsea un JSON que puede venir como string o ya como objeto.
 */
function parseJson(raw: any): Record<string, any> {
    if (!raw) return {};
    if (typeof raw === 'string') {
        try { return JSON.parse(raw); }
        catch { return {}; }
    }
    return raw;
}

export const featureService = {
    /**
     * Valida si un negocio tiene acceso a una feature de forma asíncrona (consulta DB)
     */
    async canUseFeature(businessId: string, feature: FeatureFlag): Promise<boolean> {
        const business = await loadBusinessWithPlan(businessId);
        if (!business) return false;

        // Si no tiene suscripción o plan asignado en DB, asumir trial/plan por defecto
        if (!business.Suscripcion?.Plan) {
            return feature === 'custom_colors' || feature === 'custom_logo';
        }

        const estado = (business.Suscripcion.estado || '').toLowerCase();

        // Si el estado es de prueba (trial) o activo, evaluar overrides y plan
        const customFeatures = parseJson(business.Suscripcion.customFeatures);
        if (typeof customFeatures[feature] === 'boolean') {
            return customFeatures[feature];
        }

        if (estado === 'expired') {
            if (feature.startsWith('whatsapp') || feature === 'remove_zenda_branding') {
                return false;
            }
        }

        if (estado === 'trial') {
            return true;
        }

        return this.hasFeature(business.Suscripcion.Plan, feature);
    },

    /**
     * Valida de forma sincrónica si un objeto Plan contiene la feature habilitada.
     * Útil cuando ya tienes el plan cargado desde la DB.
     */
    hasFeature(plan: any, feature: FeatureFlag): boolean {
        if (!plan) return false;

        // 1. Prioridad: el objeto JSON de features en la DB
        const featuresJson = parseJson(plan.features);
        if (typeof featuresJson[feature] === 'boolean') {
            return featuresJson[feature];
        }

        // 2. Compatibilidad retroactiva (Fallback a columnas hardcodeadas si existen)
        if (feature === 'tournaments_module' && plan.tournaments_enabled !== undefined) {
            return plan.tournaments_enabled;
        }
        if (feature === 'automatic_discounts' && plan.automatic_discounts_enabled !== undefined) {
            return plan.automatic_discounts_enabled;
        }
        if (feature === 'courses_module' && plan.courses_module !== undefined) {
            return plan.courses_module;
        }

        // 3. Fallback a mapeos por defecto basados en el nombre del plan
        const tier = resolvePlanTier(plan.name || '');
        const defaults = DEFAULT_PLAN_CAPABILITIES[tier];
        return defaults[feature] || false;
    },

    /**
     * Obtiene un límite numérico para un negocio (max_staff, max_appointments, etc.)
     * Prioridad: customFeatures > features JSON del plan > columnas legacy > defaults
     */
    async getLimit(businessId: string, limit: PlanLimit): Promise<number> {
        const business = await loadBusinessWithPlan(businessId);
        if (!business?.Suscripcion?.Plan) return 0;

        const plan = business.Suscripcion.Plan;

        // Prioridad 1: customFeatures de la suscripción
        const customFeatures = parseJson(business.Suscripcion.customFeatures);
        if (typeof customFeatures[limit] === 'number') {
            return customFeatures[limit];
        }

        // Prioridad 2: features JSON del plan
        const featuresJson = parseJson(plan.features);
        if (typeof featuresJson[limit] === 'number') {
            return featuresJson[limit];
        }

        // Prioridad 3: columnas legacy del modelo Plan
        const legacyMap: Record<PlanLimit, string> = {
            max_staff: 'maxStaff',
            max_appointments_monthly: 'maxAppointmentsMonthly',
            max_locations: 'max_locations',
            max_services: 'max_fields'
        };
        const legacyCol = legacyMap[limit];
        if (legacyCol && (plan as any)[legacyCol] !== undefined) {
            return (plan as any)[legacyCol];
        }

        // Prioridad 4: defaults por tier
        const tier = resolvePlanTier(plan.name || '');
        return DEFAULT_PLAN_LIMITS[tier][limit];
    },

    /**
     * Retorna TODAS las features y límites de un negocio como un objeto plano.
     * Ideal para el endpoint /api/features que alimenta el frontend.
     */
    async getAllFeatures(businessId: string): Promise<Record<string, boolean | number>> {
        const business = await loadBusinessWithPlan(businessId);
        if (!business?.Suscripcion?.Plan) return { custom_colors: true, custom_logo: true };

        const plan = business.Suscripcion.Plan;
        const tier = resolvePlanTier(plan.name || '');
        const featuresJson = parseJson(plan.features);
        const customFeatures = parseJson(business.Suscripcion?.customFeatures);
        const estado = (business.Suscripcion.estado || '').toLowerCase();
        const isExpired = estado === 'expired';

        const result: Record<string, boolean | number> = {};

        // 1. Poblar feature flags booleanas
        const allFlags: FeatureFlag[] = [
            'whatsapp_notifications', 'whatsapp_otp', 'whatsapp_reminders', 'whatsapp_campaigns',
            'custom_colors', 'custom_logo', 'custom_phrases', 'remove_zenda_branding',
            'multi_staff', 'multi_branch', 'analytics', 'automation',
            'tournaments_module', 'courses_module', 'automatic_discounts'
        ];

            for (const flag of allFlags) {
                // customFeatures override
                if (typeof customFeatures[flag] === 'boolean') {
                    result[flag] = customFeatures[flag];
                } else if (estado === 'trial') {
                    result[flag] = true;
                } else {
                    result[flag] = this.hasFeature(plan, flag);
                }

            // Habilitar capabilities completas durante el trial para conversión
            if (estado === 'trial') {
                const planName = (plan.name || '').toUpperCase();
                if (planName.includes('PRO') || planName.includes('BUSINESS')) {
                    const trialFeatures = [
                        'whatsapp_notifications', 
                        'whatsapp_otp', 
                        'whatsapp_reminders', 
                        'remove_zenda_branding', 
                        'automation'
                    ];
                    if (trialFeatures.includes(flag)) {
                        result[flag] = true;
                    }
                }
            }

            // Forzar a false si expiró y es transaccional
            if (isExpired && (flag.startsWith('whatsapp') || flag === 'remove_zenda_branding')) {
                result[flag] = false;
            }
        }

        // 2. Poblar límites numéricos
        const allLimits: PlanLimit[] = ['max_staff', 'max_appointments_monthly', 'max_locations', 'max_services'];
        const legacyMap: Record<PlanLimit, string> = {
            max_staff: 'maxStaff',
            max_appointments_monthly: 'maxAppointmentsMonthly',
            max_locations: 'max_locations',
            max_services: 'max_fields'
        };

        for (const limit of allLimits) {
            if (typeof customFeatures[limit] === 'number') {
                result[limit] = customFeatures[limit];
            } else if (typeof featuresJson[limit] === 'number') {
                result[limit] = featuresJson[limit];
            } else {
                const legacyCol = legacyMap[limit];
                if (legacyCol && (plan as any)[legacyCol] !== undefined) {
                    result[limit] = (plan as any)[legacyCol];
                } else {
                    result[limit] = DEFAULT_PLAN_LIMITS[tier][limit];
                }
            }
        }

        // 3. Metadata útil para el frontend
        result['__plan_name'] = 0; // Placeholder, el frontend lee el string aparte
        result['__is_expired'] = isExpired ? 1 : 0;
        result['__is_trial'] = estado === 'trial' ? 1 : 0;

        return result;
    },

    /**
     * Retorna metadata del plan para el frontend (nombre, días restantes, estado, etc.)
     */
    async getPlanMeta(businessId: string): Promise<{
        planName: string;
        estado: string;
        daysLeft: number;
        fechaFin: string | null;
    } | null> {
        const business = await loadBusinessWithPlan(businessId);
        if (!business?.Suscripcion?.Plan) return null;

        const sub = business.Suscripcion;
        const diffTime = new Date(sub.fechaFin).getTime() - Date.now();
        const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
            planName: sub.Plan.name,
            estado: sub.estado,
            daysLeft: Math.max(daysLeft, 0),
            fechaFin: sub.fechaFin ? new Date(sub.fechaFin).toISOString() : null
        };
    },

    /**
     * Obtiene el límite específico de WhatsApp para periodo de prueba (trial).
     * Preparado para futuros límites de WhatsApp durante el trial sin rediseñar la arquitectura.
     */
    async getTrialWhatsAppLimit(businessId: string): Promise<number | null> {
        const business = await loadBusinessWithPlan(businessId);
        if (!business?.Suscripcion) return null;

        // 1. Buscar en customFeatures de la suscripción (específico por negocio)
        const customFeatures = parseJson(business.Suscripcion.customFeatures);
        if (typeof customFeatures.trialWhatsAppLimit === 'number') {
            return customFeatures.trialWhatsAppLimit;
        }

        // 2. Buscar en las features del plan (global por plan)
        if (business.Suscripcion.Plan) {
            const planFeatures = parseJson(business.Suscripcion.Plan.features);
            if (typeof planFeatures.trialWhatsAppLimit === 'number') {
                return planFeatures.trialWhatsAppLimit;
            }
        }

        return null; // Sin límite configurado
    }
};
