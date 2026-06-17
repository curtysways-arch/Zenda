export function calculateOnboardingProgress(negocio: any, servicesCount: number) {
    const checks = [
        {
            id: 'info',
            label: 'Información básica',
            completed: Boolean(negocio.nombre && negocio.nombre.length > 0)
        },
        {
            id: 'logo',
            label: 'Logo',
            completed: Boolean(negocio.logoUrl && negocio.logoUrl.length > 0)
        },
        {
            id: 'banner',
            label: 'Banner Principal',
            completed: Boolean(negocio.configuracion?.bannerUrl || negocio.heroTitulo) // Fallback to hero config
        },
        {
            id: 'tipo',
            label: 'Tipo de negocio',
            completed: Boolean(negocio.configuracion?.tipoNegocio)
        },
        {
            id: 'service',
            label: 'Primer servicio',
            completed: servicesCount > 0
        },
        {
            id: 'whatsapp',
            label: 'WhatsApp conectado',
            completed: Boolean(negocio.whatsapp && negocio.whatsapp.length > 0)
        },
        {
            id: 'page',
            label: 'Página publicada',
            completed: negocio.estado === 'ACTIVO'
        },
        {
            id: 'hours',
            label: 'Horarios',
            completed: Boolean(negocio.horarioApertura && negocio.horarioCierre)
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
