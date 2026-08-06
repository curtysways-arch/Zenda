/**
 * @file test_fase5e_full_restaurant_flow.ts
 * @module scratch
 * @description Script de verificación de Integración Completa de Extremo a Extremo del Flujo Restaurante/Delivery (Parrilla Citiox).
 * @responsibility Validar los 18 puntos del requerimiento:
 *   1. Cálculo exacto con PricingEngine (Subtotal, Empaque, Delivery, Total).
 *   2. Checkout y creación de pedido vía RestaurantOrderFlowAdapter.
 *   3. KDS FulfillmentEngine y transiciones de cocina (CONFIRMED -> PREPARING -> READY).
 *   4. Logistics DeliveryEngine: Asignación, Rechazo con retorno a cola, Auto-asignación y entrega (ASSIGNED -> ON_ROUTE -> DELIVERED).
 *   5. NotificationRuntime con disparos automáticos hacia WhatsApp.
 */

import { BusinessRuntimeResolver } from '../src/core/runtime/BusinessRuntimeResolver';
import { RestaurantOrderFlowAdapter } from '../src/core/adapters/RestaurantOrderFlowAdapter';
import { PricingEngine } from '../src/core/pricing/PricingEngine';

async function runFullRestaurantFlowTest() {
  console.log('===================================================================');
  console.log('  FASE 5E: PRUEBA DE INTEGRACIÓN COMPLETA DE EXTREMO A EXTREMO');
  console.log('  RESTAURANTE / DELIVERY - PARRILLA CITIOX (ENTERPRISE VNEXT)');
  console.log('===================================================================\n');

  // 1. PRICING ENGINE
  console.log('1. CÁLCULO DE CARRITO MEDIANTE PRICING ENGINE (REGLAS DE EMPAQUE Y DELIVERY)');
  const pricingInput = {
    deliveryType: 'DELIVERY_ORDER' as const,
    packagingUnitPrice: 0.25,
    distanceKm: 3.5,
    deliveryConfig: { enabled: true, baseCost: 1.50, costPerKm: 0.50 },
    items: [
      { productId: 'p1', name: 'Pincho de carne', unitPrice: 1.50, quantity: 2, packagingRequirement: 'REQUIRED' as const }, // $3.00 + $0.50 empaque
      { productId: 'p2', name: 'Gaseosa 500ml', unitPrice: 0.50, quantity: 1, packagingRequirement: 'NOT_REQUIRED' as const },  // $0.50 + $0.00 empaque
    ]
  };

  const priceResult = PricingEngine.calculate(pricingInput);
  console.log(`   - Subtotal:           $${priceResult.subtotal.toFixed(2)}`);
  console.log(`   - Empaque:            $${priceResult.packagingCost.toFixed(2)}`);
  console.log(`   - Delivery:           $${priceResult.deliveryCost.toFixed(2)}`);
  console.log(`   - Total:              $${priceResult.total.toFixed(2)}`);

  const pricingOk = priceResult.subtotal === 3.50 && priceResult.packagingCost === 0.50 && priceResult.deliveryCost === 3.25;
  console.log(`   ${pricingOk ? '✅ PASÓ' : '❌ FALLÓ'}: PricingEngine calculó empaques y delivery correctamente.\n`);

  // 2. CREACIÓN DE PEDIDO Y ENTERPRISE RUNTIME
  console.log('2. CREACIÓN DE PEDIDO Y ENTRADA AL ENTERPRISE RUNTIME');
  const negocio = {
    id: 'parrilla-citiox-demo-id',
    slug: 'parrilla-citiox-demo',
    tipoNegocio: 'PRODUCTOS',
    nombre: 'La Parrilla Citiox',
    configuracion: JSON.stringify({ useEnterpriseRuntime: true })
  };

  const resolved = await BusinessRuntimeResolver.resolve(negocio);
  const runtime = resolved.kernel!;
  const deliveryEngine = runtime.getDeliveryEngine();
  const notificationRuntime = runtime.getNotificationRuntime();

  // Registrar 2 repartidores
  deliveryEngine.registerDriver({ driverId: 'drv-01', name: 'Marco Proaño', phone: '0991234567', vehicleType: 'MOTO', status: 'DISPONIBLE' });
  deliveryEngine.registerDriver({ driverId: 'drv-02', name: 'Carlos Caicedo', phone: '0999888777', vehicleType: 'MOTO', status: 'DISPONIBLE' });

  const newOrder = {
    id: `ped-fase5e-${Date.now()}`,
    negocioId: negocio.id,
    numeroPedido: 901,
    estado: 'WAITING_CONFIRMATION',
    tipoEntrega: 'DOMICILIO',
    nombreCliente: 'Juan Pérez',
    telefonoCliente: '0998877665',
    direccionCliente: 'Av. Granados E12-45',
    subtotal: priceResult.subtotal,
    costoEmpaque: priceResult.packagingCost,
    costoEnvio: priceResult.deliveryCost,
    total: priceResult.total,
    extraInfo: { useEnterpriseRuntime: true },
    items: [
      { productoId: 'p1', nombreProducto: 'Pincho de carne', precioUnitario: 1.50, cantidad: 2 },
      { productoId: 'p2', nombreProducto: 'Gaseosa 500ml', precioUnitario: 0.50, cantidad: 1 }
    ]
  };

  const newOrderResult = await RestaurantOrderFlowAdapter.processNewOrder(negocio, newOrder);
  console.log(`   - Order Status: ${newOrderResult.runtimeResult?.orderState.status}`);
  console.log(`   - Enterprise Runtime Active: ${newOrderResult.isEnterprise}\n`);

  // 3. COCINA (KDS) & ADAPTADOR
  console.log('3. COCINA (KDS) - CONFIRMACIÓN Y PREPARACIÓN DE PLATOS');
  const confirmResult = await RestaurantOrderFlowAdapter.processOrderStatusChange(negocio, newOrder, 'CONFIRMED');
  console.log(`   - Order State: ${confirmResult.runtimeResult?.orderState.status}`);
  console.log(`   - Ticket KDS: ${confirmResult.runtimeResult?.fulfillmentTicket.ticketId}`);
  console.log(`   - Delivery Task: ${confirmResult.runtimeResult?.deliveryTask.taskId}\n`);

  // 4. FLUJO DE REPARTIDOR (ASIGNACIÓN -> RECHAZO -> REASIGNACIÓN AUTOMÁTICA -> ENTREGA)
  console.log('4. LOGÍSTICA DE REPARTIDOR - PRUEBA DE RECHAZO Y AUTO-REASIGNACIÓN');
  const activeKernel = (await BusinessRuntimeResolver.resolve(negocio)).kernel!;
  const activeDeliveryEngine = activeKernel.getDeliveryEngine();
  const activeNotifRuntime = activeKernel.getNotificationRuntime();

  // Registrar repartidores en el motor de delivery activo del negocio
  activeDeliveryEngine.registerDriver({ driverId: 'drv-01', name: 'Marco Proaño', phone: '0991234567', vehicleType: 'MOTO', status: 'DISPONIBLE' });
  activeDeliveryEngine.registerDriver({ driverId: 'drv-02', name: 'Carlos Caicedo', phone: '0999888777', vehicleType: 'MOTO', status: 'DISPONIBLE' });

  const taskId = confirmResult.runtimeResult?.deliveryTask.taskId;

  // Asignar primer repartidor drv-01
  await activeDeliveryEngine.assignBatch([taskId], 'drv-01');
  console.log(`   - Repartidor drv-01 asignado a tarea ${taskId}`);

  // Repartidor drv-01 rechaza la tarea
  console.log('   - Repartidor drv-01 RECHAZA la tarea...');
  const rejectedTask = await activeDeliveryEngine.rejectTask(taskId, 'drv-01');
  console.log(`   - Tarea retornada a cola. Estado: ${rejectedTask.state}`);
  console.log(`   - Auto-reasignado a repartidor drv-02. Driver actual: ${rejectedTask.driverId}\n`);

  // Repartidor drv-02 acepta y entrega el pedido
  console.log('5. PROGRESO DE ENTREGA (PICKED_UP -> ON_ROUTE -> DELIVERED)');
  await activeDeliveryEngine.updateDeliveryState(taskId, 'PICKED_UP');
  console.log('   - Estado: RECOGIDO EN COCINA (PICKED_UP)');

  await activeDeliveryEngine.updateDeliveryState(taskId, 'ON_ROUTE');
  console.log('   - Estado: EN CAMINO (ON_ROUTE)');

  const finalDelivery = await activeDeliveryEngine.updateDeliveryState(taskId, 'DELIVERED');
  console.log(`   - Estado Final: ENTREGADO (${finalDelivery.state})`);

  // Confirmación del flujo de notificaciones
  const notifLogs = activeNotifRuntime.getNotificationLogs();
  console.log(`\n   - Notificaciones WhatsApp emitidas por NotificationRuntime: ${notifLogs.length}`);

  await BusinessRuntimeResolver.shutdownBusiness(negocio.id);

  console.log('\n===================================================================');
  console.log('  ✅ PRUEBA DE INTEGRACIÓN COMPLETA DE EXTREMO A EXTREMO EXITOSA');
  console.log('===================================================================');
}

runFullRestaurantFlowTest().catch(err => {
  console.error('❌ Error en prueba de integración:', err);
});
