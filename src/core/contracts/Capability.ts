/**
 * @file Capability.ts
 * @module core/contracts
 * @description Contrato universal puro para capacidades de Citiox Enterprise Engine vNext.
 * @responsibility Definir interfaces y tipos estrictos de metadatos, ciclo de vida, manifiestos y salud sin incluir lógica ejecutable.
 * @dependencies Ninguna (Contrato puro)
 * @status Stable (Core Foundation - v1.0)
 */

export const CONTRACT_VERSION = "1.0";

export type CapabilityStatus = 'STARTING' | 'RUNNING' | 'DEGRADED' | 'STOPPING' | 'STOPPED' | 'FAILED';

export interface CapabilityMetadata {
  id: string;
  version: string;
  contractVersion: string; // e.g. "1.0"
  apiVersion?: string;
  schemaVersion?: string;
  eventVersion?: string;
  name: string;
  description: string;
  category: 'RESTAURANT' | 'SERVICES' | 'OPERATIONS' | 'MARKETING' | 'CORE';
  required?: boolean;
  experimental?: boolean;
  startupPriority?: number; // Menor número = mayor prioridad de inicialización
  dependencies?: string[];
  features?: Record<string, boolean>;
}

export interface CapabilityManifest {
  id: string;
  version: string;
  enabled: boolean;
  configuration: Record<string, unknown>;
  dependencies: string[];
}

export interface CapabilityHealth {
  status: CapabilityStatus;
  version: string;
  startedAt?: Date;
  lastHeartbeat?: Date;
  dependencies: string[];
  diagnostics: string[];
}

export interface RouteDefinition {
  path: string;
  type: 'admin' | 'public' | 'api';
  guarded?: boolean;
  permissions?: string[];
}

export interface NavigationDefinition {
  id: string;
  label: string;
  href: string;
  iconName?: string;
  section: string;
  order?: number;
  permissions?: string[];
}

export interface PermissionDefinition {
  code: string;
  name: string;
  description: string;
  category: string;
}

export interface WidgetDefinition {
  id: string;
  name: string;
  type: 'chart' | 'metric' | 'table' | 'custom';
  permissions?: string[];
}

export interface EventDefinition {
  name: string;
  version: string;
  description: string;
}

export interface ServiceDefinition {
  id: string;
  scope: 'SINGLETON' | 'SCOPED' | 'TRANSIENT';
}

export interface CapabilityApi {
  [key: string]: (...args: any[]) => any;
}

export interface Capability {
  metadata: CapabilityMetadata;
  api: CapabilityApi;

  install(context: any): Promise<void>;
  configure(context: any): Promise<void>;
  enable(context: any): Promise<void>;
  disable(context: any): Promise<void>;
  uninstall(context: any): Promise<void>;

  getRoutes(): RouteDefinition[];
  getPermissions(): PermissionDefinition[];
  getNavigation(): NavigationDefinition[];
  getWidgets(): WidgetDefinition[];
  getEvents(): EventDefinition[];
  getHealth(): Promise<CapabilityHealth>;
  migrate(fromVersion: string, toVersion: string): Promise<void>;
  registerSubscriptions(eventBus: any): void;
}
