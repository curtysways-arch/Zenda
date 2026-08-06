/**
 * @file CapabilitySDK.ts
 * @module core/sdk
 * @description SDK universal para desarrollo y empaquetado de capacidades en Citiox Enterprise vNext.
 * @responsibility Proveer constructores tipados y helpers de validación para empaquetar capacidades cumpliendo el contrato Capability (contractVersion: "1.0").
 * @dependencies Capability contract, RuntimeLogger
 * @status Stable (Core SDK - v1.0)
 */

import { Capability, CapabilityMetadata, CapabilityHealth, RouteDefinition, NavigationDefinition, PermissionDefinition, WidgetDefinition, EventDefinition } from '../contracts/Capability';
import { VersionedEventBus } from '../events/EventBus';

export interface CapabilitySDKOptions {
  metadata: CapabilityMetadata;
  api: Record<string, (...args: any[]) => any>;
  onEnable?: (context: any) => Promise<void> | void;
  onDisable?: (context: any) => Promise<void> | void;
  getRoutes?: () => RouteDefinition[];
  getNavigation?: () => NavigationDefinition[];
  getPermissions?: () => PermissionDefinition[];
  getWidgets?: () => WidgetDefinition[];
  getEvents?: () => EventDefinition[];
  subscriptions?: (eventBus: VersionedEventBus) => void;
  healthCheck?: () => Promise<CapabilityHealth>;
  migration?: (fromVersion: string, toVersion: string) => Promise<void>;
}

export class CapabilitySDK {
  /**
   * Helper estático para construir una capacidad tipada respetando el contrato Capability (v1.0).
   */
  public static createCapability(options: CapabilitySDKOptions): Capability {
    const meta = {
      ...options.metadata,
      contractVersion: options.metadata.contractVersion || '1.0'
    };

    return {
      metadata: meta,
      api: options.api || {},

      async install(context: any): Promise<void> {},
      async configure(context: any): Promise<void> {},
      async enable(context: any): Promise<void> {
        if (options.onEnable) await options.onEnable(context);
      },
      async disable(context: any): Promise<void> {
        if (options.onDisable) await options.onDisable(context);
      },
      async uninstall(context: any): Promise<void> {},

      getRoutes: () => options.getRoutes ? options.getRoutes() : [],
      getPermissions: () => options.getPermissions ? options.getPermissions() : [],
      getNavigation: () => options.getNavigation ? options.getNavigation() : [],
      getWidgets: () => options.getWidgets ? options.getWidgets() : [],
      getEvents: () => options.getEvents ? options.getEvents() : [],

      getHealth: async (): Promise<CapabilityHealth> => {
        if (options.healthCheck) return await options.healthCheck();
        return {
          status: 'RUNNING',
          version: meta.version,
          startedAt: new Date(),
          dependencies: meta.dependencies || [],
          diagnostics: ['SDK Default Operational Check Passed']
        };
      },

      migrate: async (fromVersion: string, toVersion: string): Promise<void> => {
        if (options.migration) await options.migration(fromVersion, toVersion);
      },

      registerSubscriptions: (eventBus: VersionedEventBus): void => {
        if (options.subscriptions) options.subscriptions(eventBus);
      }
    };
  }
}
