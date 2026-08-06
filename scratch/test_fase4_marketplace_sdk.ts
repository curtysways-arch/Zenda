/**
 * @file test_fase4_marketplace_sdk.ts
 * @module scratch
 * @description Script de prueba unitaria aislado para verificar la FASE 4 (Capability Marketplace & SDK).
 * @responsibility Probar la creación de capacidades con CapabilitySDK, la búsqueda en MarketplaceRegistry, la gestión lógica en CapabilityManager, la migración con CapabilityMigrationRunner y el manifiesto consolidado de PINCHO_LISTO sin tocar la BD de producción.
 * @dependencies FASE 4 Core Marketplace & SDK
 */

import { CapabilitySDK } from '../src/core/sdk/CapabilitySDK';
import { MarketplaceRegistry } from '../src/core/marketplace/MarketplaceRegistry';
import { CapabilityManager } from '../src/core/marketplace/CapabilityManager';
import { CapabilityMigrationRunner } from '../src/core/marketplace/CapabilityMigrationRunner';
import { RuntimeKernel } from '../src/core/kernel/RuntimeKernel';
import { FeatureFlagProvider } from '../src/core/kernel/FeatureFlagProvider';
import { BackwardCompatibilityAdapter } from '../src/core/adapters/BackwardCompatibilityAdapter';
import { RestaurantCapability } from '../src/core/capabilities/RestaurantCapability';

async function runFase4MarketplaceSDKTest() {
  console.log('===============================================================');
  console.log('  CITIOX ENTERPRISE CORE vNEXT - PRUEBA MARKETPLACE & SDK FASE 4');
  console.log('===============================================================\n');

  FeatureFlagProvider.getInstance().setFlag('runtime.enabled', true);

  // 1. Probar la creación de una capacidad desacoplada con CapabilitySDK
  console.log('1. Probando CapabilitySDK (Constructor de capacidades estandarizado):');
  const customPluginCap = CapabilitySDK.createCapability({
    metadata: {
      id: 'inventory_extended',
      version: '1.2.0',
      contractVersion: '1.0',
      name: 'Capacidad de Inventario Avanzado',
      description: 'Control de stock por lotes, insumos y proveedores',
      category: 'OPERATIONS',
      startupPriority: 50,
      dependencies: []
    },
    api: {
      checkStock: (sku: string) => ({ sku, available: 150 })
    },
    onEnable: () => console.log('   -> [CustomPluginCap] Insumos e Inventario habilitados'),
    onDisable: () => console.log('   -> [CustomPluginCap] Insumos e Inventario deshabilitados'),
    migration: async (fromVer, toVer) => {
      console.log(`   -> [CustomPluginCap] Migrando tablas de inventario de v${fromVer} a v${toVer}...`);
    }
  });

  console.log('   Capacidad creada exitosamente:', customPluginCap.metadata.name, `[ID: ${customPluginCap.metadata.id}]`);
  console.log('   Verificación de API expuesta:', customPluginCap.api.checkStock('SKU-100'));

  // 2. Probando el MarketplaceRegistry (Catálogo interno oficial)
  console.log('\n2. Probando MarketplaceRegistry (Catálogo interno de descubrimiento):');
  const marketplace = MarketplaceRegistry.getInstance();
  const availableItems = marketplace.getAvailableCapabilities();
  console.log(`   Total capacidades registradas en catálogo: ${availableItems.length}`);

  // Búsqueda por palabra clave
  const searchResults = marketplace.searchCapabilities('cocina');
  console.log(`   Resultados de búsqueda para 'cocina': ${searchResults.map(s => s.metadata.name).join(', ')}`);

  // 3. Probando CapabilityManager (Gestión de estado lógico y configuración por negocio)
  console.log('\n3. Probando CapabilityManager (Instalación y conmutación de estado segura):');
  const capManager = new CapabilityManager();
  const runtimeContext = BackwardCompatibilityAdapter.toRuntimeContext({
    id: 'biz-fastfood-001',
    slug: 'pincho-listo-express',
    tipoNegocio: 'PINCHO_LISTO'
  });

  console.log('   Blueprint asignado:', runtimeContext.blueprint);
  const installedState = await capManager.installCapability(runtimeContext, 'restaurant', { expressMode: true, fastFulfillment: true });
  console.log('   Capacidad instalada:', installedState.capabilityId, '(Habilitada:', installedState.enabled, ')');

  // Conmutación de estado
  await capManager.setCapabilityState(runtimeContext, 'restaurant', false);
  console.log('   Capacidad tras deshabilitar:', runtimeContext.activeCapabilities.includes('restaurant') ? 'Activa' : 'Inactiva');

  await capManager.setCapabilityState(runtimeContext, 'restaurant', true);
  console.log('   Capacidad tras volver a habilitar:', runtimeContext.activeCapabilities.includes('restaurant') ? 'Activa' : 'Inactiva');

  // 4. Probando CapabilityMigrationRunner (Ejecutor de migraciones versionadas)
  console.log('\n4. Probando CapabilityMigrationRunner (Ejecución de migraciones v1.0.0 -> v1.2.0):');
  const migrationRunner = new CapabilityMigrationRunner();
  const migrationResult = await migrationRunner.runMigration(customPluginCap, '1.0.0', '1.2.0');
  console.log('   Resultado de migración:', migrationResult);

  // 5. Probando consolidación de PINCHO_LISTO en RestaurantCapability con expressMode
  console.log('\n5. Probando Consolidación de PINCHO_LISTO en RestaurantCapability (expressMode: true):');
  const kernel = new RuntimeKernel();
  const restaurantCap = new RestaurantCapability();

  kernel.getCapabilityRegistry().register(restaurantCap);
  await kernel.boot(runtimeContext);

  console.log('   Estado del Kernel tras boot de PINCHO_LISTO:', kernel.getState());
  console.log('   Mesas del restaurante express:', restaurantCap.api.getTables());
  
  const health = await restaurantCap.getHealth();
  console.log('   Salud de RestaurantCapability:', health.status, '-', health.diagnostics);

  await kernel.shutdown();
  console.log('   Estado del Kernel tras shutdown:', kernel.getState());

  console.log('\n===============================================================');
  console.log('  ✅ PRUEBA DE MARKETPLACE & SDK FASE 4 COMPLETADA CON ÉXITO');
  console.log('===============================================================');
}

runFase4MarketplaceSDKTest().catch(err => {
  console.error('❌ Error en prueba FASE 4 Marketplace & SDK:', err);
});
