import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createClient } from '@libsql/client';

function getSha256(filePath: string): string {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex').toUpperCase();
}

function getTimestampFormatted(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${yyyy}${mm}${dd}_${hh}${min}${ss}`;
}

async function auditAndBackup() {
  const rootDir = process.cwd();
  const devDbPath = path.resolve(rootDir, 'dev.db');

  console.log('================================================================================');
  console.log('   CITIOX FASE C2: ETAPA 1 - AUDITORÍA READ-ONLY Y BACKUP OBLIGATORIO');
  console.log('================================================================================\n');

  if (!fs.existsSync(devDbPath)) {
    throw new Error(`dev.db no encontrada en: ${devDbPath}`);
  }

  // 1. Metadatos del archivo dev.db
  const devDbStats = fs.statSync(devDbPath);
  const sha256Before = getSha256(devDbPath);
  const sizeBefore = devDbStats.size;
  const auditDate = new Date().toISOString();

  console.log(`Ruta absoluta dev.db: ${devDbPath}`);
  console.log(`Tamaño dev.db:        ${sizeBefore} bytes`);
  console.log(`SHA-256 dev.db:       ${sha256Before}`);
  console.log(`Fecha auditoría:      ${auditDate}\n`);

  // 2. Conexión Read-Only para conteos y sumas críticas
  const client = createClient({ url: `file:${devDbPath}` });

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

  const counts: Record<string, number> = {};

  for (const table of tables) {
    try {
      const res = await client.execute(`SELECT COUNT(*) as count FROM "${table}"`);
      counts[table] = Number(res.rows[0].count);
    } catch (err: any) {
      console.warn(`Aviso al contar tabla "${table}": ${err.message}`);
      counts[table] = -1;
    }
  }

  // Sumas críticas
  const sumProdStockRes = await client.execute(`SELECT SUM(CAST(stock AS REAL)) as s FROM "Producto"`);
  const sumBranchInvStockRes = await client.execute(`SELECT SUM(CAST(stock AS REAL)) as s FROM "BranchInventory"`);
  const sumWhStockRes = await client.execute(`SELECT SUM(CAST(quantity AS REAL)) as s FROM "WarehouseStock"`);
  const sumMovQtyRes = await client.execute(`SELECT SUM(CAST(quantity AS REAL)) as s FROM "InventoryMovement"`);
  const sumMovTotalCostRes = await client.execute(`SELECT SUM(CAST(totalCost AS REAL)) as s FROM "InventoryMovement"`);
  const sumPedidoItemQtyRes = await client.execute(`SELECT SUM(CAST(cantidad AS REAL)) as s FROM "PedidoItem"`);

  const sums = {
    sumProductoStock: Number(sumProdStockRes.rows[0].s || 0),
    sumBranchInventoryStock: Number(sumBranchInvStockRes.rows[0].s || 0),
    sumWarehouseStockQuantity: Number(sumWhStockRes.rows[0].s || 0),
    sumInventoryMovementQuantity: Number(sumMovQtyRes.rows[0].s || 0),
    sumInventoryMovementTotalCost: Number(sumMovTotalCostRes.rows[0].s || 0),
    sumPedidoItemCantidad: Number(sumPedidoItemQtyRes.rows[0].s || 0)
  };

  // Inspección de esquema de tablas clave
  const schemaBefore: Record<string, any[]> = {};
  for (const t of ['Branch', 'Warehouse', 'BranchInventory', 'ProductionOrder', 'InventoryTransfer', 'InventoryTransferItem']) {
    try {
      const pragma = await client.execute(`PRAGMA table_info("${t}")`);
      schemaBefore[t] = pragma.rows;
    } catch (e: any) {
      schemaBefore[t] = [];
    }
  }

  await client.close();

  console.log('--- CONTEOS READ-ONLY (BEFORE) ---');
  for (const [t, c] of Object.entries(counts)) {
    console.log(`  ${t.padEnd(24)}: ${c}`);
  }

  console.log('\n--- SUMAS CRÍTICAS (BEFORE) ---');
  for (const [k, v] of Object.entries(sums)) {
    console.log(`  ${k.padEnd(30)}: ${v}`);
  }

  // 3. Crear Backup obligatorio
  const timestampStr = getTimestampFormatted();
  const backupFileName = `dev.db.bak_c2_pre_${timestampStr}`;
  const backupFilePath = path.resolve(rootDir, backupFileName);

  console.log(`\n--- CREANDO BACKUP OBLIGATORIO ---`);
  fs.copyFileSync(devDbPath, backupFilePath);

  if (!fs.existsSync(backupFilePath)) {
    throw new Error(`Error fatal: El archivo de backup no se creó en ${backupFilePath}`);
  }

  const backupStats = fs.statSync(backupFilePath);
  const backupSha256 = getSha256(backupFilePath);

  console.log(`Ruta backup:     ${backupFilePath}`);
  console.log(`Tamaño backup:   ${backupStats.size} bytes`);
  console.log(`SHA-256 backup:  ${backupSha256}`);

  if (backupSha256 !== sha256Before) {
    throw new Error('ERROR FATAL: El hash del backup no coincide con dev.db');
  }
  if (backupStats.size !== sizeBefore) {
    throw new Error('ERROR FATAL: El tamaño del backup no coincide con dev.db');
  }

  console.log('\n🔒 VERIFICACIÓN DE BACKUP EXITOSA: 100% MATCH CRIPTOGRÁFICO');

  // 4. Guardar evidencia
  const auditData = {
    date: auditDate,
    devDbPath,
    sha256Before,
    sizeBefore,
    backupFilePath,
    backupSha256,
    counts,
    sums,
    schemaBefore
  };

  fs.writeFileSync(path.join(rootDir, 'c2_audit_before.json'), JSON.stringify(auditData, null, 2), 'utf8');
  console.log('Archivo de evidencia creado: c2_audit_before.json\n');
}

auditAndBackup().catch(err => {
  console.error('\n❌ ERROR EN AUDITORÍA / BACKUP:', err);
  process.exit(1);
});
