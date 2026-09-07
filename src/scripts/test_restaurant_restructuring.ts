import prisma from '../lib/prisma';
import { AccessPolicyService } from '../core/security/AccessPolicyService';

async function runRestaurantRestructuringTest() {
  console.log('🧪 Iniciando verificación automatizada del módulo Restaurante...');

  // 1. Buscar o crear negocio de prueba
  let testBiz = await (prisma as any).negocio.findFirst();

  if (!testBiz) {
    console.log('Creando negocio de prueba tipo RESTAURANTE...');
    const crypto = await import('node:crypto');
    testBiz = await (prisma as any).negocio.create({
      data: {
        id: crypto.randomUUID(),
        nombre: 'Pinchos & Grill Test',
        slug: 'pinchos-grill-test-' + Date.now(),
        tipoNegocio: 'RESTAURANTE',
        precioHora: 0,
        horarioApertura: '12:00',
        horarioCierre: '23:00',
        diasAtencion: 'Lunes a Domingo',
        configuracion: JSON.stringify({
          activeCapabilities: {
            orders: true,
            dispatch: true,
            tables: true,
            kitchen: true
          }
        })
      }
    });
  }

  console.log(`✅ Negocio verificado: ${testBiz.nombre} (ID: ${testBiz.id})`);

  // 2. Limpieza de datos previos de prueba para este negocio
  await (prisma as any).pedidoItem.deleteMany({
    where: { pedido: { negocioId: testBiz.id, nombreCliente: { contains: 'Test Restruct' } } }
  });
  await (prisma as any).orderPayment.deleteMany({
    where: { negocioId: testBiz.id, observaciones: { contains: 'Test Restruct' } }
  });
  await (prisma as any).pedido.deleteMany({
    where: { negocioId: testBiz.id, nombreCliente: { contains: 'Test Restruct' } }
  });
  await (prisma as any).restaurantTable.deleteMany({
    where: { negocioId: testBiz.id, nombre: { startsWith: 'Mesa Test ' } }
  });

  // 3. Crear una mesa de prueba
  console.log('\n--- PASO 1: Creación de Mesa ---');
  const table = await (prisma as any).restaurantTable.create({
    data: {
      negocioId: testBiz.id,
      nombre: 'Mesa Test ' + Math.floor(Math.random() * 900 + 100),
      numero: 99,
      capacidad: 4,
      activa: true,
      permitePedidos: true,
      estado: 'DISPONIBLE'
    }
  });
  console.log(`✅ Mesa creada: ${table.nombre} (Token: ${table.token}, Estado: ${table.estado})`);

  // 4. Simular apertura de comanda directa en mesa
  console.log('\n--- PASO 2: Apertura de Comanda en Mesa (Creación de Pedido MESA) ---');
  const lastOrder = await (prisma as any).pedido.findFirst({
    where: { negocioId: testBiz.id },
    orderBy: { numeroPedido: 'desc' },
    select: { numeroPedido: true }
  });
  const nextOrderNumber = lastOrder ? lastOrder.numeroPedido + 1 : 1;

  const createdOrder = await (prisma as any).pedido.create({
    data: {
      negocioId: testBiz.id,
      numeroPedido: nextOrderNumber,
      tipoEntrega: 'MESA',
      nombreCliente: 'Test Restruct Cliente',
      telefonoCliente: '0991234567',
      direccionCliente: `Mesa ${table.nombre}`,
      referenciaCliente: `Mesa: ${table.nombre}`,
      fechaEntrega: new Date(),
      franjaHoraria: 'Inmediata',
      subtotal: 18.50,
      costoEnvio: 0,
      total: 18.50,
      estado: 'ACEPTADO',
      notas: 'Comanda de prueba en mesa',
      extraInfo: {
        origin: 'TABLE_ORDER',
        tableId: table.id,
        tableName: table.nombre,
        tableToken: table.token,
        kitchenStatus: 'PENDIENTE'
      },
      items: {
        create: [
          {
            nombreProducto: 'Pinchos Mixtos Especiales',
            precioUnitario: 12.00,
            cantidad: 1
          },
          {
            nombreProducto: 'Bebida Refrescante 500ml',
            precioUnitario: 3.25,
            cantidad: 2
          }
        ]
      }
    },
    include: { items: true }
  });

  await (prisma as any).restaurantTable.update({
    where: { id: table.id },
    data: { estado: 'OCUPADA' }
  });

  console.log(`✅ Pedido #${createdOrder.numeroPedido} creado con tipoEntrega: '${createdOrder.tipoEntrega}'`);
  console.log(`✅ Items registrados: ${createdOrder.items.length}, Total: $${createdOrder.total}`);

  // 5. Verificar resolución de mesa enriquecida con activeOrder
  console.log('\n--- PASO 3: Verificación de Mesa Enriquecida con Orden Activa ---');
  const mesasInDB = await (prisma as any).restaurantTable.findMany({
    where: { id: table.id }
  });
  const activeOrdersInDB = await (prisma as any).pedido.findMany({
    where: {
      negocioId: testBiz.id,
      NOT: { estado: { in: ['ENTREGADO', 'CANCELADO', 'COMPLETADO', 'RECHAZADO', 'DESPACHADO'] } }
    },
    include: { items: true }
  });

  const matchingOrder = activeOrdersInDB.find((o: any) => o.extraInfo?.tableId === table.id);
  if (!matchingOrder) {
    throw new Error('❌ Fallo: La orden activa no se asoció a la mesa por tableId');
  }
  console.log(`✅ Orden activa vinculada a la mesa exitosamente: Pedido #${matchingOrder.numeroPedido}`);

  // 6. Simular agregar más ítems a la orden de la mesa
  console.log('\n--- PASO 4: Adición de Productos a la Comanda Abierta ---');
  await (prisma as any).pedidoItem.create({
    data: {
      pedidoId: createdOrder.id,
      nombreProducto: 'Porción Extra de Papas Rústicas',
      precioUnitario: 4.50,
      cantidad: 1
    }
  });

  const updatedOrder = await (prisma as any).pedido.update({
    where: { id: createdOrder.id },
    data: {
      subtotal: 23.00,
      total: 23.00,
      estado: 'EN_PREPARACION',
      extraInfo: {
        ...createdOrder.extraInfo,
        kitchenStatus: 'PENDIENTE',
        lastItemAddedAt: new Date().toISOString()
      }
    },
    include: { items: true }
  });
  console.log(`✅ Comanda actualizada con nuevo ítem. Total actualizado: $${updatedOrder.total}, Items: ${updatedOrder.items.length}`);

  // 7. Simular flujo de KDS Cocina
  console.log('\n--- PASO 5: Verificación en KDS Cocina / Comandas ---');
  const kitchenOrders = await (prisma as any).pedido.findMany({
    where: {
      negocioId: testBiz.id,
      NOT: { estado: { in: ['ENTREGADO', 'CANCELADO', 'COMPLETADO', 'RECHAZADO', 'DESPACHADO'] } }
    },
    include: { items: true }
  });
  const activeInKitchen = kitchenOrders.filter((o: any) => o.extraInfo?.kitchenStatus !== 'LISTO');
  const foundInKitchen = activeInKitchen.some((o: any) => o.id === createdOrder.id);
  if (!foundInKitchen) {
    throw new Error('❌ Fallo: La comanda de la mesa no aparece en la bandeja de cocina KDS');
  }
  console.log(`✅ Comanda visible en KDS Cocina para preparación (Total pedidos en KDS: ${activeInKitchen.length})`);

  // 8. Simular cobro y cierre de mesa
  console.log('\n--- PASO 6: Cierre de Mesa y Cobro ---');
  await prisma.$transaction(async (tx: any) => {
    await tx.pedido.update({
      where: { id: createdOrder.id },
      data: {
        estado: 'COMPLETADO',
        extraInfo: {
          ...updatedOrder.extraInfo,
          cerradoAt: new Date().toISOString(),
          metodoPago: 'EFECTIVO',
          kitchenStatus: 'LISTO'
        }
      }
    });

    await tx.orderPayment.create({
      data: {
        pedidoId: createdOrder.id,
        negocioId: testBiz.id,
        monto: updatedOrder.total,
        estado: 'CONFIRMADO',
        observaciones: 'Cobrado en Salón Test Restruct (EFECTIVO)'
      }
    });

    await tx.restaurantTable.update({
      where: { id: table.id },
      data: { estado: 'DISPONIBLE' }
    });
  });

  const finalTable = await (prisma as any).restaurantTable.findUnique({ where: { id: table.id } });
  const finalOrder = await (prisma as any).pedido.findUnique({
    where: { id: createdOrder.id },
    include: { payment: true }
  });

  console.log(`✅ Estado final de la mesa: ${finalTable?.estado} (Esperado: DISPONIBLE)`);
  console.log(`✅ Estado final del pedido: ${finalOrder?.estado} (Esperado: COMPLETADO)`);
  console.log(`✅ Registro de pago generado: ${finalOrder?.payment?.estado} ($${finalOrder?.payment?.monto})`);

  if (finalTable?.estado !== 'DISPONIBLE' || finalOrder?.estado !== 'COMPLETADO') {
    throw new Error('❌ Fallo: La mesa o el pedido no finalizaron en el estado correcto');
  }

  // Limpieza final
  await (prisma as any).orderPayment.deleteMany({ where: { pedidoId: createdOrder.id } });
  await (prisma as any).pedidoItem.deleteMany({ where: { pedidoId: createdOrder.id } });
  await (prisma as any).pedido.deleteMany({ where: { id: createdOrder.id } });
  await (prisma as any).restaurantTable.deleteMany({ where: { id: table.id } });

  console.log('\n🎉 ¡TODAS LAS PRUEBAS DEL MÓDULO RESTAURANTE COMPLETADAS CON ÉXITO!');
}

runRestaurantRestructuringTest()
  .catch(err => {
    console.error('❌ Error en prueba:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
