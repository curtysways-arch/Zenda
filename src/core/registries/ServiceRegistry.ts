/**
 * @file ServiceRegistry.ts
 * @module core/registries
 * @description Registro e inyector de servicios singleton, scoped y transient con Lazy Loading.
 * @responsibility Almacenar fábricas de servicios e instanciar servicios de forma diferida (lazy) sin depender de clases concretas.
 * @dependencies RuntimeLogger
 * @status Stable (Core Foundation - v1.0)
 */

import { RuntimeLogger } from '../observability/RuntimeLogger';

export type ServiceScope = 'SINGLETON' | 'SCOPED' | 'TRANSIENT';

export interface ServiceDescriptor<T = any> {
  id: string;
  scope: ServiceScope;
  factory: (context?: any) => T;
  instance?: T;
}

export class ServiceRegistry {
  private descriptors = new Map<string, ServiceDescriptor>();
  private logger = RuntimeLogger.getInstance();

  public register<T>(id: string, factory: (context?: any) => T, scope: ServiceScope = 'SINGLETON'): void {
    this.descriptors.set(id, {
      id,
      scope,
      factory
    });
    this.logger.info(`[ServiceRegistry] Servicio registrado: ${id} (Scope: ${scope})`);
  }

  public resolve<T>(id: string, context?: any): T {
    const descriptor = this.descriptors.get(id);
    if (!descriptor) {
      const err = `Servicio no encontrado en ServiceRegistry: ${id}`;
      this.logger.error(err);
      throw new Error(err);
    }

    if (descriptor.scope === 'SINGLETON') {
      if (!descriptor.instance) {
        descriptor.instance = descriptor.factory(context);
        this.logger.info(`[ServiceRegistry] Instancia Singleton creada (Lazy): ${id}`);
      }
      return descriptor.instance as T;
    }

    if (descriptor.scope === 'TRANSIENT') {
      return descriptor.factory(context) as T;
    }

    // Scoped instance
    return descriptor.factory(context) as T;
  }

  public has(id: string): boolean {
    return this.descriptors.has(id);
  }

  public clear(): void {
    this.descriptors.clear();
    this.logger.info('[ServiceRegistry] Limpieza de servicios ejecutada');
  }
}
