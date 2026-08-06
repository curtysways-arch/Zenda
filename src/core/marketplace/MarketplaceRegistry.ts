/**
 * @file MarketplaceRegistry.ts
 * @module core/marketplace
 * @description Catálogo interno de descubrimiento de capacidades para Citiox Enterprise vNext.
 * @responsibility Registrar el catálogo de capacidades oficiales de Citiox, permitir búsquedas por categoría y proporcionar metadatos de instalación para el Marketplace.
 * @dependencies CapabilityMetadata, RuntimeLogger
 * @status Stable (Core Marketplace - v1.0)
 */

import { CapabilityMetadata } from '../contracts/Capability';
import { RuntimeLogger } from '../observability/RuntimeLogger';

export interface MarketplaceItem {
  metadata: CapabilityMetadata;
  publisher: string;
  official: boolean;
  iconName: string;
  pricingTier: 'FREE' | 'PRO' | 'ENTERPRISE';
  tags: string[];
}

export class MarketplaceRegistry {
  private static instance: MarketplaceRegistry;
  private items = new Map<string, MarketplaceItem>();
  private logger = RuntimeLogger.getInstance();

  private constructor() {
    this.registerCoreMarketplaceItems();
  }

  public static getInstance(): MarketplaceRegistry {
    if (!MarketplaceRegistry.instance) {
      MarketplaceRegistry.instance = new MarketplaceRegistry();
    }
    return MarketplaceRegistry.instance;
  }

  private registerCoreMarketplaceItems(): void {
    this.registerItem({
      metadata: {
        id: 'restaurant',
        version: '1.0.0',
        contractVersion: '1.0',
        name: 'Capacidad Restaurante & KDS',
        description: 'Gestión de comandas, cocina KDS, mesas y reglas de empaque',
        category: 'RESTAURANT',
        startupPriority: 10,
        dependencies: []
      },
      publisher: 'Citiox Official',
      official: true,
      iconName: 'Utensils',
      pricingTier: 'FREE',
      tags: ['restaurante', 'cocina', 'kds', 'mesas', 'fast-food']
    });

    this.registerItem({
      metadata: {
        id: 'spa',
        version: '1.0.0',
        contractVersion: '1.0',
        name: 'Capacidad SPA & Citas',
        description: 'Gestión de agenda, turnos, profesionales y tratamientos',
        category: 'SERVICES',
        startupPriority: 20,
        dependencies: []
      },
      publisher: 'Citiox Official',
      official: true,
      iconName: 'Sparkles',
      pricingTier: 'FREE',
      tags: ['spa', 'citas', 'agenda', 'estética']
    });

    this.registerItem({
      metadata: {
        id: 'laundry',
        version: '1.0.0',
        contractVersion: '1.0',
        name: 'Capacidad Lavandería & Tintorería',
        description: 'Recepción por peso, prendas, lavado, secado y despacho',
        category: 'OPERATIONS',
        startupPriority: 30,
        dependencies: []
      },
      publisher: 'Citiox Official',
      official: true,
      iconName: 'Scissors',
      pricingTier: 'FREE',
      tags: ['lavandería', 'tintorería', 'kilos']
    });

    this.registerItem({
      metadata: {
        id: 'courts',
        version: '1.0.0',
        contractVersion: '1.0',
        name: 'Capacidad Canchas Deportivo',
        description: 'Gestión de canchas, iluminación, turnos fijos y reservas',
        category: 'SERVICES',
        startupPriority: 40,
        dependencies: []
      },
      publisher: 'Citiox Official',
      official: true,
      iconName: 'Dribbble',
      pricingTier: 'FREE',
      tags: ['canchas', 'deporte', 'turnos']
    });
  }

  public registerItem(item: MarketplaceItem): void {
    this.items.set(item.metadata.id, item);
    this.logger.info(`[MarketplaceRegistry] Capacidad registrada en el catálogo: ${item.metadata.name} [ID: ${item.metadata.id}]`);
  }

  public getAvailableCapabilities(): MarketplaceItem[] {
    return Array.from(this.items.values());
  }

  public searchCapabilities(query: string): MarketplaceItem[] {
    const q = query.toLowerCase();
    return this.getAvailableCapabilities().filter(item =>
      item.metadata.name.toLowerCase().includes(q) ||
      item.metadata.description.toLowerCase().includes(q) ||
      item.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  public getCapabilityDetails(id: string): MarketplaceItem | undefined {
    return this.items.get(id);
  }
}
