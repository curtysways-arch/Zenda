// src/app/api/[slug]/kitchen/[id]/route.ts
// Actualizar el estado de un pedido desde el KDS (Kitchen Display System)
// Estados del Order Runtime: PENDIENTE_PAGO → PAGO_CONFIRMADO → EN_PREPARACION → LISTO → ENTREGADO

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const STATE_TRANSITIONS: Record<string, string> = {
  'PENDIENTE_PAGO': 'PAGO_CONFIRMADO',
  'PAGO_CONFIRMADO': 'EN_PREPARACION',
  'EN_PREPARACION': 'LISTO',
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

  return NextResponse.json({ success: true, order: updated, previousState: order.estado, newState: nuevoEstado });
}
