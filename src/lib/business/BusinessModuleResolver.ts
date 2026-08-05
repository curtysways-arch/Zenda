/**
 * BusinessModuleResolver.ts
 * Servicio centralizado para resolver módulos y características activas por tipo de negocio en Citiox.
 */

export type BusinessTypeEnum = 'RESERVA' | 'PRODUCTOS' | 'SHOE_CARE' | 'SPORTS_COURTS' | 'ACADEMIA' | string;

export type BusinessModule = 
    | 'APPOINTMENTS' 
    | 'CATALOG' 
    | 'ORDERS' 
    | 'DELIVERY' 
    | 'RESERVATIONS' 
    | 'ACADEMY' 
    | 'SERVICES' 
    | 'LOYALTY' 
    | 'COUPONS';

const MODULES_BY_TYPE: Record<string, BusinessModule[]> = {
    RESERVA: ['APPOINTMENTS', 'SERVICES', 'LOYALTY', 'COUPONS'],
    PRODUCTOS: ['CATALOG', 'ORDERS', 'DELIVERY', 'LOYALTY', 'COUPONS'],
    SHOE_CARE: ['ORDERS', 'DELIVERY', 'SERVICES', 'LOYALTY', 'COUPONS'],
    SPORTS_COURTS: ['RESERVATIONS', 'ACADEMY', 'LOYALTY', 'COUPONS'],
    ACADEMIA: ['ACADEMY', 'COUPONS']
};

/**
 * Retorna la lista de módulos habilitados para un tipo de negocio.
 */
export function resolveBusinessModules(tipoNegocio?: string | null): BusinessModule[] {
    if (!tipoNegocio) {
        return MODULES_BY_TYPE['RESERVA'];
    }

    const normalizedType = String(tipoNegocio).toUpperCase().trim();
    
    if (MODULES_BY_TYPE[normalizedType]) {
        return MODULES_BY_TYPE[normalizedType];
    }

    // Heurísticas de fallback si tipoNegocio contiene palabras clave
    if (normalizedType.includes('PRODUCT') || normalizedType.includes('TIENDA') || normalizedType.includes('ECOMMERCE') || normalizedType.includes('COMIDA')) {
        return MODULES_BY_TYPE['PRODUCTOS'];
    }
    if (normalizedType.includes('LAVADO') || normalizedType.includes('SNEAKER') || normalizedType.includes('CALZADO') || normalizedType.includes('SHOE')) {
        return MODULES_BY_TYPE['SHOE_CARE'];
    }
    if (normalizedType.includes('CANCHA') || normalizedType.includes('SPORT') || normalizedType.includes('PADEL') || normalizedType.includes('FUTBOL')) {
        return MODULES_BY_TYPE['SPORTS_COURTS'];
    }

    // Por defecto en Citiox los negocios son de citas/reservas (salones, spas, barberías, dentistas)
    return MODULES_BY_TYPE['RESERVA'];
}

/**
 * Verifica si un tipo de negocio tiene activado un módulo específico.
 */
export function hasModule(tipoNegocio: string | null | undefined, module: BusinessModule): boolean {
    const modules = resolveBusinessModules(tipoNegocio);
    return modules.includes(module);
}
