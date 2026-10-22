import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createClient } from '@libsql/client';

async function calculateHash(filePath: string): Promise<string> {
  const hash = crypto.createHash('sha256');
  const fileStream = fs.createReadStream(filePath);
  return new Promise((resolve, reject) => {
    fileStream.on('data', (chunk) => hash.update(chunk));
    fileStream.on('end', () => resolve(hash.digest('hex').toUpperCase()));
    fileStream.on('error', (err) => reject(err));
  });
}

async function main() {
  const rootDir = process.cwd();
  const devDbPath = path.join(rootDir, 'dev.db');
  const testDbPath = path.join(rootDir, 'test_c1.db');

  console.log('=== CITIOX FASE C1: PREPARACIÓN DEL ENTORNO AISLADO ===');

  // 1. Verificar dev.db original
  if (!fs.existsSync(devDbPath)) {
    throw new Error(`No se encuentra ${devDbPath}`);
  }
  const statDev = fs.statSync(devDbPath);
  console.log(`dev.db encontrada: ${statDev.size} bytes`);

  const devHash = await calculateHash(devDbPath);
  console.log(`dev.db SHA-256 inicial: ${devHash}`);

  // 2. Crear copia exacta test_c1.db
  fs.copyFileSync(devDbPath, testDbPath);
  const statTest = fs.statSync(testDbPath);
  const testHash = await calculateHash(testDbPath);
  console.log(`test_c1.db creada: ${statTest.size} bytes`);
  console.log(`test_c1.db SHA-256 inicial: ${testHash}`);

  if (devHash !== testHash) {
    throw new Error('La copia test_c1.db no coincide exactamente con dev.db');
  }
  console.log('✅ Copia test_c1.db verificada criptográficamente (100% idéntica)');

  // 3. Capturar conteos y sumatorias de referencia en test_c1.db
  const client = createClient({ url: `file:${testDbPath}` });

  const tables = [
    'Producto', 'ProductoVariante', 'Branch', 'Warehouse',
    'BranchInventory', 'WarehouseStock', 'InventoryMovement',
    'Pedido', 'PedidoItem', 'Recipe', 'RecipeItem',
    'ProductionOrder', 'ProductionOrderItem', 'InventoryTransfer', 'InventoryTransferItem'
  ];

  const counts: Record<string, number> = {};
  for (const t of tables) {
    const res = await client.execute(`SELECT COUNT(*) as cnt FROM "${t}"`);
    counts[t] = Number(res.rows[0].cnt);
  }

  const sumProdStock = await client.execute(`SELECT SUM(CAST(stock AS REAL)) as s FROM "Producto"`);
  const sumBranchStock = await client.execute(`SELECT SUM(CAST(stock AS REAL)) as s FROM "BranchInventory"`);
  const sumWhStock = await client.execute(`SELECT SUM(CAST(quantity AS REAL)) as s FROM "WarehouseStock"`);
  const sumMoveQty = await client.execute(`SELECT SUM(CAST(quantity AS REAL)) as s FROM "InventoryMovement"`);
  const sumMoveCost = await client.execute(`SELECT SUM(CAST(totalCost AS REAL)) as s FROM "InventoryMovement"`);

  const baseline = {
    timestamp: new Date().toISOString(),
    devDb: {
      path: devDbPath,
      size: statDev.size,
      sha256: devHash
    },
    testDb: {
      path: testDbPath,
      size: statTest.size,
      sha256: testHash
    },
    counts,
    sums: {
      productoStock: Number(sumProdStock.rows[0].s),
      branchStock: Number(sumBranchStock.rows[0].s),
      warehouseStock: Number(sumWhStock.rows[0].s),
      inventoryMovementQty: Number(sumMoveQty.rows[0].s),
      inventoryMovementTotalCost: Number(sumMoveCost.rows[0].s)
    }
  };

  fs.writeFileSync(path.join(rootDir, 'test_c1_baseline.json'), JSON.stringify(baseline, null, 2));
  console.log('\nBaseline capturado en test_c1_baseline.json:');
  console.log(JSON.stringify(baseline.sums, null, 2));
  console.log(JSON.stringify(baseline.counts, null, 2));

  await client.close();
  console.log('\n✅ ENTORNO AISLADO PREPARADO CON ÉXITO');
}

main().catch(err => {
  console.error('Error preparando entorno aislado:', err);
  process.exit(1);
});
