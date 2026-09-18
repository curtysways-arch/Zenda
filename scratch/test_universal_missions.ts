import prisma from '@/lib/prisma';
import { BusinessMissionService } from '@/lib/growth/businessMissionService';

async function runTest() {
  console.log('=== TEST SUITE: CANONICAL UNIVERSAL MISSION ENGINE ===\n');

  try {
    // 1. Obtener o crear un negocio y usuario de prueba
    let negocio = await prisma.negocio.findFirst();
    if (!negocio) {
      throw new Error('No hay negocios en la base de datos para probar.');
    }
    console.log(`Negocio de prueba: ${negocio.nombre} (${negocio.id})`);

    let usuario = await prisma.usuario.findFirst();
    if (!usuario) {
      throw new Error('No hay usuarios en la base de datos para probar.');
    }
    console.log(`Usuario de prueba: ${usuario.nombre || usuario.email} (${usuario.id})\n`);

    // Pre-limpieza de misiones de prueba anteriores para entorno limpio
    await prisma.businessMissionProgress.deleteMany({
      where: { BusinessMission: { MissionDefinition: { nombre: { startsWith: 'Test ' } } } }
    });
    await prisma.businessMission.deleteMany({
      where: { MissionDefinition: { nombre: { startsWith: 'Test ' } } }
    });
    await prisma.missionDefinition.deleteMany({
      where: { nombre: { startsWith: 'Test ' } }
    });

    // 2. Crear una MissionDefinition de prueba con agregación AMOUNT ($ gasto en tienda/restaurante)
    const testDefAmount = await prisma.missionDefinition.create({
      data: {
        nombre: `Test Gastos Tienda/Restaurante ${Date.now()}`,
        descripcion: 'Gasta $50 en pedidos para ganar 100 XP',
        categoria: 'PAGOS',
        triggerEvent: 'ORDER_COMPLETED',
        cantidadMeta: 50,
        config: {
          aggregation: 'AMOUNT',
          unit: '$'
        },
        status: 'PUBLISHED'
      }
    });
    console.log(`✅ [1/5] MissionDefinition AMOUNT creada: ID=${testDefAmount.id}, Meta=$${testDefAmount.cantidadMeta}`);

    // Instalar en el negocio
    const bmAmount = await BusinessMissionService.install({
      missionDefinitionId: testDefAmount.id,
      negocioId: negocio.id
    });
    console.log(`✅ [2/5] BusinessMission instalada: ID=${bmAmount.id}`);

    // 3. Probar avance por AMOUNT: Simular primer pedido de $20
    const entityId1 = `order_test_${Date.now()}_1`;
    console.log(`\nSimulando pedido 1: $20 (entityId: ${entityId1})`);
    await BusinessMissionService.processUserProgress(
      negocio.id,
      usuario.id,
      'ORDER_COMPLETED',
      {
        entityId: entityId1,
        monto: 20,
        cantidad: 2
      }
    );

    let progress = await prisma.businessMissionProgress.findUnique({
      where: { businessMissionId_userId: { businessMissionId: bmAmount.id, userId: usuario.id } }
    });
    console.log(`Progreso tras pedido 1: ${progress?.progresoActual}/${progress?.progresoRequerido} (Esperado: 20/50)`);
    if (progress?.progresoActual !== 20) {
      throw new Error(`Progreso incorrecto tras evento AMOUNT: se obtuvo ${progress?.progresoActual}, esperado 20`);
    }

    // 4. Probar IDEMPOTENCIA: Re-emitir el mismo pedido de $20 con idéntico entityId
    console.log(`\nSimulando reintento del mismo pedido 1: $20 (entityId: ${entityId1})`);
    await BusinessMissionService.processUserProgress(
      negocio.id,
      usuario.id,
      'ORDER_COMPLETED',
      {
        entityId: entityId1,
        monto: 20,
        cantidad: 2
      }
    );

    progress = await prisma.businessMissionProgress.findUnique({
      where: { businessMissionId_userId: { businessMissionId: bmAmount.id, userId: usuario.id } }
    });
    console.log(`Progreso tras reintento: ${progress?.progresoActual}/${progress?.progresoRequerido} (Esperado: 20/50)`);
    if (progress?.progresoActual !== 20) {
      throw new Error(`FALLO DE IDEMPOTENCIA: El progreso se duplicó a ${progress?.progresoActual}`);
    }
    console.log('✅ [3/5] Idempotencia verificada: el evento duplicado fue ignorado con éxito.');

    // 5. Completar la misión: Simular segundo pedido de $35 (debe alcanzar 55 >= 50)
    const entityId2 = `order_test_${Date.now()}_2`;
    console.log(`\nSimulando pedido 2: $35 (entityId: ${entityId2})`);
    await BusinessMissionService.processUserProgress(
      negocio.id,
      usuario.id,
      'ORDER_COMPLETED',
      {
        entityId: entityId2,
        monto: 35,
        cantidad: 3
      }
    );

    progress = await prisma.businessMissionProgress.findUnique({
      where: { businessMissionId_userId: { businessMissionId: bmAmount.id, userId: usuario.id } }
    });
    console.log(`Progreso tras pedido 2: ${progress?.progresoActual}/${progress?.progresoRequerido}, Estado: ${progress?.estado}`);
    if (progress?.estado !== 'COMPLETADA' && progress?.estado !== 'RECOMPENSADA') {
      throw new Error(`La misión debió completarse pero tiene estado: ${progress?.estado}`);
    }
    console.log('✅ [4/5] Misión completada satisfactoriamente con agregación AMOUNT.');

    // 6. Probar Misión QUANTITY con Lavandería (LAUNDRY_ORDER_COMPLETED)
    const testDefQty = await prisma.missionDefinition.create({
      data: {
        nombre: `Test Lavado Sneakers ${Date.now()}`,
        descripcion: 'Lava 3 pares de sneakers',
        categoria: 'RESERVAS',
        triggerEvent: 'LAUNDRY_ORDER_COMPLETED',
        cantidadMeta: 3,
        config: {
          aggregation: 'QUANTITY',
          unit: 'pares'
        },
        status: 'PUBLISHED'
      }
    });

    const bmQty = await BusinessMissionService.install({
      missionDefinitionId: testDefQty.id,
      negocioId: negocio.id
    });

    const entityIdShoes = `shoe_order_${Date.now()}`;
    console.log(`\nSimulando orden de calzado: 3 pares (entityId: ${entityIdShoes})`);
    await BusinessMissionService.processUserProgress(
      negocio.id,
      usuario.id,
      'LAUNDRY_ORDER_COMPLETED',
      {
        entityId: entityIdShoes,
        monto: 18,
        cantidad: 3
      }
    );

    const progressQty = await prisma.businessMissionProgress.findUnique({
      where: { businessMissionId_userId: { businessMissionId: bmQty.id, userId: usuario.id } }
    });
    console.log(`Progreso misión Sneakers: ${progressQty?.progresoActual}/${progressQty?.progresoRequerido}, Estado: ${progressQty?.estado}`);
    if (progressQty?.estado !== 'COMPLETADA' && progressQty?.estado !== 'RECOMPENSADA') {
      throw new Error(`La misión QUANTITY debió completarse pero tiene estado: ${progressQty?.estado}`);
    }
    console.log('✅ [5/5] Misión QUANTITY de lavandería/calzado completada exitosamente.');

    // Limpieza de datos de prueba
    await prisma.businessMissionProgress.deleteMany({
      where: { businessMissionId: { in: [bmAmount.id, bmQty.id] } }
    });
    await prisma.domainEvent.deleteMany({
      where: {
        aggregate: 'BUSINESS_MISSION_PROGRESS',
        aggregateId: {
          contains: usuario.id
        }
      }
    });
    await prisma.businessMission.deleteMany({
      where: { id: { in: [bmAmount.id, bmQty.id] } }
    });
    await prisma.missionDefinition.deleteMany({
      where: { id: { in: [testDefAmount.id, testDefQty.id] } }
    });

    console.log('\n🎉 ¡TODOS LOS TESTS DEL MOTOR UNIVERSAL DE MISIONES PASARON CON ÉXITO!');
  } catch (err) {
    console.error('\n❌ ERROR EN PRUEBAS:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
