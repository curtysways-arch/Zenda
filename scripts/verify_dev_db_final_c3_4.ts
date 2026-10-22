import fs from 'fs';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

async function main() {
  const buf = fs.readFileSync('dev.db');
  const hash = crypto.createHash('sha256').update(buf).digest('hex').toUpperCase();
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

  console.log('FINAL_VERIFICATION_DEV_DB:');
  console.log('SHA256:', hash);
  console.log('SIZE_BYTES:', size);
  console.log('COUNTS:', JSON.stringify(counts, null, 2));

  const expectedHash = '190B1EDDA51E135A09D2EAFD74503B3A32AEC55B549F6D7582C9780043DA32D3';
  if (hash === expectedHash) {
    console.log('INTEGRITY_CHECK: 100% BIT-BY-BIT IDENTICAL (PASS)');
  } else {
    console.error('INTEGRITY_CHECK: MISMATCH!');
    process.exit(1);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('ERROR in verification:', err);
  process.exit(1);
});
