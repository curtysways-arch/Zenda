export type FeatureFlag =
    | 'whatsapp_notifications' // Confirmaciones básicas y notificaciones del sistema
    | 'whatsapp_otp'           // Envío de códigos OTP
    | 'whatsapp_reminders'     // Recordatorios automáticos de citas
    | 'whatsapp_campaigns'     // Campañas masivas o mensajes promocionales
    | 'custom_colors'          // Posibilidad de alterar los colores del portal
    | 'custom_logo'            // Posibilidad de usar logo propio
    | 'custom_phrases'         // Posibilidad de cambiar frases como "Hola" o "Radiante"
    | 'remove_zenda_branding'  // Quitar la marca de agua "Powered by CitiOx"
    | 'multi_staff'            // Más de 1 profesional
    | 'multi_branch'           // Más de 1 sucursal
    | 'analytics'              // Reportes avanzados
    | 'automation'             // Automatizaciones complejas (seguimientos, etc.)
    | 'tournaments_module'     // Módulo de portafolio / torneos
    | 'courses_module'         // Módulo de academia / cursos
    | 'automatic_discounts';   // Promociones y descuentos automáticos

/**
 * Límites numéricos que varían según el plan.
 * Estos NO son booleanos, son cantidades máximas.
 */
export type PlanLimit =
    | 'max_staff'
    | 'max_appointments_monthly'
    | 'max_locations'
    | 'max_services';

export interface PlanCapabilities {
    [key: string]: boolean; // Feature flags booleanas
}

export interface PlanLimits {
    [key: string]: number; // Límites numéricos
}

// Valores por defecto de feature flags booleanas por plan
export const DEFAULT_PLAN_CAPABILITIES: Record<'BEGIN' | 'PRO' | 'BUSINESS', Partial<Record<FeatureFlag, boolean>>> = {
    BEGIN: {
        whatsapp_notifications: false,
        whatsapp_otp: false,
        whatsapp_reminders: false,
        whatsapp_campaigns: false,
        custom_colors: true,
        custom_logo: true,
        custom_phrases: false,
        remove_zenda_branding: false,
        multi_staff: false,
        multi_branch: false,
        analytics: false,
        automation: false,
        tournaments_module: false,
        courses_module: false,
        automatic_discounts: false
    },
    PRO: {
        whatsapp_notifications: true,
        whatsapp_otp: true,
        whatsapp_reminders: true,
        whatsapp_campaigns: false,
        custom_colors: true,
        custom_logo: true,
        custom_phrases: true,
        remove_zenda_branding: false,
        multi_staff: true,
        multi_branch: false,
        analytics: true,
        automation: false,
        tournaments_module: true,
        courses_module: false,
        automatic_discounts: true
    },
    BUSINESS: {
        whatsapp_notifications: true,
        whatsapp_otp: true,
        whatsapp_reminders: true,
        whatsapp_campaigns: true,
        custom_colors: true,
        custom_logo: true,
        custom_phrases: true,
        remove_zenda_branding: true,
        multi_staff: true,
        multi_branch: true,
        analytics: true,
        automation: true,
        tournaments_module: true,
        courses_module: true,
        automatic_discounts: true
    }
};

// Valores por defecto de límites numéricos por plan
export const DEFAULT_PLAN_LIMITS: Record<'BEGIN' | 'PRO' | 'BUSINESS', Record<PlanLimit, number>> = {
    BEGIN: {
        max_staff: 1,
        max_appointments_monthly: 40,
        max_locations: 1,
        max_services: 5
    },
    PRO: {
        max_staff: 5,
        max_appointments_monthly: 500,
        max_locations: 2,
        max_services: 20
    },
    BUSINESS: {
        max_staff: 999,
        max_appointments_monthly: 999999,
        max_locations: 10,
        max_services: 100
    }
};

/**
 * Resuelve el tier del plan a partir de su nombre.
 */
export function resolvePlanTier(planName: string): 'BEGIN' | 'PRO' | 'BUSINESS' {
    const name = (planName || '').toUpperCase();
    if (name.includes('BUSINESS') || name.includes('ENTERPRISE')) return 'BUSINESS';
    if (name.includes('PRO') || name.includes('PLUS') || name.includes('PREMIUM')) return 'PRO';
    return 'BEGIN';
}
