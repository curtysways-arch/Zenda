import { createClient } from '@libsql/client';
import * as path from 'path';

async function checkSchema() {
  const dbPath = path.join(process.cwd(), 'dev.db');
  const client = createClient({ url: `file:${dbPath}` });

  const tables = ['Producto', 'BranchInventory', 'WarehouseStock', 'InventoryMovement', 'PedidoItem'];
  
  console.log('ESTRUCTURA FÍSICA ACTUAL EN dev.db:');
  for (const table of tables) {
    const res = await client.execute(`PRAGMA table_info("${table}")`);
    console.log(`\n--- Tabla ${table} ---`);
    for (const row of res.rows) {
      const name = String(row.name);
      const type = String(row.type);
      if (
        name.includes('stock') ||
        name.includes('cantidad') ||
        name.includes('quantity') ||
        name.includes('costo') ||
        name.includes('precio') ||
        name.includes('total') ||
        name.includes('densidad') ||
        name.includes('uom') ||
        name.includes('costStatus')
      ) {
        console.log(`  ${name.padEnd(25)}: ${type}`);
      }
    }
  }
}

checkSchema().catch(console.error);
