/**
 * @file DispatchResourceRuntime.ts
 * @module core/runtime
 * @description Motor universal de recursos de despacho desacoplado para Citiox Enterprise vNext.
 * @responsibility Administrar recursos logísticos (choferes, repartidores, vehículos, couriers externos,
 *   proveedores de delivery, bots de automatización) sin acoplamiento con industrias ni vehiculización física.
 * @status Stable (Core Runtime - v1.0)
 */

import { VersionedEventBus } from '../events/EventBus';
import { RuntimeLogger } from '../observability/RuntimeLogger';

export type DispatchResourceType = 'HUMAN' | 'VEHICLE' | 'COURIER' | 'EXTERNAL_PROVIDER' | 'AUTOMATED';
export type DispatchResourceStatus = 'DISPONIBLE' | 'OCUPADO' | 'EN_RUTA' | 'DESCONECTADO';

export interface DispatchResource {
  resourceId: string;
  businessId: string;
  name: string;
  phone?: string;
  type: DispatchResourceType;
  status: DispatchResourceStatus;
  currentLat?: number;
  currentLng?: number;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export class DispatchResourceRuntime {
  private static instance: DispatchResourceRuntime;
  private logger = RuntimeLogger.getInstance();
  private resources = new Map<string, DispatchResource>();

  constructor(private eventBus?: VersionedEventBus) {}

  public static getInstance(eventBus?: VersionedEventBus): DispatchResourceRuntime {
    if (!DispatchResourceRuntime.instance) {
      DispatchResourceRuntime.instance = new DispatchResourceRuntime(eventBus);
    }
    return DispatchResourceRuntime.instance;
  }

  /**
   * Registrar o actualizar un recurso logístico en el sistema.
   */
  public registerResource(resource: Omit<DispatchResource, 'createdAt' | 'updatedAt'>): DispatchResource {
    const now = new Date().toISOString();
    const existing = this.resources.get(resource.resourceId);

    const fullResource: DispatchResource = {
      ...existing,
      ...resource,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    };

    this.resources.set(resource.resourceId, fullResource);
    this.logger.info(
      `[DispatchResourceRuntime] Recurso registrado/actualizado: ${fullResource.name} (${fullResource.type}) - Estado: ${fullResource.status}`
    );
    return fullResource;
  }

  /**
   * Obtener todos los recursos de un negocio.
   */
  public getResources(businessId?: string): DispatchResource[] {
    const all = Array.from(this.resources.values());
    return businessId ? all.filter(r => r.businessId === businessId) : all;
  }

  /**
   * Obtener recursos disponibles de un negocio.
   */
  public getAvailableResources(businessId?: string): DispatchResource[] {
    return this.getResources(businessId).filter(r => r.status === 'DISPONIBLE');
  }

  /**
   * Obtener un recurso específico.
   */
  public getResource(resourceId: string): DispatchResource | undefined {
    return this.resources.get(resourceId);
  }

  /**
   * Actualizar estado de un recurso.
   */
  public updateResourceStatus(resourceId: string, status: DispatchResourceStatus): DispatchResource {
    const resource = this.resources.get(resourceId);
    if (!resource) throw new Error(`[DispatchResourceRuntime] Recurso ${resourceId} no encontrado.`);

    resource.status = status;
    resource.updatedAt = new Date().toISOString();
    this.logger.info(`[DispatchResourceRuntime] Estado de recurso ${resource.name} (${resourceId}) cambiado a: ${status}`);
    return resource;
  }

  /**
   * Actualizar ubicación GPS de un recurso.
   */
  public updateResourceLocation(resourceId: string, lat: number, lng: number): DispatchResource {
    const resource = this.resources.get(resourceId);
    if (!resource) throw new Error(`[DispatchResourceRuntime] Recurso ${resourceId} no encontrado.`);

    resource.currentLat = lat;
    resource.currentLng = lng;
    resource.updatedAt = new Date().toISOString();
    return resource;
  }
}
