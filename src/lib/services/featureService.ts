import { SubscriptionEngine } from '@/core/subscription/SubscriptionEngine';
import { UsageEngine } from '@/core/subscription/UsageEngine';
import { LegacySubscriptionAdapter } from '@/core/subscription/LegacySubscriptionAdapter';
import { FeatureFlag, PlanLimit } from '../features';
import { ResourceLimitKey, FeatureAccessLevels } from '@/core/subscription/types';

export const featureService = {
    /**
     * Valida si un negocio tiene acceso a una feature
     */
    async canUseFeature(businessId: string, feature: FeatureFlag): Promise<boolean> {
        return await LegacySubscriptionAdapter.canUseLegacyFeature(businessId, feature);
    },

    /**
     * Valida sincrónicamente en base al plan cargado
     */
    hasFeature(plan: any, feature: FeatureFlag): boolean {
        if (!plan) return false;
        const planName = (plan.name || '').toUpperCase();
        if (feature === 'remove_zenda_branding') {
            return planName.includes('PRO') || planName.includes('BUSINESS') || planName.includes('ENTERPRISE');
        }
        return true;
    },

    /**
     * Obtiene el nivel de acceso granular a una característica ('none' | 'basic' | 'standard' | 'advanced' | 'enterprise')
     */
    async getFeatureAccess(businessId: string, featureKey: keyof FeatureAccessLevels) {
        return await SubscriptionEngine.getFeatureAccess(businessId, featureKey);
    },

    /**
     * Obtiene un límite numérico para un negocio
     */
    async getLimit(businessId: string, limit: PlanLimit): Promise<number> {
        return await LegacySubscriptionAdapter.getLegacyLimit(businessId, limit);
    },

    /**
     * Incrementa el consumo de un recurso mediante UsageEngine
     */
    async incrementUsage(businessId: string, resourceKey: ResourceLimitKey, amount: number = 1) {
        return await UsageEngine.increment(businessId, resourceKey, amount);
    },

    /**
     * Consulta el consumo actual de un recurso mediante UsageEngine
     */
    async getUsage(businessId: string, resourceKey: ResourceLimitKey) {
        return await UsageEngine.getUsage(businessId, resourceKey);
    },

    /**
     * Verifica si un negocio aún tiene cuota disponible para un recurso
     */
    async hasRemainingQuota(businessId: string, resourceKey: ResourceLimitKey) {
        return await SubscriptionEngine.hasRemainingQuota(businessId, resourceKey);
    },

    /**
     * Retorna TODAS las features y límites de un negocio como objeto plano para el frontend
     */
    async getAllFeatures(businessId: string): Promise<Record<string, boolean | number>> {
        const summary = await SubscriptionEngine.getSubscriptionSummary(businessId);
        
        return {
            whatsapp_notifications: summary.features.communications !== 'none',
            whatsapp_otp: summary.features.communications !== 'none',
            whatsapp_reminders: summary.features.communications !== 'none',
            whatsapp_campaigns: summary.features.communications === 'advanced' || summary.features.communications === 'enterprise',
            custom_colors: true,
            custom_logo: summary.features.branding !== 'citiox_watermark',
            custom_phrases: summary.features.customTheme,
            remove_zenda_branding: summary.features.branding === 'white_label',
            multi_staff: (summary.limits.employees || 1) > 1,
            multi_branch: (summary.limits.branches || 1) > 1,
            analytics: summary.features.reports === 'advanced' || summary.features.reports === 'enterprise',
            automation: summary.features.automations !== 'none',
            tournaments_module: true,
            courses_module: summary.features.ai !== 'none',
            communications_module: summary.features.communications !== 'none',
            automatic_discounts: summary.features.promotions !== 'none',
            loyalty_module: true,
            max_staff: summary.limits.employees || 1,
            max_appointments_monthly: summary.limits.transactions || 500,
            max_locations: summary.limits.branches || 1,
            max_services: summary.limits.services || 50,
            __is_expired: summary.status === 'expired' ? 1 : 0,
            __is_trial: summary.status === 'trial' ? 1 : 0
        };
    },

    /**
     * Retorna metadata del plan para el frontend
     */
    async getPlanMeta(businessId: string) {
        const summary = await SubscriptionEngine.getSubscriptionSummary(businessId);
        const diffTime = new Date(summary.periodEnd).getTime() - Date.now();
        const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
            planName: summary.planName,
            estado: summary.status,
            daysLeft: Math.max(daysLeft, 0),
            fechaFin: summary.periodEnd ? new Date(summary.periodEnd).toISOString() : null
        };
    },

    /**
     * Obtiene el límite específico de WhatsApp para periodo de prueba
     */
    async getTrialWhatsAppLimit(businessId: string): Promise<number | null> {
        return 100;
    }
};

