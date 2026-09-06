/**
 * @file dataPolicyTypes.ts
 * @module core/security
 * @description Catálogo canónico y tipado universal de Recursos y Acciones de Seguridad de Datos para Citiox.
 */

export const DATA_RESOURCES = {
  ORDERS: 'ORDERS',
  APPOINTMENTS: 'APPOINTMENTS',
  RESERVATIONS: 'RESERVATIONS',
  SERVICE_ORDERS: 'SERVICE_ORDERS',
  STORE_ORDERS: 'STORE_ORDERS',
  CUSTOMERS: 'CUSTOMERS',
} as const;

export type DataResource = typeof DATA_RESOURCES[keyof typeof DATA_RESOURCES];

export const DATA_ACTIONS = {
  RECEIVE: 'RECEIVE',
  VIEW: 'VIEW',
  VIEW_DETAILS: 'VIEW_DETAILS',
  VIEW_CUSTOMER: 'VIEW_CUSTOMER',
  VIEW_CONTACT: 'VIEW_CONTACT',
  VIEW_ITEMS: 'VIEW_ITEMS',
  VIEW_PRICES: 'VIEW_PRICES',
  VIEW_FINANCIALS: 'VIEW_FINANCIALS',
  MANAGE: 'MANAGE',
  EXPORT: 'EXPORT',
} as const;

export type DataAction = typeof DATA_ACTIONS[keyof typeof DATA_ACTIONS];

export interface ResourcePolicy {
  receive: boolean;
  view: boolean;
  details: boolean;
  customer: boolean;
  contact: boolean;
  items: boolean;
  prices: boolean;
  financials: boolean;
  manage: boolean;
  export: boolean;
  isLocked: boolean;
  lockReason?: 'PLAN_FREE' | 'PLAN_EXPIRED' | 'TRIAL_EXPIRED' | 'POLICY_RESTRICTED';
}

export interface EffectivePlanContext {
  businessId: string;
  isFreeTier: boolean;
  isExpired: boolean;
  isPastDue: boolean;
  lockReason?: 'PLAN_FREE' | 'PLAN_EXPIRED' | 'TRIAL_EXPIRED' | 'POLICY_RESTRICTED';
  originalPlanId: string;
  originalPlanName: string;
  effectivePlanId: string;
  effectivePlanName: string;
  planFamilyId: string | null;
  planFamilyCode: string | null;
  isFounder: boolean;
  founderPosition: number | null;
  lockedPrice: number | null;
}
