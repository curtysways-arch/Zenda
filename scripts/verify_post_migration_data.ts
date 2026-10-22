import { createClient } from '@libsql/client';
import * as fs from 'fs';
import * as path from 'path';

async function verifyData() {
  const dbPath = path.join(process.cwd(), 'dev.db');
  const client = createClient({ url: `file:${dbPath}` });

  const snapshot = JSON.parse(fs.readFileSync('pre_migration_snapshot.json', 'utf8'));
  console.log('--- VERIFICACIÓN POST-MIGRACIÓN CONTRA pre_migration_snapshot.json ---');

  // Helper de conteo seguro
  async function safeCount(table: string): Promise<number> {
    try {
      const res = await client.execute(`SELECT COUNT(*) as c FROM ${table}`);
      return Number(res.rows[0].c);
    } catch {
      return 0;
    }
  }

  async function safeSum(query: string): Promise<number | null> {
    try {
      const res = await client.execute(query);
      const val = Object.values(res.rows[0])[0];
      return val !== null && val !== undefined ? Number(val) : null;
    } catch {
      return null;
    }
  }

  let errors = 0;
  function check(actual: any, expected: any, desc: string) {
    if (actual === expected) {
      console.log(`  ✅ [MATCH] ${desc}: ${actual} === ${expected}`);
    } else {
      errors++;
      console.error(`  ❌ [MISMATCH] ${desc}: Actual=${actual} vs Expected=${expected}`);
    }
  }

  // 1. Conteos
  for (const [table, expectedCount] of Object.entries(snapshot.counts)) {
    const current = await safeCount(table);
    check(current, expectedCount, `Conteo de ${table}`);
  }

  // 2. Sumas de inventario
  const sumProdStock = await safeSum('SELECT SUM(stock) as s FROM Producto');
  check(sumProdStock, snapshot.inventorySums.sumProductoStock, 'SUM(Producto.stock)');

  const sumBranchStock = await safeSum('SELECT SUM(stock) as s FROM BranchInventory');
  check(sumBranchStock, snapshot.inventorySums.sumBranchInventoryStock, 'SUM(BranchInventory.stock)');

  const sumWhStock = await safeSum('SELECT SUM(quantity) as s FROM WarehouseStock');
  check(sumWhStock, snapshot.inventorySums.sumWarehouseStockQuantity, 'SUM(WarehouseStock.quantity)');

  // 3. Kardex
  const sumKardexQty = await safeSum('SELECT SUM(quantity) as s FROM InventoryMovement');
  check(sumKardexQty, snapshot.kardexSums.sumQuantity, 'SUM(InventoryMovement.quantity)');

  const sumKardexCost = await safeSum('SELECT SUM(totalCost) as s FROM InventoryMovement');
  check(sumKardexCost, snapshot.kardexSums.sumTotalCost, 'SUM(InventoryMovement.totalCost)');

  // 4. Pedidos
  const sumOrderItems = await safeSum('SELECT SUM(cantidad) as s FROM PedidoItem');
  check(sumOrderItems, snapshot.orderSums.sumItemCantidad, 'SUM(PedidoItem.cantidad)');

  // 5. Inspección de muestras representativas y typeof
  console.log('\n--- MUESTRAS REPRESENTATIVAS Y typeof EN SQLite ---');
  const sampleRes = await client.execute(`
    SELECT id, nombre, stock, typeof(stock) as tStock, precio, typeof(precio) as tPrecio,
           costoPromedio, typeof(costoPromedio) as tCosto
    FROM Producto
    WHERE stock IS NOT NULL
    LIMIT 3
  `);
  for (const r of sampleRes.rows) {
    console.log(`  📦 [${r.id}] "${r.nombre}": stock=${r.stock} (typeof: ${r.tStock}), precio=${r.precio} (typeof: ${r.tPrecio}), costoPromedio=${r.costoPromedio} (typeof: ${r.tCosto})`);
  }

  if (errors === 0) {
    console.log('\n✅ VERIFICACIÓN DE DATOS EXITOSA: 100% DE INTEGRIDAD PRESERVADA');
  } else {
    console.error(`\n❌ SE ENCONTRARON ${errors} DISCREPANCIAS`);
    process.exit(1);
  }
}

verifyData().catch(err => {
  console.error('Error verificando datos:', err);
  process.exit(1);
});
