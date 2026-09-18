// src/core/capabilities/types.ts
// Definición de tipos oficiales para Business Capabilities (v1.0.0)

export const CAPABILITY_REGISTRY = {
  BOOKING: 'booking',
  ORDERS: 'orders',
  SERVICE: 'service',
  INVENTORY: 'inventory',
  CRM: 'crm',
  ACADEMY: 'academy',
  SUBSCRIPTIONS: 'subscriptions',
  MEMBERSHIPS: 'memberships',
  GIFTCARDS: 'giftcards',
  AI_ASSISTANT: 'ai_assistant',
  DELIVERY: 'delivery',
  TABLES: 'tables',
  WAITERS: 'waiters',
  KITCHEN: 'kitchen',
  PRODUCTS: 'products',
  CATEGORIES: 'categories',
  PICKUP: 'pickup',
  PAYMENTS: 'payments',
  QR_ORDERING: 'qr_ordering',
  CUSTOMERS: 'customers',
  DISPATCH: 'dispatch',
  STORE: 'store',
  VARIANTS: 'variants',
  DENTAL_CLINICAL_RECORD: 'dental_clinical_record',
  DENTAL_ODONTOGRAM: 'dental_odontogram',
  DENTAL_TREATMENT_PLAN: 'dental_treatment_plan',
  DENTAL_DIAGNOSIS: 'dental_diagnosis',
  DENTAL_DOCUMENTS: 'dental_documents',
  MEMBERSHIP_PLANS: 'membership_plans',
  ACCESS: 'access',
  ATTENDANCE: 'attendance',
  CLASSES: 'classes',
  TRAINERS: 'trainers',
  WORKOUTS: 'workouts',
  PROGRESS: 'progress',
} as const;

export type CapabilityKey = typeof CAPABILITY_REGISTRY[keyof typeof CAPABILITY_REGISTRY];

export interface BusinessCapabilities {
  booking?: boolean;
  orders?: boolean;
  service?: boolean;
  inventory?: boolean;
  crm?: boolean;
  academy?: boolean;
  subscriptions?: boolean;
  memberships?: boolean;
  membership_plans?: boolean;
  access?: boolean;
  attendance?: boolean;
  classes?: boolean;
  trainers?: boolean;
  workouts?: boolean;
  progress?: boolean;
  giftcards?: boolean;
  ai_assistant?: boolean;
  delivery?: boolean;
  tables?: boolean;
  waiters?: boolean;
  kitchen?: boolean;
  products?: boolean;
  categories?: boolean;
  pickup?: boolean;
  payments?: boolean;
  qr_ordering?: boolean;
  customers?: boolean;
  dispatch?: boolean;
  store?: boolean;
  variants?: boolean;
  dental_clinical_record?: boolean;
  dental_odontogram?: boolean;
  dental_treatment_plan?: boolean;
  dental_diagnosis?: boolean;
  dental_documents?: boolean;
}
