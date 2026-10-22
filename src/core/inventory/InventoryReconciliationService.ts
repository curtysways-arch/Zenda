import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import {
  toDecimal,
  roundQty,
  roundCost,
  roundMoney,
  QTY_DECIMALS,
  COST_DECIMALS,
  MONEY_DECIMALS
} from '@/lib/math/money';

export type ReconciliationStatus =
  | 'OK'
  | 'DISCREPANCIA'
  | 'SIN_BODEGA'
  | 'SIN_KARDEX'
  | 'PENDIENTE_AUDITORIA';

export interface WarehouseBreakdown {
  warehouseId: string;
  warehouseNombre: string;
  warehouseTipo: string | null;
  branchId: string | null;
  branchNombre: string | null;
  quantity: string; // formato decimal string exacto
  quantityType: string; // typeof en SQLite
  updatedAt: string | null;
}

export interface BranchBreakdown {
  branchId: string;
  branchNombre: string;
  stock: string;
  stockType: string;
  updatedAt: string | null;
}

export interface KardexSummary {
  movementCount: number;
  saldoKardex: string | null;
  lastMovementType: string | null;
  lastMovementDate: string | null;
  hasKardex: boolean;
}

export interface ProductReconciliationItem {
  productId: string;
  nombre: string;
  sku: string | null;
  tipoProducto: string;
  negocioId: string;
  negocioNombre: string;
  
  // Stock por capas (representación decimal exacta en string)
  stockProducto: string | null;
  stockProductoType: string;
  stockBodegasTotal: string;
  stockSucursalesTotal: string;
  
  // Diferencias numéricas comprobadas
  difProdBodega: string;
  difBodegaSucursal: string;
  
  // Estado de conciliación y diagnóstico
  estado: ReconciliationStatus;
  motivos: string[];
  detallesDiferencia: {
    prodVsBodegas: string | null;
    bodegasVsSucursales: string | null;
    saldoNegativo: boolean;
    sinBodegasRegistradas: boolean;
    sinKardexHistorico: boolean;
  };

  // UOM y Unidades
  unidadMedidaDeclarada: string | null;
  unidadMedidaBase: string | null;
  uomStatus: string;
  uomLabel: string;
  uomReviewRequired: boolean;
  densidadGPerMl: string | null;
  conversionMassVolumeAllowed: boolean;

  // Costos y Valoración
  costoPromedio: string | null;
  costoPromedioType: string;
  costStatus: string;
  costLabel: string;
  costSource: string | null;
  costIsUnknown: boolean;
  negativeStockAdjustment: string;

  // Desgloses y trazabilidad
  bodegas: WarehouseBreakdown[];
  sucursales: BranchBreakdown[];
  kardex: KardexSummary;
}

export interface ReconciliationSummary {
  totalProductos: number;
  porEstado: Record<ReconciliationStatus, number>;
  uomPendientes: number;
  costosDesconocidos: number;
  productosConSaldoNegativo: number;
}

export interface ReconciliationFilterOptions {
  businessId?: string;
  branchId?: string;
  warehouseId?: string;
  estado?: ReconciliationStatus | 'ALL';
  search?: string;
  limit?: number;
  offset?: number;
}

export class InventoryReconciliationService {
  /**
   * Ejecuta la conciliación de inventario en modo ESTRICTAMENTE DE SOLO LECTURA.
   * No ejecuta ningún INSERT, UPDATE, DELETE ni modificación de estado.
   */
  public static async getReconciliationReport(
    options: ReconciliationFilterOptions = {}
  ): Promise<{ items: ProductReconciliationItem[]; summary: ReconciliationSummary }> {
    const { businessId, branchId, warehouseId, estado, search } = options;

    // 1. Consulta SQL de productos parametrizada de solo lectura
    // Se lee directamente con $queryRawUnsafe para evitar coerción a Int de Prisma Client
    let sqlProds = `
      SELECT 
        p.id, 
        p.nombre, 
        p.sku, 
        p.tipoProducto, 
        p.unidadMedida, 
        p.stock, 
        typeof(p.stock) as stockType,
        p.costoPromedio, 
        typeof(p.costoPromedio) as costoType,
        p.costStatus, 
        p.costSource, 
        p.unidadMedidaBase, 
        p.uomStatus, 
        p.densidadGPerMl, 
        p.negativeStockAdjustment, 
        p.negocioId, 
        n.nombre as negocioNombre
      FROM Producto p
      JOIN Negocio n ON p.negocioId = n.id
      WHERE 1=1
    `;
    const paramsProds: any[] = [];

    if (businessId) {
      sqlProds += ` AND p.negocioId = ?`;
      paramsProds.push(businessId);
    }
    if (search && search.trim() !== '') {
      sqlProds += ` AND (p.nombre LIKE ? OR p.sku LIKE ?)`;
      paramsProds.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }
    sqlProds += ` ORDER BY p.nombre ASC`;

    const rawProducts = await (prisma as any).$queryRawUnsafe(sqlProds, ...paramsProds);

    const items: ProductReconciliationItem[] = [];
    const summary: ReconciliationSummary = {
      totalProductos: 0,
      porEstado: {
        OK: 0,
        DISCREPANCIA: 0,
        SIN_BODEGA: 0,
        SIN_KARDEX: 0,
        PENDIENTE_AUDITORIA: 0
      },
      uomPendientes: 0,
      costosDesconocidos: 0,
      productosConSaldoNegativo: 0
    };

    for (const prod of rawProducts) {
      const prodStockDec = prod.stock !== null && prod.stock !== undefined
        ? roundQty(prod.stock)
        : null;
      const prodStockVal = prodStockDec !== null ? prodStockDec : toDecimal(0);

      // 2. Consulta de existencias por bodega para este producto (acotado al negocio)
      const rawWhStocks = await (prisma as any).$queryRawUnsafe(
        `SELECT 
          ws.id,
          ws.warehouseId,
          w.name as warehouseNombre,
          w.code as warehouseTipo,
          w.branchId,
          b.name as branchNombre,
          ws.quantity,
          typeof(ws.quantity) as quantityType,
          ws.updatedAt
        FROM WarehouseStock ws
        JOIN Warehouse w ON ws.warehouseId = w.id
        LEFT JOIN Branch b ON w.branchId = b.id
        WHERE ws.productId = ? AND w.businessId = ?
        ORDER BY w.name ASC`,
        prod.id,
        prod.negocioId
      );

      // Filtrar por bodega o sucursal si se especificó en opciones
      let filteredWhStocks = rawWhStocks;
      if (warehouseId) {
        filteredWhStocks = filteredWhStocks.filter((w: any) => w.warehouseId === warehouseId);
      }
      if (branchId) {
        filteredWhStocks = filteredWhStocks.filter((w: any) => w.branchId === branchId);
      }

      const bodegasBreakdown: WarehouseBreakdown[] = rawWhStocks.map((w: any) => ({
        warehouseId: w.warehouseId,
        warehouseNombre: w.warehouseNombre,
        warehouseTipo: w.warehouseTipo,
        branchId: w.branchId,
        branchNombre: w.branchNombre,
        quantity: roundQty(w.quantity ?? 0).toFixed(QTY_DECIMALS),
        quantityType: String(w.quantityType || 'unknown'),
        updatedAt: w.updatedAt ? new Date(w.updatedAt).toISOString() : null
      }));

      // Suma de bodegas con Prisma.Decimal
      let sumWhDec = toDecimal(0);
      for (const w of rawWhStocks) {
        sumWhDec = sumWhDec.add(toDecimal(w.quantity ?? 0));
      }
      sumWhDec = roundQty(sumWhDec);

      // 3. Consulta de existencias por sucursal (BranchInventory)
      const rawBrStocks = await (prisma as any).$queryRawUnsafe(
        `SELECT 
          bi.id,
          bi.branchId,
          b.name as branchNombre,
          bi.stock,
          typeof(bi.stock) as stockType,
          bi.updatedAt
        FROM BranchInventory bi
        JOIN Branch b ON bi.branchId = b.id
        WHERE bi.productId = ? AND bi.businessId = ?
        ORDER BY b.name ASC`,
        prod.id,
        prod.negocioId
      );

      const sucursalesBreakdown: BranchBreakdown[] = rawBrStocks.map((b: any) => ({
        branchId: b.branchId,
        branchNombre: b.branchNombre,
        stock: roundQty(b.stock ?? 0).toFixed(QTY_DECIMALS),
        stockType: String(b.stockType || 'unknown'),
        updatedAt: b.updatedAt ? new Date(b.updatedAt).toISOString() : null
      }));

      // Suma de sucursales con Prisma.Decimal
      let sumBrDec = toDecimal(0);
      for (const b of rawBrStocks) {
        sumBrDec = sumBrDec.add(toDecimal(b.stock ?? 0));
      }
      sumBrDec = roundQty(sumBrDec);

      // 4. Kardex (InventoryMovement)
      const rawMovements = await (prisma as any).$queryRawUnsafe(
        `SELECT 
          im.id,
          im.type,
          im.quantity,
          typeof(im.quantity) as quantityType,
          im.unitCost,
          im.totalCost,
          im.createdAt
        FROM InventoryMovement im
        WHERE im.productId = ? AND im.businessId = ?
        ORDER BY im.createdAt DESC`,
        prod.id,
        prod.negocioId
      );

      const movementCount = rawMovements.length;
      let saldoKardexDec: Prisma.Decimal | null = null;
      if (movementCount > 0) {
        let saldoAcc = toDecimal(0);
        for (const m of rawMovements) {
          saldoAcc = saldoAcc.add(toDecimal(m.quantity ?? 0));
        }
        saldoKardexDec = roundQty(saldoAcc);
      }

      const kardexSummary: KardexSummary = {
        movementCount,
        saldoKardex: saldoKardexDec !== null ? saldoKardexDec.toFixed(QTY_DECIMALS) : null,
        lastMovementType: movementCount > 0 ? rawMovements[0].type : null,
        lastMovementDate: movementCount > 0 ? new Date(rawMovements[0].createdAt).toISOString() : null,
        hasKardex: movementCount > 0
      };

      // 5. Cálculo exacto de diferencias
      const difProdBodegaDec = roundQty(prodStockVal.sub(sumWhDec));
      const difBodegaSucursalDec = roundQty(sumWhDec.sub(sumBrDec));

      // 6. Diagnóstico y Clasificación Estricta
      const motivos: string[] = [];
      let estadoCalculado: ReconciliationStatus = 'OK';
      const saldoNegativo = prodStockVal.isNegative() || sumWhDec.isNegative() || sumBrDec.isNegative();
      const sinBodegasRegistradas = rawWhStocks.length === 0 && prodStockVal.greaterThan(0);
      const sinKardexHistorico = movementCount === 0 && (prodStockVal.greaterThan(0) || sumWhDec.greaterThan(0));

      if (saldoNegativo) {
        estadoCalculado = 'PENDIENTE_AUDITORIA';
        motivos.push('Saldo negativo detectado en uno o más niveles de almacenamiento.');
        summary.productosConSaldoNegativo++;
      } else if (sinBodegasRegistradas) {
        estadoCalculado = 'SIN_BODEGA';
        motivos.push(`Tiene saldo en Producto (${prodStockVal.toFixed(QTY_DECIMALS)}) pero no existe registro en ninguna bodega física.`);
      } else if (sinKardexHistorico) {
        estadoCalculado = 'SIN_KARDEX';
        motivos.push('Existen existencias físicas o en producto sin movimientos registrados en el Kardex (InventoryMovement).');
      } else if (!difProdBodegaDec.isZero() || !difBodegaSucursalDec.isZero()) {
        estadoCalculado = 'DISCREPANCIA';
        if (!difProdBodegaDec.isZero()) {
          motivos.push(`Diferencia entre Producto (${prodStockVal.toFixed(QTY_DECIMALS)}) y Bodegas (${sumWhDec.toFixed(QTY_DECIMALS)}): dif = ${difProdBodegaDec.toFixed(QTY_DECIMALS)}.`);
        }
        if (!difBodegaSucursalDec.isZero()) {
          motivos.push(`Diferencia entre Bodegas (${sumWhDec.toFixed(QTY_DECIMALS)}) y Sucursales (${sumBrDec.toFixed(QTY_DECIMALS)}): dif = ${difBodegaSucursalDec.toFixed(QTY_DECIMALS)}.`);
        }
      } else {
        estadoCalculado = 'OK';
        motivos.push('Existencias plenamente alineadas y consistentes en Producto, Bodegas y Sucursales.');
      }

      // 7. Interpretación segura de UOM
      const rawUomStatus = prod.uomStatus ? String(prod.uomStatus).toUpperCase() : 'PENDING_REVIEW';
      const uomReviewRequired = rawUomStatus === 'PENDING_REVIEW' || !prod.unidadMedidaBase;
      const uomLabel = uomReviewRequired ? 'Requiere revisión (Pendiente)' : String(prod.unidadMedidaBase);
      if (uomReviewRequired) summary.uomPendientes++;

      const densidadDec = prod.densidadGPerMl !== null && prod.densidadGPerMl !== undefined
        ? roundQty(prod.densidadGPerMl)
        : null;
      const conversionMassVolumeAllowed = densidadDec !== null && densidadDec.greaterThan(0);

      // 8. Interpretación segura de Costo PMP (NUNCA mostrar cero engañoso)
      const rawCostStatus = prod.costStatus ? String(prod.costStatus).toUpperCase() : 'UNKNOWN';
      const costIsUnknown = rawCostStatus === 'UNKNOWN' || prod.costoPromedio === null || prod.costoPromedio === undefined;
      let costLabel = '';
      if (costIsUnknown) {
        costLabel = 'Costo desconocido (Pendiente de valoración)';
        summary.costosDesconocidos++;
      } else {
        costLabel = `$${roundCost(prod.costoPromedio).toFixed(COST_DECIMALS)}`;
      }

      // Si se filtró por estado específico, aplicar filtro
      if (estado && estado !== 'ALL' && estadoCalculado !== estado) {
        continue;
      }

      summary.totalProductos++;
      summary.porEstado[estadoCalculado]++;

      items.push({
        productId: prod.id,
        nombre: prod.nombre,
        sku: prod.sku,
        tipoProducto: prod.tipoProducto || 'VENTA',
        negocioId: prod.negocioId,
        negocioNombre: prod.negocioNombre,

        stockProducto: prod.stock !== null ? prodStockVal.toFixed(QTY_DECIMALS) : null,
        stockProductoType: String(prod.stockType || 'null'),
        stockBodegasTotal: sumWhDec.toFixed(QTY_DECIMALS),
        stockSucursalesTotal: sumBrDec.toFixed(QTY_DECIMALS),

        difProdBodega: difProdBodegaDec.toFixed(QTY_DECIMALS),
        difBodegaSucursal: difBodegaSucursalDec.toFixed(QTY_DECIMALS),

        estado: estadoCalculado,
        motivos,
        detallesDiferencia: {
          prodVsBodegas: !difProdBodegaDec.isZero() ? difProdBodegaDec.toFixed(QTY_DECIMALS) : null,
          bodegasVsSucursales: !difBodegaSucursalDec.isZero() ? difBodegaSucursalDec.toFixed(QTY_DECIMALS) : null,
          saldoNegativo,
          sinBodegasRegistradas,
          sinKardexHistorico
        },

        unidadMedidaDeclarada: prod.unidadMedida,
        unidadMedidaBase: prod.unidadMedidaBase,
        uomStatus: rawUomStatus,
        uomLabel,
        uomReviewRequired,
        densidadGPerMl: densidadDec !== null ? densidadDec.toFixed(QTY_DECIMALS) : null,
        conversionMassVolumeAllowed,

        costoPromedio: !costIsUnknown && prod.costoPromedio !== null ? roundCost(prod.costoPromedio).toFixed(COST_DECIMALS) : null,
        costoPromedioType: String(prod.costoType || 'null'),
        costStatus: rawCostStatus,
        costLabel,
        costSource: prod.costSource,
        costIsUnknown,
        negativeStockAdjustment: roundCost(prod.negativeStockAdjustment ?? 0).toFixed(COST_DECIMALS),

        bodegas: bodegasBreakdown,
        sucursales: sucursalesBreakdown,
        kardex: kardexSummary
      });
    }

    return { items, summary };
  }

  /**
   * Obtiene el detalle completo de solo lectura de un producto individual para el modal de detalle.
   */
  public static async getProductReconciliationDetail(
    productId: string,
    businessId?: string
  ): Promise<ProductReconciliationItem | null> {
    const report = await this.getReconciliationReport({
      businessId,
      search: undefined
    });
    const found = report.items.find(i => i.productId === productId);
    return found || null;
  }
}
