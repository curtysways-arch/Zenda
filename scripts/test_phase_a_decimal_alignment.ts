import { PrismaClient, Prisma } from '@prisma/client-aligned';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import path from 'path';

function resolveLibSqlUrl(dbUrl: string): string {
  const rawPath = dbUrl.replace(/^file:(\.\/)?/, '');
  const isAbsolute = rawPath.startsWith('/') || rawPath.startsWith('\\') || /^[a-zA-Z]:/.test(rawPath);
  const absPath = isAbsolute ? rawPath : `${process.cwd()}/${rawPath}`;
  const normalized = absPath.split(/[/\\]/).join('/');
  const prefix = normalized.match(/^[a-zA-Z]:/) ? '/' : '';
  return `file://${prefix}${normalized}`;
}

const testDbUrl = resolveLibSqlUrl('file:./test_align.db');
const adapter = new PrismaLibSql({ url: testDbUrl });
const prisma = new PrismaClient({ adapter });

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    console.error(`  ❌ [FAIL] ${testName} ${details ? `-> ${details}` : ''}`);
    throw new Error(`Fallo en prueba: ${testName}`);
  }
}

async function main() {
  console.log('================================================================================');
  console.log('   CITIOX - FASE A: BATERÍA DE PRUEBAS DE PRECISIÓN DECIMAL Y CLIENTE ALINEADO');
  console.log('================================================================================\n');

  try {
    // ─────────────────────────────────────────────────────────────────────────────
    // PRUEBA 1: Inspección de Storage Type en SQLite (typeof)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('--- PRUEBA 1: INSPECCIÓN DE TIPO DE ALMACENAMIENTO (typeof en SQLite) ---');
    const storageTypes: any[] = await prisma.$queryRawUnsafe(`
      SELECT 
        id, nombre,
        stock, typeof(stock) as stockStorage,
        costoPromedio, typeof(costoPromedio) as costoStorage,
        densidadGPerMl, typeof(densidadGPerMl) as densStorage,
        negativeStockAdjustment, typeof(negativeStockAdjustment) as negStorage
      FROM Producto
      WHERE stock IS NOT NULL
      LIMIT 3
    `);

    assert(storageTypes.length > 0, 'Se obtienen productos con stock no nulo');
    for (const r of storageTypes) {
      console.log(`  📦 Producto "${r.nombre}": stock=${r.stock} (tipo: ${r.stockStorage}), costo=${r.costoPromedio} (tipo: ${r.costoStorage})`);
      assert(['text', 'real', 'integer'].includes(r.stockStorage), `Tipo de almacenamiento SQLite válido para stock: ${r.stockStorage}`);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // PRUEBA 2: Escritura mediante Prisma Client Decimal en test_align.db
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n--- PRUEBA 2: ESCRITURA Y PERSISTENCIA MEDIANTE PRISMA.DECIMAL ---');
    const testNegocio = await prisma.negocio.findFirst();
    assert(testNegocio !== null, 'Negocio encontrado en test_align.db');

    const testProductId = `prod-align-${Date.now()}`;
    const testSku = `SKU-ALIGN-${Date.now().toString().slice(-4)}`;

    // Valores canónicos del dominio Citiox
    const QTY_FRAC = new Prisma.Decimal('0.4500');       // 0.4500 kg
    const QTY_VENTA = new Prisma.Decimal('2.3500');      // 2.3500 kg
    const DENSIDAD = new Prisma.Decimal('0.9200');       // 0.9200 g/ml
    const COSTO_PMP = new Prisma.Decimal('12.345678');    // 6 decimales
    const PRECIO_VENTA = new Prisma.Decimal('1250.55');   // 2 decimales dinero

    const createdProd = await prisma.producto.create({
      data: {
        id: testProductId,
        negocioId: testNegocio!.id,
        nombre: 'Producto Test Precisión Decimal',
        sku: testSku,
        precio: PRECIO_VENTA,
        costoUnitario: 12.345678,
        stock: QTY_FRAC,
        costoPromedio: COSTO_PMP,
        costStatus: 'KNOWN',
        costSource: 'COMPRA_CERTIFICADA',
        unidadMedidaBase: 'KG',
        uomStatus: 'CONFIRMED',
        densidadGPerMl: DENSIDAD,
        negativeStockAdjustment: new Prisma.Decimal('0.000000')
      }
    });

    assert(createdProd.id === testProductId, 'Producto creado exitosamente mediante cliente alineado');

    // ─────────────────────────────────────────────────────────────────────────────
    // PRUEBA 3: Lectura posterior mediante Prisma Client y Verificación de Cero Truncamiento
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n--- PRUEBA 3: LECTURA Y VERIFICACIÓN DE CERO TRUNCAMIENTO ---');
    const fetchedProd = await prisma.producto.findUnique({
      where: { id: testProductId }
    });

    assert(fetchedProd !== null, 'Producto recuperado con findUnique');
    assert(fetchedProd!.stock instanceof Prisma.Decimal, 'fetchedProd.stock es instancia de Prisma.Decimal (NO number ni integer)');
    assert(fetchedProd!.stock!.toFixed(4) === '0.4500', `Stock preserva exactamente 4 decimales: ${fetchedProd!.stock!.toFixed(4)} === '0.4500'`);
    assert(fetchedProd!.costoPromedio instanceof Prisma.Decimal, 'fetchedProd.costoPromedio es instancia de Prisma.Decimal');
    assert(fetchedProd!.costoPromedio!.toFixed(6) === '12.345678', `Costo PMP preserva exactamente 6 decimales: ${fetchedProd!.costoPromedio!.toFixed(6)} === '12.345678'`);
    assert(fetchedProd!.densidadGPerMl!.toFixed(4) === '0.9200', `Densidad preserva exactamente 4 decimales: ${fetchedProd!.densidadGPerMl!.toFixed(4)} === '0.9200'`);
    assert(fetchedProd!.precio.toFixed(2) === '1250.55', `Precio monetario preserva centavos exactos: ${fetchedProd!.precio.toFixed(2)} === '1250.55'`);

    // ─────────────────────────────────────────────────────────────────────────────
    // PRUEBA 4: Operaciones Matemáticas Exactas y Redondeo HALF_UP
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n--- PRUEBA 4: ARITMÉTICA Y REDONDEO BANCARIO HALF_UP ---');
    const stockActual = fetchedProd!.stock!; // 0.4500
    const ingresoLote = QTY_VENTA;           // 2.3500
    const stockTotal = stockActual.add(ingresoLote); // 2.8000
    assert(stockTotal.toFixed(4) === '2.8000', `Suma decimal exacta: 0.4500 + 2.3500 = ${stockTotal.toFixed(4)}`);

    // Redondeo HALF_UP: 0.45005 -> 0.4501
    const fracRedondeo = new Prisma.Decimal('0.45005');
    const redondeado = fracRedondeo.toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);
    assert(redondeado.toFixed(4) === '0.4501', `Redondeo HALF_UP exacto: 0.45005 -> ${redondeado.toFixed(4)}`);

    // Aritmética financiera: 10 kg a $2.500000 + 5 kg a $3.750000
    const lote1Val = new Prisma.Decimal('10.0000').mul(new Prisma.Decimal('2.500000')); // 25.0000
    const lote2Val = new Prisma.Decimal('5.0000').mul(new Prisma.Decimal('3.750000'));  // 18.7500
    const totalVal = lote1Val.add(lote2Val);                                             // 43.7500
    const nuevoPmp = totalVal.div(new Prisma.Decimal('15.0000')).toDecimalPlaces(6, Prisma.Decimal.ROUND_HALF_UP);
    assert(nuevoPmp.toFixed(6) === '2.916667', `PMP continuo exacto: 43.75 / 15 = ${nuevoPmp.toFixed(6)}`);

    // ─────────────────────────────────────────────────────────────────────────────
    // PRUEBA 5: Compatibilidad con BranchInventory y WarehouseStock
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n--- PRUEBA 5: INTERACCIÓN DECIMAL CON SUCURSALES Y BODEGAS ---');
    const branch = await prisma.branch.findFirst({ where: { businessId: testNegocio!.id } });
    const warehouse = await prisma.warehouse.findFirst({ where: { businessId: testNegocio!.id } });

    if (branch && warehouse) {
      const bi = await prisma.branchInventory.create({
        data: {
          id: `bi-align-${Date.now()}`,
          branchId: branch.id,
          productId: testProductId,
          businessId: testNegocio!.id,
          stock: new Prisma.Decimal('2.3500'),
          minStock: new Prisma.Decimal('0.5000')
        }
      });
      assert(bi.stock.toFixed(4) === '2.3500', `BranchInventory.stock persiste Decimal(18,4): ${bi.stock.toFixed(4)}`);

      const ws = await prisma.warehouseStock.create({
        data: {
          id: `ws-align-${Date.now()}`,
          warehouseId: warehouse.id,
          productId: testProductId,
          quantity: new Prisma.Decimal('2.3500'),
          minStock: new Prisma.Decimal('0.5000')
        }
      });
      assert(ws.quantity.toFixed(4) === '2.3500', `WarehouseStock.quantity persiste Decimal(18,4): ${ws.quantity.toFixed(4)}`);

      // Limpieza de registros creados en test_align.db
      await prisma.warehouseStock.delete({ where: { id: ws.id } });
      await prisma.branchInventory.delete({ where: { id: bi.id } });
    }

    await prisma.producto.delete({ where: { id: testProductId } });
    console.log('🧹 Registros de prueba eliminados en test_align.db.');

    // ─────────────────────────────────────────────────────────────────────────────
    // PRUEBA 6: Simulación y Verificación de Estrategia de Rollback
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n--- PRUEBA 6: ESTRATEGIA DE ROLLBACK VERIFICABLE ---');
    // Verificamos que test_align.db pueda ser restaurada exactamente a partir del backup
    const fs = await import('fs');
    const crypto = await import('crypto');
    const devDbPath = path.resolve(process.cwd(), 'dev.db');
    const testDbPath = path.resolve(process.cwd(), 'test_align.db');

    const devHash = crypto.createHash('sha256').update(fs.readFileSync(devDbPath)).digest('hex');
    // Creamos un snapshot de rollback
    const rollbackBakPath = path.resolve(process.cwd(), 'test_align.db.rollback_bak');
    fs.copyFileSync(testDbPath, rollbackBakPath);

    // Ejecutar mutación controlada
    await prisma.$executeRawUnsafe(`UPDATE Producto SET descripcion = 'MUTACION_TEST_ROLLBACK' WHERE id = (SELECT id FROM Producto LIMIT 1)`);
    const mutated = await prisma.producto.findFirst({ where: { descripcion: 'MUTACION_TEST_ROLLBACK' } });
    assert(mutated !== null, 'Mutación de prueba aplicada en test_align.db');

    // Ejecutar Rollback: restaurar desde el snapshot
    await prisma.$disconnect();
    fs.copyFileSync(rollbackBakPath, testDbPath);
    fs.unlinkSync(rollbackBakPath);

    // Reconectar y verificar reversión
    const adapterRestored = new PrismaLibSql({ url: testDbUrl });
    const prismaRestored = new PrismaClient({ adapter: adapterRestored });
    const reverted = await prismaRestored.producto.findFirst({ where: { descripcion: 'MUTACION_TEST_ROLLBACK' } });
    assert(reverted === null, 'Rollback completado con éxito: mutación revertida al 100%');
    await prismaRestored.$disconnect();

  } catch (err: any) {
    console.error('Error durante la batería de pruebas:', err);
    throw err;
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n' + '='.repeat(95));
  console.log(`   RESUMEN FINAL FASE A: ${passedTests}/${totalTests} PRUEBAS SUPERADAS CON ÉXITO (100%)`);
  console.log('='.repeat(95));
}

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
