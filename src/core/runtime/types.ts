// src/core/runtime/types.ts
// Interfaces oficiales de Citiox Runtime Platform (v1.0.0 Definitiva)

export interface BusinessBlueprintMeta {
  id: string;
  name: string;
  code: string;
  slug: string;
  category: string;
  version: string;
  active: boolean;
  isDefault: boolean;
}

export interface BusinessDefinition {
  modules: string[];
  capabilities: Record<string, boolean>;
  workflow: any;
  resources: any[];
  plans: any[];
  settings: any;
  roles: any[];
  permissions: any[];
}

export interface BusinessExperience {
  landing: any;
  admin: any;
  dashboard: any;
  navigation: any;
  forms: any;
  cards: any;
  tables: any;
  widgets: any;
  theme: any;
  mobile: any;
}

export interface BusinessOperations {
  policies: any[];      // Reglas de negocio (ej: cobro anticipado, políticas de cancelación)
  integrations: any[];  // Conectores externos (Stripe, MercadoPago, WhatsApp, Google Maps, Twilio)
}

export interface BusinessIntelligence {
  skills: any[];        // AI Skills (Recomendaciones, Clasificación de tickets, Autorespuesta WhatsApp)
  assistants: any[];    // Asistentes de IA (Recepcionista, Ventas, Soporte)
  models: any[];
  prompts: any[];
}

export interface BusinessRuntime {
  blueprint: BusinessBlueprintMeta;
  definition: BusinessDefinition;
  experience: BusinessExperience;
  operations: BusinessOperations;
  intelligence: BusinessIntelligence;
}
