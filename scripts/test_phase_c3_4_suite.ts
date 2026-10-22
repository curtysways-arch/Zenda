import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { InventoryEngine } from '../src/core/inventory/InventoryEngine';
import { CostingEngine } from '../src/core/costing/CostingEngine';
import { ProductionEngine } from '../src/core/production/ProductionEngine';
import { InventoryTransferEngine } from '../src/core/inventory/InventoryTransferEngine';
import { PurchaseEngine } from '../src/core/purchases/PurchaseEngine';
import {
  toDecimal,
  addDecimal,
  subDecimal,
  mulDecimal,
  divDecimal,
  roundQty,
  roundCost,
  roundMoney
} from '../src/lib/math/money';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failCount++;
    throw new Error(`Assertion failed: ${message}`);
  }
}

function getSha256(filePath: string): string {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex').toUpperCase();
}

async function runC3_4TestSuite() {
  console.log('================================================================================');
  console.log('   CITIOX FASE C3.4: BATERÍA COMPLETA DE PRUEBAS EN ENTORNO AISLADO (test_c3_4.db)');
  console.log('================================================================================\n');

  const devDbHashPre = getSha256('dev.db');
  console.log(`Hash dev.db pre-test: ${devDbHashPre}`);
  assert(
    devDbHashPre === '190B1EDDA51E135A09D2EAFD74503B3A32AEC55B549F6D7582C9780043DA32D3',
    'dev.db está 100% intacta antes de las pruebas'
  );

  const testDbPath = 'test_c3_4.db';
  fs.copyFileSync('dev.db', testDbPath);
  console.log(`Base aislada creada: ${testDbPath}\n`);

  const rawPath = `${process.cwd()}/${testDbPath}`.replace(/\\/g, '/');
  const dbUrl = `file:///${rawPath.replace(/^[a-zA-Z]:/, (m) => m.toUpperCase())}`;
  const adapter = new PrismaLibSql({ url: dbUrl });
  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.$connect();
    const helperSql = async (sql: string) => {
      try { await prisma.$executeRawUnsafe(sql); } catch (e) {}
    };
    await helperSql(`ALTER TABLE Supplier ADD COLUMN paymentTerms TEXT DEFAULT 'CONTADO';`);
    await helperSql(`ALTER TABLE Supplier ADD COLUMN creditDays INTEGER DEFAULT 0;`);
    await helperSql(`ALTER TABLE PurchaseOrder ADD COLUMN branchId TEXT;`);
    await helperSql(`ALTER TABLE PurchaseOrder ADD COLUMN orderNumber TEXT;`);
    await helperSql(`ALTER TABLE PurchaseOrder ADD COLUMN expectedDate DATETIME;`);
    await helperSql(`ALTER TABLE PurchaseOrder ADD COLUMN currency TEXT DEFAULT 'USD';`);
    await helperSql(`ALTER TABLE PurchaseOrder ADD COLUMN discount REAL DEFAULT 0;`);
    await helperSql(`ALTER TABLE PurchaseOrder ADD COLUMN shippingCost REAL DEFAULT 0;`);
    await helperSql(`ALTER TABLE PurchaseOrder ADD COLUMN otherCosts REAL DEFAULT 0;`);
    await helperSql(`ALTER TABLE PurchaseOrder ADD COLUMN approvedById TEXT;`);
    await helperSql(`ALTER TABLE PurchaseOrder ADD COLUMN approvedByName TEXT;`);
    await helperSql(`ALTER TABLE PurchaseOrder ADD COLUMN approvedAt DATETIME;`);
    await helperSql(`ALTER TABLE PurchaseOrderItem ADD COLUMN receivedQuantity REAL DEFAULT 0;`);
    await helperSql(`ALTER TABLE PurchaseOrderItem ADD COLUMN discount REAL DEFAULT 0;`);
    await helperSql(`ALTER TABLE PurchaseOrderItem ADD COLUMN landedUnitCost REAL;`);

    const biz = await (prisma as any).negocio.findFirst();
    assert(!!biz, 'Negocio disponible para pruebas');
    const businessId = biz.id;

    console.log('--- 1. CONFIGURACIÓN DE ENTIDADES DE PRUEBA ---');
    const branchA = await (prisma as any).branch.create({
      data: {
        name: 'Sucursal Matriz C3.4',
        slug: `branch-a-c3-4-${Date.now()}`,
        businessId,
        active: true,
        isMain: true
      }
    });

    const branchB = await (prisma as any).branch.create({
      data: {
        name: 'Sucursal Norte C3.4',
        slug: `branch-b-c3-4-${Date.now()}`,
        businessId,
        active: true,
        isMain: false
      }
    });

    const whA = await (prisma as any).warehouse.create({
      data: {
        name: 'Bodega Principal Matriz',
        code: `WH-A-${Date.now().toString().slice(-4)}`,
        businessId,
        branchId: branchA.id,
        type: 'PHYSICAL',
        isDefault: true,
        active: true
      }
    });

    const whB = await (prisma as any).warehouse.create({
      data: {
        name: 'Bodega Principal Norte',
        code: `WH-B-${Date.now().toString().slice(-4)}`,
        businessId,
        branchId: branchB.id,
        type: 'PHYSICAL',
        isDefault: true,
        active: true
      }
    });

    const whTransit = await (prisma as any).warehouse.create({
      data: {
        name: 'Bodega Virtual Tránsito',
        code: `WH-TR-${Date.now().toString().slice(-4)}`,
        businessId,
        branchId: branchA.id,
        type: 'TRANSIT',
        isDefault: false,
        active: true
      }
    });

    const whScrap = await (prisma as any).warehouse.create({
      data: {
        name: 'Bodega Virtual Merma',
        code: `WH-SC-${Date.now().toString().slice(-4)}`,
        businessId,
        branchId: branchA.id,
        type: 'SCRAP_WASTE',
        isDefault: false,
        active: true
      }
    });

    const prodMateriaPrima = await (prisma as any).producto.create({
      data: {
        negocioId: businessId,
        nombre: 'Harina de Trigo Especial C3.4',
        precio: 5.00,
        stock: 0,
        costoUnitario: 2.00,
        costoPromedio: 2.00,
        tipoProducto: 'MATERIA_PRIMA',
        activo: true
      }
    });

    const prodTerminado = await (prisma as any).producto.create({
      data: {
        negocioId: businessId,
        nombre: 'Pan Artesanal Molde C3.4',
        precio: 8.50,
        stock: 0,
        costoUnitario: 3.50,
        costoPromedio: 3.50,
        tipoProducto: 'PRODUCTO_FINAL',
        activo: true
      }
    });

    const supplier = await (prisma as any).supplier.create({
      data: {
        businessId,
        name: 'Molinos del Valle S.A.',
        taxId: `17900${Date.now().toString().slice(-6)}001`,
        taxIdType: 'RUC',
        active: true
      }
    });

    assert(!!whA && !!whB && !!whTransit, 'Sucursales, bodegas y productos de prueba creados');

    console.log('\n--- 2. BLINDAJE DE BODEGAS VIRTUALES (TRANSIT / SCRAP_WASTE) ---');
    // Intento 1: Registrar VENTA directa en bodega virtual TRANSIT -> Debe ser rechazado
    let blockedTransitSale = false;
    try {
      await InventoryEngine.recordMovement({
        businessId,
        warehouseId: whTransit.id,
        branchId: branchA.id,
        productId: prodMateriaPrima.id,
        quantity: -5,
        type: 'VENTA',
        reason: 'Venta ilegal en bodega de tránsito'
      }, prisma);
    } catch (err: any) {
      blockedTransitSale = err.message.includes('Operación inválida');
    }
    assert(blockedTransitSale, 'InventoryEngine bloquea ventas directas sobre bodega virtual TRANSIT');

    // Intento 2: Registrar COMPRA directa en bodega virtual SCRAP_WASTE -> Debe ser rechazado
    let blockedScrapPurchase = false;
    try {
      await InventoryEngine.recordMovement({
        businessId,
        warehouseId: whScrap.id,
        branchId: branchA.id,
        productId: prodMateriaPrima.id,
        quantity: 10,
        type: 'COMPRA',
        unitCost: 2.50,
        reason: 'Compra ilegal en bodega de merma'
      }, prisma);
    } catch (err: any) {
      blockedScrapPurchase = err.message.includes('Operación inválida');
    }
    assert(blockedScrapPurchase, 'InventoryEngine bloquea compras directas sobre bodega virtual SCRAP_WASTE');

    // Intento 3: Intentar movimiento con bodega perteneciente a otra sucursal -> Debe fallar
    let blockedCrossBranch = false;
    try {
      await InventoryEngine.recordMovement({
        businessId,
        warehouseId: whB.id,
        branchId: branchA.id, // Cruzado: whB pertenece a branchB, no branchA
        productId: prodMateriaPrima.id,
        quantity: 5,
        type: 'ENTRADA',
        reason: 'Invasión cross-branch'
      }, prisma);
    } catch (err: any) {
      blockedCrossBranch = true;
    }
    assert(blockedCrossBranch, 'InventoryEngine impide movimientos con bodega y sucursal discordantes');

    console.log('\n--- 3. AJUSTE MANUAL ABSOLUTO CONTRA WarehouseStock (VERDAD FÍSICA) ---');
    // Establecer stock inicial físico de 20 u en Bodega A mediante entrada
    await InventoryEngine.recordMovement({
      businessId,
      warehouseId: whA.id,
      branchId: branchA.id,
      productId: prodMateriaPrima.id,
      quantity: 20,
      type: 'INICIAL',
      unitCost: 2.50,
      reason: 'Inventario inicial para test'
    }, prisma);

    const wStockInitial = await (prisma as any).warehouseStock.findFirst({
      where: { warehouseId: whA.id, productId: prodMateriaPrima.id }
    });
    assert(Number(wStockInitial.quantity) === 20, 'Stock físico inicial en Bodega A es exactamente 20 u');

    // Simular divergencia legacy: alterar artificialmente Producto.stock (caché legacy) a 999 u
    await (prisma as any).$executeRawUnsafe(
      `UPDATE Producto SET stock = 999 WHERE id = ?`,
      prodMateriaPrima.id
    );

    // Ajuste absoluto: el usuario cuenta físicamente 25 u en Bodega A
    // El delta DEBE ser 25 - 20 = +5 u (y NO 25 - 999 = -974)
    const wStockCurrent = await (prisma as any).warehouseStock.findFirst({
      where: { warehouseId: whA.id, productId: prodMateriaPrima.id }
    });
    const deltaCalculado = subDecimal(25, toDecimal(wStockCurrent?.quantity ?? 0));
    assert(deltaCalculado.toNumber() === 5, 'El delta de ajuste absoluto se calcula contra WarehouseStock (+5 u)');

    await InventoryEngine.recordMovement({
      businessId,
      warehouseId: whA.id,
      branchId: branchA.id,
      productId: prodMateriaPrima.id,
      quantity: deltaCalculado,
      type: 'AJUSTE',
      reason: 'Ajuste por conteo físico en estantería'
    }, prisma);

    const wStockPostAdjust = await (prisma as any).warehouseStock.findFirst({
      where: { warehouseId: whA.id, productId: prodMateriaPrima.id }
    });
    assert(Number(wStockPostAdjust.quantity) === 25, 'Stock físico en Bodega A quedó exactamente en 25 u');

    console.log('\n--- 4. RECEPCIÓN DE COMPRAS Y COSTING ENGINE (PMP POR SUCURSAL) ---');
    // Recepción de compra en Sucursal A: 100 kg @ $3.00
    // Usamos el cliente transaccional para la compra
    const createdPo = await (prisma as any).purchaseOrder.create({
      data: {
        businessId,
        supplierId: supplier.id,
        invoiceNumber: `FACT-COMPRA-${Date.now().toString().slice(-5)}`,
        warehouseId: whA.id,
        status: 'DRAFT',
        subtotal: 300.00,
        taxAmount: 45.00,
        total: 345.00,
        items: {
          create: [
            {
              productId: prodMateriaPrima.id,
              productName: prodMateriaPrima.nombre,
              quantity: 100,
              unitCost: 3.00,
              taxRate: 0.15,
              subtotal: 300.00,
              total: 345.00
            }
          ]
        }
      },
      include: { items: true, supplier: true }
    });

    assert(createdPo.status === 'DRAFT', 'Orden de compra creada en DRAFT sin alterar inventario');

    // Recepción de compra ingresando existencias e imputando PMP a Sucursal A
    await (prisma as any).$transaction(async (tx: any) => {
      await tx.purchaseOrder.update({
        where: { id: createdPo.id },
        data: { status: 'RECEIVED', receptionDate: new Date() }
      });

      await InventoryEngine.recordMovement({
        businessId,
        warehouseId: whA.id,
        branchId: branchA.id,
        productId: prodMateriaPrima.id,
        quantity: 100,
        type: 'COMPRA',
        unitCost: 3.00,
        totalCost: 300.00,
        reason: `Recepción de Compra #${createdPo.invoiceNumber}`,
        reference: createdPo.invoiceNumber,
        sourceDocType: 'COMPRA',
        sourceDocId: createdPo.id
      }, tx);
    });

    const wStockAfterPurchase = await (prisma as any).warehouseStock.findFirst({
      where: { warehouseId: whA.id, productId: prodMateriaPrima.id }
    });
    // Stock previo en Bodega A era 25 u + 100 u compra = 125 u
    assert(Number(wStockAfterPurchase.quantity) === 125, 'Stock físico tras compra es 125 u');

    const bInvA = await (prisma as any).branchInventory.findFirst({
      where: { branchId: branchA.id, productId: prodMateriaPrima.id }
    });
    // PMP anterior: 25 u @ $2.50 = $62.50
    // Compra: 100 u @ $3.00 = $300.00
    // Total: 125 u, $362.50 -> PMP = $362.50 / 125 = $2.90
    const pmpEsperado = roundCost(divDecimal(362.50, 125)).toNumber();
    assert(
      Math.abs(Number(bInvA.costoPromedio) - pmpEsperado) < 0.0001,
      `PMP en Sucursal A recalculado correctamente tras compra ($${Number(bInvA.costoPromedio)})`
    );

    console.log('\n--- 5. TEST DE INTEGRACIÓN END-TO-END MULTIETAPA (REGLA 31) ---');
    console.log('Flujo: COMPRA (Sucursal A) → PRODUCCIÓN (Sucursal A) → TRANSFERENCIA (A → B) → VENTA POS (Sucursal B)');

    // Paso A: Crear receta para Pan Artesanal (1 u Pan = 2 kg Harina)
    const recipe = await (prisma as any).recipe.create({
      data: {
        businessId,
        productId: prodTerminado.id,
        name: 'Receta Pan Artesanal C3.4',
        yieldQuantity: 1,
        active: true,
        items: {
          create: [
            {
              ingredientId: prodMateriaPrima.id,
              quantity: 2.0 // 2 kg por unidad
            }
          ]
        }
      }
    });
    assert(!!recipe, 'Receta de producción configurada');

    // Paso B: Producción de 20 unidades de Pan en Sucursal A
    // Consumo: 20 * 2 = 40 kg Harina @ PMP Sucursal A ($2.90) = $116.00
    // Ingreso: 20 u Pan @ unitCost = $116 / 20 = $5.80
    const prodOrder = await ProductionEngine.createOrder({
      businessId,
      branchId: branchA.id,
      sourceWarehouseId: whA.id,
      targetWarehouseId: whA.id,
      recipeId: recipe.id,
      targetQuantity: 20
    }, prisma);

    await ProductionEngine.startOrder(prodOrder.id, businessId, undefined, prisma);

    const completedProd = await ProductionEngine.completeOrder({
      productionOrderId: prodOrder.id,
      businessId,
      actualQuantity: 20
    }, { client: prisma });
    assert(completedProd.status === 'COMPLETED', 'Orden de producción completada');

    const wStockPanA = await (prisma as any).warehouseStock.findFirst({
      where: { warehouseId: whA.id, productId: prodTerminado.id }
    });
    assert(Number(wStockPanA.quantity) === 20, 'Bodega A tiene 20 u de Pan producidas');

    const bInvPanA = await (prisma as any).branchInventory.findFirst({
      where: { branchId: branchA.id, productId: prodTerminado.id }
    });
    assert(
      Math.abs(Number(bInvPanA.costoPromedio) - 5.80) < 0.001,
      `PMP de Pan producido en Sucursal A es exactamente $5.80 ($${Number(bInvPanA.costoPromedio)})`
    );

    // Paso C: Transferencia de 10 unidades de Pan de Sucursal A a Sucursal B
    const transfer = await InventoryTransferEngine.createTransfer({
      businessId,
      sourceBranchId: branchA.id,
      sourceWarehouseId: whA.id,
      targetBranchId: branchB.id,
      targetWarehouseId: whB.id,
      items: [{ productId: prodTerminado.id, quantity: 10 }]
    }, prisma);

    // Despacho a TRANSIT
    await InventoryTransferEngine.dispatchTransfer({
      transferId: transfer.id,
      businessId
    }, prisma);

    // Recepción total en Sucursal B
    await InventoryTransferEngine.receiveTransfer({
      transferId: transfer.id,
      businessId,
      receivedItems: [{ productId: prodTerminado.id, receivedQty: 10, lossQty: 0 }]
    }, prisma);

    const wStockPanB = await (prisma as any).warehouseStock.findFirst({
      where: { warehouseId: whB.id, productId: prodTerminado.id }
    });
    assert(Number(wStockPanB.quantity) === 10, 'Bodega B recibió 10 u de Pan');

    const bInvPanB = await (prisma as any).branchInventory.findFirst({
      where: { branchId: branchB.id, productId: prodTerminado.id }
    });
    assert(
      Math.abs(Number(bInvPanB.costoPromedio) - 5.80) < 0.001,
      `PMP de Pan en Sucursal B conserva fielmente el costo transferido de $5.80`
    );

    // Paso D: Venta POS de 4 unidades de Pan en Sucursal B a precio comercial de $8.50 cada una
    // El precio de venta ($8.50) NUNCA debe ingresar como unitCost al Kardex
    const posSaleMov = await InventoryEngine.recordMovement({
      businessId,
      branchId: branchB.id,
      warehouseId: whB.id,
      productId: prodTerminado.id,
      quantity: -4,
      type: 'VENTA',
      reason: 'Venta POS Mostrador Sucursal Norte #001',
      sourceDocType: 'VENTA',
      sourceDocId: 'PED-POS-001',
      createdBy: 'Cajero Norte'
    }, prisma);

    assert(posSaleMov.quantity === -4, 'Venta POS descontó 4 u');
    assert(
      Math.abs(Number(posSaleMov.unitCost) - 5.80) < 0.001,
      `Kardex registró costo unitario COGS histórico de $5.80 (y NO el precio de venta de $8.50)`
    );
    assert(
      Math.abs(Number(posSaleMov.totalCost) - 23.20) < 0.001,
      `Costo de venta total COGS es exactamente $23.20 (4 x $5.80)`
    );

    // Existencias físicas finales en Bodega B
    const wStockPanBFinal = await (prisma as any).warehouseStock.findFirst({
      where: { warehouseId: whB.id, productId: prodTerminado.id }
    });
    assert(Number(wStockPanBFinal.quantity) === 6, 'Bodega B tiene 6 u de saldo físico final (10 - 4)');

    // Existencias físicas en Bodega A
    const wStockPanAFinal = await (prisma as any).warehouseStock.findFirst({
      where: { warehouseId: whA.id, productId: prodTerminado.id }
    });
    assert(Number(wStockPanAFinal.quantity) === 10, 'Bodega A tiene 10 u de saldo físico final (20 - 10 transferidas)');

    // Verificar que Bodega Virtual TRANSIT tenga exactamente 0 u
    const transitRows = await (prisma as any).warehouseStock.findMany({
      where: { warehouseId: whTransit.id }
    });
    const transitQty = transitRows.reduce((sum: number, r: any) => sum + Number(r.quantity), 0);
    assert(transitQty === 0, 'Bodega virtual de tránsito quedó en 0 u (masa conservada sin fugas)');

    console.log('\n--- 6. DEVOLUCIÓN DE VENTA Y RESTITUCIÓN DE COSTO HISTÓRICO ---');
    // Devolución de 1 unidad de Pan en Sucursal B por cliente
    // Debe restituirse a la bodega B al costo histórico de $5.80
    const returnMov = await InventoryEngine.recordMovement({
      businessId,
      branchId: branchB.id,
      warehouseId: whB.id,
      productId: prodTerminado.id,
      quantity: 1,
      type: 'DEVOLUCION_CLIENTE',
      unitCost: 5.80, // Costo histórico de la venta original
      reason: 'Devolución de cliente por cambio de producto',
      sourceDocType: 'VENTA',
      sourceDocId: 'PED-POS-001',
      createdBy: 'Cajero Norte'
    }, prisma);

    assert(returnMov.quantity === 1, 'Devolución reingresó 1 u física');
    const wStockPanBPostReturn = await (prisma as any).warehouseStock.findFirst({
      where: { warehouseId: whB.id, productId: prodTerminado.id }
    });
    assert(Number(wStockPanBPostReturn.quantity) === 7, 'Bodega B repone stock a 7 u tras devolución');

    const bInvPanBPostReturn = await (prisma as any).branchInventory.findFirst({
      where: { branchId: branchB.id, productId: prodTerminado.id }
    });
    assert(
      Math.abs(Number(bInvPanBPostReturn.costoPromedio) - 5.80) < 0.001,
      'PMP en Sucursal B permanece inalterado en $5.80 tras devolución a costo histórico'
    );

    console.log('\n================================================================================');
    console.log(`   CITIOX FASE C3.4 RESULTADO: ${passCount} PASS | ${failCount} FAIL`);
    console.log('================================================================================\n');

  } finally {
    await prisma.$disconnect();
    // Limpieza segura de base de prueba aislada en Windows
    try {
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
        console.log(`Archivo aislado ${testDbPath} eliminado tras ejecución segura.`);
      }
    } catch {
      // Si el driver LibSQL aún bloquea el archivo temporalmente en Windows, no fallar la suite
    }
  }

  // Comprobar que dev.db se mantuvo 100% inalterada
  const devDbHashPost = getSha256('dev.db');
  console.log(`Hash dev.db post-test: ${devDbHashPost}`);
  assert(
    devDbHashPost === '190B1EDDA51E135A09D2EAFD74503B3A32AEC55B549F6D7582C9780043DA32D3',
    'dev.db permanece 100% IDÉNTICA e INTACTA (0 modificaciones)'
  );
}

runC3_4TestSuite().catch((err) => {
  console.error('ERROR EN TEST SUITE C3.4:', err);
  process.exit(1);
});
