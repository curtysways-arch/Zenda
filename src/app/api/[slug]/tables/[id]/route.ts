// src/app/api/[slug]/tables/[id]/route.ts
// Actualización y eliminación de una mesa específica

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await params;
  const body = await req.json();
  const { estado, name, capacity } = body;

  const negocio = await prisma.negocio.findUnique({ where: { slug } });
  if (!negocio) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });

  const table = await (prisma as any).operableResource.findFirst({
    where: { id, negocioId: negocio.id, category: 'TABLE' }
  });
  if (!table) return NextResponse.json({ error: 'Mesa no encontrada' }, { status: 404 });

  const updateData: any = { updatedAt: new Date() };
  if (estado) updateData.estado = estado;
  if (name) updateData.name = name;
  if (capacity) updateData.capacity = parseInt(capacity);

  const updated = await (prisma as any).operableResource.update({
    where: { id },
    data: updateData
  });

  return NextResponse.json({ success: true, table: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await params;
  const negocio = await prisma.negocio.findUnique({ where: { slug } });
  if (!negocio) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });

  await (prisma as any).operableResource.deleteMany({
    where: { id, negocioId: negocio.id, category: 'TABLE' }
  });

  return NextResponse.json({ success: true, deletedId: id });
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
