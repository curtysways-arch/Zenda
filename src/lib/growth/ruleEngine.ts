export type Operator = 
  | 'EQ' | 'NEQ' | 'GT' | 'GTE' | 'LT' | 'LTE' 
  | 'IN' | 'NOT_IN' | 'CONTAINS' | 'STARTS_WITH' | 'ENDS_WITH' | 'BETWEEN' | 'EXISTS';

export interface Rule {
  field: string;
  operator: Operator;
  value: any;
}

export interface RuleGroup {
  logic: 'AND' | 'OR' | 'NOT';
  rules: (Rule | RuleGroup)[];
}

/**
 * Evalúa una única regla lógica contra el payload del evento.
 */
export function evaluateSingleRule(payload: any, rule: Rule): boolean {
    const actualValue = payload[rule.field];
    const targetValue = rule.value;

    if (rule.operator === 'EXISTS') {
        return actualValue !== undefined && actualValue !== null;
    }

    if (actualValue === undefined || actualValue === null) return false;

    switch (rule.operator) {
        case 'EQ': return actualValue === targetValue;
        case 'NEQ': return actualValue !== targetValue;
        case 'GT': return Number(actualValue) > Number(targetValue);
        case 'GTE': return Number(actualValue) >= Number(targetValue);
        case 'LT': return Number(actualValue) < Number(targetValue);
        case 'LTE': return Number(actualValue) <= Number(targetValue);
        case 'IN': return Array.isArray(targetValue) && targetValue.includes(actualValue);
        case 'NOT_IN': return Array.isArray(targetValue) && !targetValue.includes(actualValue);
        case 'CONTAINS': return typeof actualValue === 'string' && actualValue.includes(targetValue);
        case 'STARTS_WITH': return typeof actualValue === 'string' && actualValue.startsWith(targetValue);
        case 'ENDS_WITH': return typeof actualValue === 'string' && actualValue.endsWith(targetValue);
        case 'BETWEEN': return Array.isArray(targetValue) && Number(actualValue) >= Number(targetValue[0]) && Number(actualValue) <= Number(targetValue[1]);
        default: return false;
    }
}

/**
 * Evalúa de forma recursiva un grupo de reglas compuestas con lógica AND/OR/NOT.
 */
export function evaluateRules(payload: any, group: RuleGroup): boolean {
    if (!group || !Array.isArray(group.rules) || group.rules.length === 0) return true;

    const results = group.rules.map(r => {
        if ('logic' in r) {
            return evaluateRules(payload, r as RuleGroup);
        }
        return evaluateSingleRule(payload, r as Rule);
    });

    if (group.logic === 'AND') return results.every(res => res === true);
    if (group.logic === 'OR') return results.some(res => res === true);
    if (group.logic === 'NOT') return !results[0];
    return false;
}
