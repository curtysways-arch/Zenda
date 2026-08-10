import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { PromotionEngineService } from '@/core/services/PromotionEngineService';

export const dynamic = 'force-dynamic';

function extractMetadata(p: any, productsMap: Map<string, any>) {
  let meta: any = {};
  let cleanDesc = p.descripcion || '';

  if (cleanDesc.includes('<!-- CITIOX_META:')) {
    try {
      const parts = cleanDesc.split('<!-- CITIOX_META:');
      cleanDesc = parts[0].trim();
      const jsonStr = parts[1].split('-->')[0].trim();
      meta = JSON.parse(jsonStr);
    } catch (_) {}
  }

  const productoRequeridoId = meta.productoRequeridoId || (p.PromotionToService && p.PromotionToService[0]?.B) || null;
  const linkedProduct = productoRequeridoId ? productsMap.get(productoRequeridoId) : null;
  const finalImagenUrl = p.imagenUrl && p.imagenUrl.trim() !== '' 
    ? p.imagenUrl 
    : (linkedProduct?.imagenUrl || '');

  return {
    ...p,
    descripcion: cleanDesc,
    imagenUrl: finalImagenUrl,
    productoRequeridoId,
    categoriaRequeridaId: meta.categoriaRequeridaId || null,
    productosRelacionados: meta.productosRelacionados || [],
    cuponCodigo: meta.cuponCodigo || null,
    canales: meta.canales || ['POS', 'MESEROS', 'DELIVERY', 'PICKUP', 'LANDING'],
    montoMinimo: meta.montoMinimo || 0,
    tipoCliente: meta.tipoCliente || 'ANY'
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const negocio = await prisma.negocio.findUnique({
      where: { slug },
      select: { id: true }
    });

    if (!negocio) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    const [activePromotions, products] = await Promise.all([
      (prisma as any).promotion.findMany({
        where: {
          businessId: negocio.id,
          estado: { in: ['ACTIVA', 'activa'] },
          fechaFin: { gte: new Date() }
        },
        include: { PromotionToService: true },
        orderBy: { createdAt: 'desc' }
      }),
      (prisma as any).producto.findMany({
        where: { negocioId: negocio.id }
      })
    ]);

    const productsMap = new Map<string, any>();
    products.forEach((p: any) => productsMap.set(p.id, p));

    const enrichedPromos = activePromotions.map((p: any) => extractMetadata(p, productsMap));

    return NextResponse.json({
      success: true,
      promotions: enrichedPromos
    });
  } catch (error: any) {
    console.error('[API_PUBLIC_PROMOTIONS_GET_ERROR]', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const negocio = await prisma.negocio.findUnique({
      where: { slug },
      select: { id: true }
    });

    if (!negocio) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const { cartItems = [], channel = 'LANDING', subtotal = 0, couponCode, customerType = 'ANY' } = body;

    const activePromotions = await (prisma as any).promotion.findMany({
      where: {
        businessId: negocio.id,
        estado: { in: ['ACTIVA', 'activa'] },
        fechaFin: { gte: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    const evaluation = PromotionEngineService.evaluate({
      cartItems,
      channel,
      subtotal: parseFloat(subtotal) || 0,
      couponCode,
      customerType,
      now: new Date(),
      promotions: activePromotions
    });

    return NextResponse.json({
      success: true,
      ...evaluation
    });
  } catch (error: any) {
    console.error('[API_PUBLIC_PROMOTIONS_EVALUATE_ERROR]', error);
    return NextResponse.json({ error: error.message || 'Error al evaluar promociones' }, { status: 500 });
  }
}
