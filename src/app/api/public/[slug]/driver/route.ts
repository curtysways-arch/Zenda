/**
 * @file route.ts
 * @module app/api/public/[slug]/driver
 * @description Endpoint público para la App de Repartidores (FASE 5E).
 * @responsibility Permitir a los repartidores consultar pedidos asignados, cambiar su disponibilidad (DISPONIBLE, DESCANSO, DESCONECTADO), y Aceptar o Rechazar tareas mediante el DeliveryEngine.
 * @dependencies BusinessRuntimeResolver, DeliveryEngine
 * @status Stable (Core Runtime API - v1.0)
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { BusinessRuntimeResolver } from '@/core/runtime/BusinessRuntimeResolver';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const driverId = searchParams.get('driverId');

  try {
    const negocio = await prisma.negocio.findUnique({ where: { slug } });
    if (!negocio) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    const resolved = await BusinessRuntimeResolver.resolve(negocio);
    const deliveryEngine = resolved.kernel!.getDeliveryEngine();

    const drivers = deliveryEngine.getDrivers();
    const tasks = deliveryEngine.getAllTasks(negocio.id);

    const driverTasks = driverId
      ? tasks.filter(t => t.driverId === driverId)
      : tasks;

    return NextResponse.json({
      success: true,
      drivers,
      tasks: driverTasks,
      pendingQueue: tasks.filter(t => t.state === 'WAITING_DISPATCH'),
    });
  } catch (e: any) {
    console.error('[API Driver GET Error]:', e);
    return NextResponse.json({ error: e.message || 'Error interno' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const negocio = await prisma.negocio.findUnique({ where: { slug } });
    if (!negocio) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const { action, driverId, name, phone, vehicleType, status, taskId, nextState } = body;

    const resolved = await BusinessRuntimeResolver.resolve(negocio);
    const deliveryEngine = resolved.kernel!.getDeliveryEngine();

    // 1. Registro / Actualización de repartidor
    if (action === 'REGISTER_OR_UPDATE_DRIVER') {
      if (!driverId || !name) {
        return NextResponse.json({ error: 'driverId y name son requeridos.' }, { status: 400 });
      }

      deliveryEngine.registerDriver({
        driverId,
        name,
        phone: phone || '',
        vehicleType: vehicleType || 'MOTO',
        status: status || 'DISPONIBLE',
      });

      return NextResponse.json({
        success: true,
        message: 'Repartidor actualizado.',
        driver: deliveryEngine.getDriver(driverId),
      });
    }

    // 2. Cambio de estado de repartidor (DISPONIBLE, DESCANSO, DESCONECTADO)
    if (action === 'SET_STATUS') {
      if (!driverId || !status) {
        return NextResponse.json({ error: 'driverId y status son requeridos.' }, { status: 400 });
      }

      deliveryEngine.setDriverStatus(driverId, status);
      return NextResponse.json({
        success: true,
        message: `Estado actualizado a ${status}`,
        driver: deliveryEngine.getDriver(driverId),
      });
    }

    // 3. Aceptar pedido
    if (action === 'ACCEPT_TASK') {
      if (!taskId || !driverId) {
        return NextResponse.json({ error: 'taskId y driverId son requeridos.' }, { status: 400 });
      }

      const updatedTask = await deliveryEngine.updateDeliveryState(taskId, 'ASSIGNED');
      return NextResponse.json({ success: true, task: updatedTask });
    }

    // 4. Rechazar pedido (regresa a la cola WAITING_DISPATCH)
    if (action === 'REJECT_TASK') {
      if (!taskId || !driverId) {
        return NextResponse.json({ error: 'taskId y driverId son requeridos.' }, { status: 400 });
      }

      const updatedTask = await deliveryEngine.rejectTask(taskId, driverId);
      return NextResponse.json({
        success: true,
        message: 'Pedido rechazado. Devuelto a la cola de asignación.',
        task: updatedTask,
      });
    }

    // 5. Cambio de estado de entrega (PICKED_UP, ON_ROUTE, DELIVERED)
    if (action === 'UPDATE_DELIVERY_STATE') {
      if (!taskId || !nextState) {
        return NextResponse.json({ error: 'taskId y nextState son requeridos.' }, { status: 400 });
      }

      const updatedTask = await deliveryEngine.updateDeliveryState(taskId, nextState);
      return NextResponse.json({ success: true, task: updatedTask });
    }

    return NextResponse.json({ error: 'Acción no válida.' }, { status: 400 });
  } catch (e: any) {
    console.error('[API Driver POST Error]:', e);
    return NextResponse.json({ error: e.message || 'Error interno' }, { status: 500 });
  }
}
