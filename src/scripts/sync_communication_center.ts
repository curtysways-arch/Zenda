/**
 * sync_communication_center.ts
 * Sincroniza el módulo COMMUNICATION_CENTER en BusinessModuleCatalog
 * y crea los PlanEntitlement en todos los planes Pro de cada vertical.
 *
 * Uso: npx tsx src/scripts/sync_communication_center.ts
 */

import prisma from '../lib/prisma';

const COMMUNICATION_MODULE = {
    code: 'COMMUNICATION_CENTER',
    name: 'Centro de Comunicación',
    icon: 'MessageSquare',
    description: 'Campañas de difusión por WhatsApp y Push a clientes segmentados'
};

// Planes Pro que deben tener COMMUNICATION_CENTER incluido por defecto
const PRO_PLAN_IDS = [
    'plan_restaurante_pro',
    'plan_servicios_pro',
    'plan_canchas_academia',
    'plan_lavanderia_pro',
    'plan_tienda_pro'
];

async function main() {
    console.log('=================================================================');
    console.log(' SYNC: COMMUNICATION_CENTER → BusinessModuleCatalog + PlanEntitlement');
    console.log('=================================================================\n');

    // 1. Upsert del módulo en BusinessModuleCatalog
    console.log('[1] Sincronizando BusinessModuleCatalog...');
    const module = await (prisma as any).businessModuleCatalog.upsert({
        where: { code: COMMUNICATION_MODULE.code },
        create: {
            code: COMMUNICATION_MODULE.code,
            name: COMMUNICATION_MODULE.name,
            icon: COMMUNICATION_MODULE.icon,
            description: COMMUNICATION_MODULE.description,
            active: true
        },
        update: {
            name: COMMUNICATION_MODULE.name,
            icon: COMMUNICATION_MODULE.icon,
            description: COMMUNICATION_MODULE.description,
            active: true
        }
    });
    console.log(`  ✓ BusinessModuleCatalog ID: ${module.id} (code: ${module.code})\n`);

    // 2. Verificar planes Pro en BD
    console.log('[2] Verificando planes Pro en BD...');
    const proPlanIds = PRO_PLAN_IDS;
    const proPlanDetails = await prisma.plan.findMany({
        where: { id: { in: proPlanIds } },
        select: { id: true, name: true }
    });

    const foundIds = new Set(proPlanDetails.map(p => p.id));
    for (const planId of proPlanIds) {
        if (!foundIds.has(planId)) {
            console.warn(`  ⚠ Plan "${planId}" NO encontrado en BD — omitiendo`);
        }
    }
    console.log(`  ✓ ${proPlanDetails.length} planes Pro encontrados\n`);

    // 3. Upsert de PlanEntitlement para cada plan Pro
    console.log('[3] Sincronizando PlanEntitlement...');
    let created = 0;
    let updated = 0;

    for (const plan of proPlanDetails) {
        const existing = await (prisma as any).planEntitlement.findFirst({
            where: { planId: plan.id, moduleId: module.id }
        });

        if (existing) {
            await (prisma as any).planEntitlement.update({
                where: { id: existing.id },
                data: { enabled: true }
            });
            console.log(`  ~ Ya existía: ${plan.name} → COMMUNICATION_CENTER (habilitado)`);
            updated++;
        } else {
            await (prisma as any).planEntitlement.create({
                data: {
                    planId: plan.id,
                    moduleId: module.id,
                    enabled: true
                }
            });
            console.log(`  + Creado: ${plan.name} → COMMUNICATION_CENTER`);
            created++;
        }
    }

    console.log(`\n  ✓ Creados: ${created} | Actualizados: ${updated}\n`);

    // 4. Verificación final
    console.log('[4] Verificación final...');
    const entitlements = await (prisma as any).planEntitlement.findMany({
        where: { moduleId: module.id },
        include: { plan: { select: { name: true, isFree: true } } }
    });

    for (const e of entitlements) {
        console.log(`  ✓ ${e.plan.name}${e.plan.isFree ? ' [FREE]' : ''} → enabled: ${e.enabled}`);
    }

    console.log('\n=================================================================');
    console.log(` RESULTADO: COMMUNICATION_CENTER sincronizado en ${entitlements.length} plan(es)`);
    console.log('=================================================================\n');
}

main()
    .catch(err => {
        console.error('ERROR:', err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
