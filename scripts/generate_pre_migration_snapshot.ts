import { createClient } from '@libsql/client';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

async function generateSnapshot() {
  const dbPath = path.join(process.cwd(), 'dev.db');
  const fileBytes = fs.readFileSync(dbPath);
  const fileSize = fileBytes.length;
  const sha256 = crypto.createHash('sha256').update(fileBytes).digest('hex').toUpperCase();

  const client = createClient({ url: `file:${dbPath}` });

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

  const counts = {
    Producto: await safeCount('Producto'),
    ProductoVariante: await safeCount('ProductoVariante'),
    BranchInventory: await safeCount('BranchInventory'),
    WarehouseStock: await safeCount('WarehouseStock'),
    InventoryMovement: await safeCount('InventoryMovement'),
    Pedido: await safeCount('Pedido'),
    PedidoItem: await safeCount('PedidoItem'),
    Recipe: await safeCount('Recipe'),
    ProductionOrder: await safeCount('ProductionOrder'),
    InventoryTransfer: await safeCount('InventoryTransfer')
  };

  const inventorySums = {
    sumProductoStock: await safeSum('SELECT SUM(stock) as s FROM Producto'),
    sumBranchInventoryStock: await safeSum('SELECT SUM(stock) as s FROM BranchInventory'),
    sumWarehouseStockQuantity: await safeSum('SELECT SUM(quantity) as s FROM WarehouseStock')
  };

  const kardexSums = {
    countMovements: await safeCount('InventoryMovement'),
    sumQuantity: await safeSum('SELECT SUM(quantity) as s FROM InventoryMovement'),
    sumTotalCost: await safeSum('SELECT SUM(totalCost) as s FROM InventoryMovement')
  };

  const orderSums = {
    countPedido: await safeCount('Pedido'),
    countPedidoItem: await safeCount('PedidoItem'),
    sumItemCantidad: await safeSum('SELECT SUM(cantidad) as s FROM PedidoItem'),
    sumItemPrecioUnitario: await safeSum('SELECT SUM(precioUnitario) as s FROM PedidoItem')
  };

  const snapshot = {
    timestamp: new Date().toISOString(),
    database: {
      file: 'dev.db',
      fileSize,
      sha256
    },
    counts,
    inventorySums,
    kardexSums,
    orderSums
  };

  fs.writeFileSync('pre_migration_snapshot.json', JSON.stringify(snapshot, null, 2), 'utf8');
  console.log('SNAPSHOT GENERADO CON ÉXITO:');
  console.log(JSON.stringify(snapshot, null, 2));
}

generateSnapshot().catch(err => {
  console.error('Error generando snapshot:', err);
  process.exit(1);
});
