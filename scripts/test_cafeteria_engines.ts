// scripts/test_cafeteria_engines.ts
// Suite de verificación automatizada e integral para Citiox:
// - Vertical Cafetería / Panadería
// - Motores empresariales: Caja & Relevo, Inventario Multi-almacén, Compras, Recetas, Producción, Costeo, Facturación SRI y Nómina IESS.

import { prisma } from '../src/lib/prisma';
import { CashSessionService } from '../src/core/cash/CashSessionService';
import { InventoryEngine } from '../src/core/inventory/InventoryEngine';
import { PurchaseEngine } from '../src/core/purchases/PurchaseEngine';
import { RecipeEngine } from '../src/core/recipes/RecipeEngine';
import { ProductionEngine } from '../src/core/production/ProductionEngine';
import { CostingEngine } from '../src/core/costing/CostingEngine';
import { ElectronicBillingService } from '../src/core/billing/ElectronicBillingService';
import { PayrollService } from '../src/core/payroll/PayrollService';

async function runIntegrationSuite() {
  console.log('====================================================');
  console.log('🚀 INICIANDO SUITE DE PRUEBAS: MOTORES CITIOX');
  console.log('====================================================\n');

  // 1. Obtener o crear negocio de prueba
  let negocio = await prisma.negocio.findFirst({
    where: { tipoNegocio: 'CAFETERIA' }
  });

  if (!negocio) {
    negocio = await prisma.negocio.create({
      data: {
        id: crypto.randomUUID(),
        nombre: 'Cafetería & Panadería La Tradicional',
        slug: 'cafe-tradicional-' + Date.now(),
        tipoNegocio: 'CAFETERIA',
        emailContacto: 'contacto@cafetradicional.com',
        precioHora: 0,
        horarioApertura: '07:00',
        horarioCierre: '21:00',
        updatedAt: new Date()
      }
    });
  }

  // 2. Obtener o crear usuarios cajeros
  let cajeroA = await prisma.usuario.findFirst({
    where: { negocioId: negocio.id, role: 'CASHIER' }
  });
  if (!cajeroA) {
    cajeroA = await prisma.usuario.create({
      data: {
        id: crypto.randomUUID(),
        nombre: 'Carlos Cajero A',
        email: `cajeroA_${Date.now()}@test.com`,
        password: 'hash',
        role: 'CASHIER',
        negocioId: negocio.id,
        updatedAt: new Date()
      }
    });
  }

  let cajeroB = await prisma.usuario.findFirst({
    where: { negocioId: negocio.id, role: 'STAFF', id: { not: cajeroA.id } }
  });
  if (!cajeroB) {
    cajeroB = await prisma.usuario.create({
      data: {
        id: crypto.randomUUID(),
        nombre: 'Beatriz Cajera B',
        email: `cajeroB_${Date.now()}@test.com`,
        password: 'hash',
        role: 'STAFF',
        negocioId: negocio.id,
        updatedAt: new Date()
      }
    });
  }

  console.log(`✅ Negocio preparado: ${negocio.nombre} (${negocio.id})`);
  console.log(`✅ Cajero A: ${cajeroA.nombre} | Cajero B: ${cajeroB.nombre}\n`);

  // ====================================================
  // TEST 1: CAJA MONETARIA, MOVIMIENTOS, ARQUEO Y RELEVO
  // ====================================================
  console.log('--- TEST 1: MOTOR DE CAJA & SESIONES ---');
  // Cerrar cualquier sesión previa abierta
  const prevSession = await prisma.cashRegisterSession.findFirst({
    where: { businessId: negocio.id, status: 'OPEN' }
  });
  if (prevSession) {
    await prisma.cashRegisterSession.update({
      where: { id: prevSession.id },
      data: { status: 'CLOSED', closedAt: new Date() }
    });
  }

  // Apertura de turno con $50.00
  const session1 = await CashSessionService.openSession({
    businessId: negocio.id,
    openedBy: cajeroA.nombre || 'Carlos Cajero A',
    openingAmount: 50.00,
    notes: 'Apertura de turno matutino'
  });
  console.log(`1.1 Caja abierta con ID: ${session1.id}, Fondo inicial: $${session1.openingAmount}`);
  if (session1.openingAmount !== 50.00 || session1.status !== 'OPEN') {
    throw new Error('Falla en apertura de caja');
  }

  // Movimiento manual: Salida de $10 para cambio de monedas
  await CashSessionService.recordMovement({
    sessionId: session1.id,
    businessId: negocio.id,
    type: 'EGRESO_GASTO',
    amount: 10.00,
    concept: 'Compra de papel térmico para tickets',
    userName: cajeroA.nombre || 'Carlos Cajero A'
  });

  // Movimiento manual: Ingreso de $5 extra
  await CashSessionService.recordMovement({
    sessionId: session1.id,
    businessId: negocio.id,
    type: 'INGRESO_MANUAL',
    amount: 5.00,
    concept: 'Ingreso monedas adicionales',
    userName: cajeroA.nombre || 'Carlos Cajero A'
  });

  const summaryBefore = await CashSessionService.calculateSessionSummary(session1.id);
  console.log(`1.2 Total esperado calculado: $${summaryBefore.expectedCash} (50 - 10 + 5 = 45)`);
  if (summaryBefore.expectedCash !== 45.00) {
    throw new Error(`Total esperado incorrecto: ${summaryBefore.expectedCash} != 45.00`);
  }

  // Relevo de cajero: Cajero A entrega $45, Cajero B asume con $45
  const handover = await CashSessionService.shiftHandover({
    currentSessionId: session1.id,
    businessId: negocio.id,
    outgoingCashier: cajeroA.nombre || 'Carlos Cajero A',
    incomingCashier: cajeroB.nombre || 'Beatriz Cajera B',
    cashCounted: 45.00,
    newOpeningAmount: 45.00,
    notes: 'Relevo de almuerzo sin novedades'
  });
  console.log(`1.3 Relevo exitoso: Sesión anterior cerrada (${handover.closedSession.status}), Nueva sesión: ${handover.newSession.id} con fondo $${handover.newSession.openingAmount}`);

  // Cierre final del nuevo turno con Cajero B contando $47 (Sobrante de $2)
  const closeFinal = await CashSessionService.closeSession({
    sessionId: handover.newSession.id,
    businessId: negocio.id,
    closedBy: cajeroB.nombre || 'Beatriz Cajera B',
    cashCounted: 47.00,
    notes: 'Cierre Z nocturno'
  });
  console.log(`1.4 Cierre Z completado. Diferencia calculada: $${closeFinal.difference} (Sobrante: +$2.00)`);
  if (closeFinal.difference !== 2.00) {
    throw new Error(`Diferencia de cierre errónea: ${closeFinal.difference}`);
  }
  console.log('✅ TEST 1: Caja y Arqueo APROBADO.\n');

  // ====================================================
  // TEST 2: MULTI-BODEGAS & COMPRAS A PROVEEDORES
  // ====================================================
  console.log('--- TEST 2: COMPRAS, PROVEEDORES & BODEGAS ---');
  let bodegaCentral = await prisma.warehouse.findFirst({
    where: { businessId: negocio.id, code: 'BOD-CENTRAL' }
  });
  if (!bodegaCentral) {
    bodegaCentral = await prisma.warehouse.create({
      data: {
        businessId: negocio.id,
        name: 'Bodega Principal de Materias Primas',
        code: 'BOD-CENTRAL',
        isDefault: true
      }
    });
  }

  // Crear o buscar proveedor
  let proveedorHarina = await prisma.supplier.findFirst({
    where: { businessId: negocio.id, taxId: '1792345678001' }
  });
  if (!proveedorHarina) {
    proveedorHarina = await PurchaseEngine.upsertSupplier({
      businessId: negocio.id,
      name: 'Molinos del Valle S.A.',
      taxId: '1792345678001',
      email: 'ventas@molinosvalle.com',
      phone: '0991234567'
    });
  }

  // Crear materia prima: Harina Especial (KG)
  let harina = await prisma.producto.findFirst({
    where: { negocioId: negocio.id, nombre: 'Harina de Trigo Especial' }
  });
  if (!harina) {
    harina = await prisma.producto.create({
      data: {
        negocioId: negocio.id,
        nombre: 'Harina de Trigo Especial',
        tipoProducto: 'MATERIA_PRIMA',
        unidadMedida: 'KG',
        precio: 1.50,
        costoUnitario: 0.80,
        stock: 0
      }
    });
  }

  // Crear materia prima: Café en Grano Tostado (KG)
  let cafeGrano = await prisma.producto.findFirst({
    where: { negocioId: negocio.id, nombre: 'Café de Especialidad Grano' }
  });
  if (!cafeGrano) {
    cafeGrano = await prisma.producto.create({
      data: {
        negocioId: negocio.id,
        nombre: 'Café de Especialidad Grano',
        tipoProducto: 'MATERIA_PRIMA',
        unidadMedida: 'KG',
        precio: 15.00,
        costoUnitario: 9.00,
        stock: 0
      }
    });
  }

  // Crear y recibir orden de compra
  const orderCompra = await PurchaseEngine.createPurchaseOrder({
    businessId: negocio.id,
    supplierId: proveedorHarina.id,
    warehouseId: bodegaCentral.id,
    invoiceNumber: 'FAC-001-002-000456',
    items: [
      { productId: harina.id, productName: harina.nombre, unit: 'KG', quantity: 50, unitCost: 0.85 },
      { productId: cafeGrano.id, productName: cafeGrano.nombre, unit: 'KG', quantity: 10, unitCost: 9.20 }
    ],
    notes: 'Pedido mensual de harinas y granos'
  });

  const orderRecibida = await PurchaseEngine.receivePurchase(
    orderCompra.id,
    negocio.id,
    'Tester Citiox'
  );
  console.log(`2.1 Orden de compra recibida: #${orderRecibida.invoiceNumber || orderRecibida.id.slice(0, 8)}, Estado: ${orderRecibida.status}`);

  // Verificar stock actualizado
  const harinaActualizada = await prisma.producto.findUnique({ where: { id: harina.id } });
  const cafeActualizado = await prisma.producto.findUnique({ where: { id: cafeGrano.id } });
  console.log(`2.2 Stock Harina: ${harinaActualizada?.stock} KG, Stock Café: ${cafeActualizado?.stock} KG`);
  if ((harinaActualizada?.stock || 0) < 50 || (cafeActualizado?.stock || 0) < 10) {
    throw new Error('Stock no ingresado correctamente tras recepción de compra');
  }
  console.log('✅ TEST 2: Compras y Bodegas APROBADO.\n');

  // ====================================================
  // TEST 3: RECETAS, DETECCIÓN DE CICLOS & ESCALABILIDAD
  // ====================================================
  console.log('--- TEST 3: RECETAS & FORMULACIONES ---');
  // Crear producto final: Croissant Horneado
  let croissant = await prisma.producto.findFirst({
    where: { negocioId: negocio.id, nombre: 'Croissant Francés Mantequilla' }
  });
  if (!croissant) {
    croissant = await prisma.producto.create({
      data: {
        negocioId: negocio.id,
        nombre: 'Croissant Francés Mantequilla',
        tipoProducto: 'PRODUCTO_ELABORADO',
        unidadMedida: 'UND',
        precio: 2.25,
        stock: 0
      }
    });
  }

  // Crear receta de Croissants (Rendimiento 10 unidades usan 1.5 KG de harina)
  const recetaCroissant = await RecipeEngine.upsertRecipe({
    businessId: negocio.id,
    productId: croissant.id,
    name: 'Receta Croissant Clásico',
    yieldQuantity: 10,
    yieldUnit: 'UND',
    prepTimeMin: 45,
    ingredients: [
      { ingredientId: harina.id, quantity: 1.5, unit: 'KG' }
    ]
  });
  console.log(`3.1 Receta creada: ${recetaCroissant.name}, Rendimiento: ${recetaCroissant.yieldQuantity} unidades`);

  // Validar escalado de receta para producir 50 croissants
  const escalado = RecipeEngine.scaleRecipe(recetaCroissant, 50);
  console.log(`3.2 Ingredientes escalados para 50 unidades: Harina requerida = ${escalado.ingredients[0].scaledQuantity} KG (1.5 * 5 = 7.5)`);
  if (escalado.ingredients[0].scaledQuantity !== 7.5) {
    throw new Error('Cálculo de escalado incorrecto');
  }

  // Validar prevención de ciclos recursivos (un producto no puede ser su propio ingrediente)
  const tieneCiclo = await RecipeEngine.checkForCycles(croissant.id, [croissant.id]);
  console.log(`3.3 Protección contra recetas cíclicas: ${tieneCiclo ? 'PROTEGIDO' : 'FALLA'}`);
  if (!tieneCiclo) {
    throw new Error('El sistema debió bloquear la receta cíclica');
  }
  console.log('✅ TEST 3: Recetas y Detección de Ciclos APROBADO.\n');

  // ====================================================
  // TEST 4: ÓRDENES DE PRODUCCIÓN & CONSUMO ATÓMICO
  // ====================================================
  console.log('--- TEST 4: ORDEN DE PRODUCCIÓN ---');
  const stockHarinaAntes = (await prisma.producto.findUnique({ where: { id: harina.id } }))?.stock || 0;
  const stockCroissantAntes = (await prisma.producto.findUnique({ where: { id: croissant.id } }))?.stock || 0;

  // Planificar orden de producción de 20 croissants (consume 3.0 KG de harina)
  const ordenProd = await ProductionEngine.createOrder({
    businessId: negocio.id,
    recipeId: recetaCroissant.id,
    targetQuantity: 20,
    targetWarehouseId: bodegaCentral.id,
    notes: 'Tanda de mañana'
  });
  console.log(`4.1 Orden de producción creada: #${ordenProd.code}`);

  // Iniciar producción
  await ProductionEngine.startOrder(ordenProd.id, negocio.id);

  // Completar producción de 20 croissants
  const ordenCompletada = await ProductionEngine.completeOrder({
    productionOrderId: ordenProd.id,
    businessId: negocio.id,
    actualQuantity: 20
  });
  console.log(`4.2 Orden completada: Estado ${ordenCompletada.status}, Costo total: $${(ordenCompletada.actualCost || 0).toFixed(2)}, Costo Unitario: $${(ordenCompletada.unitCostReal || 0).toFixed(2)}`);

  // Verificar consumo de harina e incremento de croissants
  const stockHarinaDespues = (await prisma.producto.findUnique({ where: { id: harina.id } }))?.stock || 0;
  const stockCroissantDespues = (await prisma.producto.findUnique({ where: { id: croissant.id } }))?.stock || 0;

  console.log(`4.3 Harina: Antes ${stockHarinaAntes} -> Después ${stockHarinaDespues} (Consumidos: ${stockHarinaAntes - stockHarinaDespues} KG)`);
  console.log(`4.4 Croissant: Antes ${stockCroissantAntes} -> Después ${stockCroissantDespues} (Ingresados: ${stockCroissantDespues - stockCroissantAntes} UND)`);

  if (stockHarinaAntes - stockHarinaDespues !== 3.0 || stockCroissantDespues - stockCroissantAntes !== 20) {
    throw new Error('Falla en la deducción de materia prima o ingreso de producto terminado');
  }
  console.log('✅ TEST 4: Producción y Consumo Atómico APROBADO.\n');

  // ====================================================
  // TEST 5: COSTEO Y MARGEN DE GANANCIA
  // ====================================================
  console.log('--- TEST 5: COSTEO & RENTABILIDAD ---');
  const analisisCosto = await CostingEngine.getProductCosting(croissant.id, negocio.id);
  console.log(`5.1 Precio Venta: $${analisisCosto.salePrice}, Costo Unitario: $${analisisCosto.unitCost.toFixed(2)}`);
  console.log(`5.2 Margen Bruto: $${analisisCosto.grossMarginAmount.toFixed(2)} (${analisisCosto.grossMarginPercentage.toFixed(1)}%)`);
  if (analisisCosto.grossMarginPercentage <= 0) {
    throw new Error('Margen porcentual inconsistente');
  }
  console.log('✅ TEST 5: Costeo y Rentabilidad APROBADO.\n');

  // ====================================================
  // TEST 6: FACTURACIÓN ELECTRÓNICA SRI ECUADOR
  // ====================================================
  console.log('--- TEST 6: FACTURACIÓN ELECTRÓNICA SRI (ECUADOR) ---');
  const claveAcceso = ElectronicBillingService.generateClaveAcceso({
    fecha: new Date(),
    tipoComprobante: '01', // Factura
    ruc: '1790011234001',
    ambiente: 1, // Pruebas
    establecimiento: '001',
    puntoEmision: '001',
    secuencial: 1234,
    tipoEmision: 1
  });
  console.log(`6.1 Clave de Acceso generada: ${claveAcceso}`);
  console.log(`6.2 Longitud: ${claveAcceso.length} dígitos (Esperado: 49)`);

  const isValidKey = ElectronicBillingService.verifyClaveAcceso(claveAcceso);
  console.log(`6.3 Validación Módulo 11 oficial SRI: ${isValidKey ? 'VÁLIDA' : 'INVÁLIDA'}`);
  if (claveAcceso.length !== 49 || !isValidKey) {
    throw new Error('Clave de acceso SRI no cumple estándar Módulo 11 o 49 dígitos');
  }

  // Generar factura electrónica
  const invoice = await ElectronicBillingService.issueInvoice({
    businessId: negocio.id,
    cliente: {
      identificacion: '9999999999999',
      tipoIdentificacion: '07', // Consumidor Final
      razonSocial: 'Consumidor Final',
      email: 'consumidor@correo.com'
    },
    items: [
      { nombre: 'Croissant Francés', cantidad: 2, precioUnitario: 2.25, subtotal: 4.50 }
    ],
    formaPago: '01' // Efectivo
  });
  console.log(`6.4 Factura generada: #${invoice.secuencial}, Clave: ${invoice.claveAcceso.slice(0, 20)}..., Total: $${invoice.importeTotal.toFixed(2)}`);
  console.log('✅ TEST 6: Facturación SRI Ecuador APROBADO.\n');

  // ====================================================
  // TEST 7: NÓMINA & CÁLCULO IESS (ECUADOR)
  // ====================================================
  console.log('--- TEST 7: NÓMINA & ROLES DE PAGO (IESS) ---');
  const empleado = await PayrollService.upsertEmployee({
    businessId: negocio.id,
    fullName: 'Mariana Gómez',
    taxId: '1718901234',
    position: 'Barista Principal',
    baseSalary: 600.00
  });

  const rol = await PayrollService.calculateAndGenerateSlip({
    employeeId: empleado.id,
    businessId: negocio.id,
    period: '2026-10',
    extraHours: 50.00,
    bonuses: 30.00,
    advances: 0,
    otherDeductions: 0
  });

  console.log(`7.1 Total Ingresos (Bruto): $${rol.grossSalary.toFixed(2)} (600 + 50 + 30 = 680)`);
  console.log(`7.2 Aporte Personal IESS (9.45%): $${rol.iessDeduction.toFixed(2)} (680 * 0.0945 = 64.26)`);
  console.log(`7.3 Líquido a Pagar (Neto): $${rol.netSalary.toFixed(2)} (680 - 64.26 = 615.74)`);

  if (Math.abs(rol.iessDeduction - 64.26) > 0.05 || Math.abs(rol.netSalary - 615.74) > 0.05) {
    throw new Error('Fórmula de aportación IESS 9.45% o neto erróneo');
  }
  console.log('✅ TEST 7: Nómina IESS APROBADO.\n');

  console.log('====================================================');
  console.log('🎉 TODOS LOS TESTS COMPLETADOS SATISFACTORIAMENTE (7/7)');
  console.log('====================================================');
}

runIntegrationSuite()
  .catch((err) => {
    console.error('❌ ERROR EN LA SUITE DE PRUEBAS:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
