import { normalizeBusinessConfig } from '@/lib/businessTypeHelper';

export interface OnboardingCheck {
    id: string;
    label: string;
    /** Explicación corta de por qué importa (se muestra en la lista) */
    hint: string;
    /** Dónde se completa esta tarea */
    href: string;
    completed: boolean;
}

/**
 * Tareas de puesta en marcha que el DUEÑO puede completar por sí mismo.
 * Cada tarea lleva directo a la pantalla donde se resuelve.
 */
export function calculateOnboardingProgress(negocio: any, servicesCount: number) {
    const cfg = normalizeBusinessConfig(negocio?.configuracion);

    const checks: OnboardingCheck[] = [
        {
            id: 'logo',
            label: 'Sube tu logo',
            hint: 'Tus clientes reconocerán tu marca al instante.',
            href: '/admin/perfil',
            completed: Boolean(negocio?.logoUrl && negocio.logoUrl.length > 0)
        },
        {
            id: 'banner',
            label: 'Elige la foto de portada',
            hint: 'Es lo primero que se ve en tu página.',
            href: '/admin/hero-destacados',
            completed: Boolean(cfg?.bannerUrl || negocio?.bannerUrl || (Array.isArray(cfg?.bannerUrls) && cfg.bannerUrls.length > 0) || negocio?.heroTitulo)
        },
        {
            id: 'service',
            label: 'Crea tu primer servicio',
            hint: 'Sin servicios, nadie puede reservar.',
            href: '/admin/servicios',
            completed: servicesCount > 0
        },
        {
            id: 'hours',
            label: 'Define tu horario',
            hint: 'Así solo te reservan cuando atiendes.',
            href: '/admin/perfil',
            completed: Boolean(negocio?.horarioApertura && negocio?.horarioCierre)
        },
        {
            id: 'whatsapp',
            label: 'Agrega tu WhatsApp',
            hint: 'Para confirmar citas y responder dudas.',
            href: '/admin/perfil',
            completed: Boolean(negocio?.whatsapp && negocio.whatsapp.length > 0)
        },
        {
            id: 'page',
            label: 'Publica tu página',
            hint: 'Activa tu plan para que tus clientes te encuentren.',
            href: '/admin/plan',
            completed: negocio?.estado === 'ACTIVO'
        }
    ];

    const completedCount = checks.filter(c => c.completed).length;
    const percentage = Math.round((completedCount / checks.length) * 100);

    return {
        checks,
        completedCount,
        total: checks.length,
        percentage
    };
}
