/**
 * @file DispatchEngine.ts
 * @module core/dispatch
 * @description Motor especializado de ejecución logística pura para Citiox Enterprise vNext.
 * @responsibility Administrar tareas de despacho (creación, asignación de recursos, salidas, tracking GPS y entregas)
 *   emitiendo eventos desacoplados sin conocimiento de reglas comerciales de órdenes ni cocina.
 * @status Stable (Core Dispatch - v1.0)
 */

import { VersionedEventBus, EventEnvelope } from '../events/EventBus';
import { RuntimeLogger } from '../observability/RuntimeLogger';
import { DispatchResourceRuntime, DispatchResource } from '../runtime/DispatchResourceRuntime';

export type DispatchTaskStatus = 'WAITING_DISPATCH' | 'ASSIGNED' | 'ON_ROUTE' | 'COMPLETED' | 'CANCELLED';

export interface DispatchCustomer {
  name: string;
  phone: string;
}

export interface DispatchTask {
  taskId: string;
  fulfillmentTicketId: string;
  orderId: string;
  businessId: string;
  channel: string;
  dispatchResourceId?: string;
  assignedResource?: DispatchResource;
  status: DispatchTaskStatus;
  customer: DispatchCustomer;
  address: string;
  lat?: number;
  lng?: number;
  distanceKm?: number;
  instructions?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export class DispatchEngine {
  private static instance: DispatchEngine;
  private logger = RuntimeLogger.getInstance();
  private tasks = new Map<string, DispatchTask>();
  private resourceRuntime = DispatchResourceRuntime.getInstance();

  constructor(private eventBus?: VersionedEventBus) {}

  public static getInstance(eventBus?: VersionedEventBus): DispatchEngine {
    if (!DispatchEngine.instance) {
      DispatchEngine.instance = new DispatchEngine(eventBus);
    }
    return DispatchEngine.instance;
  }

  public setEventBus(eventBus: VersionedEventBus): void {
    this.eventBus = eventBus;
  }

  /**
   * Crear una nueva tarea de despacho puro.
   */
  public async createDispatchTask(
    taskData: Omit<DispatchTask, 'taskId' | 'status' | 'createdAt' | 'updatedAt'>
  ): Promise<DispatchTask> {
    const taskId = `dspt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const fullTask: DispatchTask = {
      ...taskData,
      taskId,
      status: 'WAITING_DISPATCH',
      createdAt: now,
      updatedAt: now,
    };

    this.tasks.set(taskId, fullTask);
    this.logger.info(`[DispatchEngine] Tarea de despacho creada: ${taskId} (Orden: ${taskData.orderId})`);

    if (this.eventBus) {
      const envelope: EventEnvelope = {
        eventId: `evt-dspt-create-${Date.now()}`,
        name: 'dispatch.created',
        version: 'v1',
        timestamp: now,
        correlationId: `corr-dspt-${taskId}`,
        businessId: taskData.businessId,
        source: 'DispatchEngine',
        payload: fullTask,
      };
      await this.eventBus.publish(envelope);
    }

    return fullTask;
  }

  /**
   * Asignar un recurso logístico a la tarea de despacho.
   */
  public async assignResource(taskId: string, resourceId: string): Promise<DispatchTask> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`[DispatchEngine] Tarea de despacho ${taskId} no encontrada.`);

    const resource = this.resourceRuntime.getResource(resourceId);
    if (!resource) throw new Error(`[DispatchEngine] Recurso logístico ${resourceId} no encontrado.`);

    const now = new Date().toISOString();
    task.dispatchResourceId = resourceId;
    task.assignedResource = resource;
    task.status = 'ASSIGNED';
    task.updatedAt = now;

    // Actualizar estado del recurso a OCUPADO
    this.resourceRuntime.updateResourceStatus(resourceId, 'OCUPADO');

    this.logger.info(`[DispatchEngine] Recurso ${resource.name} asignado a la tarea ${taskId}`);

    if (this.eventBus) {
      const envelope: EventEnvelope = {
        eventId: `evt-dspt-assign-${Date.now()}`,
        name: 'dispatch.assigned',
        version: 'v1',
        timestamp: now,
        correlationId: `corr-dspt-${taskId}`,
        businessId: task.businessId,
        source: 'DispatchEngine',
        payload: { task, resource },
      };
      await this.eventBus.publish(envelope);
    }

    return task;
  }

  /**
   * Iniciar la ruta de despacho.
   */
  public async startDispatch(taskId: string): Promise<DispatchTask> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`[DispatchEngine] Tarea de despacho ${taskId} no encontrada.`);

    const now = new Date().toISOString();
    task.status = 'ON_ROUTE';
    task.updatedAt = now;

    if (task.dispatchResourceId) {
      this.resourceRuntime.updateResourceStatus(task.dispatchResourceId, 'EN_RUTA');
    }

    this.logger.info(`[DispatchEngine] Tarea de despacho ${taskId} en ruta.`);

    if (this.eventBus) {
      const envelope: EventEnvelope = {
        eventId: `evt-dspt-route-${Date.now()}`,
        name: 'dispatch.on_route',
        version: 'v1',
        timestamp: now,
        correlationId: `corr-dspt-${taskId}`,
        businessId: task.businessId,
        source: 'DispatchEngine',
        payload: task,
      };
      await this.eventBus.publish(envelope);
    }

    return task;
  }

  /**
   * Completar la tarea de despacho.
   */
  public async completeDispatch(taskId: string): Promise<DispatchTask> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`[DispatchEngine] Tarea de despacho ${taskId} no encontrada.`);

    const now = new Date().toISOString();
    task.status = 'COMPLETED';
    task.updatedAt = now;

    if (task.dispatchResourceId) {
      this.resourceRuntime.updateResourceStatus(task.dispatchResourceId, 'DISPONIBLE');
    }

    this.logger.info(`[DispatchEngine] Tarea de despacho ${taskId} completada exitosamente.`);

    if (this.eventBus) {
      const envelope: EventEnvelope = {
        eventId: `evt-dspt-comp-${Date.now()}`,
        name: 'dispatch.completed',
        version: 'v1',
        timestamp: now,
        correlationId: `corr-dspt-${taskId}`,
        businessId: task.businessId,
        source: 'DispatchEngine',
        payload: task,
      };
      await this.eventBus.publish(envelope);
    }

    return task;
  }

  /**
   * Obtener tareas por negocio o por ID.
   */
  public getTask(taskId: string): DispatchTask | undefined {
    return this.tasks.get(taskId);
  }

  public getTasks(businessId?: string): DispatchTask[] {
    const all = Array.from(this.tasks.values());
    return businessId ? all.filter(t => t.businessId === businessId) : all;
  }
}
