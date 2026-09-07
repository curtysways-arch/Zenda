import { prisma } from '../lib/prisma';

async function audit() {
    console.log('--- AUDITORÍA DE FAMILIAS Y PLANES ---');
    const families = await prisma.planFamily.findMany({
        include: {
            plans: {
                include: {
                    planEntitlements: { include: { module: true } },
                    planLimits: true,
                    dataPolicies: true
                },
                orderBy: { displayOrder: 'asc' }
            },
            founderProgram: true,
            businessTypes: true
        }
    });

    console.log('Total Familias:', families.length);
    for (const f of families) {
        console.log(`\n[Familia: ${f.code} - ${f.name} (id: ${f.id})]`);
        console.log('  BusinessTypes asociados:', f.businessTypes.map(bt => bt.slug).join(', '));
        console.log('  FounderProgram:', f.founderProgram ? `cupos: ${f.founderProgram.maxMembers}, precio: ${f.founderProgram.founderPrice}` : 'No');
        console.log('  Planes (' + f.plans.length + '):');
        for (const p of f.plans) {
            console.log(`    * [${p.id}] ${p.name} (${p.slug}) | Price: $${p.price} | Trial: ${p.trial_days}d | isFree: ${p.isFree} | isDefault: ${p.isDefault} | Entitlements: ${p.planEntitlements.length} | Limits: ${p.planLimits.length} | Policies: ${p.dataPolicies.length}`);
            if (p.planLimits.length > 0) {
                console.log('      Límites:', p.planLimits.map(l => `${l.limitKey}: ${l.limitValue}`).join(', '));
            }
        }
    }

    console.log('\n--- AUDITORÍA DE SUSCRIPCIONES EXISTENTES ---');
    const subs = await prisma.suscripcion.findMany({
        include: {
            Plan: { select: { id: true, name: true } },
            Negocio: { select: { id: true, nombre: true, slug: true, tipoNegocio: true } }
        }
    });
    console.log('Total Suscripciones:', subs.length);
    for (const s of subs) {
        console.log(`  - Negocio: ${s.Negocio?.nombre} (${s.Negocio?.id}) | Plan: ${s.Plan?.name} (${s.planId}) | Estado: ${s.estado} | Founder: ${s.isFounder} | Pos: ${s.founderPosition} | Locked: ${s.lockedPrice}`);
    }

    console.log('\n--- AUDITORÍA DE GLOBAL CONFIG ---');
    const configs = await prisma.globalConfig.findMany({
        where: { clave: { in: ['FOUNDER_LOCKED_PRICE', 'FOUNDER_MAX', 'TRIAL_DAYS', 'DESCUENTO_ANUAL_PORCENTAJE'] } }
    });
    console.log('Configs:', configs);
}

audit().catch(console.error).finally(() => prisma.$disconnect());
