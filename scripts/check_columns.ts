import { createClient } from '@libsql/client';

const c = createClient({ url: 'file:dev.db' });
async function check() {
  const bi = await c.execute("PRAGMA table_info(BranchInventory)");
  console.log('BranchInventory cols:', bi.rows.map(r => r.name));
  const p = await c.execute("PRAGMA table_info(Producto)");
  console.log('Producto cols:', p.rows.map(r => r.name));
}
check();
