import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createClient } from '@libsql/client';

function getSha256(filePath: string): string {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex').toUpperCase();
}

async function executeMigration() {
  const rootDir = process.cwd();
  const devDbPath = path.resolve(rootDir, 'dev.db');
  const sqlPath = path.resolve(rootDir, 'scripts', 'migration_c1_isolated.sql');
  const auditBeforePath = path.resolve(rootDir, 'c2_audit_before.json');

  console.log('================================================================================');
  console.log('   CITIOX FASE C2: ETAPA 6 - APLICACIÓN CONTROLADA DE MIGRACIÓN DDL EN dev.db');
  console.log('================================================================================\n');

  if (!fs.existsSync(auditBeforePath)) {
    throw new Error('No se encontró c2_audit_before.json. Debe ejecutarse auditoría primero.');
  }

  const auditBefore = JSON.parse(fs.readFileSync(auditBeforePath, 'utf8'));

  // 1. Verificación de Backup
  if (!fs.existsSync(auditBefore.backupFilePath)) {
    throw new Error(`Backup obligatorio no encontrado en: ${auditBefore.backupFilePath}`);
  }
  const backupHash = getSha256(auditBefore.backupFilePath);
  if (backupHash !== auditBefore.sha256Before) {
    throw new Error('El hash del backup no coincide con el hash previo de dev.db');
  }
  console.log(`🔒 Backup previo verificado: ${auditBefore.backupFilePath}`);
  console.log(`   Hash: ${backupHash} (100% MATCH)\n`);

  // 2. Preparar sentencias DDL
  const rawSql = fs.readFileSync(sqlPath, 'utf8');
  const cleanSql = rawSql.replace(/--.*$/gm, '');
  const statements = cleanSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  console.log(`Ejecutando ${statements.length} sentencias DDL sobre dev.db...`);

  const client = createClient({ url: `file:${devDbPath}` });

  try {
    for (const stmt of statements) {
      console.log(`  -> Ejecutando: ${stmt.substring(0, 60).replace(/\n/g, ' ')}...`);
      await client.execute(stmt);
    }
    console.log('\n✅ Todas las sentencias DDL fueron ejecutadas exitosamente.');
  } catch (err: any) {
    console.error(`\n❌ ERROR EJECUTANDO DDL: ${err.message}`);
    console.error('Iniciando restauración automática inmediata desde backup...');
    await client.close();
    fs.copyFileSync(auditBefore.backupFilePath, devDbPath);
    const restoredHash = getSha256(devDbPath);
    if (restoredHash === auditBefore.sha256Before) {
      console.log('🔒 dev.db restaurada exitosamente desde backup (Hash bit a bit verificado).');
    } else {
      console.error('🚨 ALERTA: Falla en restauración de dev.db.');
    }
    throw err;
  }

  // 3. Verificación Post-Migración: Columnas y Estructura
  console.log('\n--- VERIFICACIÓN DE NUEVAS COLUMNAS Y ESTRUCTURAS ---');
  const brCols = await client.execute(`PRAGMA table_info("Branch")`);
  console.log('Branch:', brCols.rows.filter((r: any) => ['isCentralKitchen', 'branchType'].includes(r.name)).map((r: any) => r.name));

  const whCols = await client.execute(`PRAGMA table_info("Warehouse")`);
  console.log('Warehouse:', whCols.rows.filter((r: any) => ['type'].includes(r.name)).map((r: any) => r.name));

  const biCols = await client.execute(`PRAGMA table_info("BranchInventory")`);
  console.log('BranchInventory:', biCols.rows.filter((r: any) => ['costoPromedio', 'lastKnownCost'].includes(r.name)).map((r: any) => r.name));

  const poCols = await client.execute(`PRAGMA table_info("ProductionOrder")`);
  console.log('ProductionOrder:', poCols.rows.filter((r: any) => ['branchId', 'costStatus', 'reversalOfId', 'reversalReason'].includes(r.name)).map((r: any) => r.name));

  const itCols = await client.execute(`PRAGMA table_info("InventoryTransfer")`);
  console.log('InventoryTransfer:', itCols.rows.filter((r: any) => ['sourceBranchId', 'targetBranchId', 'dispatchedAt', 'idempotencyKey'].includes(r.name)).map((r: any) => r.name));

  const itiCols = await client.execute(`PRAGMA table_info("InventoryTransferItem")`);
  console.log('InventoryTransferItem:', itiCols.rows.map((r: any) => r.name));

  // 4. Verificación Post-Migración: Conteos y Sumas
  console.log('\n--- VERIFICACIÓN COMPARATIVA: COUNTS_BEFORE vs COUNTS_AFTER ---');
  const countsAfter: Record<string, number> = {};
  let countMismatch = false;

  for (const [table, expectedCount] of Object.entries(auditBefore.counts)) {
    const res = await client.execute(`SELECT COUNT(*) as count FROM "${table}"`);
    const actualCount = Number(res.rows[0].count);
    countsAfter[table] = actualCount;
    const match = actualCount === expectedCount;
    console.log(`  ${table.padEnd(24)}: Before=${expectedCount}, After=${actualCount} ${match ? '✅ MATCH' : '❌ MISMATCH'}`);
    if (!match) countMismatch = true;
  }

  console.log('\n--- VERIFICACIÓN COMPARATIVA: SUMS_BEFORE vs SUMS_AFTER ---');
  const sumProdStockRes = await client.execute(`SELECT SUM(CAST(stock AS REAL)) as s FROM "Producto"`);
  const sumBranchInvStockRes = await client.execute(`SELECT SUM(CAST(stock AS REAL)) as s FROM "BranchInventory"`);
  const sumWhStockRes = await client.execute(`SELECT SUM(CAST(quantity AS REAL)) as s FROM "WarehouseStock"`);
  const sumMovQtyRes = await client.execute(`SELECT SUM(CAST(quantity AS REAL)) as s FROM "InventoryMovement"`);
  const sumMovTotalCostRes = await client.execute(`SELECT SUM(CAST(totalCost AS REAL)) as s FROM "InventoryMovement"`);
  const sumPedidoItemQtyRes = await client.execute(`SELECT SUM(CAST(cantidad AS REAL)) as s FROM "PedidoItem"`);

  const sumsAfter = {
    sumProductoStock: Number(sumProdStockRes.rows[0].s || 0),
    sumBranchInventoryStock: Number(sumBranchInvStockRes.rows[0].s || 0),
    sumWarehouseStockQuantity: Number(sumWhStockRes.rows[0].s || 0),
    sumInventoryMovementQuantity: Number(sumMovQtyRes.rows[0].s || 0),
    sumInventoryMovementTotalCost: Number(sumMovTotalCostRes.rows[0].s || 0),
    sumPedidoItemCantidad: Number(sumPedidoItemQtyRes.rows[0].s || 0)
  };

  let sumMismatch = false;
  for (const [k, expectedVal] of Object.entries(auditBefore.sums)) {
    const actualVal = (sumsAfter as any)[k];
    const match = actualVal === expectedVal;
    console.log(`  ${k.padEnd(30)}: Before=${expectedVal}, After=${actualVal} ${match ? '✅ MATCH' : '❌ MISMATCH'}`);
    if (!match) sumMismatch = true;
  }

  await client.close();

  if (countMismatch || sumMismatch) {
    console.error('\n❌ ERROR: Se detectó discrepancia en conteos o sumas críticas.');
    console.error('Iniciando restauración automática desde backup...');
    fs.copyFileSync(auditBefore.backupFilePath, devDbPath);
    throw new Error('Migración abortada por discrepancia cuantitativa.');
  }

  // 5. Hash post-migración
  const devDbStatsPost = fs.statSync(devDbPath);
  const sha256After = getSha256(devDbPath);
  console.log(`\n🔒 MIGRACIÓN FÍSICA EXITOSA:`);
  console.log(`   Nuevo tamaño dev.db: ${devDbStatsPost.size} bytes`);
  console.log(`   Nuevo SHA-256:       ${sha256After}`);

  // Guardar evidencia en archivo
  const auditAfterData = {
    date: new Date().toISOString(),
    sha256Before: auditBefore.sha256Before,
    sha256After,
    sizeBefore: auditBefore.sizeBefore,
    sizeAfter: devDbStatsPost.size,
    countsBefore: auditBefore.counts,
    countsAfter,
    sumsBefore: auditBefore.sums,
    sumsAfter
  };

  fs.writeFileSync(path.join(rootDir, 'c2_audit_after.json'), JSON.stringify(auditAfterData, null, 2), 'utf8');
  console.log('Archivo de evidencia creado: c2_audit_after.json\n');
}

executeMigration().catch(err => {
  console.error('\n❌ ERROR EN MIGRACIÓN:', err);
  process.exit(1);
});
