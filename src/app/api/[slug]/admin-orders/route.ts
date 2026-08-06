// src/app/api/[slug]/admin-orders/route.ts
// API admin para gestión de pedidos (Kanban) con capability: orders
// Lectura de todos los pedidos del día + actualización de estado

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get('date');

  const negocio = await prisma.negocio.findUnique({ where: { slug } });
  if (!negocio) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });

  const startOfDay = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date(new Date().setHours(0, 0, 0, 0));
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const orders = await (prisma as any).pedido.findMany({
    where: {
      negocioId: negocio.id,
      createdAt: { gte: startOfDay, lt: endOfDay }
    },
    include: { items: true },
    orderBy: { createdAt: 'asc' }
  });

  // Stats del día
  const totalVentas = orders
    .filter((o: any) => !['CANCELADO', 'PENDIENTE_PAGO'].includes(o.estado))
    .reduce((sum: number, o: any) => sum + (o.total || 0), 0);

  const pedidosActivos = orders.filter((o: any) => 
    !['ENTREGADO', 'CANCELADO'].includes(o.estado)
  ).length;

  return NextResponse.json({ 
    success: true, 
    orders,
    stats: { totalVentas, pedidosActivos, totalOrders: orders.length }
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = await req.json();
  const { id, estado } = body;

  const VALID_STATES = ['PENDIENTE_PAGO', 'PAGO_CONFIRMADO', 'EN_PREPARACION', 'LISTO', 'ENTREGADO', 'CANCELADO'];
  if (!VALID_STATES.includes(estado)) {
    return NextResponse.json({ error: `Estado inválido: ${estado}` }, { status: 400 });
  }

  const negocio = await prisma.negocio.findUnique({ where: { slug } });
  if (!negocio) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });

  const updated = await (prisma as any).pedido.updateMany({
    where: { id, negocioId: negocio.id },
    data: { estado, updatedAt: new Date() }
  });

  return NextResponse.json({ success: true, updated: updated.count });
}
