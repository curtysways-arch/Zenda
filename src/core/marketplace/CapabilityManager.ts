/**
 * @file CapabilityManager.ts
 * @module core/marketplace
 * @description Administrador seguro de instalaciones dinámicas y ciclo de vida de capacidades para Citiox Enterprise.
 * @responsibility Administrar el registro lógico, configuración, activación (enable) y desactivación (disable) de capacidades por negocio de forma segura sin cargar código dinámico no confiable.
 * @dependencies MarketplaceRegistry, CapabilityRegistry, RuntimeLogger
 * @status Stable (Core Marketplace - v1.0)
 */

import { MarketplaceRegistry } from './MarketplaceRegistry';
import { CapabilityRegistry } from '../registries/CapabilityRegistry';
import { BusinessRuntimeContext } from '../kernel/BusinessRuntimeContext';
import { RuntimeLogger } from '../observability/RuntimeLogger';

export interface InstalledCapabilityState {
  businessId: string;
  capabilityId: string;
  enabled: boolean;
  configuration: Record<string, unknown>;
  installedAt: string;
  updatedAt: string;
}

export class CapabilityManager {
  private logger = RuntimeLogger.getInstance();
  private marketplace = MarketplaceRegistry.getInstance();
  private installedStates = new Map<string, InstalledCapabilityState>();

  private getCompositeKey(businessId: string, capabilityId: string): string {
    return `${businessId}::${capabilityId}`;
  }

  /**
   * Instala y configura una capacidad en un negocio de forma lógica y segura.
   */
  public async installCapability(
    context: BusinessRuntimeContext,
    capabilityId: string,
    initialConfig?: Record<string, unknown>
  ): Promise<InstalledCapabilityState> {
    const item = this.marketplace.getCapabilityDetails(capabilityId);
    if (!item) {
      throw new Error(`[CapabilityManager] Capacidad no encontrada en Marketplace: ${capabilityId}`);
    }

    const key = this.getCompositeKey(context.businessId, capabilityId);
    const now = new Date().toISOString();

    const state: InstalledCapabilityState = {
      businessId: context.businessId,
      capabilityId,
      enabled: true,
      configuration: initialConfig || {},
      installedAt: now,
      updatedAt: now
    };

    this.installedStates.set(key, state);
    if (!context.activeCapabilities.includes(capabilityId)) {
      context.activeCapabilities.push(capabilityId);
    }

    this.logger.info(`[CapabilityManager] Capacidad ${capabilityId} instalada lógicamente para el negocio ${context.slug}`);
    return state;
  }

  public async setCapabilityState(
    context: BusinessRuntimeContext,
    capabilityId: string,
    enabled: boolean
  ): Promise<void> {
    const key = this.getCompositeKey(context.businessId, capabilityId);
    const state = this.installedStates.get(key);
    if (state) {
      state.enabled = enabled;
      state.updatedAt = new Date().toISOString();
    }

    if (enabled && !context.activeCapabilities.includes(capabilityId)) {
      context.activeCapabilities.push(capabilityId);
    } else if (!enabled) {
      context.activeCapabilities = context.activeCapabilities.filter(id => id !== capabilityId);
    }

    this.logger.info(`[CapabilityManager] Capacidad ${capabilityId} ${enabled ? 'habilitada' : 'deshabilitada'} para negocio ${context.slug}`);
  }
}
