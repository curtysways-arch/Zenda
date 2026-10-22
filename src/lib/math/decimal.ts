import { Prisma } from '@prisma/client';

export type Decimal = Prisma.Decimal;
export type DecimalInput = string | number | Prisma.Decimal | null | undefined;

/**
 * Escalas de precisión canónicas de Citiox
 */
export const QTY_SCALE = 4;      // Cantidades físicas y stock: DECIMAL(18, 4)
export const COST_SCALE = 6;     // Costos unitarios y PMP: DECIMAL(18, 6)
export const MONEY_SCALE = 2;    // Importes monetarios y precios: DECIMAL(18, 2)

/**
 * Convierte un valor seguro a Prisma.Decimal.
 * Soporta Prisma.Decimal, string numérico, number primitivo.
 * Retorna defaultValue si el valor es null, undefined o cadena vacía.
 */
export function toDecimal(value: DecimalInput, defaultValue = '0'): Prisma.Decimal {
  if (value === null || value === undefined || value === '') {
    return new Prisma.Decimal(defaultValue);
  }
  if (value instanceof Prisma.Decimal) {
    return value;
  }
  // Si es un objeto serializado con estructura Decimal pero no instancia directa
  const valObj = value as any;
  if (typeof valObj === 'object' && valObj !== null && 'd' in valObj && 'e' in valObj && 's' in valObj) {
    return new Prisma.Decimal(valObj.toString());
  }
  try {
    const str = String(value).trim();
    if (str === '' || isNaN(Number(str))) {
      throw new Error(`Valor no convertible a Decimal: "${value}"`);
    }
    return new Prisma.Decimal(str);
  } catch (err: any) {
    throw new Error(`Error en toDecimal("${value}"): ${err.message}`);
  }
}

/**
 * Operaciones aritméticas básicas seguras con Decimal
 */
export function decimalAdd(a: DecimalInput, b: DecimalInput): Prisma.Decimal {
  return toDecimal(a).plus(toDecimal(b));
}

export function decimalSub(a: DecimalInput, b: DecimalInput): Prisma.Decimal {
  return toDecimal(a).minus(toDecimal(b));
}

export function decimalMul(a: DecimalInput, b: DecimalInput): Prisma.Decimal {
  return toDecimal(a).times(toDecimal(b));
}

export function decimalDiv(a: DecimalInput, b: DecimalInput): Prisma.Decimal {
  const divisor = toDecimal(b);
  if (divisor.isZero()) {
    throw new Error('División por cero en operación Decimal');
  }
  return toDecimal(a).dividedBy(divisor);
}

/**
 * Comparaciones lógicas Decimal
 */
export function decimalCompare(a: DecimalInput, b: DecimalInput): number {
  const decA = toDecimal(a);
  const decB = toDecimal(b);
  if (decA.greaterThan(decB)) return 1;
  if (decA.lessThan(decB)) return -1;
  return 0;
}

export function decimalGt(a: DecimalInput, b: DecimalInput): boolean {
  return toDecimal(a).greaterThan(toDecimal(b));
}

export function decimalGte(a: DecimalInput, b: DecimalInput): boolean {
  return toDecimal(a).greaterThanOrEqualTo(toDecimal(b));
}

export function decimalLt(a: DecimalInput, b: DecimalInput): boolean {
  return toDecimal(a).lessThan(toDecimal(b));
}

export function decimalLte(a: DecimalInput, b: DecimalInput): boolean {
  return toDecimal(a).lessThanOrEqualTo(toDecimal(b));
}

export function decimalEq(a: DecimalInput, b: DecimalInput): boolean {
  return toDecimal(a).equals(toDecimal(b));
}

/**
 * Predicados de estado
 */
export function decimalIsZero(a: DecimalInput): boolean {
  return toDecimal(a).isZero();
}

export function decimalIsNegative(a: DecimalInput): boolean {
  return toDecimal(a).isNegative();
}

export function decimalIsPositive(a: DecimalInput): boolean {
  const d = toDecimal(a);
  return d.isPositive() && !d.isZero();
}

/**
 * Redondeo contable / bancario (HALF_UP por defecto)
 */
export function decimalRound(
  value: DecimalInput,
  decimals: number = MONEY_SCALE,
  roundingMode: Prisma.Decimal.Rounding = Prisma.Decimal.ROUND_HALF_UP
): Prisma.Decimal {
  return toDecimal(value).toDecimalPlaces(decimals, roundingMode);
}

/**
 * Formateo a string con escala fija
 */
export function decimalToFixed(value: DecimalInput, decimals: number = MONEY_SCALE): string {
  return decimalRound(value, decimals).toFixed(decimals);
}

/**
 * Helpers por dominio
 */
export function roundQty(qty: DecimalInput): Prisma.Decimal {
  return decimalRound(qty, QTY_SCALE);
}

export function roundCost(cost: DecimalInput): Prisma.Decimal {
  return decimalRound(cost, COST_SCALE);
}

export function roundMoney(amount: DecimalInput): Prisma.Decimal {
  return decimalRound(amount, MONEY_SCALE);
}

/**
 * Serialización segura para transporte JSON en APIs
 * Retorna un string exacto con la cantidad de decimales requerida o preserve original.
 */
export function serializeDecimal(value: DecimalInput, decimals?: number): string | null {
  if (value === null || value === undefined) return null;
  const d = toDecimal(value);
  if (decimals !== undefined) {
    return d.toDecimalPlaces(decimals, Prisma.Decimal.ROUND_HALF_UP).toFixed(decimals);
  }
  return d.toString();
}

/**
 * Convierte a número primitivo con advertencia de pérdida de precisión.
 * USAR ÚNICAMENTE EN CAPA DE PRESENTACIÓN / UI VISUAL, NUNCA PARA CÁLCULOS.
 */
export function toVisualNumber(value: DecimalInput): number {
  if (value === null || value === undefined) return 0;
  return toDecimal(value).toNumber();
}

/**
 * Formateo de cantidades para visualización (ej: "1" o "0.45 kg")
 */
export function formatDisplayQty(qty: DecimalInput, unit?: string): string {
  if (qty === null || qty === undefined) return unit ? `0 ${unit}` : '0';
  const d = roundQty(qty);
  const formatted = d.modulo(1).isZero() ? d.toFixed(0) : d.toFixed(3).replace(/\.?0+$/, '');
  return unit ? `${formatted} ${unit}` : formatted;
}

/**
 * Formateo de dinero para visualización (ej: "$12.50")
 */
export function formatDisplayMoney(amount: DecimalInput, currency = '$'): string {
  if (amount === null || amount === undefined) return `${currency}0.00`;
  const d = roundMoney(amount);
  return `${currency}${d.toFixed(2)}`;
}
