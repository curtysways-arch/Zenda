import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const DOMAIN_EVENTS: Record<string, string> = {
  ASIGNADO: 'DeliveryAssignmentCreated',
  ACEPTADO: 'DriverAccepted',
  EN_RUTA: 'DriverStartedRoute',
  LLEGO: 'DriverArrived',
  COMPLETADO: 'DriverCompleted',
  CANCELADO: 'DriverCancelled',
};

// ─── PUT: Cambiar estado de una asignación ────────────────────────────────────
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const negocioId = (session?.user as any)?.negocioId;
    const { id } = await params;
    const body = await req.json();
    const { estado, notas } = body;

    const existing = await (prisma as any).deliveryAssignment.findFirst({
      where: negocioId ? { id, negocioId } : { id },
      include: { resource: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Asignación no encontrada' }, { status: 404 });
    }

    // Calcular timestamps según el nuevo estado
    const timestampUpdate: any = {};
    if (estado === 'EN_RUTA') timestampUpdate.horaSalida = new Date();
    if (estado === 'LLEGO') timestampUpdate.horaLlegada = new Date();
    if (estado === 'COMPLETADO') timestampUpdate.horaCompletado = new Date();

    // Actualizar asignación
    const updateData: any = { estado, ...timestampUpdate };
    if (notas !== undefined) updateData.notas = notas;

    const updated = await (prisma as any).deliveryAssignment.update({
      where: { id },
      data: updateData,
      include: { resource: { include: { profile: true } }, route: true },
    });

    // 🔄 Sincronizar el estado de la orden de servicio principal (Pedido)
    if (existing.ordenReferenciaId) {
      try {
        let orderStateUpdate = '';
        if (existing.tipo === 'RETIRO') {
          if (estado === 'ACEPTADO') orderStateUpdate = 'REPARTIDOR_EN_CAMINO';
          if (estado === 'EN_RUTA') orderStateUpdate = 'REPARTIDOR_EN_CAMINO';
          if (estado === 'LLEGO') orderStateUpdate = 'RECOGIDO';
          if (estado === 'COMPLETADO') orderStateUpdate = 'RECIBIDO';
        } else if (existing.tipo === 'ENTREGA') {
          if (estado === 'ACEPTADO' || estado === 'EN_RUTA') orderStateUpdate = 'EN_RUTA_ENTREGA';
          if (estado === 'COMPLETADO') orderStateUpdate = 'ENTREGADO';
        }

        if (orderStateUpdate) {
          const ord = await prisma.pedido.findUnique({ where: { id: existing.ordenReferenciaId } });
          if (ord) {
            const extra = (ord.extraInfo as any) || {};
            const timeline = Array.isArray(extra.timeline) ? extra.timeline : [];
            timeline.push({
              id: `tl_drv_${Date.now()}`,
              type: 'LOGISTICS',
              action: `Estado de repartidor actualizado a: ${estado} (${orderStateUpdate})`,
              estado: orderStateUpdate,
              user: existing.resource?.name || 'Repartidor',
              timestamp: new Date().toISOString()
            });

            await prisma.pedido.update({
              where: { id: existing.ordenReferenciaId },
              data: {
                estado: orderStateUpdate,
                extraInfo: { ...extra, timeline }
              }
            });
          }
        }
      } catch (syncErr) {
        console.error('Error sincronizando estado de orden desde Driver:', syncErr);
      }
    }

    // Si se completa o cancela, liberar al repartidor
    if (estado === 'COMPLETADO' || estado === 'CANCELADO') {
      const otrasActivas = await (prisma as any).deliveryAssignment.count({
        where: {
          resourceId: existing.resourceId,
          estado: { in: ['ASIGNADO', 'ACEPTADO', 'EN_RUTA', 'LLEGO'] },
          id: { not: id },
        },
      });

      if (otrasActivas === 0) {
        await (prisma as any).operableResource.update({
          where: { id: existing.resourceId },
          data: { estado: 'DISPONIBLE', updatedAt: new Date() },
        });
      }
    }

    // Emitir evento de dominio
    const eventName = DOMAIN_EVENTS[estado];
    if (eventName) {
      console.log(`[LOGISTICS_EVENT] ${eventName}`, {
        assignmentId: id,
        resourceId: existing.resourceId,
        estado,
        negocioId,
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[LOGISTICS/ASSIGNMENTS/[id] PUT]', error);
    return NextResponse.json({ error: 'Error actualizando asignación' }, { status: 500 });
  }
}

// ─── DELETE: Cancelar asignación ─────────────────────────────────────────────
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const negocioId = (session.user as any).negocioId;
    const { id } = await params;

    const existing = await (prisma as any).deliveryAssignment.findFirst({
      where: { id, negocioId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Asignación no encontrada' }, { status: 404 });
    }

    await (prisma as any).deliveryAssignment.update({
      where: { id },
      data: { estado: 'CANCELADO' },
    });

    // Liberar repartidor si no tiene otras asignaciones
    const otrasActivas = await (prisma as any).deliveryAssignment.count({
      where: {
        resourceId: existing.resourceId,
        estado: { in: ['ASIGNADO', 'ACEPTADO', 'EN_RUTA', 'LLEGO'] },
        id: { not: id },
      },
    });

    if (otrasActivas === 0) {
      await (prisma as any).operableResource.update({
        where: { id: existing.resourceId },
        data: { estado: 'DISPONIBLE', updatedAt: new Date() },
      });
    }

    console.log('[LOGISTICS_EVENT] DriverCancelled', { assignmentId: id });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[LOGISTICS/ASSIGNMENTS/[id] DELETE]', error);
    return NextResponse.json({ error: 'Error cancelando asignación' }, { status: 500 });
  }
}
