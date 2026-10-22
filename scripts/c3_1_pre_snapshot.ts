import fs from 'fs';
import crypto from 'crypto';
import prisma from '../src/lib/prisma';

async function snapshot() {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const ts = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const backupName = `dev.db.bak_c3_1_pre_${ts}`;
    
    // Copy
    fs.copyFileSync('dev.db', backupName);
    
    const buf = fs.readFileSync('dev.db');
    const hash = crypto.createHash('sha256').update(buf).digest('hex').toUpperCase();
    
    const pCount = await (prisma as any).producto.count();
    const pvCount = await (prisma as any).productoVariante.count();
    const biCount = await (prisma as any).branchInventory.count();
    const wsCount = await (prisma as any).warehouseStock.count();
    const imCount = await (prisma as any).inventoryMovement.count();
    const rcCount = await (prisma as any).recipe.count();
    const poCount = await (prisma as any).productionOrder.count();
    const itCount = await (prisma as any).inventoryTransfer.count();
    
    const pStock = await (prisma as any).producto.aggregate({ _sum: { stock: true } });
    const biStock = await (prisma as any).branchInventory.aggregate({ _sum: { stock: true } });
    const wsStock = await (prisma as any).warehouseStock.aggregate({ _sum: { quantity: true } });
    const imQty = await (prisma as any).inventoryMovement.aggregate({ _sum: { quantity: true } });

    const info = {
        backupName,
        size: buf.length,
        sha256: hash,
        counts: {
            producto: pCount,
            productoVariante: pvCount,
            branchInventory: biCount,
            warehouseStock: wsCount,
            inventoryMovement: imCount,
            recipe: rcCount,
            productionOrder: poCount,
            inventoryTransfer: itCount
        },
        sums: {
            productoStock: pStock._sum.stock?.toString() || '0',
            branchInventoryStock: biStock._sum.stock?.toString() || '0',
            warehouseStockQty: wsStock._sum.quantity?.toString() || '0',
            inventoryMovementQty: imQty._sum.quantity?.toString() || '0'
        }
    };
    
    fs.writeFileSync('c3_1_pre_migration_snapshot.json', JSON.stringify(info, null, 2));
    console.log(JSON.stringify(info, null, 2));
}

snapshot()
    .then(() => (prisma as any).$disconnect())
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
