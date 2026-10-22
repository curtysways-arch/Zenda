import { createClient } from '@libsql/client';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { toDecimal, roundQty, roundCost, roundMoney } from '../src/lib/math/money';

const DEV_DB_PATH = path.resolve(process.cwd(), 'dev.db');
const BACKUP_PATH = path.resolve(process.cwd(), 'dev.db.bak_phase2d_pre_20261004');

function calculateSha256(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

async function main() {
  console.log('='.repeat(95));
  console.log('   FASE 2D: MIGRACIÓN CONTROLADA DE dev.db (LOCAL ÚNICAMENTE - CERO PRODUCCIÓN)');
  console.log('='.repeat(95));

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. VERIFICACIÓN Y METADATOS DEL BACKUP PREVIO
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n[PASO 1] Metadatos del Backup Previo (dev.db.bak_phase2d_pre_20261004):');
  if (!fs.existsSync(BACKUP_PATH)) {
    throw new Error('El backup dev.db.bak_phase2d_pre_20261004 no existe.');
  }

  const backupStats = fs.statSync(BACKUP_PATH);
  const backupSha256 = calculateSha256(BACKUP_PATH);

  console.log(`  • Ruta:      ${BACKUP_PATH}`);
  console.log(`  • Tamaño:    ${backupStats.size} bytes`);
  console.log(`  • Fecha/Hora:${backupStats.mtime.toISOString()}`);
  console.log(`  • SHA-256:   ${backupSha256}`);

  const client = createClient({ url: `file:${DEV_DB_PATH}` });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. CAPTURA DE LÍNEA BASE PRE-MIGRACIÓN DE dev.db
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n[PASO 2] Captura de línea base y conteos exactos en dev.db:');
  const preProducts = await client.execute('SELECT id, nombre, stock, costoUnitario, precio FROM Producto ORDER BY id');
  const preVariants = await client.execute('SELECT id, stock, precio FROM ProductoVariante ORDER BY id');
  const preBranchInv = await client.execute('SELECT id, stock, minStock FROM BranchInventory ORDER BY id');
  const preWhStock = await client.execute('SELECT id, quantity, minStock FROM WarehouseStock ORDER BY id');
  const preMovements = await client.execute('SELECT id, quantity, unitCost, totalCost FROM InventoryMovement ORDER BY id');
  const preOrderItems = await client.execute('SELECT id, cantidad, precioUnitario FROM PedidoItem ORDER BY id');

  console.log(`  • Producto:          ${preProducts.rows.length} registros`);
  console.log(`  • ProductoVariante:  ${preVariants.rows.length} registros`);
  console.log(`  • BranchInventory:   ${preBranchInv.rows.length} registros`);
  console.log(`  • WarehouseStock:    ${preWhStock.rows.length} registros`);
  console.log(`  • InventoryMovement: ${preMovements.rows.length} registros`);
  console.log(`  • PedidoItem:        ${preOrderItems.rows.length} registros`);

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. EJECUCIÓN DE LA MIGRACIÓN REPRODUCIBLE SOBRE dev.db
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n[PASO 3] Ejecutando migración DDL reproducible sobre dev.db:');

  await client.execute('PRAGMA foreign_keys = OFF;');

  // 3.1 WarehouseStock -> DECIMAL(18, 4)
  await client.execute(`
    CREATE TABLE new_WarehouseStock (
      id TEXT NOT NULL PRIMARY KEY,
      warehouseId TEXT NOT NULL,
      productId TEXT NOT NULL,
      variantId TEXT,
      quantity DECIMAL(18, 4) NOT NULL DEFAULT 0.0,
      minStock DECIMAL(18, 4) NOT NULL DEFAULT 0.0,
      maxStock DECIMAL(18, 4),
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL,
      CONSTRAINT WarehouseStock_warehouseId_fkey FOREIGN KEY (warehouseId) REFERENCES Warehouse (id) ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);
  await client.execute(`INSERT INTO new_WarehouseStock SELECT id, warehouseId, productId, variantId, quantity, minStock, maxStock, createdAt, updatedAt FROM WarehouseStock;`);
  await client.execute(`DROP TABLE WarehouseStock;`);
  await client.execute(`ALTER TABLE new_WarehouseStock RENAME TO WarehouseStock;`);
  await client.execute(`CREATE UNIQUE INDEX WarehouseStock_warehouseId_productId_variantId_key ON WarehouseStock (warehouseId, productId, variantId);`);
  await client.execute(`CREATE INDEX WarehouseStock_warehouseId_idx ON WarehouseStock (warehouseId);`);
  await client.execute(`CREATE INDEX WarehouseStock_productId_idx ON WarehouseStock (productId);`);
  console.log('  ✔ WarehouseStock migrado a DECIMAL(18, 4).');

  // 3.2 BranchInventory -> DECIMAL(18, 4)
  await client.execute(`
    CREATE TABLE new_BranchInventory (
      id TEXT NOT NULL PRIMARY KEY,
      branchId TEXT NOT NULL,
      productId TEXT NOT NULL,
      varianteId TEXT,
      businessId TEXT NOT NULL,
      stock DECIMAL(18, 4) NOT NULL DEFAULT 0.0,
      minStock DECIMAL(18, 4) NOT NULL DEFAULT 0.0,
      maxStock DECIMAL(18, 4),
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL,
      CONSTRAINT BranchInventory_branchId_fkey FOREIGN KEY (branchId) REFERENCES Branch (id) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT BranchInventory_productId_fkey FOREIGN KEY (productId) REFERENCES Producto (id) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT BranchInventory_businessId_fkey FOREIGN KEY (businessId) REFERENCES Negocio (id) ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);
  await client.execute(`INSERT INTO new_BranchInventory SELECT id, branchId, productId, varianteId, businessId, stock, minStock, maxStock, createdAt, updatedAt FROM BranchInventory;`);
  await client.execute(`DROP TABLE BranchInventory;`);
  await client.execute(`ALTER TABLE new_BranchInventory RENAME TO BranchInventory;`);
  await client.execute(`CREATE UNIQUE INDEX BranchInventory_branchId_productId_varianteId_key ON BranchInventory (branchId, productId, varianteId);`);
  await client.execute(`CREATE INDEX BranchInventory_branchId_idx ON BranchInventory (branchId);`);
  await client.execute(`CREATE INDEX BranchInventory_productId_idx ON BranchInventory (productId);`);
  await client.execute(`CREATE INDEX BranchInventory_businessId_idx ON BranchInventory (businessId);`);
  console.log('  ✔ BranchInventory migrado a DECIMAL(18, 4).');

  // 3.3 InventoryMovement -> DECIMAL(18, 4), DECIMAL(18, 6), DECIMAL(18, 2)
  await client.execute(`
    CREATE TABLE new_InventoryMovement (
      id TEXT NOT NULL PRIMARY KEY,
      businessId TEXT NOT NULL,
      branchId TEXT NOT NULL,
      productId TEXT NOT NULL,
      varianteId TEXT,
      quantity DECIMAL(18, 4) NOT NULL,
      type TEXT NOT NULL,
      reference TEXT,
      createdBy TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      reason TEXT,
      sourceDocId TEXT,
      sourceDocType TEXT,
      totalCost DECIMAL(18, 2),
      unitCost DECIMAL(18, 6),
      warehouseId TEXT,
      costStatus TEXT DEFAULT 'UNKNOWN',
      costSource TEXT,
      CONSTRAINT InventoryMovement_branchId_fkey FOREIGN KEY (branchId) REFERENCES Branch (id) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT InventoryMovement_businessId_fkey FOREIGN KEY (businessId) REFERENCES Negocio (id) ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);
  await client.execute(`
    INSERT INTO new_InventoryMovement (id, businessId, branchId, productId, varianteId, quantity, type, reference, createdBy, createdAt, reason, sourceDocId, sourceDocType, totalCost, unitCost, warehouseId, costStatus, costSource)
    SELECT id, businessId, branchId, productId, varianteId, quantity, type, reference, createdBy, createdAt, reason, sourceDocId, sourceDocType, totalCost, unitCost, warehouseId, 'UNKNOWN', NULL FROM InventoryMovement;
  `);
  await client.execute(`DROP TABLE InventoryMovement;`);
  await client.execute(`ALTER TABLE new_InventoryMovement RENAME TO InventoryMovement;`);
  await client.execute(`CREATE INDEX InventoryMovement_businessId_idx ON InventoryMovement (businessId);`);
  await client.execute(`CREATE INDEX InventoryMovement_branchId_idx ON InventoryMovement (branchId);`);
  await client.execute(`CREATE INDEX InventoryMovement_productId_idx ON InventoryMovement (productId);`);
  await client.execute(`CREATE INDEX InventoryMovement_createdAt_idx ON InventoryMovement (createdAt);`);
  console.log('  ✔ InventoryMovement migrado a DECIMAL(18, 4), unitCost DECIMAL(18, 6), totalCost DECIMAL(18, 2).');

  // 3.4 PedidoItem -> cantidad DECIMAL(18, 4), precioUnitario DECIMAL(18, 2)
  await client.execute(`
    CREATE TABLE new_PedidoItem (
      id TEXT NOT NULL PRIMARY KEY,
      pedidoId TEXT NOT NULL,
      productoId TEXT,
      varianteId TEXT,
      varianteNombre TEXT,
      sku TEXT,
      nombreProducto TEXT NOT NULL,
      precioUnitario DECIMAL(18, 2) NOT NULL,
      cantidad DECIMAL(18, 4) NOT NULL,
      CONSTRAINT PedidoItem_pedidoId_fkey FOREIGN KEY (pedidoId) REFERENCES Pedido (id) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT PedidoItem_productoId_fkey FOREIGN KEY (productoId) REFERENCES Producto (id) ON DELETE SET NULL ON UPDATE CASCADE
    );
  `);
  await client.execute(`INSERT INTO new_PedidoItem SELECT id, pedidoId, productoId, varianteId, varianteNombre, sku, nombreProducto, precioUnitario, cantidad FROM PedidoItem;`);
  await client.execute(`DROP TABLE PedidoItem;`);
  await client.execute(`ALTER TABLE new_PedidoItem RENAME TO PedidoItem;`);
  console.log('  ✔ PedidoItem migrado a cantidad DECIMAL(18, 4), precioUnitario DECIMAL(18, 2).');

  // 3.5 Producto -> stock DECIMAL(18, 4), costoUnitario DECIMAL(18, 6), costoPromedio DECIMAL(18, 6) NULL
  await client.execute(`
    CREATE TABLE new_Producto (
      id TEXT NOT NULL PRIMARY KEY,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      precio DECIMAL(18, 2) NOT NULL,
      imagenUrl TEXT,
      activo BOOLEAN NOT NULL DEFAULT true,
      stock DECIMAL(18, 4),
      sku TEXT,
      tieneVariantes BOOLEAN NOT NULL DEFAULT false,
      orden INTEGER NOT NULL DEFAULT 0,
      llevaEmpaque BOOLEAN NOT NULL DEFAULT true,
      precioEmpaque DECIMAL(18, 2) NOT NULL DEFAULT 0.25,
      extraInfo JSONB,
      negocioId TEXT NOT NULL,
      categoriaId TEXT,
      tipoProducto TEXT NOT NULL DEFAULT 'VENTA',
      unidadMedida TEXT NOT NULL DEFAULT 'UNIDAD',
      costoUnitario DECIMAL(18, 6) NOT NULL DEFAULT 0.0,
      metodoElaboracion TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL,
      costoPromedio DECIMAL(18, 6) DEFAULT NULL,
      costStatus TEXT DEFAULT 'UNKNOWN',
      costSource TEXT,
      unidadMedidaBase TEXT DEFAULT NULL,
      uomStatus TEXT DEFAULT 'PENDING_REVIEW',
      densidadGPerMl DECIMAL(18, 4),
      negativeStockAdjustment DECIMAL(18, 6) DEFAULT 0.0,
      CONSTRAINT Producto_negocioId_fkey FOREIGN KEY (negocioId) REFERENCES Negocio (id) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT Producto_categoriaId_fkey FOREIGN KEY (categoriaId) REFERENCES CategoriaProducto (id) ON DELETE SET NULL ON UPDATE CASCADE
    );
  `);
  await client.execute(`
    INSERT INTO new_Producto (
      id, nombre, descripcion, precio, imagenUrl, activo, stock, sku, tieneVariantes, orden, llevaEmpaque, precioEmpaque, extraInfo, negocioId, categoriaId, tipoProducto, unidadMedida, costoUnitario, metodoElaboracion, createdAt, updatedAt,
      costoPromedio, costStatus, costSource, unidadMedidaBase, uomStatus, densidadGPerMl, negativeStockAdjustment
    )
    SELECT
      id, nombre, descripcion, precio, imagenUrl, activo, stock, sku, tieneVariantes, orden, llevaEmpaque, precioEmpaque, extraInfo, negocioId, categoriaId, tipoProducto, unidadMedida, costoUnitario, metodoElaboracion, createdAt, updatedAt,
      NULL, 'UNKNOWN', NULL, NULL, 'PENDING_REVIEW', NULL, 0.0
    FROM Producto;
  `);
  await client.execute(`DROP TABLE Producto;`);
  await client.execute(`ALTER TABLE new_Producto RENAME TO Producto;`);
  await client.execute(`CREATE INDEX Producto_negocioId_idx ON Producto (negocioId);`);
  await client.execute(`CREATE INDEX Producto_categoriaId_idx ON Producto (categoriaId);`);
  console.log('  ✔ Producto migrado a stock DECIMAL(18, 4), costoPromedio DECIMAL(18, 6) NULL, uomStatus PENDING_REVIEW.');

  await client.execute('PRAGMA foreign_keys = ON;');

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. VERIFICACIÓN DE TIPOS FÍSICOS Y COMPARACIÓN 100% PRE vs POST
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n[PASO 4] Verificando tipos finales de columnas en dev.db:');
  const prodCols = (await client.execute('PRAGMA table_info(Producto)')).rows;
  const whCols = (await client.execute('PRAGMA table_info(WarehouseStock)')).rows;
  const biCols = (await client.execute('PRAGMA table_info(BranchInventory)')).rows;
  const imCols = (await client.execute('PRAGMA table_info(InventoryMovement)')).rows;
  const piCols = (await client.execute('PRAGMA table_info(PedidoItem)')).rows;

  const relevantCols = [
    { table: 'Producto', col: 'stock', type: prodCols.find(r => r.name === 'stock')?.type },
    { table: 'Producto', col: 'costoPromedio', type: prodCols.find(r => r.name === 'costoPromedio')?.type },
    { table: 'Producto', col: 'costoUnitario', type: prodCols.find(r => r.name === 'costoUnitario')?.type },
    { table: 'Producto', col: 'densidadGPerMl', type: prodCols.find(r => r.name === 'densidadGPerMl')?.type },
    { table: 'WarehouseStock', col: 'quantity', type: whCols.find(r => r.name === 'quantity')?.type },
    { table: 'BranchInventory', col: 'stock', type: biCols.find(r => r.name === 'stock')?.type },
    { table: 'InventoryMovement', col: 'quantity', type: imCols.find(r => r.name === 'quantity')?.type },
    { table: 'InventoryMovement', col: 'unitCost', type: imCols.find(r => r.name === 'unitCost')?.type },
    { table: 'InventoryMovement', col: 'totalCost', type: imCols.find(r => r.name === 'totalCost')?.type },
    { table: 'PedidoItem', col: 'cantidad', type: piCols.find(r => r.name === 'cantidad')?.type },
    { table: 'PedidoItem', col: 'precioUnitario', type: piCols.find(r => r.name === 'precioUnitario')?.type }
  ];
  console.table(relevantCols);

  for (const c of relevantCols) {
    if (String(c.type).includes('REAL') || String(c.type).includes('INTEGER') || String(c.type).includes('FLOAT')) {
      throw new Error(`Violación de tipo detectada en dev.db: ${c.table}.${c.col} es "${c.type}"`);
    }
  }
  console.log('  ✅ [PASS] Cero REAL, FLOAT o INTEGER en dev.db migrado.');

  console.log('\n[PASO 5] Comparación rigurosa de 100% de valores históricos:');
  const postProducts = await client.execute('SELECT id, nombre, stock, costoUnitario, precio, costoPromedio, costStatus, unidadMedidaBase, uomStatus FROM Producto ORDER BY id');
  const postBranchInv = await client.execute('SELECT id, stock, minStock FROM BranchInventory ORDER BY id');
  const postWhStock = await client.execute('SELECT id, quantity, minStock FROM WarehouseStock ORDER BY id');
  const postMovements = await client.execute('SELECT id, quantity, unitCost, totalCost FROM InventoryMovement ORDER BY id');
  const postOrderItems = await client.execute('SELECT id, cantidad, precioUnitario FROM PedidoItem ORDER BY id');

  let discrepancies = 0;
  for (let i = 0; i < preProducts.rows.length; i++) {
    const pre = preProducts.rows[i];
    const post = postProducts.rows[i];
    if (Number(pre.stock) !== Number(post.stock)) discrepancies++;
    if (Number(pre.costoUnitario) !== Number(post.costoUnitario)) discrepancies++;
    if (Number(pre.precio) !== Number(post.precio)) discrepancies++;
    if (post.costoPromedio !== null) discrepancies++;
    if (post.costStatus !== 'UNKNOWN') discrepancies++;
    if (post.unidadMedidaBase !== null) discrepancies++;
    if (post.uomStatus !== 'PENDING_REVIEW') discrepancies++;
  }
  for (let i = 0; i < preBranchInv.rows.length; i++) {
    if (Number(preBranchInv.rows[i].stock) !== Number(postBranchInv.rows[i].stock)) discrepancies++;
  }
  for (let i = 0; i < preWhStock.rows.length; i++) {
    if (Number(preWhStock.rows[i].quantity) !== Number(postWhStock.rows[i].quantity)) discrepancies++;
  }
  for (let i = 0; i < preMovements.rows.length; i++) {
    if (Number(preMovements.rows[i].quantity) !== Number(postMovements.rows[i].quantity)) discrepancies++;
    if (Number(preMovements.rows[i].unitCost) !== Number(postMovements.rows[i].unitCost)) discrepancies++;
    if (Number(preMovements.rows[i].totalCost) !== Number(postMovements.rows[i].totalCost)) discrepancies++;
  }
  for (let i = 0; i < preOrderItems.rows.length; i++) {
    if (Number(preOrderItems.rows[i].cantidad) !== Number(postOrderItems.rows[i].cantidad)) discrepancies++;
    if (Number(preOrderItems.rows[i].precioUnitario) !== Number(postOrderItems.rows[i].precioUnitario)) discrepancies++;
  }

  if (discrepancies === 0) {
    console.log('  ✅ [PASS] 100% de los valores históricos coinciden con exactitud matemática.');
    console.log('  ✅ [PASS] costoPromedio se mantiene en NULL.');
    console.log('  ✅ [PASS] unidadMedidaBase se mantiene en NULL.');
    console.log('  ✅ [PASS] costStatus se mantiene en UNKNOWN.');
  } else {
    throw new Error(`Se detectaron ${discrepancies} discrepancias.`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. PRUEBA REAL DE PERSISTENCIA DECIMAL (GUARDAR -> LEER -> Prisma.Decimal)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n[PASO 6] Prueba Real de Persistencia Decimal (Core + SQLite + Prisma.Decimal):');
  const testId = `persist-test-${Date.now()}`;
  const firstBusinessId = String(preProducts.rows[0].negocioId || (await client.execute('SELECT id FROM Negocio LIMIT 1')).rows[0].id);

  // Insertar valores decimales de prueba:
  // 0.4500 kg stock, 2.500000 PMP, 0.9200 densidad, 12.35 precio
  await client.execute({
    sql: `
      INSERT INTO Producto (
        id, nombre, stock, costoPromedio, densidadGPerMl, precio, negocioId, tipoProducto, unidadMedida, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `,
    args: [testId, 'Test Persistencia Decimal', '0.4500', '2.500000', '0.9200', '12.35', firstBusinessId, 'MATERIA_PRIMA', 'KG']
  });

  // Leer nuevamente desde base de datos
  const readBackRow = (await client.execute({
    sql: 'SELECT stock, costoPromedio, densidadGPerMl, precio FROM Producto WHERE id = ?',
    args: [testId]
  })).rows[0];

  const readStock = roundQty(readBackRow.stock);
  const readPmp = roundCost(readBackRow.costoPromedio);
  const readDensidad = roundQty(readBackRow.densidadGPerMl);
  const readPrecio = roundMoney(readBackRow.precio);

  console.log(`  • Stock guardado "0.4500" -> Leído: ${readStock.toString()} (${readStock.equals('0.4500') ? 'EXACTO' : 'ERROR'})`);
  console.log(`  • PMP guardado "2.500000" -> Leído: ${readPmp.toString()} (${readPmp.equals('2.500000') ? 'EXACTO' : 'ERROR'})`);
  console.log(`  • Densidad "0.9200"       -> Leído: ${readDensidad.toString()} (${readDensidad.equals('0.9200') ? 'EXACTO' : 'ERROR'})`);
  console.log(`  • Precio "$12.35"         -> Leído: ${readPrecio.toString()} (${readPrecio.equals('12.35') ? 'EXACTO' : 'ERROR'})`);

  if (
    readStock.equals('0.4500') &&
    readPmp.equals('2.500000') &&
    readDensidad.equals('0.9200') &&
    readPrecio.equals('12.35')
  ) {
    console.log('  ✅ [PASS] Persistencia Decimal bidireccional confirmada al 100%.');
  } else {
    throw new Error('Fallo en la prueba de persistencia Decimal bidireccional.');
  }

  // Limpiar registro de prueba
  await client.execute({ sql: 'DELETE FROM Producto WHERE id = ?', args: [testId] });
  console.log('  ✔ Registro de prueba eliminado limpiamente.');

  console.log('\n' + '='.repeat(95));
  console.log('   FASE 2D EJECUTADA EXITOSAMENTE EN dev.db');
  console.log('='.repeat(95));
}

main().catch(err => {
  console.error('Error en Fase 2D:', err);
  process.exit(1);
});
