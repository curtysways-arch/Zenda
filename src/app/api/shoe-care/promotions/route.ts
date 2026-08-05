import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const negocioId = searchParams.get('negocioId') || 'sneaker-wash-id';

    const coupons = await prisma.coupon.findMany({
      where: { negocioId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(coupons);
  } catch (error) {
    console.error('Error fetching promotions/coupons:', error);
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { negocioId = 'sneaker-wash-id', titulo, codigo, porcentaje = 10, activa = true } = body;

    const promoCodigo = codigo || (titulo ? titulo.toUpperCase().replace(/\s+/g, '_') : `PROMO_${Date.now()}`);

    const coupon = await prisma.coupon.create({
      data: {
        id: `cpn_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        negocioId,
        codigo: promoCodigo,
        tipo: 'PORCENTAJE',
        valor: parseFloat(porcentaje.toString()) || 10,
        descripcion: titulo || 'Promoción de Descuento',
        activa: activa !== undefined ? activa : true,
        updatedAt: new Date()
      }
    });

    return NextResponse.json(coupon, { status: 201 });
  } catch (error) {
    console.error('Error creando promoción:', error);
    return NextResponse.json({ error: 'Error al crear promoción' }, { status: 500 });
  }
}
