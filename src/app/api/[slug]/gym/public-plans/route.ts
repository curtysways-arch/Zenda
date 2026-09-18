import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const negocio = await prisma.negocio.findUnique({
      where: { slug },
      select: { id: true, nombre: true, colorPrimario: true }
    });

    if (!negocio) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    const plans = await (prisma as any).membershipPlan.findMany({
      where: {
        businessId: negocio.id,
        active: true
      },
      orderBy: [
        { displayOrder: 'asc' },
        { price: 'asc' }
      ]
    });

    return NextResponse.json({ success: true, plans });
  } catch (error: any) {
    console.error('[API_GYM_PUBLIC_PLANS_GET]', error);
    return NextResponse.json({ error: error.message || 'Error al cargar planes' }, { status: 500 });
  }
}
