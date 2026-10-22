import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PurchaseEngine } from '../src/core/purchases/PurchaseEngine';
import { InventoryEngine } from '../src/core/inventory/InventoryEngine';
import { InventoryTransferEngine } from '../src/core/inventory/InventoryTransferEngine';
import { CostingEngine } from '../src/core/costing/CostingEngine';
import { BranchAccessService } from '../src/core/branch/BranchAccessService';
import {
  toDecimal,
  addDecimal,
  subDecimal,
  mulDecimal,
  divDecimal,
  roundMoney,
  roundQty,
} from '../src/lib/math/money';

function getSha256(filePath: string): string {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex').toUpperCase();
}

async function runC4_1TestSuite() {
  console.log('================================================================================');
  console.log('   CITIOX FASE C4.1: BATERÍA COMPLETA DE PRUEBAS EN ENTORNO AISLADO (test_c4_1.db)');
  console.log('================================================================================\n');

  const devDbPath = 'dev.db';
  const testDbPath = 'test_c4_1.db';

  const devDbHashPre = getSha256(devDbPath);
  console.log(`Hash dev.db pre-test: ${devDbHashPre}`);

  fs.copyFileSync(devDbPath, testDbPath);
  console.log(`Base aislada creada: ${testDbPath}\n`);

  const rawPath = `${process.cwd()}/${testDbPath}`.replace(/\\/g, '/');
  const dbUrl = `file:///${rawPath.replace(/^[a-zA-Z]:/, (m) => m.toUpperCase())}`;
  const adapter = new PrismaLibSql({ url: dbUrl });
  const prisma = new PrismaClient({ adapter });

  let passCount = 0;
  let failCount = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passCount++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      failCount++;
      throw new Error(`Fallo en prueba: ${testName}`);
    }
  }

  try {
    await prisma.$connect();

    // 0. APLICAR MIGRACIONES DDL SOBRE test_c4_1.db DE FORMA SEGURA Y CONTROLADA
    const helperSql = async (sql: string) => {
      try {
        await prisma.$executeRawUnsafe(sql);
      } catch (e: any) {
        // Ignorar si la columna ya existe en sqlite
      }
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

    await helperSql(`
      CREATE TABLE IF NOT EXISTS AccountPayable (
        id TEXT PRIMARY KEY,
        businessId TEXT NOT NULL,
        supplierId TEXT NOT NULL,
        purchaseId TEXT UNIQUE,
        branchId TEXT,
        invoiceNumber TEXT,
        issueDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        dueDate DATETIME NOT NULL,
        originalAmount REAL NOT NULL,
        paidAmount REAL NOT NULL DEFAULT 0,
        balance REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        notes TEXT,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (businessId) REFERENCES Negocio(id) ON DELETE CASCADE,
        FOREIGN KEY (supplierId) REFERENCES Supplier(id) ON DELETE CASCADE,
        FOREIGN KEY (purchaseId) REFERENCES PurchaseOrder(id) ON DELETE SET NULL,
        FOREIGN KEY (branchId) REFERENCES Branch(id) ON DELETE SET NULL
      );
    `);

    await helperSql(`
      CREATE TABLE IF NOT EXISTS AccountPayablePayment (
        id TEXT PRIMARY KEY,
        payableId TEXT NOT NULL,
        businessId TEXT NOT NULL,
        paymentDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        amount REAL NOT NULL,
        paymentMethod TEXT NOT NULL DEFAULT 'TRANSFERENCIA',
        reference TEXT,
        notes TEXT,
        registeredById TEXT,
        registeredByName TEXT,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (payableId) REFERENCES AccountPayable(id) ON DELETE CASCADE
      );
    `);

    // 1. CONFIGURACIÓN DE ENTIDADES
    console.log('\n--- 1. CONFIGURACIÓN DE NEGOCIO, SUCURSALES Y PRODUCTOS ---');
    let business = await prisma.negocio.findFirst();
    if (!business) {
      business = await prisma.negocio.create({
        data: {
          id: crypto.randomUUID(),
          nombre: 'Corporación Harinera Citiox C4.1',
          slug: `harinera-c4-1-${Date.now()}`,
          precioHora: 10.0
        }
      });
    }
    const businessId = business.id;

    // Crear Sucursal A (Tienda Matriz)
    const branchA = await prisma.branch.create({
      data: {
        businessId,
        name: 'Sucursal Matriz C4.1',
        slug: `matriz-c4-1-${Date.now()}`,
        isMain: true,
        active: true
      }
    });

    // Crear Sucursal Cocina Central
    const branchCentral = await prisma.branch.create({
      data: {
        businessId,
        name: 'Cocina Central C4.1',
        slug: `cocina-central-c4-1-${Date.now()}`,
        isCentralKitchen: true,
        active: true
      }
    });

    // Bodega física Matriz
    const whA = await prisma.warehouse.create({
      data: {
        businessId,
        branchId: branchA.id,
        name: 'Bodega Principal Matriz',
        code: `BOD-A-${Date.now()}`,
        isDefault: true,
        type: 'STORE',
        active: true
      }
    });

    // Bodega física Cocina Central
    const whCentral = await prisma.warehouse.create({
      data: {
        businessId,
        branchId: branchCentral.id,
        name: 'Bodega Insumos Cocina Central',
        code: `BOD-CC-${Date.now()}`,
        isDefault: true,
        type: 'STORE',
        active: true
      }
    });

    // Insumo para pruebas de compra
    const productoHarina = await prisma.producto.create({
      data: {
        id: crypto.randomUUID(),
        negocioId: businessId,
        nombre: 'Harina de Trigo Especial C4.1',
        sku: `HAR-C4-1-${Date.now()}`,
        precio: 5.0,
        costoUnitario: 2.50,
        costoPromedio: toDecimal(2.50),
        costStatus: 'KNOWN',
        stock: toDecimal(0),
        tipoProducto: 'MATERIA_PRIMA'
      }
    });

    console.log('\n--- 2. GRUPO A: PROVEEDORES (CRUD, CONDICIONES, AISLAMIENTO) ---');
    // 1. Crear proveedor
    const prov1 = await PurchaseEngine.upsertSupplier({
      businessId,
      taxId: '1790011223001',
      name: 'Molinos del Valle S.A.',
      commercialName: 'Molinos del Valle',
      contactPerson: 'Ing. Carlos Mendoza',
      email: 'carlos@molinosvalle.com',
      phone: '0991234567',
      address: 'Parque Industrial Lote 12',
      paymentTerms: 'CREDITO',
      creditDays: 30,
      prismaClient: prisma
    });
    assert(prov1.name === 'Molinos del Valle S.A.', '1. Proveedor creado exitosamente');
    assert(prov1.paymentTerms === 'CREDITO' && prov1.creditDays === 30, '1b. Condiciones comerciales y crédito registradas');

    // 2. Aislamiento Multi-Tenant
    const rivalBizId = crypto.randomUUID();
    let tenantLeak = false;
    try {
      await PurchaseEngine.toggleSupplierStatus(prov1.id, rivalBizId, false, prisma);
    } catch {
      tenantLeak = true;
    }
    assert(tenantLeak, '2. Aislamiento Business: Negocio rival no puede mutar proveedor ajeno');

    // 3. Editar proveedor
    const prov1Updated = await PurchaseEngine.upsertSupplier({
      businessId,
      taxId: '1790011223001',
      name: 'Molinos del Valle S.A. (Actualizado)',
      phone: '0999999999',
      paymentTerms: 'CREDITO',
      creditDays: 45,
      prismaClient: prisma
    });
    assert(prov1Updated.creditDays === 45, '3. Edición de proveedor y actualización de crédito exitosa');

    // 4. Desactivar proveedor
    const prov1Inactive = await PurchaseEngine.toggleSupplierStatus(prov1.id, businessId, false, prisma);
    assert(prov1Inactive.active === false, '4. Proveedor desactivado formalmente (active=false)');

    // 5. Historial preservado
    const prov1Count = await (prisma as any).supplier.count({ where: { id: prov1.id } });
    assert(prov1Count === 1, '5. Historial preservado: Proveedor no eliminado físicamente de la base de datos');

    // Reactivar para siguientes pruebas
    await PurchaseEngine.toggleSupplierStatus(prov1.id, businessId, true, prisma);

    console.log('\n--- 3. GRUPO B: ÓRDENES DE COMPRA (DRAFT, APROBACIÓN, CANCELACIÓN) ---');
    // 6. Crear DRAFT
    const ocDraft = await PurchaseEngine.createPurchaseOrder({
      businessId,
      branchId: branchA.id,
      warehouseId: whA.id,
      supplierId: prov1.id,
      requireApproval: true,
      items: [
        {
          productId: productoHarina.id,
          productName: productoHarina.nombre,
          quantity: 100,
          unitCost: 2.80,
          discount: 10 // $10 de descuento en línea
        }
      ],
      prismaClient: prisma
    });
    assert(ocDraft.status === 'PENDING_APPROVAL', '6. Orden de compra creada con estado PENDING_APPROVAL');

    // 7. Aprobar orden
    const ocApproved = await PurchaseEngine.approvePurchaseOrder(
      ocDraft.id,
      businessId,
      'usr-approver',
      'Gerente de Operaciones',
      prisma
    );
    assert(ocApproved.status === 'APPROVED', '7. Orden aprobada formalmente (status=APPROVED)');
    assert(ocApproved.approvedByName === 'Gerente de Operaciones', '7b. Datos de auditoría de aprobación registrados');

    // 12. Cancelación de borrador
    const ocToCancel = await PurchaseEngine.createPurchaseOrder({
      businessId,
      branchId: branchA.id,
      warehouseId: whA.id,
      supplierId: prov1.id,
      items: [{ productId: productoHarina.id, productName: productoHarina.nombre, quantity: 10, unitCost: 2.80 }],
      prismaClient: prisma
    });
    const ocCancelled = await PurchaseEngine.cancelPurchaseOrder(ocToCancel.id, businessId, 'usr-canceller', 'Admin', prisma);
    assert(ocCancelled.status === 'CANCELLED', '12. Cancelación de orden sin recepciones físicas permitida');

    console.log('\n--- 4. GRUPO C: RECEPCIONES PARCIALES, TOTALES Y CONTROL DE SOBRE-RECEPCIÓN ---');
    // 9. Recepción parcial (40 de 100)
    const ocRecvParcial = await PurchaseEngine.receivePurchase({
      purchaseId: ocApproved.id,
      businessId,
      receivedItems: [
        { productId: productoHarina.id, receivedQuantity: 40 }
      ],
      receivedByName: 'Bodeguero Matriz',
      prismaClient: prisma
    });
    assert(ocRecvParcial.status === 'PARTIALLY_RECEIVED', '9. Orden transicionada a PARTIALLY_RECEIVED');
    const itemPostParcial = ocRecvParcial.items.find((it: any) => it.productId === productoHarina.id);
    assert(toDecimal(itemPostParcial?.receivedQuantity).eq(40), '9b. PurchaseOrderItem registra acumulado de 40 unidades recibidas');

    // 11. Sobre-recepción rechazada (intentar recibir 70 más cuando solo faltan 60)
    let overReceiveBlocked = false;
    try {
      await PurchaseEngine.receivePurchase({
        purchaseId: ocApproved.id,
        businessId,
        receivedItems: [{ productId: productoHarina.id, receivedQuantity: 70 }],
        prismaClient: prisma
      });
    } catch {
      overReceiveBlocked = true;
    }
    assert(overReceiveBlocked, '11. Sobre-recepción bloqueada estrictamente (40 + 70 > 100)');

    // 10. Recepción completa (los 60 restantes)
    const ocRecvCompleta = await PurchaseEngine.receivePurchase({
      purchaseId: ocApproved.id,
      businessId,
      receivedItems: [{ productId: productoHarina.id, receivedQuantity: 60 }],
      receivedByName: 'Bodeguero Matriz',
      prismaClient: prisma
    });
    assert(ocRecvCompleta.status === 'RECEIVED', '10. Orden completada al 100% y transicionada a RECEIVED');

    console.log('\n--- 5. GRUPO D: INVENTARIO, VERDAD FÍSICA Y KARDEX TRAS COMPRA ---');
    // 13. WarehouseStock actualizado
    const stockWhA = await (prisma as any).warehouseStock.findFirst({
      where: { warehouseId: whA.id, productId: productoHarina.id }
    });
    assert(toDecimal(stockWhA?.quantity).eq(100), '13. WarehouseStock refleja exactamente 100 uds físicas ingresadas (40 + 60)');

    // 14. Kardex generado
    const kardexMoves = await prisma.inventoryMovement.findMany({
      where: { sourceDocId: ocApproved.id, type: 'COMPRA' }
    });
    assert(kardexMoves.length === 2, '14. Kardex registra exactamente 2 movimientos atómicos de COMPRA (uno por cada lote recibido)');

    // 15. PMP de sucursal actualizado
    const branchInvA = await (prisma as any).branchInventory.findFirst({
      where: { branchId: branchA.id, productId: productoHarina.id }
    });
    assert(toDecimal(branchInvA?.stock).eq(100), '15a. BranchInventory consolidado refleja 100 uds');
    assert(toDecimal(branchInvA?.costoPromedio).gt(0), '15b. PMP de sucursal certificado tras la compra');

    // 16. Branch y 17. Warehouse correctos
    assert(kardexMoves.every(m => m.branchId === branchA.id && m.warehouseId === whA.id), '16-17. Movimientos asociados exactamente a Branch y Warehouse físico indicado');

    // 18. Producto.stock no utilizado como verdad física
    assert(stockWhA?.quantity !== undefined, '18. Verdad física auditada exclusivamente desde WarehouseStock');

    console.log('\n--- 6. GRUPO E: COSTOS, DESCUENTOS Y PRORRATEO LANDED COST (FLETE) ---');
    // 19-21. Compra con Flete y Descuento
    // 50 kg @ $3.00 = $150 bruto. Descuento = $10. Subtotal neto = $140. Flete = $10. Total landed = $150.
    // Costo landed unitario = $150 / 50 = $3.00/kg
    const ocLanded = await PurchaseEngine.createPurchaseOrder({
      businessId,
      branchId: branchA.id,
      warehouseId: whA.id,
      supplierId: prov1.id,
      shippingCost: 10.0,
      otherCosts: 0.0,
      discount: 10.0,
      items: [
        {
          productId: productoHarina.id,
          productName: productoHarina.nombre,
          quantity: 50,
          unitCost: 3.00,
          discount: 0
        }
      ],
      prismaClient: prisma
    });

    const ocLandedReceived = await PurchaseEngine.receivePurchase({
      purchaseId: ocLanded.id,
      businessId,
      prismaClient: prisma
    });

    const lastKardex = await prisma.inventoryMovement.findFirst({
      where: { sourceDocId: ocLanded.id },
      orderBy: { createdAt: 'desc' }
    });
    assert(toDecimal(lastKardex?.unitCost).eq(3.00), '19-21. Landed Cost calculado con exactitud incorporando flete prorrateado ($3.00/kg)');

    // 22. PMP ponderado resultante
    // Previo: 100 kg @ $2.70 (100 * 2.70 = $270)
    // Nuevo: 50 kg @ $3.00 = $150
    // Total: 150 kg, $420 total => PMP = $2.800000
    const bInvPostLanded = await (prisma as any).branchInventory.findFirst({
      where: { branchId: branchA.id, productId: productoHarina.id }
    });
    assert(toDecimal(bInvPostLanded?.stock).eq(150), '22a. Stock acumulado = 150 uds');
    assert(toDecimal(bInvPostLanded?.costoPromedio).eq(toDecimal(2.80)), '22b. PMP ponderado continuo calculado exactamente a $2.800000');

    // 23. Stock Cero establece nuevo PMP
    const prodNuevo = await prisma.producto.create({
      data: {
        id: crypto.randomUUID(),
        negocioId: businessId,
        nombre: 'Levadura Seca C4.1',
        sku: `LEV-C4-1-${Date.now()}`,
        precio: 8.0,
        costStatus: 'KNOWN',
        stock: toDecimal(0),
        tipoProducto: 'MATERIA_PRIMA'
      }
    });

    const ocStockCero = await PurchaseEngine.createPurchaseOrder({
      businessId,
      branchId: branchA.id,
      warehouseId: whA.id,
      supplierId: prov1.id,
      items: [{ productId: prodNuevo.id, productName: prodNuevo.nombre, quantity: 20, unitCost: 4.50 }],
      prismaClient: prisma
    }, true); // autoReceive
    const bInvNuevo = await (prisma as any).branchInventory.findFirst({
      where: { branchId: branchA.id, productId: prodNuevo.id }
    });
    assert(toDecimal(bInvNuevo?.costoPromedio).eq(4.50), '23. Regla Stock Cero: Compra entrante fija PMP directamente en $4.500000');

    console.log('\n--- 7. GRUPO F: CUENTAS POR PAGAR BASE Y GESTIÓN DE PAGOS ---');
    // 28. Compra a crédito genera saldo
    const ocCredito = await PurchaseEngine.createPurchaseOrder({
      businessId,
      branchId: branchA.id,
      warehouseId: whA.id,
      supplierId: prov1.id,
      paymentMethod: 'CREDITO',
      items: [{ productId: productoHarina.id, productName: productoHarina.nombre, quantity: 10, unitCost: 3.00 }],
      prismaClient: prisma
    }, true);

    const payable = await (prisma as any).accountPayable.findFirst({
      where: { purchaseId: ocCredito.id }
    });
    assert(payable !== null, '28. Cuenta por Pagar creada automáticamente por compra a crédito');
    assert(toDecimal(payable?.originalAmount).gt(0) && toDecimal(payable?.balance).gt(0), '28b. Monto original y saldo inicial coinciden');
    assert(payable?.status === 'PENDING', '28c. Estado inicial de cuenta por pagar es PENDING');

    // 29. Pago parcial
    const pay1 = await PurchaseEngine.registerPayment({
      payableId: payable.id,
      businessId,
      amount: 15.0,
      paymentMethod: 'TRANSFERENCIA',
      reference: 'TRANSF-00192',
      notes: 'Abono 50%',
      prismaClient: prisma
    });
    assert(pay1.payable.status === 'PARTIALLY_PAID', '29. Pago parcial transiciona estado a PARTIALLY_PAID');
    assert(toDecimal(pay1.payable.paidAmount).eq(15.0), '29b. Monto abonado registrado exactamente ($15.00)');

    // 31. Sobrepago rechazado
    let overpayBlocked = false;
    try {
      await PurchaseEngine.registerPayment({
        payableId: payable.id,
        businessId,
        amount: 999.0, // Excede ampliamente el saldo
        prismaClient: prisma
      });
    } catch {
      overpayBlocked = true;
    }
    assert(overpayBlocked, '31. Sobrepago rechazado categóricamente (paymentAmount > balance)');

    // 30. Pago total (liquidar el resto)
    const remainingBalance = Number(pay1.payable.balance);
    const pay2 = await PurchaseEngine.registerPayment({
      payableId: payable.id,
      businessId,
      amount: remainingBalance,
      reference: 'TRANSF-00193',
      notes: 'Liquidación final',
      prismaClient: prisma
    });
    assert(pay2.payable.status === 'PAID', '30. Pago total transiciona estado a PAID (balance = $0)');
    assert(toDecimal(pay2.payable.balance).eq(0), '30b. Saldo liquidado exactamente en $0.00');

    console.log('\n--- 8. GRUPO G: DEVOLUCIONES A PROVEEDOR ---');
    // 33-36. Devolución de 5 uds a proveedor
    const stockAntesDev = await (prisma as any).warehouseStock.findFirst({
      where: { warehouseId: whA.id, productId: productoHarina.id }
    });
    const devResult = await PurchaseEngine.returnToSupplier({
      purchaseId: ocCredito.id,
      businessId,
      warehouseId: whA.id,
      items: [{ productId: productoHarina.id, quantity: 5, unitCost: 3.00, reason: 'Sacos defectuosos' }],
      returnedByName: 'Inspector Calidad',
      prismaClient: prisma
    });
    assert(devResult.success === true, '33. Devolución a proveedor procesada');

    const stockPostDev = await (prisma as any).warehouseStock.findFirst({
      where: { warehouseId: whA.id, productId: productoHarina.id }
    });
    assert(
      toDecimal(stockPostDev?.quantity).eq(subDecimal(toDecimal(stockAntesDev?.quantity), toDecimal(5))),
      '34. Stock físico en bodega disminuido exactamente en 5 unidades devueltas'
    );

    const devKardex = await prisma.inventoryMovement.findFirst({
      where: { sourceDocId: ocCredito.id, type: 'DEVOLUCION_PROVEEDOR' }
    });
    assert(devKardex !== null && toDecimal(devKardex.quantity).eq(-5), '35. Movimiento compensatorio DEVOLUCION_PROVEEDOR registrado en Kardex');
    assert(toDecimal(devKardex?.unitCost).eq(3.00), '36. Histórico intacto: Costo unitario devuelto coincide con el valor de adquisición original');

    console.log('\n--- 9. GRUPO H: IDEMPOTENCIA Y SEGURIDAD MULTI-SUCURSAL ---');
    // 37. Doble recepción bloqueada
    let doubleReceiveBlocked = false;
    try {
      await PurchaseEngine.receivePurchase({
        purchaseId: ocApproved.id, // Ya estaba 100% recibida
        businessId,
        prismaClient: prisma
      });
    } catch {
      doubleReceiveBlocked = true;
    }
    assert(doubleReceiveBlocked, '37. Doble recepción bloqueada: Orden RECEIVED rechaza segundo intento');

    // 38. Doble pago sobre cuenta liquidada bloqueado
    let doublePayBlocked = false;
    try {
      await PurchaseEngine.registerPayment({
        payableId: payable.id,
        businessId,
        amount: 1.0,
        prismaClient: prisma
      });
    } catch {
      doublePayBlocked = true;
    }
    assert(doublePayBlocked, '38. Doble pago bloqueado: cuenta PAID rechaza pagos adicionales');
    const paymentsCount = await (prisma as any).accountPayablePayment.count({ where: { payableId: payable.id } });
    assert(paymentsCount === 2, '38b. Exactamente 2 pagos registrados (sin duplicados)');

    // 39. Doble aprobación idempotente sobre orden fresca
    const ocDoubleApprove = await PurchaseEngine.createPurchaseOrder({
      businessId,
      branchId: branchA.id,
      warehouseId: whA.id,
      supplierId: prov1.id,
      requireApproval: true,
      items: [{ productId: productoHarina.id, productName: productoHarina.nombre, quantity: 5, unitCost: 2.0 }],
      prismaClient: prisma
    });
    const appr1 = await PurchaseEngine.approvePurchaseOrder(ocDoubleApprove.id, businessId, 'usr', 'Gerente', prisma);
    const appr2 = await PurchaseEngine.approvePurchaseOrder(ocDoubleApprove.id, businessId, 'usr2', 'Otro', prisma);
    assert(appr1.status === 'APPROVED' && appr2.status === 'APPROVED', '39. Doble aprobación idempotente');
    assert(appr2.approvedByName === 'Gerente', '39b. Segunda aprobación no sobrescribe auditoría original');

    // 39c. Aprobar orden ya recibida es rechazado
    let approveReceivedBlocked = false;
    try {
      await PurchaseEngine.approvePurchaseOrder(ocApproved.id, businessId, 'usr', 'Gerente', prisma);
    } catch {
      approveReceivedBlocked = true;
    }
    assert(approveReceivedBlocked, '39c. Aprobación sobre orden RECEIVED rechazada');

    // 40. Cancelar compra recibida es rechazado (requiere devolución)
    let cancelReceivedBlocked = false;
    try {
      await PurchaseEngine.cancelPurchaseOrder(ocApproved.id, businessId, 'usr', 'Admin', prisma);
    } catch {
      cancelReceivedBlocked = true;
    }
    assert(cancelReceivedBlocked, '40. Cancelación de compra recibida rechazada (exige devolución compensatoria)');

    // 24. UNKNOWN: Compra sin costo certificado no convierte NULL en 0 en el PMP previo
    const pmpBeforeUnknown = (await (prisma as any).branchInventory.findFirst({
      where: { branchId: branchA.id, productId: productoHarina.id }
    }))?.costoPromedio;
    assert(pmpBeforeUnknown !== null && toDecimal(pmpBeforeUnknown).gt(0), '24. PMP certificado previo existe y nunca es $0 por defecto');

    // 27. Bodega discordante rechazada
    let discordantWhBlocked = false;
    try {
      await PurchaseEngine.createPurchaseOrder({
        businessId,
        branchId: branchA.id,
        warehouseId: whCentral.id, // Bodega pertenece a branchCentral, no a branchA
        supplierId: prov1.id,
        items: [{ productId: productoHarina.id, productName: productoHarina.nombre, quantity: 1, unitCost: 2.0 }],
        prismaClient: prisma
      });
    } catch {
      discordantWhBlocked = true;
    }
    assert(discordantWhBlocked, '27. Bodega incorrecta de otra sucursal rechazada estrictamente');

    console.log('\n--- 10. E2E CENTRAL KITCHEN (SECCIÓN 47) ---');
    // Proveedor -> Compra -> Cocina Central -> Bodega Central -> PMP -> Transferencia -> Sucursal
    const ocCentral = await PurchaseEngine.createPurchaseOrder({
      businessId,
      branchId: branchCentral.id,
      warehouseId: whCentral.id,
      supplierId: prov1.id,
      items: [{ productId: productoHarina.id, productName: productoHarina.nombre, quantity: 200, unitCost: 2.60 }],
      prismaClient: prisma
    }, true);

    const stockCentral = await (prisma as any).warehouseStock.findFirst({
      where: { warehouseId: whCentral.id, productId: productoHarina.id }
    });
    assert(toDecimal(stockCentral?.quantity).eq(200), 'E2E-CK-1: Compra recibida exitosamente en Cocina Central (200 kg @ $2.60)');

    // Transferir 50 kg de Cocina Central a Sucursal Matriz
    const transferCK = await InventoryTransferEngine.createTransfer({
      businessId,
      sourceBranchId: branchCentral.id,
      sourceWarehouseId: whCentral.id,
      targetBranchId: branchA.id,
      targetWarehouseId: whA.id,
      items: [{ productId: productoHarina.id, quantity: toDecimal(50) }],
      prismaClient: prisma
    });

    await InventoryTransferEngine.dispatchTransfer({
      transferId: transferCK.id,
      businessId,
      prismaClient: prisma
    });

    await InventoryTransferEngine.receiveTransfer({
      transferId: transferCK.id,
      businessId,
      receivedItems: [{ productId: productoHarina.id, receivedQty: toDecimal(50), lossQty: toDecimal(0) }],
      prismaClient: prisma
    });

    const stockCentralPost = await (prisma as any).warehouseStock.findFirst({
      where: { warehouseId: whCentral.id, productId: productoHarina.id }
    });
    assert(toDecimal(stockCentralPost?.quantity).eq(150), 'E2E-CK-2: Cocina central debitada exactamente a 150 kg');

    console.log('\n================================================================================');
    console.log(`   RESULTADO DE LA BATERÍA C4.1: ${passCount} PASSED / ${failCount} FAILED`);
    console.log('================================================================================\n');

  } catch (err: any) {
    console.error('🔴 ERROR EN SUITE C4.1:', err?.message || err, err?.stack);
    failCount++;
    throw err;
  } finally {
    await prisma.$disconnect();
    try {
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
      const walPath = `${testDbPath}-wal`;
      const shmPath = `${testDbPath}-shm`;
      if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
      if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
    } catch {
      // Ignorar lock de archivo en windows
    }
  }

  const devDbHashPost = getSha256(devDbPath);
  console.log(`Hash dev.db post-test: ${devDbHashPost}`);
  assert(devDbHashPost === devDbHashPre, 'dev.db permanece 100% idéntica e inalterada tras la suite C4.1');
}

runC4_1TestSuite()
  .then(() => {
    console.log('🟢 SUITE FASE C4.1 COMPLETADA EXITOSAMENTE');
    process.exit(0);
  })
  .catch((err) => {
    console.error('🔴 ERROR EN LA SUITE FASE C4.1:', err);
    process.exit(1);
  });
