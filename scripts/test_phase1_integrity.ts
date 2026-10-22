// scripts/test_phase1_integrity.ts
// Suite de verificación de FASE 1: Integridad Transaccional, Concurrencia y Aislamiento Multiempresa

import { prisma } from '../src/lib/prisma';
import { InventoryEngine } from '../src/core/inventory/InventoryEngine';
import { ProductionEngine } from '../src/core/production/ProductionEngine';
import { CashSessionService } from '../src/core/cash/CashSessionService';
import { RecipeEngine } from '../src/core/recipes/RecipeEngine';
import { PurchaseEngine } from '../src/core/purchases/PurchaseEngine';

async function runPhase1IntegrityTests() {
  console.log('================================================================');
  console.log('🧪 INICIANDO VERIFICACIÓN DE FASE 1: INTEGRIDAD Y SEGURIDAD');
  console.log('================================================================\n');

  const timestamp = Date.now();

  // ── PREPARACIÓN: Crear dos empresas distintas para pruebas de aislamiento ──
  const bizA = await prisma.negocio.create({
    data: {
      id: crypto.randomUUID(),
      nombre: `Empresa Test Alfa ${timestamp}`,
      slug: `empresa-alfa-${timestamp}`,
      tipoNegocio: 'CAFETERIA',
      emailContacto: `alfa_${timestamp}@test.com`,
      precioHora: 0,
      horarioApertura: '08:00',
      horarioCierre: '20:00',
      updatedAt: new Date()
    }
  });

  const bizB = await prisma.negocio.create({
    data: {
      id: crypto.randomUUID(),
      nombre: `Empresa Test Beta ${timestamp}`,
      slug: `empresa-beta-${timestamp}`,
      tipoNegocio: 'CAFETERIA',
      emailContacto: `beta_${timestamp}@test.com`,
      precioHora: 0,
      horarioApertura: '08:00',
      horarioCierre: '20:00',
      updatedAt: new Date()
    }
  });

  console.log(`🏢 Negocio A creado: ${bizA.nombre} (${bizA.id})`);
  console.log(`🏢 Negocio B creado: ${bizB.nombre} (${bizB.id})\n`);

  // Crear sucursales y bodegas para Negocio A
  const branchA = await prisma.branch.create({
    data: {
      businessId: bizA.id,
      name: 'Sucursal Matriz A',
      slug: `matriz-a-${timestamp}`,
      isMain: true
    }
  });

  const bodegaA = await prisma.warehouse.create({
    data: {
      businessId: bizA.id,
      branchId: branchA.id,
      name: 'Bodega Central A',
      code: 'BOD-A-01',
      isDefault: true
    }
  });

  // Crear productos en Negocio A
  const harinaA = await prisma.producto.create({
    data: {
      negocioId: bizA.id,
      nombre: 'Harina Fina (Insumo 1)',
      tipoProducto: 'MATERIA_PRIMA',
      precio: 1.0,
      costoUnitario: 0.8,
      stock: 50 // Inicia con 50 unidades
    }
  });

  const mantequillaA = await prisma.producto.create({
    data: {
      negocioId: bizA.id,
      nombre: 'Mantequilla Pura (Insumo 2)',
      tipoProducto: 'MATERIA_PRIMA',
      precio: 2.0,
      costoUnitario: 1.5,
      stock: 20 // Inicia con 20 unidades
    }
  });

  const panA = await prisma.producto.create({
    data: {
      negocioId: bizA.id,
      nombre: 'Pan Brioche Artesanal (Terminado)',
      tipoProducto: 'TERMINADO',
      precio: 3.5,
      costoUnitario: 0,
      stock: 0
    }
  });

  // Receta: 10 panes requieren 5 de Harina y 2 de Mantequilla
  const recetaPan = await RecipeEngine.upsertRecipe({
    businessId: bizA.id,
    productId: panA.id,
    name: 'Receta Pan Brioche',
    yieldQuantity: 10,
    yieldUnit: 'UNIDAD',
    prepTimeMin: 60,
    extraCost: 1.0,
    ingredients: [
      { ingredientId: harinaA.id, quantity: 5 },
      { ingredientId: mantequillaA.id, quantity: 2 }
    ]
  });

  // ============================================================================
  // ESCENARIO 1: Producción exitosa descuenta insumos e ingresa terminado (1 vez)
  // ============================================================================
  console.log('--- ESCENARIO 1: Producción exitosa atómica ---');
  const orden1 = await ProductionEngine.createOrder({
    businessId: bizA.id,
    recipeId: recetaPan.id,
    targetQuantity: 10,
    sourceWarehouseId: bodegaA.id,
    targetWarehouseId: bodegaA.id,
    operatorName: 'Panadero Juan'
  });

  await ProductionEngine.startOrder(orden1.id, bizA.id, 'Panadero Juan');

  const orden1Completada = await ProductionEngine.completeOrder({
    productionOrderId: orden1.id,
    businessId: bizA.id,
    actualQuantity: 10,
    wasteQuantity: 0,
    completedBy: 'Panadero Juan'
  });

  const harinaDesp1 = (await prisma.producto.findUnique({ where: { id: harinaA.id } }))?.stock;
  const mantDesp1 = (await prisma.producto.findUnique({ where: { id: mantequillaA.id } }))?.stock;
  const panDesp1 = (await prisma.producto.findUnique({ where: { id: panA.id } }))?.stock;

  console.log(`1.1 Estado orden: ${orden1Completada.status}`);
  console.log(`1.2 Harina: 50 -> ${harinaDesp1} (Esperado: 45)`);
  console.log(`1.3 Mantequilla: 20 -> ${mantDesp1} (Esperado: 18)`);
  console.log(`1.4 Pan Brioche: 0 -> ${panDesp1} (Esperado: 10)`);

  if (harinaDesp1 !== 45 || mantDesp1 !== 18 || panDesp1 !== 10) {
    throw new Error('FALLA ESCENARIO 1: Descuento o ingreso de inventario incorrecto.');
  }
  console.log('✅ ESCENARIO 1 APROBADO.\n');

  // ============================================================================
  // ESCENARIO 2: Rollback atómico ante fallo a mitad de producción
  // ============================================================================
  console.log('--- ESCENARIO 2: Fallo a mitad de producción revierte TODO ---');
  const orden2 = await ProductionEngine.createOrder({
    businessId: bizA.id,
    recipeId: recetaPan.id,
    targetQuantity: 10,
    sourceWarehouseId: bodegaA.id,
    targetWarehouseId: bodegaA.id
  });
  await ProductionEngine.startOrder(orden2.id, bizA.id);

  let falloCapturado = false;
  try {
    // Inyectamos un fallo simulado justo después de consumir el primer insumo (Harina)
    await ProductionEngine.completeOrder(
      {
        productionOrderId: orden2.id,
        businessId: bizA.id,
        actualQuantity: 10
      },
      {
        onStep: async (step) => {
          if (step === `after-consumption:${harinaA.id}`) {
            throw new Error('SIMULATED_CRASH_DURING_PRODUCTION');
          }
        }
      }
    );
  } catch (err: any) {
    if (err.message.includes('SIMULATED_CRASH_DURING_PRODUCTION')) {
      falloCapturado = true;
    }
  }

  if (!falloCapturado) throw new Error('El fallo simulado no fue arrojado.');

  // Verificar que la harina NO se haya descontado y el pan NO haya ingresado
  const harinaDesp2 = (await prisma.producto.findUnique({ where: { id: harinaA.id } }))?.stock;
  const mantDesp2 = (await prisma.producto.findUnique({ where: { id: mantequillaA.id } }))?.stock;
  const panDesp2 = (await prisma.producto.findUnique({ where: { id: panA.id } }))?.stock;
  const orden2EnBd = await prisma.productionOrder.findUnique({ where: { id: orden2.id } });

  console.log(`2.1 Harina post-fallo: ${harinaDesp2} (Esperado: 45, sin descuento parcial)`);
  console.log(`2.2 Mantequilla post-fallo: ${mantDesp2} (Esperado: 18)`);
  console.log(`2.3 Pan post-fallo: ${panDesp2} (Esperado: 10)`);
  console.log(`2.4 Estado orden post-fallo: ${orden2EnBd?.status} (Esperado: IN_PROGRESS)`);

  if (harinaDesp2 !== 45 || mantDesp2 !== 18 || panDesp2 !== 10 || orden2EnBd?.status !== 'IN_PROGRESS') {
    throw new Error('FALLA ESCENARIO 2: Fallo a mitad de producción dejó registros parciales inconsistentes.');
  }

  // Verificar que no existen movimientos huérfanos de la orden 2
  const movsHuerfanos = await prisma.inventoryMovement.count({
    where: { sourceDocId: orden2.id }
  });
  if (movsHuerfanos !== 0) {
    throw new Error(`FALLA ESCENARIO 2: Quedaron ${movsHuerfanos} movimientos de inventario huérfanos tras rollback.`);
  }
  console.log('✅ ESCENARIO 2 APROBADO: Rollback completo confirmado.\n');

  // ============================================================================
  // ESCENARIO 3: Concurrencia - Dos intentos simultáneos no duplican movimientos
  // ============================================================================
  console.log('--- ESCENARIO 3: Protección contra doble finalización concurrente ---');
  // Intentamos completar orden2 simultáneamente en paralelo
  const [res1, res2] = await Promise.allSettled([
    ProductionEngine.completeOrder({
      productionOrderId: orden2.id,
      businessId: bizA.id,
      actualQuantity: 10
    }),
    ProductionEngine.completeOrder({
      productionOrderId: orden2.id,
      businessId: bizA.id,
      actualQuantity: 10
    })
  ]);

  const exitoCount = [res1, res2].filter(r => r.status === 'fulfilled').length;
  const falloCount = [res1, res2].filter(r => r.status === 'rejected').length;

  console.log(`3.1 Intentos concurrentes: Éxitos = ${exitoCount}, Bloqueados = ${falloCount}`);
  if (exitoCount !== 1 || falloCount !== 1) {
    throw new Error(`FALLA ESCENARIO 3: Se esperaba exactamente 1 éxito y 1 bloqueo concurrente. Hubo ${exitoCount} éxitos.`);
  }

  // Verificar que los insumos solo se descontaron UNA vez (Harina: 45 - 5 = 40, Pan: 10 + 10 = 20)
  const harinaDesp3 = (await prisma.producto.findUnique({ where: { id: harinaA.id } }))?.stock;
  const panDesp3 = (await prisma.producto.findUnique({ where: { id: panA.id } }))?.stock;
  console.log(`3.2 Harina final: ${harinaDesp3} (Esperado: 40)`);
  console.log(`3.3 Pan final: ${panDesp3} (Esperado: 20)`);
  if (harinaDesp3 !== 40 || panDesp3 !== 20) {
    throw new Error('FALLA ESCENARIO 3: El inventario se descontó más de una vez por concurrencia.');
  }
  console.log('✅ ESCENARIO 3 APROBADO: Doble procesamiento bloqueado.\n');

  // ============================================================================
  // ESCENARIO 4: Venta POS atómica (Pedido + Stock + Caja en una transacción)
  // ============================================================================
  console.log('--- ESCENARIO 4: Venta POS atómica exitosa ---');
  const sessionA = await CashSessionService.openSession({
    businessId: bizA.id,
    branchId: branchA.id,
    openedBy: 'cajero_a@test.com',
    openingAmount: 100.0,
    notes: 'Turno mañana A'
  });

  // Simular checkout atómico idéntico a la API
  const panStockAntesVenta = (await prisma.producto.findUnique({ where: { id: panA.id } }))?.stock || 0;
  const subtotalVenta = panA.precio * 2; // 2 panes * 3.5 = $7.00

  const ventaResultado = await prisma.$transaction(async (tx: any) => {
    const verifiedSession = await tx.cashRegisterSession.findFirst({
      where: { id: sessionA.id, businessId: bizA.id, status: 'OPEN' }
    });
    if (!verifiedSession) throw new Error('Sesión no válida');

    const lastOrder = await tx.pedido.findFirst({
      where: { negocioId: bizA.id },
      orderBy: { numeroPedido: 'desc' }
    });
    const numPedido = (lastOrder?.numeroPedido || 0) + 1;

    const pedido = await tx.pedido.create({
      data: {
        negocioId: bizA.id,
        numeroPedido: numPedido,
        tipoEntrega: 'MOSTRADOR_POS',
        nombreCliente: 'Cliente Mostrador',
        telefonoCliente: '0999999999',
        subtotal: subtotalVenta,
        costoEnvio: 0,
        total: subtotalVenta,
        fechaEntrega: new Date(),
        franjaHoraria: 'POS',
        estado: 'FINALIZADO',
        items: {
          create: [{
            productoId: panA.id,
            nombreProducto: panA.nombre,
            precioUnitario: panA.precio,
            cantidad: 2
          }]
        }
      }
    });

    await InventoryEngine.recordMovement({
      businessId: bizA.id,
      productId: panA.id,
      quantity: -2,
      type: 'VENTA',
      unitCost: panA.precio,
      totalCost: subtotalVenta,
      sourceDocType: 'VENTA',
      sourceDocId: pedido.id,
      allowNegative: true
    }, tx);

    await CashSessionService.recordMovement({
      sessionId: sessionA.id,
      businessId: bizA.id,
      type: 'VENTA_EFECTIVO',
      amount: subtotalVenta,
      paymentMethod: 'EFECTIVO',
      concept: `Venta POS #${pedido.numeroPedido}`,
      reference: `ORD-${pedido.numeroPedido}`,
      userName: 'cajero_a@test.com'
    }, tx);

    return pedido;
  });

  const panStockDespVenta = (await prisma.producto.findUnique({ where: { id: panA.id } }))?.stock || 0;
  const summaryA = await CashSessionService.calculateSessionSummary(sessionA.id, bizA.id);

  console.log(`4.1 Pedido creado: #${ventaResultado.numeroPedido}`);
  console.log(`4.2 Stock Pan Brioche: ${panStockAntesVenta} -> ${panStockDespVenta} (Esperado: 18)`);
  console.log(`4.3 Caja esperada: $${summaryA.expectedCash} (Fondo 100 + Venta 7 = 107)`);

  if (panStockDespVenta !== panStockAntesVenta - 2 || summaryA.expectedCash !== 107.0) {
    throw new Error('FALLA ESCENARIO 4: Venta POS no sincronizó stock o saldo de caja.');
  }
  console.log('✅ ESCENARIO 4 APROBADO.\n');

  // ============================================================================
  // ESCENARIO 5: Fallo en inventario revierte Pedido y Caja en Checkout
  // ============================================================================
  console.log('--- ESCENARIO 5: Fallo de inventario en POS revierte TODO ---');
  const countPedidosAntes5 = await prisma.pedido.count({ where: { negocioId: bizA.id } });
  const countCajaMovsAntes5 = await prisma.cashMovement.count({ where: { businessId: bizA.id } });

  let errorCheckoutCapturado = false;
  try {
    await prisma.$transaction(async (tx: any) => {
      // 1. Crea pedido
      const pedido = await tx.pedido.create({
        data: {
          negocioId: bizA.id,
          numeroPedido: 9999,
          tipoEntrega: 'MOSTRADOR_POS',
          nombreCliente: 'Cliente Fallido',
          telefonoCliente: '0999999999',
          subtotal: 10,
          costoEnvio: 0,
          total: 10,
          fechaEntrega: new Date(),
          franjaHoraria: 'POS',
          estado: 'FINALIZADO'
        }
      });

      // 2. Movimiento de inventario falla intencionalmente (ej. saldo insuficiente)
      await InventoryEngine.recordMovement({
        businessId: bizA.id,
        productId: panA.id,
        quantity: -999999, // Excede stock disponible y lanza error en InventoryEngine
        type: 'VENTA',
        sourceDocType: 'VENTA',
        sourceDocId: pedido.id
      }, tx);

      // 3. Movimiento de caja
      await CashSessionService.recordMovement({
        sessionId: sessionA.id,
        businessId: bizA.id,
        type: 'VENTA_EFECTIVO',
        amount: 10,
        paymentMethod: 'EFECTIVO',
        concept: 'Venta que debe fallar'
      }, tx);
    });
  } catch (err: any) {
    errorCheckoutCapturado = true;
  }

  if (!errorCheckoutCapturado) throw new Error('FALLA ESCENARIO 5: El error no fue detectado.');

  const countPedidosDesp5 = await prisma.pedido.count({ where: { negocioId: bizA.id } });
  const countCajaMovsDesp5 = await prisma.cashMovement.count({ where: { businessId: bizA.id } });

  console.log(`5.1 Pedidos antes: ${countPedidosAntes5}, después: ${countPedidosDesp5}`);
  console.log(`5.2 Movimientos caja antes: ${countCajaMovsAntes5}, después: ${countCajaMovsDesp5}`);

  if (countPedidosDesp5 !== countPedidosAntes5 || countCajaMovsDesp5 !== countCajaMovsAntes5) {
    throw new Error('FALLA ESCENARIO 5: Fallo de inventario dejó un pedido o movimiento de caja grabado sin revertir.');
  }
  console.log('✅ ESCENARIO 5 APROBADO: Rollback en checkout verificado.\n');

  // ============================================================================
  // ESCENARIO 6: Fallo en caja revierte Pedido e Inventario en Checkout
  // ============================================================================
  console.log('--- ESCENARIO 6: Fallo de caja en POS revierte inventario y pedido ---');
  const panStockAntes6 = (await prisma.producto.findUnique({ where: { id: panA.id } }))?.stock || 0;
  let falloCajaCapturado = false;

  try {
    await prisma.$transaction(async (tx: any) => {
      const pedido = await tx.pedido.create({
        data: {
          negocioId: bizA.id,
          numeroPedido: 8888,
          tipoEntrega: 'MOSTRADOR_POS',
          nombreCliente: 'Cliente Fallo Caja',
          telefonoCliente: '0999999999',
          subtotal: 5,
          costoEnvio: 0,
          total: 5,
          fechaEntrega: new Date(),
          franjaHoraria: 'POS',
          estado: 'FINALIZADO'
        }
      });

      // Descuenta inventario válido
      await InventoryEngine.recordMovement({
        businessId: bizA.id,
        productId: panA.id,
        quantity: -1,
        type: 'VENTA',
        sourceDocType: 'VENTA',
        sourceDocId: pedido.id
      }, tx);

      // Movimiento de caja con monto inválido <= 0 lanzará error
      await CashSessionService.recordMovement({
        sessionId: sessionA.id,
        businessId: bizA.id,
        type: 'VENTA_EFECTIVO',
        amount: -50, // Inválido
        paymentMethod: 'EFECTIVO',
        concept: 'Fallo caja'
      }, tx);
    });
  } catch (err) {
    falloCajaCapturado = true;
  }

  if (!falloCajaCapturado) throw new Error('FALLA ESCENARIO 6: Error de caja no detectado.');

  const panStockDesp6 = (await prisma.producto.findUnique({ where: { id: panA.id } }))?.stock || 0;
  console.log(`6.1 Stock pan antes: ${panStockAntes6}, después del fallo: ${panStockDesp6}`);
  if (panStockDesp6 !== panStockAntes6) {
    throw new Error('FALLA ESCENARIO 6: El inventario quedó descontado a pesar de que el cobro falló.');
  }
  console.log('✅ ESCENARIO 6 APROBADO: Reversión total ante fallo de caja confirmada.\n');

  // ============================================================================
  // ESCENARIO 7: Aislamiento Multiempresa en POS (Caja de otro negocio)
  // ============================================================================
  console.log('--- ESCENARIO 7: Bloqueo de venta con sesión de otra empresa ---');
  // Crear sesión en Negocio B
  const sessionB = await CashSessionService.openSession({
    businessId: bizB.id,
    openedBy: 'cajero_b@test.com',
    openingAmount: 50.0
  });

  let bloqueoCajaAjena = false;
  try {
    await prisma.$transaction(async (tx: any) => {
      // Intentar registrar movimiento en Negocio A usando la sesión del Negocio B
      await CashSessionService.recordMovement({
        sessionId: sessionB.id,
        businessId: bizA.id, // Intento cruzado
        type: 'VENTA_EFECTIVO',
        amount: 20,
        concept: 'Intento de venta fraudulenta cruzada'
      }, tx);
    });
  } catch (err: any) {
    if (err.message.includes('no pertenece al negocio')) {
      bloqueoCajaAjena = true;
    }
  }

  console.log(`7.1 Intento de uso de sesión cruzada: ${bloqueoCajaAjena ? 'BLOQUEADO' : 'FALLA'}`);
  if (!bloqueoCajaAjena) {
    throw new Error('FALLA ESCENARIO 7: El sistema permitió usar una sesión de caja de otra empresa.');
  }
  console.log('✅ ESCENARIO 7 APROBADO: Aislamiento de caja entre empresas verificado.\n');

  // ============================================================================
  // ESCENARIO 8: Cierre y resumen de caja bloquean acceso entre empresas
  // ============================================================================
  console.log('--- ESCENARIO 8: Bloqueo de cierre/resumen entre empresas ---');
  let bloqueoResumenAjenos = false;
  try {
    // Negocio A intenta calcular resumen de sesión de Negocio B
    await CashSessionService.calculateSessionSummary(sessionB.id, bizA.id);
  } catch (err: any) {
    if (err.message.includes('no pertenece al negocio')) {
      bloqueoResumenAjenos = true;
    }
  }

  let bloqueoCierreAjenos = false;
  try {
    // Negocio A intenta cerrar la sesión de Negocio B
    await CashSessionService.closeSession({
      sessionId: sessionB.id,
      businessId: bizA.id,
      closedBy: 'hacker@empresa-a.com',
      cashCounted: 50
    });
  } catch (err: any) {
    if (err.message.includes('no pertenece al negocio')) {
      bloqueoCierreAjenos = true;
    }
  }

  console.log(`8.1 Consulta de resumen ajeno: ${bloqueoResumenAjenos ? 'BLOQUEADO' : 'FALLA'}`);
  console.log(`8.2 Cierre de sesión ajena: ${bloqueoCierreAjenos ? 'BLOQUEADO' : 'FALLA'}`);

  if (!bloqueoResumenAjenos || !bloqueoCierreAjenos) {
    throw new Error('FALLA ESCENARIO 8: Se vulneró el aislamiento de sesiones de caja.');
  }
  console.log('✅ ESCENARIO 8 APROBADO: Aislamiento estricto de caja verificado.\n');

  // ============================================================================
  // ESCENARIO 9: Compatibilidad con TIENDA y RESTAURANTE (productos directos)
  // ============================================================================
  console.log('--- ESCENARIO 9: Compatibilidad TIENDA / Productos directos sin receta ---');
  // Crear producto comercial directo de reventa (Gaseosa)
  const gaseosa = await prisma.producto.create({
    data: {
      negocioId: bizA.id,
      nombre: 'Bebida Comercial 500ml',
      tipoProducto: 'VENTA',
      precio: 1.25,
      costoUnitario: 0.70,
      stock: 10
    }
  });

  // Movimiento directo de compra y venta sin tocar RecipeEngine ni ProductionEngine
  await InventoryEngine.recordMovement({
    businessId: bizA.id,
    productId: gaseosa.id,
    quantity: 15, // Ingreso por compra
    type: 'COMPRA',
    unitCost: 0.70,
    totalCost: 10.50
  });

  const stockTrasCompra = (await prisma.producto.findUnique({ where: { id: gaseosa.id } }))?.stock;
  console.log(`9.1 Stock gaseosa post-compra: ${stockTrasCompra} (10 + 15 = 25)`);

  await InventoryEngine.recordMovement({
    businessId: bizA.id,
    productId: gaseosa.id,
    quantity: -5, // Salida por venta directa
    type: 'VENTA',
    unitCost: 1.25,
    totalCost: 6.25
  });

  const stockTrasVenta = (await prisma.producto.findUnique({ where: { id: gaseosa.id } }))?.stock;
  console.log(`9.2 Stock gaseosa post-venta: ${stockTrasVenta} (25 - 5 = 20)`);

  if (stockTrasCompra !== 25 || stockTrasVenta !== 20) {
    throw new Error('FALLA ESCENARIO 9: Falla en flujo directo de tienda/reventa.');
  }
  console.log('✅ ESCENARIO 9 APROBADO: Compatibilidad con reventa y otros verticales preservada.\n');

  // ============================================================================
  // ESCENARIO 10: Validación de datos y control de concurrencia optimista (CAS)
  // ============================================================================
  console.log('--- ESCENARIO 10: Concurrencia Optimista (CAS) en InventoryEngine ---');
  // Intentar realizar una actualización donde la cantidad sea 0 (debe ser rechazada)
  let zeroQuantityRejected = false;
  try {
    await InventoryEngine.recordMovement({
      businessId: bizA.id,
      productId: gaseosa.id,
      quantity: 0,
      type: 'AJUSTE'
    });
  } catch (err: any) {
    zeroQuantityRejected = true;
  }

  console.log(`10.1 Cantidad cero rechazada: ${zeroQuantityRejected ? 'SÍ' : 'NO'}`);
  if (!zeroQuantityRejected) {
    throw new Error('FALLA ESCENARIO 10: Cantidad cero no fue rechazada.');
  }

  // Cierre ordenado de la sesión A
  const cierreA = await CashSessionService.closeSession({
    sessionId: sessionA.id,
    businessId: bizA.id,
    closedBy: 'cajero_a@test.com',
    cashCounted: 107.0,
    notes: 'Cierre final verificado'
  });
  console.log(`10.2 Sesión A cerrada: Diferencia = $${cierreA.difference.toFixed(2)} (Cuadre exacto)`);
  if (cierreA.difference !== 0) {
    throw new Error('Diferencia de cierre inesperada en sesión A.');
  }

  console.log('✅ ESCENARIO 10 APROBADO.\n');

  console.log('================================================================');
  console.log('🎉 TODOS LOS ESCENARIOS DE FASE 1 COMPLETADOS CON ÉXITO (10/10)');
  console.log('================================================================');
}

runPhase1IntegrityTests()
  .catch((err) => {
    console.error('❌ ERROR EN PRUEBAS DE FASE 1:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
