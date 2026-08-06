/**
 * @file BlueprintComposer.ts
 * @module core/blueprints
 * @description Compilador puro de manifiestos de blueprints para Citiox Enterprise Core.
 * @responsibility Validar manifiestos JSON, resolver dependencias cruzadas, detectar conflictos y generar un ExecutionPlan tipado de forma pasiva sin efectos secundarios ni acceso a Prisma/DB.
 * @dependencies CapabilityManifest, RuntimeLogger
 * @status Experimental (Core Foundation - v1.0)
 */

import { CapabilityManifest } from '../contracts/Capability';
import { RuntimeLogger } from '../observability/RuntimeLogger';

export interface BlueprintManifest {
  id: string;
  version: string;
  name: string;
  description?: string;
  capabilities: CapabilityManifest[];
  defaultConfiguration?: Record<string, unknown>;
}

export interface ExecutionPlan {
  blueprintId: string;
  version: string;
  valid: boolean;
  orderedCapabilityIds: string[];
  configuration: Record<string, unknown>;
  errors: string[];
  warnings: string[];
}

export class BlueprintComposer {
  private logger = RuntimeLogger.getInstance();

  public compose(manifest: BlueprintManifest): ExecutionPlan {
    const errors: string[] = [];
    const warnings: string[] = [];
    const enabledCaps = manifest.capabilities.filter(c => c.enabled);
    const enabledMap = new Map<string, CapabilityManifest>();

    enabledCaps.forEach(c => enabledMap.set(c.id, c));

    // Validar dependencias para cada capacidad activada
    enabledCaps.forEach(cap => {
      cap.dependencies.forEach(depId => {
        if (!enabledMap.has(depId)) {
          errors.push(`Dependencia faltante: La capacidad '${cap.id}' requiere '${depId}' pero no está activada en el manifiesto.`);
        }
      });
    });

    const orderedCapabilityIds = enabledCaps.map(c => c.id);

    const plan: ExecutionPlan = {
      blueprintId: manifest.id,
      version: manifest.version,
      valid: errors.length === 0,
      orderedCapabilityIds,
      configuration: manifest.defaultConfiguration || {},
      errors,
      warnings
    };

    if (!plan.valid) {
      this.logger.warn(`[BlueprintComposer] ExecutionPlan generado con ${errors.length} errores para blueprint ${manifest.id}`, { errors });
    } else {
      this.logger.info(`[BlueprintComposer] ExecutionPlan generado exitosamente para blueprint ${manifest.id} (${orderedCapabilityIds.length} capacidades)`);
    }

    return plan;
  }
}
