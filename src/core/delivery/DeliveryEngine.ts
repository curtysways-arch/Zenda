/**
 * @file DeliveryEngine.ts
 * @module core/delivery
 * @description Adaptador del motor de logística y delivery para Citiox Enterprise vNext.
 * @responsibility Envolver la lógica logística de asignaciones, despacho en lote (batch dispatch), rutas de entrega y estado de disponibilidad de repartidores bajo la interfaz del ServiceRegistry.
 * @dependencies VersionedEventBus, RuntimeLogger
 * @status Stable (Core Runtime - v1.0)
 */

import { VersionedEventBus, EventEnvelope } from '../events/EventBus';
import { RuntimeLogger } from '../observability/RuntimeLogger';

export type DriverStatus = 'DISPONIBLE' | 'DESCANSO' | 'OCUPADO' | 'DESCONECTADO';
export type DeliveryState = 'WAITING_DISPATCH' | 'ASSIGNED' | 'PICKED_UP' | 'ON_ROUTE' | 'DELIVERED';

export interface DriverProfile {
  driverId: string;
  name: string;
  phone: string;
  vehicleType: 'MOTO' | 'BICI' | 'AUTO';
  status: DriverStatus;
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
      createdAt: now,
      updatedAt: now
    };

    this.tasks.set(taskId, fullTask);
    this.logger.info(`[DeliveryEngine] Tarea de entrega creada en WAITING_DISPATCH: ${taskId} (Orden: ${task.orderId})`);
    return fullTask;
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

        // Emitir evento de asignación
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
