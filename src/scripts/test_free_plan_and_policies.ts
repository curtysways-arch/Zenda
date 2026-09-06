import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma';
import { AccessPolicyService } from '../core/security/AccessPolicyService';
import { 
    protectOrder, 
    protectAppointment, 
    protectReservation, 
    protectServiceOrder, 
    protectStoreOrder, 
    protectCustomer 
} from '../core/security/dataProtector';
import { EntitlementsService } from '../core/entitlements/EntitlementsService';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
        console.log(`  \x1b[32m✓\x1b[0m ${testName}`);
        passedTests++;
    } else {
        console.error(`  \x1b[31m✗\x1b[0m ${testName}${detail ? ` (${detail})` : ''}`);
        failedTests++;
    }
}

async function runTests() {
    console.log('\n================================================================');
    console.log(' CITIOX — SUITE DE VERIFICACIÓN CANÓNICA: PLAN FREE & POLICIES');
    console.log('================================================================\n');

    try {
        // -------------------------------------------------------------
        // TEST 1: Unicidad de Plan Free por Familia
        // -------------------------------------------------------------
        console.log('\x1b[36m[1] REGLA DE UNICIDAD DE PLAN FREE POR FAMILIA\x1b[0m');
        const families = await prisma.planFamily.findMany({
            include: {
                plans: {
                    where: { isFree: true }
                }
            }
        });

        assert(families.length >= 5, `Al menos 5 familias de planes existen (Encontradas: ${families.length})`);
        
        for (const fam of families) {
            assert(
                fam.plans.length === 1,
                `Familia "${fam.name}" (${fam.code}) tiene EXACTAMENTE un Plan Free canónico`,
                `Planes free encontrados: ${fam.plans.length}`
            );
            if (fam.plans.length === 1) {
                assert(fam.plans[0].price === 0, `  └─ Plan Free "${fam.plans[0].name}" tiene precio $0.00`);
            }
        }

        // -------------------------------------------------------------
        // TEST 2: Políticas en Base de Datos para Planes Free vs Pagados
        // -------------------------------------------------------------
        console.log('\n\x1b[36m[2] POLÍTICAS EN BD (FREE: RECEIVE=ALLOW, VIEW=DENY; PAGADOS: ALLOW)\x1b[0m');
        const freePlans = await prisma.plan.findMany({
            where: { isFree: true },
            include: { dataPolicies: true }
        });

        for (const fp of freePlans) {
            const receivePolicy = fp.dataPolicies.find(p => p.action === 'RECEIVE');
            const viewPolicy = fp.dataPolicies.find(p => p.action === 'VIEW');
            const detailsPolicy = fp.dataPolicies.find(p => p.action === 'VIEW_DETAILS');

            assert(
                receivePolicy?.effect === 'ALLOW',
                `Plan Free "${fp.name}" permite RECEIVE (público puede seguir ordenando/reservando)`
            );
            assert(
                viewPolicy?.effect === 'DENY',
                `Plan Free "${fp.name}" deniega VIEW general en base de datos`
            );
            assert(
                detailsPolicy?.effect === 'DENY',
                `Plan Free "${fp.name}" deniega VIEW_DETAILS en base de datos`
            );
        }

        // -------------------------------------------------------------
        // TEST 3: Resolución no destructiva de Plan Efectivo (AccessPolicyService)
        // -------------------------------------------------------------
        console.log('\n\x1b[36m[3] RESOLUCIÓN EN RUNTIME DE PLAN EFECTIVO (SIN MUTAR BD)\x1b[0m');
        
        // Buscar o crear un negocio de prueba con suscripción vencida
        let testBusiness = await prisma.negocio.findFirst({
            where: { slug: 'test-qa-policies' },
            include: { Suscripcion: { include: { Plan: true } }, BusinessType: true }
        });

        const restauranteFamily = await prisma.planFamily.findFirst({
            where: { code: 'RESTAURANTE' },
            include: { plans: true }
        });
        const paidPlan = restauranteFamily?.plans.find(p => !p.isFree);
        const freePlan = restauranteFamily?.plans.find(p => p.isFree);

        if (!testBusiness && paidPlan && freePlan) {
            const defaultBusinessType = await prisma.businessType.findFirst({
                where: { planFamilyId: restauranteFamily.id }
            });

            const testBusinessId = `qa_neg_${randomUUID()}`;
            testBusiness = await prisma.negocio.create({
                data: {
                    id: testBusinessId,
                    nombre: 'QA Restaurant Policies Test',
                    slug: 'test-qa-policies',
                    businessTypeId: defaultBusinessType?.id,
                    precioHora: 0.0,
                    horarioApertura: '08:00',
                    horarioCierre: '22:00',
                    updatedAt: new Date(),
                    Suscripcion: {
                        create: {
                            id: `sub_${randomUUID()}`,
                            planId: paidPlan.id,
                            estado: 'expired', // Expirado intencionalmente
                            isFounder: true,
                            founderPosition: 3,
                            lockedPrice: 19.99,
                            fechaInicio: new Date(Date.now() - 60 * 86400000),
                            fechaFin: new Date(Date.now() - 5 * 86400000), // Vencido hace 5 días
                            updatedAt: new Date()
                        }
                    }
                },
                include: { Suscripcion: { include: { Plan: true } }, BusinessType: true }
            });
        }

        if (testBusiness) {
            const { plan: effectivePlan, context: effectiveCtx } = await AccessPolicyService.getEffectivePlan(testBusiness.id);

            assert(effectiveCtx.isExpired === true, 'Negocio con suscripción vencida tiene context.isExpired = true');
            assert(effectiveCtx.isFreeTier === true, 'Negocio con suscripción vencida tiene context.isFreeTier = true (degradado a Free)');
            assert(effectivePlan.isFree === true, 'El plan efectivo en runtime es el Plan Free canónico (plan.isFree = true)');
            assert(effectivePlan.id === freePlan?.id, `El plan efectivo coincide con el Free de la familia (${freePlan?.name})`);

            // COMPROBACIÓN CRÍTICA: Base de datos intacta
            const rawSub = await prisma.suscripcion.findUnique({
                where: { negocioId: testBusiness.id }
            });

            assert(rawSub?.planId === paidPlan?.id, 'COMPROBACIÓN CRÍTICA: Suscripcion.planId en BD NO fue mutado (permanece con su plan contratado)');
            assert(rawSub?.isFounder === true, 'COMPROBACIÓN CRÍTICA: isFounder en BD sigue siendo true');
            assert(rawSub?.founderPosition === 3, 'COMPROBACIÓN CRÍTICA: founderPosition en BD sigue siendo 3');
            assert(rawSub?.lockedPrice === 19.99, 'COMPROBACIÓN CRÍTICA: lockedPrice en BD sigue siendo $19.99 intacto');

            // -------------------------------------------------------------
            // TEST 4: Compuerta de Seguridad (VIEW=false fuerza detalles a false)
            // -------------------------------------------------------------
            console.log('\n\x1b[36m[4] COMPUERTA ESTRICTA: VIEW=false FUERZA DETALLES A false\x1b[0m');
            const ordersPolicy = await AccessPolicyService.getResourcePolicy(testBusiness.id, 'ORDERS');
            
            assert(ordersPolicy.receive === true, 'receive es true (RECEIVE desacoplado de VIEW)');
            assert(ordersPolicy.view === false, 'view es false para negocio en Plan Free');
            assert(ordersPolicy.details === false, 'details es false por compuerta de seguridad');
            assert(ordersPolicy.customer === false, 'customer es false por compuerta de seguridad');
            assert(ordersPolicy.contact === false, 'contact es false por compuerta de seguridad');
            assert(ordersPolicy.items === false, 'items es false por compuerta de seguridad');
            assert(ordersPolicy.prices === false, 'prices es false por compuerta de seguridad');
            assert(ordersPolicy.financials === false, 'financials es false por compuerta de seguridad');
            assert(ordersPolicy.manage === false, 'manage es false');

            // -------------------------------------------------------------
            // TEST 5: Protectores de Redacción Limpia (Strict null, isLocked=true)
            // -------------------------------------------------------------
            console.log('\n\x1b[36m[5] PROTECTORES DE REDACCIÓN LIMPIA (NULL, SIN 0S ENGAÑOSOS, ISLOCKED=TRUE)\x1b[0m');

            // Probar Order
            const mockRawOrder = {
                id: 'ord_123',
                nombreCliente: 'Carlos Santana',
                telefonoCliente: '+573001234567',
                direccionCliente: 'Calle 100 #15-20',
                total: 85.50,
                subtotal: 75.00,
                costoEnvio: 10.50,
                notas: 'Sin cebolla por favor',
                items: [{ id: 'item_1', nombre: 'Hamburguesa Doble', precio: 35.0, cantidad: 2 }],
                createdAt: new Date(),
                estado: 'PENDIENTE'
            };

            const protectedOrder = protectOrder(mockRawOrder, ordersPolicy);
            assert(protectedOrder.nombreCliente === 'Cliente Protegido', 'Order: nombreCliente protegido');
            assert(protectedOrder.telefonoCliente === null, 'Order: telefonoCliente redactado a null');
            assert(protectedOrder.total === null, 'Order: total redactado a null (NUNCA 0 numérico)');
            assert(protectedOrder.items === null, 'Order: items redactado a null');
            assert(protectedOrder.notas === null, 'Order: notas redactado a null');
            assert(protectedOrder.isLocked === true, 'Order: inyectado isLocked = true');
            assert(protectedOrder.lockReason === 'PLAN_EXPIRED', 'Order: lockReason = "PLAN_EXPIRED"');
            assert(protectedOrder.id === 'ord_123', 'Order: metadata no sensible (id, estado) preservada');

            // Probar Appointment
            const appointmentsPolicy = await AccessPolicyService.getResourcePolicy(testBusiness.id, 'APPOINTMENTS');
            const mockRawAppointment = {
                id: 'apt_456',
                fecha: '2026-09-10',
                horaInicio: '10:00',
                horaFin: '11:00',
                duracion: 60,
                estado: 'CONFIRMADA',
                cliente: {
                    id: 'cli_1',
                    nombre: 'Dra. María Lopez',
                    telefono: '+573119876543',
                    email: 'maria@ejemplo.com'
                },
                total: 120.00,
                comentarios: 'Paciente con alergias'
            };

            const protectedApt = protectAppointment(mockRawAppointment, appointmentsPolicy);
            assert(protectedApt.cliente?.nombre === 'Cliente Protegido', 'Appointment: cliente.nombre protegido');
            assert(protectedApt.cliente?.telefono === null, 'Appointment: cliente.telefono redactado a null');
            assert(protectedApt.total === null, 'Appointment: total redactado a null (NUNCA 0 numérico)');
            assert(protectedApt.comentarios === null, 'Appointment: comentarios redactados a null');
            assert(protectedApt.isLocked === true, 'Appointment: inyectado isLocked = true');
            assert(protectedApt.fecha === '2026-09-10', 'Appointment: fecha preservada');

            // Probar Reservation
            const reservationsPolicy = await AccessPolicyService.getResourcePolicy(testBusiness.id, 'RESERVATIONS');
            const mockReservation = {
                id: 'res_789',
                fecha: '2026-09-15',
                horaInicio: '18:00',
                estado: 'RESERVADA',
                cliente: {
                    id: 'cli_2',
                    nombre: 'Pedro Gomez',
                    telefono: '+573205554433',
                    email: 'pedro@correo.com'
                },
                total: 250.00
            };
            const protectedRes = protectReservation(mockReservation, reservationsPolicy);
            assert(protectedRes.cliente?.nombre === 'Cliente Protegido', 'Reservation: cliente.nombre protegido');
            assert(protectedRes.cliente?.telefono === null, 'Reservation: cliente.telefono redactado a null');
            assert(protectedRes.total === null, 'Reservation: total redactado a null');
            assert(protectedRes.isLocked === true, 'Reservation: isLocked = true');

            // Probar ServiceOrder
            const serviceOrdersPolicy = await AccessPolicyService.getResourcePolicy(testBusiness.id, 'SERVICE_ORDERS');
            const mockServiceOrder = {
                id: 'so_101',
                numeroOrden: 'SO-101',
                nombreCliente: 'Laura Sanchez',
                telefonoCliente: '+573009998877',
                total: 95.0,
                prendas: [{ id: 'p1', prenda: 'Vestido de Seda', precio: 95.0 }]
            };
            const protectedSO = protectServiceOrder(mockServiceOrder, serviceOrdersPolicy);
            assert(protectedSO.nombreCliente === 'Cliente Protegido', 'ServiceOrder: nombreCliente protegido');
            assert(protectedSO.telefonoCliente === null, 'ServiceOrder: telefonoCliente redactado a null');
            assert(protectedSO.total === null, 'ServiceOrder: total redactado a null');
            assert(protectedSO.prendas === null, 'ServiceOrder: prendas redactadas a null');
            assert(protectedSO.isLocked === true, 'ServiceOrder: isLocked = true');

            // Probar StoreOrder
            const storeOrdersPolicy = await AccessPolicyService.getResourcePolicy(testBusiness.id, 'STORE_ORDERS');
            const mockStoreOrder = {
                id: 'sto_202',
                nombreCliente: 'Andres Castro',
                telefonoCliente: '+573154443322',
                total: 430.0,
                direccionCliente: 'Cra 7 #45-10'
            };
            const protectedStoreOrder = protectStoreOrder(mockStoreOrder, storeOrdersPolicy);
            assert(protectedStoreOrder.nombreCliente === 'Cliente Protegido', 'StoreOrder: nombreCliente protegido');
            assert(protectedStoreOrder.telefonoCliente === null, 'StoreOrder: telefonoCliente redactado a null');
            assert(protectedStoreOrder.total === null, 'StoreOrder: total redactado a null');
            assert(protectedStoreOrder.direccionCliente === null, 'StoreOrder: direccionCliente redactada a null');
            assert(protectedStoreOrder.isLocked === true, 'StoreOrder: isLocked = true');

            // Probar Customer
            const customersPolicy = await AccessPolicyService.getResourcePolicy(testBusiness.id, 'CUSTOMERS');
            const mockCustomer = {
                id: 'cust_303',
                nombre: 'Ana Ruiz',
                telefono: '+573176665544',
                email: 'ana@ejemplo.com',
                totalGastado: 1250.0,
                totalReservas: 14
            };
            const protectedCust = protectCustomer(mockCustomer, customersPolicy);
            assert(protectedCust.nombre === 'Cliente Protegido', 'Customer: nombre protegido');
            assert(protectedCust.telefono === null, 'Customer: telefono redactado a null');
            assert(protectedCust.email === null, 'Customer: email redactado a null');
            assert(protectedCust.totalGastado === null, 'Customer: totalGastado redactado a null');
            assert(protectedCust.isLocked === true, 'Customer: isLocked = true');

            // -------------------------------------------------------------
            // TEST 6: Integración con EntitlementsService
            // -------------------------------------------------------------
            console.log('\n\x1b[36m[6] INTEGRACIÓN CON ENTITLEMENTS SERVICE\x1b[0m');
            const entitlements = await EntitlementsService.resolve(testBusiness.id);
            assert(entitlements.planId === freePlan?.id, 'EntitlementsService resuelve el planId efectivo hacia el Plan Free');

            // Limpieza del negocio de prueba
            await prisma.suscripcion.deleteMany({ where: { negocioId: testBusiness.id } });
            await prisma.negocio.delete({ where: { id: testBusiness.id } });
            console.log('  \x1b[32m✓\x1b[0m Negocio y suscripción de prueba eliminados limpiamente tras validar.');
        }

    } catch (err: any) {
        console.error('\x1b[31mError fatal durante las pruebas:\x1b[0m', err);
        failedTests++;
    } finally {
        await prisma.$disconnect();
    }

    console.log('\n================================================================');
    console.log(` RESULTADOS: ${passedTests} APROBADAS | ${failedTests} FALLIDAS`);
    console.log('================================================================\n');

    if (failedTests > 0) {
        process.exit(1);
    }
}

runTests();
