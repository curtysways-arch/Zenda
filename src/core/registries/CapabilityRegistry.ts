/**
 * @file CapabilityRegistry.ts
 * @module core/registries
 * @description Registro central pasivo de capacidades agnóstico a la interfaz de usuario.
 * @responsibility Registrar objetos de interfaz Capability, resolver dependencias cruzadas, validar versiones y ordenar la secuencia de ejecución por startupPriority.
 * @dependencies Capability contract, RuntimeLogger
 * @status Stable (Core Foundation - v1.0)
 */

import { Capability, CapabilityStatus } from '../contracts/Capability';
import { RuntimeLogger } from '../observability/RuntimeLogger';

export class CapabilityRegistry {
  private capabilities = new Map<string, Capability>();
  private logger = RuntimeLogger.getInstance();

  public register(capability: Capability): void {
    if (!capability.metadata || !capability.metadata.id) {
      throw new Error('[CapabilityRegistry] Intento de registrar capacidad sin metadatos id');
    }
    this.capabilities.set(capability.metadata.id, capability);
    this.logger.info(`[CapabilityRegistry] Capacidad registrada: ${capability.metadata.id} (v${capability.metadata.version})`);
  }

  public get(id: string): Capability | undefined {
    return this.capabilities.get(id);
  }

  public getAll(): Capability[] {
    return Array.from(this.capabilities.values());
  }

  public resolveSortedCapabilities(): Capability[] {
    const list = this.getAll();
    
    // Validar dependencias requeridas
    for (const cap of list) {
      const deps = cap.metadata.dependencies || [];
      for (const depId of deps) {
        if (!this.capabilities.has(depId)) {
          const err = `[CapabilityRegistry] Capacidad ${cap.metadata.id} requiere dependencia faltante: ${depId}`;
          this.logger.error(err);
          throw new Error(err);
        }
      }
    }

    // Ordenar dinámicamente por startupPriority (menor prioridad ejecuta primero)
    return list.sort((a, b) => {
      const pA = a.metadata.startupPriority ?? 100;
      const pB = b.metadata.startupPriority ?? 100;
      return pA - pB;
    });
  }

  public async getCombinedHealth(): Promise<Record<string, CapabilityStatus>> {
    const healthMap: Record<string, CapabilityStatus> = {};
    for (const [id, cap] of this.capabilities.entries()) {
      try {
        const h = await cap.getHealth();
        healthMap[id] = h.status;
      } catch {
        healthMap[id] = 'FAILED';
      }
    }
    return healthMap;
  }
}
