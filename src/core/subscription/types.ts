// src/core/subscription/types.ts
// Interfaces oficiales para Subscription Engine v3.0 y UsageEngine (v1.0.0)

export type FeatureAccess = 'none' | 'basic' | 'standard' | 'advanced' | 'enterprise';

export type ResourceLimitKey =
  | 'transactions'      // Citas, pedidos, reservas, rentas, facturas, órdenes de servicio, tickets, ventas
  | 'branches'          // Sucursales
  | 'users'             // Usuarios administrativos
  | 'employees'         // Empleados / Profesionales
  | 'customers'         // Clientes en base de datos
  | 'products'          // Productos en catálogo
  | 'services'          // Servicios en catálogo
  | 'resources'         // Recursos operables (Mesas, Canchas, Equipos, Habitaciones)
  | 'storage'           // Almacenamiento en MB/GB
  | 'whatsappMessages'  // Mensajes transaccionales por WhatsApp
  | 'aiCredits';        // Créditos / Consultas a la IA

export type PlanId = 'FREE' | 'STARTER' | 'GROWTH' | 'PRO' | 'ENTERPRISE';

export interface ResourceLimits {
  transactions: number;
  branches: number;
  users: number;
  employees: number;
  customers: number;
  products: number;
  services: number;
  resources: number;
  storageMB: number;
  whatsappMessages: number;
  aiCredits: number;
}

export interface FeatureAccessLevels {
  promotions: FeatureAccess;
  communications: FeatureAccess;
  reports: FeatureAccess;
  automations: FeatureAccess;
  ai: FeatureAccess;
  api: FeatureAccess;
  branding: 'citiox_watermark' | 'custom_logo' | 'white_label';
  customDomain: boolean;
  customTheme: boolean;
  rolesAndPermissions: FeatureAccess;
  auditLogs: boolean;
  sso: boolean;
}

export interface SubscriptionPlan {
  id: PlanId;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  badge?: string;
  isPopular?: boolean;
  limits: ResourceLimits;
  features: FeatureAccessLevels;
}

export interface SubscriptionAddon {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  limitBonus: Partial<ResourceLimits>;
  featureAccessBonus?: Partial<FeatureAccessLevels>;
}

export interface BusinessSubscriptionData {
  businessId: string;
  planId: PlanId;
  status: 'active' | 'trial' | 'past_due' | 'canceled' | 'expired';
  activeAddons: string[]; // Addon IDs
  customLimitOverrides?: Partial<ResourceLimits>;
  customFeatureOverrides?: Partial<FeatureAccessLevels>;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
}
