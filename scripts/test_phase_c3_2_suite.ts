import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { ProductionEngine } from '../src/core/production/ProductionEngine';
import { InventoryEngine } from '../src/core/inventory/InventoryEngine';
import { CostingEngine } from '../src/core/costing/CostingEngine';
import { RecipeEngine } from '../src/core/recipes/RecipeEngine';
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
  console.log('   CITIOX FASE C3.2: BATERÍA COMPLETA DE PRUEBAS EN ENTORNO AISLADO (test_c3_2.db)');
  console.log('================================================================================\n');

  const devDbHashPre = getSha256('dev.db');
  console.log(`Hash dev.db pre-test: ${devDbHashPre}`);
  assert(
    devDbHashPre === '190B1EDDA51E135A09D2EAFD74503B3A32AEC55B549F6D7582C9780043DA32D3',
    'dev.db está 100% intacta antes de las pruebas'
  );

  const testDbPath = 'test_c3_2.db';
  fs.copyFileSync('dev.db', testDbPath);
  const rawPath = `${process.cwd()}/${testDbPath}`.replace(/\\/g, '/');
  const dbUrl = `file:///${rawPath.replace(/^[a-zA-Z]:/, (m) => m.toUpperCase())}`;
  const adapter = new PrismaLibSql({ url: dbUrl });
  const prisma = new PrismaClient({ adapter });

  try {
    const biz = await (prisma as any).negocio.findFirst();
    assert(!!biz, 'Negocio disponible para pruebas');
    const businessId = biz.id;

    // Crear 2 sucursales de prueba: Sucursal A y Sucursal B
    const branchA = await (prisma as any).branch.create({
      data: {
        name: 'Sucursal A Test C3.2',
        slug: `branch-a-c3-2-${Date.now()}`,
        businessId,
        active: true
      }
    });
    const branchB = await (prisma as any).branch.create({
      data: {
        name: 'Sucursal B Test C3.2',
        slug: `branch-b-c3-2-${Date.now()}`,
        businessId,
        active: true
      }
    });

    // Bodegas para Sucursal A: MP (Origen) y PT (Destino)
    const whSourceA = await (prisma as any).warehouse.create({
      data: {
        name: 'Bodega Materia Prima Sucursal A',
        type: 'RAW_MATERIALS',
        businessId,
        branchId: branchA.id,
        active: true
      }
    });
    const whTargetA = await (prisma as any).warehouse.create({
      data: {
        name: 'Bodega Producto Terminado Sucursal A',
        type: 'FINISHED_GOODS',
        businessId,
        branchId: branchA.id,
        active: true
      }
    });

    // Bodega para Sucursal B
    const whSourceB = await (prisma as any).warehouse.create({
      data: {
        name: 'Bodega Materia Prima Sucursal B',
        type: 'RAW_MATERIALS',
        businessId,
        branchId: branchB.id,
        active: true
      }
    });

    // Insumo MP (Harina Especial)
    const rawIng = await (prisma as any).producto.create({
      data: {
        nombre: 'Harina Especial C3.2',
        negocioId: businessId,
        precio: 5.00,
        tipoProducto: 'MATERIA_PRIMA',
        stock: 0,
        costoPromedio: 2.80,
        costStatus: 'KNOWN'
      }
    });

    // Producto Terminado Elaborado (Pan Artesanal C3.2)
    const finishedProd = await (prisma as any).producto.create({
      data: {
        nombre: 'Pan Artesanal C3.2',
        negocioId: businessId,
        precio: 12.00,
        tipoProducto: 'ELABORADO',
        stock: 0,
        costoPromedio: null,
        costStatus: 'UNKNOWN'
      }
    });

    // Crear Receta: 1 Pan requiere 0.5 kg de Harina
    const recipe = await (prisma as any).recipe.create({
      data: {
        businessId,
        productId: finishedProd.id,
        name: 'Receta Pan Artesanal C3.2',
        yieldQuantity: 1,
        yieldUnit: 'UNIDAD',
        extraCost: 0.50, // Costo indirecto por unidad
        items: {
          create: [
            {
              ingredientId: rawIng.id,
              quantity: 0.5,
              unit: 'KG',
              estimatedCost: 2.80
            }
          ]
        }
      }
    });

    // -------------------------------------------------------------------------
    // TEST A & B: Aislamiento Estricto por Sucursal y Bodega
    // -------------------------------------------------------------------------
    console.log('\n--- CASO A & B: AISLAMIENTO ESTRICTO POR SUCURSAL Y BODEGA ---');
    // Ingresar 100 kg de Harina en Sucursal B (@ $2.80)
    await InventoryEngine.recordMovement({
      businessId,
      branchId: branchB.id,
      warehouseId: whSourceB.id,
      productId: rawIng.id,
      quantity: 100,
      unitCost: 2.80,
      type: 'COMPRA',
      reason: 'Compra para Sucursal B'
    }, prisma);

    // Intentar crear orden en Sucursal A queriendo usar bodega de Sucursal B
    let blockedCrossWarehouse = false;
    try {
      await ProductionEngine.createOrder({
        businessId,
        branchId: branchA.id,
        sourceWarehouseId: whSourceB.id, // Pertenece a Branch B!
        targetWarehouseId: whTargetA.id,
        recipeId: recipe.id,
        targetQuantity: 10
      }, prisma);
    } catch (e: any) {
      if (e.message.includes('no pertenece a la sucursal especificada')) {
        blockedCrossWarehouse = true;
      }
    }
    assert(blockedCrossWarehouse, 'Bloqueo: Bodega de origen de otra sucursal es rechazada estrictamente');

    // -------------------------------------------------------------------------
    // TEST C & D: Disponibilidad Física Exclusiva en sourceWarehouseId (NO Producto.stock)
    // -------------------------------------------------------------------------
    console.log('\n--- CASO C & D: VERDAD FÍSICA EN WAREHOUSE_STOCK (NO Producto.stock) ---');
    // En este momento, Producto.stock global es 100 (por Sucursal B), pero en Sucursal A (whSourceA) es 0!
    const orderA = await ProductionEngine.createOrder({
      businessId,
      branchId: branchA.id,
      sourceWarehouseId: whSourceA.id,
      targetWarehouseId: whTargetA.id,
      recipeId: recipe.id,
      targetQuantity: 20
    }, prisma);
    assert(!!orderA.id, 'Orden OP-1 creada en Sucursal A en estado PLANNED');

    // Iniciar orden
    await ProductionEngine.startOrder(orderA.id, businessId, undefined, prisma);

    // Intentar completar orden en Sucursal A: debe FALLAR por stock insuficiente en bodega origen,
    // a pesar de que Producto.stock global tiene 100 kg en Sucursal B!
    let blockedShortageInWh = false;
    try {
      await ProductionEngine.completeOrder({
        productionOrderId: orderA.id,
        businessId,
        actualQuantity: 20
      }, { client: prisma });
    } catch (e: any) {
      if (e.message.includes('Stock insuficiente en bodega origen')) {
        blockedShortageInWh = true;
      }
    }
    assert(blockedShortageInWh, 'Bloqueo: Falta de existencia física en sourceWarehouseId bloquea producción (ignora Producto.stock)');

    // -------------------------------------------------------------------------
    // TEST E, F, G, H, I: Producción Exitosa, PMP Certificado, Merma y Lote
    // -------------------------------------------------------------------------
    console.log('\n--- CASO E, F, G, H, I: PRODUCCIÓN, PMP CERTIFICADO Y MERMA ---');
    // Abastecer Sucursal A: 40 kg @ $3.00 en whSourceA
    await InventoryEngine.recordMovement({
      businessId,
      branchId: branchA.id,
      warehouseId: whSourceA.id,
      productId: rawIng.id,
      quantity: 40,
      unitCost: 3.00,
      type: 'COMPRA',
      reason: 'Compra inicial Sucursal A'
    }, prisma);

    // Orden de 20 unidades de Pan (requiere 10 kg de Harina)
    // Producción efectiva: 18 unidades terminadas, 2 unidades de merma
    // Harina consumida: 10 kg @ $3.00 PMP = $30.00
    // Costo indirecto: 18 * $0.50 = $9.00
    // Costo total lote: $39.00
    // Costo unitario real: $39.00 / 18 = $2.166667
    const completedA = await ProductionEngine.completeOrder({
      productionOrderId: orderA.id,
      businessId,
      actualQuantity: 18,
      wasteQuantity: 2
    }, { client: prisma });

    assert(completedA.status === 'COMPLETED', 'Orden completada con éxito');
    assert(toDecimal(completedA.unitCostReal).equals(toDecimal('2.166667')), 'unitCostReal calculado exactamente ($2.166667)');
    assert(toDecimal(completedA.actualCost).equals(toDecimal('39.00')), 'actualCost del lote = $39.00');

    // Verificar consumos en bodega origen de Sucursal A: 40 - 10 = 30 kg
    const wsRawA = await (prisma as any).warehouseStock.findFirst({
      where: { warehouseId: whSourceA.id, productId: rawIng.id }
    });
    assert(toDecimal(wsRawA.quantity).equals(toDecimal(30)), 'Materia prima consumida exclusivamente de sourceWarehouseId (30 kg)');

    // Verificar producto terminado en bodega destino de Sucursal A: 18 unidades
    const wsFinishedA = await (prisma as any).warehouseStock.findFirst({
      where: { warehouseId: whTargetA.id, productId: finishedProd.id }
    });
    assert(toDecimal(wsFinishedA.quantity).equals(toDecimal(18)), 'Producto terminado ingresado exclusivamente en targetWarehouseId (18 unidades)');

    // Verificar merma en Kardex: movimiento MERMA_PRODUCCION registrado
    const wasteMov = await (prisma as any).inventoryMovement.findFirst({
      where: {
        businessId,
        productId: finishedProd.id,
        type: 'MERMA_PRODUCCION'
      }
    });
    assert(!!wasteMov, 'Kardex registra movimiento formal MERMA_PRODUCCION');
    assert(toDecimal(wasteMov.quantity).equals(toDecimal(2)), 'Cantidad de merma registrada = 2 unidades');

    // -------------------------------------------------------------------------
    // TEST J & K: Política UNKNOWN / PENDING_VALUATION
    // -------------------------------------------------------------------------
    console.log('\n--- CASO J & K: POLÍTICA UNKNOWN Y PENDING_VALUATION ---');
    // Insumo desconocido sin compras ni PMP registrado
    const unknownIng = await (prisma as any).producto.create({
      data: {
        nombre: 'Ingrediente Misterioso C3.2',
        negocioId: businessId,
        precio: 1.00,
        tipoProducto: 'MATERIA_PRIMA',
        stock: 50,
        costoPromedio: null,
        costStatus: 'UNKNOWN'
      }
    });
    // Cargar existencia física en bodega sin costo valorizado
    await (prisma as any).warehouseStock.create({
      data: {
        warehouseId: whSourceA.id,
        productId: unknownIng.id,
        quantity: 50
      }
    });
    // BranchInventory sin costo
    await (prisma as any).branchInventory.create({
      data: {
        businessId,
        branchId: branchA.id,
        productId: unknownIng.id,
        stock: 50,
        costoPromedio: null
      }
    });

    const recipeUnknown = await (prisma as any).recipe.create({
      data: {
        businessId,
        productId: finishedProd.id,
        name: 'Receta con Ingrediente Desconocido',
        yieldQuantity: 1,
        items: {
          create: [{ ingredientId: unknownIng.id, quantity: 1, estimatedCost: 0 }]
        }
      }
    });

    const orderUnknown = await ProductionEngine.createOrder({
      businessId,
      branchId: branchA.id,
      sourceWarehouseId: whSourceA.id,
      targetWarehouseId: whTargetA.id,
      recipeId: recipeUnknown.id,
      targetQuantity: 5
    }, prisma);

    const completedUnknown = await ProductionEngine.completeOrder({
      productionOrderId: orderUnknown.id,
      businessId,
      actualQuantity: 5
    }, { client: prisma });

    assert(completedUnknown.costStatus === 'PENDING_VALUATION', 'Producción física permitida pero costStatus = PENDING_VALUATION');
    assert(completedUnknown.unitCostReal === null, 'unitCostReal es estrictamente NULL (no asume $0 ni inventa)');
    assert(completedUnknown.actualCost === null, 'actualCost es estrictamente NULL');

    // -------------------------------------------------------------------------
    // TEST M, N, O: Reversión de Producción y Bloqueo de Doble Reversión
    // -------------------------------------------------------------------------
    console.log('\n--- CASO M, N, O: REVERSIÓN AUDITABLE DE PRODUCCIÓN ---');
    // Crear orden limpia para reversión
    const orderRev = await ProductionEngine.createOrder({
      businessId,
      branchId: branchA.id,
      sourceWarehouseId: whSourceA.id,
      targetWarehouseId: whTargetA.id,
      recipeId: recipe.id,
      targetQuantity: 4
    }, prisma);
    await ProductionEngine.completeOrder({
      productionOrderId: orderRev.id,
      businessId,
      actualQuantity: 4
    }, { client: prisma });

    // Reversión física intacta (Caso A)
    const revRes = await ProductionEngine.reverseOrder({
      productionOrderId: orderRev.id,
      businessId,
      reason: 'Error en lote artesanal'
    }, prisma);
    assert(revRes.status === 'REVERSED', 'Orden revertida exitosamente a estado REVERSED');
    assert(revRes.physicalReversedQuantity === 4, 'Reversión física completa de 4 unidades');

    // Doble reversión debe bloquearse
    let blockedDoubleRev = false;
    try {
      await ProductionEngine.reverseOrder({
        productionOrderId: orderRev.id,
        businessId,
        reason: 'Segundo intento'
      }, prisma);
    } catch (e: any) {
      if (e.message.includes('ya ha sido revertida previamente')) {
        blockedDoubleRev = true;
      }
    }
    assert(blockedDoubleRev, 'Protección contra doble reversión activa');

    // -------------------------------------------------------------------------
    // TEST P & Q: Idempotencia y Concurrencia
    // -------------------------------------------------------------------------
    console.log('\n--- CASO P & Q: IDEMPOTENCIA Y PROTECCIÓN DE CONCURRENCIA ---');
    let blockedDoubleComplete = false;
    try {
      await ProductionEngine.completeOrder({
        productionOrderId: completedA.id, // Ya completada antes
        businessId,
        actualQuantity: 18
      }, { client: prisma });
    } catch (e: any) {
      if (e.message.includes('ya ha sido completada previamente')) {
        blockedDoubleComplete = true;
      }
    }
    assert(blockedDoubleComplete, 'Protección contra doble finalización activa');

    // -------------------------------------------------------------------------
    // TEST R: Aritmética Decimal de Alta Precisión
    // -------------------------------------------------------------------------
    console.log('\n--- CASO R: ARITMÉTICA DECIMAL 4 Y 6 DECIMALES ---');
    const p1 = toDecimal('0.4500');
    const p2 = toDecimal('2.500000');
    const p3 = toDecimal('3.054545');
    assert(addDecimal(p1, p2).equals(toDecimal('2.950000')), '0.4500 + 2.500000 = 2.950000 exacto');
    assert(roundCost(p3).equals(toDecimal('3.054545')), '3.054545 preserva 6 decimales de costo');

    console.log('\n================================================================================');
    console.log('✅ BATERÍA C3.2 SUPERADA EXITOSAMENTE: TODAS LAS PRUEBAS EN PASS');
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
    assert(devDbHashPost === devDbHashPre, 'dev.db PERMANECE 100% INTACTA TRAS LAS PRUEBAS DE C3.2');
  }
}

runTestSuite().catch((err) => {
  console.error('ERROR EN SUITE C3.2:', err);
  process.exit(1);
});
