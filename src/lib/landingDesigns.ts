/**
 * Tienda de diseños de página pública.
 *
 * Cada tipo de negocio tiene uno o más diseños para su página (landing).
 * El negocio puede activar los gratuitos y comprar los de pago.
 *
 * Se guarda en Negocio.configuracion.landingDesign:
 *   { activo: 'esencia', comprados: ['esencia'] }
 *
 * La compra crea un Payment pendiente con plan_id = `LANDING:<id>` que el
 * superadmin aprueba en Superadmin > Pagos (ver /api/admin/billing/approve).
 */

export type LandingFamily = 'servicios' | 'dental';

export interface LandingDesign {
    id: string;
    nombre: string;
    descripcion: string;
    destacados: string[];
    familias: LandingFamily[];
    /** Precio en USD, pago único. 0 = gratis. */
    precio: number;
    etiqueta?: string;
    /** Imagen de referencia para la tarjeta (la vista previa real usa la página del negocio). */
    portada: string;
}

export const LANDING_DESIGNS: LandingDesign[] = [
    {
        id: 'clasico',
        nombre: 'Clásico',
        descripcion: 'El diseño original de Citiox: directo, con tarjetas y todo a mano en el celular.',
        destacados: ['Servicios en carrusel', 'Promociones y opiniones', 'Mapa y horarios'],
        familias: ['servicios', 'dental'],
        precio: 0,
        portada: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=800&auto=format&fit=crop&q=70',
    },
    {
        id: 'esencia',
        nombre: 'Esencia',
        descripcion: 'Editorial y sereno, pensado para spas, salones y centros de bienestar. Tipografía elegante, fotos grandes y un menú de servicios que invita a reservar.',
        destacados: ['Portada a pantalla completa', 'Menú de servicios con filtros y buscador', 'Equipo, resultados y opiniones con estilo de revista'],
        familias: ['servicios'],
        precio: 19,
        etiqueta: 'Nuevo',
        portada: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&auto=format&fit=crop&q=70',
    },
    {
        id: 'esmalte',
        nombre: 'Esmalte',
        descripcion: 'Precisión clínica con calidez: tonos porcelana, tipografía limpia y una arcada dental que acompaña la página. Pensado para que el paciente entienda tu forma de trabajar y reserve.',
        destacados: ['Tratamientos en lista clara con precio y reserva directa', 'Primera visita explicada paso a paso', 'Equipo, casos reales y ubicación con mapa'],
        familias: ['dental'],
        precio: 19,
        etiqueta: 'Nuevo',
        portada: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&auto=format&fit=crop&q=70',
    },
    {
        id: 'brillo',
        nombre: 'Brillo',
        descripcion: 'Para salones de uñas y peluquería. Estilo revista de belleza con una carta de tonos en el color de tu marca, precios "desde" claros y tus trabajos reales al frente para que la clienta reserve sin dudar.',
        destacados: ['Servicios separados en Uñas y Cabello, con precio y duración', 'Galería de trabajos, antes y después', 'Elige a tu especialista y reserva en un minuto'],
        familias: ['servicios'],
        precio: 19,
        etiqueta: 'Nuevo',
        portada: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&auto=format&fit=crop&q=70',
    },
];

export const DEFAULT_LANDING_DESIGN = 'clasico';

export interface LandingDesignState {
    activo: string;
    comprados: string[];
}

function parseConfig(raw: any): Record<string, any> {
    if (!raw) return {};
    if (typeof raw === 'string') {
        try { return JSON.parse(raw); } catch { return {}; }
    }
    return raw as Record<string, any>;
}

export function getLandingDesign(id?: string | null): LandingDesign | undefined {
    return LANDING_DESIGNS.find((d) => d.id === id);
}

export function designsForFamily(family: LandingFamily): LandingDesign[] {
    return LANDING_DESIGNS.filter((d) => d.familias.includes(family));
}

export function readLandingState(configuracion: any): LandingDesignState {
    const cfg = parseConfig(configuracion);
    const raw = cfg.landingDesign || {};
    const comprados = Array.isArray(raw.comprados) ? raw.comprados.filter((x: any) => typeof x === 'string') : [];
    const activo = typeof raw.activo === 'string' && getLandingDesign(raw.activo) ? raw.activo : DEFAULT_LANDING_DESIGN;
    return { activo, comprados };
}

/** ¿El negocio puede usar este diseño? Gratis, comprado, o negocio demo. */
export function canUseDesign(design: LandingDesign, state: LandingDesignState, isDemo = false): boolean {
    return design.precio === 0 || state.comprados.includes(design.id) || isDemo;
}

export function withLandingState(configuracion: any, state: LandingDesignState): Record<string, any> {
    const cfg = parseConfig(configuracion);
    return { ...cfg, landingDesign: { activo: state.activo, comprados: Array.from(new Set(state.comprados)) } };
}
