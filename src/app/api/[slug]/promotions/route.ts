// src/app/api/[slug]/promotions/route.ts
// API genérica de Promociones y Banners Promocionales por negocio

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

  const promotions = await (prisma as any).promotion.findMany({
    where: { businessId: negocio.id },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json({ success: true, promotions });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = await req.json();
  const { titulo, descripcion, precioPromo, precioAnterior, imagenUrl, estado, fechaFin } = body;

  if (!titulo) return NextResponse.json({ error: 'El título es obligatorio' }, { status: 400 });

  const negocio = await prisma.negocio.findUnique({ where: { slug } });
  if (!negocio) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });

  const promo = await (prisma as any).promotion.create({
    data: {
      id: crypto.randomUUID(),
      businessId: negocio.id,
      titulo,
      descripcion: descripcion || '',
      precioPromo: parseFloat(precioPromo || 0),
      precioAnterior: precioAnterior ? parseFloat(precioAnterior) : null,
      imagenUrl: imagenUrl || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
      fechaInicio: new Date(),
      fechaFin: fechaFin ? new Date(fechaFin) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      estado: estado || 'publicada',
      updatedAt: new Date()
    }
  });

  return NextResponse.json({ success: true, promotion: promo });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = await req.json();
  const { id, ...data } = body;

  if (!id) return NextResponse.json({ error: 'Se requiere id' }, { status: 400 });

  const negocio = await prisma.negocio.findUnique({ where: { slug } });
  if (!negocio) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });

  const updateData: any = { ...data, updatedAt: new Date() };
  if (updateData.precioPromo !== undefined) updateData.precioPromo = parseFloat(updateData.precioPromo);
  if (updateData.precioAnterior !== undefined) updateData.precioAnterior = parseFloat(updateData.precioAnterior);
  if (updateData.fechaFin) updateData.fechaFin = new Date(updateData.fechaFin);

  await (prisma as any).promotion.updateMany({
    where: { id, businessId: negocio.id },
    data: updateData
  });

  return NextResponse.json({ success: true, updatedId: id });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'Se requiere id' }, { status: 400 });

  const negocio = await prisma.negocio.findUnique({ where: { slug } });
  if (!negocio) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });

  await (prisma as any).promotion.deleteMany({
    where: { id, businessId: negocio.id }
  });

  return NextResponse.json({ success: true, deletedId: id });
}
