import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const negocioId = searchParams.get('negocioId') || 'sneaker-wash-id';

    // 1. Promociones formales de la tabla Promotion (Marketing / E-Commerce)
    const promotions = await prisma.promotion.findMany({
      where: { 
        businessId: negocioId,
        estado: { in: ['ACTIVA', 'activa'] }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 2. Cupones de descuento tradicionales de la tabla Coupon
    const coupons = await prisma.coupon.findMany({
      where: { negocioId, activa: true },
      orderBy: { createdAt: 'desc' }
    });

    // Unificar para el landing de lavado
    const formattedPromos = promotions.map((p: any) => {
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

      return {
        id: p.id,
        codigo: meta.cuponCodigo || p.id,
        titulo: p.titulo,
        descripcion: cleanDesc,
        precioPromo: p.precioPromo,
        precioAnterior: p.precioAnterior,
        imagenUrl: p.imagenUrl,
        tipo: p.tipoPromo || meta.tipoPromo || 'COMBO',
        valor: p.precioPromo,
        badge: p.tipoPromo === 'COMBO' ? 'COMBO 2x1' : 'OFERTA',
        meta: meta,
        incluye: meta.items || meta.incluye
      };
    });

    return NextResponse.json([...formattedPromos, ...coupons]);
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
