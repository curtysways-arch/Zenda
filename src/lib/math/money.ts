/**
 * Capa de compatibilidad monetaria y matemática consolidada con Decimal.
 * Re-exporta y mapea sobre src/lib/math/decimal.ts garantizando consistencia absoluta.
 */
export * from './decimal';

export {
  toDecimal,
  roundQty,
  roundCost,
  roundMoney,
  decimalAdd as addDecimal,
  decimalSub as subDecimal,
  decimalMul as mulDecimal,
  decimalDiv as divDecimal,
  decimalIsZero as isZeroDecimal,
  decimalIsNegative as isNegativeDecimal,
  decimalIsPositive as isPositiveDecimal,
  formatDisplayQty,
  formatDisplayMoney,
  QTY_SCALE as QTY_DECIMALS,
  COST_SCALE as COST_DECIMALS,
  MONEY_SCALE as MONEY_DECIMALS
} from './decimal';

import { toDecimal, DecimalInput } from './decimal';

export function isIntegerDecimal(val: DecimalInput): boolean {
  const d = toDecimal(val);
  return d.modulo(1).isZero();
}
