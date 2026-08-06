/**
 * @file BusinessRuntimeResolver.ts
 * @module core/runtime
 * @description Resolver desacoplado del Enterprise Runtime para negocios individuales en Citiox SaaS.
 * @responsibility Inspeccionar la configuración del negocio (o FeatureFlag global), compilar su BusinessRuntimeContext,
 *   y (si está habilitado) arrancar y proporcionar la instancia activa del RuntimeKernel.
 * @dependencies BackwardCompatibilityAdapter, BusinessRuntimeContext, RuntimeKernel, FeatureFlagProvider,
 *              CapabilityRegistry, RestaurantCapability, SpaCapability, LaundryCapability, CourtsCapability
 * @status Experimental (FASE 5C - UI Integration)
 */

import { BackwardCompatibilityAdapter } from '../adapters/BackwardCompatibilityAdapter';
import { BusinessRuntimeContext } from '../kernel/BusinessRuntimeContext';
import { RuntimeKernel } from '../kernel/RuntimeKernel';
import { FeatureFlagProvider } from '../kernel/FeatureFlagProvider';
import { RuntimeLogger } from '../observability/RuntimeLogger';

// Capacidades disponibles
import { RestaurantCapability } from '../capabilities/RestaurantCapability';
import { SpaCapability } from '../capabilities/SpaCapability';
import { LaundryCapability } from '../capabilities/LaundryCapability';
import { CourtsCapability } from '../capabilities/CourtsCapability';

export interface ResolvedBusinessRuntime {
  isEnterprise: boolean;
  businessId: string;
  slug: string;
  tipoNegocio: string;
  blueprint: string;
  activeCapabilities: string[];
  kernel?: RuntimeKernel;
  context?: BusinessRuntimeContext;
  skippedReason?: string;
}

export class BusinessRuntimeResolver {
  private static logger = RuntimeLogger.getInstance();
  private static activeKernels = new Map<string, RuntimeKernel>();

  /**
   * Determina si el Enterprise Runtime está habilitado para un negocio dado.
   * La activación puede ser global (FeatureFlag `runtime.enabled`) O individual por negocio
   * (si negocio.configuracion tiene `useEnterpriseRuntime = true` o `enterpriseRuntime = true`).
   */
  public static isEnterpriseEnabledForBusiness(negocio: any): boolean {
    if (!negocio) return false;

    // 1. Verificación global por FeatureFlagProvider
    const globalEnabled = FeatureFlagProvider.getInstance().isEnabled('runtime.enabled');
    if (globalEnabled) return true;

    // 2. Verificación individual por configuración del negocio
    let config: any = {};
    if (typeof negocio.configuracion === 'string') {
      try { config = JSON.parse(negocio.configuracion); } catch { config = {}; }
    } else {
      config = negocio.configuracion || {};
    }

    const extra = typeof negocio.extraInfo === 'string'
      ? (() => { try { return JSON.parse(negocio.extraInfo); } catch { return {}; } })()
      : (negocio.extraInfo || {});

    return Boolean(
      config.useEnterpriseRuntime ||
      config.enterpriseRuntime ||
      extra.useEnterpriseRuntime ||
      extra.enterpriseRuntime
    );
  }

  /**
   * Resuelve e inicializa el Enterprise Runtime para un negocio si le corresponde.
   */
  public static async resolve(negocio: any): Promise<ResolvedBusinessRuntime> {
    if (!negocio) {
      return {
        isEnterprise: false,
        businessId: 'unknown',
        slug: 'unknown',
        tipoNegocio: 'RESTAURANT',
        blueprint: 'RESTAURANT',
        activeCapabilities: [],
        skippedReason: 'Negocio nulo o no provisto',
      };
    }

    const businessId = negocio.id || 'demo-id';
    const slug = negocio.slug || 'demo-slug';
    const tipoNegocio = negocio.tipoNegocio || 'RESTAURANT';

    // Crear contexto puro con BackwardCompatibilityAdapter
    const context = BackwardCompatibilityAdapter.toRuntimeContext(negocio);

    const enabled = this.isEnterpriseEnabledForBusiness(negocio);
    if (!enabled) {
      return {
        isEnterprise: false,
        businessId,
        slug,
        tipoNegocio,
        blueprint: context.blueprint,
        activeCapabilities: context.activeCapabilities,
        context,
        skippedReason: 'Enterprise Runtime deshabilitado para este negocio',
      };
    }

    this.logger.info(`[BusinessRuntimeResolver] Activando Enterprise Runtime para negocio ${slug} (${businessId})...`);

    // Obtener o instanciar Kernel
    let kernel = this.activeKernels.get(businessId);
    if (!kernel) {
      kernel = new RuntimeKernel();

      // Habilitar flag temporalmente en el FeatureFlagProvider singleton si fue por config de negocio
      FeatureFlagProvider.getInstance().setFlag('runtime.enabled', true);

      // Registrar capacidades estándar en el registry del kernel
      const registry = kernel.getCapabilityRegistry();
      registry.register(new RestaurantCapability());
      registry.register(new SpaCapability());
      registry.register(new LaundryCapability());
      registry.register(new CourtsCapability());

      // Boot del Kernel con el contexto resuelto
      await kernel.boot(context);
      this.activeKernels.set(businessId, kernel);
    }

    return {
      isEnterprise: true,
      businessId,
      slug,
      tipoNegocio,
      blueprint: context.blueprint,
      activeCapabilities: context.activeCapabilities,
      kernel,
      context,
    };
  }

  /**
   * Apaga y limpia la instancia de kernel de un negocio si existe.
   */
  public static async shutdownBusiness(businessId: string): Promise<void> {
    const kernel = this.activeKernels.get(businessId);
    if (kernel) {
      await kernel.shutdown();
      this.activeKernels.delete(businessId);
    }
  }
}
