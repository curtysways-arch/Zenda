import { NextRequest, NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// PUT — Actualizar promoción
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getEffectiveAdminSession();
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const negocioId = (session.user as any).negocioId;
    const { id } = await params;

    const existing = await (prisma as any).promotion.findFirst({
      where: { id, businessId: negocioId }
    });
    if (!existing) return NextResponse.json({ error: 'Promoción no encontrada' }, { status: 404 });

    const body = await req.json();

    const promo = await (prisma as any).promotion.update({
      where: { id },
      data: {
        ...(body.titulo !== undefined && { titulo: body.titulo }),
        ...(body.descripcion !== undefined && { descripcion: body.descripcion }),
        ...(body.imagenUrl !== undefined && { imagenUrl: body.imagenUrl }),
        ...(body.estado !== undefined && { estado: body.estado }),
        ...(body.precioPromo !== undefined && { precioPromo: body.precioPromo ? Number(body.precioPromo) : null }),
        ...(body.precioAnterior !== undefined && { precioAnterior: body.precioAnterior ? Number(body.precioAnterior) : null }),
        ...(body.fechaInicio !== undefined && { fechaInicio: body.fechaInicio ? new Date(body.fechaInicio) : null }),
        ...(body.fechaFin !== undefined && { fechaFin: body.fechaFin ? new Date(body.fechaFin) : null }),
        ...(body.tipoPromo !== undefined && { tipoPromo: body.tipoPromo }),
        updatedAt: new Date()
      }
    });

    return NextResponse.json({ success: true, promotion: promo });
  } catch (err: any) {
    console.error('[gym/promotions/[id] PUT]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — Eliminar promoción
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getEffectiveAdminSession();
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const negocioId = (session.user as any).negocioId;
    const { id } = await params;

    const existing = await (prisma as any).promotion.findFirst({
      where: { id, businessId: negocioId }
    });
    if (!existing) return NextResponse.json({ error: 'Promoción no encontrada' }, { status: 404 });

    await (prisma as any).promotion.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[gym/promotions/[id] DELETE]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
