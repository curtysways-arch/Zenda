// src/core/experiences/ExperienceRegistry.ts
// Registro central declarativo de Experience Packs para Citiox Runtime
// Resuelve dinámicamente el componente de UI según Blueprint + Capabilities + Channels

import React from 'react';

export interface ExperiencePack {
  id: string;
  name: string;
  blueprint: string;
  requiredCapabilities: string[];
  requiredChannel?: string;
  componentPath: string;
}

const EXPERIENCE_PACKS: Record<string, ExperiencePack> = {
  'restaurant-menu': {
    id: 'restaurant-menu',
    name: 'Menú Gastronómico Interactivo',
    blueprint: 'RESTAURANT',
    requiredCapabilities: ['catalog', 'orders'],
    componentPath: '@/modules/restaurant/components/RestaurantLanding'
  },
  'restaurant-kitchen': {
    id: 'restaurant-kitchen',
    name: 'Kitchen Display System (KDS)',
    blueprint: 'RESTAURANT',
    requiredCapabilities: ['kitchen'],
    requiredChannel: 'KDS',
    componentPath: '@/app/[slug]/cocina/page'
  },
  'restaurant-table-order': {
    id: 'restaurant-table-order',
    name: 'Pedido QR en Mesa',
    blueprint: 'RESTAURANT',
    requiredCapabilities: ['tables', 'orders'],
    requiredChannel: 'QR_ORDER',
    componentPath: '@/app/[slug]/mesa/[tableNumber]/page'
  },
  'restaurant-waiter': {
    id: 'restaurant-waiter',
    name: 'Consola Mesero Móvil',
    blueprint: 'RESTAURANT',
    requiredCapabilities: ['tables', 'orders'],
    requiredChannel: 'WAITER',
    componentPath: '@/app/[slug]/mesero/page'
  }
};

export function resolveExperiencePack(blueprint: string, activeCapabilities: string[], activeChannels?: Record<string, boolean>): ExperiencePack | null {
  // Find matching pack by blueprint and capabilities
  const packs = Object.values(EXPERIENCE_PACKS).filter(pack => {
    if (pack.blueprint !== blueprint) return false;
    const hasCaps = pack.requiredCapabilities.every(cap => activeCapabilities.includes(cap));
    if (!hasCaps) return false;
    if (pack.requiredChannel && activeChannels) {
      if (activeChannels[pack.requiredChannel] === false) return false;
    }
    return true;
  });

  return packs[0] || null;
}

export function getRegisteredExperiencePacks(): ExperiencePack[] {
  return Object.values(EXPERIENCE_PACKS);
}
