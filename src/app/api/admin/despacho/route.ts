import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { DispatchEngine } from '@/core/dispatch/DispatchEngine';
import { DispatchResourceRuntime } from '@/core/runtime/DispatchResourceRuntime';
import { FulfillmentEngine } from '@/core/fulfillment/FulfillmentEngine';
import { OrderRuntime } from '@/core/runtimes/OrderRuntime';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const negocioId = (session.user as any).negocioId;
  if (!negocioId) {
    return NextResponse.json({ error: 'No tienes un negocio asociado' }, { status: 400 });
  }

  try {
    const dispatchEngine = DispatchEngine.getInstance();
    const resourceRuntime = DispatchResourceRuntime.getInstance();
    const fulfillmentEngine = FulfillmentEngine.getInstance();

    // 1. Tareas de despacho activas en memoria
    const memoryDispatchTasks = dispatchEngine.getTasks(negocioId);
    const memoryResources = resourceRuntime.getResources(negocioId);

    // 2. Pedidos en base de datos para sincronización y vista unificada
    const dbOrders = await (prisma as any).pedido.findMany({
      where: {
        negocioId,
        estado: {
          in: [
            'WAITING_CONFIRMATION', 'CONFIRMED', 'RECIBIDO', 'EN_PREPARACION', 'PREPARACION',
            'LISTO', 'LISTA', 'REPARTIDOR_ASIGNADO', 'EN_CAMINO', 'EN_RUTA', 'RUTA', 'ENTREGADO', 'ENTREGADO_MESA', 'RETIRADO'
          ]
        }
      },
      include: {
        items: true,
        payment: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Sembrar recursos por defecto si la lista está vacía (repartidores demo/personal)
    if (memoryResources.length === 0) {
      resourceRuntime.registerResource({
        resourceId: `res-${negocioId}-1`,
        businessId: negocioId,
        name: 'Carlos Ruiz (Moto 01)',
        phone: '+593991234567',
        type: 'HUMAN',
        status: 'DISPONIBLE'
      });
      resourceRuntime.registerResource({
        resourceId: `res-${negocioId}-2`,
        businessId: negocioId,
        name: 'Courier Express (Externo)',
        phone: '+593998765432',
        type: 'EXTERNAL_PROVIDER',
        status: 'DISPONIBLE'
      });
      resourceRuntime.registerResource({
        resourceId: `res-${negocioId}-3`,
        businessId: negocioId,
        name: 'Dron / Auto-Servicio',
        phone: 'N/A',
        type: 'AUTOMATED',
        status: 'DISPONIBLE'
      });
    }

    const resources = resourceRuntime.getResources(negocioId);

    return NextResponse.json({
      success: true,
      orders: dbOrders,
      dispatchTasks: memoryDispatchTasks,
      resources
    });
  } catch (error: any) {
    console.error('[API_ADMIN_DESPACHO_GET_ERROR]', error);
    return NextResponse.json({ error: error.message || 'Error al obtener despacho' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const negocioId = (session.user as any).negocioId;
  if (!negocioId) {
    return NextResponse.json({ error: 'No tienes un negocio asociado' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { action, orderId, taskId, resourceId, nuevoEstado, resourceData } = body;

    const dispatchEngine = DispatchEngine.getInstance();
    const resourceRuntime = DispatchResourceRuntime.getInstance();
    const fulfillmentEngine = FulfillmentEngine.getInstance();

    if (action === 'REGISTER_RESOURCE') {
      const resource = resourceRuntime.registerResource({
        resourceId: resourceData.resourceId || `res-${negocioId}-${Date.now()}`,
        businessId: negocioId,
        name: resourceData.name,
        phone: resourceData.phone || '',
        type: resourceData.type || 'HUMAN',
        status: resourceData.status || 'DISPONIBLE'
      });
      return NextResponse.json({ success: true, resource });
    }

    if (action === 'ASSIGN_RESOURCE') {
      if (!taskId && !orderId) {
        return NextResponse.json({ error: 'taskId u orderId requerido' }, { status: 400 });
      }

      let activeTaskId = taskId;

      // Si no existe tarea en memoria pero tenemos un orderId, crear ticket y tarea al vuelo
      if (!activeTaskId && orderId) {
        const order = await (prisma as any).pedido.findUnique({ where: { id: orderId } });
        if (!order) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });

        const ticket = await fulfillmentEngine.beginFulfillment(
          order.id,
          negocioId,
          order.tipoEntrega === 'RETIRO' ? 'PICKUP' : order.tipoEntrega === 'MESA' ? 'TABLE_SERVICE' : 'DELIVERY',
          undefined,
          {
            customer: { name: order.nombreCliente, phone: order.telefonoCliente },
            address: order.direccionCliente || '',
            lat: order.latitud,
            lng: order.longitud
          }
        );

        const dispatchTask = await dispatchEngine.createDispatchTask({
          fulfillmentTicketId: ticket.ticketId,
          orderId: order.id,
          businessId: negocioId,
          channel: ticket.channel,
          customer: { name: order.nombreCliente, phone: order.telefonoCliente },
          address: order.direccionCliente || '',
          lat: order.latitud ?? undefined,
          lng: order.longitud ?? undefined,
          instructions: order.referenciaCliente || ''
        });

        activeTaskId = dispatchTask.taskId;
      }

      const updatedTask = await dispatchEngine.assignResource(activeTaskId, resourceId);

      // Actualizar también el estado en Prisma para persistencia visual
      if (orderId || updatedTask.orderId) {
        await (prisma as any).pedido.update({
          where: { id: orderId || updatedTask.orderId },
          data: { estado: 'REPARTIDOR_ASIGNADO', updatedAt: new Date() }
        });
      }

      return NextResponse.json({ success: true, task: updatedTask });
    }

    if (action === 'START_DISPATCH') {
      if (!taskId && !orderId) {
        return NextResponse.json({ error: 'taskId u orderId requerido' }, { status: 400 });
      }
      let activeTaskId = taskId;
      if (!activeTaskId && orderId) {
        const existingTask = dispatchEngine.getTasks(negocioId).find(t => t.orderId === orderId);
        if (existingTask) activeTaskId = existingTask.taskId;
      }

      if (activeTaskId) {
        const updatedTask = await dispatchEngine.startDispatch(activeTaskId);
        if (orderId || updatedTask.orderId) {
          await (prisma as any).pedido.update({
            where: { id: orderId || updatedTask.orderId },
            data: { estado: 'EN_CAMINO', updatedAt: new Date() }
          });
        }
        return NextResponse.json({ success: true, task: updatedTask });
      } else if (orderId) {
        await (prisma as any).pedido.update({
          where: { id: orderId },
          data: { estado: 'EN_CAMINO', updatedAt: new Date() }
        });
        return NextResponse.json({ success: true });
      }
    }

    if (action === 'COMPLETE_DISPATCH') {
      if (!taskId && !orderId) {
        return NextResponse.json({ error: 'taskId u orderId requerido' }, { status: 400 });
      }
      let activeTaskId = taskId;
      if (!activeTaskId && orderId) {
        const existingTask = dispatchEngine.getTasks(negocioId).find(t => t.orderId === orderId);
        if (existingTask) activeTaskId = existingTask.taskId;
      }

      if (activeTaskId) {
        const updatedTask = await dispatchEngine.completeDispatch(activeTaskId);
        if (orderId || updatedTask.orderId) {
          await (prisma as any).pedido.update({
            where: { id: orderId || updatedTask.orderId },
            data: { estado: 'ENTREGADO', updatedAt: new Date() }
          });
        }
        return NextResponse.json({ success: true, task: updatedTask });
      } else if (orderId) {
        await (prisma as any).pedido.update({
          where: { id: orderId },
          data: { estado: 'ENTREGADO', updatedAt: new Date() }
        });
        return NextResponse.json({ success: true });
      }
    }

    if (action === 'UPDATE_ORDER_STATUS') {
      if (!orderId || !nuevoEstado) {
        return NextResponse.json({ error: 'orderId y nuevoEstado son requeridos' }, { status: 400 });
      }
      const updated = await (prisma as any).pedido.update({
        where: { id: orderId },
        data: { estado: nuevoEstado, updatedAt: new Date() }
      });
      return NextResponse.json({ success: true, order: updated });
    }

    return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 });
  } catch (error: any) {
    console.error('[API_ADMIN_DESPACHO_POST_ERROR]', error);
    return NextResponse.json({ error: error.message || 'Error al procesar despacho' }, { status: 500 });
  }
}
