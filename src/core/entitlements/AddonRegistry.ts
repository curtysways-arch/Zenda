/**
 * @file AddonRegistry.ts
 * @module core/entitlements
 * @description Catálogo estandarizado de Add-ons para Citiox.
 * @responsibility Definir tipos de Addons (CAPABILITY vs LIMIT), reglas de acumulabilidad y catálogo disponible.
 */

export type AddonType = 'CAPABILITY' | 'LIMIT';

export interface AddonDefinition {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  type: AddonType;
  targetKey: string; // ID de capability (ej. 'ECOMMERCE', 'DELIVERY') o nombre de límite (ej. 'branches', 'professionals', 'appointmentsMonthly', 'products')
  amount?: number;   // Cantidad incrementada si es de tipo LIMIT (ej. +1, +5, +500)
  stackable: boolean; // Si permite múltiples contrataciones acumulativas (ej. +1 sucursal extra x2)
  maxQuantity?: number;
  active: boolean;
}

export const SYSTEM_ADDONS: AddonDefinition[] = [
  {
    id: 'ADDON_ECOMMERCE',
    name: 'Venta de productos online',
    description: 'Tienda en tu página con carrito y pedidos: retiro en el local o envío a domicilio con tus propios repartidores. Disponible para cualquier tipo de negocio.',
    priceMonthly: 15.00,
    type: 'CAPABILITY',
    targetKey: 'ECOMMERCE',
    stackable: false,
    active: true
  },
  {
    id: 'ADDON_DELIVERY',
    name: 'Add-on Delivery & Rastreo GPS',
    description: 'Activa la bolsa de repartidores y monitoreo en tiempo real',
    priceMonthly: 12.00,
    type: 'CAPABILITY',
    targetKey: 'DELIVERY',
    stackable: false,
    active: true
  },
  {
    id: 'ADDON_PROMOTIONS',
    name: 'Add-on Promociones & Descuentos',
    description: 'Activa cupones, combos y reglas de descuento automáticas',
    priceMonthly: 8.00,
    type: 'CAPABILITY',
    targetKey: 'PROMOTIONS',
    stackable: false,
    active: true
  },
  {
    id: 'ADDON_BRANCH_EXTRA',
    name: 'Add-on Sucursal Adicional',
    description: 'Aumenta el límite en +1 sucursal operativa extra',
    priceMonthly: 10.00,
    type: 'LIMIT',
    targetKey: 'branches',
    amount: 1,
    stackable: true,
    maxQuantity: 10,
    active: true
  },
  {
    id: 'ADDON_PROFESSIONAL_EXTRA',
    name: 'Add-on Profesional Extra',
    description: 'Aumenta el límite en +3 profesionales / personal de agenda',
    priceMonthly: 7.00,
    type: 'LIMIT',
    targetKey: 'professionals',
    amount: 3,
    stackable: true,
    maxQuantity: 10,
    active: true
  },
  {
    id: 'ADDON_APPOINTMENTS_EXTRA',
    name: 'Add-on Pack 500 Citas Mensuales',
    description: 'Aumenta la cuota mensual en +500 citas/reservas adicionales',
    priceMonthly: 9.00,
    type: 'LIMIT',
    targetKey: 'appointmentsMonthly',
    amount: 500,
    stackable: true,
    maxQuantity: 5,
    active: true
  },
  {
    id: 'ADDON_COMMUNICATION_CENTER',
    name: 'Add-on Centro de Comunicaciones',
    description: 'Envío masivo de mensajes Push y WhatsApp segmentados a tus clientes',
    priceMonthly: 12.00,
    type: 'CAPABILITY',
    targetKey: 'COMMUNICATION_CENTER',
    stackable: false,
    active: true
  },
  {
    id: 'ADDON_LOYALTY',
    name: 'Add-on Club de Beneficios & Fidelización',
    description: 'Niveles VIP, misiones por recompensas, catálogo de canjes y cashback para tus clientes',
    priceMonthly: 12.00,
    type: 'CAPABILITY',
    targetKey: 'LOYALTY',
    stackable: false,
    active: true
  },
  {
    id: 'ADDON_COURSES',
    name: 'Add-on Academia, Cursos & Talleres',
    description: 'Gestión de academias, talleres, masterclasses, alumnos, cupos y pase de asistencia',
    priceMonthly: 14.00,
    type: 'CAPABILITY',
    targetKey: 'COURSES',
    stackable: false,
    active: true
  },
  {
    id: 'ADDON_KITCHEN',
    name: 'Add-on Pantalla de Cocina (KDS)',
    description: 'Comandas digitales en tiempo real con tiempos de preparación y despacho',
    priceMonthly: 10.00,
    type: 'CAPABILITY',
    targetKey: 'KITCHEN',
    stackable: false,
    active: true
  },
  {
    id: 'ADDON_PURCHASES_SUPPLIERS',
    name: 'Add-on Compras & Proveedores',
    description: 'Gestión de catálogo de proveedores, órdenes de compra y recepción con costos',
    priceMonthly: 12.00,
    type: 'CAPABILITY',
    targetKey: 'PURCHASES',
    stackable: false,
    active: true
  },
  {
    id: 'ADDON_RECIPES_PRODUCTION',
    name: 'Add-on Recetas & Producción',
    description: 'Fórmulas, órdenes de producción, descuento de materias primas y costeo de lotes',
    priceMonthly: 18.00,
    type: 'CAPABILITY',
    targetKey: 'PRODUCTION',
    stackable: false,
    active: true
  },
  {
    id: 'ADDON_MULTI_WAREHOUSE',
    name: 'Add-on Multi-Bodega & Transferencias',
    description: 'Gestión de múltiples bodegas de insumos y transferencias de existencias',
    priceMonthly: 10.00,
    type: 'CAPABILITY',
    targetKey: 'MULTI_WAREHOUSE',
    stackable: false,
    active: true
  },
  {
    id: 'ADDON_ELECTRONIC_BILLING',
    name: 'Add-on Facturación Electrónica SRI',
    description: 'Emisión de facturas y notas de crédito con clave de acceso oficial SRI Ecuador',
    priceMonthly: 15.00,
    type: 'CAPABILITY',
    targetKey: 'ELECTRONIC_BILLING',
    stackable: false,
    active: true
  },
  {
    id: 'ADDON_PAYROLL',
    name: 'Add-on Personal & Nómina',
    description: 'Control de empleados, roles de pago, anticipos y liquidación salarial',
    priceMonthly: 12.00,
    type: 'CAPABILITY',
    targetKey: 'PAYROLL',
    stackable: false,
    active: true
  }
];

export class AddonRegistry {
  private static addons = new Map<string, AddonDefinition>(
    SYSTEM_ADDONS.map(a => [a.id, a])
  );

  public static getAll(): AddonDefinition[] {
    return Array.from(this.addons.values());
  }

  public static get(id: string): AddonDefinition | undefined {
    return this.addons.get(id);
  }

  public static register(addon: AddonDefinition): void {
    this.addons.set(addon.id, addon);
  }
}
