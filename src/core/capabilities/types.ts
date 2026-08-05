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
  DELIVERY: 'delivery',           // ✅ Módulo de Logística Transversal
} as const;

export type CapabilityKey = typeof CAPABILITY_REGISTRY[keyof typeof CAPABILITY_REGISTRY];

export interface BusinessCapabilities {
  booking?: boolean;     // Activa el BookingEngine (Agendamiento/Canchas/Turnos)
  orders?: boolean;      // Activa el OrderEngine (Catálogo/Menú/Comanda)
  service?: boolean;     // Activa el ServiceEngine (Recibir -> Procesar -> Entregar)
  inventory?: boolean;   // Control de Stock e Insumos
  crm?: boolean;         // Historial extendido de clientes
  academy?: boolean;     // Cursos y capacitaciones
  subscriptions?: boolean;
  memberships?: boolean;
  giftcards?: boolean;
  ai_assistant?: boolean;
  delivery?: boolean;    // ✅ Activa el Módulo de Logística Transversal (retiros y entregas)
}
