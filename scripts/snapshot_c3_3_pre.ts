import { createClient } from '@libsql/client';
import * as fs from 'fs';

async function snap() {
  const c = createClient({ url: 'file:dev.db' });
  const tables = [
    'Producto',
    'ProductoVariante',
    'BranchInventory',
    'WarehouseStock',
    'InventoryMovement',
    'Recipe',
    'ProductionOrder',
    'InventoryTransfer'
  ];
  const res: Record<string, any> = {};
  for (const t of tables) {
    const r = await c.execute(`SELECT COUNT(*) as cnt FROM "${t}"`);
    res[t] = Number(r.rows[0].cnt);
  }
  fs.writeFileSync('c3_3_pre_migration_snapshot.json', JSON.stringify(res, null, 2));
  console.log('SNAPSHOT_C3_3_PRE:', JSON.stringify(res, null, 2));
}

snap().catch(console.error);
