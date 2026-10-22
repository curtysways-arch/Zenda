/**
 * Catálogo REAL de plantillas de página pública, por tipo de negocio.
 *
 * Refleja exactamente cómo app/[slug]/page.tsx decide qué landing mostrar:
 *   dental → restaurante → tienda → pinchos → lavandería → canchas → gimnasio → servicios
 * y, dentro de servicios y dental, los diseños de la tienda de diseños (lib/landingDesigns.ts),
 * que se pueden previsualizar con ?diseno=<id>.
 */
import {
    isDentalBusiness, isRestaurantBusiness, isStoreBusiness, isLaundryOrShoeCareBusiness, isGymBusiness, BusinessLike,
} from '@/lib/businessTypeHelper';
import { ModuleResolver } from '@/lib/modules/ModuleResolver';
import { LANDING_DESIGNS, readLandingState } from '@/lib/landingDesigns';

export type VerticalId = 'servicios' | 'dental' | 'gym' | 'restaurante' | 'tienda' | 'lavanderia' | 'canchas';

export interface TemplateVariant {
    id: string;                 // único en todo el catálogo
    verticalId: VerticalId;
    nombre: string;
    descripcion: string;
    destacados: string[];
    componente: string;         // componente que la dibuja (referencia técnica)
    precio: number;             // 0 = incluida
    etiqueta?: string;
    predeterminada: boolean;
    /** Valor de ?diseno= para previsualizarla; null si la vertical no tiene diseños. */
    diseno: string | null;
    /** Solo para la variante de pinchos: necesita un negocio con slug de pinchos. */
    soloPinchos?: boolean;
}

export interface VerticalDef {
    id: VerticalId;
    nombre: string;
    descripcion: string;
    color: string;
}

export const VERTICALS: VerticalDef[] = [
    { id: 'servicios', nombre: 'Spa, salones y servicios con cita', descripcion: 'Spas, peluquerías, barberías, uñas, estética y cualquier servicio que se reserva por hora.', color: '#7c3aed' },
    { id: 'dental', nombre: 'Clínicas dentales', descripcion: 'Consultorios y clínicas odontológicas con agenda de pacientes.', color: '#0ea5e9' },
    { id: 'gym', nombre: 'Gimnasios', descripcion: 'Membresías, clases y control de acceso.', color: '#ef4444' },
    { id: 'restaurante', nombre: 'Restaurantes y cafeterías', descripcion: 'Menú digital, pedidos a la mesa, para llevar o a domicilio.', color: '#f97316' },
    { id: 'tienda', nombre: 'Tiendas', descripcion: 'Catálogo de productos con carrito, retiro o envío.', color: '#db2777' },
    { id: 'lavanderia', nombre: 'Lavanderías y cuidado de calzado', descripcion: 'Órdenes con retiro y entrega a domicilio o en el local.', color: '#0891b2' },
    { id: 'canchas', nombre: 'Canchas deportivas', descripcion: 'Reserva de canchas por turno, torneos y academias.', color: '#16a34a' },
];

function designVariants(verticalId: VerticalId, family: 'servicios' | 'dental', baseNombre: string, baseDesc: string, baseComp: string): TemplateVariant[] {
    return LANDING_DESIGNS.filter((d) => (d.familias as string[]).includes(family)).map((d) => ({
        id: `${verticalId}-${d.id}`,
        verticalId,
        nombre: d.id === 'clasico' ? baseNombre : d.nombre,
        descripcion: d.id === 'clasico' ? baseDesc : d.descripcion,
        destacados: d.destacados,
        componente: d.id === 'clasico' ? baseComp : d.id === 'esencia' ? 'SpaEsenciaLanding' : d.id === 'brillo' ? 'SalonBrilloLanding' : d.id === 'esmalte' ? 'DentalEsmalteLanding' : d.id,
        precio: d.precio,
        etiqueta: d.etiqueta,
        predeterminada: d.id === 'clasico',
        diseno: d.id,
    }));
}

export function templateVariants(): TemplateVariant[] {
    const single = (verticalId: VerticalId, id: string, nombre: string, descripcion: string, destacados: string[], componente: string, extra: Partial<TemplateVariant> = {}): TemplateVariant =>
        ({ id, verticalId, nombre, descripcion, destacados, componente, precio: 0, predeterminada: true, diseno: null, ...extra });
    return [
        ...designVariants('servicios', 'servicios', 'Clásico', 'El diseño original: directo, con tarjetas y todo a mano en el celular.', 'HomeServicesClient'),
        ...designVariants('dental', 'dental', 'Clásico dental', 'Agenda de pacientes, tratamientos y equipo en un diseño directo.', 'DentalLanding'),
        single('gym', 'gym-base', 'Gimnasio', 'Planes de membresía, áreas, equipos y clases.', ['Planes y membresías', 'Áreas y equipos', 'Promociones'], 'HomeServicesClient (módulo gym)'),
        single('restaurante', 'restaurante-base', 'Menú y pedidos', 'Menú digital por secciones con carrito para mesa, retiro o domicilio.', ['Menú por categorías', 'Carrito y checkout', 'Seguimiento del pedido'], 'RestaurantLanding'),
        single('tienda', 'tienda-base', 'Tienda online', 'Vitrina de productos con variantes, stock y carrito.', ['Catálogo con filtros', 'Variantes y stock', 'Retiro o envío'], 'StoreLanding'),
        single('tienda', 'tienda-pinchos', 'Pinchos y comida rápida', 'Catálogo rápido con carrito flotante y seguimiento del pedido en vivo.', ['Carrito flotante', 'Checkout corto', 'Pedido en vivo'], 'PinchosStoreModule', { predeterminada: false, soloPinchos: true }),
        single('lavanderia', 'lavanderia-base', 'Lavandería', 'Pide el retiro a domicilio, sigue la orden y paga al recibir.', ['Retiro y entrega a domicilio', 'Seguimiento de la orden', 'Tienda opcional'], 'LaundryLanding'),
        single('canchas', 'canchas-base', 'Canchas', 'Turnos libres por cancha, reserva y pago, torneos y academias.', ['Turnos en tiempo real', 'Torneos y academias', 'Reserva con pago'], 'CanchaPublicLanding'),
    ];
}

/** Misma lógica de prioridad que app/[slug]/page.tsx. */
export function verticalOf(n: BusinessLike & { slug?: string | null }): VerticalId {
    const slug = String(n.slug || '');
    if (isDentalBusiness(n)) return 'dental';
    if (isRestaurantBusiness(n)) return 'restaurante';
    if (isStoreBusiness(n, '') && !ModuleResolver.isPinchosModule(slug)) return 'tienda';
    if (String(n.tipoNegocio || '').toUpperCase() === 'PRODUCTOS' && ModuleResolver.isPinchosModule(slug)) return 'tienda';
    if (isLaundryOrShoeCareBusiness(n)) return 'lavanderia';
    const cfgTipo = (n.configuracion as any)?.tipoNegocio;
    if (n.tipoNegocio === 'SPORTS_COURTS' || cfgTipo === 'SPORTS_COURTS' || slug.includes('canchas')) return 'canchas';
    if (isGymBusiness(n)) return 'gym';
    return 'servicios';
}

/** Qué plantilla está viendo hoy el público de ese negocio. */
export function variantOf(n: BusinessLike & { slug?: string | null }, vertical: VerticalId = verticalOf(n)): string {
    if (vertical === 'tienda') return ModuleResolver.isPinchosModule(String(n.slug || '')) && String(n.tipoNegocio || '').toUpperCase() === 'PRODUCTOS' ? 'tienda-pinchos' : 'tienda-base';
    if (vertical === 'servicios' || vertical === 'dental') {
        const activo = readLandingState(n.configuracion).activo;
        const exists = templateVariants().some((v) => v.id === `${vertical}-${activo}`);
        return exists ? `${vertical}-${activo}` : `${vertical}-clasico`;
    }
    return `${vertical}-base`;
}
