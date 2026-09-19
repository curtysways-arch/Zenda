import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string; productId: string }> }
) {
  try {
    const { slug, productId } = await params;
    if (!slug || !productId) {
      return NextResponse.json({ error: 'Parámetros requeridos' }, { status: 400 });
    }

    const negocio = await prisma.negocio.findUnique({
      where: { slug },
      select: { id: true, nombre: true, slug: true, colorPrimario: true }
    });

    if (!negocio) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    const producto = await prisma.producto.findFirst({
      where: {
        id: productId,
        negocioId: negocio.id,
      },
      include: {
        categoria: true,
        variantes: {
          where: { activo: true },
          orderBy: { id: 'asc' }
        }
      }
    });

    if (!producto) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, product: producto, negocio });
  } catch (error: any) {
    console.error('Error fetching public product:', error);
    return NextResponse.json({ error: 'Error al obtener producto' }, { status: 500 });
  }
}
