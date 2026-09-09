import prisma from '../lib/prisma';
import { addonService } from '../lib/services/addonService';
import { EntitlementsService } from '../core/entitlements/EntitlementsService';
import { getEffectiveSubscriptionPricingDetails } from '../lib/services/planService';
import crypto from 'crypto';

async function runCanonicalAddonsTest() {
    console.log('====================================================');
    console.log('🚀 INICIANDO TEST CANÓNICO DEL SUBSISTEMA DE ADD-ONS');
    console.log('====================================================\n');

    let passedTests = 0;
    let failedTests = 0;

    const assert = (condition: boolean, testName: string) => {
        if (condition) {
            console.log(`✅ [PASS] ${testName}`);
            passedTests++;
        } else {
            console.error(`❌ [FAIL] ${testName}`);
            failedTests++;
        }
    };

    try {
        // ── 1. Verificar Catálogo de 10 Add-ons Canónicos ──
        console.log('--- TEST 1: Catálogo Canónico ---');
        const allAddons = await addonService.getAllAddons();
        assert(allAddons.length >= 10, `Existen al menos 10 add-ons canónicos (encontrados: ${allAddons.length})`);
        
        const ecommerceAddon = allAddons.find(a => a.code === 'ADDON_ECOMMERCE');
        const branchAddon = allAddons.find(a => a.code === 'ADDON_BRANCH_EXTRA');
        const appointmentsAddon = allAddons.find(a => a.code === 'ADDON_APPOINTMENTS_EXTRA');
        const ordersAddon = allAddons.find(a => a.code === 'ADDON_ORDERS_EXTRA');

        assert(Boolean(ecommerceAddon && ecommerceAddon.type === 'CAPABILITY'), 'ADDON_ECOMMERCE existe y es tipo CAPABILITY');
        assert(Boolean(branchAddon && branchAddon.targetKey === 'MAX_BRANCHES'), 'ADDON_BRANCH_EXTRA afecta MAX_BRANCHES');
        assert(Boolean(appointmentsAddon && appointmentsAddon.targetKey === 'MAX_APPOINTMENTS_MONTHLY'), 'ADDON_APPOINTMENTS_EXTRA afecta MAX_APPOINTMENTS_MONTHLY');
        assert(Boolean(ordersAddon && ordersAddon.targetKey === 'MAX_ORDERS_MONTHLY'), 'ADDON_ORDERS_EXTRA afecta MAX_ORDERS_MONTHLY');

        // ── 2. Preparar Negocio de Prueba y Suscripción Founder ──
        console.log('\n--- TEST 2: Negocio de Prueba con Founder ---');
        const testBusinessSlug = `test-biz-addons-${Date.now()}`;
        const testBusiness = await prisma.negocio.create({
            data: {
                id: crypto.randomUUID(),
                nombre: 'Negocio Test Addons',
                slug: testBusinessSlug,
                tipoNegocio: 'RESTAURANTE',
                precioHora: 0,
                horarioApertura: '08:00',
                horarioCierre: '22:00',
                updatedAt: new Date()
            }
        });

        // Buscar un plan activo base
        let basePlan = await prisma.plan.findFirst({
            where: { activo: true, isFree: false }
        });

        if (!basePlan) {
            basePlan = await prisma.plan.create({
                data: {
                    id: crypto.randomUUID(),
                    name: 'Plan Pro Test',
                    price: 29.0,
                    trial_days: 0,
                    activo: true,
                    updated_at: new Date()
                }
            });
        }

        // Crear límite MAX_BRANCHES en el plan si no existe
        await prisma.planLimit.upsert({
            where: {
                planId_limitKey: {
                    planId: basePlan.id,
                    limitKey: 'MAX_BRANCHES'
                }
            },
            update: { limitValue: 1 },
            create: {
                id: crypto.randomUUID(),
                planId: basePlan.id,
                limitKey: 'MAX_BRANCHES',
                limitValue: 1
            }
        });

        const initialLockedPrice = 15.0;
        const testSub = await prisma.suscripcion.create({
            data: {
                id: crypto.randomUUID(),
                negocioId: testBusiness.id,
                planId: basePlan.id,
                estado: 'activa',
                isFounder: true,
                lockedPrice: initialLockedPrice,
                fechaInicio: new Date(),
                fechaFin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                updatedAt: new Date()
            }
        });

        assert(Boolean(testSub.id), `Negocio de prueba creado con suscripción Founder (lockedPrice: $${initialLockedPrice})`);

        // ── 3. Entitlements Base antes de Add-ons ──
        console.log('\n--- TEST 3: Entitlements Base ---');
        const baseEntitlements = await EntitlementsService.resolve(testBusiness.id);
        assert(baseEntitlements.capabilities['ECOMMERCE'] !== true, 'ECOMMERCE no está activo por defecto');
        const baseBranchLimit = typeof baseEntitlements.limits.branches === 'number' 
            ? baseEntitlements.limits.branches 
            : (baseEntitlements.limits['MAX_BRANCHES'] ?? 1);
        console.log(`Límite base de MAX_BRANCHES: ${baseBranchLimit}`);

        // ── 4. Compra de Add-on de Capacidad (ADDON_ECOMMERCE) ──
        console.log('\n--- TEST 4: Contratación de ADDON_ECOMMERCE ---');
        const subAddonCap = await addonService.purchaseAddon(testBusiness.id, 'ADDON_ECOMMERCE');
        assert(subAddonCap.status === 'ACTIVE', 'ADDON_ECOMMERCE contratado con status ACTIVE');
        assert(subAddonCap.priceContracted === ecommerceAddon?.priceMonthly, `Precio contractual fijado server-side: $${subAddonCap.priceContracted}`);

        // Verificar activación inmediata en EntitlementsService
        const entitlementsAfterCap = await EntitlementsService.resolve(testBusiness.id);
        assert(entitlementsAfterCap.capabilities['ECOMMERCE'] === true, 'ECOMMERCE ahora está activo en EntitlementsService');

        // ── 5. Compra de Add-on de Límite (ADDON_BRANCH_EXTRA) ──
        console.log('\n--- TEST 5: Contratación de ADDON_BRANCH_EXTRA ---');
        const subAddonLim = await addonService.purchaseAddon(testBusiness.id, 'ADDON_BRANCH_EXTRA', 2);
        assert(subAddonLim.status === 'ACTIVE', 'ADDON_BRANCH_EXTRA contratado con status ACTIVE');
        assert(subAddonLim.quantity === 2, 'Cantidad contratada: 2');

        const entitlementsAfterLim = await EntitlementsService.resolve(testBusiness.id);
        const newBranchLimit = typeof entitlementsAfterLim.limits.branches === 'number'
            ? entitlementsAfterLim.limits.branches
            : (entitlementsAfterLim.limits['MAX_BRANCHES'] ?? 0);
        // branchAddon.amount = 1. Con quantity = 2, debe sumar +2
        assert(newBranchLimit === baseBranchLimit + 2, `Límite MAX_BRANCHES incrementado exactamente en +2 (de ${baseBranchLimit} a ${newBranchLimit})`);

        // ── 6. Inmutabilidad Absoluta de Founder y Pricing Consolidado ──
        console.log('\n--- TEST 6: Inmutabilidad de Founder & Pricing Consolidado ---');
        const subAfterAddons = await prisma.suscripcion.findUnique({
            where: { id: testSub.id }
        });
        assert(subAfterAddons?.lockedPrice === initialLockedPrice, `lockedPrice en BD sigue siendo exactamente $${initialLockedPrice} (Inmutable)`);

        const pricingDetails = await getEffectiveSubscriptionPricingDetails(testSub.id);
        assert(pricingDetails !== null, 'PricingDetails obtenido exitosamente');
        if (pricingDetails) {
            assert(pricingDetails.isFounder === true, 'isFounder es true en el reporte');
            assert(pricingDetails.basePlanPrice === initialLockedPrice, `basePlanPrice respeta lockedPrice ($${initialLockedPrice})`);
            
            const expectedAddonsTotal = (ecommerceAddon?.priceMonthly || 0) + (branchAddon?.priceMonthly || 0) * 2;
            assert(Math.abs(pricingDetails.addonsTotal - expectedAddonsTotal) < 0.01, `addonsTotal es exactamente $${expectedAddonsTotal}`);
            assert(Math.abs(pricingDetails.effectiveTotalMonthly - (initialLockedPrice + expectedAddonsTotal)) < 0.01, `effectiveTotalMonthly es exactamente $${initialLockedPrice + expectedAddonsTotal}`);
        }

        // ── 7. Cancelación con Período de Gracia (cancelAtPeriodEnd) ──
        console.log('\n--- TEST 7: Cancelación al Corte ---');
        const cancelledAddon = await addonService.cancelAddonAtPeriodEnd(subAddonCap.id, testBusiness.id);
        assert(cancelledAddon.cancelAtPeriodEnd === true, 'cancelAtPeriodEnd marcado como true');
        assert(cancelledAddon.effectiveUntil !== null, 'effectiveUntil fijado a la fecha de fin de ciclo');

        // EntitlementsService debe seguir otorgando el beneficio porque effectiveUntil está en el futuro
        const entitlementsDuringGrace = await EntitlementsService.resolve(testBusiness.id);
        assert(entitlementsDuringGrace.capabilities['ECOMMERCE'] === true, 'Beneficio sigue activo durante el ciclo restante hasta effectiveUntil');

        // ── 8. Auditoría y Trazabilidad ──
        console.log('\n--- TEST 8: Auditoría y Trazabilidad ---');
        const historyCount = await prisma.subscriptionAddonHistory.count({
            where: { subscriptionAddonId: subAddonCap.id }
        });
        assert(historyCount >= 2, `Historial de auditoría registrado correctamente (acciones PURCHASE y CANCEL_SCHEDULED, total: ${historyCount})`);

        // ── Limpieza del Negocio de Prueba ──
        console.log('\n--- Limpieza de datos de prueba ---');
        await prisma.subscriptionAddonHistory.deleteMany({
            where: {
                OR: [
                    { subscriptionId: testSub.id },
                    { subscriptionAddonId: { in: [subAddonCap.id, subAddonLim.id] } }
                ]
            }
        });
        await prisma.subscriptionAddon.deleteMany({
            where: { subscriptionId: testSub.id }
        });
        await prisma.suscripcion.delete({
            where: { id: testSub.id }
        });
        await prisma.negocio.delete({
            where: { id: testBusiness.id }
        });
        console.log('✅ Datos de prueba eliminados correctamente.');

    } catch (e: any) {
        console.error('❌ Excepción durante la ejecución del test:', e);
        failedTests++;
    }

    console.log('\n====================================================');
    console.log(`📊 RESULTADO FINAL: ${passedTests} PASADOS, ${failedTests} FALLIDOS`);
    console.log('====================================================\n');

    if (failedTests > 0) {
        process.exit(1);
    }
}

runCanonicalAddonsTest()
    .catch((err) => {
        console.error(err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
