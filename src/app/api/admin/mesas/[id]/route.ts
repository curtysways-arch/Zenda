import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function getAuthNegocioId() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const user = session.user as any;
  return user.negocioId || user.businessId || null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const negocioId = await getAuthNegocioId();
    if (!negocioId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Validar pertenencia multi-tenant
    const mesaExistente = await (prisma as any).restaurantTable.findFirst({
      where: { id, negocioId }
    });

    if (!mesaExistente) {
      return NextResponse.json({ error: 'Mesa no encontrada' }, { status: 404 });
    }

    const updateData: any = {};
    if (body.nombre !== undefined) updateData.nombre = String(body.nombre).trim();
    if (body.numero !== undefined) updateData.numero = body.numero ? parseInt(body.numero, 10) : null;
    if (body.capacidad !== undefined) updateData.capacidad = body.capacidad ? parseInt(body.capacidad, 10) : null;
    if (body.activa !== undefined) updateData.activa = Boolean(body.activa);
    if (body.permitePedidos !== undefined) updateData.permitePedidos = Boolean(body.permitePedidos);
    if (body.estado !== undefined) updateData.estado = String(body.estado);

    const mesaActualizada = await (prisma as any).restaurantTable.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ success: true, mesa: mesaActualizada });
  } catch (error: any) {
    console.error('[ADMIN_MESAS_PATCH_ERROR]', error);
    return NextResponse.json({ error: 'Error al actualizar la mesa' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const negocioId = await getAuthNegocioId();
    if (!negocioId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const mesaExistente = await (prisma as any).restaurantTable.findFirst({
      where: { id, negocioId }
    });

    if (!mesaExistente) {
      return NextResponse.json({ error: 'Mesa no encontrada' }, { status: 404 });
    }

    await (prisma as any).restaurantTable.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Mesa eliminada' });
  } catch (error: any) {
    console.error('[ADMIN_MESAS_DELETE_ERROR]', error);
    return NextResponse.json({ error: 'Error al eliminar la mesa' }, { status: 500 });
  }
}
