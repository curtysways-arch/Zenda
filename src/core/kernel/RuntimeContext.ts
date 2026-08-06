/**
 * @file RuntimeContext.ts
 * @module core/kernel
 * @description Contexto global contenedor de dependencias y servicios del Runtime.
 * @responsibility Agrupar ServiceRegistry, CapabilityRegistry, EventBus, Logger y FeatureFlags para inyección limpia.
 * @dependencies RuntimeLogger, FeatureFlagProvider
 * @status Stable (Core Foundation - v1.0)
 */

import { RuntimeLogger } from '../observability/RuntimeLogger';
import { FeatureFlagProvider } from './FeatureFlagProvider';

export interface RuntimeContext {
  tenantId: string;
  businessId: string;
  services: any;
  registries: any;
  logger: RuntimeLogger;
  eventBus: any;
  featureFlags: FeatureFlagProvider;
  configuration: Record<string, unknown>;
  health: 'STARTING' | 'RUNNING' | 'DEGRADED' | 'STOPPING' | 'STOPPED' | 'FAILED';
}
