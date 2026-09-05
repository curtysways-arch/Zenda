export interface PlanFeatureItem {
    key: string;
    emoji: string;
    text: string;
    included: boolean;
    highlight?: boolean;
}

export function getFormattedPlanFeatures(plan: any): PlanFeatureItem[] {
    // Si el plan tiene planEntitlements canónicos por familia, construimos la lista dinámicamente
    if (plan.planEntitlements && Array.isArray(plan.planEntitlements) && plan.planEntitlements.length > 0) {
        return plan.planEntitlements.map((pe: any) => ({
            key: pe.module?.code || pe.moduleId,
            emoji: '✨',
            text: pe.module?.name || pe.module?.code,
            included: pe.enabled ?? true
        }));
    }

    const maxCitas = plan.max_reservations_per_month ?? plan.maxAppointmentsMonthly ?? 40;
    const featuresObj = plan.features 
        ? (typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features)
        : {};

    const items: PlanFeatureItem[] = [];

    // 1. Staff / Profesionales
    const staffMax = plan.maxStaff ?? plan.max_staff ?? 1;
    if (staffMax >= 999999 || staffMax === 0) {
        items.push({ key: 'staff', emoji: '👥', text: 'Personal / Agendas ILIMITADAS', included: true, highlight: true });
    } else if (staffMax > 1) {
        items.push({ key: 'staff', emoji: '👥', text: `Hasta ${staffMax} Profesionales / Agendas`, included: true });
    } else {
        items.push({ key: 'staff', emoji: '👥', text: '1 Profesional / Agenda', included: true });
    }

    // 2. Sucursales / Sedes
    const locMax = plan.max_locations ?? 1;
    if (locMax >= 100) {
        items.push({ key: 'locations', emoji: '🏢', text: 'Sucursales / Sedes ILIMITADAS', included: true, highlight: true });
    } else if (locMax > 1) {
        items.push({ key: 'locations', emoji: '🏢', text: `${locMax} Sucursales / Sedes`, included: true });
    } else {
        items.push({ key: 'locations', emoji: '🏢', text: '1 Sucursal / Sede', included: true });
    }

    // 3. Citas Mensuales
    if (maxCitas >= 999999 || maxCitas === 0) {
        items.push({ key: 'appointments', emoji: '🗓️', text: 'Hasta citas ilimitadas mensuales', included: true, highlight: true });
    } else {
        items.push({ key: 'appointments', emoji: '🗓️', text: `Hasta ${maxCitas} citas mensuales`, included: true });
    }

    // 4. Confirmaciones Automáticas por WhatsApp
    const hasNotif = featuresObj?.whatsapp_notifications !== false;
    items.push({
        key: 'whatsapp_notif',
        emoji: '📲',
        text: 'Confirmaciones Automáticas por WhatsApp',
        included: hasNotif
    });

    // 5. Recordatorios previos por WhatsApp
    const hasReminders = !!featuresObj?.whatsapp_reminders;
    items.push({
        key: 'whatsapp_reminders',
        emoji: '⏰',
        text: 'Recordatorios previos por WhatsApp',
        included: hasReminders
    });

    // 6. Módulo de Academia, Cursos y Talleres
    const hasCourses = !!plan.courses_module;
    items.push({
        key: 'courses',
        emoji: '🎓',
        text: 'Módulo de Academia, Cursos y Talleres',
        included: hasCourses
    });

    // 7. Módulo de Promociones y Descuentos
    const hasDiscounts = !!plan.automatic_discounts_enabled;
    items.push({
        key: 'discounts',
        emoji: '🏷️',
        text: 'Módulo de Promociones y Descuentos',
        included: hasDiscounts
    });

    // 8. Portafolio de Trabajos y Galería
    const hasPortfolio = !!plan.tournaments_enabled;
    items.push({
        key: 'portfolio',
        emoji: '🏆',
        text: 'Portafolio de Trabajos y Galería',
        included: hasPortfolio
    });

    // 9. Club de Fidelización (Puntos y Premios)
    const hasLoyalty = featuresObj?.loyalty_module !== false;
    items.push({
        key: 'loyalty',
        emoji: '🎁',
        text: 'Club de Fidelización (Puntos y Premios)',
        included: hasLoyalty
    });

    // 10. Sistema de Comunicación con Clientes
    const hasComms = !!plan.communications_module;
    items.push({
        key: 'communications',
        emoji: '📣',
        text: 'Sistema de Comunicación con Clientes',
        included: hasComms
    });

    // 11. Marca Blanca / Sin marca de agua CitiOx
    const hasBranding = !!featuresObj?.remove_zenda_branding;
    items.push({
        key: 'branding',
        emoji: '✨',
        text: 'Sin marca de agua CitiOx (Marca Blanca)',
        included: hasBranding
    });

    // 12. Opciones adicionales de Branding / WhatsApp si están activas
    if (featuresObj?.whatsapp_otp) {
        items.push({ key: 'whatsapp_otp', emoji: '🔒', text: 'Seguridad OTP por WhatsApp', included: true });
    }
    if (featuresObj?.custom_colors) {
        items.push({ key: 'custom_colors', emoji: '🎨', text: 'Colores Personalizados', included: true });
    }
    if (featuresObj?.custom_logo) {
        items.push({ key: 'custom_logo', emoji: '🖼️', text: 'Logo Propio', included: true });
    }
    if (featuresObj?.analytics) {
        items.push({ key: 'analytics', emoji: '📊', text: 'Reportes Avanzados', included: true });
    }
    if (featuresObj?.automation) {
        items.push({ key: 'automation', emoji: '🤖', text: 'Automatizaciones', included: true });
    }

    return items;
}
