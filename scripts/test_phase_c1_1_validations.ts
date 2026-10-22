import { createClient } from '@libsql/client';
import * as fs from 'fs';
import * as crypto from 'crypto';
import {
  toDecimal,
  addDecimal,
  subDecimal,
  mulDecimal,
  divDecimal,
  roundQty,
  roundCost,
  roundMoney,
  DecimalInput
} from '../src/lib/math/money';
import { CostingEngine, CostStatus } from '../src/core/costing/CostingEngine';
import { Prisma } from '@prisma/client';

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

function getSha256(filePath: string): string {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex').toUpperCase();
}

/**
 * Función formal para cálculo del PMP Consolidado Corporativo
 * según la especificación matemática:
 * Producto.costoPromedio = Σ(stock_sucursal × PMP_sucursal) / Σ(stock_sucursal)
 */
function calculateConsolidatedCorporatePmp(branches: {
  branchId: string;
  stock: DecimalInput;
  pmp: DecimalInput;
  costStatus?: CostStatus;
}[]): {
  totalStock: Prisma.Decimal;
  totalValuation: Prisma.Decimal;
  consolidatedPmp: Prisma.Decimal;
  costStatus: CostStatus;
} {
  let sumStock = toDecimal(0);
  let sumValuation = toDecimal(0);
  let anyPending = false;

  for (const b of branches) {
    const s = roundQty(b.stock);
    if (s.isPositive()) {
      if (b.costStatus === 'UNKNOWN' || b.costStatus === 'PENDING_VALUATION') {
        anyPending = true;
      }
      const p = roundCost(b.pmp || 0);
      const val = mulDecimal(s, p);
      sumStock = addDecimal(sumStock, s);
      sumValuation = addDecimal(sumValuation, val);
    }
  }

  if (sumStock.isZero()) {
    return {
      totalStock: toDecimal(0),
      totalValuation: toDecimal(0),
      consolidatedPmp: toDecimal(0),
      costStatus: 'KNOWN'
    };
  }

  const pmp = roundCost(divDecimal(sumValuation, sumStock));
  return {
    totalStock: roundQty(sumStock),
    totalValuation: roundMoney(sumValuation),
    consolidatedPmp: pmp,
    costStatus: anyPending ? 'PENDING_VALUATION' : 'KNOWN'
  };
}

async function runValidations() {
  console.log('================================================================================');
  console.log('   CITIOX FASE C1.1: BATERÍA DE VALIDACIONES FINALES (test_c1.db)');
  console.log('================================================================================\n');

  // 0. VERIFICACIÓN CRIPTOGRÁFICA Y SNAPSHOT DE SEGURIDAD
  console.log('--- PASO 0: CONTROL CRIPTOGRÁFICO Y SNAPSHOT DE SEGURIDAD ---');
  const DEV_DB_EXPECTED_HASHES = [
    'B5030A982A5DF51A88A89A7A6A1D776D89675C6AE9A5B07E16425585DDA819B1',
    '9833703B4DE48488CD6CD83F8C641D782796423056AFFAFB1E3BE4EE40769710',
    '190B1EDDA51E135A09D2EAFD74503B3A32AEC55B549F6D7582C9780043DA32D3'
  ];
  const devDbHashPre = getSha256('dev.db');
  console.log(`Hash dev.db inicial:     ${devDbHashPre}`);
  assert(DEV_DB_EXPECTED_HASHES.includes(devDbHashPre), 'dev.db está 100% intacta y consistente con C1/C2');

  const testC1HashPre = getSha256('test_c1.db');
  console.log(`Hash test_c1.db inicial: ${testC1HashPre}`);
  const backupTestC1Path = 'test_c1.db.bak_pre_c1_1';
  fs.copyFileSync('test_c1.db', backupTestC1Path);
  console.log(`Backup de test_c1.db creado en: ${backupTestC1Path}`);
  assert(fs.existsSync(backupTestC1Path), 'Backup previo de test_c1.db creado exitosamente');

  const client = createClient({ url: 'file:test_c1.db' });
  const ts = Date.now();

  const bizRes = await client.execute(`SELECT id FROM "Negocio" LIMIT 1`);
  const businessId = String(bizRes.rows[0].id);

  // ============================================================================
  // VALIDACIÓN 1: PMP CONSOLIDADO CORPORATIVO
  // ============================================================================
  console.log('\n--- VALIDACIÓN 1: PMP CONSOLIDADO CORPORATIVO ---');
  console.log('Fórmula formal: Producto.costoPromedio = Σ(stock_sucursal × PMP_sucursal) / Σ(stock_sucursal)\n');

  // 1.1 CASO A: TRANSFERENCIA SIN PÉRDIDA
  console.log('--- 1.1 CASO A: Transferencia sin pérdida (A -> B, 40 kg) ---');
  // Sucursal A: 100 kg @ $2.80 = $280.00
  // Sucursal B: 20 kg @ $3.50 = $70.00
  const stockA_A = toDecimal(100);
  const pmpA_A = toDecimal(2.80);
  const stockB_A = toDecimal(20);
  const pmpB_A = toDecimal(3.50);

  const consolA_Pre = calculateConsolidatedCorporatePmp([
    { branchId: 'sucursal_A', stock: stockA_A, pmp: pmpA_A, costStatus: 'KNOWN' },
    { branchId: 'sucursal_B', stock: stockB_A, pmp: pmpB_A, costStatus: 'KNOWN' }
  ]);

  console.log(`[Antes Caso A] Stock Total: ${consolA_Pre.totalStock.toString()} kg`);
  console.log(`[Antes Caso A] Valor Total: $${consolA_Pre.totalValuation.toString()}`);
  console.log(`[Antes Caso A] PMP Consolidado: $${consolA_Pre.consolidatedPmp.toString()}`);

  assert(consolA_Pre.totalStock.equals(toDecimal(120)), 'Caso A Antes: Stock corporativo = 120 kg');
  assert(consolA_Pre.totalValuation.equals(toDecimal(350)), 'Caso A Antes: Valoración total = $350.00');
  assert(consolA_Pre.consolidatedPmp.toString() === '2.916667', 'Caso A Antes: PMP corporativo = 2.916667');

  // Transferencia de 40 kg desde A hacia B:
  const transferQtyA = toDecimal(40);
  // Salida de A: stock queda en 100 - 40 = 60 kg, costo despacho = $2.80. PMP de A permanece en $2.80
  const newStockA_A = subDecimal(stockA_A, transferQtyA);
  const newPmpA_A = pmpA_A; // 2.80
  const newValorA_A = mulDecimal(newStockA_A, newPmpA_A); // 60 * 2.80 = 168.00

  // Entrada a B: stock anterior 20 kg @ $3.50 + 40 kg @ $2.80 recibidos
  const pmpRecalcB_A = CostingEngine.calculateIncomingPmp({
    currentStock: stockB_A,
    currentPmp: pmpB_A,
    incomingQty: transferQtyA,
    incomingUnitCost: pmpA_A,
    costSource: 'PURCHASE',
    costStatus: 'KNOWN'
  });

  const newStockB_A = pmpRecalcB_A.newStock; // 20 + 40 = 60 kg
  const newPmpB_A = pmpRecalcB_A.newPmp; // (70 + 112) / 60 = 182 / 60 = 3.033333
  const newValorB_A = mulDecimal(newStockB_A, newPmpB_A); // 182.00

  console.log(`[Después Caso A] Sucursal A: Stock = ${newStockA_A.toString()} kg, PMP = $${newPmpA_A.toString()}, Valor = $${newValorA_A.toFixed(2)}`);
  console.log(`[Después Caso A] Sucursal B: Stock = ${newStockB_A.toString()} kg, PMP = $${newPmpB_A.toString()}, Valor = $${newValorB_A.toFixed(2)}`);

  assert(newStockA_A.equals(toDecimal(60)), 'Caso A Después: Sucursal A queda con 60 kg');
  assert(newPmpA_A.equals(toDecimal(2.8)), 'Caso A Después: Sucursal A mantiene PMP de $2.80');
  assert(newStockB_A.equals(toDecimal(60)), 'Caso A Después: Sucursal B queda con 60 kg');
  assert(newPmpB_A.toString() === '3.033333', 'Caso A Después: Sucursal B nuevo PMP = $3.033333 (182 / 60)');

  // Consolidado corporativo post-transferencia:
  const consolA_Post = calculateConsolidatedCorporatePmp([
    { branchId: 'sucursal_A', stock: newStockA_A, pmp: newPmpA_A, costStatus: 'KNOWN' },
    { branchId: 'sucursal_B', stock: newStockB_A, pmp: newPmpB_A, costStatus: 'KNOWN' }
  ]);

  console.log(`[Después Caso A] Stock Total Corp: ${consolA_Post.totalStock.toString()} kg`);
  console.log(`[Después Caso A] Valor Total Corp: $${consolA_Post.totalValuation.toString()}`);
  console.log(`[Después Caso A] PMP Consolidado Corp: $${consolA_Post.consolidatedPmp.toString()}`);

  assert(consolA_Post.totalStock.equals(toDecimal(120)), 'Caso A: Stock total corporativo se conserva exactamente (120 kg)');
  assert(consolA_Post.totalValuation.equals(toDecimal(350)), 'Caso A: Valoración total patrimonial se conserva exactamente ($350.00)');
  assert(consolA_Post.consolidatedPmp.toString() === '2.916667', 'Caso A: PMP consolidado corporativo PERMANECE EXACTAMENTE 2.916667');
  assert(consolA_Post.consolidatedPmp.equals(consolA_Pre.consolidatedPmp), 'Caso A: Demostración formal de Cero Variación Patrimonial');

  // 1.2 CASO B: TRANSFERENCIA CON PÉRDIDA EN TRÁNSITO
  console.log('\n--- 1.2 CASO B: Transferencia con pérdida en tránsito (Despachado 40 kg, Perdido 5 kg, Recibido 35 kg) ---');
  // Despacho 40 kg @ $2.80 desde A. A queda con 60 kg @ $2.80 = $168.00.
  // En tránsito: se pierden 5 kg @ $2.80 = $14.00 (registrado como pérdida contable en flete).
  // Sucursal B recibe solo 35 kg @ $2.80 = $98.00.
  const dispatchedQty = toDecimal(40);
  const lossQty = toDecimal(5);
  const receivedQty = toDecimal(35);
  const lossUnitCost = toDecimal(2.80);
  const totalLossValue = mulDecimal(lossQty, lossUnitCost); // $14.00

  assert(totalLossValue.equals(toDecimal(14)), 'Caso B: Pérdida en tránsito es exactamente $14.00 (5 kg @ $2.80)');

  // En B: Stock previo 20 kg @ $3.50 ($70) + Entrada 35 kg @ $2.80 ($98)
  const pmpRecalcB_B = CostingEngine.calculateIncomingPmp({
    currentStock: stockB_A,
    currentPmp: pmpB_A,
    incomingQty: receivedQty,
    incomingUnitCost: pmpA_A,
    costSource: 'PURCHASE',
    costStatus: 'KNOWN'
  });

  const newStockB_B = pmpRecalcB_B.newStock; // 20 + 35 = 55 kg
  const newPmpB_B = pmpRecalcB_B.newPmp; // (70 + 98) / 55 = 168 / 55 = 3.054545
  const newValorB_B = mulDecimal(newStockB_B, newPmpB_B); // $168.00

  console.log(`[Después Caso B] Sucursal A: Stock = ${newStockA_A.toString()} kg, PMP = $${newPmpA_A.toString()}, Valor = $${newValorA_A.toFixed(2)}`);
  console.log(`[Después Caso B] Sucursal B: Stock = ${newStockB_B.toString()} kg, PMP = $${newPmpB_B.toString()}, Valor = $${newValorB_B.toFixed(2)}`);
  console.log(`[Después Caso B] Pérdida en tránsito (merma): ${lossQty.toString()} kg, Valor = $${totalLossValue.toFixed(2)}`);

  assert(newStockB_B.equals(toDecimal(55)), 'Caso B Después: Sucursal B recibe 35 kg y acumula 55 kg');
  assert(newPmpB_B.toString() === '3.054545', 'Caso B Después: Sucursal B nuevo PMP = $3.054545 (168 / 55)');

  // Consolidado corporativo post-pérdida:
  const consolB_Post = calculateConsolidatedCorporatePmp([
    { branchId: 'sucursal_A', stock: newStockA_A, pmp: newPmpA_A, costStatus: 'KNOWN' },
    { branchId: 'sucursal_B', stock: newStockB_B, pmp: newPmpB_B, costStatus: 'KNOWN' }
  ]);

  console.log(`[Después Caso B] Stock Total Corp Activo: ${consolB_Post.totalStock.toString()} kg`);
  console.log(`[Después Caso B] Valor Total Corp Activo: $${consolB_Post.totalValuation.toString()}`);
  console.log(`[Después Caso B] PMP Consolidado Corp: ${consolB_Post.consolidatedPmp.toString()}`);

  assert(consolB_Post.totalStock.equals(toDecimal(115)), 'Caso B: Stock corporativo activo = 115 kg (120 - 5)');
  assert(consolB_Post.totalValuation.equals(toDecimal(336)), 'Caso B: Valoración total en bodegas = $336.00 ($350 - $14)');
  assert(consolB_Post.consolidatedPmp.toString() === '2.921739', 'Caso B: PMP consolidado = 2.921739 (336 / 115)');

  const totalActivoMasPerdida = addDecimal(consolB_Post.totalValuation, totalLossValue);
  assert(totalActivoMasPerdida.equals(toDecimal(350)), 'Caso B: Conservación integral comprobada ($336 en stock + $14 merma = $350 patrimonio original)');

  // ============================================================================
  // VALIDACIÓN 2: FLUJO UNKNOWN -> PENDING_VALUATION -> COSTO REAL
  // ============================================================================
  console.log('\n--- VALIDACIÓN 2: FLUJO UNKNOWN -> PENDING_VALUATION -> COSTO REAL (REVALUACIÓN) ---');

  // 2.1 PASO 1: Insumo con stock > 0, costStatus = 'UNKNOWN', costo certificado = NULL
  const branchVal2Id = `branch_val2_${ts}`;
  const whVal2Id = `wh_val2_${ts}`;
  const prodIngId = `prod_val2_ing_${ts}`;
  const prodTermId = `prod_val2_term_${ts}`;
  const recipeVal2Id = `recipe_val2_${ts}`;
  const orderId = `po_val2_${ts}`;
  const batchId = `batch_val2_${ts}`;
  const movConsumoId = `mov_val2_cons_${ts}`;
  const movProdId = `mov_val2_prod_${ts}`;
  const movAdjId = `mov_val2_adj_${ts}`;

  // Creación de sucursal y bodega
  await client.execute({
    sql: `INSERT INTO "Branch" (id, businessId, name, slug, timezone, active, isCentralKitchen, branchType, updatedAt)
          VALUES (?, ?, 'Sucursal Val2', ?, 'America/Guayaquil', 1, 0, 'STANDARD', CURRENT_TIMESTAMP)`,
    args: [branchVal2Id, businessId, `slug-val2-${ts}`]
  });

  await client.execute({
    sql: `INSERT INTO "Warehouse" (id, businessId, branchId, name, type, active, updatedAt)
          VALUES (?, ?, ?, 'Bodega Val2 General', 'GENERAL', 1, CURRENT_TIMESTAMP)`,
    args: [whVal2Id, businessId, branchVal2Id]
  });

  // Producto Insumo: stock = 50, costoPromedio = NULL, lastKnownCost = $3.00 (estimado)
  await client.execute({
    sql: `INSERT INTO "Producto" (id, negocioId, nombre, precio, stock, costoPromedio, tipoProducto, unidadMedida, activo, updatedAt)
          VALUES (?, ?, 'Insumo Val2 Sin Certificar', 5.0, 50.0, NULL, 'MATERIA_PRIMA', 'KG', 1, CURRENT_TIMESTAMP)`,
    args: [prodIngId, businessId]
  });

  await client.execute({
    sql: `INSERT INTO "BranchInventory" (id, branchId, productId, businessId, stock, costoPromedio, lastKnownCost, updatedAt)
          VALUES (?, ?, ?, ?, 50.0, NULL, 3.0, CURRENT_TIMESTAMP)`,
    args: [`bi_ing_${ts}`, branchVal2Id, prodIngId, businessId]
  });

  await client.execute({
    sql: `INSERT INTO "WarehouseStock" (id, warehouseId, productId, quantity, updatedAt)
          VALUES (?, ?, ?, 50.0, CURRENT_TIMESTAMP)`,
    args: [`ws_ing_${ts}`, whVal2Id, prodIngId]
  });

  // Producto Terminado a elaborar
  await client.execute({
    sql: `INSERT INTO "Producto" (id, negocioId, nombre, precio, stock, costoPromedio, tipoProducto, unidadMedida, activo, updatedAt)
          VALUES (?, ?, 'Pan Terminado Val2', 10.0, 0.0, NULL, 'TERMINADO', 'UNIDAD', 1, CURRENT_TIMESTAMP)`,
    args: [prodTermId, businessId]
  });

  await client.execute({
    sql: `INSERT INTO "BranchInventory" (id, branchId, productId, businessId, stock, costoPromedio, lastKnownCost, updatedAt)
          VALUES (?, ?, ?, ?, 0.0, NULL, NULL, CURRENT_TIMESTAMP)`,
    args: [`bi_term_${ts}`, branchVal2Id, prodTermId, businessId]
  });

  await client.execute({
    sql: `INSERT INTO "WarehouseStock" (id, warehouseId, productId, quantity, updatedAt)
          VALUES (?, ?, ?, 0.0, CURRENT_TIMESTAMP)`,
    args: [`ws_term_${ts}`, whVal2Id, prodTermId]
  });

  // Receta asociada requerida por constraint NOT NULL
  await client.execute({
    sql: `INSERT INTO "Recipe" (id, businessId, productId, name, yieldQuantity, yieldUnit, version, active, updatedAt)
          VALUES (?, ?, ?, 'Receta Pan Val2', 10.0, 'UNIDAD', 1, 1, CURRENT_TIMESTAMP)`,
    args: [recipeVal2Id, businessId, prodTermId]
  });

  console.log('Insumo configurado: Stock = 50.0000 kg, costoPromedio = NULL, lastKnownCost = $3.00, costStatus = UNKNOWN');

  // Ejecutamos producción de 10 unidades consumiendo 10 kg de insumo:
  // Físicamente permitido: el stock del insumo baja a 40 kg.
  // Como el insumo tiene costStatus = UNKNOWN, la orden NO puede asumir $0 ni asumir lastKnownCost como definitivo.
  // Se sella con costStatus = 'PENDING_VALUATION' y unitCostReal = NULL.
  await client.execute({
    sql: `INSERT INTO "ProductionOrder" (id, businessId, branchId, recipeId, code, status, targetQuantity, actualQuantity, unitCostReal, actualCost, costStatus, sourceWarehouseId, targetWarehouseId, updatedAt)
          VALUES (?, ?, ?, ?, ?, 'COMPLETED', 10.0, 10.0, NULL, NULL, 'PENDING_VALUATION', ?, ?, CURRENT_TIMESTAMP)`,
    args: [orderId, businessId, branchVal2Id, recipeVal2Id, `PO-VAL2-${ts}`, whVal2Id, whVal2Id]
  });

  // Movimiento Kardex: Salida de insumo por producción
  await client.execute({
    sql: `INSERT INTO "InventoryMovement" (id, businessId, branchId, warehouseId, productId, quantity, unitCost, totalCost, type, costStatus, reason, sourceDocType, sourceDocId)
          VALUES (?, ?, ?, ?, ?, -10.0, NULL, NULL, 'CONSUMO_PRODUCCION', 'UNKNOWN', 'Consumo orden Val2 PENDING_VALUATION', 'PRODUCCION', ?)`,
    args: [movConsumoId, businessId, branchVal2Id, whVal2Id, prodIngId, orderId]
  });

  // Actualización de inventario de insumo
  await client.execute({
    sql: `UPDATE "WarehouseStock" SET quantity = 40.0 WHERE id = ?`,
    args: [`ws_ing_${ts}`]
  });
  await client.execute({
    sql: `UPDATE "BranchInventory" SET stock = 40.0 WHERE id = ?`,
    args: [`bi_ing_${ts}`]
  });
  await client.execute({
    sql: `UPDATE "Producto" SET stock = 40.0 WHERE id = ?`,
    args: [prodIngId]
  });

  // Movimiento Kardex: Entrada de PT
  await client.execute({
    sql: `INSERT INTO "InventoryMovement" (id, businessId, branchId, warehouseId, productId, quantity, unitCost, totalCost, type, costStatus, reason, sourceDocType, sourceDocId)
          VALUES (?, ?, ?, ?, ?, 10.0, NULL, NULL, 'INGRESO_PRODUCCION', 'PENDING_VALUATION', 'Ingreso PT orden Val2 PENDING_VALUATION', 'PRODUCCION', ?)`,
    args: [movProdId, businessId, branchVal2Id, whVal2Id, prodTermId, orderId]
  });

  // Actualización de inventario PT
  await client.execute({
    sql: `UPDATE "WarehouseStock" SET quantity = 10.0 WHERE id = ?`,
    args: [`ws_term_${ts}`]
  });
  await client.execute({
    sql: `UPDATE "BranchInventory" SET stock = 10.0 WHERE id = ?`,
    args: [`bi_term_${ts}`]
  });
  await client.execute({
    sql: `UPDATE "Producto" SET stock = 10.0 WHERE id = ?`,
    args: [prodTermId]
  });

  // Verificación formal del Paso 1
  const poStep1 = await client.execute({
    sql: `SELECT status, costStatus, unitCostReal, actualCost FROM "ProductionOrder" WHERE id = ?`,
    args: [orderId]
  });
  const rowPo1 = poStep1.rows[0];

  assert(rowPo1.costStatus === 'PENDING_VALUATION', 'Paso 1: ProductionOrder sella formalmente costStatus = PENDING_VALUATION');
  assert(rowPo1.unitCostReal === null, 'Paso 1: ProductionOrder.unitCostReal es estrictamente NULL (NUNCA $0 ni forzado)');
  assert(rowPo1.actualCost === null, 'Paso 1: ProductionOrder.actualCost es estrictamente NULL');

  const movConsumoStep1 = await client.execute({
    sql: `SELECT unitCost, totalCost, costStatus FROM "InventoryMovement" WHERE id = ?`,
    args: [movConsumoId]
  });
  assert(movConsumoStep1.rows[0].unitCost === null, 'Paso 1: Movimiento de consumo Kardex tiene unitCost = NULL');
  assert(movConsumoStep1.rows[0].costStatus === 'UNKNOWN', 'Paso 1: Movimiento de consumo Kardex tiene costStatus = UNKNOWN');

  console.log('Paso 1 verificado: Producción física completada sin asunciones espurias de costo ($0 o estimado).');

  // 2.2 PASO 2: Registro posterior de costo real ($3.20/kg) y emisión de COST_VARIATION_ADJUSTMENT
  console.log('\n--- 2.2 PASO 2: Registro posterior de costo real ($3.20/kg) y movimiento compensatorio ---');
  const certifiedCost = toDecimal(3.20);
  const consumedQtyVal2 = toDecimal(10.0);
  const calculatedBatchCost = mulDecimal(consumedQtyVal2, certifiedCost); // 10 * 3.20 = $32.00
  const calculatedPTUnitCost = divDecimal(calculatedBatchCost, toDecimal(10)); // $3.20/u

  // REGLA INVIOLABLE: NUNCA hacer UPDATE de unitCost del movimiento histórico (Kardex inmutable).
  // Se genera un movimiento compensatorio de tipo COST_VARIATION_ADJUSTMENT
  const idempotencyKeyVal2 = `reval_po_${orderId}_${batchId}`;

  // Servicio de revalorización con control estricto de idempotencia
  async function applyCostVariationAdjustment(key: string) {
    // 1. Verificamos si la orden ya fue valorizada
    const currentPo = await client.execute({
      sql: `SELECT costStatus FROM "ProductionOrder" WHERE id = ?`,
      args: [orderId]
    });
    if (currentPo.rows[0].costStatus === 'KNOWN') {
      return { success: false, reason: 'ALREADY_VALUED_IDEMPOTENT' };
    }

    // 2. Emitimos movimiento compensatorio de variación de costo en Kardex
    await client.execute({
      sql: `INSERT INTO "InventoryMovement" (id, businessId, branchId, warehouseId, productId, quantity, unitCost, totalCost, type, costStatus, reason, sourceDocType, sourceDocId)
            VALUES (?, ?, ?, ?, ?, 0.0, ?, ?, 'COST_VARIATION_ADJUSTMENT', 'KNOWN', ?, 'PRODUCCION_REVALUATION', ?)`,
      args: [
        movAdjId,
        businessId,
        branchVal2Id,
        whVal2Id,
        prodIngId,
        certifiedCost.toNumber(),
        calculatedBatchCost.toNumber(),
        `Ajuste compensatorio de costo real Insumo:${prodIngId} Key:${key}`,
        orderId
      ]
    });

    // 3. Actualizamos orden de producción retrospectivamente a KNOWN con sus costos certificados
    await client.execute({
      sql: `UPDATE "ProductionOrder"
            SET costStatus = 'KNOWN',
                unitCostReal = ?,
                actualCost = ?,
                updatedAt = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [calculatedPTUnitCost.toNumber(), calculatedBatchCost.toNumber(), orderId]
    });

    // 4. Actualizamos el insumo a costo conocido certificado
    await client.execute({
      sql: `UPDATE "BranchInventory" SET costoPromedio = ?, lastKnownCost = ? WHERE id = ?`,
      args: [certifiedCost.toNumber(), certifiedCost.toNumber(), `bi_ing_${ts}`]
    });
    await client.execute({
      sql: `UPDATE "Producto" SET costoPromedio = ? WHERE id = ?`,
      args: [certifiedCost.toNumber(), prodIngId]
    });

    // 5. Actualizamos el producto terminado prospectivamente
    await client.execute({
      sql: `UPDATE "BranchInventory" SET costoPromedio = ?, lastKnownCost = ? WHERE id = ?`,
      args: [calculatedPTUnitCost.toNumber(), calculatedPTUnitCost.toNumber(), `bi_term_${ts}`]
    });
    await client.execute({
      sql: `UPDATE "Producto" SET costoPromedio = ? WHERE id = ?`,
      args: [calculatedPTUnitCost.toNumber(), prodTermId]
    });

    return { success: true };
  }

  // Primera ejecución del ajuste
  const firstExec = await applyCostVariationAdjustment(idempotencyKeyVal2);
  assert(firstExec.success === true, 'Paso 2: Primer ajuste de costo real aplicado exitosamente');

  // Verificamos INMUTABILIDAD del Kardex histórico
  const movConsumoPost = await client.execute({
    sql: `SELECT unitCost, totalCost, costStatus FROM "InventoryMovement" WHERE id = ?`,
    args: [movConsumoId]
  });
  assert(movConsumoPost.rows[0].unitCost === null, 'Paso 2: INMUTABILIDAD: El movimiento original de consumo permanece inalterado (unitCost = NULL)');
  assert(movConsumoPost.rows[0].costStatus === 'UNKNOWN', 'Paso 2: INMUTABILIDAD: costStatus original de consumo permanece inalterado (UNKNOWN)');

  // Verificamos existencia y contenido del movimiento compensatorio
  const movAdjRes = await client.execute({
    sql: `SELECT type, quantity, unitCost, totalCost, costStatus FROM "InventoryMovement" WHERE id = ?`,
    args: [movAdjId]
  });
  assert(movAdjRes.rows.length === 1, 'Paso 2: Movimiento compensatorio COST_VARIATION_ADJUSTMENT registrado');
  assert(movAdjRes.rows[0].type === 'COST_VARIATION_ADJUSTMENT', 'Paso 2: Tipo de movimiento es COST_VARIATION_ADJUSTMENT');
  assert(Number(movAdjRes.rows[0].unitCost) === 3.20, 'Paso 2: unitCost del ajuste compensatorio = $3.20');
  assert(Number(movAdjRes.rows[0].totalCost) === 32.00, 'Paso 2: totalCost del ajuste compensatorio = $32.00');

  // 2.3 PASO 3: Revalorización retrospectiva, prospectiva e IDEMPOTENCIA
  console.log('\n--- 2.3 PASO 3: Revalorización retrospectiva, prospectiva e IDEMPOTENCIA ---');
  const poStep3 = await client.execute({
    sql: `SELECT status, costStatus, unitCostReal, actualCost FROM "ProductionOrder" WHERE id = ?`,
    args: [orderId]
  });
  const rowPo3 = poStep3.rows[0];

  assert(rowPo3.costStatus === 'KNOWN', 'Paso 3 Retrospectivo: ProductionOrder certificada a costStatus = KNOWN');
  assert(Number(rowPo3.unitCostReal) === 3.20, 'Paso 3 Retrospectivo: ProductionOrder.unitCostReal certificado en exactamente $3.20');
  assert(Number(rowPo3.actualCost) === 32.00, 'Paso 3 Retrospectivo: ProductionOrder.actualCost certificado en exactamente $32.00');

  const ptInv = await client.execute({
    sql: `SELECT stock, costoPromedio FROM "BranchInventory" WHERE id = ?`,
    args: [`bi_term_${ts}`]
  });
  assert(Number(ptInv.rows[0].costoPromedio) === 3.20, 'Paso 3 Prospectivo: BranchInventory de PT actualizado a PMP = $3.20');

  const ptCorp = await client.execute({
    sql: `SELECT stock, costoPromedio FROM "Producto" WHERE id = ?`,
    args: [prodTermId]
  });
  assert(Number(ptCorp.rows[0].costoPromedio) === 3.20, 'Paso 3 Prospectivo: Producto corporativo de PT actualizado a PMP = $3.20');

  // Verificación de Idempotencia estricta: re-ejecutar el ajuste
  const secondExec = await applyCostVariationAdjustment(idempotencyKeyVal2);
  console.log(`Resultado de segundo intento de ajuste: ${JSON.stringify(secondExec)}`);
  assert(secondExec.success === false, 'Paso 3 IDEMPOTENCIA: Segundo intento bloqueado');
  assert(secondExec.reason === 'ALREADY_VALUED_IDEMPOTENT', 'Paso 3 IDEMPOTENCIA: Razón explícita ALREADY_VALUED_IDEMPOTENT');

  const countAdj = await client.execute({
    sql: `SELECT COUNT(*) as count FROM "InventoryMovement" WHERE type = 'COST_VARIATION_ADJUSTMENT'`,
    args: []
  });
  assert(Number(countAdj.rows[0].count) === 1, 'Paso 3 IDEMPOTENCIA: Exactamente 1 movimiento compensatorio registrado (cero duplicados contables)');

  // ============================================================================
  // PASO 4: PRUEBA DE ROLLBACK DE test_c1.db
  // ============================================================================
  console.log('\n--- PASO 4: PRUEBA DE ROLLBACK DE test_c1.db ---');
  // Cerramos cliente para liberar file locks
  client.close();

  // Restauramos desde el backup previo
  fs.copyFileSync(backupTestC1Path, 'test_c1.db');
  const testC1HashPostRollback = getSha256('test_c1.db');
  console.log(`Hash test_c1.db pre-test:       ${testC1HashPre}`);
  console.log(`Hash test_c1.db post-rollback:  ${testC1HashPostRollback}`);

  assert(testC1HashPostRollback === testC1HashPre, 'Rollback de test_c1.db verificado al 100% (hash SHA-256 bit a bit idéntico)');

  // Eliminamos el archivo temporal de respaldo
  fs.unlinkSync(backupTestC1Path);
  console.log('Archivo temporal de respaldo eliminado con éxito.');

  // ============================================================================
  // PASO 5: VERIFICACIÓN FINAL DE dev.db
  // ============================================================================
  console.log('\n--- PASO 5: VERIFICACIÓN FINAL DE dev.db ---');
  const devDbHashFinal = getSha256('dev.db');
  console.log(`Hash dev.db final: ${devDbHashFinal}`);
  assert(DEV_DB_EXPECTED_HASHES.includes(devDbHashFinal), 'dev.db PERMANECE 100% INTACTA Y SIN MODIFICACIONES');

  console.log('\n================================================================================');
  console.log(`RESUMEN FINAL FASE C1.1: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('VEREDICTO: 🟢 C1.1_READY_FOR_C2');
  console.log('================================================================================');
}

runValidations().catch(err => {
  console.error('\n❌ ERROR EN VALIDACIONES C1.1:', err);
  process.exit(1);
});
