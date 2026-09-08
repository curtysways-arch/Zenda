/**
 * @file resolveModuleDependencies.ts
 * @module core/modules
 * @description Fuente única de verdad para el árbol de dependencias recursivas entre módulos de Citiox.
 * Asegura que ningún módulo opere sin sus prerrequisitos arquitectónicos y operacionales.
 */

export const MODULE_DEPENDENCIES: Record<string, string[]> = {
  // Restaurante / Gastronomía
  KDS: ['KITCHEN', 'ORDERS'],
  KITCHEN: ['ORDERS'],
  TABLES: ['ORDERS'],
  QR_TABLE: ['TABLES', 'ORDERS'],
  POS: ['ORDERS', 'PRODUCTS'],
  DELIVERY: ['ORDERS'],
  PICKUP: ['ORDERS'],
  CART: ['PRODUCTS'],
  CATEGORIES: ['PRODUCTS'],

  // Servicios / Citas
  REMINDERS: ['APPOINTMENTS'],
  STAFF: ['SERVICES'],
  APPOINTMENTS: ['SERVICES'],

  // Canchas / Deportes
  SCHEDULES: ['COURTS'],
  STUDENTS: ['COURSES'],
  INSTRUCTORS: ['COURSES'],
  COURSES: ['CUSTOMERS'],

  // Lavandería / Calzado
  INSPECTION_PHOTOS: ['LAUNDRY_ORDERS'],
  WORKFLOW: ['LAUNDRY_ORDERS'],

  // Marketing / Clientes / Inventario
  COUPONS: ['PROMOTIONS'],
  LOYALTY: ['CUSTOMERS'],
  COMMUNICATION_CENTER: ['CUSTOMERS'],
  INVENTORY: ['PRODUCTS'],
};

export interface DependencyValidationResult {
  valid: boolean;
  code?: 'DEPENDENCY_VIOLATION';
  module?: string;
  requires?: string[];
  allViolations?: Array<{ module: string; requires: string[] }>;
}

/**
 * Resuelve recursivamente todas las dependencias transitivas para una lista de módulos habilitados.
 * Si se incluye KDS, el resultado contendrá KDS, KITCHEN y ORDERS.
 */
export function resolveModuleDependencies(enabledModules: string[]): string[] {
  const resolved = new Set<string>();

  function addWithDeps(mod: string, stack: string[] = []) {
    const upper = mod.toUpperCase();
    if (resolved.has(upper)) return;
    if (stack.includes(upper)) {
      return;
    }

    resolved.add(upper);
    const deps = MODULE_DEPENDENCIES[upper] || [];
    for (const dep of deps) {
      addWithDeps(dep, [...stack, upper]);
    }
  }

  for (const m of enabledModules) {
    if (m) addWithDeps(m);
  }

  return Array.from(resolved);
}

/**
 * Valida si un conjunto de módulos activos cumple estrictamente con todas sus dependencias requeridas.
 * Si algún módulo carece de un prerrequisito en la lista, retorna valid: false con los detalles.
 */
export function validatePlanEntitlements(activeModules: string[]): DependencyValidationResult {
  const activeSet = new Set(activeModules.map(m => m.toUpperCase()));
  const violations: Array<{ module: string; requires: string[] }> = [];

  for (const mod of activeSet) {
    const requiredDeps = MODULE_DEPENDENCIES[mod] || [];
    const missing = requiredDeps.filter(dep => !activeSet.has(dep));
    if (missing.length > 0) {
      violations.push({ module: mod, requires: missing });
    }
  }

  if (violations.length > 0) {
    return {
      valid: false,
      code: 'DEPENDENCY_VIOLATION',
      module: violations[0].module,
      requires: violations[0].requires,
      allViolations: violations
    };
  }

  return { valid: true };
}

/**
 * Obtiene las dependencias directas o recursivas de un módulo específico.
 */
export function getModulePrerequisites(moduleCode: string): string[] {
  const code = moduleCode.toUpperCase();
  const direct = MODULE_DEPENDENCIES[code] || [];
  const allPrereqs = new Set<string>();

  function collect(deps: string[]) {
    for (const d of deps) {
      allPrereqs.add(d);
      if (MODULE_DEPENDENCIES[d]) {
        collect(MODULE_DEPENDENCIES[d]);
      }
    }
  }

  collect(direct);
  return Array.from(allPrereqs);
}
