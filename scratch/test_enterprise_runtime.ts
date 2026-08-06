/**
 * @file test_enterprise_runtime.ts
 * @module scratch
 * @description Script de prueba unitaria aislado para verificar la infraestructura Core Foundation FASE 1.
 * @responsibility Instanciar y verificar pasivamente el RuntimeKernel, CapabilityRegistry, ServiceRegistry, BlueprintComposer y BackwardCompatibilityAdapter en memoria sin modificar la base de datos de producción.
 * @dependencies Core Foundation FASE 1
 */

import { Capability, CapabilityHealth, RouteDefinition, NavigationDefinition, PermissionDefinition, WidgetDefinition, EventDefinition } from '../src/core/contracts/Capability';
import { RuntimeKernel } from '../src/core/kernel/RuntimeKernel';
import { FeatureFlagProvider } from '../src/core/kernel/FeatureFlagProvider';
import { ServiceRegistry } from '../src/core/registries/ServiceRegistry';
import { BlueprintComposer, BlueprintManifest } from '../src/core/blueprints/BlueprintComposer';
import { BackwardCompatibilityAdapter } from '../src/core/adapters/BackwardCompatibilityAdapter';
import { EventEnvelope } from '../src/core/events/EventBus';

// 1. Definición de Capacidad Ficticia para Pruebas (Mock Capability)
class MockDemoCapability implements Capability {
  public metadata = {
    id: 'demo-orders',
    version: '1.0.0',
    contractVersion: '1.0',
    name: 'Demo Orders Capability',
    description: 'Capacidad de prueba para la FASE 1',
    category: 'CORE' as const,
    startupPriority: 10,
    dependencies: []
  };

  public api = {
    testMethod: () => 'OK from Mock API'
  };

  public async install(): Promise<void> {}
  public async configure(): Promise<void> {}
  public async enable(): Promise<void> {
    console.log('   -> [MockDemoCapability] Habilitada correctamente');
  }
  public async disable(): Promise<void> {
    console.log('   -> [MockDemoCapability] Deshabilitada correctamente');
  }
  public async uninstall(): Promise<void> {}

  public getRoutes(): RouteDefinition[] { return []; }
  public getPermissions(): PermissionDefinition[] { return []; }
  public getNavigation(): NavigationDefinition[] { return []; }
  public getWidgets(): WidgetDefinition[] { return []; }
  public getEvents(): EventDefinition[] { return []; }

  public async getHealth(): Promise<CapabilityHealth> {
    return {
      status: 'RUNNING',
      version: '1.0.0',
      startedAt: new Date(),
      dependencies: [],
      diagnostics: ['Mock operational']
    };
  }

  public async migrate(): Promise<void> {}

  public registerSubscriptions(eventBus: any): void {
    eventBus.subscribe('orders.confirmed.v1', (envelope: EventEnvelope) => {
      console.log('   -> [MockDemoCapability] Recibido evento versionado orders.confirmed.v1:', envelope.payload);
    });
  }
}

async function runFoundationTest() {
  console.log('===============================================================');
  console.log('  CITIOX ENTERPRISE CORE vNEXT - PRUEBA DE INFRAESTRUCTURA FASE 1');
  console.log('===============================================================\n');

  // A. Verificar Feature Flags
  const flags = FeatureFlagProvider.getInstance();
  console.log('1. Verificando Feature Flags por defecto:');
  console.log('   runtime.enabled:', flags.isEnabled('runtime.enabled')); // Debería ser false
  flags.setFlag('runtime.enabled', true);
  console.log('   runtime.enabled (después de activar en memoria):', flags.isEnabled('runtime.enabled'));

  // B. Verificar BlueprintComposer (Puro)
  console.log('\n2. Probando BlueprintComposer (Compilación pura de manifiesto):');
  const composer = new BlueprintComposer();
  const dummyManifest: BlueprintManifest = {
    id: 'RESTAURANT',
    version: '1.0.0',
    name: 'Blueprint Restaurante',
    capabilities: [
      { id: 'demo-orders', version: '1.0.0', enabled: true, configuration: {}, dependencies: [] }
    ]
  };
  const executionPlan = composer.compose(dummyManifest);
  console.log('   ExecutionPlan válido:', executionPlan.valid);
  console.log('   Capacidades ordenadas:', executionPlan.orderedCapabilityIds);

  // C. Verificar ServiceRegistry con Lazy Loading
  console.log('\n3. Probando ServiceRegistry (Lazy Loading & Scopes):');
  const serviceRegistry = new ServiceRegistry();
  let createdCount = 0;
  serviceRegistry.register('DummyPricingEngine', () => {
    createdCount++;
    return { calculate: () => 100 };
  }, 'SINGLETON');

  console.log('   Instancias creadas antes de resolve():', createdCount);
  const service = serviceRegistry.resolve<any>('DummyPricingEngine');
  console.log('   Instancias creadas después de resolve():', createdCount);
  console.log('   Resultado de cálculo:', service.calculate());

  // D. Verificar BackwardCompatibilityAdapter
  console.log('\n4. Probando BackwardCompatibilityAdapter (Traducción de negocio legacy):');
  const legacyBiz = {
    id: 'biz-123',
    slug: 'parrilla-citiox-demo',
    tipoNegocio: 'RESTAURANT',
    configuracion: JSON.stringify({ deliveryConfig: { baseCost: 2.0 } })
  };
  const runtimeContext = BackwardCompatibilityAdapter.toRuntimeContext(legacyBiz);
  console.log('   RuntimeContext generado:', {
    businessId: runtimeContext.businessId,
    slug: runtimeContext.slug,
    blueprint: runtimeContext.blueprint,
    activeCapabilities: runtimeContext.activeCapabilities
  });

  // E. Inicializar y Orquestar RuntimeKernel
  console.log('\n5. Probando RuntimeKernel Boot & EventBus:');
  const kernel = new RuntimeKernel();
  
  // Registrar la capacidad mock en el registry
  kernel.getCapabilityRegistry().register(new MockDemoCapability());

  // Boot del Kernel
  await kernel.boot(runtimeContext);
  console.log('   Estado del Kernel tras boot:', kernel.getState());

  // Probar publicación de evento de dominio versionado
  console.log('\n6. Publicando evento versionado (orders.confirmed.v1):');
  await kernel.getEventBus().publish({
    eventId: 'evt-test-999',
    name: 'orders.confirmed',
    version: 'v1',
    timestamp: new Date().toISOString(),
    correlationId: 'corr-test-111',
    businessId: 'biz-123',
    source: 'test-script',
    payload: { orderId: 'ord-555', total: 42.50 }
  });

  // Comprobar salud combinada de capacidades
  console.log('\n7. Comprobando salud del Runtime:');
  const health = await kernel.getCapabilityRegistry().getCombinedHealth();
  console.log('   Salud combinada:', health);

  // Apagar el kernel limpiamente
  console.log('\n8. Apagando RuntimeKernel:');
  await kernel.shutdown();
  console.log('   Estado del Kernel tras shutdown:', kernel.getState());

  console.log('\n===============================================================');
  console.log('  ✅ PRUEBA DE INFRAESTRUCTURA FASE 1 COMPLETADA CON ÉXITO');
  console.log('===============================================================');
}

runFoundationTest().catch(err => {
  console.error('❌ Error en prueba de infraestructura:', err);
});
