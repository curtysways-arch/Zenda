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
  const testDbPath = path.join(rootDir, 'test_c1.db');
  const devDbPath = path.join(rootDir, 'dev.db');
  const sqlPath = path.join(rootDir, 'scripts', 'migration_c1_isolated.sql');

  console.log('=== EJECUCIÓN CONTROLADA DE MIGRACIÓN C1 SOBRE test_c1.db ===');

  // 1. Restaurar test_c1.db limpia desde dev.db
  const baseline = JSON.parse(fs.readFileSync(path.join(rootDir, 'test_c1_baseline.json'), 'utf8'));
  const currentDevHash = await calculateHash(devDbPath);
  if (currentDevHash !== baseline.devDb.sha256) {
    throw new Error('ALERTA: dev.db fue modificada externamente.');
  }
  fs.copyFileSync(devDbPath, testDbPath);
  console.log('🔒 Verificación dev.db: Intacta e inalterada. test_c1.db re-sincronizada.');

  // 2. Limpiar comentarios y ejecutar DDL sobre test_c1.db
  const client = createClient({ url: `file:${testDbPath}` });
  const rawSql = fs.readFileSync(sqlPath, 'utf8');
  const cleanSql = rawSql.replace(/--.*$/gm, '');
  const statements = cleanSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const stmt of statements) {
    try {
      await client.execute(stmt);
    } catch (err: any) {
      console.error(`Error ejecutando statement:\n${stmt}`);
      throw err;
    }
  }

  console.log(`✅ DDL aplicado con éxito (${statements.length} sentencias ejecutadas).`);

  // 3. Verificar estructura de columnas
  const brCols = await client.execute(`PRAGMA table_info("Branch")`);
  console.log('Columnas Branch agregadas:', brCols.rows.filter((r: any) => ['isCentralKitchen', 'branchType'].includes(r.name)).map((r: any) => r.name));

  const whCols = await client.execute(`PRAGMA table_info("Warehouse")`);
  console.log('Columnas Warehouse agregadas:', whCols.rows.filter((r: any) => ['type'].includes(r.name)).map((r: any) => r.name));

  const biCols = await client.execute(`PRAGMA table_info("BranchInventory")`);
  console.log('Columnas BranchInventory agregadas:', biCols.rows.filter((r: any) => ['costoPromedio', 'lastKnownCost'].includes(r.name)).map((r: any) => r.name));

  const poCols = await client.execute(`PRAGMA table_info("ProductionOrder")`);
  console.log('Columnas ProductionOrder agregadas:', poCols.rows.filter((r: any) => ['branchId', 'costStatus', 'reversalOfId', 'reversalReason'].includes(r.name)).map((r: any) => r.name));

  const itCols = await client.execute(`PRAGMA table_info("InventoryTransfer")`);
  console.log('Columnas InventoryTransfer agregadas:', itCols.rows.filter((r: any) => ['sourceBranchId', 'targetBranchId', 'dispatchedAt', 'idempotencyKey'].includes(r.name)).map((r: any) => r.name));

  const itiCols = await client.execute(`PRAGMA table_info("InventoryTransferItem")`);
  console.log('Columnas InventoryTransferItem reestructuradas:', itiCols.rows.map((r: any) => r.name));

  // 4. Verificar integridad cuantitativa post-migración
  for (const [table, expectedCount] of Object.entries(baseline.counts)) {
    const res = await client.execute(`SELECT COUNT(*) as cnt FROM "${table}"`);
    const actualCount = Number(res.rows[0].cnt);
    if (actualCount !== expectedCount) {
      throw new Error(`Discrepancia en tabla ${table}: esperado ${expectedCount}, obtenido ${actualCount}`);
    }
  }
  console.log('✅ Conteos de todas las tablas: 100% MATCH contra baseline.');

  const sumProdStock = await client.execute(`SELECT SUM(CAST(stock AS REAL)) as s FROM "Producto"`);
  if (Number(sumProdStock.rows[0].s) !== baseline.sums.productoStock) {
    throw new Error('Discrepancia en sumatoria de stock de Producto');
  }
  console.log('✅ Sumatorias de inventario: 100% MATCH contra baseline.');

  await client.close();

  // 5. Verificar que dev.db sigue 100% inalterada
  const postDevHash = await calculateHash(devDbPath);
  if (postDevHash !== baseline.devDb.sha256) {
    throw new Error('ERROR CRÍTICO: dev.db sufrió modificaciones.');
  }
  console.log('🔒 Verificación final: dev.db permanece 100% INTACTA.');

  const newTestHash = await calculateHash(testDbPath);
  console.log(`test_c1.db SHA-256 post-migración: ${newTestHash}`);
  console.log('\n=== MIGRACIÓN AISLADA COMPLETADA CON ÉXITO ===');
}

main().catch(err => {
  console.error('Error en migración aislada:', err);
  process.exit(1);
});
