/**
 * @file test_fase3_blueprints.ts
 * @module scratch
 * @description Script de prueba unitaria aislado para verificar los Blueprints y Capacidades de la FASE 3.
 * @responsibility Probar los manifiestos y capacidades RESTAURANT, SPA, LAUNDRY, SPORTS_COURTS y PINCHO_LISTO en el RuntimeKernel sin depender de Prisma ni de la UI.
 * @dependencies FASE 3 Core Capabilities & Blueprints
 */

import { RuntimeKernel } from '../src/core/kernel/RuntimeKernel';
import { FeatureFlagProvider } from '../src/core/kernel/FeatureFlagProvider';
import { BlueprintComposer } from '../src/core/blueprints/BlueprintComposer';
import { BackwardCompatibilityAdapter } from '../src/core/adapters/BackwardCompatibilityAdapter';
import { ALL_BLUEPRINT_MANIFESTS } from '../src/core/blueprints/BlueprintManifests';

// Capacidades FASE 3
import { RestaurantCapability } from '../src/core/capabilities/RestaurantCapability';
import { SpaCapability } from '../src/core/capabilities/SpaCapability';
import { LaundryCapability } from '../src/core/capabilities/LaundryCapability';
import { CourtsCapability } from '../src/core/capabilities/CourtsCapability';
import { PinchoListoCapability } from '../src/core/capabilities/PinchoListoCapability';

async function runFase3BlueprintsTest() {
  console.log('===============================================================');
  console.log('  CITIOX ENTERPRISE CORE vNEXT - PRUEBA DE BLUEPRINTS FASE 3');
  console.log('===============================================================\n');

  // Activar feature flag en memoria para el entorno de pruebas
  FeatureFlagProvider.getInstance().setFlag('runtime.enabled', true);

  const composer = new BlueprintComposer();
  const blueprintsToTest = ['RESTAURANT', 'SPA', 'LAUNDRY', 'SPORTS_COURTS', 'PINCHO_LISTO'];

  for (const blueprintKey of blueprintsToTest) {
    console.log(`\n---------------------------------------------------------------`);
    console.log(`▶ PROBANDO BLUEPRINT: [${blueprintKey}]`);
    console.log(`---------------------------------------------------------------`);

    // 1. Obtener manifiesto declarativo puro
    const manifest = ALL_BLUEPRINT_MANIFESTS[blueprintKey];
    console.log(`1. Manifiesto: "${manifest.name}" (v${manifest.version})`);

    // 2. Compilar ExecutionPlan con BlueprintComposer
    const executionPlan = composer.compose(manifest);
    console.log(`2. ExecutionPlan: Válido = ${executionPlan.valid}, Capacidades = [${executionPlan.orderedCapabilityIds.join(', ')}]`);

    // 3. Crear RuntimeContext con BackwardCompatibilityAdapter
    const legacyBizObj = {
      id: `biz-${blueprintKey.toLowerCase()}`,
      slug: `demo-${blueprintKey.toLowerCase()}`,
      tipoNegocio: blueprintKey,
      configuracion: JSON.stringify({ testMode: true })
    };
    const runtimeContext = BackwardCompatibilityAdapter.toRuntimeContext(legacyBizObj);
    console.log(`3. BusinessRuntimeContext generado para slug: ${runtimeContext.slug}`);

    // 4. Inicializar RuntimeKernel y registrar la capacidad correspondiente
    const kernel = new RuntimeKernel();
    const registry = kernel.getCapabilityRegistry();

    if (blueprintKey === 'RESTAURANT') {
      registry.register(new RestaurantCapability());
    } else if (blueprintKey === 'SPA') {
      registry.register(new SpaCapability());
    } else if (blueprintKey === 'LAUNDRY') {
      registry.register(new LaundryCapability());
    } else if (blueprintKey === 'SPORTS_COURTS') {
      registry.register(new CourtsCapability());
    } else if (blueprintKey === 'PINCHO_LISTO') {
      registry.register(new PinchoListoCapability());
    }

    // 5. Boot del Kernel
    await kernel.boot(runtimeContext);
    console.log(`4. Estado del Kernel tras Boot: [${kernel.getState()}]`);

    // 6. Probar consumo de la API expuesta por la capacidad
    const registeredCaps = registry.getAll();
    if (registeredCaps.length > 0) {
      const cap = registeredCaps[0];
      console.log(`5. Probando API expuesta de capacidad '${cap.metadata.id}':`, Object.keys(cap.api));
      const health = await cap.getHealth();
      console.log(`6. Diagnóstico de Salud: [${health.status}] - ${health.diagnostics.join(', ')}`);
    }

    // 7. Shutdown del Kernel
    await kernel.shutdown();
    console.log(`7. Estado del Kernel tras Shutdown: [${kernel.getState()}]`);
  }

  console.log('\n===============================================================');
  console.log('  ✅ PRUEBA DE 5 BLUEPRINTS FASE 3 COMPLETADA CON ÉXITO');
  console.log('===============================================================');
}

runFase3BlueprintsTest().catch(err => {
  console.error('❌ Error en prueba de Blueprints FASE 3:', err);
});
