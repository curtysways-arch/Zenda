// src/app/api/[slug]/kitchen/[id]/route.ts
// Actualizar el estado de un pedido desde el KDS (Kitchen Display System)
// Estados del Order Runtime: PENDIENTE_PAGO → PAGO_CONFIRMADO → EN_PREPARACION → LISTO → ENTREGADO

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const STATE_TRANSITIONS: Record<string, string> = {
  'PENDIENTE': 'EN_PREPARACION',
  'RECIBIDO': 'EN_PREPARACION',
  'PRODUCTOS_CONFIRMADOS': 'EN_PREPARACION',
  'CAMBIOS_ACEPTADOS': 'EN_PREPARACION',
  'ACEPTADO': 'EN_PREPARACION',
  'PENDIENTE_PAGO': 'PAGO_CONFIRMADO',
  'PAGO_CONFIRMADO': 'EN_PREPARACION',
  'EN_PREPARACION': 'LISTO',
  'REPARTIDOR_ASIGNADO': 'LISTO',
  'PREPARANDO': 'LISTO',
  'PREPARACION': 'LISTO',
  'LISTO': 'ENTREGADO'
};

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await params;
  const body = await req.json();
  const { estado, advance } = body;

  const negocio = await prisma.negocio.findUnique({ where: { slug } });
  if (!negocio) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });

  const order = await (prisma as any).pedido.findFirst({
    where: { id, negocioId: negocio.id }
  });
  if (!order) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });

  let nuevoEstado = estado;
  if (advance && !estado) {
    nuevoEstado = STATE_TRANSITIONS[order.estado] || order.estado;
  }

  if (!nuevoEstado) {
    return NextResponse.json({ error: 'Se debe proveer estado o advance=true' }, { status: 400 });
  }

  const updated = await (prisma as any).pedido.update({
    where: { id },
    data: { estado: nuevoEstado, updatedAt: new Date() },
    include: { items: true }
  });

  // FASE 5C: Notificar transiciones a través del RestaurantOrderFlowAdapter
  try {
    const { RestaurantOrderFlowAdapter } = await import('@/core/adapters/RestaurantOrderFlowAdapter');
    await RestaurantOrderFlowAdapter.processOrderStatusChange(
      negocio,
      {
        id: updated.id,
        negocioId: updated.negocioId,
        numeroPedido: updated.numeroPedido,
        estado: updated.estado,
        tipoEntrega: updated.tipoEntrega,
        nombreCliente: updated.nombreCliente,
        telefonoCliente: updated.telefonoCliente,
        subtotal: updated.subtotal,
        costoEnvio: updated.costoEnvio,
        total: updated.total,
        extraInfo: updated.extraInfo,
        items: updated.items || []
      },
      nuevoEstado
    );
  } catch (err) {
    console.error('[KITCHEN_ORDER_FLOW_ERROR]', err);
  }

  return NextResponse.json({ success: true, order: updated, previousState: order.estado, newState: nuevoEstado });
}
