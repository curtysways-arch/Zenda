import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { InventoryEngine } from '../inventory/InventoryEngine';
import { RecipeEngine } from '../recipes/RecipeEngine';
import { CostingEngine, CostStatus } from '../costing/CostingEngine';
import {
  toDecimal,
  decimalAdd,
  decimalSub,
  decimalMul,
  decimalDiv,
  decimalLt,
  decimalLte,
  decimalGt,
  roundQty,
  roundCost,
  roundMoney,
  DecimalInput
} from '@/lib/math/decimal';

export interface CreateProductionOrderInput {
  businessId: string;
  branchId: string;
  sourceWarehouseId: string;
  targetWarehouseId: string;
  recipeId: string;
  targetQuantity: DecimalInput;
  operatorId?: string;
  operatorName?: string;
  notes?: string;
}

export interface CompleteProductionOrderInput {
  productionOrderId: string;
  businessId: string;
  actualQuantity: DecimalInput;
  wasteQuantity?: DecimalInput;
  completedBy?: string;
  notes?: string;
  customIngredientConsumptions?: Array<{
    ingredientId: string;
    actualQuantity: DecimalInput;
  }>;
}

export interface ReverseProductionOrderInput {
  productionOrderId: string;
  businessId: string;
  reason: string;
  reversedBy?: string;
}

/** Estados desde los cuales una orden puede finalizarse. */
const COMPLETABLE_STATUSES = ['DRAFT', 'PLANNED', 'IN_PROGRESS'];

export class ProductionEngine {
  /**
   * Crea una nueva orden de producción planificada con aislamiento estricto por sucursal y bodega.
   */
  public static async createOrder(input: CreateProductionOrderInput, client?: any) {
    const db = client || prisma;
    const {
      businessId,
      branchId,
      sourceWarehouseId,
      targetWarehouseId,
      recipeId,
      targetQuantity,
      operatorId,
      operatorName,
      notes
    } = input;

    if (!businessId) throw new Error('El identificador de negocio es obligatorio.');
    if (!branchId) throw new Error('La sucursal (branchId) es obligatoria para crear una orden de producción.');
    if (!sourceWarehouseId) throw new Error('La bodega de origen (sourceWarehouseId) es obligatoria.');
    if (!targetWarehouseId) throw new Error('La bodega de destino (targetWarehouseId) es obligatoria.');
    if (!recipeId) throw new Error('La receta es obligatoria.');

    const targetQty = roundQty(targetQuantity);
    if (targetQty.lte(0)) {
      throw new Error('La cantidad a producir debe ser mayor a 0.');
    }

    // 1. Validar que la sucursal exista y pertenezca al negocio
    const branch = await (db as any).branch.findFirst({
      where: { id: branchId, businessId, active: true }
    });
    if (!branch) {
      throw new Error('La sucursal indicada no existe, está inactiva o no pertenece al negocio.');
    }

    // 2. Validar bodega de origen (sourceWarehouse)
    const sourceWh = await (db as any).warehouse.findFirst({
      where: { id: sourceWarehouseId, businessId, branchId, active: true }
    });
    if (!sourceWh) {
      throw new Error('La bodega de origen no existe, está inactiva o no pertenece a la sucursal especificada.');
    }
    if (sourceWh.type === 'TRANSIT' || sourceWh.type === 'SCRAP_WASTE') {
      throw new Error(`La bodega de origen no puede ser de tipo "${sourceWh.type}".`);
    }

    // 3. Validar bodega de destino (targetWarehouse)
    const targetWh = await (db as any).warehouse.findFirst({
      where: { id: targetWarehouseId, businessId, branchId, active: true }
    });
    if (!targetWh) {
      throw new Error('La bodega de destino no existe, está inactiva o no pertenece a la sucursal especificada.');
    }
    if (targetWh.type === 'TRANSIT' || targetWh.type === 'SCRAP_WASTE') {
      throw new Error(`La bodega de destino no puede ser de tipo "${targetWh.type}".`);
    }

    // 4. Validar receta
    const recipe = await (db as any).recipe.findUnique({
      where: { id: recipeId },
      include: { items: { include: { ingredient: true } }, producto: true }
    });

    if (!recipe || recipe.businessId !== businessId) {
      throw new Error('Receta no encontrada o no pertenece al negocio.');
    }

    // RecipeEngine maneja la escala proporcional
    const scaled = RecipeEngine.scaleRecipe(recipe, targetQty.toNumber());

    const countOrders = await (db as any).productionOrder.count({ where: { businessId } });
    const code = `OP-${String(countOrders + 1).padStart(5, '0')}`;

    const orderItems = scaled.ingredients.map((it: any) => ({
      ingredientId: it.ingredientId,
      plannedQuantity: it.scaledQuantity,
      actualQuantity: it.scaledQuantity,
      unit: it.unit || 'UNIDAD',
      unitCost: it.estimatedCost || 0,
      totalCost: it.totalEstimatedCost || 0
    }));

    const order = await (db as any).productionOrder.create({
      data: {
        businessId,
        branchId,
        sourceWarehouseId,
        targetWarehouseId,
        recipeId,
        code,
        status: 'PLANNED',
        targetQuantity: targetQty.toNumber(),
        actualQuantity: null,
        wasteQuantity: 0,
        estimatedCost: scaled.totalBatchCost,
        operatorId: operatorId || null,
        operatorName: operatorName || null,
        notes: notes || null,
        items: {
          create: orderItems
        }
      },
      include: {
        recipe: { include: { producto: true } },
        items: true
      }
    });

    return order;
  }

  /**
   * Inicia el proceso de producción de una orden
   */
  public static async startOrder(productionOrderId: string, businessId: string, operatorName?: string, client?: any) {
    const db = client || prisma;
    const order = await (db as any).productionOrder.findFirst({
      where: { id: productionOrderId, businessId }
    });

    if (!order) throw new Error('Orden no encontrada.');
    if (order.status !== 'PLANNED' && order.status !== 'DRAFT') {
      throw new Error(`La orden no se puede iniciar porque está en estado "${order.status}".`);
    }

    // Transición condicional: evita iniciar una orden que cambió de estado entre lectura y escritura
    const res = await (db as any).productionOrder.updateMany({
      where: { id: productionOrderId, businessId, status: { in: ['PLANNED', 'DRAFT'] } },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        operatorName: operatorName || order.operatorName,
        updatedAt: new Date()
      }
    });
    if (res.count !== 1) {
      throw new Error('La orden cambió de estado durante la operación. Actualice e intente nuevamente.');
    }

    return await (db as any).productionOrder.findFirst({ where: { id: productionOrderId, businessId } });
  }

  /**
   * Completa la producción en UNA sola transacción de base de datos
   * aplicando aislamiento estricto por sucursal y bodega física.
   */
  public static async completeOrder(
    input: CompleteProductionOrderInput,
    options?: { onStep?: (step: string, tx: any) => void | Promise<void>; client?: any }
  ) {
    const {
      productionOrderId,
      businessId,
      actualQuantity,
      wasteQuantity = 0,
      completedBy,
      notes,
      customIngredientConsumptions
    } = input;
    const onStep = options?.onStep;
    const db = options?.client || prisma;

    if (!businessId) throw new Error('Negocio no especificado.');

    const actualQty = roundQty(actualQuantity);
    const wasteQty = roundQty(wasteQuantity);

    if (actualQty.lte(0)) {
      throw new Error('La cantidad final producida debe ser mayor a 0.');
    }
    if (wasteQty.isNegative()) {
      throw new Error('La merma no puede ser negativa.');
    }

    return await (db as any).$transaction(async (tx: any) => {
      // 1. Cargar la orden acotada al negocio
      const order = await tx.productionOrder.findFirst({
        where: { id: productionOrderId, businessId },
        include: {
          recipe: { include: { items: true, producto: true } },
          items: true
        }
      });

      if (!order) {
        throw new Error('Orden de producción no encontrada.');
      }

      if (order.status === 'COMPLETED') {
        throw new Error('Esta orden de producción ya ha sido completada previamente. Prevención de doble procesamiento activa.');
      }
      if (!COMPLETABLE_STATUSES.includes(order.status)) {
        throw new Error(`La orden no se puede finalizar porque está en estado "${order.status}".`);
      }

      // Validar presencia de sucursal y bodegas para la ejecución física
      const branchId = order.branchId;
      const sourceWarehouseId = order.sourceWarehouseId;
      const targetWarehouseId = order.targetWarehouseId;

      if (!branchId) {
        throw new Error('La orden de producción no tiene una sucursal asignada. Configure branchId antes de procesar.');
      }
      if (!sourceWarehouseId || !targetWarehouseId) {
        throw new Error('La orden de producción requiere bodegas de origen y destino configuradas para su ejecución física.');
      }

      // 2. Reclamo condicional atómico contra concurrencia
      const claim = await tx.productionOrder.updateMany({
        where: { id: order.id, businessId, status: { in: COMPLETABLE_STATUSES } },
        data: { status: 'COMPLETED', updatedAt: new Date() }
      });
      if (claim.count !== 1) {
        throw new Error('La orden ya fue procesada por otra solicitud simultánea. Prevención de doble procesamiento activa.');
      }

      // Defensa adicional: no deben existir movimientos previos para esta orden
      const previousMovements = await tx.inventoryMovement.count({
        where: { businessId, sourceDocType: 'PRODUCCION', sourceDocId: order.id }
      });
      if (previousMovements > 0) {
        throw new Error('La orden ya tiene movimientos de inventario registrados. Requiere un procedimiento explícito de reversión.');
      }

      // 3. Validar bodegas de origen y destino
      const sourceWh = await tx.warehouse.findFirst({
        where: { id: sourceWarehouseId, businessId, branchId, active: true }
      });
      if (!sourceWh) {
        throw new Error('La bodega de origen no es válida, está inactiva o no pertenece a la sucursal de la orden.');
      }

      const targetWh = await tx.warehouse.findFirst({
        where: { id: targetWarehouseId, businessId, branchId, active: true }
      });
      if (!targetWh) {
        throw new Error('La bodega de destino no es válida, está inactiva o no pertenece a la sucursal de la orden.');
      }

      // 4. Calcular consumos reales y validar existencias EXCLUSIVAMENTE en WarehouseStock de sourceWarehouseId
      const consumptions = order.items.map((item: any) => {
        let rawQty: DecimalInput = item.plannedQuantity;
        if (customIngredientConsumptions) {
          const found = customIngredientConsumptions.find(c => c.ingredientId === item.ingredientId);
          if (found) rawQty = found.actualQuantity;
        }
        const qtyDec = roundQty(rawQty);
        if (qtyDec.isNegative()) {
          throw new Error('Las cantidades de consumo deben ser no negativas.');
        }
        return { item, qty: qtyDec.abs() };
      });

      const requiredByIngredient = new Map<string, Prisma.Decimal>();
      for (const c of consumptions) {
        const prev = requiredByIngredient.get(c.item.ingredientId) || toDecimal(0);
        requiredByIngredient.set(c.item.ingredientId, decimalAdd(prev, c.qty));
      }

      const shortages: string[] = [];
      for (const [ingredientId, required] of requiredByIngredient) {
        const ing = await tx.producto.findFirst({ where: { id: ingredientId, negocioId: businessId } });
        if (!ing) throw new Error('Un ingrediente de la orden no existe o no pertenece al negocio.');
        if (ing.tipoProducto === 'NO_INVENTARIABLE') continue;

        // VERDAD FÍSICA OBLIGATORIA: WarehouseStock en la bodega origen
        const ws = await tx.warehouseStock.findFirst({
          where: { warehouseId: sourceWarehouseId, productId: ingredientId }
        });
        const availableInWarehouse = ws ? roundQty(toDecimal(ws.quantity)) : toDecimal(0);

        if (decimalLt(availableInWarehouse, required)) {
          shortages.push(
            `"${ing.nombre}" en bodega origen (disponible: ${availableInWarehouse.toString()}, requerido: ${required.toString()})`
          );
        }
      }

      if (shortages.length > 0) {
        throw new Error(`Stock insuficiente en bodega origen para producir: ${shortages.join('; ')}.`);
      }

      // 5. Determinar costos reales de los ingredientes desde el PMP certificado de la sucursal
      let actualIngredientsCost = toDecimal(0);
      let anyIngredientUnknown = false;
      const ingredientDetails: Array<{ item: any; qty: Prisma.Decimal; unitCost: Prisma.Decimal | null; lineTotal: Prisma.Decimal | null }> = [];

      for (const { item, qty } of consumptions) {
        const bi = await tx.branchInventory.findFirst({
          where: { branchId, productId: item.ingredientId }
        });

        let itemUnitCost: Prisma.Decimal | null = null;
        let lineTotalCost: Prisma.Decimal | null = null;

        if (bi && bi.costoPromedio !== null && bi.costoPromedio !== undefined && !toDecimal(bi.costoPromedio).isZero()) {
          itemUnitCost = roundCost(toDecimal(bi.costoPromedio));
          lineTotalCost = roundMoney(decimalMul(qty, itemUnitCost));
          actualIngredientsCost = decimalAdd(actualIngredientsCost, lineTotalCost);
        } else {
          // Si el PMP no está certificado o es NULL, se marca UNKNOWN y no se inventa costo ni asume $0
          anyIngredientUnknown = true;
          itemUnitCost = null;
          lineTotalCost = null;
        }

        ingredientDetails.push({ item, qty, unitCost: itemUnitCost, lineTotal: lineTotalCost });
      }

      // 6. Descontar materias primas mediante InventoryEngine
      for (const { item, qty, unitCost, lineTotal } of ingredientDetails) {
        if (qty.gt(0)) {
          await InventoryEngine.recordMovement({
            businessId,
            branchId,
            warehouseId: sourceWarehouseId,
            productId: item.ingredientId,
            quantity: qty.times(-1),
            type: 'CONSUMO_PRODUCCION',
            unitCost: unitCost ? unitCost.toNumber() : undefined,
            totalCost: lineTotal ? lineTotal.toNumber() : undefined,
            reason: `Consumo para orden ${order.code || order.id.slice(0, 8)} (${order.recipe.name})`,
            reference: order.code || order.id,
            sourceDocType: 'PRODUCCION',
            sourceDocId: order.id,
            createdBy: completedBy || 'PRODUCCION'
          }, tx);
        }

        await tx.productionOrderItem.update({
          where: { id: item.id },
          data: {
            actualQuantity: qty.toNumber(),
            unitCost: unitCost ? unitCost.toNumber() : 0,
            totalCost: lineTotal ? lineTotal.toNumber() : 0
          }
        });

        if (onStep) await onStep(`after-consumption:${item.ingredientId}`, tx);
      }

      // 7. Costeo del producto elaborado y cálculo de PMP
      let finalCostStatus: CostStatus = 'KNOWN';
      let totalActualCost: Prisma.Decimal | null = null;
      let unitCostReal: Prisma.Decimal | null = null;

      if (anyIngredientUnknown) {
        finalCostStatus = 'PENDING_VALUATION';
        totalActualCost = null;
        unitCostReal = null;
      } else {
        const yieldQty = toDecimal(order.recipe.yieldQuantity ?? 1);
        const scaleFactor = yieldQty.gt(0) ? decimalDiv(actualQty, yieldQty) : toDecimal(1);
        const extraCost = toDecimal(order.recipe.extraCost ?? 0);
        const additionalCost = decimalMul(extraCost, scaleFactor);
        totalActualCost = roundMoney(decimalAdd(actualIngredientsCost, additionalCost));
        unitCostReal = actualQty.gt(0) ? roundCost(decimalDiv(totalActualCost, actualQty)) : toDecimal(0);
      }

      if (onStep) await onStep('before-finished-goods', tx);

      // 8. Ingresar el producto terminado mediante InventoryEngine en targetWarehouseId
      await InventoryEngine.recordMovement({
        businessId,
        branchId,
        warehouseId: targetWarehouseId,
        productId: order.recipe.productId,
        quantity: actualQty,
        type: 'INGRESO_PRODUCCION',
        unitCost: unitCostReal ? unitCostReal.toNumber() : undefined,
        totalCost: totalActualCost ? totalActualCost.toNumber() : undefined,
        reason: `Lote elaborado #${order.code || order.id.slice(0, 8)} (${actualQty.toString()} uds)`,
        reference: order.code || order.id,
        sourceDocType: 'PRODUCCION',
        sourceDocId: order.id,
        createdBy: completedBy || 'PRODUCCION'
      }, tx);

      // 9. Registrar merma de producción si aplica (MERMA_PRODUCCION en Kardex)
      if (wasteQty.gt(0)) {
        const wasteTotal = unitCostReal ? roundMoney(decimalMul(wasteQty, unitCostReal)) : null;
        await tx.inventoryMovement.create({
          data: {
            businessId,
            branchId,
            warehouseId: targetWarehouseId,
            productId: order.recipe.productId,
            quantity: wasteQty.toNumber(),
            type: 'MERMA_PRODUCCION',
            unitCost: unitCostReal ? unitCostReal.toNumber() : null,
            totalCost: wasteTotal ? wasteTotal.toNumber() : null,
            reason: `Merma física registrada en orden #${order.code || order.id.slice(0, 8)}`,
            reference: order.code || order.id,
            sourceDocType: 'PRODUCCION',
            sourceDocId: order.id,
            createdBy: completedBy || 'PRODUCCION'
          }
        });
      }

      if (onStep) await onStep('before-order-close', tx);

      // 10. Cerrar la orden con trazabilidad oficial
      const completed = await tx.productionOrder.update({
        where: { id: order.id },
        data: {
          status: 'COMPLETED',
          actualQuantity: actualQty.toNumber(),
          wasteQuantity: wasteQty.toNumber(),
          actualCost: totalActualCost ? totalActualCost.toNumber() : null,
          unitCostReal: unitCostReal ? unitCostReal.toNumber() : null,
          costStatus: finalCostStatus,
          completedAt: new Date(),
          notes: notes || order.notes,
          updatedAt: new Date()
        },
        include: {
          recipe: { include: { producto: true } },
          items: true
        }
      });

      return completed;
    }, { maxWait: 15000, timeout: 35000 });
  }

  /**
   * Revierte de forma compensatoria y auditable una orden de producción completada.
   */
  public static async reverseOrder(input: ReverseProductionOrderInput, client?: any) {
    const { productionOrderId, businessId, reason, reversedBy } = input;
    const db = client || prisma;

    if (!businessId) throw new Error('Negocio no especificado.');
    if (!productionOrderId) throw new Error('Identificador de orden no especificado.');
    if (!reason || reason.trim() === '') {
      throw new Error('El motivo de reversión es obligatorio.');
    }

    return await (db as any).$transaction(async (tx: any) => {
      const order = await tx.productionOrder.findFirst({
        where: { id: productionOrderId, businessId },
        include: {
          recipe: true,
          items: true
        }
      });

      if (!order) {
        throw new Error('Orden de producción no encontrada.');
      }

      if (order.status === 'REVERSED') {
        throw new Error('Esta orden de producción ya ha sido revertida previamente. Prevención de doble reversión activa.');
      }

      if (order.status !== 'COMPLETED') {
        throw new Error(`Solo se pueden revertir órdenes en estado "COMPLETED". Estado actual: "${order.status}".`);
      }

      const branchId = order.branchId;
      const sourceWarehouseId = order.sourceWarehouseId;
      const targetWarehouseId = order.targetWarehouseId;
      const producedQty = order.actualQuantity !== null ? toDecimal(order.actualQuantity) : toDecimal(order.targetQuantity);

      // Verificar existencia física disponible del producto terminado en la bodega de destino
      let availableFg = toDecimal(0);
      if (targetWarehouseId) {
        const wsFg = await tx.warehouseStock.findFirst({
          where: { warehouseId: targetWarehouseId, productId: order.recipe.productId }
        });
        if (wsFg) availableFg = roundQty(toDecimal(wsFg.quantity));
      }

      // Caso C: Producto terminado totalmente consumido o vendido
      if (availableFg.lte(0)) {
        const voided = await tx.productionOrder.update({
          where: { id: order.id },
          data: {
            status: 'VOIDED_ADMINISTRATIVELY',
            reversalReason: `ADMINISTRATIVE_VOID: No hay existencias físicas en bodega destino para revertir. Motivo: ${reason}`,
            updatedAt: new Date()
          }
        });
        return {
          status: 'VOIDED_ADMINISTRATIVELY',
          order: voided,
          reversalType: 'ADMINISTRATIVE_ONLY',
          physicalReversedQuantity: 0,
          reason
        };
      }

      // Determinar cantidad a revertir físicamente
      const qtyToReverse = decimalLt(availableFg, producedQty) ? availableFg : producedQty;
      const isPartialReversal = decimalLt(qtyToReverse, producedQty);

      // 1. Retirar producto terminado de la bodega de destino mediante InventoryEngine
      const fgUnitCost = order.unitCostReal !== null ? Number(order.unitCostReal) : undefined;
      await InventoryEngine.recordMovement({
        businessId,
        branchId: branchId || undefined,
        warehouseId: targetWarehouseId || undefined,
        productId: order.recipe.productId,
        quantity: qtyToReverse.times(-1),
        type: 'REVERSION_PRODUCCION' as any,
        unitCost: fgUnitCost,
        reason: `Reversión compensatoria de orden #${order.code || order.id.slice(0, 8)}. Motivo: ${reason}`,
        reference: order.code || order.id,
        sourceDocType: 'PRODUCCION',
        sourceDocId: order.id,
        createdBy: reversedBy || 'REVERSION'
      }, tx);

      // 2. Reingresar materias primas consumidas proporcionalmente a la cantidad revertida
      const factor = decimalDiv(qtyToReverse, producedQty);
      for (const item of order.items) {
        const consumedQty = toDecimal(item.actualQuantity);
        const qtyToReturn = roundQty(decimalMul(consumedQty, factor));
        const itemCost = item.unitCost !== null && !toDecimal(item.unitCost).isZero() ? Number(item.unitCost) : undefined;

        if (qtyToReturn.gt(0)) {
          await InventoryEngine.recordMovement({
            businessId,
            branchId: branchId || undefined,
            warehouseId: sourceWarehouseId || undefined,
            productId: item.ingredientId,
            quantity: qtyToReturn,
            type: 'REVERSION_PRODUCCION' as any,
            unitCost: itemCost,
            reason: `Reingreso compensatorio por reversión de orden #${order.code || order.id.slice(0, 8)}`,
            reference: order.code || order.id,
            sourceDocType: 'PRODUCCION',
            sourceDocId: order.id,
            createdBy: reversedBy || 'REVERSION'
          }, tx);
        }
      }

      // 3. Sellar estado de la orden
      const finalStatus = isPartialReversal ? 'PARTIALLY_REVERSED' : 'REVERSED';
      const updatedOrder = await tx.productionOrder.update({
        where: { id: order.id },
        data: {
          status: finalStatus,
          reversalReason: reason,
          updatedAt: new Date()
        }
      });

      return {
        status: finalStatus,
        order: updatedOrder,
        reversalType: isPartialReversal ? 'PARTIAL_PHYSICAL' : 'FULL_PHYSICAL',
        physicalReversedQuantity: qtyToReverse.toNumber(),
        reason
      };
    }, { maxWait: 15000, timeout: 35000 });
  }
}
