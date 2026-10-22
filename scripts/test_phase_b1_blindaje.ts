import { PrismaClient, Prisma } from '@prisma/client-aligned';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import {
  toDecimal,
  decimalAdd,
  decimalSub,
  decimalMul,
  decimalDiv,
  decimalGt,
  decimalGte,
  decimalLt,
  decimalLte,
  decimalEq,
  decimalIsZero,
  roundQty,
  roundCost,
  roundMoney,
  serializeDecimal,
  formatDisplayQty,
  formatDisplayMoney,
  toVisualNumber
} from '../src/lib/math/decimal.ts';
import { CostingEngine } from '../src/core/costing/CostingEngine.ts';
import { ProductionEngine } from '../src/core/production/ProductionEngine.ts';
import { PricingEngine } from '../src/core/pricing/PricingEngine.ts';

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
let failedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${testName}${details ? ` - ${details}` : ''}`);
  }
}

async function runPhaseB1TestSuite() {
  console.log('================================================================================');
  console.log('   CITIOX - FASE B1: BATERÍA COMPLETA DE VERIFICACIÓN Y BLINDAJE DECIMAL');
  console.log('================================================================================\n');

  // ---------------------------------------------------------------------------------
  // BLOQUE 1: PRECISIÓN FRACCIONARIA Y NO-TRUNCAMIENTO
  // ---------------------------------------------------------------------------------
  console.log('--- BLOQUE 1: PRECISIÓN NUMÉRICA DECIMAL OBLIGATORIA ---');
  const d1 = toDecimal('0.4500');
  const d2 = toDecimal('2.3500');
  const d3 = toDecimal('12.345678');
  const d4 = toDecimal('1250.55');

  assert(d1.toFixed(4) === '0.4500', '0.4500 preserva exactamente 4 decimales');
  assert(d2.toFixed(4) === '2.3500', '2.3500 preserva exactamente 4 decimales');
  assert(d3.toFixed(6) === '12.345678', '12.345678 preserva exactamente 6 decimales de costo');
  assert(d4.toFixed(2) === '1250.55', '1250.55 preserva centavos exactos');

  const sum1 = decimalAdd(d1, d2);
  assert(sum1.toFixed(4) === '2.8000', 'Suma fraccionaria exacta: 0.4500 + 2.3500 = 2.8000');

  const mul1 = decimalMul(d1, d3);
  assert(mul1.toFixed(6) === '5.555555', 'Multiplicación fraccionaria exacta (0.4500 * 12.345678 = 5.555555)');

  // ---------------------------------------------------------------------------------
  // BLOQUE 2: PERSISTENCIA EN BASE DE DATOS AISLADA (test_align.db)
  // ---------------------------------------------------------------------------------
  console.log('\n--- BLOQUE 2: ENTRADA / SALIDA FRACCIONARIA Y KARDEX EN test_align.db ---');
  const negocio = await prisma.negocio.findFirst();
  assert(negocio !== null, 'Negocio disponible en base de prueba aislada');

  if (negocio) {
    const testProductId = `prod-b1-${Date.now()}`;
    const testSku = `SKU-B1-${Date.now().toString().slice(-4)}`;
    const prod = await prisma.producto.create({
      data: {
        id: testProductId,
        negocioId: negocio.id,
        nombre: 'Carne Molida Especial B1',
        sku: testSku,
        precio: new Prisma.Decimal('15.50'),
        costoUnitario: 8.25,
        stock: new Prisma.Decimal('0.0000'),
        costoPromedio: null,
        costStatus: 'KNOWN',
        unidadMedidaBase: 'KG',
        uomStatus: 'CONFIRMED'
      }
    });

    assert(prod.id !== undefined, 'Producto creado para pruebas de inventario fraccionario');

    // 2.1 Entrada Fraccionaria (Compra de 10.4500 kg a $8.250000/kg)
    const entradaQty = new Prisma.Decimal('10.4500');
    const entradaCost = new Prisma.Decimal('8.250000');
    const entradaTotalCost = roundMoney(decimalMul(entradaQty, entradaCost));

    let branch = await prisma.branch.findFirst({ where: { businessId: negocio.id } });
    if (!branch) {
      branch = await prisma.branch.create({
        data: {
          businessId: negocio.id,
          name: 'Sucursal Matriz Test B1',
          code: 'MATRIZ-B1',
          slug: `matriz-b1-${Date.now()}`,
          active: true
        }
      });
    }

    await prisma.inventoryMovement.create({
      data: {
        businessId: negocio.id,
        branchId: branch.id,
        productId: prod.id,
        type: 'ENTRADA',
        quantity: entradaQty,
        unitCost: entradaCost,
        totalCost: entradaTotalCost.toNumber(),
        reason: 'Compra de materia prima lote 1'
      }
    });

    await prisma.producto.update({
      where: { id: prod.id },
      data: {
        stock: entradaQty,
        costoPromedio: entradaCost,
        costoUnitario: 8.25
      }
    });

    const prodPostEntrada = await prisma.producto.findUnique({ where: { id: prod.id } });
    assert(
      prodPostEntrada?.stock?.toFixed(4) === '10.4500',
      'Stock actualizado con entrada fraccionaria exacta (10.4500 kg)'
    );
    assert(
      prodPostEntrada?.costoPromedio?.toFixed(6) === '8.250000',
      'Costo PMP registrado con 6 decimales exactos ($8.250000)'
    );

    // 2.2 Salida Fraccionaria (Consumo de 2.3500 kg en cocina)
    const salidaQty = new Prisma.Decimal('2.3500');
    const stockRestante = decimalSub(prodPostEntrada?.stock || 0, salidaQty);

    await prisma.inventoryMovement.create({
      data: {
        businessId: negocio.id,
        branchId: branch.id,
        productId: prod.id,
        type: 'SALIDA',
        quantity: salidaQty.times(-1),
        unitCost: entradaCost,
        totalCost: roundMoney(decimalMul(salidaQty, entradaCost)).toNumber(),
        reason: 'Consumo fraccionario receta'
      }
    });

    await prisma.producto.update({
      where: { id: prod.id },
      data: { stock: stockRestante }
    });

    const prodPostSalida = await prisma.producto.findUnique({ where: { id: prod.id } });
    assert(
      prodPostSalida?.stock?.toFixed(4) === '8.1000',
      'Stock resultante exacto tras salida fraccionaria (10.4500 - 2.3500 = 8.1000 kg)'
    );

    // 2.3 Auditoría de Kardex
    const kardex = await prisma.inventoryMovement.findMany({
      where: { productId: prod.id },
      orderBy: { createdAt: 'asc' }
    });
    assert(kardex.length === 2, 'Kardex registra exactamente 2 movimientos atómicos');
    assert(kardex[0].quantity.toFixed(4) === '10.4500', 'Kardex mov 1: cantidad 10.4500');
    assert(kardex[1].quantity.toFixed(4) === '-2.3500', 'Kardex mov 2: cantidad -2.3500');

    // Limpieza
    await prisma.inventoryMovement.deleteMany({ where: { productId: prod.id } });
    await prisma.producto.delete({ where: { id: prod.id } });
  }

  // ---------------------------------------------------------------------------------
  // BLOQUE 3: COSTING ENGINE Y PMP CONTABLE
  // ---------------------------------------------------------------------------------
  console.log('\n--- BLOQUE 3: COSTING ENGINE, PMP Y POLÍTICA UNKNOWN ---');
  // 3.1 PMP con compras sucesivas y stock ponderado
  // Saldo previo: 10 uds a $5.00. Ingresan 5 uds a $8.00. Total = (50 + 40)/15 = $6.000000
  const pmpResult1 = CostingEngine.calculateIncomingPmp({
    currentStock: '10.0000',
    currentPmp: '5.000000',
    incomingQty: '5.0000',
    incomingUnitCost: '8.000000',
    costStatus: 'KNOWN',
    costSource: 'PURCHASE'
  });
  assert(pmpResult1.newPmp.toFixed(6) === '6.000000', 'PMP ponderado continuo exacto: (50 + 40) / 15 = $6.000000');
  assert(pmpResult1.newStock.toFixed(4) === '15.0000', 'Stock acumulado exacto: 15.0000 uds');

  // 3.2 Ingreso con stock cero
  const pmpResultZero = CostingEngine.calculateIncomingPmp({
    currentStock: '0.0000',
    currentPmp: null,
    incomingQty: '4.5000',
    incomingUnitCost: '12.345678',
    costStatus: 'KNOWN',
    costSource: 'PURCHASE'
  });
  assert(
    pmpResultZero.newPmp.toFixed(6) === '12.345678',
    'PMP en ingreso con stock cero adopta costo unitario entrante ($12.345678)'
  );

  // 3.3 Política UNKNOWN / PENDING_VALUATION: No debe contaminar PMP con $0
  const pmpUnknown = CostingEngine.calculateIncomingPmp({
    currentStock: '10.0000',
    currentPmp: '5.000000',
    incomingQty: '2.0000',
    incomingUnitCost: null,
    costStatus: 'UNKNOWN',
    costSource: 'INITIAL_INVENTORY'
  });
  assert(
    pmpUnknown.newPmp.toFixed(6) === '5.000000',
    'Ingreso UNKNOWN no contamina PMP existente con $0 ni costo falso'
  );
  assert(
    pmpUnknown.costStatus === 'UNKNOWN',
    'Estado UNKNOWN preservado formalmente'
  );

  // 3.4 PENDING_VALUATION en stock inicial desconocido
  const pmpPending = CostingEngine.calculateIncomingPmp({
    currentStock: '0.0000',
    currentPmp: null,
    incomingQty: '5.0000',
    incomingUnitCost: null,
    costStatus: 'PENDING_VALUATION',
    costSource: 'INITIAL_INVENTORY'
  });
  assert(
    pmpPending.newPmp.isZero(),
    'Producto sin costo histórico queda en base 0 para PENDING_VALUATION'
  );
  assert(
    pmpPending.costStatus === 'PENDING_VALUATION',
    'Estado formal queda PENDING_VALUATION'
  );

  // ---------------------------------------------------------------------------------
  // BLOQUE 4: PRICING ENGINE Y MOTOR DE PEDIDOS
  // ---------------------------------------------------------------------------------
  console.log('\n--- BLOQUE 4: PRICING ENGINE Y MOTOR FINANCIERO DE PEDIDOS ---');
  const pricingInput = {
    items: [
      { productId: 'p1', name: 'Insumo Fraccionario', unitPrice: '12.50', quantity: '0.4500' },
      { productId: 'p2', name: 'Plato Gourmet', unitPrice: '25.00', quantity: '2.0000' }
    ],
    deliveryType: 'PICKUP_ORDER' as const,
    discountAmount: '5.00'
  };
  const pricing = PricingEngine.calculate(pricingInput);

  // Subtotal = (12.50 * 0.4500) + (25.00 * 2.0000) = 5.625 + 50.00 = 55.625 -> redondeo bancario HALF_UP = 55.63
  // Total = 55.63 + 0 (empaque pickup) - 5.00 = 50.63
  assert(pricing.subtotal === 55.63, `Subtotal redondeado HALF_UP exacto ($55.63 vs ${pricing.subtotal})`);
  assert(pricing.total === 50.63, `Total con descuento exacto ($50.63 vs ${pricing.total})`);

  // ---------------------------------------------------------------------------------
  // BLOQUE 5: SERIALIZACIÓN Y CONTRATOS DE API
  // ---------------------------------------------------------------------------------
  console.log('\n--- BLOQUE 5: CONTRATOS DE SERIALIZACIÓN API ---');
  const serializedStock = serializeDecimal('7.6500', 4);
  const serializedPmp = serializeDecimal('2.916667', 6);
  const serializedPrice = serializeDecimal('12.50', 2);
  const visualQty = formatDisplayQty('0.4500', 'kg');
  const visualMoney = formatDisplayMoney('1250.55');

  assert(serializedStock === '7.6500', 'Stock serializado como string exacto: "7.6500"');
  assert(serializedPmp === '2.916667', 'PMP serializado como string exacto: "2.916667"');
  assert(serializedPrice === '12.50', 'Precio serializado como string exacto: "12.50"');
  assert(visualQty === '0.45 kg', 'Cantidad formateada para visualización: "0.45 kg"');
  assert(visualMoney === '$1250.55', 'Dinero formateado para visualización: "$1250.55"');

  // ---------------------------------------------------------------------------------
  // BLOQUE 6: PRODUCTION ENGINE COMPATIBLE CON DECIMAL
  // ---------------------------------------------------------------------------------
  console.log('\n--- BLOQUE 6: PRODUCTION ENGINE ADAPTADO CON DECIMAL ---');
  assert(typeof ProductionEngine.createOrder === 'function', 'ProductionEngine.createOrder disponible');
  assert(typeof ProductionEngine.completeOrder === 'function', 'ProductionEngine.completeOrder disponible');

  console.log('\n================================================================================');
  console.log(`   RESUMEN FINAL FASE B1: ${passedTests}/${totalTests} PRUEBAS SUPERADAS (${failedTests === 0 ? '100% PASS' : 'FALLOS DETECTADOS'})`);
  console.log('================================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runPhaseB1TestSuite().catch(e => {
  console.error('Error fatal en suite B1:', e);
  process.exit(1);
});
