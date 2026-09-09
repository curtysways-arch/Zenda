/**
 * @file seed_addons_canonical.ts
 * @description Seed unificado e idempotente para el catálogo canónico de Add-ons de Citiox.
 * 
 * Reglas:
 * - Unifica AddonRegistry y SUBSCRIPTION_ADDONS sin eliminar conceptos.
 * - Mantiene separados MAX_APPOINTMENTS_MONTHLY y MAX_ORDERS_MONTHLY.
 * - Los targetKey se enlazan con claves existentes de PlanLimit y BusinessModuleCatalog.
 */

import prisma from '../lib/prisma';

export const CANONICAL_ADDONS = [
  // ─── ⚡ ACTIVADORES DE CAPACIDAD (CAPABILITY) ──────────────────────────────────
  {
    code: 'ADDON_ECOMMERCE',
    name: 'E-commerce Tienda Online',
    description: 'Activa el catálogo interactivo de ventas online y carrito para clientes.',
    icon: 'ShoppingCart',
    type: 'CAPABILITY' as const,
    targetKey: 'ECOMMERCE',
    amount: null,
    stackable: false,
    maxQuantity: null,
    priceMonthly: 15.00,
    priceAnnual: 144.00,
    currency: 'USD',
    applicableFamilies: null,
    active: true,
    sortOrder: 1
  },
  {
    code: 'ADDON_DELIVERY',
    name: 'Delivery & Rastreo GPS',
    description: 'Habilita despacho a domicilio, gestión de repartidores y monitoreo en tiempo real.',
    icon: 'Truck',
    type: 'CAPABILITY' as const,
    targetKey: 'DELIVERY',
    amount: null,
    stackable: false,
    maxQuantity: null,
    priceMonthly: 12.00,
    priceAnnual: 120.00,
    currency: 'USD',
    applicableFamilies: null,
    active: true,
    sortOrder: 2
  },
  {
    code: 'ADDON_PROMOTIONS',
    name: 'Promociones & Descuentos',
    description: 'Desbloquea cupones con límite de uso, reglas de descuento automáticas y banners.',
    icon: 'Tag',
    type: 'CAPABILITY' as const,
    targetKey: 'PROMOTIONS',
    amount: null,
    stackable: false,
    maxQuantity: null,
    priceMonthly: 8.00,
    priceAnnual: 80.00,
    currency: 'USD',
    applicableFamilies: null,
    active: true,
    sortOrder: 3
  },
  {
    code: 'ADDON_COMMUNICATION_CENTER',
    name: 'Centro de Comunicaciones Masivas',
    description: 'Campañas de difusión masiva y segmentada por WhatsApp y notificaciones Push.',
    icon: 'MessageSquare',
    type: 'CAPABILITY' as const,
    targetKey: 'COMMUNICATION_CENTER',
    amount: null,
    stackable: false,
    maxQuantity: null,
    priceMonthly: 12.00,
    priceAnnual: 120.00,
    currency: 'USD',
    applicableFamilies: null,
    active: true,
    sortOrder: 4
  },
  {
    code: 'ADDON_API_ACCESS',
    name: 'Acceso a API & Webhooks',
    description: 'Habilita claves de API dedicadas y webhooks para integrar con sistemas externos.',
    icon: 'Code',
    type: 'CAPABILITY' as const,
    targetKey: 'API',
    amount: null,
    stackable: false,
    maxQuantity: null,
    priceMonthly: 25.00,
    priceAnnual: 250.00,
    currency: 'USD',
    applicableFamilies: null,
    active: true,
    sortOrder: 5
  },

  // ─── 📈 EXTENSIONES DE LÍMITE (LIMIT) ─────────────────────────────────────────
  {
    code: 'ADDON_BRANCH_EXTRA',
    name: 'Sucursal Operativa Adicional',
    description: 'Aumenta tu capacidad en +1 sucursal operable simultánea.',
    icon: 'Building2',
    type: 'LIMIT' as const,
    targetKey: 'MAX_BRANCHES',
    amount: 1,
    stackable: true,
    maxQuantity: 10,
    priceMonthly: 10.00,
    priceAnnual: 100.00,
    currency: 'USD',
    applicableFamilies: null,
    active: true,
    sortOrder: 10
  },
  {
    code: 'ADDON_USER_EXTRA',
    name: 'Colaborador / Usuario Adicional',
    description: 'Aumenta el límite en +1 usuario administrativo o cajero para tu equipo.',
    icon: 'Users',
    type: 'LIMIT' as const,
    targetKey: 'MAX_USERS',
    amount: 1,
    stackable: true,
    maxQuantity: 20,
    priceMonthly: 5.00,
    priceAnnual: 50.00,
    currency: 'USD',
    applicableFamilies: null,
    active: true,
    sortOrder: 11
  },
  {
    code: 'ADDON_STAFF_EXTRA',
    name: 'Profesional / Personal de Agenda Adicional',
    description: 'Aumenta tu cupo en +3 profesionales o especialistas para atención y turnos.',
    icon: 'UserCheck',
    type: 'LIMIT' as const,
    targetKey: 'MAX_STAFF',
    amount: 3,
    stackable: true,
    maxQuantity: 10,
    priceMonthly: 7.00,
    priceAnnual: 70.00,
    currency: 'USD',
    applicableFamilies: null,
    active: true,
    sortOrder: 12
  },
  {
    code: 'ADDON_APPOINTMENTS_EXTRA',
    name: 'Pack 500 Citas / Reservas Mensuales',
    description: 'Aumenta la cuota mensual en +500 citas o reservas en línea adicionales.',
    icon: 'Calendar',
    type: 'LIMIT' as const,
    targetKey: 'MAX_APPOINTMENTS_MONTHLY',
    amount: 500,
    stackable: true,
    maxQuantity: 10,
    priceMonthly: 9.00,
    priceAnnual: 90.00,
    currency: 'USD',
    applicableFamilies: null,
    active: true,
    sortOrder: 13
  },
  {
    code: 'ADDON_ORDERS_EXTRA',
    name: 'Pack 1,000 Transacciones / Pedidos Mensuales',
    description: 'Amplía tu cupo operativo mensual en +1,000 pedidos o transacciones.',
    icon: 'ShoppingBag',
    type: 'LIMIT' as const,
    targetKey: 'MAX_ORDERS_MONTHLY',
    amount: 1000,
    stackable: true,
    maxQuantity: 10,
    priceMonthly: 15.00,
    priceAnnual: 150.00,
    currency: 'USD',
    applicableFamilies: null,
    active: true,
    sortOrder: 14
  }
];

export async function seedCanonicalAddons() {
  console.log('🔄 Iniciando Seed de Catálogo Canónico de Add-ons...');
  let upserted = 0;

  for (const addon of CANONICAL_ADDONS) {
    await prisma.addon.upsert({
      where: { code: addon.code },
      update: {
        name: addon.name,
        description: addon.description,
        icon: addon.icon,
        type: addon.type,
        targetKey: addon.targetKey,
        amount: addon.amount,
        stackable: addon.stackable,
        maxQuantity: addon.maxQuantity,
        priceMonthly: addon.priceMonthly,
        priceAnnual: addon.priceAnnual,
        currency: addon.currency,
        applicableFamilies: addon.applicableFamilies,
        active: addon.active,
        sortOrder: addon.sortOrder
      },
      create: {
        code: addon.code,
        name: addon.name,
        description: addon.description,
        icon: addon.icon,
        type: addon.type,
        targetKey: addon.targetKey,
        amount: addon.amount,
        stackable: addon.stackable,
        maxQuantity: addon.maxQuantity,
        priceMonthly: addon.priceMonthly,
        priceAnnual: addon.priceAnnual,
        currency: addon.currency,
        applicableFamilies: addon.applicableFamilies,
        active: addon.active,
        sortOrder: addon.sortOrder
      }
    });
    upserted++;
    console.log(`  ✓ Addon sincronizado: [${addon.code}] - ${addon.name} ($${addon.priceMonthly}/mes)`);
  }

  console.log(`✅ Seed de Add-ons finalizado. Total: ${upserted} add-ons registrados en base de datos.`);
}

if (require.main === module) {
  seedCanonicalAddons()
    .catch(err => {
      console.error('❌ Error en seed de addons:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
