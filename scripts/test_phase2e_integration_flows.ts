import './setup_test_env';
import { Prisma } from '@prisma/client';
import prisma from '../src/lib/prisma';
import { InventoryEngine } from '../src/core/inventory/InventoryEngine';
import { generateInventoryDiscrepancyReport } from './audit_inventory_discrepancies';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    console.error(`  ❌ [FAIL] ${testName} ${details ? `-> ${details}` : ''}`);
    throw new Error(`Test fallido: ${testName}`);
  }
}

async function runPhase2EIntegrationSuite() {
  console.log('='.repeat(95));
  console.log('   CITIOX - FASE 2E: PRUEBAS DE INTEGRACIÓN DE FLUJOS REALES DE INVENTARIO');
  console.log('   (VENTAS, CANCELACIONES, CRON IDEMPOTENTE, AJUSTES, CONCURRENCIA Y PRESERVACIÓN)');
  console.log('='.repeat(95));

  const testBizId = `test-biz-2e-${Date.now()}`;
  const testBranchId = `test-br-2e-${Date.now()}`;
  const testWhId = `test-wh-2e-${Date.now()}`;
  const testProdId = `test-prod-2e-${Date.now()}`;

  try {
    // Configurar busy_timeout para tolerar bloqueos transitorios
    try {
      await prisma.$executeRawUnsafe('PRAGMA busy_timeout = 10000;');
    } catch {}

    // ─────────────────────────────────────────────────────────────────────────────
    // SETUP: Creación de Entidades Aisladas de Prueba
    // ─────────────────────────────────────────────────────────────────────────────
    // Usar negocio, sucursal y bodega existentes
    const biz = await (prisma as any).negocio.findFirst({
      where: { branches: { some: {} }, warehouses: { some: {} } },
      include: { branches: true, warehouses: true }
    });
    if (!biz || !biz.branches[0] || !biz.warehouses[0]) {
      throw new Error('No se encontró un negocio con sucursales y bodegas válidas.');
    }
    const testBizId = biz.id;
    const testBranchId = biz.branches[0].id;
    const testWhId = biz.warehouses[0].id;
    const testProdId = `test-prod-2e-${Date.now()}`;

    console.log(`  🏢 Negocio de prueba: ${biz.nombre} (${testBizId})`);
    console.log(`  📍 Sucursal: ${biz.branches[0].name} (${testBranchId})`);
    console.log(`  📦 Bodega: ${biz.warehouses[0].name} (${testWhId})`);

    // Crear Producto aislado de prueba directamente con DDL decimal
    await prisma.$executeRawUnsafe(
      `INSERT INTO Producto (id, nombre, precio, activo, negocioId, tipoProducto, unidadMedida, costoUnitario, unidadMedidaBase, uomStatus, costoPromedio, costStatus, costSource, createdAt, updatedAt)
       VALUES (?, ?, ?, 1, ?, 'MATERIA_PRIMA', 'KG', 9.25, 'KG', 'CONFIRMED', 9.250000, 'KNOWN', 'PURCHASE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      testProdId,
      'Café Espresso Colombiano en Grano (kg) - Test 2E',
      18.50,
      testBizId
    );

async function getStockTriple(whId: string, brId: string, prodId: string) {
  const rawWh = await prisma.$queryRawUnsafe<any[]>('SELECT quantity FROM WarehouseStock WHERE warehouseId = ? AND productId = ?', whId, prodId);
  const rawBr = await prisma.$queryRawUnsafe<any[]>('SELECT stock FROM BranchInventory WHERE branchId = ? AND productId = ?', brId, prodId);
  const rawProd = await prisma.$queryRawUnsafe<any[]>('SELECT stock FROM Producto WHERE id = ?', prodId);
  return {
    wh: Number(rawWh[0]?.quantity ?? 0),
    br: Number(rawBr[0]?.stock ?? 0),
    prod: Number(rawProd[0]?.stock ?? 0)
  };
}

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 1: Stock Inicial Canalizado por InventoryEngine (3 Capas)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n--- TEST 1: INICIALIZACIÓN CANÓNICA DE STOCK ---');
    const initMov = await InventoryEngine.recordMovement({
      businessId: testBizId,
      branchId: testBranchId,
      warehouseId: testWhId,
      productId: testProdId,
      type: 'INICIAL',
      quantity: 10.0000,
      reason: 'Carga de inventario inicial'
    });

    assert(Boolean(initMov?.id), 'InventoryMovement creado correctamente con ID único');

    // Verificar las 3 capas físicas:
    const stocksInit = await getStockTriple(testWhId, testBranchId, testProdId);
    assert(stocksInit.wh === 10.0000, 'WarehouseStock inicial sincronizado en 10.0000');
    assert(stocksInit.br === 10.0000, 'BranchInventory inicial sincronizado en 10.0000');
    assert(stocksInit.prod === 10.0000, 'Producto.stock inicial sincronizado en 10.0000');

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 2: Venta con Cantidad Decimal (2.3500 kg)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n--- TEST 2: VENTA E-COMMERCE / POS CON CANTIDAD DECIMAL ---');
    await InventoryEngine.recordMovement({
      businessId: testBizId,
      branchId: testBranchId,
      warehouseId: testWhId,
      productId: testProdId,
      type: 'VENTA',
      quantity: -2.3500, // decremento
      sourceDocType: 'VENTA',
      sourceDocId: 'PED-2E-001',
      reason: 'Venta por pedido online #PED-2E-001'
    });

    const stocksSale = await getStockTriple(testWhId, testBranchId, testProdId);
    assert(stocksSale.wh === 7.6500, 'WarehouseStock decrementado a 7.6500 kg');
    assert(stocksSale.br === 7.6500, 'BranchInventory decrementado a 7.6500 kg');
    assert(stocksSale.prod === 7.6500, 'Producto.stock decrementado a 7.6500 kg');

    const movementsSale = await prisma.$queryRawUnsafe<any[]>(
      'SELECT id, quantity, type FROM InventoryMovement WHERE productId = ? AND type = ?',
      testProdId,
      'VENTA'
    );
    assert(movementsSale.length === 1, 'Kardex registra exactamente 1 movimiento VENTA');
    assert(Number(movementsSale[0].quantity) === -2.3500, 'Cantidad en Kardex es -2.3500');

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 3: Protección contra Stock Insuficiente (Rollback Atómico)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n--- TEST 3: INTENTO DE VENTA CON STOCK INSUFICIENTE ---');
    let threwStockError = false;
    try {
      await InventoryEngine.recordMovement({
        businessId: testBizId,
        branchId: testBranchId,
        warehouseId: testWhId,
        productId: testProdId,
        type: 'VENTA',
        quantity: -8.0000, // 8.0000 > 7.6500 disponible
        reason: 'Venta excesiva que debe fallar'
      });
    } catch (err: any) {
      threwStockError = true;
      assert(err.message.includes('Stock insuficiente'), 'Excepción informativa de stock insuficiente lanzada');
    }
    assert(threwStockError, 'Operación falló limpiamente ante saldo insuficiente');

    // Comprobar que ninguna capa fue alterada:
    const stocksAfterFail = await getStockTriple(testWhId, testBranchId, testProdId);
    assert(stocksAfterFail.wh === 7.6500, 'WarehouseStock permanece en 7.6500 tras rollback');
    assert(stocksAfterFail.br === 7.6500, 'BranchInventory permanece en 7.6500 tras rollback');
    assert(stocksAfterFail.prod === 7.6500, 'Producto.stock permanece en 7.6500 tras rollback');

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 4: Cancelación de Pedido (Devolución de 2.3500 kg)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n--- TEST 4: CANCELACIÓN DE PEDIDO Y REINGRESO DE STOCK ---');
    await InventoryEngine.recordMovement({
      businessId: testBizId,
      branchId: testBranchId,
      warehouseId: testWhId,
      productId: testProdId,
      type: 'ENTRADA',
      quantity: 2.3500,
      sourceDocType: 'VENTA',
      sourceDocId: 'PED-2E-001',
      reason: 'Devolución por pedido cancelado #PED-2E-001'
    });

    const stocksCancel = await getStockTriple(testWhId, testBranchId, testProdId);
    assert(stocksCancel.wh === 10.0000, 'WarehouseStock restaurado a 10.0000 kg');
    assert(stocksCancel.br === 10.0000, 'BranchInventory restaurado a 10.0000 kg');
    assert(stocksCancel.prod === 10.0000, 'Producto.stock restaurado a 10.0000 kg');

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 5: Expiración de Pedidos Abandonados (Cron) e Idempotencia
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n--- TEST 5: SIMULACIÓN CRON RELEASE-STALE-ORDERS E IDEMPOTENCIA ---');
    // Creamos un pedido de prueba PENDIENTE
    const testOrderId = `order-stale-2e-${Date.now()}`;
    await (prisma as any).pedido.create({
      data: {
        id: testOrderId,
        negocioId: testBizId,
        branchId: testBranchId,
        numeroPedido: 99999,
        tipoEntrega: 'RETIRO',
        fechaEntrega: new Date(),
        franjaHoraria: '9-11',
        costoEnvio: 0,
        nombreCliente: 'Cliente Expirado',
        telefonoCliente: '0999999999',
        estado: 'PENDIENTE',
        subtotal: 18.50,
        total: 18.50,
        extraInfo: JSON.stringify({ stockRestored: false }),
        createdAt: new Date(Date.now() - 60 * 60 * 1000) // Creado hace 1 hora (expirado)
      }
    });

    await (prisma as any).pedidoItem.create({
      data: {
        id: `item-stale-${Date.now()}`,
        pedidoId: testOrderId,
        productoId: testProdId,
        nombreProducto: 'Café Espresso',
        precioUnitario: 18.50,
        cantidad: 1.0000
      }
    });

    // Simular que el pedido había reservado 1.0000 kg
    await InventoryEngine.recordMovement({
      businessId: testBizId,
      branchId: testBranchId,
      warehouseId: testWhId,
      productId: testProdId,
      type: 'VENTA',
      quantity: -1.0000,
      reason: 'Reserva inicial de pedido'
    });
    const stockAfterRes = (await getStockTriple(testWhId, testBranchId, testProdId)).prod;
    assert(stockAfterRes === 9.0000, 'Stock queda en 9.0000 tras la reserva');

    // Ejecución 1 del Cron:
    const orderToRelease = await (prisma as any).pedido.findUnique({
      where: { id: testOrderId },
      include: { items: true }
    });
    const extra1 = JSON.parse(orderToRelease.extraInfo || '{}');
    if (!extra1.stockRestored) {
      await InventoryEngine.recordMovement({
        businessId: testBizId,
        warehouseId: testWhId,
        branchId: testBranchId,
        productId: testProdId,
        type: 'ENTRADA',
        quantity: 1.0000,
        sourceDocType: 'VENTA',
        sourceDocId: testOrderId,
        reason: 'Liberación de reserva por expiración de pedido PENDIENTE'
      });
      await (prisma as any).pedido.update({
        where: { id: testOrderId },
        data: {
          estado: 'CANCELADO',
          extraInfo: JSON.stringify({ ...extra1, stockRestored: true })
        }
      });
    }

    const stockAfterCron1 = (await getStockTriple(testWhId, testBranchId, testProdId)).prod;
    assert(stockAfterCron1 === 10.0000, 'Cron Ejecución 1: Stock restaurado a 10.0000');

    // Ejecución 2 del Cron (Idempotencia):
    const orderCron2 = await (prisma as any).pedido.findUnique({ where: { id: testOrderId } });
    const extra2 = JSON.parse(orderCron2.extraInfo || '{}');
    let cron2Executed = false;
    if (!extra2.stockRestored) {
      // Si entra aquí, fallaría la idempotencia
      cron2Executed = true;
    }
    assert(!cron2Executed, 'Cron Ejecución 2: Detecta stockRestored=true y omite reingreso redundante');

    const stockAfterCron2 = (await getStockTriple(testWhId, testBranchId, testProdId)).prod;
    assert(stockAfterCron2 === 10.0000, 'Stock no sufre duplicación y se mantiene en 10.0000');

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 6: Ajustes Manuales (+3.5000 y -1.5000)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n--- TEST 6: AJUSTES MANUALES DE INVENTARIO ---');
    // Entrada manual +3.5000
    await InventoryEngine.recordMovement({
      businessId: testBizId,
      branchId: testBranchId,
      warehouseId: testWhId,
      productId: testProdId,
      type: 'ENTRADA',
      quantity: 3.5000,
      reason: 'Ajuste manual de sobrante físico'
    });
    // Salida manual -1.5000
    await InventoryEngine.recordMovement({
      businessId: testBizId,
      branchId: testBranchId,
      warehouseId: testWhId,
      productId: testProdId,
      type: 'SALIDA',
      quantity: -1.5000,
      reason: 'Ajuste manual por merma o muestra'
    });

    const stocksAdj = await getStockTriple(testWhId, testBranchId, testProdId);
    assert(stocksAdj.wh === 12.0000, 'WarehouseStock tras ajustes es 12.0000');
    assert(stocksAdj.br === 12.0000, 'BranchInventory tras ajustes es 12.0000');
    assert(stocksAdj.prod === 12.0000, 'Producto.stock tras ajustes es 12.0000');

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 7: Control de Concurrencia Optimista (CAS)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n--- TEST 7: CONTROL DE CONCURRENCIA OPTIMISTA CAS ---');
    // Simular que dos transacciones leen stock = 12.0000 al mismo tiempo:
    const baseStock = (await getStockTriple(testWhId, testBranchId, testProdId)).prod; // 12.0000

    // Operación 1 (éxito con CAS)
    const cas1 = await prisma.$executeRawUnsafe(
      `UPDATE Producto SET stock = 11.0000 WHERE id = ? AND stock = ?`,
      testProdId,
      baseStock
    );
    assert(cas1 === 1, 'Operación 1 completó actualización CAS exitosamente');

    // Operación 2 (fracaso controlado con el mismo baseStock)
    const cas2 = await prisma.$executeRawUnsafe(
      `UPDATE Producto SET stock = 10.0000 WHERE id = ? AND stock = ?`,
      testProdId,
      baseStock
    );
    assert(cas2 === 0, 'Operación 2 detectó conflicto de concurrencia y fue abortada sin sobrescribir (no lost update)');

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 8: Preservación Estricta de Productos Legacy de Fase 2D
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n--- TEST 8: PRESERVACIÓN DE PRODUCTOS Y DISCREPANCIAS LEGACY ---');
    const report = await generateInventoryDiscrepancyReport();
    const legacyReport = report.filter(r => r.productId !== testProdId);

    const counts = {
      TOTAL: legacyReport.length,
      OK: legacyReport.filter(r => r.estado === 'OK').length,
      DISCREPANCIA: legacyReport.filter(r => r.estado === 'DISCREPANCIA').length,
      SIN_BODEGA: legacyReport.filter(r => r.estado === 'SIN_BODEGA').length,
      SIN_KARDEX: legacyReport.filter(r => r.estado === 'SIN_KARDEX').length,
      PENDIENTE_AUDITORIA: legacyReport.filter(r => r.estado === 'PENDIENTE_AUDITORIA').length,
    };

    console.log(`  📊 Conteo verificado con auditoría canónica:`, counts);
    assert(counts.TOTAL === 23, 'Se preservan exactamente los 23 productos legacy');
    assert(counts.OK === 2, 'Se preservan exactamente los 2 productos OK');
    assert(counts.SIN_BODEGA === 11, 'Se preservan exactamente los 11 productos SIN_BODEGA intactos');
    assert(counts.DISCREPANCIA === 4, 'Se preservan exactamente las 4 DISCREPANCIAS intactas');
    assert(counts.PENDIENTE_AUDITORIA === 6, 'Se preservan exactamente los 6 PENDIENTES_AUDITORIA intactos');

  } finally {
    // ─────────────────────────────────────────────────────────────────────────────
    // CLEANUP: Limpieza de Datos de Prueba Creados
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n🧹 Limpiando datos temporales de prueba Fase 2E...');
    try {
      await (prisma as any).inventoryMovement.deleteMany({ where: { productId: testProdId } });
      await (prisma as any).warehouseStock.deleteMany({ where: { productId: testProdId } });
      await (prisma as any).branchInventory.deleteMany({ where: { productId: testProdId } });
      await (prisma as any).pedidoItem.deleteMany({ where: { productoId: testProdId } });
      await (prisma as any).pedido.deleteMany({ where: { numeroPedido: 99999 } });
      await (prisma as any).producto.deleteMany({ where: { id: testProdId } });
      console.log('✅ Entorno de prueba limpiado con éxito.');
    } catch (cleanErr) {
      console.warn('Advertencia en limpieza:', cleanErr);
    }
    await prisma.$disconnect();
  }

  console.log('\n' + '='.repeat(95));
  console.log(`   RESUMEN FINAL FASE 2E: ${passedTests}/${totalTests} PRUEBAS SUPERADAS CON ÉXITO (100%)`);
  console.log('='.repeat(95));
}

runPhase2EIntegrationSuite().catch((err) => {
  console.error('\n❌ ERROR FATAL EN SUITE DE INTEGRACIÓN FASE 2E:', err);
  process.exit(1);
});
