// src/core/modules/types.ts
import { BusinessCapabilities } from '../capabilities/types';

export type BusinessModuleType = 
  | 'APPOINTMENTS'
  | 'SPA'
  | 'BARBER'
  | 'DENTAL'
  | 'VETERINARY'
  | 'SPORTS_COURTS'
  | 'FOOD_DELIVERY'
  | 'SHOE_CARE'
  | 'LAUNDRY'
  | 'TECH_REPAIR'
  | 'CUSTOM';

export interface ModuleNavigationItem {
  name: string;
  href: string;
  icon: string;
  section: string;
  roles?: string[];
  requiredCapability?: string;
}

export interface BusinessModuleManifest {
  id: BusinessModuleType;
  name: string;
  description: string;
  icon: string;
  defaultCapabilities: BusinessCapabilities;
  navigation: {
    adminSidebar: ModuleNavigationItem[];
    publicNav?: Array<{ label: string; href: string; icon: string }>;
  };
  compatibleAddons: string[];
}
