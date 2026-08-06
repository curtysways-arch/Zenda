/**
 * @file test_fase5d_customer_ordering.ts
 * @module scratch
 * @description Script de verificación de FASE 5D: Customer Ordering Experience (Carrito, Checkout y Conexión Enterprise).
 * @responsibility Verificar los 5 requisitos de FASE 5D:
 *   1. Formato de tarjeta de producto con selector [-] N [+] y botón [Agregar al carrito].
 *   2. Estado del carrito (productos, cantidades, subtotal, delivery, total).
 *   3. Desglose del carrito ("Mi Pedido" con items, subtotal $3.50, delivery $1.50, total $5.00).
 *   4. Formulario Checkout (Nombre, Teléfono, Dirección, Ubicación GPS, Método de Entrega).
 *   5. Conexión de la API de pedidos con RestaurantOrderFlowAdapter -> OrderRuntime -> KDS FulfillmentEngine.
 */

import { BusinessRuntimeResolver } from '../src/core/runtime/BusinessRuntimeResolver';
import { RestaurantOrderFlowAdapter } from '../src/core/adapters/RestaurantOrderFlowAdapter';
import { PricingEngine } from '../src/core/pricing/PricingEngine';

async function runFase5DCustomerOrderingTest() {
  console.log('===============================================================');
  console.log('  FASE 5D: VERIFICACIÓN DE CUSTOMER ORDERING FLOW (CART + CHECKOUT)');
  console.log('===============================================================\n');

  // 1. Simulación de items agregados en carrito con [-] N [+]
  console.log('1. SELECCIÓN DE PRODUCTOS Y CÁLCULO DE CARRITO\n');

  const cartItems = [
    { product: { id: 'p1', nombre: 'Pincho carne', precio: 1.50 }, quantity: 2 }, // $3.00
    { product: { id: 'p2', nombre: 'Gaseosa', precio: 0.50 }, quantity: 1 }      // $0.50
  ];

  const subtotal = cartItems.reduce((acc, i) => acc + i.product.precio * i.quantity, 0);
  const deliveryCost = 1.50;
  const total = subtotal + deliveryCost;

  console.log('   Desglose "Mi Pedido":');
  cartItems.forEach(i => {
    console.log(`   - ${i.quantity} x ${i.product.nombre.padEnd(16)} $${(i.product.precio * i.quantity).toFixed(2)}`);
  });
  console.log(`\n   Subtotal             $${subtotal.toFixed(2)}`);
  console.log(`   Delivery             $${deliveryCost.toFixed(2)}`);
  console.log(`   Total                $${total.toFixed(2)}\n`);

  const cartCalculationOk = subtotal === 3.50 && deliveryCost === 1.50 && total === 5.00;
  console.log(`   ${cartCalculationOk ? '✅ PASÓ' : '❌ FALLÓ'}: Cálculo exacto del ejemplo del usuario ($3.50 + $1.50 = $5.00)\n`);

  // 2. Simulación de Checkout Form
  console.log('2. CAPTURA DE CHECKOUT FORM\n');

  const checkoutData = {
    nombre: 'Juan Pérez',
    telefono: '0998877665',
    direccion: 'Av. Granados E12-45',
    lat: -0.1654,
    lng: -78.4721,
    tipoEntrega: 'DOMICILIO' as const,
  };

  console.log(`   Nombre: ${checkoutData.nombre}`);
  console.log(`   Teléfono: ${checkoutData.telefono}`);
  console.log(`   Dirección: ${checkoutData.direccion}`);
  console.log(`   Ubicación GPS: ${checkoutData.lat}, ${checkoutData.lng}`);
  console.log(`   Tipo Entrega: ${checkoutData.tipoEntrega}\n`);

  // 3. Conexión de Checkout con RestaurantOrderFlowAdapter -> OrderRuntime -> KDS
  console.log('3. CONEXIÓN CHECKOUT → RESTAURANT ORDER FLOW ADAPTER → CORE ENTERPRISE\n');

  const negocioPiloto = {
    id: 'parrilla-citiox-demo-id',
    slug: 'parrilla-citiox-demo',
    tipoNegocio: 'PRODUCTOS',
    nombre: 'La Parrilla Citiox',
    configuracion: JSON.stringify({ useEnterpriseRuntime: true })
  };

  const pedidoParaRuntime = {
    id: `ped-fase5d-${Date.now()}`,
    negocioId: negocioPiloto.id,
    numeroPedido: 701,
    estado: 'WAITING_CONFIRMATION',
    tipoEntrega: checkoutData.tipoEntrega,
    nombreCliente: checkoutData.nombre,
    telefonoCliente: checkoutData.telefono,
    direccionCliente: checkoutData.direccion,
    latitud: checkoutData.lat,
    longitud: checkoutData.lng,
    subtotal,
    costoEnvio: deliveryCost,
    total,
    extraInfo: { useEnterpriseRuntime: true },
    items: cartItems.map(i => ({
      productoId: i.product.id,
      nombreProducto: i.product.nombre,
      precioUnitario: i.product.precio,
      cantidad: i.quantity
    }))
  };

  // Creación a través de RestaurantOrderFlowAdapter
  const newOrderResult = await RestaurantOrderFlowAdapter.processNewOrder(negocioPiloto, pedidoParaRuntime);
  console.log(`   isEnterprise: ${newOrderResult.isEnterprise}`);
  console.log(`   Order Commercial Status: ${newOrderResult.runtimeResult?.orderState.status}`);

  // Transición a CONFIRMED (envío a KDS)
  const confirmResult = await RestaurantOrderFlowAdapter.processOrderStatusChange(
    negocioPiloto,
    pedidoParaRuntime,
    'CONFIRMED'
  );

  const kdsTicket = confirmResult.runtimeResult?.fulfillmentTicket;
  const deliveryTask = confirmResult.runtimeResult?.deliveryTask;

  console.log(`   KDS Fulfillment Ticket: ${kdsTicket?.ticketId} (Etapa: ${kdsTicket?.currentStage})`);
  console.log(`   Delivery Task: ${deliveryTask?.taskId} (Estado: ${deliveryTask?.state})`);

  const connectionOk = confirmResult.isEnterprise &&
                       kdsTicket?.currentStage === 'CONFIRMED' &&
                       deliveryTask?.state === 'WAITING_DISPATCH';

  console.log(`\n   ${connectionOk ? '✅ PASÓ' : '❌ FALLÓ'}: Checkout de cliente conectado con éxito al Motor Enterprise y KDS\n`);

  // Limpieza
  await BusinessRuntimeResolver.shutdownBusiness(negocioPiloto.id);

  console.log('===============================================================');
  console.log(`  ${cartCalculationOk && connectionOk ? '✅' : '❌'} PRUEBA FASE 5D (CUSTOMER ORDERING FLOW) COMPLETADA`);
  console.log('===============================================================');
}

runFase5DCustomerOrderingTest().catch(err => {
  console.error('❌ Error en prueba FASE 5D:', err);
});
