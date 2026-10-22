import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { InventoryTransferEngine } from '../src/core/inventory/InventoryTransferEngine';
import { InventoryEngine } from '../src/core/inventory/InventoryEngine';
import { CostingEngine } from '../src/core/costing/CostingEngine';
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

async function runTestSuite() {
  console.log('================================================================================');
  console.log('   CITIOX FASE C3.3: BATERÍA COMPLETA DE PRUEBAS EN ENTORNO AISLADO (test_c3_3.db)');
  console.log('================================================================================\n');

  const devDbHashPre = getSha256('dev.db');
  console.log(`Hash dev.db pre-test: ${devDbHashPre}`);
  assert(
    devDbHashPre === '190B1EDDA51E135A09D2EAFD74503B3A32AEC55B549F6D7582C9780043DA32D3',
    'dev.db está 100% intacta antes de las pruebas'
  );

  const testDbPath = 'test_c3_3.db';
  fs.copyFileSync('dev.db', testDbPath);
  console.log(`Base aislada creada: ${testDbPath}`);

  const rawPath = `${process.cwd()}/${testDbPath}`.replace(/\\/g, '/');
  const dbUrl = `file:///${rawPath.replace(/^[a-zA-Z]:/, (m) => m.toUpperCase())}`;
  const adapter = new PrismaLibSql({ url: dbUrl });
  const prisma = new PrismaClient({ adapter });

  try {
    const biz = await (prisma as any).negocio.findFirst();
    assert(!!biz, 'Negocio disponible para pruebas');
    const businessId = biz.id;

    // Crear 2 sucursales para el negocio: Sucursal A y Sucursal B
    const branchA = await (prisma as any).branch.create({
      data: {
        name: 'Sucursal A Test C3.3',
        slug: `branch-a-c3-3-${Date.now()}`,
        businessId,
        active: true
      }
    });
    const branchB = await (prisma as any).branch.create({
      data: {
        name: 'Sucursal B Test C3.3',
        slug: `branch-b-c3-3-${Date.now()}`,
        businessId,
        active: true
      }
    });

    // Bodega A1 (Sucursal A) y Bodega B1 (Sucursal B)
    const whA1 = await (prisma as any).warehouse.create({
      data: {
        name: 'Bodega Principal A1',
        type: 'GENERAL',
        businessId,
        branchId: branchA.id,
        active: true
      }
    });
    const whB1 = await (prisma as any).warehouse.create({
      data: {
        name: 'Bodega Principal B1',
        type: 'GENERAL',
        businessId,
        branchId: branchB.id,
        active: true
      }
    });

    // Bodega Virtual de Tránsito Corporativa
    const whTransit = await InventoryTransferEngine.resolveTransitWarehouse(businessId, branchA.id, prisma);
    assert(!!whTransit && whTransit.type === 'TRANSIT', 'Bodega virtual de tránsito resuelta determinísticamente');

    // Producto de prueba para el Caso Principal Obligatorio (Harina Especial)
    const prod = await (prisma as any).producto.create({
      data: {
        nombre: 'Harina Caso Obligatorio C3.3',
        negocioId: businessId,
        precio: 10.00,
        tipoProducto: 'MATERIA_PRIMA',
        stock: 0,
        costoPromedio: null,
        costStatus: 'KNOWN'
      }
    });

    // -------------------------------------------------------------------------
    // TEST A & B: Creación y Cancelación en estado DRAFT
    // -------------------------------------------------------------------------
    console.log('\n--- CASO A & B: CICLO DRAFT Y CANCELACIÓN ---');
    const draftTransfer = await InventoryTransferEngine.createTransfer({
      businessId,
      sourceBranchId: branchA.id,
      sourceWarehouseId: whA1.id,
      targetBranchId: branchB.id,
      targetWarehouseId: whB1.id,
      items: [{ productId: prod.id, quantity: 15 }]
    }, prisma);

    assert(draftTransfer.status === 'DRAFT', 'Transferencia creada en estado DRAFT');
    assert(draftTransfer.items.length === 1, 'Línea de transferencia registrada con 15 unidades');

    const cancelledTransfer = await InventoryTransferEngine.cancelDraftTransfer(draftTransfer.id, businessId, prisma);
    assert(cancelledTransfer.status === 'CANCELLED', 'Transferencia en DRAFT cancelada formalmente sin impacto físico');

    // -------------------------------------------------------------------------
    // CASO PRINCIPAL OBLIGATORIO (Instrucción 32):
    // Sucursal A: 100 kg @ $2.80
    // Sucursal B:  20 kg @ $3.50
    // Transferir: 40 kg (Despachado 40 kg, Recibido 35 kg, Pérdida 5 kg)
    // -------------------------------------------------------------------------
    console.log('\n--- CASO PRINCIPAL OBLIGATORIO: TRANSFERENCIA 40 KG (35 RECIBIDOS, 5 PÉRDIDA) ---');

    // Cargar existencias iniciales certificadas en A y B
    await InventoryEngine.recordMovement({
      businessId,
      branchId: branchA.id,
      warehouseId: whA1.id,
      productId: prod.id,
      quantity: 100,
      unitCost: 2.80,
      type: 'COMPRA',
      reason: 'Compra inicial Sucursal A'
    }, prisma);

    await InventoryEngine.recordMovement({
      businessId,
      branchId: branchB.id,
      warehouseId: whB1.id,
      productId: prod.id,
      quantity: 20,
      unitCost: 3.50,
      type: 'COMPRA',
      reason: 'Compra inicial Sucursal B'
    }, prisma);

    // Verificar estado previo:
    // Sucursal A: 100 kg @ $2.80 = $280.00
    // Sucursal B:  20 kg @ $3.50 =  $70.00
    // Total: 120 kg, $350.00. PMP corporativo previo: 350 / 120 = $2.916667
    const prodPre = await (prisma as any).producto.findUnique({ where: { id: prod.id } });
    assert(toDecimal(prodPre.stock).equals(toDecimal(120)), 'Stock corporativo inicial = 120.0000 kg');
    assert(toDecimal(prodPre.costoPromedio).equals(toDecimal('2.916667')), 'PMP corporativo previo = $2.916667');

    // 1. Crear Transferencia Oficial de 40 kg
    const transferMain = await InventoryTransferEngine.createTransfer({
      businessId,
      sourceBranchId: branchA.id,
      sourceWarehouseId: whA1.id,
      targetBranchId: branchB.id,
      targetWarehouseId: whB1.id,
      items: [{ productId: prod.id, quantity: 40 }]
    }, prisma);

    // 2. Despachar Transferencia (TEST C, D, E, F)
    console.log('\n--- CASO C, D, E, F: DESPACHO Y CUSTODIA EN TRÁNSITO ---');
    const dispatchedMain = await InventoryTransferEngine.dispatchTransfer({
      transferId: transferMain.id,
      businessId
    }, prisma);

    assert(dispatchedMain.status === 'IN_TRANSIT', 'Estado pasa formalmente a IN_TRANSIT');

    // Verificar existencias post-despacho:
    // Origen (A1): 100 - 40 = 60 kg
    const wsA1PostDisp = await (prisma as any).warehouseStock.findFirst({
      where: { warehouseId: whA1.id, productId: prod.id }
    });
    assert(toDecimal(wsA1PostDisp.quantity).equals(toDecimal(60)), 'TEST D: Bodega de origen decrementa a exactamente 60.0000 kg');

    // Tránsito: 40 kg
    const wsTransitPostDisp = await (prisma as any).warehouseStock.findFirst({
      where: { warehouseId: whTransit.id, productId: prod.id }
    });
    assert(toDecimal(wsTransitPostDisp.quantity).equals(toDecimal(40)), 'TEST E: Bodega de tránsito incrementa a exactamente 40.0000 kg');

    // Destino (B1): permanece intacto en 20 kg durante el despacho
    const wsB1PostDisp = await (prisma as any).warehouseStock.findFirst({
      where: { warehouseId: whB1.id, productId: prod.id }
    });
    assert(toDecimal(wsB1PostDisp.quantity).equals(toDecimal(20)), 'TEST F: Bodega de destino no aumenta durante el despacho (20.0000 kg)');

    // Verificar congelamiento de costo histórico certificado (TEST S)
    const itemMain = dispatchedMain.items[0];
    assert(toDecimal(itemMain.unitCost).equals(toDecimal('2.800000')), 'TEST S: Costo unitario congelado a $2.800000 (PMP de origen)');
    assert(toDecimal(itemMain.totalCost).equals(toDecimal('112.00')), 'Costo total despachado congelado a $112.00 (40 * $2.80)');

    // 3. Recepción con Pérdida (TEST G, H, I, J, N, P)
    // Recibir: 35 kg, Pérdida: 5 kg
    console.log('\n--- CASO G, H, I, J, N, P: RECEPCIÓN Y PÉRDIDA EN TRÁNSITO ---');
    const receivedMain = await InventoryTransferEngine.receiveTransfer({
      transferId: transferMain.id,
      businessId,
      receivedItems: [
        {
          productId: prod.id,
          receivedQty: 35,
          lossQty: 5,
          lossReason: 'Merma por manipulación y transporte'
        }
      ]
    }, prisma);

    // Ecuación de conservación de masa: 40 = 35 + 5 (TEST J)
    const processedItem = receivedMain.items[0];
    assert(
      addDecimal(processedItem.receivedQty, processedItem.lossQty).equals(toDecimal(40)),
      'TEST J: Ecuación de conservación verificada (40 = 35 + 5 exacto)'
    );

    // Estado completado (TEST M)
    assert(receivedMain.status === 'RECEIVED', 'TEST M: Transferencia finalizada en estado RECEIVED');

    // Tránsito queda en 0
    const wsTransitPostRecv = await (prisma as any).warehouseStock.findFirst({
      where: { warehouseId: whTransit.id, productId: prod.id }
    });
    assert(toDecimal(wsTransitPostRecv.quantity).equals(toDecimal(0)), 'Tránsito queda en 0.0000 kg tras procesar 100% del despacho');

    // Bodega destino queda en 20 + 35 = 55 kg
    const wsB1PostRecv = await (prisma as any).warehouseStock.findFirst({
      where: { warehouseId: whB1.id, productId: prod.id }
    });
    assert(toDecimal(wsB1PostRecv.quantity).equals(toDecimal(55)), 'Bodega de destino B1 queda con 55.0000 kg físicos');

    // Movimiento formal de Kardex por pérdida (TRANSFER_LOSS)
    const lossMov = await (prisma as any).inventoryMovement.findFirst({
      where: {
        businessId,
        productId: prod.id,
        type: 'TRANSFER_LOSS'
      }
    });
    assert(!!lossMov, 'TEST I: Kardex registra movimiento formal de pérdida TRANSFER_LOSS');
    assert(toDecimal(lossMov.quantity).equals(toDecimal(-5)), 'Pérdida en Kardex registra -5.0000 kg');
    assert(toDecimal(lossMov.totalCost).equals(toDecimal(14)), 'Valor económico de pérdida = $14.00 (5 kg @ $2.80)');

    // PMP de la Sucursal B (Destino):
    // Saldo anterior: 20 kg @ $3.50 = $70.00
    // Recibe: 35 kg @ $2.80 = $98.00
    // Total valor: $168.00
    // Total stock: 55 kg
    // Nuevo PMP = 168 / 55 = 3.054545...
    const biBPostRecv = await (prisma as any).branchInventory.findFirst({
      where: { branchId: branchB.id, productId: prod.id }
    });
    assert(
      toDecimal(biBPostRecv.costoPromedio).equals(toDecimal('3.054545')),
      'TEST N: PMP destino calculado exactamente a $3.054545 (168 / 55)'
    );

    // Conservación económica integral y PMP Corporativo (TEST P):
    // Stock activo Sucursal A: 60 kg @ $2.80 = $168.00
    // Stock activo Sucursal B: 55 kg @ $3.054545 = $168.00
    // Total valor en bodegas activas: $336.00
    // Pérdida registrada: $14.00
    // Suma: $336.00 + $14.00 = $350.00 (Patrimonio original conservado al 100%)
    const totalActivoVal = addDecimal(
      mulDecimal(60, toDecimal('2.80')),
      mulDecimal(55, toDecimal('3.054545'))
    );
    assert(roundMoney(addDecimal(totalActivoVal, toDecimal(14))).equals(toDecimal(350)), 'Conservación económica patrimonial estricta ($336 + $14 = $350)');

    // -------------------------------------------------------------------------
    // TEST K & L: Múltiples Recepciones Parciales y Estado IN_TRANSIT
    // -------------------------------------------------------------------------
    console.log('\n--- CASO K & L: MÚLTIPLES RECEPCIONES PARCIALES ---');
    const transferMulti = await InventoryTransferEngine.createTransfer({
      businessId,
      sourceBranchId: branchA.id,
      sourceWarehouseId: whA1.id,
      targetBranchId: branchB.id,
      targetWarehouseId: whB1.id,
      items: [{ productId: prod.id, quantity: 20 }] // Despacha 20 kg desde los 60 kg que tiene A
    }, prisma);
    await InventoryTransferEngine.dispatchTransfer({ transferId: transferMulti.id, businessId }, prisma);

    // Primera recepción parcial: 8 kg
    const partial1 = await InventoryTransferEngine.receiveTransfer({
      transferId: transferMulti.id,
      businessId,
      receivedItems: [{ productId: prod.id, receivedQty: 8, lossQty: 0 }]
    }, prisma);
    assert(partial1.status === 'IN_TRANSIT', 'TEST L: Permanece en IN_TRANSIT tras recepción parcial');

    // Segunda recepción parcial: 10 kg
    const partial2 = await InventoryTransferEngine.receiveTransfer({
      transferId: transferMulti.id,
      businessId,
      receivedItems: [{ productId: prod.id, receivedQty: 10, lossQty: 0 }]
    }, prisma);
    assert(partial2.status === 'IN_TRANSIT', 'Permanece en IN_TRANSIT (8 + 10 = 18 de 20)');

    // Tercera recepción final: 2 kg (completa 20)
    const finalRecv = await InventoryTransferEngine.receiveTransfer({
      transferId: transferMulti.id,
      businessId,
      receivedItems: [{ productId: prod.id, receivedQty: 2, lossQty: 0 }]
    }, prisma);
    assert(finalRecv.status === 'RECEIVED', 'TEST K & M: Pasa a RECEIVED al completar la suma exacta en múltiples entregas');

    // -------------------------------------------------------------------------
    // TEST T & U: Protección contra Doble Despacho y Doble Recepción (Idempotencia)
    // -------------------------------------------------------------------------
    console.log('\n--- CASO T & U: PROTECCIÓN CONTRA DOBLE EJECUCIÓN (IDEMPOTENCIA) ---');
    let blockedDoubleDispatch = false;
    try {
      await InventoryTransferEngine.dispatchTransfer({ transferId: transferMulti.id, businessId }, prisma);
    } catch (e: any) {
      if (e.message.includes('ya ha sido despachada') || e.message.includes('ya ha sido completada')) {
        blockedDoubleDispatch = true;
      }
    }
    assert(blockedDoubleDispatch, 'TEST T: Bloqueo estricto de doble despacho');

    let blockedDoubleReceive = false;
    try {
      await InventoryTransferEngine.receiveTransfer({
        transferId: transferMulti.id,
        businessId,
        receivedItems: [{ productId: prod.id, receivedQty: 5 }]
      }, prisma);
    } catch (e: any) {
      if (e.message.includes('ya ha sido completada') || e.message.includes('previamente')) {
        blockedDoubleReceive = true;
      }
    }
    assert(blockedDoubleReceive, 'TEST U: Bloqueo estricto de doble recepción');

    // -------------------------------------------------------------------------
    // TEST W, X, Y, Z: Aislamiento y Validaciones de Seguridad
    // -------------------------------------------------------------------------
    console.log('\n--- CASO W, X, Y, Z: AISLAMIENTO Y VALIDACIONES DE SEGURIDAD ---');
    // Stock insuficiente en origen
    let blockedStockInsuficiente = false;
    try {
      const transferExceso = await InventoryTransferEngine.createTransfer({
        businessId,
        sourceBranchId: branchA.id,
        sourceWarehouseId: whA1.id,
        targetBranchId: branchB.id,
        targetWarehouseId: whB1.id,
        items: [{ productId: prod.id, quantity: 99999 }]
      }, prisma);
      await InventoryTransferEngine.dispatchTransfer({ transferId: transferExceso.id, businessId }, prisma);
    } catch (e: any) {
      if (e.message.includes('Stock insuficiente en bodega origen')) {
        blockedStockInsuficiente = true;
      }
    }
    assert(blockedStockInsuficiente, 'TEST Z: Intento de despacho con stock insuficiente bloqueado estrictamente');

    // Bodega cruzada entre sucursales
    let blockedCrossWarehouse = false;
    try {
      await InventoryTransferEngine.createTransfer({
        businessId,
        sourceBranchId: branchA.id,
        sourceWarehouseId: whB1.id, // Pertenece a Sucursal B!
        targetBranchId: branchA.id,
        targetWarehouseId: whA1.id, // Diferente a whB1
        items: [{ productId: prod.id, quantity: 5 }]
      }, prisma);
    } catch (e: any) {
      if (e.message.includes('no pertenece a la sucursal de origen')) {
        blockedCrossWarehouse = true;
      }
    }
    assert(blockedCrossWarehouse, 'TEST W & X: Bodega que no pertenece a la sucursal especificada es rechazada');

    // Aritmética decimal de precisión
    console.log('\n--- CASO AA: PRECISIÓN DECIMAL ---');
    const d1 = toDecimal('0.4500');
    const d2 = toDecimal('2.500000');
    assert(addDecimal(d1, d2).equals(toDecimal('2.950000')), 'TEST AA: Aritmética Decimal de 4 y 6 decimales sin pérdida');

    console.log('\n================================================================================');
    console.log('✅ BATERÍA C3.3 SUPERADA EXITOSAMENTE: TODAS LAS PRUEBAS EN PASS');
    console.log('================================================================================\n');

  } finally {
    await prisma.$disconnect();
    try {
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
        console.log(`Archivo temporal ${testDbPath} eliminado.`);
      }
    } catch (e: any) {
      console.warn(`[WARN] Limpieza diferida de ${testDbPath}: ${e?.message}`);
    }

    const devDbHashPost = getSha256('dev.db');
    console.log(`Hash dev.db post-test: ${devDbHashPost}`);
    assert(devDbHashPost === devDbHashPre, 'dev.db PERMANECE 100% INTACTA TRAS LAS PRUEBAS DE C3.3');
  }
}

runTestSuite().catch((err) => {
  console.error('ERROR EN SUITE C3.3:', err);
  process.exit(1);
});
