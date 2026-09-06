import { prisma } from '../lib/prisma';
import { EntitlementsService } from '../core/entitlements/EntitlementsService';
import { featureService } from '../lib/services/featureService';
import { AddonRegistry } from '../core/entitlements/AddonRegistry';

async function main() {
    console.log('================================================================');
    console.log(' TEST: MÓDULO DE COMUNICACIONES EN PLANES Y ADD-ONS');
    console.log('================================================================\n');

    let passed = 0;
    let failed = 0;

    function assert(cond: boolean, msg: string) {
        if (cond) {
            console.log(`  ✓ ${msg}`);
            passed++;
        } else {
            console.error(`  ✕ FALLÓ: ${msg}`);
            failed++;
        }
    }

    // 1. Verificar AddonRegistry
    console.log('[1] VERIFICACIÓN DE ADDON_REGISTRY');
    const addon = AddonRegistry.get('ADDON_COMMUNICATION_CENTER');
    assert(!!addon, 'ADDON_COMMUNICATION_CENTER está registrado');
    assert(addon?.targetKey === 'COMMUNICATION_CENTER', 'El Add-on apunta a targetKey: COMMUNICATION_CENTER');
    assert(addon?.type === 'CAPABILITY', 'El Add-on es de tipo CAPABILITY');
    assert(addon?.priceMonthly === 12.00, 'El precio mensual es $12.00');

    // 2. Verificar que los planes Pro tienen COMMUNICATION_CENTER en BD
    console.log('\n[2] VERIFICACIÓN DE PLANENTITLEMENTS EN PLANES PRO');
    const proPlans = await prisma.plan.findMany({
        where: {
            id: { in: ['plan_restaurante_pro', 'plan_servicios_pro', 'plan_canchas_academia', 'plan_lavanderia_pro', 'plan_tienda_pro'] }
        },
        include: {
            planEntitlements: {
                include: { module: true }
            }
        }
    });

    assert(proPlans.length === 5, 'Se encontraron los 5 planes Pro');
    for (const plan of proPlans) {
        const hasComm = plan.planEntitlements.some(
            pe => pe.enabled && pe.module?.code === 'COMMUNICATION_CENTER'
        );
        assert(hasComm, `Plan Pro "${plan.name}" tiene COMMUNICATION_CENTER habilitado`);
    }

    // 3. Crear negocio temporal para probar escenarios
    console.log('\n[3] PRUEBA DE RESOLUCIÓN EN RUNTIME (PRO vs INICIO vs ADD-ON)');
    
    // Buscar tipo de negocio y planes
    const bizType = await prisma.businessType.findFirst();
    const planInicio = await prisma.plan.findFirst({ where: { name: { contains: 'Inicio' }, isFree: false } });
    const planPro = await prisma.plan.findFirst({ where: { id: 'plan_restaurante_pro' } });

    if (!bizType || !planInicio || !planPro) {
        console.warn('  ⚠ No se encontraron datos base para simulación.');
        return;
    }

    const testBiz = await prisma.negocio.create({
        data: {
            id: `test_comm_biz_${Date.now()}`,
            nombre: 'Test Communications Negocio',
            slug: `test-comm-biz-${Date.now()}`,
            BusinessType: { connect: { id: bizType.id } },
            tipoNegocio: 'RESTAURANTE',
            precioHora: 10.0,
            horarioApertura: '08:00',
            horarioCierre: '22:00',
            updatedAt: new Date(),
            emailContacto: `test_comm_${Date.now()}@example.com`,
            whatsapp: '+593999999999'
        }
    });

    try {
        // Escenario A: Negocio con Plan Pro
        console.log('\n  -- Escenario A: Negocio con Plan Pro --');
        const subPro = await prisma.suscripcion.create({
            data: {
                id: `sub_comm_pro_${Date.now()}`,
                negocioId: testBiz.id,
                planId: planPro.id,
                estado: 'active',
                fechaInicio: new Date(),
                fechaFin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                updatedAt: new Date()
            }
        });

        const resPro = await EntitlementsService.resolve(testBiz.id);
        assert(resPro.capabilities.COMMUNICATION_CENTER === true, 'Plan Pro: EntitlementsService resuelve COMMUNICATION_CENTER = true');

        const featsPro = await featureService.getAllFeatures(testBiz.id);
        assert(featsPro.communications_module === true, 'Plan Pro: featureService.getAllFeatures expone communications_module = true');

        // Escenario B: Degradar a Plan Inicio (sin Add-ons)
        console.log('\n  -- Escenario B: Negocio con Plan Inicio (sin Add-on) --');
        await prisma.suscripcion.update({
            where: { id: subPro.id },
            data: {
                planId: planInicio.id,
                customFeatures: null
            }
        });

        const resInicio = await EntitlementsService.resolve(testBiz.id);
        assert(!resInicio.capabilities.COMMUNICATION_CENTER, 'Plan Inicio: EntitlementsService resuelve COMMUNICATION_CENTER = false');

        const featsInicio = await featureService.getAllFeatures(testBiz.id);
        assert(featsInicio.communications_module === false, 'Plan Inicio: featureService.getAllFeatures expone communications_module = false');

        // Escenario C: Plan Inicio con Add-on de Comunicaciones contratado
        console.log('\n  -- Escenario C: Negocio con Plan Inicio + ADDON_COMMUNICATION_CENTER --');
        await prisma.suscripcion.update({
            where: { id: subPro.id },
            data: {
                customFeatures: JSON.stringify({
                    addons: ['ADDON_COMMUNICATION_CENTER']
                })
            }
        });

        const resAddon = await EntitlementsService.resolve(testBiz.id);
        assert(resAddon.capabilities.COMMUNICATION_CENTER === true, 'Plan Inicio + Add-on: EntitlementsService resuelve COMMUNICATION_CENTER = true');

        const featsAddon = await featureService.getAllFeatures(testBiz.id);
        assert(featsAddon.communications_module === true, 'Plan Inicio + Add-on: featureService.getAllFeatures expone communications_module = true');

        // Limpieza de suscripción de prueba
        await prisma.suscripcion.delete({ where: { id: subPro.id } });
    } finally {
        await prisma.negocio.delete({ where: { id: testBiz.id } });
    }

    console.log('\n================================================================');
    console.log(` RESULTADOS: ${passed} APROBADAS | ${failed} FALLIDAS`);
    console.log('================================================================\n');

    if (failed > 0) process.exit(1);
}

main()
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
