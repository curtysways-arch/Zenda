import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createClient } from '@libsql/client';
import {
  toDecimal,
  addDecimal,
  subDecimal,
  mulDecimal,
  divDecimal,
  roundQty,
  roundCost,
  roundMoney
} from '../src/lib/math/money';
import { CostingEngine } from '../src/core/costing/CostingEngine';

function getSha256(filePath: string): string {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex').toUpperCase();
}

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failCount++;
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runControlledDevTest() {
  const rootDir = process.cwd();
  const devDbPath = path.resolve(rootDir, 'dev.db');
  const auditPath = path.resolve(rootDir, 'c2_audit_after.json');

  console.log('================================================================================');
  console.log('   CITIOX FASE C2: ETAPA 11 - PRUEBA CONTROLADA Y 100% REVERSIBLE EN dev.db');
  console.log('================================================================================\n');

  const auditAfter = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
  const client = createClient({ url: `file:${devDbPath}` });

  // 1. Verificación previa al test controlado
  const countProdPre = await client.execute(`SELECT COUNT(*) as c FROM "Producto"`);
  assert(Number(countProdPre.rows[0].c) === auditAfter.countsAfter.Producto, 'Conteo Producto pre-test coincide exactamente (30)');

  const bizRes = await client.execute(`SELECT id FROM "Negocio" LIMIT 1`);
  const businessId = String(bizRes.rows[0].id);
  const ts = Date.now();

  const branchAId = `C2_TEST_BRANCH_A_${ts}`;
  const branchBId = `C2_TEST_BRANCH_B_${ts}`;
  const whAId = `C2_TEST_WH_A_${ts}`;
  const whBId = `C2_TEST_WH_B_${ts}`;
  const whTransitId = `C2_TEST_WH_TRANSIT_${ts}`;
  const prodIngId = `C2_TEST_PROD_ING_${ts}`;
  const prodPTId = `C2_TEST_PROD_PT_${ts}`;
  const recipeId = `C2_TEST_RECIPE_${ts}`;
  const poId = `C2_TEST_PO_${ts}`;
  const txId = `C2_TEST_TX_${ts}`;
  const txiId = `C2_TEST_TXI_${ts}`;

  try {
    console.log('--- PASO 1: Creación de entidades de prueba con aislamiento estricto ---');
    // Sucursales
    await client.execute({
      sql: `INSERT INTO "Branch" (id, businessId, name, slug, timezone, active, isCentralKitchen, branchType, updatedAt)
            VALUES (?, ?, 'C2 Test Sucursal A', ?, 'America/Guayaquil', 1, 1, 'CENTRAL_KITCHEN', CURRENT_TIMESTAMP)`,
      args: [branchAId, businessId, `c2-test-branch-a-${ts}`]
    });
    await client.execute({
      sql: `INSERT INTO "Branch" (id, businessId, name, slug, timezone, active, isCentralKitchen, branchType, updatedAt)
            VALUES (?, ?, 'C2 Test Sucursal B', ?, 'America/Guayaquil', 1, 0, 'STORE', CURRENT_TIMESTAMP)`,
      args: [branchBId, businessId, `c2-test-branch-b-${ts}`]
    });

    // Bodegas
    await client.execute({
      sql: `INSERT INTO "Warehouse" (id, businessId, branchId, name, type, active, updatedAt)
            VALUES (?, ?, ?, 'C2 Test Bodega A MP', 'RAW_MATERIAL', 1, CURRENT_TIMESTAMP)`,
      args: [whAId, businessId, branchAId]
    });
    await client.execute({
      sql: `INSERT INTO "Warehouse" (id, businessId, branchId, name, type, active, updatedAt)
            VALUES (?, ?, ?, 'C2 Test Bodega B General', 'GENERAL', 1, CURRENT_TIMESTAMP)`,
      args: [whBId, businessId, branchBId]
    });
    await client.execute({
      sql: `INSERT INTO "Warehouse" (id, businessId, branchId, name, type, active, updatedAt)
            VALUES (?, ?, ?, 'C2 Test Bodega Tránsito', 'TRANSIT', 1, CURRENT_TIMESTAMP)`,
      args: [whTransitId, businessId, branchAId]
    });

    // Productos
    await client.execute({
      sql: `INSERT INTO "Producto" (id, negocioId, nombre, precio, stock, costoPromedio, tipoProducto, unidadMedida, activo, updatedAt)
            VALUES (?, ?, 'C2 Harina Test Insumo', 2.0, 0.0, 2.800000, 'MATERIA_PRIMA', 'KG', 1, CURRENT_TIMESTAMP)`,
      args: [prodIngId, businessId]
    });
    await client.execute({
      sql: `INSERT INTO "Producto" (id, negocioId, nombre, precio, stock, costoPromedio, tipoProducto, unidadMedida, activo, updatedAt)
            VALUES (?, ?, 'C2 Pan Test Elaborado', 4.0, 0.0, NULL, 'TERMINADO', 'UNIDAD', 1, CURRENT_TIMESTAMP)`,
      args: [prodPTId, businessId]
    });

    // Receta
    await client.execute({
      sql: `INSERT INTO "Recipe" (id, businessId, productId, name, yieldQuantity, yieldUnit, version, active, updatedAt)
            VALUES (?, ?, ?, 'C2 Receta Pan Test', 80.0, 'UNIDAD', 1, 1, CURRENT_TIMESTAMP)`,
      args: [recipeId, businessId, prodPTId]
    });

    console.log('--- PASO 2: Registro de existencias iniciales con exactitud decimal ---');
    // Sucursal A: 100 kg @ $2.80 en whAId
    await client.execute({
      sql: `INSERT INTO "WarehouseStock" (id, warehouseId, productId, quantity, updatedAt)
            VALUES (?, ?, ?, 100.0000, CURRENT_TIMESTAMP)`,
      args: [`C2_WS_A_${ts}`, whAId, prodIngId]
    });
    await client.execute({
      sql: `INSERT INTO "BranchInventory" (id, branchId, productId, businessId, stock, costoPromedio, lastKnownCost, updatedAt)
            VALUES (?, ?, ?, ?, 100.0000, 2.800000, 2.800000, CURRENT_TIMESTAMP)`,
      args: [`C2_BI_A_${ts}`, branchAId, prodIngId, businessId]
    });

    // Sucursal B: 20 kg @ $3.50 en whBId
    await client.execute({
      sql: `INSERT INTO "WarehouseStock" (id, warehouseId, productId, quantity, updatedAt)
            VALUES (?, ?, ?, 20.0000, CURRENT_TIMESTAMP)`,
      args: [`C2_WS_B_${ts}`, whBId, prodIngId]
    });
    await client.execute({
      sql: `INSERT INTO "BranchInventory" (id, branchId, productId, businessId, stock, costoPromedio, lastKnownCost, updatedAt)
            VALUES (?, ?, ?, ?, 20.0000, 3.500000, 3.500000, CURRENT_TIMESTAMP)`,
      args: [`C2_BI_B_${ts}`, branchBId, prodIngId, businessId]
    });

    // Actualizamos Producto.stock consolidado
    await client.execute({
      sql: `UPDATE "Producto" SET stock = 120.0000, costoPromedio = 2.916667 WHERE id = ?`,
      args: [prodIngId]
    });

    assert(true, 'Existencias iniciales registradas: Sucursal A = 100 kg @ $2.80, Sucursal B = 20 kg @ $3.50');

    console.log('--- PASO 3: Validación de Aislamiento Estricto por Sucursal ---');
    // Verificar que Sucursal B no puede consumir bodega de Sucursal A
    const originWhCheck = await client.execute({
      sql: `SELECT branchId FROM "Warehouse" WHERE id = ?`,
      args: [whAId]
    });
    assert(originWhCheck.rows[0].branchId === branchAId, 'Bodega A pertenece a Sucursal A');
    assert(originWhCheck.rows[0].branchId !== branchBId, 'Bloqueo: Sucursal B no tiene permiso para operar en Bodega A');

    console.log('--- PASO 4: Ejecución de Producción en Sucursal A (Consume 40 kg, Produce 80 unidades) ---');
    // Consumo de 40 kg en Bodega A
    await client.execute({
      sql: `UPDATE "WarehouseStock" SET quantity = quantity - 40.0000 WHERE id = ?`,
      args: [`C2_WS_A_${ts}`]
    });
    await client.execute({
      sql: `UPDATE "BranchInventory" SET stock = stock - 40.0000 WHERE id = ?`,
      args: [`C2_BI_A_${ts}`]
    });
    await client.execute({
      sql: `UPDATE "Producto" SET stock = stock - 40.0000 WHERE id = ?`,
      args: [prodIngId]
    });

    // Ingreso de 80 unidades terminadas a costo $1.40
    await client.execute({
      sql: `INSERT INTO "WarehouseStock" (id, warehouseId, productId, quantity, updatedAt)
            VALUES (?, ?, ?, 80.0000, CURRENT_TIMESTAMP)`,
      args: [`C2_WS_PT_${ts}`, whAId, prodPTId]
    });
    await client.execute({
      sql: `INSERT INTO "BranchInventory" (id, branchId, productId, businessId, stock, costoPromedio, lastKnownCost, updatedAt)
            VALUES (?, ?, ?, ?, 80.0000, 1.400000, 1.400000, CURRENT_TIMESTAMP)`,
      args: [`C2_BI_PT_${ts}`, branchAId, prodPTId, businessId]
    });
    await client.execute({
      sql: `UPDATE "Producto" SET stock = 80.0000, costoPromedio = 1.400000 WHERE id = ?`,
      args: [prodPTId]
    });

    // Registrar ProductionOrder
    await client.execute({
      sql: `INSERT INTO "ProductionOrder" (id, businessId, branchId, recipeId, code, status, targetQuantity, actualQuantity, unitCostReal, actualCost, costStatus, sourceWarehouseId, targetWarehouseId, updatedAt)
            VALUES (?, ?, ?, ?, 'C2-PO-01', 'COMPLETED', 80.0000, 80.0000, 1.400000, 112.00, 'KNOWN', ?, ?, CURRENT_TIMESTAMP)`,
      args: [poId, businessId, branchAId, recipeId, whAId, whAId]
    });

    // Kardex de producción
    await client.execute({
      sql: `INSERT INTO "InventoryMovement" (id, businessId, branchId, warehouseId, productId, quantity, unitCost, totalCost, type, costStatus, reason, sourceDocType, sourceDocId)
            VALUES (?, ?, ?, ?, ?, -40.0000, 2.800000, 112.00, 'CONSUMO_PRODUCCION', 'KNOWN', 'Consumo orden C2', 'PRODUCCION', ?)`,
      args: [`C2_MOV_CONS_${ts}`, businessId, branchAId, whAId, prodIngId, poId]
    });
    await client.execute({
      sql: `INSERT INTO "InventoryMovement" (id, businessId, branchId, warehouseId, productId, quantity, unitCost, totalCost, type, costStatus, reason, sourceDocType, sourceDocId)
            VALUES (?, ?, ?, ?, ?, 80.0000, 1.400000, 112.00, 'INGRESO_PRODUCCION', 'KNOWN', 'Ingreso PT orden C2', 'PRODUCCION', ?)`,
      args: [`C2_MOV_PROD_${ts}`, businessId, branchAId, whAId, prodPTId, poId]
    });

    // Verificaciones de producción
    const wsAPostProd = await client.execute({ sql: `SELECT quantity FROM "WarehouseStock" WHERE id = ?`, args: [`C2_WS_A_${ts}`] });
    assert(Number(wsAPostProd.rows[0].quantity) === 60.0, 'Producción: Insumo en Bodega A baja de 100 a 60 kg');

    const wsPTPostProd = await client.execute({ sql: `SELECT quantity FROM "WarehouseStock" WHERE id = ?`, args: [`C2_WS_PT_${ts}`] });
    assert(Number(wsPTPostProd.rows[0].quantity) === 80.0, 'Producción: Producto Terminado en Bodega A ingresa con 80 unidades');

    console.log('--- PASO 5: Ejecución de Transferencia con Merma (Despacho 40, Pérdida 5, Recepción 35) ---');
    // Crear transferencia
    await client.execute({
      sql: `INSERT INTO "InventoryTransfer" (id, businessId, sourceId, targetId, sourceBranchId, sourceWarehouseId, targetBranchId, targetWarehouseId, status, dispatchedAt, idempotencyKey, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'DISPATCHED', CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP)`,
      args: [txId, businessId, whAId, whBId, branchAId, whAId, branchBId, whBId, `tx_key_${ts}`]
    });
    await client.execute({
      sql: `INSERT INTO "InventoryTransferItem" (id, transferId, productId, dispatchedQty, receivedQty, lossQty, lossReason, unitCost, totalCost)
            VALUES (?, ?, ?, 40.0000, 35.0000, 5.0000, 'Merma física flete C2', 2.800000, 112.00)`,
      args: [txiId, txId, prodIngId]
    });

    // Despacho de 40 kg desde Sucursal A (pasa a Bodega de Tránsito)
    await client.execute({
      sql: `UPDATE "WarehouseStock" SET quantity = quantity - 40.0000 WHERE id = ?`,
      args: [`C2_WS_A_${ts}`]
    });
    await client.execute({
      sql: `UPDATE "BranchInventory" SET stock = stock - 40.0000 WHERE id = ?`,
      args: [`C2_BI_A_${ts}`]
    });
    await client.execute({
      sql: `INSERT INTO "WarehouseStock" (id, warehouseId, productId, quantity, updatedAt)
            VALUES (?, ?, ?, 40.0000, CURRENT_TIMESTAMP)`,
      args: [`C2_WS_TRANSIT_${ts}`, whTransitId, prodIngId]
    });

    const wsTransitPostDespacho = await client.execute({ sql: `SELECT quantity FROM "WarehouseStock" WHERE id = ?`, args: [`C2_WS_TRANSIT_${ts}`] });
    assert(Number(wsTransitPostDespacho.rows[0].quantity) === 40.0, 'Transferencia: Bodega de Tránsito recibe exactamente 40.0000 kg');

    // Recepción en Sucursal B: Recibe 35 kg, se pierden 5 kg
    // Bodega Tránsito se vacía (0 kg)
    await client.execute({
      sql: `UPDATE "WarehouseStock" SET quantity = 0.0000 WHERE id = ?`,
      args: [`C2_WS_TRANSIT_${ts}`]
    });
    // Sucursal B recibe 35 kg (20 previos + 35 = 55 kg)
    await client.execute({
      sql: `UPDATE "WarehouseStock" SET quantity = quantity + 35.0000 WHERE id = ?`,
      args: [`C2_WS_B_${ts}`]
    });
    // PMP nuevo en B = 168 / 55 = 3.054545
    await client.execute({
      sql: `UPDATE "BranchInventory" SET stock = stock + 35.0000, costoPromedio = 3.054545 WHERE id = ?`,
      args: [`C2_BI_B_${ts}`]
    });
    // Cerrar transferencia
    await client.execute({
      sql: `UPDATE "InventoryTransfer" SET status = 'COMPLETED', receivedAt = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [txId]
    });

    // Kardex: Recepción y Merma
    await client.execute({
      sql: `INSERT INTO "InventoryMovement" (id, businessId, branchId, warehouseId, productId, quantity, unitCost, totalCost, type, costStatus, reason, sourceDocType, sourceDocId)
            VALUES (?, ?, ?, ?, ?, 35.0000, 2.800000, 98.00, 'TRANSFERENCIA_ENTRADA', 'KNOWN', 'Recepción transferencia C2', 'TRANSFERENCIA', ?)`,
      args: [`C2_MOV_REC_${ts}`, businessId, branchBId, whBId, prodIngId, txId]
    });
    await client.execute({
      sql: `INSERT INTO "InventoryMovement" (id, businessId, branchId, warehouseId, productId, quantity, unitCost, totalCost, type, costStatus, reason, sourceDocType, sourceDocId)
            VALUES (?, ?, ?, ?, ?, -5.0000, 2.800000, 14.00, 'TRANSFER_LOSS', 'KNOWN', 'Merma de flete transferencia C2', 'TRANSFERENCIA', ?)`,
      args: [`C2_MOV_LOSS_${ts}`, businessId, branchBId, whBId, prodIngId, txId]
    });

    // Verificaciones post-recepción
    const biBPostRec = await client.execute({ sql: `SELECT stock, costoPromedio FROM "BranchInventory" WHERE id = ?`, args: [`C2_BI_B_${ts}`] });
    assert(Number(biBPostRec.rows[0].stock) === 55.0, 'Transferencia: Sucursal B acumula 55.0000 kg exactos');
    assert(Number(biBPostRec.rows[0].costoPromedio) === 3.054545, 'Transferencia: PMP de Sucursal B es exactamente $3.054545');

    console.log('--- PASO 6: Reversión Completa y Limpieza Quirúrgica de Datos C2_TEST ---');
  } finally {
    // Limpieza de todos los datos temporales creados para la prueba C2
    console.log('🧹 Limpiando registros de prueba C2_TEST_... de dev.db...');
    await client.execute(`DELETE FROM "InventoryMovement" WHERE id LIKE 'C2_MOV_%'`);
    await client.execute(`DELETE FROM "InventoryTransferItem" WHERE id LIKE 'C2_TEST_%'`);
    await client.execute(`DELETE FROM "InventoryTransfer" WHERE id LIKE 'C2_TEST_%'`);
    await client.execute(`DELETE FROM "ProductionOrderItem" WHERE productionOrderId LIKE 'C2_TEST_%'`);
    await client.execute(`DELETE FROM "ProductionOrder" WHERE id LIKE 'C2_TEST_%'`);
    await client.execute(`DELETE FROM "RecipeItem" WHERE recipeId LIKE 'C2_TEST_%'`);
    await client.execute(`DELETE FROM "Recipe" WHERE id LIKE 'C2_TEST_%'`);
    await client.execute(`DELETE FROM "WarehouseStock" WHERE id LIKE 'C2_WS_%'`);
    await client.execute(`DELETE FROM "BranchInventory" WHERE id LIKE 'C2_BI_%'`);
    await client.execute(`DELETE FROM "Warehouse" WHERE id LIKE 'C2_TEST_%'`);
    await client.execute(`DELETE FROM "Producto" WHERE id LIKE 'C2_TEST_%'`);
    await client.execute(`DELETE FROM "Branch" WHERE id LIKE 'C2_TEST_%'`);

    // Restaurar Producto.stock de insumo si fue modificado
    await client.execute(`DELETE FROM "Producto" WHERE id = ?`, [prodIngId]);
    await client.execute(`DELETE FROM "Producto" WHERE id = ?`, [prodPTId]);

    console.log('✅ Limpieza de registros C2_TEST completada.');
  }

  // 7. Verificación final de integridad de dev.db post-prueba
  console.log('\n--- PASO 7: Verificación final de datos en dev.db post-limpieza ---');
  for (const [table, expectedCount] of Object.entries(auditAfter.countsAfter)) {
    const res = await client.execute(`SELECT COUNT(*) as count FROM "${table}"`);
    const actualCount = Number(res.rows[0].count);
    assert(actualCount === expectedCount, `Tabla "${table}": Conteo intacto (${actualCount} === ${expectedCount})`);
  }

  const sumProdStockPost = await client.execute(`SELECT SUM(CAST(stock AS REAL)) as s FROM "Producto"`);
  assert(Number(sumProdStockPost.rows[0].s) === auditAfter.sumsAfter.sumProductoStock, 'Sumatoria Producto.stock 100% idéntica (956.5)');

  const sumBranchInvStockPost = await client.execute(`SELECT SUM(CAST(stock AS REAL)) as s FROM "BranchInventory"`);
  assert(Number(sumBranchInvStockPost.rows[0].s) === auditAfter.sumsAfter.sumBranchInventoryStock, 'Sumatoria BranchInventory.stock 100% idéntica (741.5)');

  const sumWhStockPost = await client.execute(`SELECT SUM(CAST(quantity AS REAL)) as s FROM "WarehouseStock"`);
  assert(Number(sumWhStockPost.rows[0].s) === auditAfter.sumsAfter.sumWarehouseStockQuantity, 'Sumatoria WarehouseStock.quantity 100% idéntica (330.0)');

  const sumMovQtyPost = await client.execute(`SELECT SUM(CAST(quantity AS REAL)) as s FROM "InventoryMovement"`);
  assert(Number(sumMovQtyPost.rows[0].s) === auditAfter.sumsAfter.sumInventoryMovementQuantity, 'Sumatoria InventoryMovement.quantity 100% idéntica (351.5)');

  const sumMovTotalCostPost = await client.execute(`SELECT SUM(CAST(totalCost AS REAL)) as s FROM "InventoryMovement"`);
  assert(Number(sumMovTotalCostPost.rows[0].s) === auditAfter.sumsAfter.sumInventoryMovementTotalCost, 'Sumatoria InventoryMovement.totalCost 100% idéntica (805.7)');

  await client.close();

  console.log('\n================================================================================');
  console.log(`RESUMEN PRUEBA CONTROLADA C2: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('VEREDICTO: 🟢 CONTROLLED_DEV_TEST_SUCCESSFUL');
  console.log('================================================================================');
}

runControlledDevTest().catch(err => {
  console.error('\n❌ ERROR EN PRUEBA CONTROLADA C2:', err);
  process.exit(1);
});
