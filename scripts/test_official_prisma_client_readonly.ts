import prisma from '../src/lib/prisma';
import { Prisma } from '@prisma/client';

async function main() {
  console.log('--- VALIDACIÓN READ-ONLY CON CLIENTE PRISMA OFICIAL (src/lib/prisma.ts) ---');

  try {
    // 1. Validar Producto y campos Decimal
    const productos = await prisma.producto.findMany({ take: 10 });
    console.log(`[OK] Leídos ${productos.length} productos con @prisma/client.`);
    let nonNullCostoPromedioCount = 0;
    for (const p of productos) {
      if (!(p.stock instanceof Prisma.Decimal)) {
        throw new Error(`Producto ${p.id}: stock (${p.stock}) no es instancia de Prisma.Decimal. Tipo: ${typeof p.stock}`);
      }
      if (p.costoPromedio !== null) {
        if (!(p.costoPromedio instanceof Prisma.Decimal)) {
          throw new Error(`Producto ${p.id}: costoPromedio (${p.costoPromedio}) no es instancia de Prisma.Decimal. Tipo: ${typeof p.costoPromedio}`);
        }
        nonNullCostoPromedioCount++;
      }
      console.log(`  - Producto #${p.id} (${p.nombre}): stock=${p.stock.toString()}, costoPromedio=${p.costoPromedio ? p.costoPromedio.toString() : 'NULL'}, precio=${p.precio}`);
    }
    console.log(`[OK] Producto: stock es Prisma.Decimal. costoPromedio (${nonNullCostoPromedioCount} no nulos) es Prisma.Decimal.`);

    // 2. Validar BranchInventory
    const branchInvs = await prisma.branchInventory.findMany({ take: 10 });
    console.log(`[OK] Leídos ${branchInvs.length} registros BranchInventory.`);
    for (const bi of branchInvs) {
      if (!(bi.stock instanceof Prisma.Decimal)) {
        throw new Error(`BranchInventory ${bi.id}: stock no es Prisma.Decimal`);
      }
      console.log(`  - BranchInventory #${bi.id}: stock=${bi.stock.toString()}`);
    }
    console.log('[OK] BranchInventory.stock es Prisma.Decimal.');

    // 3. Validar WarehouseStock
    const whStocks = await prisma.warehouseStock.findMany({ take: 10 });
    console.log(`[OK] Leídos ${whStocks.length} registros WarehouseStock.`);
    for (const ws of whStocks) {
      if (!(ws.quantity instanceof Prisma.Decimal)) {
        throw new Error(`WarehouseStock ${ws.id}: quantity no es Prisma.Decimal`);
      }
      console.log(`  - WarehouseStock #${ws.id}: quantity=${ws.quantity.toString()}`);
    }
    console.log('[OK] WarehouseStock.quantity es Prisma.Decimal.');

    // 4. Validar InventoryMovement
    const moves = await prisma.inventoryMovement.findMany({ take: 10 });
    console.log(`[OK] Leídos ${moves.length} registros InventoryMovement.`);
    for (const m of moves) {
      if (!(m.quantity instanceof Prisma.Decimal)) {
        throw new Error(`InventoryMovement ${m.id}: quantity no es Prisma.Decimal`);
      }
      if (m.unitCost !== null && !(m.unitCost instanceof Prisma.Decimal)) {
        throw new Error(`InventoryMovement ${m.id}: unitCost no es Prisma.Decimal`);
      }
      if (m.totalCost !== null && typeof m.totalCost !== 'number') {
        throw new Error(`InventoryMovement ${m.id}: totalCost no es number`);
      }
      console.log(`  - Movement #${m.id}: type=${m.type}, qty=${m.quantity.toString()}, unitCost=${m.unitCost ? m.unitCost.toString() : 'NULL'}, totalCost=${m.totalCost}`);
    }
    console.log('[OK] InventoryMovement quantity y unitCost son Prisma.Decimal.');

    // 5. Validar PedidoItem
    const pedidoItems = await prisma.pedidoItem.findMany({ take: 10 });
    console.log(`[OK] Leídos ${pedidoItems.length} registros PedidoItem.`);
    for (const pi of pedidoItems) {
      if (!(pi.cantidad instanceof Prisma.Decimal)) {
        throw new Error(`PedidoItem ${pi.id}: cantidad no es Prisma.Decimal`);
      }
      if (!(pi.precioUnitario instanceof Prisma.Decimal)) {
        throw new Error(`PedidoItem ${pi.id}: precioUnitario no es Prisma.Decimal`);
      }
      console.log(`  - PedidoItem #${pi.id}: cant=${pi.cantidad.toString()}, unit=${pi.precioUnitario.toString()}`);
    }
    console.log('[OK] PedidoItem cantidad y precioUnitario son Prisma.Decimal.');

    console.log('\n================================================================');
    console.log('✅ VALIDACIÓN READ-ONLY EXITOSA AL 100% CON CLIENTE PRISMA OFICIAL');
    console.log('================================================================');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(err => {
  console.error('ERROR EN VALIDACIÓN READ-ONLY:', err);
  process.exit(1);
});
