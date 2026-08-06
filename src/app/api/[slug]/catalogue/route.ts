// src/app/api/[slug]/catalogue/route.ts
// API genérica del catálogo de productos y categorías para el panel admin (CRUD completo)

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
  if (!caps.catalog) {
    return NextResponse.json({ error: 'CAPABILITY_NOT_ENABLED', message: 'catalog capability no está activa.' }, { status: 403 });
  }

  const [categories, products] = await Promise.all([
    (prisma as any).categoriaProducto.findMany({
      where: { negocioId: negocio.id },
      orderBy: { orden: 'asc' }
    }),
    (prisma as any).producto.findMany({
      where: { negocioId: negocio.id },
      orderBy: { orden: 'asc' },
      include: { categoria: true }
    })
  ]);

  return NextResponse.json({ success: true, categories, products });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = await req.json();
  const { type, ...data } = body;

  const negocio = await prisma.negocio.findUnique({ where: { slug } });
  if (!negocio) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });

  if (type === 'category') {
    if (!data.nombre) return NextResponse.json({ error: 'Nombre de categoría requerido' }, { status: 400 });
    const cat = await (prisma as any).categoriaProducto.create({
      data: {
        id: crypto.randomUUID(),
        negocioId: negocio.id,
        nombre: data.nombre,
        orden: data.orden || 0,
        activo: true
      }
    });
    return NextResponse.json({ success: true, category: cat });
  }

  if (type === 'product') {
    if (!data.nombre || data.precio === undefined) {
      return NextResponse.json({ error: 'Nombre y precio son requeridos' }, { status: 400 });
    }
    const prod = await (prisma as any).producto.create({
      data: {
        id: crypto.randomUUID(),
        negocioId: negocio.id,
        nombre: data.nombre,
        descripcion: data.descripcion || null,
        precio: parseFloat(data.precio),
        imagenUrl: data.imagenUrl || null,
        activo: data.activo !== false,
        orden: data.orden || 0,
        categoriaId: data.categoriaId || null
      }
    });
    return NextResponse.json({ success: true, product: prod });
  }

  return NextResponse.json({ error: 'type inválido. Usa "category" o "product".' }, { status: 400 });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = await req.json();
  const { type, id, ...data } = body;

  if (!id) return NextResponse.json({ error: 'Se requiere id' }, { status: 400 });

  const negocio = await prisma.negocio.findUnique({ where: { slug } });
  if (!negocio) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });

  if (type === 'product') {
    const updateData: any = { ...data, updatedAt: new Date() };
    if (updateData.precio !== undefined) updateData.precio = parseFloat(updateData.precio);
    
    await (prisma as any).producto.updateMany({
      where: { id, negocioId: negocio.id },
      data: updateData
    });
    const updatedProd = await (prisma as any).producto.findUnique({ where: { id }, include: { categoria: true } });
    return NextResponse.json({ success: true, product: updatedProd });
  }

  if (type === 'category') {
    await (prisma as any).categoriaProducto.updateMany({
      where: { id, negocioId: negocio.id },
      data: { ...data, updatedAt: new Date() }
    });
    const updatedCat = await (prisma as any).categoriaProducto.findUnique({ where: { id } });
    return NextResponse.json({ success: true, category: updatedCat });
  }

  return NextResponse.json({ error: 'type inválido.' }, { status: 400 });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const id = searchParams.get('id');

  if (!type || !id) {
    return NextResponse.json({ error: 'Se requieren parámetros type e id' }, { status: 400 });
  }

  const negocio = await prisma.negocio.findUnique({ where: { slug } });
  if (!negocio) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });

  if (type === 'product') {
    await (prisma as any).producto.deleteMany({
      where: { id, negocioId: negocio.id }
    });
    return NextResponse.json({ success: true, deletedId: id });
  }

  if (type === 'category') {
    await (prisma as any).categoriaProducto.deleteMany({
      where: { id, negocioId: negocio.id }
    });
    return NextResponse.json({ success: true, deletedId: id });
  }

  return NextResponse.json({ error: 'type inválido' }, { status: 400 });
}
