// src/app/api/[slug]/kitchen/route.ts
// API genérica del Kitchen Display System (KDS) — pedidos activos para cocina
// Activada por capability: kitchen

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const negocio = await prisma.negocio.findUnique({ where: { slug } });
  if (!negocio) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });

  const cfg = (negocio.configuracion as any) || {};
  const caps = cfg.activeCapabilities || {};
  if (!caps.kitchen) {
    return NextResponse.json({ error: 'CAPABILITY_NOT_ENABLED', message: 'kitchen capability no está activa.' }, { status: 403 });
  }

  // FASE 5C: Resolver si Enterprise Runtime está activo para el negocio
  const { BusinessRuntimeResolver } = await import('@/core/runtime/BusinessRuntimeResolver');
  const runtimeInfo = await BusinessRuntimeResolver.resolve(negocio);

  // Pedidos exclusivamente en preparación para pantalla KDS de cocina
  const ACTIVE_KITCHEN_STATES = ['EN_PREPARACION', 'PREPARING', 'CONFIRMED', 'PREPARACION'];

  const orders = await (prisma as any).pedido.findMany({
    where: {
      negocioId: negocio.id,
      estado: { in: ACTIVE_KITCHEN_STATES }
    },
    include: { items: true },
    orderBy: { createdAt: 'asc' }
  });

  return NextResponse.json({
    success: true,
    orders,
    isEnterprise: runtimeInfo.isEnterprise,
    blueprint: runtimeInfo.blueprint
  });
}
