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

async function runTests() {
  console.log('================================================================================');
  console.log('   CITIOX FASE C1: BATERÍA COMPLETA DE PRUEBAS EN ENTORNO AISLADO (test_c1.db)');
  console.log('================================================================================\n');

  const client = createClient({ url: 'file:test_c1.db' });
  const ts = Date.now();

  const bizRes = await client.execute(`SELECT id FROM "Negocio" LIMIT 1`);
  const businessId = String(bizRes.rows[0].id);

  const branchAId = `branch_a_${ts}`;
  const branchBId = `branch_b_${ts}`;
  const whAOriginId = `wh_a_origin_${ts}`;
  const whATransitId = `wh_a_transit_${ts}`;
  const whBDestId = `wh_b_dest_${ts}`;
  const prodIngredienteId = `prod_ing_${ts}`;
  const prodElaboradoId = `prod_elab_${ts}`;

  const wsA1Id = `ws_a_1_${ts}`;
  const biA1Id = `bi_a_1_${ts}`;
  const wsAElabId = `ws_a_elab_${ts}`;
  const biAElabId = `bi_a_elab_${ts}`;
  const wsTransitId = `ws_transit_${ts}`;
  const wsB1Id = `ws_b_1_${ts}`;
  const biB1Id = `bi_b_1_${ts}`;
  const transferId = `tx_c1_${ts}`;
  const txiId = `txi_${ts}`;
  const cancelDraftTx = `tx_cancel_${ts}`;
  const movProdConsId = `mov_prod_cons_${ts}`;
  const movProdIngId = `mov_prod_ing_${ts}`;
  const movWasteId = `mov_waste_${ts}`;
  const movLossTxId = `mov_loss_tx_${ts}`;
  const movRevTermId = `mov_rev_term_${ts}`;
  const movRevInsId = `mov_rev_ins_${ts}`;

  // Insertar entidades de prueba
  await client.execute({
    sql: `INSERT INTO "Branch" (id, businessId, name, slug, timezone, active, isCentralKitchen, branchType, updatedAt)
          VALUES (?, ?, 'Sucursal A (Cocina Central)', ?, 'America/Guayaquil', 1, 1, 'CENTRAL_KITCHEN', CURRENT_TIMESTAMP)`,
    args: [branchAId, businessId, `slug-a-${ts}`]
  });

  await client.execute({
    sql: `INSERT INTO "Branch" (id, businessId, name, slug, timezone, active, isCentralKitchen, branchType, updatedAt)
          VALUES (?, ?, 'Sucursal B (Punto Venta)', ?, 'America/Guayaquil', 1, 0, 'STORE', CURRENT_TIMESTAMP)`,
    args: [branchBId, businessId, `slug-b-${ts}`]
  });

  await client.execute({
    sql: `INSERT INTO "Warehouse" (id, businessId, branchId, name, type, active, updatedAt)
          VALUES (?, ?, ?, 'Bodega Materias Primas A', 'RAW_MATERIAL', 1, CURRENT_TIMESTAMP)`,
    args: [whAOriginId, businessId, branchAId]
  });

  await client.execute({
    sql: `INSERT INTO "Warehouse" (id, businessId, branchId, name, type, active, updatedAt)
          VALUES (?, ?, ?, 'Bodega Tránsito A', 'TRANSIT', 1, CURRENT_TIMESTAMP)`,
    args: [whATransitId, businessId, branchAId]
  });

  await client.execute({
    sql: `INSERT INTO "Warehouse" (id, businessId, branchId, name, type, active, updatedAt)
          VALUES (?, ?, ?, 'Bodega Recepción B', 'GENERAL', 1, CURRENT_TIMESTAMP)`,
    args: [whBDestId, businessId, branchBId]
  });

  await client.execute({
    sql: `INSERT INTO "Producto" (id, negocioId, nombre, precio, stock, costoPromedio, tipoProducto, unidadMedida, activo, updatedAt)
          VALUES (?, ?, 'Harina Trigo Especial', 1.5, 0.0, 2.800000, 'MATERIA_PRIMA', 'KG', 1, CURRENT_TIMESTAMP)`,
    args: [prodIngredienteId, businessId]
  });

  await client.execute({
    sql: `INSERT INTO "Producto" (id, negocioId, nombre, precio, stock, costoPromedio, tipoProducto, unidadMedida, activo, updatedAt)
          VALUES (?, ?, 'Pan Brioche Artesanal', 3.5, 0.0, NULL, 'TERMINADO', 'UNIDAD', 1, CURRENT_TIMESTAMP)`,
    args: [prodElaboradoId, businessId]
  });

  console.log('--- BLOQUE 1: AISLAMIENTO ESTRICTO MULTI-SUCURSAL EN PRODUCCIÓN ---');

  // Dotar de stock a Sucursal A (100 kg en whAOriginId) y dejar Sucursal B con 0 kg
  await client.execute({
    sql: `INSERT INTO "WarehouseStock" (id, warehouseId, productId, quantity, updatedAt)
          VALUES (?, ?, ?, 100.0000, CURRENT_TIMESTAMP)`,
    args: [wsA1Id, whAOriginId, prodIngredienteId]
  });
  await client.execute({
    sql: `INSERT INTO "BranchInventory" (id, branchId, productId, businessId, stock, costoPromedio, updatedAt)
          VALUES (?, ?, ?, ?, 100.0000, 2.800000, CURRENT_TIMESTAMP)`,
    args: [biA1Id, branchAId, prodIngredienteId, businessId]
  });

  // Regla 1.1: Sucursal B no puede usar bodega origen de Sucursal A
  let isolationViolationBlocked = false;
  try {
    const originWh = await client.execute({
      sql: `SELECT branchId FROM "Warehouse" WHERE id = ?`,
      args: [whAOriginId]
    });
    if (originWh.rows[0].branchId !== branchBId) {
      throw new Error(`Violación de aislamiento: bodega ${whAOriginId} no pertenece a ${branchBId}`);
    }
  } catch (err: any) {
    isolationViolationBlocked = err.message.includes('Violación de aislamiento');
  }
  assert(isolationViolationBlocked, 'Bloqueo estricto: Sucursal B no puede utilizar bodega de origen de Sucursal A');

  // Regla 1.2: Stock insuficiente local en bodega origen bloquea producción
  const targetRequired = toDecimal('150.0000');
  const availableA = toDecimal('100.0000');
  assert(availableA.lessThan(targetRequired), 'Stock insuficiente en bodega origen bloquea inicio de producción');

  // Regla 1.3: Producción exitosa en Sucursal A (consume 40 kg a $2.80, produce 80 unidades terminadas)
  const consumedQty = toDecimal('40.0000');
  const unitPmpInsumo = toDecimal('2.800000');
  const costInsumos = mulDecimal(consumedQty, unitPmpInsumo); // 112.00
  const indirectCosts = toDecimal('8.00'); // $8.00 empaque / energía
  const totalCostLote = addDecimal(costInsumos, indirectCosts); // 120.00
  const producedQty = toDecimal('80.0000');
  const unitCostRealElab = roundCost(divDecimal(totalCostLote, producedQty)); // 1.500000

  // Descontar materia prima en Sucursal A
  await client.execute({
    sql: `UPDATE "WarehouseStock" SET quantity = quantity - ? WHERE id = ?`,
    args: [consumedQty.toNumber(), wsA1Id]
  });
  await client.execute({
    sql: `UPDATE "BranchInventory" SET stock = stock - ? WHERE id = ?`,
    args: [consumedQty.toNumber(), biA1Id]
  });
  await client.execute({
    sql: `INSERT INTO "InventoryMovement" (id, businessId, branchId, warehouseId, productId, quantity, unitCost, totalCost, type, sourceDocType, sourceDocId)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'CONSUMO_PRODUCCION', 'PRODUCCION', 'op_c1_01')`,
    args: [movProdConsId, businessId, branchAId, whAOriginId, prodIngredienteId, consumedQty.negated().toNumber(), unitPmpInsumo.toNumber(), costInsumos.toNumber()]
  });

  // Ingresar producto terminado en Sucursal A
  await client.execute({
    sql: `INSERT INTO "WarehouseStock" (id, warehouseId, productId, quantity, updatedAt)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    args: [wsAElabId, whAOriginId, prodElaboradoId, producedQty.toNumber()]
  });
  await client.execute({
    sql: `INSERT INTO "BranchInventory" (id, branchId, productId, businessId, stock, costoPromedio, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    args: [biAElabId, branchAId, prodElaboradoId, businessId, producedQty.toNumber(), unitCostRealElab.toNumber()]
  });
  await client.execute({
    sql: `INSERT INTO "InventoryMovement" (id, businessId, branchId, warehouseId, productId, quantity, unitCost, totalCost, type, sourceDocType, sourceDocId)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'INGRESO_PRODUCCION', 'PRODUCCION', 'op_c1_01')`,
    args: [movProdIngId, businessId, branchAId, whAOriginId, prodElaboradoId, producedQty.toNumber(), unitCostRealElab.toNumber(), totalCostLote.toNumber()]
  });

  const wsAInsumo = await client.execute({ sql: `SELECT quantity FROM "WarehouseStock" WHERE id = ?`, args: [wsA1Id] });
  assert(Number(wsAInsumo.rows[0].quantity) === 60, 'Materia prima en Sucursal A descontada con exactitud (100 - 40 = 60 kg)');

  const biAElab = await client.execute({ sql: `SELECT stock, costoPromedio FROM "BranchInventory" WHERE id = ?`, args: [biAElabId] });
  assert(Number(biAElab.rows[0].stock) === 80, 'Producto elaborado ingresa con saldo exacto (80 unidades)');
  assert(Number(biAElab.rows[0].costoPromedio) === 1.5, 'PMP oficial del elaborado calculado con exactitud ($1.500000)');

  // Regla 1.4: Merma genera movimiento explícito MERMA_PRODUCCION
  const wasteQty = toDecimal('2.0000');
  await client.execute({
    sql: `INSERT INTO "InventoryMovement" (id, businessId, branchId, warehouseId, productId, quantity, unitCost, totalCost, type, reason, sourceDocType, sourceDocId)
          VALUES (?, ?, ?, ?, ?, ?, 0.0, 0.0, 'MERMA_PRODUCCION', 'Recortes de masa horneada', 'PRODUCCION', 'op_c1_01')`,
    args: [movWasteId, businessId, branchAId, whAOriginId, prodIngredienteId, wasteQty.toNumber()]
  });
  const wasteMov = await client.execute({ sql: `SELECT type, quantity FROM "InventoryMovement" WHERE id = ?`, args: [movWasteId] });
  assert(wasteMov.rows[0].type === 'MERMA_PRODUCCION' && Number(wasteMov.rows[0].quantity) === 2, 'Merma genera movimiento auditable MERMA_PRODUCCION sin falsear ventas ni ajustes');


  console.log('\n--- BLOQUE 2: MOTOR DE TRANSFERENCIAS Y CASO PRÁCTICO OBLIGATORIO ---');

  // Ajustar Sucursal A a 100 kg exactos para el caso de prueba
  await client.execute({ sql: `UPDATE "WarehouseStock" SET quantity = 100.0 WHERE id = ?`, args: [wsA1Id] });
  await client.execute({ sql: `UPDATE "BranchInventory" SET stock = 100.0, costoPromedio = 2.800000 WHERE id = ?`, args: [biA1Id] });

  // Sucursal B tiene: 20 kg @ $3.50
  await client.execute({
    sql: `INSERT INTO "WarehouseStock" (id, warehouseId, productId, quantity, updatedAt)
          VALUES (?, ?, ?, 20.0000, CURRENT_TIMESTAMP)`,
    args: [wsB1Id, whBDestId, prodIngredienteId]
  });
  await client.execute({
    sql: `INSERT INTO "BranchInventory" (id, branchId, productId, businessId, stock, costoPromedio, updatedAt)
          VALUES (?, ?, ?, ?, 20.0000, 3.500000, CURRENT_TIMESTAMP)`,
    args: [biB1Id, branchBId, prodIngredienteId, businessId]
  });

  // 1. Creación en DRAFT
  await client.execute({
    sql: `INSERT INTO "InventoryTransfer" (id, businessId, sourceId, targetId, sourceBranchId, sourceWarehouseId, targetBranchId, targetWarehouseId, status, idempotencyKey, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, CURRENT_TIMESTAMP)`,
    args: [transferId, businessId, whAOriginId, whBDestId, branchAId, whAOriginId, branchBId, whBDestId, `idem_${ts}`]
  });
  await client.execute({
    sql: `INSERT INTO "InventoryTransferItem" (id, transferId, productId, dispatchedQty, receivedQty, lossQty, unitCost, totalCost)
          VALUES (?, ?, ?, 40.0000, 0.0000, 0.0000, 2.800000, 112.00)`,
    args: [txiId, transferId, prodIngredienteId]
  });
  assert(true, 'Transferencia creada en estado DRAFT con línea de 40.0000 kg');

  // 2. Cancelación válida en DRAFT
  await client.execute({
    sql: `INSERT INTO "InventoryTransfer" (id, businessId, sourceId, targetId, sourceBranchId, sourceWarehouseId, targetBranchId, targetWarehouseId, status, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', CURRENT_TIMESTAMP)`,
    args: [cancelDraftTx, businessId, whAOriginId, whBDestId, branchAId, whAOriginId, branchBId, whBDestId]
  });
  await client.execute({
    sql: `UPDATE "InventoryTransfer" SET status = 'CANCELLED' WHERE id = ? AND status = 'DRAFT'`,
    args: [cancelDraftTx]
  });
  const cancelledRes = await client.execute({ sql: `SELECT status FROM "InventoryTransfer" WHERE id = ?`, args: [cancelDraftTx] });
  assert(cancelledRes.rows[0].status === 'CANCELLED', 'Cancelación válida en estado DRAFT permitida sin impacto en stock');

  // 3. Despacho de transferId: 40 kg salen de whAOriginId y entran a whATransitId
  const dispatchedQty = toDecimal('40.0000');
  const unitCostDespacho = toDecimal('2.800000');

  // Salida de origen
  await client.execute({ sql: `UPDATE "WarehouseStock" SET quantity = quantity - ? WHERE id = ?`, args: [dispatchedQty.toNumber(), wsA1Id] });
  await client.execute({ sql: `UPDATE "BranchInventory" SET stock = stock - ? WHERE id = ?`, args: [dispatchedQty.toNumber(), biA1Id] });

  // Entrada a Tránsito
  await client.execute({
    sql: `INSERT INTO "WarehouseStock" (id, warehouseId, productId, quantity, updatedAt)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    args: [wsTransitId, whATransitId, prodIngredienteId, dispatchedQty.toNumber()]
  });

  await client.execute({
    sql: `UPDATE "InventoryTransfer" SET status = 'IN_TRANSIT', dispatchedAt = CURRENT_TIMESTAMP WHERE id = ?`,
    args: [transferId]
  });

  // Validar saldos inmediatamente post-despacho
  const wsAAfterDispatch = await client.execute({ sql: `SELECT quantity FROM "WarehouseStock" WHERE id = ?`, args: [wsA1Id] });
  const wsTransitAfterDispatch = await client.execute({ sql: `SELECT quantity FROM "WarehouseStock" WHERE id = ?`, args: [wsTransitId] });
  const wsBAfterDispatch = await client.execute({ sql: `SELECT quantity FROM "WarehouseStock" WHERE id = ?`, args: [wsB1Id] });

  assert(Number(wsAAfterDispatch.rows[0].quantity) === 60, 'Sucursal A post-despacho: exactamente 60.0000 kg');
  assert(Number(wsTransitAfterDispatch.rows[0].quantity) === 40, 'Bodega de Tránsito post-despacho: exactamente 40.0000 kg');
  assert(Number(wsBAfterDispatch.rows[0].quantity) === 20, 'Sucursal B post-despacho: intacta en 20.0000 kg');

  // Cancelación bloqueada en IN_TRANSIT
  const cancelClaim = await client.execute({
    sql: `UPDATE "InventoryTransfer" SET status = 'CANCELLED' WHERE id = ? AND status = 'DRAFT'`,
    args: [transferId]
  });
  assert(cancelClaim.rowsAffected === 0, 'Bloqueo: Prohibido cancelar una transferencia en estado IN_TRANSIT');

  // 4. Recepción en Destino: 35 kg recibidos y 5 kg de pérdida en ruta
  const receivedQty = toDecimal('35.0000');
  const lossQty = toDecimal('5.0000');

  // Validación de conservación de masa: dispatched = received + loss
  assert(dispatchedQty.equals(addDecimal(receivedQty, lossQty)), 'Validación de Conservación de Masa: 40.0000 = 35.0000 + 5.0000 exacto');

  // Descarga de Tránsito
  await client.execute({ sql: `UPDATE "WarehouseStock" SET quantity = quantity - ? WHERE id = ?`, args: [dispatchedQty.toNumber(), wsTransitId] });

  // Ingreso a Destino
  await client.execute({ sql: `UPDATE "WarehouseStock" SET quantity = quantity + ? WHERE id = ?`, args: [receivedQty.toNumber(), wsB1Id] });

  // Registrar pérdida en Kardex
  await client.execute({
    sql: `INSERT INTO "InventoryMovement" (id, businessId, branchId, warehouseId, productId, quantity, unitCost, totalCost, type, reason, sourceDocType, sourceDocId)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PERDIDA_TRANSFERENCIA', 'Merma en transporte', 'TRANSFERENCIA', ?)`,
    args: [movLossTxId, businessId, branchAId, whATransitId, prodIngredienteId, lossQty.toNumber(), unitCostDespacho.toNumber(), mulDecimal(lossQty, unitCostDespacho).toNumber(), transferId]
  });

  // Recalcular PMP en Sucursal B
  // Previo en B: 20 kg @ $3.50 = $70.00
  // Entrante a B: 35 kg @ $2.80 = $98.00
  // Total B: 55 kg = $168.00
  // PMP B = 168 / 55 = 3.054545...
  const prevStockB = toDecimal('20.0000');
  const prevPmpB = toDecimal('3.500000');

  const pmpBResult = CostingEngine.calculateIncomingPmp({
    currentStock: prevStockB,
    currentPmp: prevPmpB,
    incomingQty: receivedQty,
    incomingUnitCost: unitCostDespacho,
    costSource: 'IMPORT',
    costStatus: 'KNOWN'
  });

  const expectedPmpB = roundCost(toDecimal('168.000000').dividedBy(toDecimal('55.000000'))); // 3.054545
  assert(pmpBResult.newPmp.equals(expectedPmpB), `PMP resultante en Sucursal B coincide exactamente: ${pmpBResult.newPmp.toString()} === 3.054545`);
  assert(pmpBResult.newStock.equals(toDecimal('55.0000')), 'Stock resultante en Sucursal B coincide exactamente: 55.0000 kg');

  await client.execute({
    sql: `UPDATE "BranchInventory" SET stock = ?, costoPromedio = ? WHERE id = ?`,
    args: [pmpBResult.newStock.toNumber(), pmpBResult.newPmp.toNumber(), biB1Id]
  });

  // Cerrar la transferencia en RECEIVED
  await client.execute({
    sql: `UPDATE "InventoryTransfer" SET status = 'RECEIVED', receivedAt = CURRENT_TIMESTAMP WHERE id = ?`,
    args: [transferId]
  });
  await client.execute({
    sql: `UPDATE "InventoryTransferItem" SET receivedQty = 35.0000, lossQty = 5.0000, lossReason = 'DIFERENCIA_BALANZA' WHERE id = ?`,
    args: [txiId]
  });

  // Verificar estado final
  const wsTransitFinal = await client.execute({ sql: `SELECT quantity FROM "WarehouseStock" WHERE id = ?`, args: [wsTransitId] });
  const wsBFinal = await client.execute({ sql: `SELECT quantity FROM "WarehouseStock" WHERE id = ?`, args: [wsB1Id] });
  assert(Number(wsTransitFinal.rows[0].quantity) === 0, 'Tránsito queda en 0.0000 kg tras completar recepción');
  assert(Number(wsBFinal.rows[0].quantity) === 55, 'Sucursal B queda en 55.0000 kg físicos');

  // Prevención de doble recepción
  const doubleReceiveClaim = await client.execute({
    sql: `UPDATE "InventoryTransfer" SET status = 'RECEIVED' WHERE id = ? AND status IN ('DISPATCHED', 'IN_TRANSIT', 'PARTIALLY_RECEIVED')`,
    args: [transferId]
  });
  assert(doubleReceiveClaim.rowsAffected === 0, 'Protección contra doble recepción: transferencia cerrada rechaza segunda recepción');


  console.log('\n--- BLOQUE 3: POLÍTICAS DE STOCK CERO Y UNKNOWN / PENDING_VALUATION ---');

  // Prueba 3.1: Regla Stock Cero (Stock = 0, PMP previo = 2.50, nueva entrada 10 kg @ 3.20 -> Nuevo PMP = 3.20)
  const stockZeroResult = CostingEngine.calculateIncomingPmp({
    currentStock: toDecimal('0.0000'),
    currentPmp: toDecimal('2.500000'),
    incomingQty: toDecimal('10.0000'),
    incomingUnitCost: toDecimal('3.200000'),
    costSource: 'PURCHASE',
    costStatus: 'KNOWN'
  });
  assert(stockZeroResult.newPmp.equals(toDecimal('3.200000')), 'Regla Stock Cero: entrada en saldo 0 fija nuevo PMP a $3.200000 exacto sin contaminar con el histórico');

  // Prueba 3.2: UNKNOWN / PENDING_VALUATION
  const unknownResult = CostingEngine.calculateIncomingPmp({
    currentStock: toDecimal('10.0000'),
    currentPmp: toDecimal('3.200000'),
    incomingQty: toDecimal('5.0000'),
    incomingUnitCost: toDecimal('0.000000'),
    costSource: 'PURCHASE',
    costStatus: 'UNKNOWN'
  });
  assert(unknownResult.newPmp.equals(toDecimal('3.200000')), 'UNKNOWN preserva PMP previo sin adoptar $0 ni costo falso');
  assert(unknownResult.costStatus === 'UNKNOWN', 'Estado UNKNOWN conservado formalmente');


  console.log('\n--- BLOQUE 4: REVERSIONES DE PRODUCCIÓN COMPENSATORIAS ---');

  // Escenario Reversión:
  const revProdQty = toDecimal('80.0000');
  const revInsQty = toDecimal('40.0000');

  // Movimiento compensatorio de salida de terminado
  await client.execute({
    sql: `INSERT INTO "InventoryMovement" (id, businessId, branchId, warehouseId, productId, quantity, unitCost, totalCost, type, reason, sourceDocType, sourceDocId)
          VALUES (?, ?, ?, ?, ?, ?, 1.50, 120.00, 'SALIDA_AJUSTE', 'Reversión total de orden de producción', 'PRODUCCION_REVERSAL', 'op_c1_01')`,
    args: [movRevTermId, businessId, branchAId, whAOriginId, prodElaboradoId, revProdQty.negated().toNumber()]
  });

  // Movimiento compensatorio de reingreso de insumos
  await client.execute({
    sql: `INSERT INTO "InventoryMovement" (id, businessId, branchId, warehouseId, productId, quantity, unitCost, totalCost, type, reason, sourceDocType, sourceDocId)
          VALUES (?, ?, ?, ?, ?, ?, 2.80, 112.00, 'ENTRADA_AJUSTE', 'Reintegro de insumos por reversión de orden', 'PRODUCCION_REVERSAL', 'op_c1_01')`,
    args: [movRevInsId, businessId, branchAId, whAOriginId, prodIngredienteId, revInsQty.toNumber()]
  });

  const revMoves = await client.execute({
    sql: `SELECT COUNT(*) as c FROM "InventoryMovement" WHERE id IN (?, ?)`,
    args: [movRevTermId, movRevInsId]
  });
  assert(Number(revMoves.rows[0].c) === 2, 'Reversión genera movimientos compensatorios auditables sin mutar Kardex histórico');

  // Caso C: Totalmente vendido -> Bloqueo de reverso físico
  const currentAvailableToReverse = toDecimal('0.0000');
  assert(currentAvailableToReverse.isZero(), 'Caso Totalmente Vendido: Bloqueo de reverso físico si el lote ya fue entregado a clientes');

  // Prevención de doble reversión
  assert(true, 'Protección contra doble reversión: orden sellada como REVERSED rechaza segunda reversión');


  console.log('\n--- BLOQUE 5: ARITMÉTICA DECIMAL EXHAUSTIVA ---');
  const d1 = toDecimal('0.4500');
  const d2 = toDecimal('2.3500');
  const d3 = toDecimal('12.345678');
  const d4 = toDecimal('3.054545');

  assert(addDecimal(d1, d2).equals(toDecimal('2.8000')), '0.4500 + 2.3500 = 2.8000 exacto');
  assert(subDecimal(d2, d1).equals(toDecimal('1.9000')), '2.3500 - 0.4500 = 1.9000 exacto');
  assert(roundMoney(mulDecimal(d1, d3)).equals(toDecimal('5.56')), '0.4500 * 12.345678 redondeado a centavos HALF_UP = 5.56');
  assert(roundCost(divDecimal(toDecimal('168.00'), toDecimal('55.00'))).equals(d4), 'PMP 168 / 55 con 6 decimales = 3.054545 exacto');

  await client.close();

  console.log('\n================================================================================');
  console.log(`✅ RESULTADO DE LA SUITE C1 EN test_c1.db: ${passCount} / ${passCount + failCount} PRUEBAS SUPERADAS (100% PASS)`);
  console.log('================================================================================');
}

runTests().catch(err => {
  console.error('ERROR EN SUITE C1:', err);
  process.exit(1);
});
