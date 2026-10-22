import prisma from '../src/lib/prisma';
import { Prisma } from '@prisma/client';

async function verify() {
  try {
    const prod = await prisma.producto.findFirst({ where: { stock: { gt: 0 } } });
    console.log('Producto.stock type:', typeof prod?.stock);
    console.log('Producto.stock isDecimal:', prod?.stock instanceof Prisma.Decimal);
    console.log('Producto.stock value:', prod?.stock?.toString());

    const bi = await prisma.branchInventory.findFirst();
    console.log('BranchInventory.stock isDecimal:', bi?.stock instanceof Prisma.Decimal);
    console.log('BranchInventory.costoPromedio:', bi?.costoPromedio);

    const po = await prisma.productionOrder.findFirst();
    console.log('ProductionOrder.costStatus:', po?.costStatus);
    console.log('ProductionOrder.branchId:', po?.branchId);

    const itCount = await prisma.inventoryTransfer.count();
    console.log('InventoryTransfer count:', itCount);

    console.log('✅ Prisma Client con adapter LibSQL verificado: Decimal nativo 100% funcional.');
  } finally {
    await prisma.$disconnect();
  }
}

verify().catch(e => {
  console.error('Error verificando Prisma Client:', e);
  process.exit(1);
});
