/**
 * @file test_fase5a_blueprint_resolver.ts
 * @module scratch
 * @description Script de verificación de la FASE 5A: Resolución correcta de negocios legacy → Blueprint → Capabilities.
 * @responsibility Probar que cada tipoNegocio real de Prisma se mapea correctamente al BlueprintManifest canónico y genera un BusinessRuntimeContext válido con las capacidades correctas.
 */

import { BackwardCompatibilityAdapter } from '../src/core/adapters/BackwardCompatibilityAdapter';
import { ALL_BLUEPRINT_MANIFESTS } from '../src/core/blueprints/BlueprintManifests';
import { RuntimeKernel } from '../src/core/kernel/RuntimeKernel';
import { FeatureFlagProvider } from '../src/core/kernel/FeatureFlagProvider';
import { CapabilityRegistry } from '../src/core/registries/CapabilityRegistry';

// Capacidades
import { RestaurantCapability } from '../src/core/capabilities/RestaurantCapability';
import { SpaCapability } from '../src/core/capabilities/SpaCapability';
import { LaundryCapability } from '../src/core/capabilities/LaundryCapability';
import { CourtsCapability } from '../src/core/capabilities/CourtsCapability';

async function runFase5AResolverTest() {
  console.log('===============================================================');
  console.log('  FASE 5A: VERIFICACIÓN DE BLUEPRINT RESOLVER');
  console.log('===============================================================\n');

  // ───────────────────────────────────────────────────────────
  // 1. Verificar mapeo legacy → Blueprint para cada tipoNegocio real
  // ───────────────────────────────────────────────────────────
  console.log('1. MAPEO LEGACY → BLUEPRINT MANIFEST\n');

  const legacyBusinesses = [
    { id: 'biz-001', slug: 'symechas-peluquera',     tipoNegocio: 'RESERVA',       nombre: 'Symechas Peluquería' },
    { id: 'biz-002', slug: 'parrilla-citiox-demo',   tipoNegocio: 'PRODUCTOS',     nombre: 'La Parrilla Citiox' },
    { id: 'biz-003', slug: 'lavanderia-express',     tipoNegocio: 'SHOE_CARE',     nombre: 'Lavandería Express' },
    { id: 'biz-004', slug: 'cancha-padel-norte',     tipoNegocio: 'SPORTS_COURTS', nombre: 'Pádel Norte' },
    { id: 'biz-005', slug: 'spa-relax-center',       tipoNegocio: 'SPA',           nombre: 'Spa Relax Center' },
    { id: 'biz-006', slug: 'pincho-express',         tipoNegocio: 'PINCHO_LISTO',  nombre: 'Pincho Express' },
    { id: 'biz-007', slug: 'restaurante-italiano',   tipoNegocio: 'RESTAURANT',    nombre: 'Ristorante Italiano' },
    { id: 'biz-008', slug: 'canchas-futbol',         tipoNegocio: 'CANCHAS',       nombre: 'Canchas de Fútbol' },
    { id: 'biz-009', slug: 'peluqueria-moderna',     tipoNegocio: 'PELUQUERIA',    nombre: 'Peluquería Moderna' },
  ];

  let allMappingsCorrect = true;

  const expectedMappings: Record<string, { blueprint: string; capability: string }> = {
    'RESERVA':       { blueprint: 'SPA',           capability: 'spa' },
    'PRODUCTOS':     { blueprint: 'RESTAURANT',    capability: 'restaurant' },
    'SHOE_CARE':     { blueprint: 'LAUNDRY',       capability: 'laundry' },
    'SPORTS_COURTS': { blueprint: 'SPORTS_COURTS', capability: 'courts' },
    'SPA':           { blueprint: 'SPA',           capability: 'spa' },
    'PINCHO_LISTO':  { blueprint: 'PINCHO_LISTO',  capability: 'restaurant' },
    'RESTAURANT':    { blueprint: 'RESTAURANT',    capability: 'restaurant' },
    'CANCHAS':       { blueprint: 'SPORTS_COURTS', capability: 'courts' },
    'PELUQUERIA':    { blueprint: 'SPA',           capability: 'spa' },
  };

  for (const biz of legacyBusinesses) {
    const context = BackwardCompatibilityAdapter.toRuntimeContext(biz);
    const expected = expectedMappings[biz.tipoNegocio];
    const blueprintOk = context.blueprint === expected.blueprint;
    const capabilityOk = context.activeCapabilities.includes(expected.capability);
    const ok = blueprintOk && capabilityOk;

    if (!ok) allMappingsCorrect = false;

    const status = ok ? '✅' : '❌';
    console.log(`   ${status} ${biz.nombre} (${biz.tipoNegocio})`);
    console.log(`      → Blueprint: ${context.blueprint} (esperado: ${expected.blueprint}) ${blueprintOk ? '✓' : '✗'}`);
    console.log(`      → Capabilities: [${context.activeCapabilities.join(', ')}] (esperado incluye: ${expected.capability}) ${capabilityOk ? '✓' : '✗'}`);
  }

  console.log(`\n   Resultado mapeo: ${allMappingsCorrect ? '✅ TODOS CORRECTOS' : '❌ HAY ERRORES'}\n`);

  // ───────────────────────────────────────────────────────────
  // 2. Verificar que el RuntimeKernel NO arranca con runtime.enabled = false
  // ───────────────────────────────────────────────────────────
  console.log('2. VERIFICACIÓN: runtime.enabled = false NO activa el kernel\n');

  FeatureFlagProvider.getInstance().setFlag('runtime.enabled', false);
  const kernelPassive = new RuntimeKernel();
  const symechasContext = BackwardCompatibilityAdapter.toRuntimeContext(legacyBusinesses[0]);

  kernelPassive.getCapabilityRegistry().register(new SpaCapability());
  await kernelPassive.boot(symechasContext);

  console.log(`   Estado del Kernel (flag=false): ${kernelPassive.getState()}`);
  console.log(`   ${kernelPassive.getState() === 'STOPPED' ? '✅' : '❌'} Kernel no arrancó (producción segura)\n`);

  // ───────────────────────────────────────────────────────────
  // 3. Verificar que con runtime.enabled = true SÍ arranca para piloto
  // ───────────────────────────────────────────────────────────
  console.log('3. VERIFICACIÓN: runtime.enabled = true activa el kernel para piloto\n');

  FeatureFlagProvider.getInstance().setFlag('runtime.enabled', true);
  const kernelPilot = new RuntimeKernel();
  const symechasContextPilot = BackwardCompatibilityAdapter.toRuntimeContext(legacyBusinesses[0]);

  kernelPilot.getCapabilityRegistry().register(new SpaCapability());
  await kernelPilot.boot(symechasContextPilot);

  const spaHealth = await kernelPilot.getCapabilityRegistry().getAll()[0]?.getHealth();

  console.log(`   Negocio: ${symechasContextPilot.slug}`);
  console.log(`   Blueprint resuelto: ${symechasContextPilot.blueprint}`);
  console.log(`   Capabilities activas: [${symechasContextPilot.activeCapabilities.join(', ')}]`);
  console.log(`   Estado del Kernel: ${kernelPilot.getState()}`);
  console.log(`   Salud de SpaCapability: ${spaHealth?.status} - ${spaHealth?.diagnostics.join(', ')}`);
  console.log(`   ${kernelPilot.getState() === 'RUNNING' ? '✅' : '❌'} Kernel piloto operativo\n`);

  await kernelPilot.shutdown();

  // ───────────────────────────────────────────────────────────
  // 4. Verificar cadena completa para un restaurante (PRODUCTOS)
  // ───────────────────────────────────────────────────────────
  console.log('4. VERIFICACIÓN: Cadena completa para PRODUCTOS → RESTAURANT\n');

  const kernelRestaurant = new RuntimeKernel();
  const parrillaContext = BackwardCompatibilityAdapter.toRuntimeContext(legacyBusinesses[1]);

  kernelRestaurant.getCapabilityRegistry().register(new RestaurantCapability());
  await kernelRestaurant.boot(parrillaContext);

  console.log(`   Negocio: ${parrillaContext.slug}`);
  console.log(`   tipoNegocio original: PRODUCTOS`);
  console.log(`   Blueprint resuelto: ${parrillaContext.blueprint}`);
  console.log(`   Capabilities activas: [${parrillaContext.activeCapabilities.join(', ')}]`);
  console.log(`   Estado del Kernel: ${kernelRestaurant.getState()}`);
  console.log(`   ${kernelRestaurant.getState() === 'RUNNING' && parrillaContext.blueprint === 'RESTAURANT' ? '✅' : '❌'} Cadena PRODUCTOS → RESTAURANT operativa\n`);

  await kernelRestaurant.shutdown();

  // Reset flags
  FeatureFlagProvider.getInstance().setFlag('runtime.enabled', false);

  console.log('===============================================================');
  console.log(`  ${allMappingsCorrect ? '✅' : '❌'} PRUEBA DE BLUEPRINT RESOLVER FASE 5A COMPLETADA`);
  console.log('===============================================================');
}

runFase5AResolverTest().catch(err => {
  console.error('❌ Error en prueba FASE 5A:', err);
});
