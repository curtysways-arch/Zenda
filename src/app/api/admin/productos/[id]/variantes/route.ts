import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

function parseNumeric(val: any, fallback: number | null = null): number | null {
  if (val === undefined || val === null || val === '') return fallback;
  const str = String(val).replace(',', '.').trim();
  const num = parseFloat(str);
  return isNaN(num) ? fallback : num;
}

function parseSafePrice(val: any): number | null {
  if (val === undefined || val === null || val === '') return null;
  const num = parseFloat(String(val).replace(',', '.').trim());
  if (isNaN(num) || num <= 0) return null;
  return num;
}

async function checkBusinessSkuUniqueness(
  negocioId: string,
  skuToCheck: string | null | undefined,
  excludeProductId?: string,
  excludeVariantId?: string
): Promise<string | null> {
  if (!skuToCheck || !skuToCheck.trim()) return null;
  const cleanSku = skuToCheck.trim();

  // Validar en Producto del mismo negocio
  const existingProduct = await (prisma as any).producto.findFirst({
    where: {
      negocioId,
      sku: cleanSku,
      ...(excludeProductId ? { id: { not: excludeProductId } } : {})
    }
  });

  if (existingProduct) {
    return `El SKU "${cleanSku}" ya está siendo utilizado por el producto "${existingProduct.nombre}" en este negocio.`;
  }

  // Validar en ProductoVariante del mismo negocio
  const existingVariant = await (prisma as any).productoVariante.findFirst({
    where: {
      producto: { negocioId },
      sku: cleanSku,
      ...(excludeVariantId ? { id: { not: excludeVariantId } } : {})
    },
    include: { producto: { select: { nombre: true } } }
  });

  if (existingVariant) {
    return `El SKU "${cleanSku}" ya está asignado a la variante "${existingVariant.nombre}" en este negocio.`;
  }

  return null;
}

/**
 * GET: Obtener todas las variantes de un producto
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const negocioId = (session.user as any).negocioId;
  const { id: productoId } = await params;

  try {
    const producto = await (prisma as any).producto.findUnique({
      where: { id: productoId },
      select: { id: true, negocioId: true }
    });

    if (!producto || producto.negocioId !== negocioId) {
      return NextResponse.json({ error: 'No autorizado o producto no encontrado' }, { status: 403 });
    }

    const variantes = await (prisma as any).productoVariante.findMany({
      where: { productoId },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json(variantes);
  } catch (e) {
    console.error('[API_VARIANTS_GET]', e);
    return NextResponse.json({ error: 'Error interno al consultar variantes' }, { status: 500 });
  }
}

/**
 * POST: Crear una nueva variante para el producto
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const negocioId = (session.user as any).negocioId;
  const { id: productoId } = await params;

  try {
    const body = await req.json();
    const { nombre, sku, atributos, precio, precioAnterior, stock, imagenUrl, activo } = body;

    if (!nombre || !nombre.trim()) {
      return NextResponse.json({ error: 'El nombre de la variante es obligatorio' }, { status: 400 });
    }

    const producto = await (prisma as any).producto.findUnique({
      where: { id: productoId },
      select: { id: true, negocioId: true }
    });

    if (!producto || producto.negocioId !== negocioId) {
      return NextResponse.json({ error: 'No autorizado o producto no encontrado' }, { status: 403 });
    }

    // Validación Tenant-Aware de SKU duplicado en el mismo negocio (Producto y Variante)
    const skuError = await checkBusinessSkuUniqueness(negocioId, sku);
    if (skuError) {
      return NextResponse.json({ error: skuError }, { status: 400 });
    }

    const nuevaVariante = await prisma.$transaction(async (tx) => {
      const v = await (tx as any).productoVariante.create({
        data: {
          productoId,
          nombre: nombre.trim(),
          sku: sku ? sku.trim() : null,
          atributos: atributos || null,
          precio: parseSafePrice(precio),
          precioAnterior: parseSafePrice(precioAnterior),
          stock: stock !== undefined && stock !== null ? Math.max(0, parseInt(String(stock))) : 0,
          imagenUrl: imagenUrl || null,
          activo: activo !== undefined ? Boolean(activo) : true,
        }
      });

      await (tx as any).producto.update({
        where: { id: productoId },
        data: { tieneVariantes: true }
      });

      return v;
    });

    return NextResponse.json(nuevaVariante, { status: 201 });
  } catch (e) {
    console.error('[API_VARIANTS_POST]', e);
    return NextResponse.json({ error: 'Error interno al crear variante' }, { status: 500 });
  }
}

/**
 * PUT: Actualizar una variante existente
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const negocioId = (session.user as any).negocioId;
  const { id: productoId } = await params;

  try {
    const body = await req.json();
    const { variantId, nombre, sku, atributos, precio, precioAnterior, stock, imagenUrl, activo } = body;

    if (!variantId) {
      return NextResponse.json({ error: 'ID de variante requerido' }, { status: 400 });
    }

    const varianteExistente = await (prisma as any).productoVariante.findUnique({
      where: { id: variantId },
      include: { producto: { select: { negocioId: true } } }
    });

    if (!varianteExistente || varianteExistente.producto.negocioId !== negocioId || varianteExistente.productoId !== productoId) {
      return NextResponse.json({ error: 'No autorizado o variante no encontrada' }, { status: 403 });
    }

    // Validación Tenant-Aware de SKU duplicado al actualizar
    const skuError = await checkBusinessSkuUniqueness(negocioId, sku, undefined, variantId);
    if (skuError) {
      return NextResponse.json({ error: skuError }, { status: 400 });
    }

    const varianteActualizada = await (prisma as any).productoVariante.update({
      where: { id: variantId },
      data: {
        nombre: nombre !== undefined ? nombre.trim() : varianteExistente.nombre,
        sku: sku !== undefined ? (sku ? sku.trim() : null) : varianteExistente.sku,
        atributos: atributos !== undefined ? atributos : varianteExistente.atributos,
        precio: precio !== undefined ? parseNumeric(precio, null) : varianteExistente.precio,
        precioAnterior: precioAnterior !== undefined ? parseNumeric(precioAnterior, null) : varianteExistente.precioAnterior,
        stock: stock !== undefined ? parseInt(String(stock)) : varianteExistente.stock,
        imagenUrl: imagenUrl !== undefined ? (imagenUrl || null) : varianteExistente.imagenUrl,
        activo: activo !== undefined ? Boolean(activo) : varianteExistente.activo,
      }
    });

    return NextResponse.json(varianteActualizada);
  } catch (e) {
    console.error('[API_VARIANTS_PUT]', e);
    return NextResponse.json({ error: 'Error interno al actualizar variante' }, { status: 500 });
  }
}

/**
 * DELETE: Eliminar una variante
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const negocioId = (session.user as any).negocioId;
  const { id: productoId } = await params;

  try {
    const { searchParams } = new URL(req.url);
    const variantId = searchParams.get('variantId') || searchParams.get('id');

    if (!variantId) {
      return NextResponse.json({ error: 'ID de variante requerido' }, { status: 400 });
    }

    const varianteExistente = await (prisma as any).productoVariante.findUnique({
      where: { id: variantId },
      include: { producto: { select: { negocioId: true } } }
    });

    if (!varianteExistente || varianteExistente.producto.negocioId !== negocioId || varianteExistente.productoId !== productoId) {
      return NextResponse.json({ error: 'No autorizado o variante no encontrada' }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      await (tx as any).productoVariante.delete({
        where: { id: variantId }
      });

      const remainingCount = await (tx as any).productoVariante.count({
        where: { productoId }
      });

      if (remainingCount === 0) {
        await (tx as any).producto.update({
          where: { id: productoId },
          data: { tieneVariantes: false }
        });
      }
    });

    return NextResponse.json({ success: true, message: 'Variante eliminada correctamente' });
  } catch (e) {
    console.error('[API_VARIANTS_DELETE]', e);
    return NextResponse.json({ error: 'Error interno al eliminar variante' }, { status: 500 });
  }
}
