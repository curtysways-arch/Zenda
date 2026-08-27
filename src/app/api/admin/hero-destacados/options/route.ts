import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const negocioId = (session.user as any).negocioId;
  if (!negocioId) {
    return NextResponse.json({ error: 'No tienes un negocio asociado' }, { status: 400 });
  }

  try {
    const [negocio, promotions, products, services, categories] = await Promise.all([
      prisma.negocio.findUnique({
        where: { id: negocioId },
        select: { id: true, nombre: true, tipoNegocio: true, slug: true }
      }),
      (prisma as any).promotion.findMany({
        where: { businessId: negocioId },
        select: { id: true, titulo: true, descripcion: true, precioPromo: true, imagenUrl: true, estado: true },
        orderBy: { createdAt: 'desc' }
      }),
      (prisma as any).producto.findMany({
        where: { negocioId },
        select: { id: true, nombre: true, descripcion: true, precio: true, imagenUrl: true, activo: true },
        orderBy: { orden: 'asc' }
      }),
      (prisma as any).service.findMany({
        where: { negocioId },
        select: { id: true, nombre: true, precio: true, estaActivo: true },
        orderBy: { createdAt: 'desc' }
      }),
      (prisma as any).categoriaProducto.findMany({
        where: { negocioId },
        select: { id: true, nombre: true, activo: true },
        orderBy: { orden: 'asc' }
      })
    ]);

    return NextResponse.json({
      negocio,
      promotions,
      products,
      services,
      categories
    });
  } catch (error: any) {
    console.error('[API_HERO_OPTIONS_ERROR]', error);
    return NextResponse.json({ error: 'Error al obtener opciones para el constructor' }, { status: 500 });
  }
}
