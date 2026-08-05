// src/core/templates/types.ts
// Interfaces para Business Templates declarativos 1-Click (v1.0.0)

import { BusinessCapabilities } from '../capabilities/types';
import { OperableResource } from '../resources/types';

export interface BusinessSettingsLabels {
  resourceNameSingular: string;
  resourceNamePlural: string;
  itemNameSingular: string;
}

export interface BusinessSettingsData {
  bookingSettings?: {
    slotGranularityMinutes: number;
    enableNightLightingFee?: boolean;
    allowMultipleConsecutiveSlots?: boolean;
  };
  orderSettings?: {
    enableKDSView?: boolean;
    allowTakeaway?: boolean;
    deliveryRadiusKm?: number;
  };
  serviceSettings?: {
    requiresItemPhotos: boolean;
    customStatuses: string[];
    allowHomePickup?: boolean;
  };
  labels: BusinessSettingsLabels;
}

export interface InitialServiceItem {
  nombre: string;
  precio: number;
  duracionMinutos?: number;
  categoria?: string;
  descripcion?: string;
}

export interface BusinessTemplateManifest {
  id: string;
  templateVersion: string; // ej: '1.0.0'
  name: string;
  description: string;
  badge?: string;
  icon: string;
  module: string;          // Módulo de industria asociado (ej: 'SPORTS_COURTS')
  profile: string;         // Variante estética / sub-rubro (ej: 'PadelClub')
  capabilities: BusinessCapabilities;
  settings: BusinessSettingsData;
  initialResources: Array<Partial<OperableResource>>;
  initialServices: InitialServiceItem[];
  suggestedColors?: {
    primaryColor: string;
    secondaryColor?: string;
  };
  includedAddons?: string[];
}
