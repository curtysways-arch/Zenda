// src/app/api/[slug]/tables/[id]/route.ts
// Actualización del estado de una mesa específica (DISPONIBLE | OCUPADA | RESERVADA)

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await params;
  const body = await req.json();
  const { estado } = body;

  const VALID_STATES = ['DISPONIBLE', 'OCUPADA', 'RESERVADA'];
  if (!VALID_STATES.includes(estado)) {
    return NextResponse.json({ error: `Estado inválido: ${estado}. Opciones: ${VALID_STATES.join(', ')}` }, { status: 400 });
  }

  const negocio = await prisma.negocio.findUnique({ where: { slug } });
  if (!negocio) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });

  const table = await (prisma as any).operableResource.findFirst({
    where: { id, negocioId: negocio.id, category: 'TABLE' }
  });
  if (!table) return NextResponse.json({ error: 'Mesa no encontrada' }, { status: 404 });

  const updated = await (prisma as any).operableResource.update({
    where: { id },
    data: { estado, updatedAt: new Date() }
  });

  return NextResponse.json({ success: true, table: updated });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await params;
  const negocio = await prisma.negocio.findUnique({ where: { slug } });
  if (!negocio) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });

  const table = await (prisma as any).operableResource.findFirst({
    where: { id, negocioId: negocio.id, category: 'TABLE' }
  });
  if (!table) return NextResponse.json({ error: 'Mesa no encontrada' }, { status: 404 });
  return NextResponse.json({ success: true, table });
}
