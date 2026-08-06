// src/app/api/[slug]/tables/route.ts
// API genérica para gestión de Mesas (OperableResource category=TABLE) por slug de negocio

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

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

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = await req.json();
  const { name, capacity, number } = body;

  if (!name) return NextResponse.json({ error: 'Nombre de mesa es requerido' }, { status: 400 });

  const negocio = await prisma.negocio.findUnique({ where: { slug } });
  if (!negocio) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });

  const tableNum = number || name.replace(/\D/g, '') || '1';
  const table = await (prisma as any).operableResource.create({
    data: {
      id: crypto.randomUUID(),
      negocioId: negocio.id,
      name,
      resourceType: 'INFRASTRUCTURE',
      category: 'TABLE',
      capacity: parseInt(capacity || 4),
      estado: 'DISPONIBLE',
      metadata: { code: `MESA${tableNum}`, number: parseInt(tableNum) || 1 }
    }
  });

  return NextResponse.json({ success: true, table });
}
