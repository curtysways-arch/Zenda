/**
 * src/lib/businessTypeHelper.ts
 * Helper centralizado para determinar la vertical/tipo de negocio y normalizar configuraciones.
 * Evita divergencias entre el enrutador público [slug]/page.tsx, el dashboard /admin/page.tsx,
 * el Sidebar y los menús móviles.
 */

export interface BusinessLike {
    id?: string;
    slug?: string | null;
    nombre?: string | null;
    tipoNegocio?: string | null;
    configuracion?: any;
    businessTypeId?: string | null;
    BusinessType?: {
        name?: string | null;
        slug?: string | null;
    } | null;
}

/**
 * Normaliza la configuración de un negocio garantizando que no existan fragmentaciones
 * de strings JSON serializados como objetos con índices ('0': '{', etc.).
 */
export function normalizeBusinessConfig(rawConfig: any): Record<string, any> {
    if (!rawConfig) return {};

    let config: any = rawConfig;

    if (typeof rawConfig === 'string') {
        try {
            config = JSON.parse(rawConfig);
        } catch {
            return {};
        }
    }

    // Reparar objetos corrompidos con claves numéricas
    if (config && typeof config === 'object' && config['0'] !== undefined) {
        try {
            const numericKeys = Object.keys(config)
                .filter(k => !isNaN(Number(k)))
                .sort((a, b) => Number(a) - Number(b));
            
            if (numericKeys.length > 0 && config['0'] === '{') {
                const str = numericKeys.map(k => config[k]).join('');
                const parsed = JSON.parse(str);
                config = { ...parsed, ...config };
                numericKeys.forEach(k => delete config[k]);
            }
        } catch {
            // Si falla el parseo de la cadena fragmentada, continuar con lo que se tiene
        }
    }

    return config && typeof config === 'object' ? config : {};
}

/**
 * Extrae todas las señales de tipo/vertical de un negocio (tipoNegocio, blueprintId, slug, nombre).
 */
export function getBusinessVerticalSignals(negocio: BusinessLike | null | undefined) {
    if (!negocio) {
        return {
            tipoUpper: '',
            slugUpper: '',
            nameUpper: '',
            blueprintId: '',
            configTipoUpper: '',
            btSlugUpper: '',
            btNameUpper: ''
        };
    }

    const cfg = normalizeBusinessConfig(negocio.configuracion);
    const tipoUpper = (negocio.tipoNegocio || '').toUpperCase().trim();
    const slugUpper = (negocio.slug || '').toUpperCase().trim();
    const nameUpper = (negocio.nombre || '').toUpperCase().trim();
    const blueprintId = (cfg.blueprintId || '').toUpperCase().trim();
    const configTipoUpper = (cfg.tipoNegocio || '').toUpperCase().trim();
    const btSlugUpper = (negocio.BusinessType?.slug || '').toUpperCase().trim();
    const btNameUpper = (negocio.BusinessType?.name || '').toUpperCase().trim();

    return {
        tipoUpper,
        slugUpper,
        nameUpper,
        blueprintId,
        configTipoUpper,
        btSlugUpper,
        btNameUpper
    };
}

/**
 * 1. LAVANDERÍA / CUIDADO DE CALZADO / SNEAKER WASH / ÓRDENES DE SERVICIO
 * Demo correspondiente: /demo-lavado, /lavado
 * Componente Landing: ShoeCareLanding
 * Componente Admin: ShoeCareBackoffice
 */
export function isLaundryOrShoeCareBusiness(negocio: BusinessLike | null | undefined): boolean {
    const s = getBusinessVerticalSignals(negocio);

    const matchesType = [
        'LAVANDERIA',
        'LAVANDERIAS',
        'SHOE_CARE',
        'ORDENES-SERVICIO',
        'ORDENES_SERVICIO',
        'LAVADO',
        'SNEAKER_WASH',
        'TINTORERIA'
    ].includes(s.tipoUpper) || [
        'LAVANDERIA',
        'SHOE_CARE',
        'ORDENES-SERVICIO',
        'ORDENES_SERVICIO',
        'LAVADO'
    ].includes(s.blueprintId) || [
        'LAVANDERIA',
        'SHOE_CARE',
        'ORDENES-SERVICIO',
        'ORDENES_SERVICIO',
        'LAVADO'
    ].includes(s.configTipoUpper) || [
        'LAVANDERIA',
        'SHOE-CARE',
        'ORDENES-SERVICIO'
    ].includes(s.btSlugUpper);

    if (matchesType) return true;

    // Búsqueda por palabras clave en slug o nombre
    const hasKeywords = 
        s.slugUpper.includes('LAVADO') ||
        s.slugUpper.includes('LAVANDERIA') ||
        s.slugUpper.includes('SNEAKER') ||
        s.slugUpper.includes('WASH') ||
        s.slugUpper.includes('BUBBLE') ||
        s.nameUpper.includes('LAVANDERIA') ||
        s.nameUpper.includes('SNEAKER') ||
        s.nameUpper.includes('BUBBLE') ||
        (s.nameUpper.includes('LAVADO') && !s.nameUpper.includes('CANCHA'));

    return hasKeywords;
}

/**
 * 2. GIMNASIO / FITNESS
 * Componente Landing: GymLanding (o sección Gym en [slug])
 * Componente Admin: GymAdminDashboard
 */
export function isGymBusiness(negocio: BusinessLike | null | undefined): boolean {
    const s = getBusinessVerticalSignals(negocio);

    const matchesType = [
        'GIMNASIO',
        'GYM',
        'FITNESS'
    ].includes(s.tipoUpper) || [
        'GIMNASIO',
        'GYM',
        'FITNESS'
    ].includes(s.blueprintId) || [
        'GIMNASIO',
        'GYM',
        'FITNESS'
    ].includes(s.configTipoUpper);

    if (matchesType) return true;

    return (
        s.slugUpper.includes('GYM') ||
        s.slugUpper.includes('FITNESS') ||
        s.slugUpper.includes('VORTEX') ||
        s.nameUpper.includes('GYM') ||
        s.nameUpper.includes('GIMNASIO') ||
        s.nameUpper.includes('FITNESS')
    );
}

/**
 * 3. ODONTOLOGÍA / DENTISTA
 * Demo correspondiente: /dentarmony
 * Componente Landing: DentalLanding
 * Componente Admin: DentalAdminDashboard
 */
export function isDentalBusiness(negocio: BusinessLike | null | undefined): boolean {
    const s = getBusinessVerticalSignals(negocio);

    const matchesType = [
        'ODONTOLOGIA',
        'DENTAL',
        'DENTISTA',
        'CLINICA_DENTAL'
    ].includes(s.tipoUpper) || [
        'ODONTOLOGIA',
        'DENTAL',
        'DENTISTA'
    ].includes(s.blueprintId) || [
        'ODONTOLOGIA',
        'DENTAL',
        'DENTISTA'
    ].includes(s.configTipoUpper);

    if (matchesType) return true;

    return (
        s.slugUpper.includes('DENTAL') ||
        s.slugUpper.includes('ODONTOL') ||
        s.slugUpper.includes('DENTISTA') ||
        s.slugUpper.includes('DENTAR') ||
        s.nameUpper.includes('DENTAL') ||
        s.nameUpper.includes('ODONTOL') ||
        s.nameUpper.includes('DENTISTA') ||
        s.nameUpper.includes('DENTAR')
    );
}

/**
 * 4. RESTAURANTE / GASTRONOMÍA / BAR
 * Demo correspondiente: /restaurantes
 * Componente Landing: RestaurantLanding
 * Componente Admin: RestaurantDashboard
 */
export function isRestaurantBusiness(negocio: BusinessLike | null | undefined): boolean {
    const s = getBusinessVerticalSignals(negocio);

    const matchesType = [
        'RESTAURANTE',
        'RESTAURANT',
        'GASTRONOMIA',
        'BAR',
        'COMIDA',
        'CAFETERIA',
        'PIZZERIA'
    ].includes(s.tipoUpper) || [
        'RESTAURANTE',
        'RESTAURANT',
        'GASTRONOMIA',
        'BAR'
    ].includes(s.blueprintId) || [
        'RESTAURANTE',
        'RESTAURANT',
        'GASTRONOMIA',
        'BAR'
    ].includes(s.configTipoUpper);

    if (matchesType) return true;

    return (
        s.slugUpper.includes('PARRILLA') ||
        s.slugUpper.includes('RESTAURANT') ||
        s.slugUpper.includes('GASTRO') ||
        s.slugUpper.includes('BURGER') ||
        s.slugUpper.includes('PIZZA') ||
        s.slugUpper.includes('TACO') ||
        s.nameUpper.includes('PARRILLA') ||
        s.nameUpper.includes('RESTAURANTE') ||
        s.nameUpper.includes('GASTRONOMIA') ||
        s.nameUpper.includes('BURGER') ||
        s.nameUpper.includes('PIZZA') ||
        s.nameUpper.includes('TACO')
    );
}

/**
 * 5. CANCHAS DEPORTIVAS / CLUBES
 * Demo correspondiente: /canchas
 * Componente Landing: CanchaPublicLanding
 * Componente Admin: CanchaAdminDashboard
 */
export function isSportsCourtsBusiness(negocio: BusinessLike | null | undefined): boolean {
    const s = getBusinessVerticalSignals(negocio);

    const matchesType = [
        'SPORTS_COURTS',
        'CANCHAS',
        'SPORTS',
        'PADEL',
        'FUTBOL'
    ].includes(s.tipoUpper) || [
        'SPORTS_COURTS',
        'CANCHAS',
        'SPORTS'
    ].includes(s.blueprintId) || [
        'SPORTS_COURTS',
        'CANCHAS',
        'SPORTS'
    ].includes(s.configTipoUpper);

    if (matchesType) return true;

    return (
        s.slugUpper.includes('CANCHA') ||
        s.slugUpper.includes('CAMPEONES') ||
        s.slugUpper.includes('PADEL') ||
        s.nameUpper.includes('CANCHA') ||
        s.nameUpper.includes('COMPLEJO') ||
        s.nameUpper.includes('CAMPEONES') ||
        s.nameUpper.includes('PADEL') ||
        s.nameUpper.includes('SINTETICA')
    );
}

/**
 * 6. TIENDA / ECOMMERCE / PRODUCTOS
 * Demo correspondiente: /tiendas
 * Componente Landing: StoreLanding / PinchosStoreModule
 * Componente Admin: StoreDashboard / ProductsDashboard
 */
export function isStoreBusiness(negocio: BusinessLike | null | undefined, viewParam: string = ''): boolean {
    // Si ya coincide con lavandería, dental, restaurante, gym o canchas, no debe ser absorbido por tienda a menos que sea explícito
    if (isDentalBusiness(negocio)) return false;
    if (isLaundryOrShoeCareBusiness(negocio)) return false;
    if (isRestaurantBusiness(negocio)) return false;
    if (isGymBusiness(negocio)) return false;
    if (isSportsCourtsBusiness(negocio)) return false;

    const s = getBusinessVerticalSignals(negocio);
    const viewUpper = (viewParam || '').toUpperCase().trim();

    if (viewUpper === 'TIENDA' || viewUpper === 'STORE') return true;

    const matchesType = [
        'TIENDA',
        'STORE',
        'ECOMMERCE',
        'E_COMMERCE',
        'PRODUCTOS',
        'PRODUCTO',
        'TIENDA_ONLINE'
    ].includes(s.tipoUpper) || [
        'STORE',
        'TIENDA',
        'ECOMMERCE'
    ].includes(s.blueprintId) || [
        'STORE',
        'TIENDA',
        'ECOMMERCE'
    ].includes(s.configTipoUpper);

    return matchesType;
}
