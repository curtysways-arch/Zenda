/**
 * @file test_fase5c_restaurant_ui_integration.ts
 * @module scratch
 * @description Script de verificación de FASE 5C: Integración UI y Flujo Visible del Enterprise Runtime para Restaurante Piloto.
 * @responsibility Probar los 7 criterios de aceptación de FASE 5C:
 *   1. Negocio legacy (Symechas) opera con Enterprise Runtime OFF (isEnterprise = false).
 *   2. Negocio piloto (La Parrilla Citiox) opera con Enterprise Runtime ON (isEnterprise = true).
 *   3. Pedido entra por RestaurantOrderFlowAdapter y procesa por OrderRuntime.
 *   4. OrderRuntime cambia estados comerciales.
 *   5. FulfillmentEngine genera tickets de cocina KDS.
 *   6. DeliveryEngine recibe tareas de despacho para pedidos a domicilio.
 *   7. NotificationRuntime recibe eventos de notificación desatendidos.
 */

import { BusinessRuntimeResolver } from '../src/core/runtime/BusinessRuntimeResolver';
import { RestaurantOrderFlowAdapter } from '../src/core/adapters/RestaurantOrderFlowAdapter';
import { OrderStatusPresenter } from '../src/core/adapters/OrderStatusPresenter';
import { VersionedEventBus } from '../src/core/events/EventBus';
import { NotificationRuntime } from '../src/core/notifications/NotificationRuntime';
import { FeatureFlagProvider } from '../src/core/kernel/FeatureFlagProvider';

async function runFase5CIntegrationTest() {
  console.log('===============================================================');
  console.log('  FASE 5C: VERIFICACIÓN DE RESTAURANT RUNTIME PILOT UI INTEGRATION');
  console.log('===============================================================\n');

  // Asegurar que el flag global permanezca false por defecto
  FeatureFlagProvider.getInstance().setFlag('runtime.enabled', false);

  // ───────────────────────────────────────────────────────────
  // 1. Criterio 1 & 7: Symechas Peluquería (Legacy) opera con runtime OFF
  // ───────────────────────────────────────────────────────────
  console.log('1. VERIFICACIÓN NEGOCIO LEGACY: Symechas Peluquería\n');

  const symechasBusiness = {
    id: 'symechas-peluquera-id',
    slug: 'symechas-peluquera',
    tipoNegocio: 'RESERVA',
    nombre: 'Symechas Peluquería',
    configuracion: JSON.stringify({ activeCapabilities: { appointments: true } })
  };

  const symechasRuntime = await BusinessRuntimeResolver.resolve(symechasBusiness);
  console.log(`   Negocio: ${symechasBusiness.nombre} (${symechasBusiness.slug})`);
  console.log(`   tipoNegocio: ${symechasBusiness.tipoNegocio}`);
  console.log(`   isEnterprise: ${symechasRuntime.isEnterprise}`);
  console.log(`   Blueprint: ${symechasRuntime.blueprint}`);
  console.log(`   Reason: ${symechasRuntime.skippedReason}`);
  const symechasOk = !symechasRuntime.isEnterprise;
  console.log(`   ${symechasOk ? '✅ PASÓ' : '❌ FALLÓ'}: Symechas opera 100% legacy sin cambios.\n`);

  // ───────────────────────────────────────────────────────────
  // 2. Criterio 1: Restaurante Piloto (La Parrilla Citiox) opera con Enterprise Runtime ON
  // ───────────────────────────────────────────────────────────
  console.log('2. VERIFICACIÓN NEGOCIO PILOTO: La Parrilla Citiox (Enterprise ON)\n');

  const parrillaBusiness = {
    id: 'parrilla-citiox-demo-id',
    slug: 'parrilla-citiox-demo',
    tipoNegocio: 'PRODUCTOS',
    nombre: 'La Parrilla Citiox',
    configuracion: JSON.stringify({ useEnterpriseRuntime: true })
  };

  const parrillaRuntime = await BusinessRuntimeResolver.resolve(parrillaBusiness);
  console.log(`   Negocio: ${parrillaBusiness.nombre} (${parrillaBusiness.slug})`);
  console.log(`   tipoNegocio: ${parrillaBusiness.tipoNegocio}`);
  console.log(`   isEnterprise: ${parrillaRuntime.isEnterprise}`);
  console.log(`   Blueprint resuelto: ${parrillaRuntime.blueprint}`);
  console.log(`   Capabilities activas: [${parrillaRuntime.activeCapabilities.join(', ')}]`);
  console.log(`   Kernel Status: ${parrillaRuntime.kernel?.getState()}`);
  const pilotOk = parrillaRuntime.isEnterprise && parrillaRuntime.kernel?.getState() === 'RUNNING';
  console.log(`   ${pilotOk ? '✅ PASÓ' : '❌ FALLÓ'}: Restaurante Piloto arranca Kernel Enterprise exitosamente.\n`);

  // ───────────────────────────────────────────────────────────
  // 3. Criterio 2, 3, 4, 5, 6: Orquestación completa de un pedido real
  // ───────────────────────────────────────────────────────────
  console.log('3. ORQUESTACIÓN COMPLETA DE PEDIDO REAL EN EL PILOTO\n');

  const sharedBus = parrillaRuntime.kernel?.getEventBus() || new VersionedEventBus();
  const notificationRuntime = new NotificationRuntime(sharedBus);

  const samplePedido = {
    id: 'ped-fase5c-1001',
    negocioId: parrillaBusiness.id,
    numeroPedido: 501,
    estado: 'WAITING_CONFIRMATION',
    tipoEntrega: 'DOMICILIO',
    nombreCliente: 'Elena Gómez',
    telefonoCliente: '0987654321',
    direccionCliente: 'Calle de los Cerezos 123',
    subtotal: 32.00,
    costoEnvio: 3.00,
    total: 35.00,
    extraInfo: { useEnterpriseRuntime: true, pricingBreakdown: { distanceKm: 4.1 } },
    items: [
      { productoId: 'prod-lomo', nombreProducto: 'Lomo Fino 300g', precioUnitario: 22.00, cantidad: 1 },
      { productoId: 'prod-vino', nombreProducto: 'Copa de Vino Tinto', precioUnitario: 10.00, cantidad: 1 }
    ]
  };

  // 3a. Entrada por RestaurantOrderFlowAdapter
  console.log('   [Step A] Creando pedido a través de RestaurantOrderFlowAdapter...');
  const flowResult = await RestaurantOrderFlowAdapter.processNewOrder(parrillaBusiness, samplePedido, sharedBus);
  console.log(`      isEnterprise: ${flowResult.isEnterprise}`);
  console.log(`      Order Status: ${flowResult.runtimeResult?.orderState.status}`);
  const stepAOk = flowResult.isEnterprise && flowResult.runtimeResult?.orderState.status === 'WAITING_ACCEPTANCE';
  console.log(`      ${stepAOk ? '✓' : '✗'} Pedido ingresado correctamente en WAITING_ACCEPTANCE\n`);

  // 3b. Confirmación y envío a Cocina KDS + Delivery
  console.log('   [Step B] Confirmando pedido y generando comanda KDS + tarea Delivery...');
  const confirmResult = await RestaurantOrderFlowAdapter.processOrderStatusChange(
    parrillaBusiness,
    samplePedido,
    'CONFIRMED',
    sharedBus
  );

  const orderState = confirmResult.runtimeResult?.orderState;
  const ticket = confirmResult.runtimeResult?.fulfillmentTicket;
  const delivery = confirmResult.runtimeResult?.deliveryTask;

  console.log(`      Commercial Status: ${orderState?.status}`);
  console.log(`      Ticket KDS ID: ${ticket?.ticketId} (Etapa: ${ticket?.currentStage})`);
  console.log(`      Delivery Task ID: ${delivery?.taskId} (Estado: ${delivery?.state})`);

  const stepBOk = orderState?.status === 'CONFIRMED' &&
                  ticket?.currentStage === 'CONFIRMED' &&
                  delivery?.state === 'WAITING_DISPATCH';
  console.log(`      ${stepBOk ? '✓' : '✗'} Orquestación KDS y Delivery generada exitosamente\n`);

  // 3c. Presentación gráfica del estado (OrderStatusPresenter)
  console.log('   [Step C] Verificando traducciones UI con OrderStatusPresenter...');
  const displayWait = OrderStatusPresenter.present('WAITING_ACCEPTANCE', true);
  const displayConf = OrderStatusPresenter.present('CONFIRMED', true);
  const displayLegacy = OrderStatusPresenter.present('PENDIENTE_PAGO', false);

  console.log(`      Enterprise WAITING_ACCEPTANCE → Badge: "${displayWait.label}" (${displayWait.modeLabel})`);
  console.log(`      Enterprise CONFIRMED           → Badge: "${displayConf.label}" (${displayConf.modeLabel})`);
  console.log(`      Legacy PENDIENTE_PAGO          → Badge: "${displayLegacy.label}" (${displayLegacy.modeLabel})`);

  const stepCOk = displayWait.isEnterprise && !displayLegacy.isEnterprise;
  console.log(`      ${stepCOk ? '✓' : '✗'} OrderStatusPresenter traduce correctamente Enterprise vs Legacy\n`);

  // 3d. Notificaciones desatendidas
  console.log('   [Step D] Verificando capturas de NotificationRuntime...');
  const notifLogs = notificationRuntime.getNotificationLogs();
  console.log(`      Notificaciones desatendidas generadas: ${notifLogs.length}`);
  notifLogs.forEach(n => console.log(`      - [${n.topic}] ${n.message}`));
  const stepDOk = notifLogs.length > 0;
  console.log(`      ${stepDOk ? '✓' : '✗'} NotificationRuntime capturó los eventos versionados desatendidos\n`);

  // Limpieza de Kernel piloto
  await BusinessRuntimeResolver.shutdownBusiness(parrillaBusiness.id);

  const allPassed = symechasOk && pilotOk && stepAOk && stepBOk && stepCOk && stepDOk;

  console.log('===============================================================');
  console.log(`  ${allPassed ? '✅' : '❌'} PRUEBA FASE 5C (RESTAURANT UI INTEGRATION) COMPLETADA`);
  console.log('===============================================================');
}

runFase5CIntegrationTest().catch(err => {
  console.error('❌ Error en prueba FASE 5C:', err);
});
