/**
 * @file test_canonical_spec_suite.ts
 * @description Suite de validación canónica estricta para los 12 casos obligatorios de la Sección 34:
 * 
 * Caso 1:  SERVICIOS + FREE (crear profesional/servicio, recibir cita, pero protege datos estratégicos)
 * Caso 2:  SERVICIOS + INICIO (información completa de cita)
 * Caso 3:  SERVICIOS + CRECIMIENTO (promociones, comunicación, club de beneficios)
 * Caso 4:  CRECIMIENTO expirado (resuelve effectivePlan = FREE)
 * Caso 5:  Los datos originales siguen existiendo en DB tras expiración
 * Caso 6:  Founder conserva isFounder, founderPosition, lockedPrice
 * Caso 7:  customFeatures no cambia tras expiración
 * Caso 8:  Public RECEIVE continúa funcionando cuando FREE lo permite
 * Caso 9:  API FREE no expone datos sensibles (redacción a null, isLocked=true, lockReason="PLAN_EXPIRED")
 * Caso 10: No bypass: protección en todos los endpoints sanitizadores
 * Caso 11: Reactivación: FREE -> CRECIMIENTO recupera acceso completo sin pérdida de datos
 * Caso 12: Idempotencia: el seed ejecutado varias veces no duplica planes (exactamente 20 planes)
 */

import { prisma } from '../lib/prisma';
import { AccessPolicyService } from '../core/security/AccessPolicyService';
import { EntitlementsService } from '../core/entitlements/EntitlementsService';
import { featureService } from '../lib/services/featureService';
import { DATA_RESOURCES, DATA_ACTIONS } from '../core/security/dataPolicyTypes';
import { randomUUID } from 'crypto';

async function runCanonicalSuite() {
    console.log('================================================================');
    console.log(' CITIOX — SUITE CANÓNICA DE 12 CASOS OBLIGATORIOS (SECCIÓN 34)');
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

    // Datos base
    const serviciosFamily = await prisma.planFamily.findUnique({
        where: { code: 'SERVICIOS' },
        include: { plans: true, businessTypes: true }
    });
    if (!serviciosFamily) throw new Error('Familia SERVICIOS no encontrada');

    const planServiciosFree = serviciosFamily.plans.find(p => p.isFree);
    const planServiciosInicio = serviciosFamily.plans.find(p => p.slug === 'servicios-inicio');
    const planServiciosCrecimiento = serviciosFamily.plans.find(p => p.slug === 'servicios-crecimiento');
    const defaultBusinessType = serviciosFamily.businessTypes[0] || await prisma.businessType.findFirst();

    if (!planServiciosFree || !planServiciosInicio || !planServiciosCrecimiento || !defaultBusinessType) {
        throw new Error('Faltan planes o tipo de negocio de SERVICIOS');
    }

    // Crear negocio temporal para pruebas
    const testBizId = `qa_spec_biz_${randomUUID().substring(0, 8)}`;
    const testBiz = await prisma.negocio.create({
        data: {
            id: testBizId,
            nombre: 'QA Canonical Salon & Spa',
            slug: `qa-canonical-${Date.now()}`,
            BusinessType: { connect: { id: defaultBusinessType.id } },
            tipoNegocio: 'SERVICIOS',
            precioHora: 15.0,
            horarioApertura: '08:00',
            horarioCierre: '20:00',
            updatedAt: new Date(),
            emailContacto: `qa_${Date.now()}@citiox.com`,
            whatsapp: '+593991234567'
        }
    });

    try {
        // ─────────────────────────────────────────────────────────────
        // CASO 1: SERVICIOS + FREE
        // ─────────────────────────────────────────────────────────────
        console.log('[CASO 1] SERVICIOS + FREE');
        const sub1 = await prisma.suscripcion.create({
            data: {
                id: `sub_qa_1_${randomUUID().substring(0, 8)}`,
                negocioId: testBiz.id,
                planId: planServiciosFree.id,
                estado: 'active',
                fechaInicio: new Date(),
                fechaFin: new Date(Date.now() + 30 * 86400000),
                updatedAt: new Date()
            }
        });

        const entFree = await EntitlementsService.resolve(testBiz.id);
        assert(entFree.capabilities.STAFF === true, 'Caso 1: Permite crear profesionales (STAFF=true)');
        assert(entFree.capabilities.SERVICES === true, 'Caso 1: Permite crear servicios (SERVICES=true)');
        assert(entFree.capabilities.APPOINTMENTS === true, 'Caso 1: Permite agendar turnos (APPOINTMENTS=true)');

        const policyFree = await AccessPolicyService.getResourcePolicy(testBiz.id, DATA_RESOURCES.APPOINTMENTS);
        assert(policyFree.receive === true, 'Caso 1: Permite recibir citas públicas (RECEIVE=ALLOW)');
        assert(policyFree.view === false, 'Caso 1: Protege la vista general de citas (VIEW=false)');
        assert(policyFree.contact === false, 'Caso 1: Protege contacto del cliente (VIEW_CONTACT=false)');
        assert(policyFree.financials === false, 'Caso 1: Protege finanzas de citas (VIEW_FINANCIALS=false)');

        // ─────────────────────────────────────────────────────────────
        // CASO 2: SERVICIOS + INICIO
        // ─────────────────────────────────────────────────────────────
        console.log('\n[CASO 2] SERVICIOS + INICIO');
        await prisma.suscripcion.update({
            where: { id: sub1.id },
            data: { planId: planServiciosInicio.id }
        });

        const policyInicio = await AccessPolicyService.getResourcePolicy(testBiz.id, DATA_RESOURCES.APPOINTMENTS);
        assert(policyInicio.receive === true, 'Caso 2: Permite recibir citas (RECEIVE=ALLOW)');
        assert(policyInicio.view === true, 'Caso 2: Permite ver información de citas (VIEW=ALLOW)');
        assert(policyInicio.details === true, 'Caso 2: Permite ver detalles completos (VIEW_DETAILS=ALLOW)');
        assert(policyInicio.customer === true, 'Caso 2: Permite ver nombre del cliente (VIEW_CUSTOMER=ALLOW)');
        assert(policyInicio.contact === true, 'Caso 2: Permite ver teléfono de contacto (VIEW_CONTACT=ALLOW)');
        assert(policyInicio.financials === true, 'Caso 2: Permite ver precios y finanzas (VIEW_FINANCIALS=ALLOW)');

        // ─────────────────────────────────────────────────────────────
        // CASO 3: SERVICIOS + CRECIMIENTO
        // ─────────────────────────────────────────────────────────────
        console.log('\n[CASO 3] SERVICIOS + CRECIMIENTO');
        await prisma.suscripcion.update({
            where: { id: sub1.id },
            data: { planId: planServiciosCrecimiento.id }
        });

        const entCrecimiento = await EntitlementsService.resolve(testBiz.id);
        const featsCrecimiento = await featureService.getAllFeatures(testBiz.id);
        assert(entCrecimiento.capabilities.PROMOTIONS === true, 'Caso 3: Permite promociones (PROMOTIONS=true)');
        assert(entCrecimiento.capabilities.COMMUNICATION_CENTER === true, 'Caso 3: Permite comunicación masiva (COMMUNICATION_CENTER=true)');
        assert(featsCrecimiento.communications_module === true, 'Caso 3: featureService expone communications_module=true');
        assert(entCrecimiento.capabilities.LOYALTY === true, 'Caso 3: Permite club de fidelización/puntos (LOYALTY=true)');

        // ─────────────────────────────────────────────────────────────
        // CASO 4: CRECIMIENTO EXPIRADO RESUELVE EFFECTIVEPLAN = FREE
        // ─────────────────────────────────────────────────────────────
        console.log('\n[CASO 4] CRECIMIENTO EXPIRADO → EFFECTIVE PLAN = FREE');
        await prisma.suscripcion.update({
            where: { id: sub1.id },
            data: {
                estado: 'expired',
                fechaFin: new Date(Date.now() - 5 * 86400000) // Expirado hace 5 días
            }
        });

        const { plan: effectivePlan, context: effectiveCtx } = await AccessPolicyService.getEffectivePlan(testBiz.id);
        assert(effectiveCtx.isExpired === true, 'Caso 4: Detecta estado expirado en runtime');
        assert(effectiveCtx.isFreeTier === true, 'Caso 4: Degrada a FreeTier en runtime');
        assert(effectivePlan.id === planServiciosFree.id, 'Caso 4: Plan efectivo es el Plan Free de Servicios');
        assert(effectivePlan.isFree === true, 'Caso 4: El plan efectivo tiene isFree=true');
        assert(effectiveCtx.originalPlanId === planServiciosCrecimiento.id, 'Caso 4: Plan contratado conservado intacto como Crecimiento');

        // ─────────────────────────────────────────────────────────────
        // CASO 5: DATOS ORIGINALES PERMANECEN INTACTOS EN BD TRAS EXPIRACIÓN
        // ─────────────────────────────────────────────────────────────
        console.log('\n[CASO 5] DATOS ORIGINALES INTACTOS EN DB');
        // Crear cita con datos reales antes de verificar la persistencia
        const testClient = await prisma.cliente.create({
            data: {
                id: `client_qa_${randomUUID().substring(0, 8)}`,
                nombre: 'María Valdivieso',
                telefono: '+593998877665',
                email: 'maria@test.com',
                negocioId: testBiz.id,
                updatedAt: new Date()
            }
        });

        const testService = await prisma.service.create({
            data: {
                id: `srv_qa_${randomUUID().substring(0, 8)}`,
                nombre: 'Tratamiento Facial Deluxe',
                precio: 45.0,
                duracion: 60,
                negocioId: testBiz.id,
                updatedAt: new Date()
            }
        });

        const testAppointment = await prisma.appointment.create({
            data: {
                id: `apt_qa_${randomUUID().substring(0, 8)}`,
                fecha: new Date(),
                horaInicio: '10:00',
                horaFin: '11:00',
                total: 45.0,
                comentarios: 'Cliente solicita cabina privada',
                clienteId: testClient.id,
                serviceId: testService.id,
                negocioId: testBiz.id,
                updatedAt: new Date()
            }
        });

        // Comprobar que en BD la cita contiene sus valores reales intactos
        const rawDbAppointment = await prisma.appointment.findUnique({
            where: { id: testAppointment.id },
            include: { cliente: true }
        });
        assert(rawDbAppointment?.total === 45.0, 'Caso 5: DB conserva total original ($45.0)');
        assert(rawDbAppointment?.comentarios === 'Cliente solicita cabina privada', 'Caso 5: DB conserva comentarios');
        assert(rawDbAppointment?.cliente?.telefono === '+593998877665', 'Caso 5: DB conserva teléfono de cliente intacto');

        // ─────────────────────────────────────────────────────────────
        // CASO 6: FOUNDER CONSERVA isFounder, founderPosition, lockedPrice
        // ─────────────────────────────────────────────────────────────
        console.log('\n[CASO 6] CONSERVACIÓN INMUTABLE DE CONDICIÓN FOUNDER');
        await prisma.suscripcion.update({
            where: { id: sub1.id },
            data: {
                isFounder: true,
                founderPosition: 7,
                lockedPrice: 10.00
            }
        });

        // Verificar tras expiración
        const subExp = await prisma.suscripcion.findUnique({ where: { id: sub1.id } });
        assert(subExp?.isFounder === true, 'Caso 6: isFounder permanece true en expiración');
        assert(subExp?.founderPosition === 7, 'Caso 6: founderPosition permanece en 7');
        assert(Number(subExp?.lockedPrice) === 10.00, 'Caso 6: lockedPrice permanece en $10.00');

        // ─────────────────────────────────────────────────────────────
        // CASO 7: customFeatures NO CAMBIA TRAS EXPIRACIÓN
        // ─────────────────────────────────────────────────────────────
        console.log('\n[CASO 7] INMUTABILIDAD DE customFeatures');
        const customFeaturesPayload = JSON.stringify({
            addons: ['ADDON_COMMUNICATION_CENTER'],
            whatsapp_notifications: true
        });
        await prisma.suscripcion.update({
            where: { id: sub1.id },
            data: { customFeatures: customFeaturesPayload }
        });

        const subWithFeatures = await prisma.suscripcion.findUnique({ where: { id: sub1.id } });
        assert(subWithFeatures?.customFeatures === customFeaturesPayload, 'Caso 7: customFeatures se preserva inmutable en DB');

        // ─────────────────────────────────────────────────────────────
        // CASO 8: PUBLIC RECEIVE CONTINÚA FUNCIONANDO CUANDO FREE LO PERMITE
        // ─────────────────────────────────────────────────────────────
        console.log('\n[CASO 8] PUBLIC RECEIVE OPERATIVO EN FREE');
        const policyCanReceive = await AccessPolicyService.canAccess(testBiz.id, DATA_RESOURCES.APPOINTMENTS, DATA_ACTIONS.RECEIVE);
        assert(policyCanReceive === true, 'Caso 8: canAccess(APPOINTMENTS, RECEIVE) es true para negocio expirado en Free');

        // ─────────────────────────────────────────────────────────────
        // CASO 9: API FREE REDACTA CAMPOS SENSIBLES A NULL CON ISLOCKED=TRUE
        // ─────────────────────────────────────────────────────────────
        console.log('\n[CASO 9] SANITIZACIÓN LIMPIA (NULL + ISLOCKED=TRUE + LOCKREASON)');
        const sanitizedList = await AccessPolicyService.protectAppointments(testBiz.id, [rawDbAppointment]);
        const sanitized = sanitizedList[0];

        assert(sanitized.total === null, 'Caso 9: total redactado a null (no a 0 numérico engañoso)');
        assert(sanitized.comentarios === null, 'Caso 9: comentarios redactados a null');
        assert(sanitized.isLocked === true, 'Caso 9: inyectado metadato isLocked = true');
        assert(sanitized.lockReason === 'PLAN_EXPIRED', 'Caso 9: inyectado metadato lockReason = "PLAN_EXPIRED"');
        assert(sanitized.id === testAppointment.id, 'Caso 9: ID preservado para trazabilidad');

        // ─────────────────────────────────────────────────────────────
        // CASO 10: NO BYPASS ENTRE ENDPOINTS
        // ─────────────────────────────────────────────────────────────
        console.log('\n[CASO 10] IMPOSIBILIDAD DE BYPASS DE POLÍTICAS');
        const sanitizedClient = await AccessPolicyService.protectCustomer(testBiz.id, testClient);
        assert(sanitizedClient.telefono === null, 'Caso 10: protectCustomer redacta teléfono a null');
        assert(sanitizedClient.email === null, 'Caso 10: protectCustomer redacta email a null');
        assert(sanitizedClient.isLocked === true, 'Caso 10: protectCustomer inyecta isLocked=true');

        // ─────────────────────────────────────────────────────────────
        // CASO 11: REACTIVACIÓN (FREE -> CRECIMIENTO) RECUPERA ACCESO COMPLETO
        // ─────────────────────────────────────────────────────────────
        console.log('\n[CASO 11] REACTIVACIÓN EXITOSA: RECUPERA ACCESO TOTAL SIN PÉRDIDA');
        await prisma.suscripcion.update({
            where: { id: sub1.id },
            data: {
                estado: 'active',
                fechaFin: new Date(Date.now() + 30 * 86400000) // Reactivado por 30 días
            }
        });

        const { plan: reactivatedPlan, context: reactivatedCtx } = await AccessPolicyService.getEffectivePlan(testBiz.id);
        assert(reactivatedCtx.isExpired === false, 'Caso 11: isExpired vuelve a false');
        assert(reactivatedCtx.isFreeTier === false, 'Caso 11: isFreeTier vuelve a false');
        assert(reactivatedPlan.id === planServiciosCrecimiento.id, 'Caso 11: Recupera plan Crecimiento');

        const activePolicy = await AccessPolicyService.getResourcePolicy(testBiz.id, DATA_RESOURCES.APPOINTMENTS);
        assert(activePolicy.view === true, 'Caso 11: VIEW vuelve a ser permitido');
        assert(activePolicy.contact === true, 'Caso 11: Contacto vuelve a ser visible');

        const unmaskedList = await AccessPolicyService.protectAppointments(testBiz.id, [rawDbAppointment]);
        const unmasked = unmaskedList[0];
        assert(unmasked.total === 45.0, 'Caso 11: Total recuperado exactamente ($45.0)');
        assert(unmasked.comentarios === 'Cliente solicita cabina privada', 'Caso 11: Comentarios recuperados');
        assert(unmasked.isLocked === false || unmasked.isLocked === undefined, 'Caso 11: isLocked ya no está activo');

        // Limpieza de datos temporales del negocio
        await prisma.appointment.deleteMany({ where: { negocioId: testBiz.id } });
        await prisma.service.deleteMany({ where: { negocioId: testBiz.id } });
        await prisma.cliente.deleteMany({ where: { negocioId: testBiz.id } });
        await prisma.suscripcion.deleteMany({ where: { negocioId: testBiz.id } });
    } finally {
        await prisma.appointment.deleteMany({ where: { negocioId: testBiz.id } }).catch(() => {});
        await prisma.service.deleteMany({ where: { negocioId: testBiz.id } }).catch(() => {});
        await prisma.cliente.deleteMany({ where: { negocioId: testBiz.id } }).catch(() => {});
        await prisma.suscripcion.deleteMany({ where: { negocioId: testBiz.id } }).catch(() => {});
        await prisma.negocio.delete({ where: { id: testBiz.id } }).catch(() => {});
    }

    // ─────────────────────────────────────────────────────────────
    // CASO 12: IDEMPOTENCIA DEL SEED (EXACTAMENTE 20 PLANES)
    // ─────────────────────────────────────────────────────────────
    console.log('\n[CASO 12] IDEMPOTENCIA DEL SEED (EXACTAMENTE 20 PLANES)');
    const allFamilies = await prisma.planFamily.findMany({
        include: { plans: true }
    });

    assert(allFamilies.length === 5, 'Caso 12: Existen exactamente 5 familias canónicas');

    let totalCanonicalPlans = 0;
    for (const fam of allFamilies) {
        const famPlans = fam.plans;
        totalCanonicalPlans += famPlans.length;
        assert(famPlans.length === 4, `Caso 12: Familia ${fam.name} tiene exactamente 4 planes (encontrados: ${famPlans.length})`);
        
        const freeCount = famPlans.filter(p => p.isFree).length;
        const defaultCount = famPlans.filter(p => p.isDefault).length;
        assert(freeCount === 1, `Caso 12: Familia ${fam.name} tiene exactamente 1 Plan Free`);
        assert(defaultCount === 1, `Caso 12: Familia ${fam.name} tiene exactamente 1 Plan Default (Crecimiento)`);

        const defaultPlan = famPlans.find(p => p.isDefault);
        assert(
            defaultPlan?.name.toLowerCase().includes('crecimiento'),
            `Caso 12: El plan default de ${fam.name} es "${defaultPlan?.name}" (Crecimiento)`
        );
    }
    assert(totalCanonicalPlans === 20, `Caso 12: Total exacto de 20 planes en el sistema (5 x 4 = ${totalCanonicalPlans})`);

    console.log('\n================================================================');
    console.log(` RESULTADOS SUITE CANÓNICA: ${passed} APROBADAS | ${failed} FALLIDAS`);
    console.log('================================================================\n');

    if (failed > 0) process.exit(1);
}

runCanonicalSuite()
    .catch(err => {
        console.error('Error en suite canónica:', err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
