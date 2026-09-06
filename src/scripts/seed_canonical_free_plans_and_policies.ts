/**
 * @file seed_canonical_free_plans_and_policies.ts
 * @description Seed universal y no destructivo de Planes Free por familia y políticas explícitas PlanDataPolicy.
 * Detecta dinámicamente todas las familias, asegura máximo 1 Plan Free por familia,
 * e inicializa PlanDataPolicy explícitamente para todos los planes existentes.
 */

import prisma from '../lib/prisma';
import { DATA_RESOURCES, DATA_ACTIONS } from '../core/security/dataPolicyTypes';

const FAMILY_DEFAULT_ENTITLEMENTS: Record<string, string[]> = {
  RESTAURANTE: ['PRODUCTS', 'CATEGORIES', 'ORDERS', 'CART'],
  SERVICIOS: ['SERVICES', 'APPOINTMENTS'],
  CANCHAS: ['COURTS', 'APPOINTMENTS', 'SCHEDULES'],
  LAVANDERIA: ['ORDERS', 'WORKFLOW'],
  TIENDA: ['PRODUCTS', 'CATEGORIES', 'ORDERS', 'CART'],
};

const FAMILY_PRIMARY_RESOURCE: Record<string, string> = {
  RESTAURANTE: DATA_RESOURCES.ORDERS,
  SERVICIOS: DATA_RESOURCES.APPOINTMENTS,
  CANCHAS: DATA_RESOURCES.RESERVATIONS,
  LAVANDERIA: DATA_RESOURCES.SERVICE_ORDERS,
  TIENDA: DATA_RESOURCES.STORE_ORDERS,
};

async function main() {
  console.log('🚀 Iniciando Seed Canónico de Planes Free y Data Policies...');

  const families = await prisma.planFamily.findMany({
    include: {
      plans: {
        include: {
          dataPolicies: true,
          planEntitlements: true
        }
      }
    }
  });

  console.log(`📋 Familias detectadas en el sistema: ${families.length}`);

  const allModules = await prisma.businessModuleCatalog.findMany();
  const moduleMapByCode = new Map(allModules.map(m => [m.code, m.id]));

  for (const family of families) {
    console.log(`\n─────────────────────────────────────────────────────────`);
    console.log(`🏢 Procesando Familia: [${family.code}] ${family.name}`);

    // 1. Validar que no existan múltiples planes marcados como isFree
    const existingFreePlans = family.plans.filter(p => Boolean(p.isFree));
    if (existingFreePlans.length > 1) {
      throw new Error(`❌ Conflicto de Integridad: La familia ${family.name} tiene ${existingFreePlans.length} planes marcados como Free. Máximo permitido: 1.`);
    }

    let freePlan = existingFreePlans[0] || null;

    // 2. Si no existe Free Plan, crearlo de forma no destructiva
    if (!freePlan) {
      const freePlanId = `plan_${family.slug || family.code.toLowerCase()}_free`;
      const freePlanName = `${family.name} Free`;
      const freeSlug = `${family.slug || family.code.toLowerCase()}-free`;

      console.log(`  ➕ Creando Plan Free canónico: ${freePlanName} (${freePlanId})`);

      freePlan = await prisma.plan.create({
        data: {
          id: freePlanId,
          name: freePlanName,
          slug: freeSlug,
          description: `Plan gratuito y freemium de entrada para ${family.name}. Recibe actividad de clientes con datos estratégicos protegidos hasta suscribirte.`,
          price: 0.0,
          trial_days: 0,
          isFree: true,
          isDefault: false,
          isPublic: false,
          activo: true,
          active: true,
          displayOrder: 0,
          familyId: family.id,
          billingPeriod: 'monthly',
          currency: 'USD',
          updated_at: new Date()
        },
        include: {
          dataPolicies: true,
          planEntitlements: true
        }
      });

      // Crear entitlements base para el Plan Free
      const targetCodes = FAMILY_DEFAULT_ENTITLEMENTS[family.code] || ['PRODUCTS', 'ORDERS'];
      for (const code of targetCodes) {
        const moduleId = moduleMapByCode.get(code);
        if (moduleId) {
          await prisma.planEntitlement.upsert({
            where: {
              planId_moduleId: {
                planId: freePlan.id,
                moduleId: moduleId
              }
            },
            create: {
              planId: freePlan.id,
              moduleId: moduleId,
              enabled: true
            },
            update: { enabled: true }
          });
        }
      }

      // Crear límites base para el Plan Free
      const defaultLimits = [
        { limitKey: 'MAX_USERS', limitValue: 1 },
        { limitKey: 'MAX_PRODUCTS', limitValue: 15 },
        { limitKey: 'MAX_APPOINTMENTS_MONTHLY', limitValue: 30 },
        { limitKey: 'MAX_ORDERS_MONTHLY', limitValue: 50 },
        { limitKey: 'MAX_TABLES', limitValue: 5 },
        { limitKey: 'MAX_COURTS', limitValue: 1 },
        { limitKey: 'MAX_STAFF', limitValue: 1 }
      ];

      for (const lim of defaultLimits) {
        await prisma.planLimit.upsert({
          where: {
            planId_limitKey: {
              planId: freePlan.id,
              limitKey: lim.limitKey
            }
          },
          create: {
            planId: freePlan.id,
            limitKey: lim.limitKey,
            limitValue: lim.limitValue
          },
          update: {}
        });
      }
    } else {
      console.log(`  ✓ Plan Free existente verificado: ${freePlan.name} (${freePlan.id})`);
    }

    // 3. Configurar explícitamente las PlanDataPolicy para el Plan Free
    const primaryResource = FAMILY_PRIMARY_RESOURCE[family.code] || DATA_RESOURCES.ORDERS;
    const resourcesToConfigure = Array.from(new Set([primaryResource, DATA_RESOURCES.ORDERS, DATA_RESOURCES.APPOINTMENTS, DATA_RESOURCES.CUSTOMERS]));

    // Políticas para Plan Free: RECEIVE=ALLOW, VIEW y detalles=DENY
    for (const res of resourcesToConfigure) {
      const freeActions = [
        { action: DATA_ACTIONS.RECEIVE, effect: 'ALLOW' },
        { action: DATA_ACTIONS.VIEW, effect: 'DENY' },
        { action: DATA_ACTIONS.VIEW_DETAILS, effect: 'DENY' },
        { action: DATA_ACTIONS.VIEW_CUSTOMER, effect: 'DENY' },
        { action: DATA_ACTIONS.VIEW_CONTACT, effect: 'DENY' },
        { action: DATA_ACTIONS.VIEW_ITEMS, effect: 'DENY' },
        { action: DATA_ACTIONS.VIEW_PRICES, effect: 'DENY' },
        { action: DATA_ACTIONS.VIEW_FINANCIALS, effect: 'DENY' },
        { action: DATA_ACTIONS.MANAGE, effect: 'DENY' },
        { action: DATA_ACTIONS.EXPORT, effect: 'DENY' },
      ];

      for (const a of freeActions) {
        await prisma.planDataPolicy.upsert({
          where: {
            planId_resource_action: {
              planId: freePlan.id,
              resource: res,
              action: a.action
            }
          },
          create: {
            planId: freePlan.id,
            resource: res,
            action: a.action,
            effect: a.effect
          },
          update: {
            effect: a.effect
          }
        });
      }
    }

    // 4. Configurar explícitamente las PlanDataPolicy para los Planes Pagados de la familia
    const paidPlans = family.plans.filter(p => !p.isFree && p.id !== freePlan?.id);
    for (const paidPlan of paidPlans) {
      console.log(`  ✓ Configurando políticas explícitas para plan de pago: ${paidPlan.name}`);
      for (const res of resourcesToConfigure) {
        const paidActions = [
          { action: DATA_ACTIONS.RECEIVE, effect: 'ALLOW' },
          { action: DATA_ACTIONS.VIEW, effect: 'ALLOW' },
          { action: DATA_ACTIONS.VIEW_DETAILS, effect: 'ALLOW' },
          { action: DATA_ACTIONS.VIEW_CUSTOMER, effect: 'ALLOW' },
          { action: DATA_ACTIONS.VIEW_CONTACT, effect: 'ALLOW' },
          { action: DATA_ACTIONS.VIEW_ITEMS, effect: 'ALLOW' },
          { action: DATA_ACTIONS.VIEW_PRICES, effect: 'ALLOW' },
          { action: DATA_ACTIONS.VIEW_FINANCIALS, effect: 'ALLOW' },
          { action: DATA_ACTIONS.MANAGE, effect: 'ALLOW' },
          { action: DATA_ACTIONS.EXPORT, effect: 'ALLOW' },
        ];

        for (const a of paidActions) {
          await prisma.planDataPolicy.upsert({
            where: {
              planId_resource_action: {
                planId: paidPlan.id,
                resource: res,
                action: a.action
              }
            },
            create: {
              planId: paidPlan.id,
              resource: res,
              action: a.action,
              effect: a.effect
            },
            update: {} // No sobrescribir si el superadmin ya configuró alguna restricción personalizada
          });
        }
      }
    }
  }

  console.log('\n─────────────────────────────────────────────────────────');
  console.log('✅ SEED CANÓNICO DE PLANES FREE Y DATA POLICIES COMPLETADO EXITOSAMENTE');
}

main()
  .catch(err => {
    console.error('❌ Error en seed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
