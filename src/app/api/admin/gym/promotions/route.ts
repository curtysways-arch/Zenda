import { NextRequest, NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET — Lista promociones del gimnasio
export async function GET(req: NextRequest) {
  try {
    const session = await getEffectiveAdminSession();
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const negocioId = (session.user as any).negocioId;

    const promotions = await (prisma as any).promotion.findMany({
      where: { businessId: negocioId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, promotions });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — Crear nueva promoción de membresía
export async function POST(req: NextRequest) {
  try {
    const session = await getEffectiveAdminSession();
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const negocioId = (session.user as any).negocioId;

    const body = await req.json();
    const { titulo, descripcion, imagenUrl, estado, precioPromo, precioAnterior, fechaInicio, fechaFin, tipoPromo } = body;

    if (!titulo?.trim()) return NextResponse.json({ error: 'El título es obligatorio' }, { status: 400 });

    const promo = await (prisma as any).promotion.create({
      data: {
        id: crypto.randomUUID(),
        businessId: negocioId,
        titulo: titulo.trim(),
        descripcion: descripcion || '',
        imagenUrl: imagenUrl || null,
        estado: estado || 'publicado',
        precioPromo: precioPromo ? Number(precioPromo) : null,
        precioAnterior: precioAnterior ? Number(precioAnterior) : null,
        fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
        fechaFin: fechaFin ? new Date(fechaFin) : null,
        tipoPromo: tipoPromo || 'DESCUENTO_MEMBRESIA',
        updatedAt: new Date()
      }
    });

    return NextResponse.json({ success: true, promotion: promo }, { status: 201 });
  } catch (err: any) {
    console.error('[gym/promotions POST]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
