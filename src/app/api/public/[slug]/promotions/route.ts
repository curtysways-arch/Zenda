import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { PromotionEngineService } from '@/core/services/PromotionEngineService';

export const dynamic = 'force-dynamic';

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

    const activePromotions = await (prisma as any).promotion.findMany({
      where: {
        businessId: negocio.id,
        estado: { in: ['ACTIVA', 'activa'] },
        fechaFin: { gte: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      promotions: activePromotions
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
