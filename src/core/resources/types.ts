// src/core/resources/types.ts
// Abstracción universal para asignación de recursos en Citiox (v1.0.0)

export type ResourceType = 'HUMAN' | 'INFRASTRUCTURE' | 'EQUIPMENT' | 'VEHICLE';

export interface OperableResource {
  id: string;
  negocioId: string;
  name: string;             // Ej: "María Silva" | "Cancha 1 Pádel" | "Cabina VIP" | "Elevador 1"
  resourceType: ResourceType;
  category?: string | null;  // Ej: "Especialista", "Pádel", "Fisioterapia", "Mecánica"
  avatar?: string | null;
  capacity?: number;         // Capacidad simultánea (default: 1)
  active: boolean;
  metadata?: Record<string, any> | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ResourceScheduleSlot {
  resourceId: string;
  resourceName: string;
  date: string;              // YYYY-MM-DD
  startTime: string;         // HH:mm
  endTime: string;           // HH:mm
  isAvailable: boolean;
  occupiedReason?: string;
  priceModifier?: number;    // Suplementos (ej. tarifa de luz nocturna)
}
