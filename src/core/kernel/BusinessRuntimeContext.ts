/**
 * @file BusinessRuntimeContext.ts
 * @module core/kernel
 * @description Objeto puro de contexto de ejecución para negocios en Citiox Enterprise Engine vNext.
 * @responsibility Almacenar estado de ejecución, manifiestos, configuraciones y servicios inyectados sin incluir lógica ejecutable.
 * @dependencies Ninguna (Contrato/Contexto puro)
 * @status Stable (Core Foundation - v1.0)
 */

export interface BusinessRuntimeContext {
  businessId: string;
  tenantId: string;
  slug: string;
  blueprint: string;
  activeCapabilities: string[];
  configuration: Record<string, unknown>;
  permissions: string[];
  registries?: Record<string, unknown>;
  services?: Record<string, unknown>;
  eventBus?: any;
}
