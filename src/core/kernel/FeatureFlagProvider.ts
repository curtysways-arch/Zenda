/**
 * @file FeatureFlagProvider.ts
 * @module core/kernel
 * @description Proveedor desacoplado de Feature Flags para Citiox Enterprise Engine.
 * @responsibility Administrar conmutadores de características de infraestructura con desactivación por defecto (false).
 * @dependencies Ninguna
 * @status Stable (Core Foundation - v1.0)
 */

export interface FeatureFlags {
  'runtime.enabled': boolean;
  'runtime.eventBus': boolean;
  'runtime.capabilities': boolean;
  'runtime.blueprints': boolean;
  'runtime.serviceRegistry': boolean;
  [key: string]: boolean;
}

export class FeatureFlagProvider {
  private static instance: FeatureFlagProvider;
  private flags: FeatureFlags = {
    'runtime.enabled': false,
    'runtime.eventBus': false,
    'runtime.capabilities': false,
    'runtime.blueprints': false,
    'runtime.serviceRegistry': false
  };

  private constructor() {}

  public static getInstance(): FeatureFlagProvider {
    if (!FeatureFlagProvider.instance) {
      FeatureFlagProvider.instance = new FeatureFlagProvider();
    }
    return FeatureFlagProvider.instance;
  }

  public isEnabled(flagName: keyof FeatureFlags | string): boolean {
    return Boolean(this.flags[flagName]);
  }

  public setFlag(flagName: string, enabled: boolean): void {
    this.flags[flagName] = enabled;
  }

  public getFlags(): FeatureFlags {
    return { ...this.flags };
  }
}
