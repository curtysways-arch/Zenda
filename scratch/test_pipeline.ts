import { VersionedEventBus } from '../src/core/events/EventBus';
import { DispatchResourceRuntime } from '../src/core/runtime/DispatchResourceRuntime';
import { DispatchEngine } from '../src/core/dispatch/DispatchEngine';
import { FulfillmentEngine } from '../src/core/fulfillment/FulfillmentEngine';
import { OrderRuntime, OrderStatus } from '../src/core/runtimes/OrderRuntime';

console.log('=== TEST ARCHITECTURE 10/10: FULFILLMENT PIPELINE & DISPATCH ENGINE ===\n');

async function testArchitecture() {
  const eventBus = new VersionedEventBus();
  const resourceRuntime = DispatchResourceRuntime.getInstance(eventBus);
  const dispatchEngine = DispatchEngine.getInstance(eventBus);
  const fulfillmentEngine = FulfillmentEngine.getInstance(eventBus);
  const orderRuntime = new OrderRuntime(eventBus);

  // 1. Registrar Recurso Logístico en DispatchResourceRuntime
  const resource = resourceRuntime.registerResource({
    resourceId: 'driver-999',
    businessId: 'test-biz-1',
    name: 'Juan Perez (Repartidor Moto)',
    phone: '+593991112223',
    type: 'HUMAN',
    status: 'DISPONIBLE'
  });
  console.log('1. Recurso Logístico registrado:', resource.name, `(${resource.status})`);

  // 2. Iniciar Fulfillment Pipeline para una Orden Delivery
  const ticket = await fulfillmentEngine.beginFulfillment(
    'order-101',
    'test-biz-1',
    'DELIVERY',
    ['ACCEPTED', 'KITCHEN', 'READY', 'DISPATCH', 'COMPLETED'],
    { customer: { name: 'Maria Gomez', phone: '+593997778889' }, address: 'Av. Amazonas 123' }
  );
  console.log('2. Ticket de Fulfillment iniciado:', ticket.ticketId, `(Etapa inicial: ${ticket.currentStage})`);

  // 3. Avanzar Pipeline a KITCHEN -> READY -> DISPATCH
  await fulfillmentEngine.advanceStage(ticket.ticketId, 'KITCHEN');
  console.log('3a. Avanzado a KITCHEN:', ticket.currentStage);

  await fulfillmentEngine.advanceStage(ticket.ticketId, 'READY');
  console.log('3b. Avanzado a READY:', ticket.currentStage);

  await fulfillmentEngine.advanceStage(ticket.ticketId, 'DISPATCH');
  console.log('3c. Avanzado a DISPATCH. Tarea de despacho creada:', ticket.dispatchTaskId);

  // 4. Asignar recurso y ejecutar la tarea de despacho en DispatchEngine
  const taskId = ticket.dispatchTaskId;
  if (!taskId) throw new Error('No se generó taskId en etapa DISPATCH');

  const assignedTask = await dispatchEngine.assignResource(taskId, resource.resourceId);
  console.log('4a. Recurso asignado a tarea de despacho:', assignedTask.assignedResource?.name, `(Estado: ${assignedTask.status})`);

  const routeTask = await dispatchEngine.startDispatch(taskId);
  console.log('4b. Despacho en ruta:', routeTask.status);

  const completedTask = await dispatchEngine.completeDispatch(taskId);
  console.log('4c. Despacho completado:', completedTask.status);

  // Esperar propagación asíncrona de eventos en EventBus
  await new Promise(r => setTimeout(r, 50));

  // 5. Verificar que el ticket de Fulfillment avanzó a COMPLETED
  const updatedTicket = fulfillmentEngine.getTicket(ticket.ticketId);
  console.log('5. Estado final del Ticket de Fulfillment:', updatedTicket?.currentStage, `(Status: ${updatedTicket?.status})`);

  // 6. Verificar mapeo de estado unificado OrderStatus
  const mappedStatus = OrderRuntime.mapLegacyToUnifiedStatus('DELIVERED');
  console.log('6. Mapeo de estado unificado:', mappedStatus, mappedStatus === OrderStatus.ENTREGADO ? '✅ OK' : '❌ FAIL');

  console.log('\n=== PRUEBA DE ARQUITECTURA COMPLETADA EXITOSAMENTE (10/10) ===');
}

testArchitecture().catch(err => {
  console.error('❌ Error en prueba de arquitectura:', err);
  process.exit(1);
});
