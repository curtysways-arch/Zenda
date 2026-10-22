import { Prisma } from '@prisma/client';
import {
  toDecimal,
  roundCost,
  roundQty,
  roundMoney,
  addDecimal,
  subDecimal,
  mulDecimal,
  divDecimal,
  DecimalInput
} from '../../lib/math/money';

export type CostStatus = 'KNOWN' | 'UNKNOWN' | 'ESTIMATED' | 'PENDING_VALUATION';
export type CostSource =
  | 'PURCHASE'
  | 'PRODUCTION'
  | 'INITIAL_INVENTORY'
  | 'MANUAL_ADJUSTMENT'
  | 'RETURN'
  | 'IMPORT';

export interface PmpCalculationResult {
  previousStock: Prisma.Decimal;
  previousPmp: Prisma.Decimal;
  incomingQty: Prisma.Decimal;
  incomingUnitCost: Prisma.Decimal;
  newStock: Prisma.Decimal;
  newPmp: Prisma.Decimal;
  negativeStockAdjustment: Prisma.Decimal; // Ajuste por absorción de déficit si había saldo negativo
  costStatus: CostStatus;
  costSource: CostSource;
  notes?: string;
}

export interface ProductionCostingItem {
  productId: string;
  consumedQty: DecimalInput; // Ya en unidad base canónica
  unitPmp: DecimalInput; // PMP vigente del insumo
  costStatus?: CostStatus;
}

export interface ProductionCostingResult {
  totalIngredientsCost: Prisma.Decimal;
  indirectCosts: Prisma.Decimal;
  totalProductionCost: Prisma.Decimal;
  producedQty: Prisma.Decimal;
  unitProductionCost: Prisma.Decimal;
}

export class CostingEngine {
  /**
   * Calcula el nuevo Costo Promedio Ponderado Móvil (PMP) ante una entrada de inventario.
   * Maneja rigurosamente:
   * - Stock positivo normal (PMP clásico)
   * - Stock inicial o saldo cero
   * - Stock negativo previo (con absorción contable y negativeStockAdjustment)
   */
  public static calculateIncomingPmp(params: {
    currentStock: DecimalInput;
    currentPmp: DecimalInput;
    incomingQty: DecimalInput;
    incomingUnitCost: DecimalInput;
    costSource: CostSource;
    costStatus?: CostStatus;
  }): PmpCalculationResult {
    const stock = roundQty(params.currentStock);
    const pmpAnt = roundCost(params.currentPmp);
    const incomingQty = roundQty(params.incomingQty);
    const incomingCost = roundCost(params.incomingUnitCost);
    const source = params.costSource;
    const status = params.costStatus || 'KNOWN';

    if (incomingQty.isNegative() || incomingQty.isZero()) {
      throw new Error(`La cantidad entrante debe ser positiva para calcular PMP (recibido: ${incomingQty.toString()}).`);
    }

    const newStock = addDecimal(stock, incomingQty);
    let newPmp = incomingCost;
    let negativeAdjustment = toDecimal(0);
    let notes = '';

    // CASO 0: Entrada con costo no verificado (UNKNOWN o PENDING_VALUATION)
    if (status === 'UNKNOWN' || status === 'PENDING_VALUATION') {
      if (stock.isPositive() && !pmpAnt.isZero()) {
        newPmp = pmpAnt; // No contamina el PMP conocido existente
        notes = 'Entrada con costo UNKNOWN/PENDING_VALUATION: se preserva PMP previo para no contaminar valoración.';
      } else {
        newPmp = toDecimal(0);
        notes = 'Entrada con costo UNKNOWN/PENDING_VALUATION sobre saldo sin valoración previa.';
      }
    }
    // CASO 1: Saldo inicial o stock cero o costo previo desconocido (con entrada válida)
    else if (stock.isZero() || params.currentPmp === null || params.currentPmp === undefined) {
      newPmp = incomingCost;
      notes = stock.isZero()
        ? 'PMP inicial fijado por entrada en stock cero.'
        : 'PMP inicial fijado por entrada que reemplaza saldo con costo desconocido (UNKNOWN).';
    }

    // CASO 2: Stock positivo normal (Ponderación estándar)
    else if (stock.isPositive()) {
      const prevTotalValue = mulDecimal(stock, pmpAnt);
      const incomingTotalValue = mulDecimal(incomingQty, incomingCost);
      const totalCombinedValue = addDecimal(prevTotalValue, incomingTotalValue);
      newPmp = divDecimal(totalCombinedValue, newStock);
      notes = `PMP ponderado normal (${stock.toString()} * $${pmpAnt.toString()} + ${incomingQty.toString()} * $${incomingCost.toString()}) / ${newStock.toString()}.`;
    }

    // CASO 3: Stock negativo previo (Déficit operacional)
    else if (stock.isNegative()) {
      const deficit = stock.abs(); // Cantidad vendida en descubierto
      // Variación de costo entre el precio de venta anticipada/PMP referencial y la compra real
      const costDelta = subDecimal(incomingCost, pmpAnt);
      negativeAdjustment = mulDecimal(deficit, costDelta);

      if (incomingQty.greaterThan(deficit)) {
        // La compra cubre el 100% del déficit y deja saldo positivo remanente
        // El nuevo PMP de las unidades remanentes positivas es exactamente el costo de esta compra
        newPmp = incomingCost;
        notes = `Déficit de ${deficit.toString()} unidades compensado. Variación absorbida: $${negativeAdjustment.toFixed(2)}. Saldo remanente a nuevo costo de compra.`;
      } else {
        // La compra solo cubre parcialmente o exactamente el déficit
        // El stock sigue siendo negativo o cero; el costo de referencia se actualiza al nuevo precio
        newPmp = incomingCost;
        notes = `Entrada cubrió parcialmente déficit (${incomingQty.toString()} de ${deficit.toString()}). Ajuste: $${negativeAdjustment.toFixed(2)}.`;
      }
    }

    return {
      previousStock: stock,
      previousPmp: pmpAnt,
      incomingQty,
      incomingUnitCost: incomingCost,
      newStock: roundQty(newStock),
      newPmp: roundCost(newPmp),
      negativeStockAdjustment: roundCost(negativeAdjustment),
      costStatus: status,
      costSource: source,
      notes
    };
  }

  /**
   * Costeo de una Orden de Producción:
   * Valora los insumos consumidos a su PMP vigente y calcula el costo unitario del producto elaborado.
   * Prohíbe taxativamente usar costo $0 o insumos con costStatus !== 'KNOWN'.
   */
  public static calculateProductionCost(
    items: ProductionCostingItem[],
    producedQty: DecimalInput,
    indirectCosts: DecimalInput = '0'
  ): ProductionCostingResult {
    const qtyProduced = roundQty(producedQty);
    if (qtyProduced.isNegative() || qtyProduced.isZero()) {
      throw new Error('La cantidad producida debe ser un número positivo mayor a cero.');
    }

    let totalIngredients = toDecimal(0);

    for (const item of items) {
      if (item.costStatus && item.costStatus !== 'KNOWN') {
        throw new Error(
          `Costo no verificado: el insumo "${item.productId}" tiene costStatus="${item.costStatus}". El sistema prohíbe asumir costo $0 o no verificado para costeo de producción.`
        );
      }
      if (item.unitPmp === null || item.unitPmp === undefined) {
        throw new Error(
          `El insumo "${item.productId}" tiene costo desconocido (NULL). Debe registrarse una compra con costo respaldado antes de procesar la producción.`
        );
      }
      const q = roundQty(item.consumedQty);
      const pmp = roundCost(item.unitPmp);
      const lineCost = mulDecimal(q, pmp);
      totalIngredients = addDecimal(totalIngredients, lineCost);
    }

    const indirects = roundCost(indirectCosts);
    const totalProduction = addDecimal(totalIngredients, indirects);
    const unitCost = divDecimal(totalProduction, qtyProduced);

    return {
      totalIngredientsCost: roundCost(totalIngredients),
      indirectCosts: roundCost(indirects),
      totalProductionCost: roundCost(totalProduction),
      producedQty: qtyProduced,
      unitProductionCost: roundCost(unitCost)
    };
  }

  /**
   * Devolución de Cliente:
   * Reingresa las existencias valorizadas estrictamente a su COSTO HISTÓRICO original de salida.
   */
  public static calculateCustomerReturnPmp(params: {
    currentStock: DecimalInput;
    currentPmp: DecimalInput;
    returnedQty: DecimalInput;
    historicalUnitCost: DecimalInput; // Costo exacto que tenía al momento de la venta
  }): PmpCalculationResult {
    return this.calculateIncomingPmp({
      currentStock: params.currentStock,
      currentPmp: params.currentPmp,
      incomingQty: params.returnedQty,
      incomingUnitCost: params.historicalUnitCost,
      costSource: 'RETURN',
      costStatus: 'KNOWN'
    });
  }

  /**
   * Devolución a Proveedor:
   * Reduce inventario valorizado al costo pactado en la Nota de Crédito.
   * Si no hay variación pactada, no altera el PMP de las existencias que quedan en bodega.
   */
  public static calculateSupplierReturnEffect(params: {
    currentStock: DecimalInput;
    currentPmp: DecimalInput;
    returnedQty: DecimalInput;
    creditNoteUnitCost: DecimalInput;
  }) {
    const stock = roundQty(params.currentStock);
    const pmp = roundCost(params.currentPmp);
    const returnedQty = roundQty(params.returnedQty);
    const creditCost = roundCost(params.creditNoteUnitCost);

    const newStock = subDecimal(stock, returnedQty);
    // Variación contra el PMP contable
    const costDelta = subDecimal(creditCost, pmp);
    const supplierVariance = mulDecimal(returnedQty, costDelta);

    return {
      previousStock: stock,
      returnedQty,
      newStock: roundQty(newStock),
      currentPmp: pmp,
      creditNoteUnitCost: creditCost,
      supplierVariance: roundCost(supplierVariance)
    };
  }

  /**
   * Calcula el PMP Consolidado Corporativo:
   * Σ(stock_sucursal × PMP_sucursal) / Σ(stock_sucursal)
   * Regla de Certificación: Solo pondera existencias con costo KNOWN.
   * Si alguna sucursal con stock positivo posee costo UNKNOWN o PENDING_VALUATION,
   * el estado corporativo queda PENDING_VALUATION.
   */
  public static calculateCorporatePmp(branches: Array<{
    stock: DecimalInput;
    pmp: DecimalInput | null;
    costStatus?: CostStatus | string | null;
  }>): {
    totalStock: Prisma.Decimal;
    totalValuation: Prisma.Decimal;
    consolidatedPmp: Prisma.Decimal | null;
    costStatus: CostStatus;
  } {
    let sumStock = toDecimal(0);
    let sumValuation = toDecimal(0);
    let anyPending = false;

    for (const b of branches) {
      const s = roundQty(b.stock);
      if (s.isPositive()) {
        if (b.costStatus === 'UNKNOWN' || b.costStatus === 'PENDING_VALUATION' || b.pmp === null || b.pmp === undefined) {
          anyPending = true;
        } else {
          const p = roundCost(b.pmp);
          const val = mulDecimal(s, p);
          sumStock = addDecimal(sumStock, s);
          sumValuation = addDecimal(sumValuation, val);
        }
      }
    }

    if (sumStock.isZero()) {
      return {
        totalStock: toDecimal(0),
        totalValuation: toDecimal(0),
        consolidatedPmp: null,
        costStatus: anyPending ? 'PENDING_VALUATION' : 'KNOWN'
      };
    }

    const pmp = roundCost(divDecimal(sumValuation, sumStock));
    return {
      totalStock: roundQty(sumStock),
      totalValuation: roundMoney(sumValuation),
      consolidatedPmp: pmp,
      costStatus: anyPending ? 'PENDING_VALUATION' : 'KNOWN'
    };
  }
}

