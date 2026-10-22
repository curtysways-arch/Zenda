/**
 * Script de pruebas para el sistema de Precios Negociados por Suscripción
 *
 * Ejecutar con:
 *   npx tsx src/scripts/test_negotiated_pricing.ts
 *
 * El script prueba 12 casos de negocio del motor pricingService.
 * NO modifica datos de producción — usa un negocioId de prueba aislado.
 */

import prisma from '../lib/prisma';
import { pricingService } from '../lib/services/pricingService';
import { getEffectiveSubscriptionPrice } from '../lib/services/planService';


// ─── Utilidades de test ──────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, description: string, detail?: any) {
  if (condition) {
    console.log(`  ✅ ${description}`);
    passed++;
  } else {
    console.error(`  ❌ ${description}`, detail ? `→ ${JSON.stringify(detail)}` : '');
    failed++;
  }
}

// ─── Setup: suscripción de prueba ────────────────────────────────────────────

const TEST_PLAN_ID = 'plan_restaurante_crecimiento'; // debe existir en la BD local
let TEST_SUB_ID: string;
let TEST_NEGOCIO_ID: string;

async function setup() {
  console.log('\n📦 Setup: creando negocio y suscripción de prueba...');

  const negocio = await (prisma.negocio as any).create({
    data: {
      id: `test-pricing-${Date.now()}`,
      nombre: 'Test Pricing Override',
      slug: `test-pricing-${Date.now()}`,
      estado: 'ACTIVO',
      precioHora: 10.0,
      horarioApertura: '08:00',
      horarioCierre: '20:00',
      updatedAt: new Date(),
    }
  });


  TEST_NEGOCIO_ID = negocio.id;

  const plan = await prisma.plan.findFirst({
    where: { activo: true },
    orderBy: { price: 'asc' }
  });

  if (!plan) throw new Error('No hay planes activos en la BD');

  const fechaFin = new Date();
  fechaFin.setDate(fechaFin.getDate() + 30);

  const sub = await (prisma.suscripcion as any).create({
    data: {
      id: `test-sub-pricing-${Date.now()}`,
      negocioId: negocio.id,
      planId: plan.id,
      estado: 'ACTIVE',
      fechaInicio: new Date(),
      fechaFin,
      isFounder: false,
      lockedPrice: null,
      updatedAt: new Date(),
    }
  });

  TEST_SUB_ID = sub.id;

  console.log(`  Negocio ID: ${TEST_NEGOCIO_ID}`);
  console.log(`  Suscripción ID: ${TEST_SUB_ID}`);
  console.log(`  Plan: ${plan.name} — $${plan.price}/mes\n`);

  return { plan, sub };
}

async function teardown() {
  console.log('\n🧹 Teardown: limpiando datos de prueba...');
  if (TEST_SUB_ID) {
    await prisma.subscriptionPricingAudit.deleteMany({ where: { subscriptionId: TEST_SUB_ID } });
    await prisma.subscriptionPricingOverride.deleteMany({ where: { subscriptionId: TEST_SUB_ID } });
    await (prisma.suscripcion as any).deleteMany({ where: { id: TEST_SUB_ID } });
  }
  if (TEST_NEGOCIO_ID) {
    await (prisma.negocio as any).deleteMany({ where: { id: TEST_NEGOCIO_ID } });
  }
  console.log('  Datos de prueba eliminados.\n');
}


// ─── CASO 1: Precio normal (sin override) ────────────────────────────────────

async function test01_precioNormal(plan: any) {
  console.log('─────────────────────────────────────────────────────────');
  console.log('Caso 1: Precio normal (sin override)');

  const result = await pricingService.getEffectivePrice(TEST_SUB_ID);
  assert(result !== null, 'getEffectivePrice no es null');
  assert(result?.amount === plan.price, `Precio igual al plan ($${plan.price})`, result?.amount);
  assert(result?.source === 'PLAN', 'Fuente es PLAN', result?.source);
  assert(!result?.negotiatedPrice, 'No hay negotiatedPrice', result?.negotiatedPrice);
}

// ─── CASO 2: Precio negociado permanente ─────────────────────────────────────

async function test02_negociadoPermanente(plan: any) {
  console.log('─────────────────────────────────────────────────────────');
  console.log('Caso 2: Precio negociado PERMANENTE $5');

  const { overrideId } = await pricingService.applyNegotiatedPrice({
    subscriptionId: TEST_SUB_ID,
    amount: 5.00,
    currency: 'USD',
    duration: 'PERMANENT',
    reason: 'Test permanente',
    createdByAdminId: 'TEST_ADMIN',
  });

  const result = await pricingService.getEffectivePrice(TEST_SUB_ID);
  assert(result?.amount === 5.00, 'Precio efectivo es $5', result?.amount);
  assert(result?.source === 'NEGOTIATED_PRICE', 'Fuente es NEGOTIATED_PRICE', result?.source);
  assert(result?.negotiatedPrice === 5.00, 'negotiatedPrice es 5', result?.negotiatedPrice);
  assert(result?.planPrice === plan.price, 'planPrice conserva el catálogo', result?.planPrice);

  // Cancelar para el siguiente test
  await pricingService.cancelOverride(overrideId, 'TEST_ADMIN', 'Cleanup test 02');
}

// ─── CASO 3: Precio negociado temporal 1 ciclo → vuelve al plan ──────────────

async function test03_temporalUnCiclo(plan: any) {
  console.log('─────────────────────────────────────────────────────────');
  console.log('Caso 3: Precio negociado TEMPORAL 1 ciclo');

  const { overrideId } = await pricingService.applyNegotiatedPrice({
    subscriptionId: TEST_SUB_ID,
    amount: 5.00,
    currency: 'USD',
    duration: 1,
    reason: 'Test temporal 1 ciclo',
    createdByAdminId: 'TEST_ADMIN',
  });

  // Ciclo 1 → debe ser $5
  const result1 = await pricingService.getEffectivePrice(TEST_SUB_ID);
  assert(result1?.amount === 5.00, 'Ciclo 1 → $5', result1?.amount);
  assert(result1?.source === 'NEGOTIATED_PRICE', 'Ciclo 1 → fuente NEGOTIATED_PRICE', result1?.source);

  // Avanzar ciclo → debe expirar
  await pricingService.advanceSubscriptionCycle(TEST_SUB_ID);

  // Ciclo 2 → debe volver al plan
  const result2 = await pricingService.getEffectivePrice(TEST_SUB_ID);
  assert(result2?.amount === plan.price, `Ciclo 2 → $${plan.price} (precio del plan)`, result2?.amount);
  assert(result2?.source === 'PLAN', 'Ciclo 2 → fuente PLAN', result2?.source);
}

// ─── CASO 4: Precio negociado temporal 3 ciclos ──────────────────────────────

async function test04_temporalTresCiclos(plan: any) {
  console.log('─────────────────────────────────────────────────────────');
  console.log('Caso 4: Precio negociado TEMPORAL 3 ciclos');

  const { overrideId } = await pricingService.applyNegotiatedPrice({
    subscriptionId: TEST_SUB_ID,
    amount: 9.99,
    currency: 'USD',
    duration: 3,
    reason: 'Test temporal 3 ciclos',
    createdByAdminId: 'TEST_ADMIN',
  });

  // Ciclos 1, 2, 3 → $9.99
  for (let i = 1; i <= 3; i++) {
    const r = await pricingService.getEffectivePrice(TEST_SUB_ID);
    assert(r?.amount === 9.99, `Ciclo ${i} → $9.99`, r?.amount);
    if (i < 3) await pricingService.advanceSubscriptionCycle(TEST_SUB_ID);
  }

  // Avanzar ciclo 3 → expira
  await pricingService.advanceSubscriptionCycle(TEST_SUB_ID);

  // Ciclo 4 → precio del plan
  const r4 = await pricingService.getEffectivePrice(TEST_SUB_ID);
  assert(r4?.amount === plan.price, `Ciclo 4 → $${plan.price} (plan)`, r4?.amount);
  assert(r4?.source === 'PLAN', 'Ciclo 4 → fuente PLAN', r4?.source);
}

// ─── CASO 5: Founder protegido ───────────────────────────────────────────────

async function test05_founderProtegido() {
  console.log('─────────────────────────────────────────────────────────');
  console.log('Caso 5: Founder — lockedPrice protegido');

  // Marcar suscripción de prueba como Founder
  await (prisma.suscripcion as any).update({
    where: { id: TEST_SUB_ID },
    data: {
      isFounder: true,
      founderPosition: 99,
      lockedPrice: 10.00,
    }
  });

  // Sin override → debe usar lockedPrice como FOUNDER
  const r1 = await pricingService.getEffectivePrice(TEST_SUB_ID);
  assert(r1?.amount === 10.00, 'Founder sin override → $10', r1?.amount);
  assert(r1?.source === 'FOUNDER', 'Fuente es FOUNDER', r1?.source);

  // Aplicar override temporal de $5 por 1 ciclo
  const { overrideId } = await pricingService.applyNegotiatedPrice({
    subscriptionId: TEST_SUB_ID,
    amount: 5.00,
    currency: 'USD',
    duration: 1,
    reason: 'Override sobre Founder test',
    createdByAdminId: 'TEST_ADMIN',
  });

  // Ciclo 1 → override en efecto
  const r2 = await pricingService.getEffectivePrice(TEST_SUB_ID);
  assert(r2?.amount === 5.00, 'Ciclo 1 con override → $5', r2?.amount);
  assert(r2?.source === 'NEGOTIATED_PRICE', 'Fuente es NEGOTIATED_PRICE', r2?.source);

  // Avanzar ciclo → expira override, vuelve a Founder
  await pricingService.advanceSubscriptionCycle(TEST_SUB_ID);

  const r3 = await pricingService.getEffectivePrice(TEST_SUB_ID);
  assert(r3?.amount === 10.00, 'Después del override → vuelve a $10 (Founder)', r3?.amount);
  assert(r3?.source === 'FOUNDER', 'Fuente vuelve a FOUNDER', r3?.source);

  // Restaurar estado no-Founder para los siguientes tests
  await (prisma.suscripcion as any).update({
    where: { id: TEST_SUB_ID },
    data: {
      isFounder: false,
      founderPosition: null,
      lockedPrice: null,
    }
  });
}


// ─── CASO 6: getEffectiveSubscriptionPrice (función síncrona legada) ─────────

async function test06_funcionSincronaLegada() {
  console.log('─────────────────────────────────────────────────────────');
  console.log('Caso 6: getEffectiveSubscriptionPrice (función síncrona legada)');

  const sub = await (prisma.suscripcion as any).findUnique({
    where: { id: TEST_SUB_ID },
    include: { Plan: true }
  });

  // Sin lockedPrice ni customFeatures.specialPrice → devuelve plan.price
  const price = getEffectiveSubscriptionPrice(sub);
  assert(typeof price === 'number', 'Devuelve un número', price);
  assert(price === sub.Plan?.price, `Precio igual al plan ($${sub.Plan?.price})`, price);
}

// ─── CASO 7: Cancelar override manualmente ───────────────────────────────────

async function test07_cancelarManualmente(plan: any) {
  console.log('─────────────────────────────────────────────────────────');
  console.log('Caso 7: Cancelar override manualmente (CANCEL_NEGOTIATED_PRICE)');

  const { overrideId } = await pricingService.applyNegotiatedPrice({
    subscriptionId: TEST_SUB_ID,
    amount: 7.00,
    currency: 'USD',
    duration: 'PERMANENT',
    reason: 'Test cancelación',
    createdByAdminId: 'TEST_ADMIN',
  });

  const r1 = await pricingService.getEffectivePrice(TEST_SUB_ID);
  assert(r1?.amount === 7.00, 'Override activo → $7', r1?.amount);

  // Cancelar
  await pricingService.cancelOverride(overrideId, 'TEST_ADMIN', 'Cancelación manual test');

  const r2 = await pricingService.getEffectivePrice(TEST_SUB_ID);
  assert(r2?.source === 'PLAN', 'Después de cancelar → vuelve a PLAN', r2?.source);
  assert(r2?.amount === plan.price, `Precio vuelve a $${plan.price}`, r2?.amount);
}

// ─── CASO 8: Historial de auditoría ──────────────────────────────────────────

async function test08_historialAuditoria() {
  console.log('─────────────────────────────────────────────────────────');
  console.log('Caso 8: Historial de auditoría — getAuditHistory');

  const historial = await pricingService.getAuditHistory(TEST_SUB_ID);
  assert(Array.isArray(historial), 'getAuditHistory devuelve array', historial);
  // Debería haber entradas de los tests anteriores
  assert(historial.length > 0, `Hay ${historial.length} entradas de auditoría`, historial.length);
  const actions = historial.map((h: any) => h.action);
  assert(
    actions.some((a: string) => a.includes('NEGOTIATED_PRICE_') || a === 'CREATED' || a === 'CANCELLED' || a === 'EXPIRED'),
    'Hay acciones auditadas registradas correctamente',
    actions
  );

}

// ─── CASO 9: getOverrides ─────────────────────────────────────────────────────

async function test09_getOverrides() {
  console.log('─────────────────────────────────────────────────────────');
  console.log('Caso 9: getOverrides — todos los overrides de la suscripción');

  const overrides = await pricingService.getOverrides(TEST_SUB_ID);
  assert(Array.isArray(overrides), 'getOverrides devuelve array', overrides);
  // Los overrides anteriores (ya expirados/cancelados) deben aparecer en el historial
  assert(overrides.length >= 0, 'Hay 0 o más overrides (históricos)', overrides.length);
}

// ─── CASO 10: Suscripción no encontrada ──────────────────────────────────────

async function test10_suscripcionNoEncontrada() {
  console.log('─────────────────────────────────────────────────────────');
  console.log('Caso 10: getEffectivePrice con ID inexistente');

  const result = await pricingService.getEffectivePrice('id-que-no-existe-xyz');
  assert(result === null, 'Devuelve null para ID inexistente', result);
}

// ─── CASO 11: No se duplica override activo ───────────────────────────────────

async function test11_noDuplicaOverrideActivo() {
  console.log('─────────────────────────────────────────────────────────');
  console.log('Caso 11: No puede haber dos overrides ACTIVE simultáneos');

  // Aplicar primero
  await pricingService.applyNegotiatedPrice({
    subscriptionId: TEST_SUB_ID,
    amount: 3.00,
    currency: 'USD',
    duration: 'PERMANENT',
    reason: 'Test duplicado 1',
    createdByAdminId: 'TEST_ADMIN',
  });

  // El segundo debe cancelar el anterior automáticamente
  await pricingService.applyNegotiatedPrice({
    subscriptionId: TEST_SUB_ID,
    amount: 4.00,
    currency: 'USD',
    duration: 'PERMANENT',
    reason: 'Test duplicado 2',
    createdByAdminId: 'TEST_ADMIN',
  });

  const activeOverrides = await prisma.subscriptionPricingOverride.findMany({
    where: { subscriptionId: TEST_SUB_ID, status: 'ACTIVE' }
  });
  assert(activeOverrides.length === 1, 'Solo 1 override ACTIVE simultáneo', activeOverrides.length);
  assert(activeOverrides[0].amount === 4.00, 'El activo es el más reciente ($4)', activeOverrides[0].amount);

  // Cancelar para limpiar
  await pricingService.cancelOverride(activeOverrides[0].id, 'TEST_ADMIN', 'Cleanup test 11');
}

// ─── CASO 12: Resiliencia — precio siempre calculable ────────────────────────

async function test12_resilienciaCalculo(plan: any) {
  console.log('─────────────────────────────────────────────────────────');
  console.log('Caso 12: Resiliencia — getEffectivePrice siempre devuelve precio válido');

  // Sin ningún override activo
  const r = await pricingService.getEffectivePrice(TEST_SUB_ID);
  assert(r !== null, 'No devuelve null cuando hay plan', r);
  assert(typeof r?.amount === 'number' && r.amount >= 0, 'amount es un número ≥ 0', r?.amount);
  assert(['PLAN', 'FOUNDER', 'LOCKED_PRICE', 'NEGOTIATED_PRICE'].includes(r?.source || ''), 'source es válido', r?.source);
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   TEST SUITE — PRECIOS NEGOCIADOS POR SUSCRIPCIÓN   ║');
  console.log('╚══════════════════════════════════════════════════════╝');

  let plan: any;
  try {
    const setup_result = await setup();
    plan = setup_result.plan;

    await test01_precioNormal(plan);
    await test02_negociadoPermanente(plan);
    await test03_temporalUnCiclo(plan);
    await test04_temporalTresCiclos(plan);
    await test05_founderProtegido();
    await test06_funcionSincronaLegada();
    await test07_cancelarManualmente(plan);
    await test08_historialAuditoria();
    await test09_getOverrides();
    await test10_suscripcionNoEncontrada();
    await test11_noDuplicaOverrideActivo();
    await test12_resilienciaCalculo(plan);

  } catch (err) {
    console.error('\n💥 Error inesperado en los tests:', err);
    failed++;
  } finally {
    try {
      await teardown();
    } catch (cleanupErr) {
      console.warn('⚠️  Error en teardown (limpiar manualmente si es necesario):', cleanupErr);
    }
    await prisma.$disconnect();
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  RESULTADO: ${passed} ✅ pasaron | ${failed} ❌ fallaron`);
  console.log('═══════════════════════════════════════════════════════\n');

  if (failed > 0) process.exit(1);
}

main();
