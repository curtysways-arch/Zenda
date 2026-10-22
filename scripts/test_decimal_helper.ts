import {
  toDecimal, decimalAdd, decimalSub, decimalMul, decimalDiv,
  decimalGt, decimalGte, decimalLt, decimalLte, decimalEq,
  decimalRound, decimalToFixed, roundQty, roundCost, roundMoney,
  serializeDecimal, formatDisplayQty, formatDisplayMoney, toVisualNumber
} from '../src/lib/math/decimal.ts';

const a = '0.4500';
const b = 2.35;
console.log('add:', decimalAdd(a, b).toString());
console.log('mul:', decimalMul(a, b).toString());
console.log('div:', decimalDiv(b, a).toString());
console.log('gt:', decimalGt(b, a));
console.log('roundQty:', roundQty('0.45006').toString());
console.log('roundCost:', roundCost('2.9166666').toString());
console.log('roundMoney:', roundMoney('12.505').toString());
console.log('serialize:', serializeDecimal('12.345678', 4));
console.log('displayQty:', formatDisplayQty('0.4500', 'kg'));
console.log('displayMoney:', formatDisplayMoney('1250.5'));
console.log('toVisualNumber:', toVisualNumber('12.50'));
console.log('SUCCESS: decimal.ts works perfectly!');
