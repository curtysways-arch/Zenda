// src/app/api/[slug]/tables/route.ts
// API genérica para gestión de Mesas (OperableResource category=TABLE) por slug de negocio
// Reutilizable para cualquier negocio con capability: tables

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
  if (!caps.tables) {
    return NextResponse.json({ error: 'CAPABILITY_NOT_ENABLED', message: 'tables capability no está activa.' }, { status: 403 });
  }

  const tables = await (prisma as any).operableResource.findMany({
    where: { negocioId: negocio.id, category: 'TABLE', active: true },
    orderBy: { createdAt: 'asc' }
  });

  return NextResponse.json({ success: true, tables, negocioId: negocio.id });
}
