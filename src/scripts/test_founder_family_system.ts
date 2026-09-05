import prisma from '../lib/prisma';
import crypto from 'crypto';
import { getEffectiveSubscriptionPrice, planService } from '../lib/services/planService';

async function runTests() {
    console.log("==================================================");
    console.log("🧪 INICIANDO TEST SUITE: FAMILIAS + PLANES + FUNDADORES");
    console.log("==================================================");

    let passedTests = 0;
    let failedTests = 0;

    function assert(condition: boolean, testName: string) {
        if (condition) {
            console.log(`  ✅ PASS: ${testName}`);
            passedTests++;
        } else {
            console.error(`  ❌ FAIL: ${testName}`);
            failedTests++;
        }
    }

    // ==========================================
    // TEST 1: Regla Central de Precio Efectivo (getEffectiveSubscriptionPrice)
    // ==========================================
    console.log("\n--- TEST 1: Regla de Precio Efectivo Inviolable ---");
    
    // Caso A: lockedPrice presente prevalece sobre precio del plan
    const subWithLocked = {
        lockedPrice: 10.0,
        plan: { price: 39.99 }
    };
    assert(getEffectiveSubscriptionPrice(subWithLocked) === 10.0, "lockedPrice = 10 prevalece sobre plan = 39.99");

    // Caso B: sin lockedPrice, usa precio del plan
    const subWithoutLocked = {
        lockedPrice: null,
        plan: { price: 29.99 }
    };
    assert(getEffectiveSubscriptionPrice(subWithoutLocked) === 29.99, "Sin lockedPrice usa precio regular de plan = 29.99");

    // Caso C: customFeatures legado con specialPrice
    const subLegacySpecial = {
        lockedPrice: null,
        customFeatures: { specialPrice: 14.50 },
        plan: { price: 35.00 }
    };
    assert(getEffectiveSubscriptionPrice(subLegacySpecial) === 14.50, "customFeatures.specialPrice legado respetado si lockedPrice no existe");

    // Caso D: lockedPrice prevalece incluso si hay customFeatures.specialPrice
    const subLockedAndSpecial = {
        lockedPrice: 12.00,
        customFeatures: { specialPrice: 18.00 },
        plan: { price: 40.00 }
    };
    assert(getEffectiveSubscriptionPrice(subLockedAndSpecial) === 12.00, "lockedPrice prevalece sobre customFeatures y sobre plan");

    // ==========================================
    // TEST 2: Exclusividad de 1 isDefault por Familia
    // ==========================================
    console.log("\n--- TEST 2: Exclusividad de isDefault por Familia ---");
    const testFamilyCode = "TEST_FAMILY_" + Date.now();
    let testFamily: any = null;
    let planA: any = null;
    let planB: any = null;

    try {
        testFamily = await prisma.planFamily.create({
            data: {
                code: testFamilyCode,
                name: "Test Family " + Date.now(),
                slug: "test-family-" + Date.now(),
                icon: "Briefcase",
                active: true,
                displayOrder: 999
            }
        });

        // Crear Plan A con isDefault = true
        planA = await prisma.plan.create({
            data: {
                id: crypto.randomUUID(),
                name: "Plan A " + Date.now(),
                slug: "plan-a-" + Date.now(),
                price: 10,
                familyId: testFamily.id,
                isDefault: true,
                activo: true,
                updated_at: new Date()
            }
        });

        // Crear Plan B con isDefault = false
        planB = await prisma.plan.create({
            data: {
                id: crypto.randomUUID(),
                name: "Plan B " + Date.now(),
                slug: "plan-b-" + Date.now(),
                price: 20,
                familyId: testFamily.id,
                isDefault: false,
                activo: true,
                updated_at: new Date()
            }
        });

        // Simular la lógica de activar Plan B como default
        await prisma.$transaction(async (tx) => {
            await tx.plan.updateMany({
                where: { familyId: testFamily.id, isDefault: true },
                data: { isDefault: false }
            });
            await tx.plan.update({
                where: { id: planB.id },
                data: { isDefault: true }
            });
        });

        const updatedPlanA = await prisma.plan.findUnique({ where: { id: planA.id } });
        const updatedPlanB = await prisma.plan.findUnique({ where: { id: planB.id } });

        assert(updatedPlanA?.isDefault === false, "Plan A fue desactivado como default automáticamente");
        assert(updatedPlanB?.isDefault === true, "Plan B ahora es el único default de la familia");

    } finally {
        // Limpieza de datos de prueba
        if (planA) await prisma.plan.delete({ where: { id: planA.id } }).catch(() => {});
        if (planB) await prisma.plan.delete({ where: { id: planB.id } }).catch(() => {});
        if (testFamily) await prisma.planFamily.delete({ where: { id: testFamily.id } }).catch(() => {});
    }

    // ==========================================
    // TEST 3: Asignación Atómica y Cupo Máximo Histórico del FounderProgram
    // ==========================================
    console.log("\n--- TEST 3: Asignación Atómica y Cupo Máximo sin Reutilización ---");
    let founderFamily: any = null;
    let founderPlan: any = null;
    let founderProg: any = null;
    let testNegocio1: any = null;
    let testNegocio2: any = null;
    let testNegocio3: any = null;

    try {
        founderFamily = await prisma.planFamily.create({
            data: {
                code: "FOUNDER_FAM_" + Date.now(),
                name: "Founder Test Family",
                slug: "founder-test-family-" + Date.now(),
                icon: "Trophy",
                active: true
            }
        });

        founderPlan = await prisma.plan.create({
            data: {
                id: crypto.randomUUID(),
                name: "Founder Base Plan",
                slug: "founder-base-" + Date.now(),
                price: 30.0,
                familyId: founderFamily.id,
                isDefault: true,
                activo: true,
                updated_at: new Date()
            }
        });

        // Crear FounderProgram con cupo máximo de 2 miembros a $10.00
        founderProg = await prisma.founderProgram.create({
            data: {
                familyId: founderFamily.id,
                enabled: true,
                maxMembers: 2,
                currentMembers: 0,
                founderPrice: 10.0,
                currency: "USD",
                billingPeriod: "monthly",
                lifetimePrice: true,
                founderPlanId: founderPlan.id
            }
        });

        const makeNegocio = (nombre: string, slug: string) => ({
            id: crypto.randomUUID(),
            nombre,
            slug,
            whatsapp: "123456789",
            precioHora: 15.0,
            horarioApertura: "08:00",
            horarioCierre: "22:00",
            updatedAt: new Date()
        });

        // Negocio 1
        testNegocio1 = await prisma.negocio.create({
            data: makeNegocio("Negocio 1 Test", "negocio-1-test-" + Date.now())
        });

        // Asignar Plan y Socio Fundador para Negocio 1
        const res1 = await planService.assignDefaultPlan(testNegocio1.id, founderPlan.id);
        assert(res1.isFounder === true, "Negocio 1 califica como socio fundador");
        assert(res1.founderPosition === 1, "Negocio 1 recibe cupo histórico #1");
        assert(res1.lockedPrice === 10.0, "Negocio 1 recibe lockedPrice contractual de $10.00");

        // Negocio 2
        testNegocio2 = await prisma.negocio.create({
            data: makeNegocio("Negocio 2 Test", "negocio-2-test-" + Date.now())
        });

        const res2 = await planService.assignDefaultPlan(testNegocio2.id, founderPlan.id);
        assert(res2.isFounder === true, "Negocio 2 califica como socio fundador");
        assert(res2.founderPosition === 2, "Negocio 2 recibe cupo histórico #2");
        assert(res2.lockedPrice === 10.0, "Negocio 2 recibe lockedPrice contractual de $10.00");

        // Negocio 3 (Cupo lleno: maxMembers = 2)
        testNegocio3 = await prisma.negocio.create({
            data: makeNegocio("Negocio 3 Test", "negocio-3-test-" + Date.now())
        });

        const res3 = await planService.assignDefaultPlan(testNegocio3.id, founderPlan.id);
        console.log("DEBUG RES3:", { isFounder: res3.isFounder, founderPosition: res3.founderPosition, lockedPrice: res3.lockedPrice, estado: res3.estado });
        assert(res3.isFounder === false, "Negocio 3 NO es socio fundador porque el cupo llegó al límite (2/2)");
        assert(res3.founderPosition === null || res3.founderPosition === undefined, "Negocio 3 no tiene founderPosition");
        assert(res3.lockedPrice === null || res3.lockedPrice === undefined, "Negocio 3 no tiene lockedPrice");

        // Verificar que cancelar la suscripción del Negocio 1 NO libera el cupo
        await prisma.suscripcion.update({
            where: { id: res1.id },
            data: { estado: 'cancelada' }
        });

        // Negocio 4 nuevo
        const testNegocio4 = await prisma.negocio.create({
            data: makeNegocio("Negocio 4 Test", "negocio-4-test-" + Date.now())
        });

        const res4 = await planService.assignDefaultPlan(testNegocio4.id, founderPlan.id);
        assert(res4.isFounder === false, "Negocio 4 NO obtiene cupo aunque el socio #1 haya cancelado (cupo histórico no reutilizable)");

        // Limpieza negocio 4
        await prisma.suscripcion.deleteMany({ where: { negocioId: testNegocio4.id } });
        await prisma.negocio.delete({ where: { id: testNegocio4.id } });

    } finally {
        if (testNegocio1) {
            await prisma.suscripcion.deleteMany({ where: { negocioId: testNegocio1.id } });
            await prisma.negocio.delete({ where: { id: testNegocio1.id } }).catch(() => {});
        }
        if (testNegocio2) {
            await prisma.suscripcion.deleteMany({ where: { negocioId: testNegocio2.id } });
            await prisma.negocio.delete({ where: { id: testNegocio2.id } }).catch(() => {});
        }
        if (testNegocio3) {
            await prisma.suscripcion.deleteMany({ where: { negocioId: testNegocio3.id } });
            await prisma.negocio.delete({ where: { id: testNegocio3.id } }).catch(() => {});
        }
        if (founderProg) await prisma.founderProgram.delete({ where: { id: founderProg.id } }).catch(() => {});
        if (founderPlan) await prisma.plan.delete({ where: { id: founderPlan.id } }).catch(() => {});
        if (founderFamily) {
            await prisma.planAuditLog.deleteMany({ where: { targetId: founderFamily.id } }).catch(() => {});
            await prisma.planFamily.delete({ where: { id: founderFamily.id } }).catch(() => {});
        }
    }

    console.log("\n==================================================");
    console.log(`📊 RESULTADOS DE PRUEBAS: ${passedTests} PASADAS, ${failedTests} FALLADAS`);
    console.log("==================================================");

    if (failedTests > 0) {
        process.exit(1);
    }
}

runTests().catch((err) => {
    console.error("Error fatal en suite de pruebas:", err);
    process.exit(1);
});
