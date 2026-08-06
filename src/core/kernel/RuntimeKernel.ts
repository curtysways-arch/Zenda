/**
 * @file RuntimeKernel.ts
 * @module core/kernel
 * @description Orquestador agnóstico del ciclo de vida de Citiox Enterprise Core.
 * @responsibility Administrar los estados del Runtime (STARTING, RUNNING, DEGRADED, STOPPING, STOPPED, FAILED), inicializar contexto, instanciar DeliveryEngine, PricingEngine y NotificationRuntime y ejecutar capacidades respetando startupPriority.
 * @dependencies Capability contract, BusinessRuntimeContext, RuntimeLogger, FeatureFlagProvider, CapabilityRegistry, ServiceRegistry, VersionedEventBus, DeliveryEngine, NotificationRuntime
 * @status Stable (Core Foundation - v1.0)
 */

import { Capability, CapabilityStatus } from '../contracts/Capability';
import { BusinessRuntimeContext } from './BusinessRuntimeContext';
import { FeatureFlagProvider } from './FeatureFlagProvider';
import { RuntimeLogger } from '../observability/RuntimeLogger';
import { CapabilityRegistry } from '../registries/CapabilityRegistry';
import { ServiceRegistry } from '../registries/ServiceRegistry';
import { VersionedEventBus } from '../events/EventBus';
import { DeliveryEngine } from '../delivery/DeliveryEngine';
import { NotificationRuntime } from '../notifications/NotificationRuntime';

export type RuntimeState = 'STARTING' | 'RUNNING' | 'DEGRADED' | 'STOPPING' | 'STOPPED' | 'FAILED';

export class RuntimeKernel {
  private state: RuntimeState = 'STOPPED';
  private logger = RuntimeLogger.getInstance();
  private featureFlags = FeatureFlagProvider.getInstance();
  private capabilityRegistry = new CapabilityRegistry();
  private serviceRegistry = new ServiceRegistry();
  private eventBus = new VersionedEventBus();
  private context?: BusinessRuntimeContext;

  private deliveryEngine: DeliveryEngine;
  private notificationRuntime: NotificationRuntime;

  constructor() {
    this.deliveryEngine = new DeliveryEngine(this.eventBus);
    this.notificationRuntime = new NotificationRuntime(this.eventBus);
    this.serviceRegistry.register('deliveryEngine', () => this.deliveryEngine);
    this.serviceRegistry.register('notificationRuntime', () => this.notificationRuntime);
  }

  public getState(): RuntimeState {
    return this.state;
  }

  public getCapabilityRegistry(): CapabilityRegistry {
    return this.capabilityRegistry;
  }

  public getServiceRegistry(): ServiceRegistry {
    return this.serviceRegistry;
  }

  public getEventBus(): VersionedEventBus {
    return this.eventBus;
  }

  public getDeliveryEngine(): DeliveryEngine {
    return this.deliveryEngine;
  }

  public getNotificationRuntime(): NotificationRuntime {
    return this.notificationRuntime;
  }

  /**
   * Inicializa el RuntimeKernel para un contexto de negocio determinado.
   */
  public async boot(runtimeContext: BusinessRuntimeContext): Promise<void> {
    if (!this.featureFlags.isEnabled('runtime.enabled')) {
      this.logger.info('[RuntimeKernel] Flag runtime.enabled deshabilitado. Kernel no iniciado.');
      return;
    }

    this.state = 'STARTING';
    this.context = runtimeContext;
    this.logger.info(`[RuntimeKernel] Iniciando kernel para negocio ${runtimeContext.slug} (Blueprint: ${runtimeContext.blueprint})...`);

    try {
      await this.eventBus.publish({
        eventId: `evt-boot-${Date.now()}`,
        name: 'runtime.started',
        version: 'v1',
        timestamp: new Date().toISOString(),
        correlationId: `corr-boot-${Date.now()}`,
        businessId: runtimeContext.businessId,
        source: 'RuntimeKernel',
        payload: { state: this.state }
      });

      // Resolver capacidades ordenadas por startupPriority
      const sortedCapabilities = this.capabilityRegistry.resolveSortedCapabilities();
      this.logger.info(`[RuntimeKernel] Inicializando ${sortedCapabilities.length} capacidades en orden de prioridad...`);

      for (const cap of sortedCapabilities) {
        if (runtimeContext.activeCapabilities.includes(cap.metadata.id)) {
          this.logger.info(`[RuntimeKernel] Habilitando capacidad: ${cap.metadata.id}...`);
          cap.registerSubscriptions(this.eventBus);
          await cap.enable(runtimeContext);
        }
      }

      this.state = 'RUNNING';
      this.logger.info(`[RuntimeKernel] Kernel en ejecución limpia [ESTADO: RUNNING]`);

    } catch (err: any) {
      this.state = 'FAILED';
      this.logger.error('[RuntimeKernel] Error crítico durante la inicialización del kernel', err);
      
      await this.eventBus.publish({
        eventId: `evt-fail-${Date.now()}`,
        name: 'runtime.failed',
        version: 'v1',
        timestamp: new Date().toISOString(),
        correlationId: `corr-fail-${Date.now()}`,
        businessId: runtimeContext.businessId,
        source: 'RuntimeKernel',
        payload: { error: err?.message || err }
      });

      throw err;
    }
  }

  /**
   * Apaga el RuntimeKernel de forma limpia.
   */
  public async shutdown(): Promise<void> {
    if (this.state === 'STOPPED') return;
    this.state = 'STOPPING';
    this.logger.info('[RuntimeKernel] Apagando kernel...');

    if (this.context) {
      const caps = this.capabilityRegistry.getAll();
      for (const cap of caps) {
        try {
          await cap.disable(this.context);
        } catch (err) {
          this.logger.error(`[RuntimeKernel] Error al desactivar capacidad ${cap.metadata.id}`, err);
        }
      }
    }

    this.serviceRegistry.clear();
    this.eventBus.clear();
    this.state = 'STOPPED';
    this.logger.info('[RuntimeKernel] Kernel detenido [ESTADO: STOPPED]');
  }
}
