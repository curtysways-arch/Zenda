// src/app/api/[slug]/admin-orders/route.ts
// API admin para gestión de pedidos (Kanban) conectada al Enterprise Runtime (FASE 5E)

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { RestaurantOrderFlowAdapter } from '@/core/adapters/RestaurantOrderFlowAdapter';

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

  // Mapeo de estados legacy a nombres unificados
  const stats = {
    totalVentas: orders
      .filter((o: any) => !['CANCELADO', 'PENDIENTE_PAGO'].includes(o.estado))
      .reduce((sum: number, o: any) => sum + (o.total || 0), 0),
    pedidosActivos: orders.filter((o: any) => 
      !['ENTREGADO', 'CANCELADO'].includes(o.estado)
    ).length,
    totalOrders: orders.length
  };

  return NextResponse.json({ 
    success: true, 
    orders,
    stats
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = await req.json();
  const { id, estado } = body;

  const negocio = await prisma.negocio.findUnique({ where: { slug } });
  if (!negocio) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });

  const currentOrder = await (prisma as any).pedido.findFirst({
    where: { id, negocioId: negocio.id }
  });

  if (!currentOrder) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
  }

  // Mapeo de alias de estados
  let targetState = estado;
  if (estado === 'PAGO_CONFIRMADO') targetState = 'CONFIRMED';
  if (estado === 'EN_PREPARACION') targetState = 'PREPARING';
  if (estado === 'LISTO') targetState = 'READY';
  if (estado === 'ENTREGADO') targetState = 'DELIVERED';

  // Procesar mediante RestaurantOrderFlowAdapter (Pasa por OrderRuntime + FulfillmentEngine + NotificationRuntime)
  const adapterResult = await RestaurantOrderFlowAdapter.processOrderStatusChange(
    negocio,
    currentOrder,
    targetState
  );

  // Actualizar también la base de datos local para backward compatibility
  const updated = await (prisma as any).pedido.update({
    where: { id },
    data: { estado: targetState, updatedAt: new Date() }
  });

  return NextResponse.json({
    success: true,
    pedido: updated,
    isEnterprise: adapterResult.isEnterprise,
    runtimeResult: adapterResult.runtimeResult,
  });
}
