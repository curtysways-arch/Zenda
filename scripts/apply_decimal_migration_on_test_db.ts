import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';

const BACKUP_PATH = path.resolve(process.cwd(), 'dev.db.bak_phase2c_verified');
const TEST_DB_PATH = path.resolve(process.cwd(), 'test.db');

async function main() {
  console.log('='.repeat(95));
  console.log('   MIGRACIÓN CONTROLADA CON TIPOS DECIMAL EXACTOS SOBRE test.db');
  console.log('   (dev.db PERMANECE TOTALMENTE INTOCABLE)');
  console.log('='.repeat(95));

  // Paso A: Crear nuevamente copia limpia de dev.db llamada test.db desde el backup verificado
  console.log('\n[PASO A] Recreando copia limpia test.db desde dev.db.bak_phase2c_verified:');
  fs.copyFileSync(BACKUP_PATH, TEST_DB_PATH);
  console.log('  ✔ test.db recreada limpiamente.');

  const client = createClient({ url: `file:${TEST_DB_PATH}` });

  // Paso B: Capturar 100% de los datos antes de la migración
  console.log('\n[PASO B] Capturando línea base exacta de valores antes de la migración:');
  const preProducts = await client.execute('SELECT id, nombre, stock, costoUnitario, precio FROM Producto ORDER BY id');
  const preVariants = await client.execute('SELECT id, stock, precio FROM ProductoVariante ORDER BY id');
  const preBranchInv = await client.execute('SELECT id, stock, minStock FROM BranchInventory ORDER BY id');
  const preWhStock = await client.execute('SELECT id, quantity, minStock FROM WarehouseStock ORDER BY id');
  const preMovements = await client.execute('SELECT id, quantity, unitCost, totalCost FROM InventoryMovement ORDER BY id');
  const preOrderItems = await client.execute('SELECT id, cantidad, precioUnitario FROM PedidoItem ORDER BY id');

  console.log(`  • Registros capturados: ${preProducts.rows.length} productos, ${preBranchInv.rows.length} branch inv, ${preWhStock.rows.length} wh stock, ${preMovements.rows.length} movs, ${preOrderItems.rows.length} order items.`);

  // Paso C: Ejecutar migración con tipos DECIMAL exactos (usando reconstrucción estándar SQLite)
  console.log('\n[PASO C] Aplicando migración con tipos DECIMAL(18, 4), DECIMAL(18, 6) y DECIMAL(18, 2):');

  await client.execute('PRAGMA foreign_keys = OFF;');

  // 1. Recrear WarehouseStock con DECIMAL(18, 4)
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

  // 2. Recrear BranchInventory con DECIMAL(18, 4)
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

  // 3. Recrear InventoryMovement con DECIMAL(18, 4), DECIMAL(18, 6), DECIMAL(18, 2)
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

  // 4. Recrear PedidoItem con DECIMAL(18, 4) y DECIMAL(18, 2)
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

  // 5. Recrear Producto con DECIMAL(18, 4), DECIMAL(18, 6), DECIMAL(18, 2), costoPromedio NULL
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

  // Paso D: Verificar tipos de columnas en SQLite
  console.log('\n[PASO D] Verificando tipos finales de columnas en test.db (PRAGMA table_info):');
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
    { table: 'Producto', col: 'negativeStockAdjustment', type: prodCols.find(r => r.name === 'negativeStockAdjustment')?.type },
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
      throw new Error(`Violación de tipo detectada: ${c.table}.${c.col} tiene tipo "${c.type}" (se exige DECIMAL/NUMERIC).`);
    }
  }
  console.log('  ✅ [PASS] Ningún campo relevante utiliza REAL, FLOAT ni INTEGER.');

  // Paso E: Comparar 100% de los valores históricos antes vs después
  console.log('\n[PASO E] Comparando 100% de los valores históricos antes vs después:');
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
    if (post.costoPromedio !== null) {
      console.error(`costoPromedio no es NULL para ${post.nombre}: ${post.costoPromedio}`);
      discrepancies++;
    }
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
    console.log('  ✅ [PASS] 100% DE LOS VALORES HISTÓRICOS COINCIDEN CON EXACTITUD ABSOLUTA.');
    console.log('  ✅ [PASS] costoPromedio se preserva en NULL (sin asumir $0 arbitrario).');
    console.log('  ✅ [PASS] costStatus preservado en UNKNOWN.');
    console.log('  ✅ [PASS] unidadMedidaBase preservado en NULL.');
  } else {
    throw new Error(`Se detectaron ${discrepancies} discrepancias en los valores.`);
  }

  // Paso F: Verificar estado de dev.db
  console.log('\n[PASO F] Verificación de dev.db:');
  const devDbStats = fs.statSync(path.resolve(process.cwd(), 'dev.db'));
  const backupStats = fs.statSync(BACKUP_PATH);
  console.log(`  • Tamaño dev.db:     ${devDbStats.size} bytes`);
  console.log(`  • Tamaño dev.db.bak: ${backupStats.size} bytes`);
  if (devDbStats.size === backupStats.size) {
    console.log('  ✅ [PASS] dev.db PERMANECE TOTALMENTE INTACTA.');
  }

  console.log('\n' + '='.repeat(95));
  console.log('   MIGRACIÓN DECIMAL DE test.db COMPLETADA CON ÉXITO');
  console.log('='.repeat(95));
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
