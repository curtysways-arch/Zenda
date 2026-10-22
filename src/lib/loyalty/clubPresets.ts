/**
 * Plantillas del Club de beneficios por tipo de negocio.
 *
 * Un club simple: UNA moneda (puntos), TRES niveles y pocas misiones claras.
 * Los puntos que gana el cliente sirven para canjear premios y, al mismo
 * tiempo, para subir de nivel (UserPoints.puntos y UserPoints.experiencia).
 *
 * Usa solo modelos existentes: LoyaltyLevel, Campaign + Quest, LoyaltyReward
 * y la configuración del negocio (puntosActivos / puntosReserva).
 */

export type ClubPresetKey =
    | 'spa'
    | 'barberia'
    | 'dental'
    | 'citas'
    | 'gimnasio'
    | 'canchas'
    | 'restaurante'
    | 'tienda'
    | 'lavanderia';

export interface ClubPresetLevel {
    nombre: string;
    desde: number; // puntos acumulados para llegar
    multiplicador: number;
    color: string;
    icono: string;
    beneficios: string[];
}

export interface ClubPresetMission {
    nombre: string;
    descripcion: string;
    triggerEvent: string;
    cantidadMeta: number;
    puntos: number;
    icono: string;
    color: string;
    repetible?: boolean;
    limiteUsuario?: number;
}

export interface ClubPresetReward {
    nombre: string;
    descripcion: string;
    costoPuntos: number;
}

export interface ClubPreset {
    key: ClubPresetKey;
    nombre: string;
    resumen: string;
    puntosPorVisita: number;
    /** Puntos para quien recomienda, cuando su amigo completa su primera visita. */
    puntosReferido: number;
    /** Puntos por cada dólar en ventas de caja, pedidos y órdenes. */
    puntosPorDolar: number;
    /** Cómo se llama "una visita" en este negocio (para textos). */
    visita: string;
    /** true si las visitas suman puntos automáticamente con lo que Citiox registra hoy. */
    puntosAutomaticos: boolean;
    aviso?: string;
    levels: ClubPresetLevel[];
    missions: ClubPresetMission[];
    rewards: ClubPresetReward[];
}

const LEVELS = (benefits: [string[], string[], string[]]): ClubPresetLevel[] => [
    { nombre: 'Bronce', desde: 0, multiplicador: 1, color: '#cd7f32', icono: 'Award', beneficios: benefits[0] },
    { nombre: 'Plata', desde: 150, multiplicador: 1.25, color: '#94a3b8', icono: 'Shield', beneficios: benefits[1] },
    { nombre: 'Oro', desde: 400, multiplicador: 1.5, color: '#eab308', icono: 'Crown', beneficios: benefits[2] },
];

const REVIEW = (puntos = 20): ClubPresetMission => ({
    nombre: 'Déjanos tu opinión',
    descripcion: 'Califica tu última visita. Tu opinión nos ayuda a mejorar.',
    triggerEvent: 'REVIEW_CREATED',
    cantidadMeta: 1,
    puntos,
    icono: 'Star',
    color: '#eab308',
});

function appointmentPreset(
    key: ClubPresetKey,
    nombre: string,
    visita: string,
    visitas: string,
    rewards: ClubPresetReward[],
    levelBenefits: [string[], string[], string[]],
): ClubPreset {
    return {
        key,
        nombre,
        resumen: `Tus clientes ganan 10 puntos por cada ${visita} completada y suben de nivel mientras más vuelven.`,
        puntosPorVisita: 10,
        puntosReferido: 60,
        puntosPorDolar: 1,
        visita,
        puntosAutomaticos: true,
        levels: LEVELS(levelBenefits),
        missions: [
            {
                nombre: `Tu primera ${visita}`,
                descripcion: `Completa tu primera ${visita} con nosotros y recibe un bono de bienvenida.`,
                triggerEvent: 'BOOKING_COMPLETED',
                cantidadMeta: 1,
                puntos: 20,
                icono: 'Sparkles',
                color: '#ec4899',
            },
            {
                nombre: 'Cliente frecuente',
                descripcion: `Completa 5 ${visitas} y gana un bono extra de puntos.`,
                triggerEvent: 'BOOKING_COMPLETED',
                cantidadMeta: 5,
                puntos: 50,
                icono: 'Calendar',
                color: '#8b5cf6',
                repetible: true,
                limiteUsuario: 10,
            },
            REVIEW(),
        ],
        rewards,
    };
}

export const CLUB_PRESETS: Record<ClubPresetKey, ClubPreset> = {
    spa: appointmentPreset('spa', 'Spa y belleza', 'cita', 'citas', [
        { nombre: '10% de descuento en tu próxima cita', descripcion: 'Muéstralo al pagar.', costoPuntos: 100 },
        { nombre: 'Tratamiento express de regalo', descripcion: 'Un complemento de cortesía en tu próxima visita.', costoPuntos: 200 },
        { nombre: 'Servicio gratis a elección', descripcion: 'Elige un servicio de hasta $40.', costoPuntos: 450 },
    ], [['Acumulas puntos en cada cita'], ['25% más puntos por cita', 'Prioridad al reservar'], ['50% más puntos por cita', 'Regalo de cumpleaños']]),

    barberia: appointmentPreset('barberia', 'Barbería', 'visita', 'visitas', [
        { nombre: 'Perfilado de barba gratis', descripcion: 'En tu próxima visita.', costoPuntos: 100 },
        { nombre: '50% en tu próximo corte', descripcion: 'Muéstralo al pagar.', costoPuntos: 180 },
        { nombre: 'Corte gratis', descripcion: 'Un corte de cortesía.', costoPuntos: 300 },
    ], [['Acumulas puntos en cada corte'], ['25% más puntos por visita'], ['50% más puntos por visita', 'Corte gratis en tu cumpleaños']]),

    dental: appointmentPreset('dental', 'Clínica dental', 'consulta', 'consultas', [
        { nombre: '10% en tu próxima limpieza', descripcion: 'Muéstralo en recepción.', costoPuntos: 100 },
        { nombre: 'Kit de higiene dental', descripcion: 'Cepillo, pasta e hilo dental.', costoPuntos: 200 },
        { nombre: 'Limpieza dental gratis', descripcion: 'Una limpieza de cortesía.', costoPuntos: 500 },
    ], [['Acumulas puntos en cada consulta'], ['25% más puntos por consulta', 'Recordatorios prioritarios'], ['50% más puntos por consulta', 'Revisión anual de cortesía']]),

    citas: appointmentPreset('citas', 'Servicios con cita', 'cita', 'citas', [
        { nombre: '10% de descuento', descripcion: 'En tu próxima cita.', costoPuntos: 100 },
        { nombre: 'Regalo sorpresa', descripcion: 'Un detalle en tu próxima visita.', costoPuntos: 200 },
        { nombre: 'Servicio gratis', descripcion: 'Un servicio de cortesía a elección.', costoPuntos: 450 },
    ], [['Acumulas puntos en cada cita'], ['25% más puntos por cita'], ['50% más puntos por cita', 'Regalo de cumpleaños']]),

    canchas: {
        key: 'canchas',
        nombre: 'Canchas deportivas',
        resumen: 'Tus jugadores ganan 10 puntos por cada reserva jugada y suben de nivel mientras más juegan.',
        puntosPorVisita: 10,
        puntosReferido: 60,
        puntosPorDolar: 1,
        visita: 'reserva',
        puntosAutomaticos: true,
        levels: LEVELS([['Acumulas puntos en cada partido'], ['25% más puntos por reserva', 'Prioridad en horarios pico'], ['50% más puntos por reserva', 'Una hora gratis en tu cumpleaños']]),
        missions: [
            { nombre: 'Tu primer partido', descripcion: 'Juega tu primera reserva con nosotros y recibe un bono de bienvenida.', triggerEvent: 'BOOKING_COMPLETED', cantidadMeta: 1, puntos: 20, icono: 'Trophy', color: '#10b981' },
            { nombre: 'Jugador constante', descripcion: 'Juega 5 reservas y gana un bono extra.', triggerEvent: 'BOOKING_COMPLETED', cantidadMeta: 5, puntos: 50, icono: 'Calendar', color: '#0ea5e9', repetible: true, limiteUsuario: 10 },
            REVIEW(),
        ],
        rewards: [
            { nombre: 'Hidratación gratis para el equipo', descripcion: 'Bebidas para tu próximo partido.', costoPuntos: 100 },
            { nombre: '50% en tu próxima reserva', descripcion: 'Válido en horario no pico.', costoPuntos: 200 },
            { nombre: 'Una hora de cancha gratis', descripcion: 'Reserva de cortesía.', costoPuntos: 400 },
        ],
    },

    gimnasio: {
        key: 'gimnasio',
        nombre: 'Gimnasio',
        resumen: 'Tus socios ganan puntos por entrenar con constancia: cada asistencia registrada con QR cuenta.',
        puntosPorVisita: 0,
        puntosReferido: 80,
        puntosPorDolar: 1,
        visita: 'asistencia',
        puntosAutomaticos: true,
        levels: LEVELS([['Acumulas puntos entrenando'], ['25% más puntos', 'Un pase de invitado al mes'], ['50% más puntos', 'Evaluación física de cortesía']]),
        missions: [
            { nombre: 'Primer entrenamiento', descripcion: 'Registra tu primera asistencia con QR.', triggerEvent: 'GYM_ATTENDANCE', cantidadMeta: 1, puntos: 20, icono: 'Zap', color: '#10b981' },
            { nombre: 'Semana constante', descripcion: 'Entrena 3 veces y gana puntos extra.', triggerEvent: 'GYM_ATTENDANCE', cantidadMeta: 3, puntos: 30, icono: 'Calendar', color: '#0ea5e9', repetible: true, limiteUsuario: 52 },
            { nombre: 'Mes disciplinado', descripcion: 'Completa 12 asistencias y gana un gran bono.', triggerEvent: 'GYM_ATTENDANCE', cantidadMeta: 12, puntos: 100, icono: 'Trophy', color: '#8b5cf6', repetible: true, limiteUsuario: 12 },
        ],
        rewards: [
            { nombre: 'Batido de proteína gratis', descripcion: 'Retíralo en recepción.', costoPuntos: 100 },
            { nombre: 'Pase de invitado', descripcion: 'Trae a un amigo a entrenar un día.', costoPuntos: 150 },
            { nombre: 'Una semana gratis', descripcion: 'Se suma a tu membresía.', costoPuntos: 400 },
        ],
    },

    restaurante: {
        key: 'restaurante',
        nombre: 'Restaurante o cafetería',
        resumen: 'Tus clientes ganan 1 punto por cada dólar que gastan (en caja o pedidos) y los canjean por platos y bebidas.',
        puntosPorVisita: 10,
        puntosReferido: 60,
        puntosPorDolar: 1,
        visita: 'pedido',
        puntosAutomaticos: true,
        levels: LEVELS([['Acumulas puntos en cada pedido'], ['25% más puntos', 'Postre de cortesía en tu cumpleaños'], ['50% más puntos', 'Mesa preferente']]),
        missions: [
            { nombre: 'Tu primer pedido', descripcion: 'Haz tu primer pedido y recibe un bono de bienvenida.', triggerEvent: 'ORDER_COMPLETED', cantidadMeta: 1, puntos: 20, icono: 'Sparkles', color: '#f97316' },
            { nombre: 'Cliente de la casa', descripcion: 'Completa 5 pedidos y gana un bono extra.', triggerEvent: 'ORDER_COMPLETED', cantidadMeta: 5, puntos: 50, icono: 'Calendar', color: '#ef4444', repetible: true, limiteUsuario: 10 },
            REVIEW(),
        ],
        rewards: [
            { nombre: 'Bebida gratis', descripcion: 'Con tu próximo pedido.', costoPuntos: 80 },
            { nombre: 'Postre gratis', descripcion: 'Con tu próximo pedido.', costoPuntos: 150 },
            { nombre: 'Plato fuerte gratis', descripcion: 'Elige un plato de la carta.', costoPuntos: 350 },
        ],
    },

    tienda: {
        key: 'tienda',
        nombre: 'Tienda',
        resumen: 'Tus clientes ganan 1 punto por cada dólar que gastan y los canjean por descuentos.',
        puntosPorVisita: 10,
        puntosReferido: 60,
        puntosPorDolar: 1,
        visita: 'compra',
        puntosAutomaticos: true,
        levels: LEVELS([['Acumulas puntos en cada compra'], ['25% más puntos', 'Acceso anticipado a novedades'], ['50% más puntos', 'Envío gratis']]),
        missions: [
            { nombre: 'Tu primera compra', descripcion: 'Haz tu primera compra y recibe un bono de bienvenida.', triggerEvent: 'ORDER_COMPLETED', cantidadMeta: 1, puntos: 20, icono: 'Sparkles', color: '#8b5cf6' },
            { nombre: 'Cliente frecuente', descripcion: 'Completa 5 compras y gana un bono extra.', triggerEvent: 'ORDER_COMPLETED', cantidadMeta: 5, puntos: 50, icono: 'ShoppingBag', color: '#ec4899', repetible: true, limiteUsuario: 10 },
            REVIEW(),
        ],
        rewards: [
            { nombre: '10% de descuento', descripcion: 'En tu próxima compra.', costoPuntos: 100 },
            { nombre: '$10 de descuento', descripcion: 'En compras desde $40.', costoPuntos: 200 },
            { nombre: 'Producto sorpresa', descripcion: 'Un regalo elegido por la tienda.', costoPuntos: 350 },
        ],
    },

    lavanderia: {
        key: 'lavanderia',
        nombre: 'Lavandería',
        resumen: 'Tus clientes ganan 1 punto por cada dólar en sus órdenes y los canjean por lavados y descuentos.',
        puntosPorVisita: 10,
        puntosReferido: 60,
        puntosPorDolar: 1,
        visita: 'orden',
        puntosAutomaticos: true,
        levels: LEVELS([['Acumulas puntos en cada orden'], ['25% más puntos', 'Recolección prioritaria'], ['50% más puntos', 'Recolección gratis']]),
        missions: [
            { nombre: 'Tu primera orden', descripcion: 'Deja tu primera orden y recibe un bono de bienvenida.', triggerEvent: 'LAUNDRY_ORDER_COMPLETED', cantidadMeta: 1, puntos: 20, icono: 'Sparkles', color: '#06b6d4' },
            { nombre: 'Cliente frecuente', descripcion: 'Completa 5 órdenes y gana un bono extra.', triggerEvent: 'LAUNDRY_ORDER_COMPLETED', cantidadMeta: 5, puntos: 50, icono: 'Calendar', color: '#0ea5e9', repetible: true, limiteUsuario: 10 },
            REVIEW(),
        ],
        rewards: [
            { nombre: 'Planchado de 3 camisas gratis', descripcion: 'En tu próxima orden.', costoPuntos: 100 },
            { nombre: '20% en tu próxima orden', descripcion: 'Muéstralo al pagar.', costoPuntos: 200 },
            { nombre: 'Lavado de edredón gratis', descripcion: 'Una pieza de cortesía.', costoPuntos: 400 },
        ],
    },
};

/** Elige la plantilla más adecuada según el tipo de negocio. */
export async function pickPresetForBusiness(negocio: any): Promise<ClubPresetKey> {
    const helper = await import('@/lib/businessTypeHelper');
    const h: any = helper;
    const raw = `${negocio?.tipoNegocio || ''} ${negocio?.nombre || ''}`.toUpperCase();
    try {
        if (h.isGymBusiness?.(negocio)) return 'gimnasio';
        if (h.isSportsCourtsBusiness?.(negocio)) return 'canchas';
        if (h.isLaundryOrShoeCareBusiness?.(negocio)) return 'lavanderia';
        if (h.isRestaurantBusiness?.(negocio) || h.isCafeteriaBusiness?.(negocio)) return 'restaurante';
        if (h.isStoreBusiness?.(negocio)) return 'tienda';
        if (h.isDentalBusiness?.(negocio)) return 'dental';
    } catch { /* usar texto */ }
    if (raw.includes('BARBER')) return 'barberia';
    if (raw.includes('SPA') || raw.includes('BELLEZA') || raw.includes('ESTETIC') || raw.includes('SALON') || raw.includes('UÑAS')) return 'spa';
    return 'citas';
}
