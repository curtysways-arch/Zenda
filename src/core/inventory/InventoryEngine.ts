import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import {
  toDecimal,
  roundQty,
  roundCost,
  roundMoney,
  isIntegerDecimal,
  addDecimal,
  subDecimal,
  mulDecimal,
  divDecimal,
  DecimalInput
} from '@/lib/math/money';
import { CostingEngine, CostSource, CostStatus } from '../costing/CostingEngine';
import { UnitConversionService } from './UnitConversionService';

export type MovementType =
  | 'INICIAL'
  | 'ENTRADA'
  | 'SALIDA'
  | 'AJUSTE'
  | 'VENTA'
  | 'COMPRA'
  | 'TRANSFERENCIA_SALIDA'
  | 'TRANSFERENCIA_ENTRADA'
  | 'CONSUMO_PRODUCCION'
  | 'INGRESO_PRODUCCION'
  | 'MERMA_PRODUCCION'
  | 'TRANSFER_LOSS'
  | 'REVERSION_PRODUCCION'
  | 'DEVOLUCION_CLIENTE'
  | 'DEVOLUCION_PROVEEDOR'
  | 'COST_VARIATION_ADJUSTMENT'
  | string;

export interface RecordMovementInput {
  businessId: string;
  branchId?: string;
  warehouseId?: string;
  productId: string;
  variantId?: string | null;
  quantity: number | DecimalInput; // Positivo para entradas/compras/producción, negativo para salidas/ventas/consumos
  type: MovementType;
  unitCost?: number | DecimalInput;
  totalCost?: number | DecimalInput;
  reason?: string;
  reference?: string;
  sourceDocType?: 'VENTA' | 'COMPRA' | 'PRODUCCION' | 'AJUSTE' | 'TRANSFERENCIA' | string;
  sourceDocId?: string;
  createdBy?: string;
  allowNegative?: boolean;
  businessType?: string;
}

/**
 * Cliente de Prisma utilizable dentro o fuera de una transacción interactiva.
 * Se tipa como `any` por coherencia con el resto de motores del proyecto.
 */
export type PrismaTx = any;

export class InventoryEngine {
  /**
   * Valida la cantidad según las reglas de la vertical de negocio:
   * - Lavandería / Canchas / Servicios: estrictamente números enteros.
   * - Cafetería / Restaurante / Tienda: permite fracciones decimales válidas (ej: 0.450 kg).
   */
  public static validateVerticalQuantity(quantity: DecimalInput, businessType?: string): Prisma.Decimal {
    const q = toDecimal(quantity);
    if (q.isZero()) {
      throw new Error('La cantidad no puede ser cero.');
    }
    const normType = (businessType || '').toUpperCase();
    if (normType === 'LAVANDERIA' || normType === 'SHOE_CARE' || normType === 'CANCHAS' || normType === 'SERVICIOS') {
      if (!isIntegerDecimal(q)) {
        throw new Error(`La vertical ${normType} requiere cantidades enteras. Recibido: ${q.toString()}`);
      }
    }
    return roundQty(q);
  }

  /**
   * Registra un movimiento de inventario y actualiza el stock correspondiente.
   *
   * - Si se recibe `tx`, TODAS las escrituras se realizan dentro de la transacción del invocador
   *   (producción, checkout POS, recepción de compras), de modo que un fallo posterior revierte
   *   también este movimiento.
   * - Si no se recibe `tx`, se abre una transacción propia (comportamiento anterior).
   */
  public static async recordMovement(input: RecordMovementInput, tx?: PrismaTx) {
    if (tx) {
      return this.applyMovement(tx, input);
    }
    const client = (input as any).prismaClient || prisma;
    return await (client as any).$transaction((innerTx: PrismaTx) => this.applyMovement(innerTx, input));
  }

  /**
   * Lógica central de aplicación de un movimiento. Siempre se ejecuta con un cliente transaccional.
   */
  private static async applyMovement(tx: PrismaTx, input: RecordMovementInput) {
    const {
      businessId,
      productId,
      variantId,
      quantity,
      type,
      unitCost,
      totalCost,
      reason,
      reference,
      sourceDocType,
      sourceDocId,
      createdBy,
      allowNegative = false
    } = input;

    const qtyDecimal = this.validateVerticalQuantity(quantity, input.businessType);

    // 1. Obtener producto o variante (siempre acotado al negocio) primero
    let currentStock: number | null = 0;
    let targetProduct: any = null;
    let targetVariant: any = null;

    if (variantId) {
      const rawVars: any[] = await tx.$queryRawUnsafe(
        `SELECT pv.id, pv.stock, pv.nombre, pv.productoId, p.negocioId, p.nombre as prodNombre, p.tipoProducto, p.costoUnitario
         FROM ProductoVariante pv
         JOIN Producto p ON pv.productoId = p.id
         WHERE pv.id = ?`,
        variantId
      );
      targetVariant = rawVars[0] || null;
      if (
        !targetVariant ||
        targetVariant.negocioId !== businessId ||
        targetVariant.productoId !== productId
      ) {
        throw new Error('Variante no encontrada o no pertenece al producto/negocio.');
      }
      currentStock = targetVariant.stock !== null ? Number(targetVariant.stock) : null;
      targetProduct = {
        nombre: targetVariant.prodNombre,
        tipoProducto: targetVariant.tipoProducto,
        costoUnitario: targetVariant.costoUnitario
      };
    } else {
      const rawProds: any[] = await tx.$queryRawUnsafe(
        `SELECT id, stock, tipoProducto, costoUnitario, negocioId, nombre FROM Producto WHERE id = ?`,
        productId
      );
      targetProduct = rawProds[0] || null;
      if (!targetProduct || targetProduct.negocioId !== businessId) {
        throw new Error('Producto no encontrado o no pertenece al negocio.');
      }
      currentStock = targetProduct.stock !== null ? Number(targetProduct.stock) : null;
    }

    // Los productos no inventariables no alteran stock numérico ni requieren bodega
    if (targetProduct && targetProduct.tipoProducto === 'NO_INVENTARIABLE') {
      return { skipped: true, reason: 'Producto no inventariable' };
    }

    // Resolver y validar la sucursal dentro del mismo negocio
    let branchId = input.branchId;
    if (branchId) {
      const branch = await tx.branch.findFirst({ where: { id: branchId, businessId, active: true } });
      if (!branch) throw new Error('La sucursal indicada no existe, está inactiva o no pertenece al negocio.');
    } else {
      const mainBranch = await tx.branch.findFirst({
        where: { businessId, active: true },
        orderBy: { isMain: 'desc' }
      });
      if (mainBranch) {
        branchId = mainBranch.id;
      } else {
        const anyBranch = await tx.branch.findFirst({ where: { businessId, active: true } });
        if (anyBranch) branchId = anyBranch.id;
      }
    }

    if (!branchId) {
      throw new Error('No se encontró una sucursal activa para asociar el movimiento de inventario.');
    }

    // Regla 15 y 16: Toda operación que modifique inventario físico requiere bodega válida
    let warehouseId = input.warehouseId;
    if (!warehouseId) {
      // Intentar resolver la bodega predeterminada de la sucursal
      const defaultWh = await tx.warehouse.findFirst({
        where: { businessId, branchId, isDefault: true, active: true }
      });
      if (defaultWh) {
        warehouseId = defaultWh.id;
      } else {
        // Fallback a primera bodega activa de esa sucursal
        const firstWh = await tx.warehouse.findFirst({
          where: { businessId, branchId, active: true }
        });
        if (firstWh) warehouseId = firstWh.id;
      }
    }

    if (!warehouseId) {
      throw new Error('La sucursal no tiene una bodega de inventario configurada. Configure una bodega antes de realizar esta operación.');
    }

    const wh = await tx.warehouse.findFirst({
      where: { id: warehouseId, businessId, branchId, active: true }
    });
    if (!wh) {
      throw new Error('La bodega indicada no existe, está inactiva o no pertenece a la sucursal/negocio.');
    }

    // Regla C3.4: Blindaje de bodegas virtuales del sistema (TRANSIT / SCRAP_WASTE)
    const isVirtualWh = wh.type === 'TRANSIT' || wh.type === 'SCRAP_WASTE';
    const isAllowedVirtualMovement =
      type === 'TRANSFERENCIA_SALIDA' ||
      type === 'TRANSFERENCIA_ENTRADA' ||
      type === 'TRANSFER_LOSS' ||
      type === 'MERMA_PRODUCCION';

    if (isVirtualWh && !isAllowedVirtualMovement) {
      throw new Error(`Operación inválida: no se permiten movimientos directos de tipo "${type}" sobre la bodega virtual ${wh.type}.`);
    }

    const prevStockDec = roundQty(toDecimal(currentStock ?? 0));
    const newStockDec = roundQty(addDecimal(prevStockDec, qtyDecimal));
    if (!allowNegative && newStockDec.isNegative()) {
      const prodName = targetVariant ? `${targetProduct.nombre} (${targetVariant.nombre})` : targetProduct.nombre;
      throw new Error(`Stock insuficiente para "${prodName}". Disponible: ${prevStockDec.toString()}, Solicitado: ${qtyDecimal.abs().toString()}.`);
    }

    const newStockNum = newStockDec.toNumber();

    // 2. Actualizar stock global con CAS (control de concurrencia optimista) como proyección/cache
    let affectedRows = 0;
    if (variantId) {
      affectedRows = await tx.$executeRawUnsafe(
        `UPDATE ProductoVariante SET stock = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND (stock = ? OR (stock IS NULL AND ? IS NULL))`,
        newStockNum,
        variantId,
        currentStock,
        currentStock
      );
    } else {
      affectedRows = await tx.$executeRawUnsafe(
        `UPDATE Producto SET stock = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND negocioId = ? AND (stock = ? OR (stock IS NULL AND ? IS NULL))`,
        newStockNum,
        productId,
        businessId,
        currentStock,
        currentStock
      );
    }

    if (affectedRows !== 1) {
      throw new Error(
        'Conflicto de concurrencia: el stock fue modificado por otra operación simultánea. Reintente la operación.'
      );
    }

    // 3. Actualizar WarehouseStock (Fuente física de la verdad)
    const wStock = await tx.warehouseStock.findFirst({
      where: {
        warehouseId,
        productId,
        variantId: variantId || null
      }
    });

    const prevWhQty = wStock ? roundQty(toDecimal(wStock.quantity ?? 0)) : toDecimal(0);
    const newWhQty = roundQty(addDecimal(prevWhQty, qtyDecimal));

    if (wStock) {
      await tx.warehouseStock.update({
        where: { id: wStock.id },
        data: {
          quantity: newWhQty.toNumber(),
          updatedAt: new Date()
        }
      });
    } else {
      await tx.warehouseStock.create({
        data: {
          warehouseId,
          productId,
          variantId: variantId || null,
          quantity: newWhQty.toNumber()
        }
      });
    }

    // 4. Actualizar BranchInventory y CostingEngine / PMP
    const rawBranchRows: any[] = await tx.$queryRawUnsafe(
      `SELECT id, stock, costoPromedio, lastKnownCost FROM BranchInventory WHERE branchId = ? AND productId = ? AND (varianteId = ? OR (varianteId IS NULL AND ? IS NULL))`,
      branchId,
      productId,
      variantId || null,
      variantId || null
    );
    const branchInv = rawBranchRows[0] || null;

    const prevBranchStock = branchInv ? roundQty(toDecimal(branchInv.stock ?? 0)) : toDecimal(0);
    const newBranchStock = roundQty(addDecimal(prevBranchStock, qtyDecimal));

    let branchPmp: Prisma.Decimal | null = branchInv?.costoPromedio !== null && branchInv?.costoPromedio !== undefined
      ? roundCost(toDecimal(branchInv.costoPromedio))
      : null;
    let branchLastKnown: Prisma.Decimal | null = branchInv?.lastKnownCost !== null && branchInv?.lastKnownCost !== undefined
      ? roundCost(toDecimal(branchInv.lastKnownCost))
      : null;

    // Determinar costo de salida vs recálculo de entrada
    let finalUnitCost: number | null = null;
    let finalTotalCost: number | null = null;

    const isEntry = qtyDecimal.isPositive() && (
      type === 'ENTRADA' ||
      type === 'COMPRA' ||
      type === 'INGRESO_PRODUCCION' ||
      (type as string) === 'PRODUCCION_ENTRADA' ||
      type === 'INICIAL' ||
      (type as string) === 'SALDO_INICIAL' ||
      type === 'AJUSTE' ||
      type === 'TRANSFERENCIA_ENTRADA' ||
      type === 'DEVOLUCION_CLIENTE'
    );

    if (isEntry && unitCost !== undefined && unitCost !== null && !toDecimal(unitCost).isZero()) {
      const incomingCostDec = roundCost(toDecimal(unitCost));
      const costSource: CostSource = (type === 'COMPRA') ? 'PURCHASE'
        : (type === 'INGRESO_PRODUCCION' || (type as string) === 'PRODUCCION_ENTRADA') ? 'PRODUCTION'
        : (type === 'INICIAL' || (type as string) === 'SALDO_INICIAL') ? 'INITIAL_INVENTORY'
        : (type === 'TRANSFERENCIA_ENTRADA') ? 'PURCHASE'
        : (type === 'DEVOLUCION_CLIENTE') ? 'RETURN'
        : 'MANUAL_ADJUSTMENT';

      const pmpResult = CostingEngine.calculateIncomingPmp({
        currentStock: prevBranchStock,
        currentPmp: branchPmp,
        incomingQty: qtyDecimal,
        incomingUnitCost: incomingCostDec,
        costSource,
        costStatus: 'KNOWN'
      });

      branchPmp = pmpResult.newPmp;
      branchLastKnown = branchPmp;

      finalUnitCost = incomingCostDec.toNumber();
      finalTotalCost = roundCost(mulDecimal(qtyDecimal, incomingCostDec)).toNumber();
    } else if (type === 'VENTA' || (!qtyDecimal.isPositive() && (type === 'SALIDA' || type === 'CONSUMO_PRODUCCION'))) {
      // Regla 13 y 19: Costo de salida es el PMP vigente certificado de la sucursal (NUNCA el precio de venta)
      if (branchPmp !== null) {
        finalUnitCost = branchPmp.toNumber();
        finalTotalCost = roundCost(mulDecimal(qtyDecimal.abs(), branchPmp)).toNumber();
      } else {
        finalUnitCost = null;
        finalTotalCost = null;
      }
    } else if (unitCost !== undefined && unitCost !== null) {
      finalUnitCost = toDecimal(unitCost).toNumber();
      finalTotalCost = totalCost !== undefined && totalCost !== null ? toDecimal(totalCost).toNumber() : roundCost(mulDecimal(qtyDecimal.abs(), toDecimal(unitCost))).toNumber();
    }

    let branchInvId = branchInv?.id;
    if (branchInv) {
      await tx.$executeRawUnsafe(
        `UPDATE BranchInventory SET stock = ?, costoPromedio = ?, lastKnownCost = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
        newBranchStock.toNumber(),
        branchPmp ? branchPmp.toNumber() : null,
        branchLastKnown ? branchLastKnown.toNumber() : null,
        branchInv.id
      );
    } else {
      branchInvId = `bi_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await tx.$executeRawUnsafe(
        `INSERT INTO BranchInventory (id, branchId, productId, varianteId, businessId, stock, minStock, costoPromedio, lastKnownCost, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        branchInvId,
        branchId,
        productId,
        variantId || null,
        businessId,
        newBranchStock.toNumber(),
        branchPmp ? branchPmp.toNumber() : null,
        branchLastKnown ? branchLastKnown.toNumber() : null
      );
    }

    // Regla 10: Recalcular y sincronizar PMP corporativo consolidado en Producto.costoPromedio
    try {
      const allBranchRows: any[] = await tx.$queryRawUnsafe(
        `SELECT id, stock, costoPromedio FROM BranchInventory WHERE productId = ? AND businessId = ? AND (varianteId IS NULL)`,
        productId,
        businessId
      );
      if (allBranchRows && allBranchRows.length > 0) {
        const corpCalc = CostingEngine.calculateCorporatePmp(
          allBranchRows.map((b: any) => ({
            stock: b.stock,
            pmp: b.costoPromedio,
            costStatus: b.costoPromedio !== null ? 'KNOWN' : 'UNKNOWN'
          }))
        );
        await tx.$executeRawUnsafe(
          `UPDATE Producto SET costoPromedio = ?, costStatus = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
          corpCalc.consolidatedPmp ? corpCalc.consolidatedPmp.toNumber() : null,
          corpCalc.costStatus,
          productId
        );
      }
    } catch (corpErr) {
      console.warn('[INVENTORY_ENGINE_CORP_PMP_WARN]', corpErr);
    }

    // 5. Registro auditable inmutable en InventoryMovement (Kardex)
    const movId = `mov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await tx.$executeRawUnsafe(
      `INSERT INTO InventoryMovement (id, businessId, branchId, productId, varianteId, quantity, type, unitCost, totalCost, reason, reference, sourceDocType, sourceDocId, warehouseId, createdBy, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      movId,
      businessId,
      branchId,
      productId,
      variantId || null,
      qtyDecimal.toNumber(),
      type,
      finalUnitCost,
      finalTotalCost,
      reason || type,
      reference || null,
      sourceDocType || null,
      sourceDocId || null,
      warehouseId,
      createdBy || 'SISTEMA'
    );

    return {
      id: movId,
      quantity: qtyDecimal.toNumber(),
      type,
      warehouseId,
      branchId,
      unitCost: finalUnitCost,
      totalCost: finalTotalCost
    };
  }

  /**
   * Obtiene el Kardex completo de movimientos de un producto o del negocio
   */
  public static async getKardex(businessId: string, options?: { productId?: string; branchId?: string; take?: number }) {
    const where: any = { businessId };
    if (options?.productId) where.productId = options.productId;
    if (options?.branchId) where.branchId = options.branchId;

    const movements = await (prisma as any).inventoryMovement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.take || 200
    });

    return movements;
  }

  /**
   * Alertas de stock bajo
   */
  public static async getLowStockAlerts(businessId: string, threshold = 5) {
    const products = await (prisma as any).producto.findMany({
      where: {
        negocioId: businessId,
        activo: true,
        tipoProducto: { not: 'NO_INVENTARIABLE' }
      },
      include: {
        variantes: { where: { activo: true } }
      }
    });

    const lowStockItems: any[] = [];

    for (const p of products) {
      if (p.tieneVariantes) {
        for (const v of p.variantes) {
          if ((v.stock ?? 0) <= threshold) {
            lowStockItems.push({
              productId: p.id,
              variantId: v.id,
              name: `${p.nombre} (${v.nombre})`,
              stock: v.stock ?? 0,
              sku: v.sku || p.sku,
              threshold
            });
          }
        }
      } else {
        if ((p.stock ?? 0) <= threshold) {
          lowStockItems.push({
            productId: p.id,
            variantId: null,
            name: p.nombre,
            stock: p.stock ?? 0,
            sku: p.sku,
            threshold
          });
        }
      }
    }

    return lowStockItems;
  }
}
