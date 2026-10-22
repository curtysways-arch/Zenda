import prisma from '../src/lib/prisma';
import { InventoryEngine } from '../src/core/inventory/InventoryEngine';
import { Prisma } from '@prisma/client';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('================================================================');
  console.log('   FASE B2: PRUEBA FUNCIONAL CONTROLADA Y 100% REVERSIBLE');
  console.log('================================================================\n');

  // 1. Obtener bodega, sucursal y negocio dinámicamente
  const warehouse = await prisma.warehouse.findFirst({
    where: { branchId: { not: null } }
  });
  if (!warehouse || !warehouse.branchId) throw new Error('No se encontró bodega con sucursal en dev.db');

  const branch = await prisma.branch.findUnique({ where: { id: warehouse.branchId } });
  if (!branch) throw new Error(`No se encontró sucursal para bodega ${warehouse.id}`);

  const businessId = branch.businessId;
  console.log(`[CONTEXTO] Negocio: ${businessId}, Sucursal: ${branch.id}, Bodega: ${warehouse.id}`);

  const testProdId = `test-b2-frac-${Date.now()}`;
  let movement1Id: string | null = null;
  let movement2Id: string | null = null;

  try {
    // 2. Crear producto efímero de prueba
    console.log('[PASO 1] Creando producto efímero de prueba...');
    const producto = await prisma.producto.create({
      data: {
        id: testProdId,
        nombre: 'PRODUCTO_PRUEBA_B2_FRACCIONAL',
        precio: 10.0,
        stock: new Prisma.Decimal('0.0000'),
        unidadMedida: 'KG',
        unidadMedidaBase: 'KG',
        negocioId: businessId,
        activo: true
      }
    });
    console.log(`  ✅ Producto de prueba creado: ${producto.id}`);

    // 3. Ejecutar entrada fraccionaria +0.4500 kg
    console.log('[PASO 2] Registrando movimiento ENTRADA (+0.4500 kg)...');
    const mov1 = await InventoryEngine.recordMovement({
      businessId: businessId,
      branchId: branch.id,
      warehouseId: warehouse.id,
      productId: producto.id,
      quantity: 0.4500,
      type: 'ENTRADA',
      reason: 'Prueba funcional B2 fraccional entrada',
      createdBy: 'B2_TESTER'
    });
    movement1Id = mov1.id;
    console.log(`  ✅ Movimiento 1 creado: id=${mov1.id}, cantidad=${mov1.quantity}`);

    // Verificar stock intermedio
    const prodAfter1 = await prisma.producto.findUnique({ where: { id: producto.id } });
    const stockAfter1 = prodAfter1?.stock;
    console.log(`  🔎 Stock intermedio Producto: ${stockAfter1?.toString()}`);
    if (!stockAfter1 || !stockAfter1.equals(new Prisma.Decimal('0.4500'))) {
      throw new Error(`Stock no coincide con 0.4500. Obtenido: ${stockAfter1?.toString()}`);
    }
    console.log('  ✅ [PASS] Stock intermedio coincide exactamente con 0.4500 kg');

    // 4. Ejecutar salida fraccionaria -0.1500 kg
    console.log('[PASO 3] Registrando movimiento SALIDA (-0.1500 kg)...');
    const mov2 = await InventoryEngine.recordMovement({
      businessId: businessId,
      branchId: branch.id,
      warehouseId: warehouse.id,
      productId: producto.id,
      quantity: -0.1500,
      type: 'SALIDA',
      reason: 'Prueba funcional B2 fraccional salida',
      createdBy: 'B2_TESTER'
    });
    movement2Id = mov2.id;
    console.log(`  ✅ Movimiento 2 creado: id=${mov2.id}, cantidad=${mov2.quantity}`);

    // Verificar stock final
    const prodAfter2 = await prisma.producto.findUnique({ where: { id: producto.id } });
    const stockAfter2 = prodAfter2?.stock;
    console.log(`  🔎 Stock final Producto: ${stockAfter2?.toString()}`);
    if (!stockAfter2 || !stockAfter2.equals(new Prisma.Decimal('0.3000'))) {
      throw new Error(`Stock final no coincide con 0.3000. Obtenido: ${stockAfter2?.toString()}`);
    }
    console.log('  ✅ [PASS] Stock final coincide exactamente con 0.3000 kg (0.4500 - 0.1500)');

    // Verificar WarehouseStock
    const ws = await prisma.warehouseStock.findFirst({
      where: { warehouseId: warehouse.id, productId: producto.id }
    });
    console.log(`  🔎 WarehouseStock quantity: ${ws?.quantity.toString()}`);
    if (!ws?.quantity.equals(new Prisma.Decimal('0.3000'))) {
      throw new Error(`WarehouseStock no coincide con 0.3000. Obtenido: ${ws?.quantity.toString()}`);
    }
    console.log('  ✅ [PASS] WarehouseStock coincide exactamente con 0.3000 kg');

  } finally {
    // 5. Reversión y limpieza obligatoria 100%
    console.log('\n[PASO 4] REVERSIÓN Y LIMPIEZA COMPLETA DE REGISTROS DE PRUEBA...');
    if (movement1Id || movement2Id) {
      await prisma.inventoryMovement.deleteMany({
        where: { id: { in: [movement1Id, movement2Id].filter(Boolean) as string[] } }
      });
      console.log('  🧹 Movimientos de prueba eliminados.');
    }

    await prisma.warehouseStock.deleteMany({
      where: { productId: testProdId }
    });
    console.log('  🧹 WarehouseStock de prueba eliminado.');

    await prisma.branchInventory.deleteMany({
      where: { productId: testProdId }
    });
    console.log('  🧹 BranchInventory de prueba eliminado.');

    await prisma.producto.deleteMany({
      where: { id: testProdId }
    });
    console.log('  🧹 Producto de prueba eliminado.');

    console.log('  ✅ [PASS] Base de datos dev.db revertida al estado limpio.');
  }

  // 6. Verificar contra pre_migration_snapshot.json
  console.log('\n[PASO 5] VERIFICACIÓN CONTRA PRE-MIGRATION SNAPSHOT...');
  const snapshotRaw = fs.readFileSync(path.join(process.cwd(), 'pre_migration_snapshot.json'), 'utf8');
  const snapshot = JSON.parse(snapshotRaw);

  const currentCounts = {
    Producto: await prisma.producto.count(),
    ProductoVariante: await prisma.productoVariante.count(),
    BranchInventory: await prisma.branchInventory.count(),
    WarehouseStock: await prisma.warehouseStock.count(),
    InventoryMovement: await prisma.inventoryMovement.count(),
    Pedido: await prisma.pedido.count(),
    PedidoItem: await prisma.pedidoItem.count(),
    Recipe: await prisma.recipe.count(),
    ProductionOrder: await prisma.productionOrder.count(),
    InventoryTransfer: await prisma.inventoryTransfer.count()
  };

  let countMatches = true;
  for (const [key, val] of Object.entries(snapshot.counts)) {
    const curVal = (currentCounts as any)[key];
    if (curVal !== val) {
      console.error(`  ❌ Conteo discrepante en ${key}: snapshot=${val}, actual=${curVal}`);
      countMatches = false;
    }
  }

  if (countMatches) {
    console.log('  ✅ [PASS] Todos los conteos coinciden exactamente al 100% con el pre-migration snapshot.');
  } else {
    throw new Error('Discrepancia en conteos post-reversión');
  }

  console.log('\n================================================================');
  console.log('✅ PRUEBA FUNCIONAL REVERSIBLE Y VERIFICACIÓN POSTERIOR COMPLETADA');
  console.log('================================================================');
}

main().catch(err => {
  console.error('ERROR EN PRUEBA FUNCIONAL REVERSIBLE:', err);
  process.exit(1);
}).finally(() => prisma.$disconnect());
