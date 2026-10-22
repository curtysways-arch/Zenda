import { Prisma } from '@prisma/client';
import {
  toDecimal,
  roundQty,
  roundCost,
  roundMoney,
  mulDecimal,
  divDecimal,
  addDecimal,
  subDecimal,
  formatDisplayQty,
  formatDisplayMoney
} from '../src/lib/math/money';
import { UnitConversionService } from '../src/core/inventory/UnitConversionService';
import { CostingEngine } from '../src/core/costing/CostingEngine';
import { InventoryEngine } from '../src/core/inventory/InventoryEngine';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    console.error(`  ❌ [FAIL] ${testName} ${details ? `-> ${details}` : ''}`);
    throw new Error(`Test failed: ${testName}`);
  }
}

async function runTestSuite() {
  console.log('='.repeat(95));
  console.log('   BATERÍA DE PRUEBAS UNITARIAS DE SERVICIOS CORE - FASE 2B');
  console.log('   (SIN MODIFICAR BASE DE DATOS NI ESQUEMA PRISMA)');
  console.log('='.repeat(95));

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Pruebas de Precisión Decimal (money.ts)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n[GRUPO 1] Pruebas de Precisión y Aritmética (money.ts):');

  const qTest = roundQty('0.45005');
  assert(qTest.toString() === '0.4501', 'Redondeo de cantidad a 4 decimales HALF_UP (0.45005 -> 0.4501)');

  const cTest = roundCost('2.5000004');
  assert(cTest.toString() === '2.5', 'Redondeo de costo a 6 decimales');

  const mTest = roundMoney('12.345');
  assert(mTest.toString() === '12.35', 'Redondeo de dinero a 2 decimales HALF_UP ($12.345 -> $12.35)');

  // No residuos binarios
  const sumCheck = addDecimal('0.1', '0.2');
  assert(sumCheck.toString() === '0.3', 'Aritmética exacta: 0.1 + 0.2 = 0.3 sin residuo binario');

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Pruebas de Unidades de Medida (UnitConversionService.ts)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n[GRUPO 2] Pruebas de UOM y Conversiones Canónicas:');

  // Escenario 1: 1000 g -> 1 kg
  const c1 = UnitConversionService.convertQuantity('1000', 'g', 'kg');
  assert(c1.equals(new Prisma.Decimal('1.0000')), '1000 g -> 1 kg exacto', `Obtenido: ${c1.toString()}`);

  // Escenario 2: 0.450 kg -> 450 g
  const c2 = UnitConversionService.convertQuantity('0.450', 'kg', 'g');
  assert(c2.equals(new Prisma.Decimal('450.0000')), '0.450 kg -> 450 g exacto', `Obtenido: ${c2.toString()}`);

  // Escenario 3: 750 ml -> 0.75 L
  const c3 = UnitConversionService.convertQuantity('750', 'ml', 'L');
  assert(c3.equals(new Prisma.Decimal('0.7500')), '750 ml -> 0.75 L exacto', `Obtenido: ${c3.toString()}`);

  // Escenario 4: 1 kg -> L sin densidad -> ERROR
  let threwWithoutDensity = false;
  try {
    UnitConversionService.convertQuantity('1', 'kg', 'L');
  } catch (err: any) {
    threwWithoutDensity = true;
    assert(
      err.message.includes('sin una densidad (g/ml) configurada'),
      '1 kg -> L sin densidad arroja excepción controlada'
    );
  }
  assert(threwWithoutDensity, 'Bloqueo estricto de conversión masa <-> volumen sin densidad');

  // Escenario 5: 1000 ml x densidad 0.92 -> 0.92 kg
  const c5 = UnitConversionService.convertQuantity('1000', 'ml', 'kg', '0.92');
  assert(c5.equals(new Prisma.Decimal('0.9200')), '1000 ml con densidad 0.92 g/ml -> 0.92 kg exacto', `Obtenido: ${c5.toString()}`);

  // Escenario 6: PENDING_REVIEW debe impedir conversiones que requieran UOM confirmada
  let threwPendingReview = false;
  try {
    UnitConversionService.convertToProductBase(
      '500',
      'g',
      {
        productId: 'prod-legacy-1',
        productName: 'Harina Desconocida',
        unidadMedidaBase: 'KG',
        uomStatus: 'PENDING_REVIEW'
      }
    );
  } catch (err: any) {
    threwPendingReview = true;
    assert(
      err.message.includes('PENDING_REVIEW'),
      'convertToProductBase bloquea conversión si uomStatus es PENDING_REVIEW'
    );
  }
  assert(threwPendingReview, 'Protección de PENDING_REVIEW ante conversiones de receta/compra');

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Pruebas de Costo Promedio Ponderado Móvil (CostingEngine.ts)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n[GRUPO 3] Pruebas de Costo Promedio Ponderado (CostingEngine):');

  // Escenario 7: 10 kg x $2.00 + 5 kg x $3.50 -> PMP $2.500000
  const pmpNormal = CostingEngine.calculateIncomingPmp({
    currentStock: '10',
    currentPmp: '2.00',
    incomingQty: '5',
    incomingUnitCost: '3.50',
    costSource: 'PURCHASE'
  });
  assert(
    pmpNormal.newPmp.equals(new Prisma.Decimal('2.500000')),
    'PMP ponderado: 10 kg a $2 + 5 kg a $3.50 = 15 kg a $2.500000',
    `Obtenido: ${pmpNormal.newPmp.toString()}`
  );
  assert(pmpNormal.newStock.equals(new Prisma.Decimal('15.0000')), 'Nuevo stock consolidado: 15.0000 kg');

  // Escenario 8: 200 g consumidos de un PMP de $2.50/kg -> costo $0.50
  // Primero convertimos 200 g a kg canónico
  const qtyBaseKg = UnitConversionService.convertQuantity('200', 'g', 'kg'); // 0.2000 kg
  const costConsumed = mulDecimal(qtyBaseKg, pmpNormal.newPmp);
  assert(
    roundMoney(costConsumed).equals(new Prisma.Decimal('0.50')),
    'Consumo de receta: 200 g (0.2 kg) a $2.50/kg = $0.50 exacto',
    `Obtenido: ${costConsumed.toString()}`
  );

  // Escenario 9: stock 0 + nueva compra -> PMP = costo nuevo
  const pmpZero = CostingEngine.calculateIncomingPmp({
    currentStock: '0',
    currentPmp: '1.20',
    incomingQty: '8',
    incomingUnitCost: '4.80',
    costSource: 'PURCHASE'
  });
  assert(
    pmpZero.newPmp.equals(new Prisma.Decimal('4.800000')),
    'Stock 0 + compra a $4.80 -> Nuevo PMP es $4.800000 exacto',
    `Obtenido: ${pmpZero.newPmp.toString()}`
  );

  // Escenario 10: stock negativo (-10 kg a $2) + compra (20 kg a $3) -> negativeStockAdjustment
  // Déficit = 10 kg. Variación = 10 * ($3 - $2) = $10.00 de ajuste. Remanente = 10 kg a $3.00.
  const pmpNegative = CostingEngine.calculateIncomingPmp({
    currentStock: '-10',
    currentPmp: '2.00',
    incomingQty: '20',
    incomingUnitCost: '3.00',
    costSource: 'PURCHASE'
  });
  assert(
    pmpNegative.negativeStockAdjustment.equals(new Prisma.Decimal('10.000000')),
    'Stock negativo: negativeStockAdjustment = $10.000000 registrado por variación de costo',
    `Obtenido: ${pmpNegative.negativeStockAdjustment.toString()}`
  );
  assert(
    pmpNegative.newPmp.equals(new Prisma.Decimal('3.000000')),
    'Stock negativo compensado: unidades remanentes positivas quedan a $3.000000',
    `Obtenido: ${pmpNegative.newPmp.toString()}`
  );
  assert(
    pmpNegative.newStock.equals(new Prisma.Decimal('10.0000')),
    'Nuevo stock físico tras cubrir déficit: 10.0000 kg'
  );

  // Escenario 11: Devolución de cliente al costo histórico original
  // Stock actual: 10 kg a $3.00 ($30). Cliente devuelve 2 kg vendidos originalmente cuando el costo era $2.00 ($4).
  // Total valor = $34 / 12 kg = $2.833333
  const returnResult = CostingEngine.calculateCustomerReturnPmp({
    currentStock: '10',
    currentPmp: '3.00',
    returnedQty: '2',
    historicalUnitCost: '2.00'
  });
  assert(
    returnResult.newPmp.equals(new Prisma.Decimal('2.833333')),
    'Devolución de cliente reingresa al costo histórico ($2.00) recalculando PMP a $2.833333',
    `Obtenido: ${returnResult.newPmp.toString()}`
  );

  // Escenario 11.B: Bloqueo estricto de insumos con costStatus !== 'KNOWN' o null en producción
  let threwUnknownCost = false;
  try {
    CostingEngine.calculateProductionCost([
      { productId: 'insumo-sin-costo', consumedQty: '2', unitPmp: '0', costStatus: 'UNKNOWN' }
    ], '1');
  } catch (err: any) {
    threwUnknownCost = true;
    assert(
      err.message.includes('Costo no verificado') || err.message.includes('UNKNOWN'),
      'Producción bloquea insumo con costStatus UNKNOWN y prohíbe asumir costo $0'
    );
  }
  assert(threwUnknownCost, 'Protección de costo desconocido en producción');


  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Pruebas de Validación por Vertical (InventoryEngine.validateVerticalQuantity)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n[GRUPO 4] Pruebas de Compatibilidad y Validación por Vertical:');

  // Escenario 12: Lavandería 1.5 pares -> ERROR
  let threwLaundry = false;
  try {
    InventoryEngine.validateVerticalQuantity('1.5', 'LAVANDERIA');
  } catch (err: any) {
    threwLaundry = true;
    assert(
      err.message.includes('LAVANDERIA requiere cantidades enteras'),
      'Lavandería rechaza fracciones no enteras (1.5 pares)'
    );
  }
  assert(threwLaundry, 'Validación vertical Lavandería estricta');

  // Escenario 13: Restaurante 1.000 -> Válido
  const restQty = InventoryEngine.validateVerticalQuantity('1.000', 'RESTAURANTE');
  assert(restQty.equals(new Prisma.Decimal('1.0000')), 'Restaurante acepta 1.000 unidad entera');

  // Escenario 14: Venta pesable 0.450 kg -> Válido
  const cafeQty = InventoryEngine.validateVerticalQuantity('0.450', 'CAFETERIA');
  assert(cafeQty.equals(new Prisma.Decimal('0.4500')), 'Cafetería/Tienda acepta venta pesable fraccionaria (0.450 kg)');

  console.log('\n' + '='.repeat(95));
  console.log(`RESULTADO DE LA BATERÍA FASE 2B: ${passedTests} / ${totalTests} PRUEBAS SUPERADAS (100%)`);
  console.log('='.repeat(95));
}

runTestSuite()
  .catch(err => {
    console.error('Fallo en suite de pruebas:', err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
