import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createClient } from '@libsql/client';

function getSha256(filePath: string): string {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex').toUpperCase();
}

async function runFinalAudit() {
  const rootDir = process.cwd();
  const devDbPath = path.resolve(rootDir, 'dev.db');
  const auditBefore = JSON.parse(fs.readFileSync(path.resolve(rootDir, 'c2_audit_before.json'), 'utf8'));

  console.log('================================================================================');
  console.log('   CITIOX FASE C2: ETAPA 13 - AUDITORÍA FINAL POST-MIGRACIÓN');
  console.log('================================================================================\n');

  const stats = fs.statSync(devDbPath);
  const currentHash = getSha256(devDbPath);

  console.log(`Ruta dev.db:     ${devDbPath}`);
  console.log(`Tamaño actual:   ${stats.size} bytes`);
  console.log(`SHA-256 actual:  ${currentHash}`);

  const client = createClient({ url: `file:${devDbPath}` });

  // Conteos
  const tables = [
    'Producto',
    'ProductoVariante',
    'Branch',
    'BranchInventory',
    'Warehouse',
    'WarehouseStock',
    'InventoryMovement',
    'Pedido',
    'PedidoItem',
    'Recipe',
    'RecipeItem',
    'ProductionOrder',
    'InventoryTransfer',
    'InventoryTransferItem'
  ];

  console.log('\n--- VERIFICACIÓN DE CONTEOS FINALES vs BEFORE ---');
  let countsMatch = true;
  for (const table of tables) {
    const res = await client.execute(`SELECT COUNT(*) as c FROM "${table}"`);
    const actual = Number(res.rows[0].c);
    const expected = auditBefore.counts[table];
    const match = actual === expected;
    console.log(`  ${table.padEnd(24)}: Esperado=${expected}, Actual=${actual} ${match ? '✅ MATCH' : '❌ MISMATCH'}`);
    if (!match) countsMatch = false;
  }

  // Sumatorias críticas
  const sumProdStockRes = await client.execute(`SELECT SUM(CAST(stock AS REAL)) as s FROM "Producto"`);
  const sumBranchInvStockRes = await client.execute(`SELECT SUM(CAST(stock AS REAL)) as s FROM "BranchInventory"`);
  const sumWhStockRes = await client.execute(`SELECT SUM(CAST(quantity AS REAL)) as s FROM "WarehouseStock"`);
  const sumMovQtyRes = await client.execute(`SELECT SUM(CAST(quantity AS REAL)) as s FROM "InventoryMovement"`);
  const sumMovTotalCostRes = await client.execute(`SELECT SUM(CAST(totalCost AS REAL)) as s FROM "InventoryMovement"`);
  const sumPedidoItemQtyRes = await client.execute(`SELECT SUM(CAST(cantidad AS REAL)) as s FROM "PedidoItem"`);

  const sumsActual = {
    sumProductoStock: Number(sumProdStockRes.rows[0].s || 0),
    sumBranchInventoryStock: Number(sumBranchInvStockRes.rows[0].s || 0),
    sumWarehouseStockQuantity: Number(sumWhStockRes.rows[0].s || 0),
    sumInventoryMovementQuantity: Number(sumMovQtyRes.rows[0].s || 0),
    sumInventoryMovementTotalCost: Number(sumMovTotalCostRes.rows[0].s || 0),
    sumPedidoItemCantidad: Number(sumPedidoItemQtyRes.rows[0].s || 0)
  };

  console.log('\n--- VERIFICACIÓN DE SUMAS CRÍTICAS FINALES vs BEFORE ---');
  let sumsMatch = true;
  for (const [k, expected] of Object.entries(auditBefore.sums)) {
    const actual = (sumsActual as any)[k];
    const match = actual === expected;
    console.log(`  ${k.padEnd(30)}: Esperado=${expected}, Actual=${actual} ${match ? '✅ MATCH' : '❌ MISMATCH'}`);
    if (!match) sumsMatch = false;
  }

  // Verificar que los 14 registros históricos de ProductionOrder no tienen datos inventados
  const poHistoricRes = await client.execute(`SELECT COUNT(*) as c FROM "ProductionOrder" WHERE branchId IS NULL AND "sourceWarehouseId" IS NULL AND "targetWarehouseId" IS NULL`);
  console.log(`\nProductionOrder históricas preservadas con NULL (branch/warehouses): ${poHistoricRes.rows[0].c} de 14`);

  await client.close();

  if (!countsMatch || !sumsMatch) {
    throw new Error('AUDITORÍA FINAL FALLIDA: Discrepancia en conteos o sumatorias.');
  }

  console.log('\n================================================================================');
  console.log('AUDITORÍA FINAL COMPLETADA: 🟢 100% ÉXITO');
  console.log('================================================================================');
}

runFinalAudit().catch(e => {
  console.error('Error en auditoría final:', e);
  process.exit(1);
});
