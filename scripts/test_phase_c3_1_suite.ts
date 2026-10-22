import fs from 'fs';
import crypto from 'crypto';
import { createClient } from '@libsql/client';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
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
import { CostingEngine } from '../src/core/costing/CostingEngine';
import { InventoryEngine } from '../src/core/inventory/InventoryEngine';

function getSha256(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex').toUpperCase();
}

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    console.error(`  ❌ [FAIL] ${testName}${details ? ` - ${details}` : ''}`);
    throw new Error(`Assertion failed: ${testName}`);
  }
}

async function runTestSuite() {
  console.log('================================================================================');
  console.log('   CITIOX FASE C3.1: BATERÍA COMPLETA DE PRUEBAS EN ENTORNO AISLADO (test_c3_1.db)');
  console.log('================================================================================\n');

  // 0. Preparación del entorno aislado
  const devDbHashPre = getSha256('dev.db');
  console.log(`Hash dev.db pre-test: ${devDbHashPre}`);
  const EXPECTED_DEV_HASH = '190B1EDDA51E135A09D2EAFD74503B3A32AEC55B549F6D7582C9780043DA32D3';
  assert(devDbHashPre === EXPECTED_DEV_HASH, 'dev.db está 100% intacta antes de las pruebas');

  const testDbPath = 'test_c3_1.db';
  fs.copyFileSync('dev.db', testDbPath);
  console.log(`Base aislada creada: ${testDbPath}`);

  const rawPath = `${process.cwd()}/${testDbPath}`.replace(/\\/g, '/');
  const dbUrl = `file:///${rawPath.replace(/^[a-zA-Z]:/, (m) => m.toUpperCase())}`;
  const adapter = new PrismaLibSql({ url: dbUrl });
  const prisma = new PrismaClient({ adapter });

  try {
    // Obtener negocio base de prueba
    const biz = await (prisma as any).negocio.findFirst();
    assert(!!biz, 'Negocio disponible para pruebas');
    const businessId = biz.id;

    // Crear sucursales de prueba aisladas A y B con slug requerido
    const branchA = await (prisma as any).branch.create({
      data: {
        name: 'Sucursal Test A',
        slug: `sucursal-test-a-${Date.now()}`,
        businessId,
        active: true,
        isMain: false
      }
    });
    const branchB = await (prisma as any).branch.create({
      data: {
        name: 'Sucursal Test B',
        slug: `sucursal-test-b-${Date.now()}`,
        businessId,
        active: true,
        isMain: false
      }
    });
    assert(!!branchA && !!branchB, 'Sucursales de prueba A y B creadas');

    // Crear bodegas para Sucursal A y Sucursal B
    const whA = await (prisma as any).warehouse.create({
      data: {
        businessId,
        branchId: branchA.id,
        name: 'Bodega Principal Sucursal A',
        isDefault: true,
        active: true,
        type: 'GENERAL'
      }
    });
    const whB = await (prisma as any).warehouse.create({
      data: {
        businessId,
        branchId: branchB.id,
        name: 'Bodega Principal Sucursal B',
        isDefault: true,
        active: true,
        type: 'GENERAL'
      }
    });
    assert(!!whA && !!whB, 'Bodegas principales para sucursales A y B creadas');

    // Crear producto de prueba
    const prod = await (prisma as any).producto.create({
      data: {
        negocioId: businessId,
        nombre: 'Insumo Test PMP C3.1',
        precio: 10.0,
        stock: 0,
        tipoProducto: 'MATERIA_PRIMA',
        activo: true
      }
    });
    assert(!!prod, 'Producto de prueba creado');

    // -------------------------------------------------------------------------
    // TEST A & B: Catálogo no modifica stock directamente
    // -------------------------------------------------------------------------
    console.log('\n--- BLOQUE 1: EDICIÓN DE CATÁLOGO NO MODIFICA STOCK ---');
    const prodActualizado = await (prisma as any).producto.update({
      where: { id: prod.id },
      data: {
        nombre: 'Insumo Test PMP C3.1 (Renombrado)',
        precio: 12.50
      }
    });
    assert(prodActualizado.nombre === 'Insumo Test PMP C3.1 (Renombrado)', 'Edición de nombre y precio permitida');
    assert(toDecimal(prodActualizado.stock ?? 0).isZero(), 'Edición de catálogo no altera stock (permanece 0)');

    // -------------------------------------------------------------------------
    // TEST H, I, K: PMP Sucursal, Regla Stock Cero, Entradas sucesivas y Decimal
    // -------------------------------------------------------------------------
    console.log('\n--- BLOQUE 2: PMP DE SUCURSAL Y REGLA STOCK CERO ---');
    // Entrada 1 en Sucursal A: 100 kg @ $2.80 sobre stock 0
    await InventoryEngine.recordMovement({
      businessId,
      branchId: branchA.id,
      warehouseId: whA.id,
      productId: prod.id,
      quantity: 100,
      unitCost: 2.80,
      type: 'COMPRA',
      reason: 'Compra inicial lote 1'
    }, prisma);

    const biAPaso1 = await (prisma as any).branchInventory.findFirst({
      where: { branchId: branchA.id, productId: prod.id }
    });
    assert(toDecimal(biAPaso1.stock).equals(toDecimal(100)), 'Sucursal A stock = 100.0000');
    assert(toDecimal(biAPaso1.costoPromedio).equals(toDecimal(2.80)), 'Regla Stock Cero: PMP adopta costo unitario de entrada ($2.800000)');

    // Entrada 2 en Sucursal A: 20 kg @ $3.50
    // Fórmula: (100 * 2.80 + 20 * 3.50) / 120 = (280 + 70) / 120 = 350 / 120 = 2.916667
    await InventoryEngine.recordMovement({
      businessId,
      branchId: branchA.id,
      warehouseId: whA.id,
      productId: prod.id,
      quantity: 20,
      unitCost: 3.50,
      type: 'COMPRA',
      reason: 'Compra segundo lote'
    }, prisma);

    const biAPaso2 = await (prisma as any).branchInventory.findFirst({
      where: { branchId: branchA.id, productId: prod.id }
    });
    assert(toDecimal(biAPaso2.stock).equals(toDecimal(120)), 'Sucursal A stock acumulado = 120.0000');
    assert(toDecimal(biAPaso2.costoPromedio).equals(roundCost(divDecimal(350, 120))), 'PMP ponderado exacto = 2.916667 ($350 / 120)');

    // -------------------------------------------------------------------------
    // TEST PMP CORPORATIVO CONSOLIDADO
    // -------------------------------------------------------------------------
    console.log('\n--- BLOQUE 3: PMP CORPORATIVO CONSOLIDADO ---');
    // En Sucursal B: entrada de 30 kg @ $4.00
    await InventoryEngine.recordMovement({
      businessId,
      branchId: branchB.id,
      warehouseId: whB.id,
      productId: prod.id,
      quantity: 30,
      unitCost: 4.00,
      type: 'COMPRA',
      reason: 'Compra Sucursal B'
    }, prisma);

    // Consolidado esperado:
    // Sucursal A: 120 kg @ 2.916667 = $350.00
    // Sucursal B:  30 kg @ 4.000000 = $120.00
    // Total stock: 150 kg, Total valor: $470.00
    // PMP corporativo: 470 / 150 = 3.133333
    const prodCorp = await (prisma as any).producto.findUnique({
      where: { id: prod.id }
    });
    const expectedCorp = CostingEngine.calculateCorporatePmp([
      { stock: 120, pmp: biAPaso2.costoPromedio, costStatus: 'KNOWN' },
      { stock: 30, pmp: 4.00, costStatus: 'KNOWN' }
    ]);
    assert(toDecimal(prodCorp.stock).equals(toDecimal(150)), 'Producto.stock proyección consolidada = 150.0000');
    assert(toDecimal(prodCorp.costoPromedio).equals(expectedCorp.consolidatedPmp!), `Producto.costoPromedio corporativo exacto = ${expectedCorp.consolidatedPmp?.toString()} (fórmula ponderada de sucursales)`);

    // -------------------------------------------------------------------------
    // TEST D, E, F: Venta POS - Separación de Precio de Venta vs Costo PMP y Branch Scoping
    // -------------------------------------------------------------------------
    console.log('\n--- BLOQUE 4: VENTA POS Y SEPARACIÓN DE COSTO ---');
    // Venta de 10 unidades en Sucursal A a precio de venta $15.00
    // El Kardex debe registrar unitCost = PMP ($2.916667), NUNCA precio de venta ($15.00)
    await InventoryEngine.recordMovement({
      businessId,
      branchId: branchA.id,
      warehouseId: whA.id,
      productId: prod.id,
      quantity: -10,
      type: 'VENTA',
      reason: 'Venta mostrador POS'
    }, prisma);

    const lastMov = await (prisma as any).inventoryMovement.findFirst({
      where: { branchId: branchA.id, productId: prod.id, type: 'VENTA' },
      orderBy: { createdAt: 'desc' }
    });
    assert(toDecimal(lastMov.quantity).equals(toDecimal(-10)), 'Kardex registra salida de 10 unidades');
    assert(toDecimal(lastMov.unitCost).equals(roundCost(biAPaso2.costoPromedio)), 'Venta en Kardex valorizada a PMP de sucursal ($2.916667), NO a precio de venta');
    assert(toDecimal(lastMov.totalCost).equals(roundCost(mulDecimal(10, biAPaso2.costoPromedio))), 'totalCost = cantidad * PMP ($29.166670)');

    // Verificar aislamiento: Venta en Sucursal A no afecta Sucursal B
    const biBPostVenta = await (prisma as any).branchInventory.findFirst({
      where: { branchId: branchB.id, productId: prod.id }
    });
    assert(toDecimal(biBPostVenta.stock).equals(toDecimal(30)), 'Aislamiento: Stock de Sucursal B permanece intacto (30.0000)');

    const whBPostVenta = await (prisma as any).warehouseStock.findFirst({
      where: { warehouseId: whB.id, productId: prod.id }
    });
    assert(toDecimal(whBPostVenta.quantity).equals(toDecimal(30)), 'Aislamiento: Bodega de Sucursal B permanece intacta (30.0000)');

    // -------------------------------------------------------------------------
    // TEST G: Sin Warehouse = Bloqueo de Movimiento
    // -------------------------------------------------------------------------
    console.log('\n--- BLOQUE 5: BLOQUEO ESTRICTO SIN BODEGA VÁLIDA ---');
    let blockedSuccess = false;
    try {
      // Crear sucursal sin bodega configurada
      const branchSinBodega = await (prisma as any).branch.create({
        data: {
          name: 'Sucursal Sin Bodega',
          slug: `sucursal-sin-bodega-${Date.now()}`,
          businessId,
          active: true
        }
      });
      await InventoryEngine.recordMovement({
        businessId,
        branchId: branchSinBodega.id,
        productId: prod.id,
        quantity: -5,
        type: 'VENTA',
        reason: 'Intento de venta sin bodega'
      }, prisma);
    } catch (err: any) {
      console.log('  [DEBUG ERROR CAPTURADO]:', err?.message);
      if (err?.message?.includes('La sucursal no tiene una bodega de inventario configurada')) {
        blockedSuccess = true;
      }
    }
    assert(blockedSuccess, 'Operación sin bodega bloqueada con el error oficial requerido');

    // -------------------------------------------------------------------------
    // TEST J: Política UNKNOWN / PENDING_VALUATION
    // -------------------------------------------------------------------------
    console.log('\n--- BLOQUE 6: POLÍTICA UNKNOWN Y VALORACIÓN CERTIFICADA ---');
    const corpUnknown = CostingEngine.calculateCorporatePmp([
      { stock: 50, pmp: 3.20, costStatus: 'KNOWN' },
      { stock: 20, pmp: null, costStatus: 'UNKNOWN' }
    ]);
    assert(corpUnknown.costStatus === 'PENDING_VALUATION', 'Stock con componente UNKNOWN genera estado PENDING_VALUATION a nivel corporativo');
    assert(toDecimal(corpUnknown.totalStock).equals(toDecimal(50)), 'Solo stock con costo certificado se pondera matemáticamente');

    // -------------------------------------------------------------------------
    // TEST K: Aritmética Decimal de Alta Precisión
    // -------------------------------------------------------------------------
    console.log('\n--- BLOQUE 7: ARITMÉTICA DECIMAL 4 Y 6 DECIMALES ---');
    const d1 = toDecimal('0.4500');
    const d2 = toDecimal('2.500000');
    const d3 = toDecimal('12.35');
    assert(addDecimal(d1, d2).equals(toDecimal('2.950000')), '0.4500 + 2.500000 = 2.950000 exacto');
    assert(mulDecimal(d1, d3).equals(toDecimal('5.5575')), '0.4500 * 12.35 = 5.5575 exacto');

    console.log('\n================================================================================');
    console.log('✅ BATERÍA C3.1 SUPERADA EXITOSAMENTE: TODAS LAS PRUEBAS EN PASS');
    console.log('================================================================================\n');

  } finally {
    await prisma.$disconnect();
    // Limpieza de entorno aislado
    try {
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
        console.log(`Archivo temporal ${testDbPath} eliminado.`);
      }
    } catch (cleanErr: any) {
      console.warn(`[WARN] Limpieza diferida de ${testDbPath}: ${cleanErr?.message}`);
    }
    const devDbHashPost = getSha256('dev.db');
    console.log(`Hash dev.db post-test: ${devDbHashPost}`);
    assert(devDbHashPost === devDbHashPre, 'dev.db PERMANECE 100% INTACTA TRAS LAS PRUEBAS DE C3.1');
  }
}

runTestSuite().catch((err) => {
  console.error('ERROR EN SUITE C3.1:', err);
  process.exit(1);
});
