import fs from 'fs';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

async function main() {
  const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15);
  const bak = `dev.db.bak_c3_4_pre_${ts}`;
  fs.copyFileSync('dev.db', bak);

  function getHash(filePath: string): string {
    const buf = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(buf).digest('hex').toUpperCase();
  }

  const hashDev = getHash('dev.db');
  const hashBak = getHash(bak);
  const size = fs.statSync('dev.db').size;

  const rawPath = `${process.cwd()}/dev.db`.replace(/\\/g, '/');
  const dbUrl = `file:///${rawPath.replace(/^[a-zA-Z]:/, (m) => m.toUpperCase())}`;
  const adapter = new PrismaLibSql({ url: dbUrl });
  const prisma = new PrismaClient({ adapter });

  const counts = {
    productos: await (prisma as any).producto.count(),
    variantes: await (prisma as any).productoVariante.count(),
    branchInventories: await (prisma as any).branchInventory.count(),
    warehouseStocks: await (prisma as any).warehouseStock.count(),
    inventoryMovements: await (prisma as any).inventoryMovement.count(),
    recipes: await (prisma as any).recipe.count(),
    productionOrders: await (prisma as any).productionOrder.count(),
    inventoryTransfers: await (prisma as any).inventoryTransfer.count(),
  };

  const snapshot = {
    timestamp: new Date().toISOString(),
    backupFile: bak,
    sha256: hashDev,
    backupSha256: hashBak,
    sizeBytes: size,
    counts,
  };

  fs.writeFileSync('c3_4_pre_migration_snapshot.json', JSON.stringify(snapshot, null, 2), 'utf-8');
  console.log('SNAPSHOT_C3_4_SUCCESS:', JSON.stringify(snapshot, null, 2));

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('ERROR in snapshot:', err);
  process.exit(1);
});
