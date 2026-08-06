/**
 * @file test_fase2_core_runtime.ts
 * @module scratch
 * @description Script de prueba unitaria aislado para verificar los motores del Core FASE 2.
 * @responsibility Probar la resolución en ServiceRegistry, OrderRuntime, FulfillmentEngine, PricingEngine, DeliveryEngine y NotificationRuntime vía VersionedEventBus sin modificar la base de datos de producción.
 * @dependencies Core Runtime FASE 2
 */

import { VersionedEventBus } from '../src/core/events/EventBus';
import { ServiceRegistry } from '../src/core/registries/ServiceRegistry';
import { OrderRuntime } from '../src/core/runtimes/OrderRuntime';
import { FulfillmentEngine } from '../src/core/fulfillment/FulfillmentEngine';
import { PricingEngine } from '../src/core/pricing/PricingEngine';
import { DeliveryEngine } from '../src/core/delivery/DeliveryEngine';
import { NotificationRuntime } from '../src/core/notifications/NotificationRuntime';
import { OrderRuntimeAdapter } from '../src/core/adapters/OrderRuntimeAdapter';

async function runFase2CoreRuntimeTest() {
  console.log('===============================================================');
  console.log('  CITIOX ENTERPRISE CORE vNEXT - PRUEBA DE MOTORES FASE 2');
  console.log('===============================================================\n');

  const eventBus = new VersionedEventBus();
  const serviceRegistry = new ServiceRegistry();

  // 1. Instanciar NotificationRuntime y suscribir a eventos
  console.log('1. Inicializando NotificationRuntime:');
  const notificationRuntime = new NotificationRuntime(eventBus);

  // 2. Registrar adaptadores PricingEngine y DeliveryEngine en ServiceRegistry
  console.log('\n2. Registrando adaptadores de servicio en ServiceRegistry:');
  serviceRegistry.register('PricingEngine', () => new PricingEngine(), 'SINGLETON');
  serviceRegistry.register('DeliveryEngine', () => new DeliveryEngine(eventBus), 'SINGLETON');

  const pricingEngine = serviceRegistry.resolve<PricingEngine>('PricingEngine');
  const deliveryEngine = serviceRegistry.resolve<DeliveryEngine>('DeliveryEngine');

  // 3. Probar cálculo de precios con empaque por producto y delivery GPS
  console.log('\n3. Probando PricingEngine (Cálculo con reglas de empaque y GPS):');
  const pricingResult = pricingEngine.calculate({
    items: [
      { productId: 'p1', name: 'Hamburguesa Doble', unitPrice: 8.50, quantity: 2, takeawayQty: 1, packagingRequirement: 'OPTIONAL' },
      { productId: 'p2', name: 'Gaseosa 500ml', unitPrice: 1.50, quantity: 2, packagingRequirement: 'NOT_REQUIRED' },
      { productId: 'p3', name: 'Parrillada Familiar', unitPrice: 25.00, quantity: 1, packagingRequirement: 'REQUIRED' }
    ],
    deliveryType: 'DELIVERY_ORDER',
    distanceKm: 4.2, // Debe coincidir con zona 3-5 km ($2.50)
    discountAmount: 2.00
  });

  console.log('   Resultado de Precios:', pricingResult);

  // 4. Probar máquina de estados comercial de OrderRuntime & Adapter
  console.log('\n4. Probando OrderRuntime & OrderRuntimeAdapter:');
  const adapter = new OrderRuntimeAdapter(eventBus);
  let orderState = await adapter.createFromLegacyOrder({
    id: 'ord-test-777',
    negocioId: 'parrilla-citiox-demo',
    subtotal: pricingResult.subtotal,
    total: pricingResult.total,
    items: []
  });

  console.log('   Estado inicial:', orderState.status);
  
  // Transición a ACCEPTED
  orderState = await adapter.processStatusChange(orderState, 'ACCEPTED');
  console.log('   Estado tras aceptar:', orderState.status);

  // Transición a CONFIRMED
  orderState = await adapter.processStatusChange(orderState, 'CONFIRMED');
  console.log('   Estado tras confirmar cobro en caja:', orderState.status);

  // 5. Probar motor de cumplimiento por etapas (FulfillmentEngine)
  console.log('\n5. Probando FulfillmentEngine (Pipeline de etapas para RESTAURANT):');
  const fulfillmentEngine = new FulfillmentEngine(eventBus);
  let ticket = fulfillmentEngine.createTicket(orderState.orderId, orderState.businessId, 'RESTAURANT');
  console.log('   Etapa inicial del Ticket KDS:', ticket.currentStage);

  // Avanzar a PREPARING
  ticket = await fulfillmentEngine.advanceStage(ticket);
  console.log('   Etapa avanzada a:', ticket.currentStage);

  // Avanzar a READY
  ticket = await fulfillmentEngine.advanceStage(ticket);
  console.log('   Etapa avanzada a:', ticket.currentStage);

  // Avanzar a WAITING_DISPATCH
  ticket = await fulfillmentEngine.advanceStage(ticket);
  console.log('   Etapa avanzada a:', ticket.currentStage);

  // 6. Probar motor de logística (DeliveryEngine)
  console.log('\n6. Probando DeliveryEngine (Asignación & Batch Dispatch):');
  deliveryEngine.registerDriver({
    driverId: 'drv-01',
    name: 'Carlos Repartidor',
    phone: '0991234567',
    vehicleType: 'MOTO',
    status: 'DISPONIBLE'
  });

  const task = deliveryEngine.createDeliveryTask({
    orderId: orderState.orderId,
    businessId: orderState.businessId,
    customerName: 'Cliente Prueba',
    customerPhone: '0998765432',
    address: 'Av. Amazonas y Colón',
    distanceKm: 4.2,
    deliveryCost: pricingResult.deliveryCost
  });

  console.log('   Tarea de delivery creada:', task.taskId, '(Estado:', task.state, ')');

  // Asignación en lote
  const assigned = await deliveryEngine.assignBatch([task.taskId], 'drv-01');
  console.log('   Tarea asignada a repartidor:', assigned[0].driverId, '(Estado:', assigned[0].state, ')');

  // Actualizar a PICKED_UP
  await deliveryEngine.updateDeliveryState(task.taskId, 'PICKED_UP');
  console.log('   Estado de entrega actualizado a: PICKED_UP');

  // Actualizar a DELIVERED
  await deliveryEngine.updateDeliveryState(task.taskId, 'DELIVERED');
  console.log('   Estado de entrega actualizado a: DELIVERED');

  // 7. Verificar registros de notificaciones automáticas capturadas por eventos
  console.log('\n7. Verificando notificaciones enviadas por NotificationRuntime:');
  const notifLogs = notificationRuntime.getNotificationLogs();
  console.log(`   Total notificaciones capturadas por eventos: ${notifLogs.length}`);
  notifLogs.forEach((l, i) => {
    console.log(`   [Notif #${i+1}] Tópico: ${l.topic} -> "${l.message}"`);
  });

  console.log('\n===============================================================');
  console.log('  ✅ PRUEBA DE MOTORES FASE 2 COMPLETADA CON ÉXITO');
  console.log('===============================================================');
}

runFase2CoreRuntimeTest().catch(err => {
  console.error('❌ Error en prueba de motores FASE 2:', err);
});
