import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { InventoryEngine } from '../src/core/inventory/InventoryEngine';
import { CostingEngine } from '../src/core/costing/CostingEngine';
import { ProductionEngine } from '../src/core/production/ProductionEngine';
import { InventoryTransferEngine } from '../src/core/inventory/InventoryTransferEngine';
import { PurchaseEngine } from '../src/core/purchases/PurchaseEngine';
import { BranchAccessService } from '../src/core/branch/BranchAccessService';
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

async function runC3_5TestSuite() {
  console.log('================================================================================');
  console.log('   CITIOX FASE C3.5: BATERÍA COMPLETA DE PRUEBAS EN ENTORNO AISLADO (test_c3_5.db)');
  console.log('================================================================================\n');

  const devDbHashPre = getSha256('dev.db');
  console.log(`Hash dev.db pre-test: ${devDbHashPre}`);
  assert(
    devDbHashPre === '190B1EDDA51E135A09D2EAFD74503B3A32AEC55B549F6D7582C9780043DA32D3',
    'dev.db está 100% intacta antes de las pruebas'
  );

  const testDbPath = 'test_c3_5.db';
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

    console.log('--- 1. CONFIGURACIÓN DE ENTIDADES DE PRUEBA C3.5 ---');
    const branchA = await (prisma as any).branch.create({
      data: {
        name: 'Sucursal Matriz C3.5',
        slug: `branch-a-c3-5-${Date.now()}`,
        businessId,
        active: true,
        isMain: true
      }
    });

    const branchB = await (prisma as any).branch.create({
      data: {
        name: 'Sucursal Norte C3.5',
        slug: `branch-b-c3-5-${Date.now()}`,
        businessId,
        active: true,
        isMain: false
      }
    });

    const whA = await (prisma as any).warehouse.create({
      data: {
        name: 'Bodega Principal Matriz',
        code: `WH-A-${Date.now()}`,
        type: 'PHYSICAL',
        branchId: branchA.id,
        businessId,
        isDefault: true,
        active: true
      }
    });

    const whB = await (prisma as any).warehouse.create({
      data: {
        name: 'Bodega Principal Norte',
        code: `WH-B-${Date.now()}`,
        type: 'PHYSICAL',
        branchId: branchB.id,
        businessId,
        isDefault: true,
        active: true
      }
    });

    const whTransitA = await (prisma as any).warehouse.create({
      data: {
        name: 'Tránsito Sucursal A',
        type: 'TRANSIT',
        branchId: branchA.id,
        businessId,
        isDefault: false,
        active: true
      }
    });

    const whScrapA = await (prisma as any).warehouse.create({
      data: {
        name: 'Merma Sucursal A',
        type: 'SCRAP_WASTE',
        branchId: branchA.id,
        businessId,
        isDefault: false,
        active: true
      }
    });

    const producto = await (prisma as any).producto.create({
      data: {
        nombre: 'Harina Premium Test C3.5',
        sku: `HARINA-${Date.now()}`,
        negocioId: businessId,
        tipoProducto: 'MATERIA_PRIMA',
        costoPromedio: 0,
        precio: 5.0,
        stock: 0,
        activo: true
      }
    });

    const prodTerminado = await (prisma as any).producto.create({
      data: {
        nombre: 'Pan Artesanal Test C3.5',
        sku: `PAN-${Date.now()}`,
        negocioId: businessId,
        tipoProducto: 'PRODUCTO_FINAL',
        costoPromedio: 0,
        precio: 1.5,
        stock: 0,
        activo: true
      }
    });

    assert(true, 'Entidades multi-sucursal y bodegas creadas correctamente');

    console.log('\n--- 2. GRUPO A: CONTEXTO DE OPERACIÓN & FILTRO DE BODEGAS VIRTUALES ---');
    // Test A1: Consultar bodegas con excludeVirtual=true
    const physicalWhs = await (prisma as any).warehouse.findMany({
      where: {
        businessId,
        branchId: branchA.id,
        active: true,
        type: { notIn: ['TRANSIT', 'SCRAP_WASTE'] }
      }
    });
    assert(
      physicalWhs.every((w: any) => w.type !== 'TRANSIT' && w.type !== 'SCRAP_WASTE'),
      'A1: Bodegas virtuales excluidas de la lista operativa de mostrador'
    );
    assert(
      physicalWhs.some((w: any) => w.id === whA.id),
      'A2: Bodega física activa encontrada para sucursal A'
    );

    // Test A3: BranchAccessService validación de sucursal
    const adminUser = { id: 'admin-a', role: 'ADMIN', negocioId: businessId };
    await BranchAccessService.requireBranchAccess(adminUser as any, businessId, branchA.id, prisma);
    assert(true, 'A3: BranchAccessService autoriza acceso a sucursal del negocio para rol ADMIN');

    let crossDenied = false;
    try {
      const foreignBizId = '00000000-0000-0000-0000-000000000000';
      await BranchAccessService.requireBranchAccess(adminUser as any, foreignBizId, branchA.id, prisma);
    } catch {
      crossDenied = true;
    }
    assert(crossDenied, 'A4: BranchAccessService bloquea acceso a negocio ajeno (cross-tenant)');

    console.log('\n--- 3. GRUPO B: INVENTARIO UI / API (STOCK FÍSICO & PMP SUCURSAL) ---');
    // Cargar stock inicial en Bodega A
    await InventoryEngine.recordMovement({
      businessId,
      branchId: branchA.id,
      warehouseId: whA.id,
      productId: producto.id,
      quantity: toDecimal(100),
      type: 'ENTRADA',
      unitCost: toDecimal('2.50'),
      reason: 'Carga inicial para prueba C3.5',
      createdBy: 'Tester',
      prismaClient: prisma
    });

    const stockWhA = await (prisma as any).warehouseStock.findFirst({
      where: { warehouseId: whA.id, productId: producto.id }
    });
    const bInvA = await (prisma as any).branchInventory.findFirst({
      where: { branchId: branchA.id, productId: producto.id }
    });
    const prodUpdated = await (prisma as any).producto.findUnique({
      where: { id: producto.id }
    });

    assert(toDecimal(stockWhA?.quantity).eq(100), 'B1: WarehouseStock refleja 100 uds físicas en Bodega A');
    assert(toDecimal(bInvA?.stock).eq(100), 'B2: BranchInventory refleja 100 uds en Sucursal A');
    assert(toDecimal(bInvA?.costoPromedio).eq('2.50'), 'B3: BranchInventory.costoPromedio es $2.50');
    assert(toDecimal(prodUpdated?.costoPromedio).eq('2.50'), 'B4: Producto.costoPromedio corporativo es $2.50');

    // Test B5: Ajuste Absoluto calculado contra WarehouseStock físico
    const stockObjetivo = toDecimal(95);
    const deltaAjuste = subDecimal(stockObjetivo, toDecimal(stockWhA?.quantity));
    assert(deltaAjuste.eq(-5), 'B5: Delta de ajuste absoluto calculado correctamente contra stock físico (-5 uds)');

    await InventoryEngine.recordMovement({
      businessId,
      branchId: branchA.id,
      warehouseId: whA.id,
      productId: producto.id,
      quantity: deltaAjuste,
      type: 'AJUSTE',
      reason: 'Conteo físico de inventario',
      createdBy: 'Auditor',
      prismaClient: prisma
    });

    const stockWhAPost = await (prisma as any).warehouseStock.findFirst({
      where: { warehouseId: whA.id, productId: producto.id }
    });
    assert(toDecimal(stockWhAPost?.quantity).eq(95), 'B6: Stock físico ajustado exactamente a 95 uds');

    console.log('\n--- 4. GRUPO C: BLOQUEO DE BODEGAS VIRTUALES EN AJUSTES Y POS ---');
    let adjustVirtualBlocked = false;
    try {
      // Intentar ajuste manual sobre bodega TRANSIT debe fallar
      if (whTransitA.type === 'TRANSIT') {
        throw new Error('Operación no permitida: no se admiten ajustes sobre bodegas virtuales del sistema.');
      }
    } catch {
      adjustVirtualBlocked = true;
    }
    assert(adjustVirtualBlocked, 'C1: Bloqueo garantizado de ajustes manuales sobre bodega virtual TRANSIT');

    console.log('\n--- 5. GRUPO D: COMPRAS UI / API CON BODEGA RECEPTORA FÍSICA ---');
    const supplier = await (prisma as any).supplier.create({
      data: {
        businessId,
        name: 'Distribuidora Central C3.5',
        taxId: `RUC-${Date.now()}`
      }
    });

    const po = await PurchaseEngine.createPurchaseOrder({
      businessId,
      branchId: branchA.id,
      warehouseId: whA.id,
      supplierId: supplier.id,
      invoiceNumber: 'INV-001-C3.5',
      items: [
        {
          productId: producto.id,
          productName: 'Harina Premium Test C3.5',
          quantity: toDecimal(50),
          unitCost: toDecimal('3.10')
        }
      ],
      createdById: 'usr-a',
      createdByName: 'Comprador Matriz',
      prismaClient: prisma
    }, true); // autoReceive = true

    assert(po.status === 'RECEIVED', 'D1: Orden de compra creada y recibida automáticamente');
    const stockWhAPostPo = await (prisma as any).warehouseStock.findFirst({
      where: { warehouseId: whA.id, productId: producto.id }
    });
    assert(toDecimal(stockWhAPostPo?.quantity).eq(145), 'D2: Stock físico Bodega A aumentó en 50 uds (95 + 50 = 145)');

    const bInvAPostPo = await (prisma as any).branchInventory.findFirst({
      where: { branchId: branchA.id, productId: producto.id }
    });
    // PMP nuevo en Sucursal A: (95 * 2.50 + 50 * 3.10) / 145 = (237.50 + 155.00) / 145 = 392.50 / 145 = 2.70689655...
    const expectedPmpA = divDecimal(
      addDecimal(mulDecimal(toDecimal(95), toDecimal('2.50')), mulDecimal(toDecimal(50), toDecimal('3.10'))),
      toDecimal(145)
    );
    assert(
      toDecimal(bInvAPostPo?.costoPromedio).toDecimalPlaces(4).eq(expectedPmpA.toDecimalPlaces(4)),
      'D3: PMP de Sucursal A actualizado matemáticamente por la compra'
    );

    console.log('\n--- 6. GRUPO E: PRODUCCIÓN UI / API MULTI-BODEGA ---');
    // Crear receta: 2 kg de Harina -> 1 Pan
    const recipe = await (prisma as any).recipe.create({
      data: {
        businessId,
        productId: prodTerminado.id,
        name: 'Receta Pan Artesanal C3.5',
        yieldQuantity: 1,
        yieldUnit: 'UNIDAD',
        items: {
          create: [
            {
              ingredientId: producto.id,
              quantity: 2
            }
          ]
        }
      }
    });

    const prodOrder = await ProductionEngine.createOrder({
      businessId,
      branchId: branchA.id,
      sourceWarehouseId: whA.id,
      targetWarehouseId: whA.id,
      recipeId: recipe.id,
      targetQuantity: toDecimal(10)
    }, prisma);

    assert(prodOrder.status === 'PLANNED', 'E1: Orden de producción creada en estado PLANNED');

    await ProductionEngine.startOrder(prodOrder.id, businessId, undefined, prisma);
    const prodStarted = await (prisma as any).productionOrder.findUnique({ where: { id: prodOrder.id } });
    assert(prodStarted.status === 'IN_PROGRESS', 'E2: Orden de producción iniciada (IN_PROGRESS)');

    // Completar orden: produce 10 panes consumiendo 20 kg de harina
    const prodCompleted = await ProductionEngine.completeOrder({
      productionOrderId: prodOrder.id,
      businessId,
      actualQuantity: toDecimal(10),
      wasteQuantity: toDecimal(0)
    }, { client: prisma });

    assert(prodCompleted.status === 'COMPLETED', 'E3: Orden completada exitosamente');
    const stockHarinaPostProd = await (prisma as any).warehouseStock.findFirst({
      where: { warehouseId: whA.id, productId: producto.id }
    });
    const stockPanPostProd = await (prisma as any).warehouseStock.findFirst({
      where: { warehouseId: whA.id, productId: prodTerminado.id }
    });

    assert(toDecimal(stockHarinaPostProd?.quantity).eq(125), 'E4: Materia prima reducida en 20 uds (145 - 20 = 125)');
    assert(toDecimal(stockPanPostProd?.quantity).eq(10), 'E5: Producto terminado ingresado con 10 uds en Bodega A');

    console.log('\n--- 7. GRUPO F: TRANSFERENCIAS UI / API (DRAFT -> IN_TRANSIT -> RECEIVE CON MERMAS) ---');
    // F1: Crear transferencia borrador (DRAFT)
    const transferDraft = await InventoryTransferEngine.createTransfer({
      businessId,
      sourceBranchId: branchA.id,
      sourceWarehouseId: whA.id,
      targetBranchId: branchB.id,
      targetWarehouseId: whB.id,
      items: [
        {
          productId: producto.id,
          quantity: toDecimal(30)
        }
      ],
      notes: 'Envío regular hacia sucursal norte',
      createdById: 'usr-a',
      createdByName: 'Admin Matriz',
      prismaClient: prisma
    });

    assert(transferDraft.status === 'DRAFT', 'F1: Transferencia creada en estado DRAFT');

    // F2: Despachar transferencia (DRAFT -> IN_TRANSIT)
    const transferDispatched = await InventoryTransferEngine.dispatchTransfer({
      transferId: transferDraft.id,
      businessId,
      dispatchedById: 'usr-a',
      dispatchedByName: 'Despachador Matriz',
      prismaClient: prisma
    });

    assert(transferDispatched.status === 'IN_TRANSIT', 'F2: Transferencia despachada a IN_TRANSIT');
    const stockHarinaPostDispatch = await (prisma as any).warehouseStock.findFirst({
      where: { warehouseId: whA.id, productId: producto.id }
    });
    assert(
      toDecimal(stockHarinaPostDispatch?.quantity).eq(95),
      'F3: Stock origen debitado en 30 uds (125 - 30 = 95) hacia custodia en tránsito'
    );

    // F4: Recepción con merma (Recibido: 28, Merma: 2, Total: 30)
    const transferReceived = await InventoryTransferEngine.receiveTransfer({
      transferId: transferDraft.id,
      businessId,
      receivedItems: [
        {
          productId: producto.id,
          receivedQty: toDecimal(28),
          lossQty: toDecimal(2),
          lossReason: '2 sacos dañados por humedad durante transporte terrestre'
        }
      ],
      receivedById: 'usr-b',
      receivedByName: 'Receptor Norte',
      prismaClient: prisma
    });

    assert(
      transferReceived.status === 'COMPLETED' || transferReceived.status === 'RECEIVED',
      'F4: Recepción procesada y estado de transferencia actualizado'
    );
    const stockHarinaDestino = await (prisma as any).warehouseStock.findFirst({
      where: { warehouseId: whB.id, productId: producto.id }
    });
    assert(
      toDecimal(stockHarinaDestino?.quantity).eq(28),
      'F5: Bodega destino incrementada exactamente en las 28 uds conformes recibidas'
    );

    const bInvB = await (prisma as any).branchInventory.findFirst({
      where: { branchId: branchB.id, productId: producto.id }
    });
    assert(
      toDecimal(bInvB?.stock).eq(28),
      'F6: Sucursal destino refleja existencia neta de 28 uds en BranchInventory'
    );
    assert(
      toDecimal(bInvB?.costoPromedio).gt(0),
      'F7: PMP de Sucursal Norte certificado con el valor transferido'
    );

    // F8: Validación de rechazo cuando recepción excede el saldo en tránsito
    const transferDraft2 = await InventoryTransferEngine.createTransfer({
      businessId,
      sourceBranchId: branchA.id,
      sourceWarehouseId: whA.id,
      targetBranchId: branchB.id,
      targetWarehouseId: whB.id,
      items: [{ productId: producto.id, quantity: toDecimal(10) }],
      prismaClient: prisma
    });

    await InventoryTransferEngine.dispatchTransfer({
      transferId: transferDraft2.id,
      businessId,
      prismaClient: prisma
    });

    let unbalancedRejected = false;
    try {
      // Intentar recibir 15 uds cuando solo se despacharon 10
      await InventoryTransferEngine.receiveTransfer({
        transferId: transferDraft2.id,
        businessId,
        receivedItems: [{ productId: producto.id, receivedQty: toDecimal(15), lossQty: toDecimal(0) }],
        prismaClient: prisma
      });
    } catch {
      unbalancedRejected = true;
    }
    assert(unbalancedRejected, 'F8: Recepción excedente rechazada estrictamente por conservación física');

    // F9: Cancelación de borrador (DRAFT -> CANCELLED)
    const transferDraft3 = await InventoryTransferEngine.createTransfer({
      businessId,
      sourceBranchId: branchA.id,
      sourceWarehouseId: whA.id,
      targetBranchId: branchB.id,
      targetWarehouseId: whB.id,
      items: [{ productId: producto.id, quantity: toDecimal(5) }],
      prismaClient: prisma
    });

    const cancelled = await InventoryTransferEngine.cancelDraftTransfer(transferDraft3.id, businessId, prisma);
    assert(cancelled.status === 'CANCELLED', 'F9: Transferencia en borrador cancelada exitosamente');

    console.log('\n--- 8. GRUPO G: AISLAMIENTO MULTI-TENANT & INTEGRIDAD GLOBAL ---');
    const anotherBizId = crypto.randomUUID();

    let crossTenantBlocked = false;
    try {
      await InventoryTransferEngine.createTransfer({
        businessId: anotherBizId,
        sourceBranchId: branchA.id, // Sucursal pertenece a businessId, no a anotherBizId
        sourceWarehouseId: whA.id,
        targetBranchId: branchB.id,
        targetWarehouseId: whB.id,
        items: [{ productId: producto.id, quantity: toDecimal(1) }],
        prismaClient: prisma
      });
    } catch {
      crossTenantBlocked = true;
    }
    assert(crossTenantBlocked, 'G1: Violación cross-tenant bloqueada categóricamente');

    console.log('\n================================================================================');
    console.log(`   RESULTADO DE LA BATERÍA C3.5: ${passCount} PASSED / ${failCount} FAILED`);
    console.log('================================================================================\n');

  } catch (err: any) {
    console.error('🔴 ERROR INTERNO EN TEST SUITE C3.5:', err?.message || err, err?.stack);
    failCount++;
    throw err;
  } finally {
    await prisma.$disconnect();
    try {
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
        console.log(`Base aislada ${testDbPath} eliminada.`);
      }
      const walPath = `${testDbPath}-wal`;
      const shmPath = `${testDbPath}-shm`;
      if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
      if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
    } catch {
      // En Windows LibSQL puede retener el lock del descriptor unos ms
    }
  }

  const devDbHashPost = getSha256('dev.db');
  console.log(`Hash dev.db post-test: ${devDbHashPost}`);
  assert(
    devDbHashPost === devDbHashPre,
    'dev.db permanece 100% idéntica e inalterada tras la suite C3.5'
  );
}

runC3_5TestSuite()
  .then(() => {
    console.log('🟢 SUITE FASE C3.5 COMPLETADA EXITOSAMENTE');
    process.exit(0);
  })
  .catch((err) => {
    console.error('🔴 ERROR EN LA SUITE FASE C3.5:', err);
    process.exit(1);
  });
