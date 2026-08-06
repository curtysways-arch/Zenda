/**
 * @file DeliveryEngine.ts
 * @module core/delivery
 * @description Adaptador del motor de logística y delivery para Citiox Enterprise vNext.
 * @responsibility Administrar repartidores (DISPONIBLE, OCUPADO, DESCONECTADO), asignaciones manuales/automáticas,
 *   flujo de aceptación/rechazo de pedidos por repartidores y actualización de estados (WAITING_DISPATCH, ASSIGNED, PICKED_UP, ON_ROUTE, DELIVERED).
 * @dependencies VersionedEventBus, RuntimeLogger
 * @status Stable (Core Runtime - v1.0)
 */

import { VersionedEventBus, EventEnvelope } from '../events/EventBus';
import { RuntimeLogger } from '../observability/RuntimeLogger';

export type DriverStatus = 'DISPONIBLE' | 'DESCANSO' | 'OCUPADO' | 'DESCONECTADO';
export type DeliveryState = 'WAITING_DISPATCH' | 'ASSIGNED' | 'PICKED_UP' | 'ON_ROUTE' | 'DELIVERED' | 'CANCELLED';

export interface DriverProfile {
  driverId: string;
  name: string;
  phone: string;
  vehicleType: 'MOTO' | 'BICI' | 'AUTO';
  status: DriverStatus;
  currentLat?: number;
  currentLng?: number;
}

export interface DeliveryTask {
  taskId: string;
  orderId: string;
  businessId: string;
  customerName: string;
  customerPhone: string;
  address: string;
  lat?: number;
  lng?: number;
  distanceKm: number;
  deliveryCost: number;
  driverId?: string;
  state: DeliveryState;
  rejectedByDrivers?: string[];
  createdAt: string;
  updatedAt: string;
}

export class DeliveryEngine {
  private logger = RuntimeLogger.getInstance();
  private tasks = new Map<string, DeliveryTask>();
  private drivers = new Map<string, DriverProfile>();

  constructor(private eventBus: VersionedEventBus) {}

  public registerDriver(driver: DriverProfile): void {
    this.drivers.set(driver.driverId, driver);
    this.logger.info(`[DeliveryEngine] Repartidor registrado: ${driver.name} (Estado: ${driver.status})`);
  }

  public getDrivers(): DriverProfile[] {
    return Array.from(this.drivers.values());
  }

  public getDriver(driverId: string): DriverProfile | undefined {
    return this.drivers.get(driverId);
  }

  public setDriverStatus(driverId: string, status: DriverStatus): void {
    const driver = this.drivers.get(driverId);
    if (driver) {
      driver.status = status;
      this.logger.info(`[DeliveryEngine] Estado de repartidor ${driver.name} actualizado: ${status}`);
    }
  }

  public createDeliveryTask(task: Omit<DeliveryTask, 'taskId' | 'state' | 'createdAt' | 'updatedAt'>): DeliveryTask {
    const taskId = `dlv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const fullTask: DeliveryTask = {
      ...task,
      taskId,
      state: 'WAITING_DISPATCH',
      rejectedByDrivers: [],
      createdAt: now,
      updatedAt: now
    };

    this.tasks.set(taskId, fullTask);
    this.logger.info(`[DeliveryEngine] Tarea de entrega creada en WAITING_DISPATCH: ${taskId} (Orden: ${task.orderId})`);

    // Intentar auto-asignar inmediatamente si hay un repartidor disponible
    this.autoAssignTask(taskId).catch(err => {
      this.logger.info(`[DeliveryEngine] Auto-asignación inicial en cola: ${err.message}`);
    });

    return fullTask;
  }

  public getTask(taskId: string): DeliveryTask | undefined {
    return this.tasks.get(taskId);
  }

  public getAllTasks(businessId?: string): DeliveryTask[] {
    const all = Array.from(this.tasks.values());
    return businessId ? all.filter(t => t.businessId === businessId) : all;
  }

  public async assignBatch(taskIds: string[], driverId: string): Promise<DeliveryTask[]> {
    const driver = this.drivers.get(driverId);
    if (!driver) throw new Error(`[DeliveryEngine] Repartidor no encontrado: ${driverId}`);
    if (driver.status !== 'DISPONIBLE') {
      throw new Error(`[DeliveryEngine] Repartidor ${driver.name} no se encuentra disponible (Estado actual: ${driver.status})`);
    }

    const assignedTasks: DeliveryTask[] = [];
    const now = new Date().toISOString();

    for (const id of taskIds) {
      const task = this.tasks.get(id);
      if (task && (task.state === 'WAITING_DISPATCH' || task.state === 'ASSIGNED')) {
        task.driverId = driverId;
        task.state = 'ASSIGNED';
        task.updatedAt = now;
        assignedTasks.push(task);

        const envelope: EventEnvelope = {
          eventId: `evt-dlv-${Date.now()}`,
          name: 'delivery.assigned',
          version: 'v1',
          timestamp: now,
          correlationId: `corr-dlv-${task.taskId}`,
          businessId: task.businessId,
          source: 'DeliveryEngine',
          payload: { task, driver }
        };
        await this.eventBus.publish(envelope);
      }
    }

    driver.status = 'OCUPADO';
    this.logger.info(`[DeliveryEngine] Asignados ${assignedTasks.length} pedidos al repartidor ${driver.name}`);
    return assignedTasks;
  }

  /**
   * Intenta auto-asignar la tarea de entrega al primer repartidor disponible que NO la haya rechazado previamente.
   */
  public async autoAssignTask(taskId: string): Promise<DeliveryTask | null> {
    const task = this.tasks.get(taskId);
    if (!task || task.state !== 'WAITING_DISPATCH') return null;

    const availableDrivers = Array.from(this.drivers.values()).filter(d => 
      d.status === 'DISPONIBLE' && !task.rejectedByDrivers?.includes(d.driverId)
    );

    if (availableDrivers.length === 0) {
      this.logger.info(`[DeliveryEngine] No hay repartidores disponibles para auto-asignar la tarea ${taskId}`);
      return null;
    }

    const selectedDriver = availableDrivers[0];
    const assigned = await this.assignBatch([taskId], selectedDriver.driverId);
    return assigned[0] || null;
  }

  /**
   * Procesa el rechazo de un pedido por parte de un repartidor.
   * Regresa la tarea a WAITING_DISPATCH y activa la reasignación automática.
   */
  public async rejectTask(taskId: string, driverId: string): Promise<DeliveryTask> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`[DeliveryEngine] Tarea ${taskId} no encontrada.`);

    const driver = this.drivers.get(driverId);
    if (driver) {
      driver.status = 'DISPONIBLE'; // Liberar al repartidor
    }

    if (!task.rejectedByDrivers) task.rejectedByDrivers = [];
    if (!task.rejectedByDrivers.includes(driverId)) {
      task.rejectedByDrivers.push(driverId);
    }

    task.driverId = undefined;
    task.state = 'WAITING_DISPATCH';
    task.updatedAt = new Date().toISOString();

    this.logger.warn(`[DeliveryEngine] Repartidor ${driverId} rechazó la tarea ${taskId}. Retornando a WAITING_DISPATCH.`);

    // Emitir evento de rechazo
    const envelope: EventEnvelope = {
      eventId: `evt-dlv-rej-${Date.now()}`,
      name: 'delivery.rejected',
      version: 'v1',
      timestamp: task.updatedAt,
      correlationId: `corr-dlv-${task.taskId}`,
      businessId: task.businessId,
      source: 'DeliveryEngine',
      payload: { task, driverId }
    };
    await this.eventBus.publish(envelope);

    // Intentar auto-asignar a otro repartidor
    await this.autoAssignTask(taskId);

    return task;
  }

  public async updateDeliveryState(taskId: string, nextState: DeliveryState): Promise<DeliveryTask> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`[DeliveryEngine] Tarea de delivery no encontrada: ${taskId}`);

    const now = new Date().toISOString();
    task.state = nextState;
    task.updatedAt = now;

    if (nextState === 'DELIVERED' && task.driverId) {
      const driver = this.drivers.get(task.driverId);
      if (driver) driver.status = 'DISPONIBLE';
    }

    const envelope: EventEnvelope = {
      eventId: `evt-dlv-st-${Date.now()}`,
      name: `delivery.${nextState.toLowerCase()}`,
      version: 'v1',
      timestamp: now,
      correlationId: `corr-dlv-${task.taskId}`,
      businessId: task.businessId,
      source: 'DeliveryEngine',
      payload: task
    };

    await this.eventBus.publish(envelope);
    this.logger.info(`[DeliveryEngine] Tarea ${taskId} actualizada a estado: ${nextState}`);
    return task;
  }
}
