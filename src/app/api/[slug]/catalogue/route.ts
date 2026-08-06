// src/app/api/[slug]/catalogue/route.ts
// API genérica del catálogo de productos y categorías para el panel admin
// Reutilizable para cualquier negocio con capability: catalog

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
  if (!caps.catalog) {
    return NextResponse.json({ error: 'CAPABILITY_NOT_ENABLED', message: 'catalog capability no está activa.' }, { status: 403 });
  }

  const [categories, products] = await Promise.all([
    (prisma as any).categoriaProducto.findMany({
      where: { negocioId: negocio.id, activo: true },
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
    const cat = await (prisma as any).categoriaProducto.create({
      data: {
        negocioId: negocio.id,
        nombre: data.nombre,
        orden: data.orden || 0,
        activo: true,
        updatedAt: new Date()
      }
    });
    return NextResponse.json({ success: true, category: cat });
  }

  if (type === 'product') {
    const prod = await (prisma as any).producto.create({
      data: {
        negocioId: negocio.id,
        nombre: data.nombre,
        descripcion: data.descripcion || null,
        precio: data.precio || 0,
        imagenUrl: data.imagenUrl || null,
        activo: data.activo !== false,
        orden: data.orden || 0,
        categoriaId: data.categoriaId || null,
        updatedAt: new Date()
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

  const negocio = await prisma.negocio.findUnique({ where: { slug } });
  if (!negocio) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });

  if (type === 'product') {
    const prod = await (prisma as any).producto.updateMany({
      where: { id, negocioId: negocio.id },
      data: { ...data, updatedAt: new Date() }
    });
    return NextResponse.json({ success: true, updated: prod.count });
  }

  if (type === 'category') {
    const cat = await (prisma as any).categoriaProducto.updateMany({
      where: { id, negocioId: negocio.id },
      data: { ...data, updatedAt: new Date() }
    });
    return NextResponse.json({ success: true, updated: cat.count });
  }

  return NextResponse.json({ error: 'type inválido.' }, { status: 400 });
}
