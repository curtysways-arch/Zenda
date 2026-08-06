/**
 * @file test_fase5b_restaurant_pilot.ts
 * @module scratch
 * @description Script de verificación de FASE 5B: Pilotaje del Restaurant Runtime en Citiox Enterprise vNext.
 * @responsibility Probar la integración de RestaurantRuntimeAdapter con OrderRuntime, FulfillmentEngine, DeliveryEngine y PricingEngine.
 */

import { RestaurantRuntimeAdapter, LegacyPedido } from '../src/core/adapters/RestaurantRuntimeAdapter';
import { VersionedEventBus } from '../src/core/events/EventBus';
import { FeatureFlagProvider } from '../src/core/kernel/FeatureFlagProvider';
import { NotificationRuntime } from '../src/core/notifications/NotificationRuntime';

async function runFase5BPilotTest() {
  console.log('===============================================================');
  console.log('  FASE 5B: VERIFICACIÓN DE RESTAURANT RUNTIME PILOT');
  console.log('===============================================================\n');

  const eventBus = new VersionedEventBus();
  const notificationRuntime = new NotificationRuntime(eventBus);
  const adapter = new RestaurantRuntimeAdapter(eventBus);

  // Pedido de prueba simulando datos de Prisma
  const samplePedido: LegacyPedido = {
    id: 'ped-piloto-001',
    negocioId: 'parrilla-citiox-demo-id',
    numeroPedido: 101,
    estado: 'WAITING_CONFIRMATION',
    tipoEntrega: 'DOMICILIO',
    nombreCliente: 'Carlos Mendoza',
    telefonoCliente: '0991234567',
    direccionCliente: 'Av. Amazonas N24-15 y Colón',
    referenciaCliente: 'Frente a la farmacia',
    latitud: -0.180653,
    longitud: -78.467838,
    subtotal: 25.00,
    costoEnvio: 2.50,
    total: 28.00,
    extraInfo: {
      pricingBreakdown: { distanceKm: 3.2 }
    },
    items: [
      { productoId: 'prod-01', nombreProducto: 'Parrillada Mixta', precioUnitario: 18.00, cantidad: 1 },
      { productoId: 'prod-02', nombreProducto: 'Bebida 1.5L', precioUnitario: 3.50, cantidad: 2 }
    ]
  };

  // 1. Verificación cuando runtime está deshabilitado (Default Producción)
  console.log('1. VERIFICACIÓN CON RUNTIME DESHABILITADO (default producción)\n');
  FeatureFlagProvider.getInstance().setFlag('runtime.enabled', false);
  FeatureFlagProvider.getInstance().setFlag('runtime.capabilities', false);

  const resultDisabled = await adapter.processOrderConfirmed(samplePedido);
  console.log(`   Processed: ${resultDisabled.processed}`);
  console.log(`   Reason: ${resultDisabled.skippedReason}`);
  console.log(`   ${!resultDisabled.processed ? '✅' : '❌'} Producción segura: El runtime ignora el procesamiento si no está activo.\n`);

  // 2. Verificación con runtime activado para Piloto
  console.log('2. VERIFICACIÓN CON RUNTIME ACTIVADO (Piloto Enterprise)\n');
  FeatureFlagProvider.getInstance().setFlag('runtime.enabled', true);
  FeatureFlagProvider.getInstance().setFlag('runtime.capabilities', true);

  // 2a. Creación de pedido nuevo
  console.log('   [Step A] Procesando nuevo pedido...');
  const resultNew = await adapter.processNewOrder(samplePedido);
  console.log(`      Processed: ${resultNew.processed}`);
  console.log(`      Order Status: ${resultNew.orderState.status}`);
  console.log(`      ${resultNew.orderState.status === 'WAITING_ACCEPTANCE' ? '✅' : '❌'} Nuevo pedido inicializado en WAITING_ACCEPTANCE\n`);

  // 2b. Confirmación de pedido (OrderRuntime -> FulfillmentEngine -> DeliveryEngine)
  console.log('   [Step B] Procesando confirmación de pedido...');
  const resultConfirmed = await adapter.processOrderConfirmed(samplePedido);
  console.log(`      Order Commercial Status: ${resultConfirmed.orderState.status}`);
  console.log(`      Fulfillment Ticket ID: ${resultConfirmed.fulfillmentTicket?.ticketId}`);
  console.log(`      Fulfillment Current Stage: ${resultConfirmed.fulfillmentTicket?.currentStage}`);
  console.log(`      Delivery Task ID: ${resultConfirmed.deliveryTask?.taskId}`);
  console.log(`      Delivery Task State: ${resultConfirmed.deliveryTask?.state}`);

  const confirmedOk = resultConfirmed.orderState.status === 'CONFIRMED' &&
                      resultConfirmed.fulfillmentTicket?.currentStage === 'CONFIRMED' &&
                      resultConfirmed.deliveryTask?.state === 'WAITING_DISPATCH';
  console.log(`      ${confirmedOk ? '✅' : '❌'} Orquestación completa confirmada exitosamente\n`);

  // 2c. Avance de Fulfillment Stage (Cocina KDS)
  console.log('   [Step C] Avanzando etapa de preparación en KDS...');
  if (resultConfirmed.fulfillmentTicket) {
    const updatedTicket = await adapter.getFulfillmentEngine().advanceStage(resultConfirmed.fulfillmentTicket);
    console.log(`      Fulfillment Next Stage: ${updatedTicket.currentStage}`);
    console.log(`      ${updatedTicket.currentStage === 'PREPARING' ? '✅' : '❌'} Ticket KDS avanzado a PREPARING\n`);
  }

  // 2d. Notificaciones
  console.log('   [Step D] Verificando logs de notificaciones desatendidas...');
  const logs = notificationRuntime.getNotificationLogs();
  console.log(`      Notificaciones enviadas: ${logs.length}`);
  logs.forEach(l => console.log(`      - [${l.topic}] Message: "${l.message}"`));
  console.log(`      ${logs.length > 0 ? '✅' : '❌'} NotificationRuntime recibió eventos versionados correctamente\n`);

  // Reset flags
  FeatureFlagProvider.getInstance().setFlag('runtime.enabled', false);
  FeatureFlagProvider.getInstance().setFlag('runtime.capabilities', false);

  console.log('===============================================================');
  console.log('  ✅ PRUEBA DE RESTAURANT RUNTIME PILOT FASE 5B COMPLETADA');
  console.log('===============================================================');
}

runFase5BPilotTest().catch(err => {
  console.error('❌ Error en prueba FASE 5B:', err);
});
