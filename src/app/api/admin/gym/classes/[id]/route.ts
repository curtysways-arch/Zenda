import { NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import prisma from '@/lib/prisma';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getEffectiveAdminSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const negocioId = (session.user as any).negocioId;
  if (!negocioId) {
    return NextResponse.json({ error: 'No tienes un negocio asociado' }, { status: 400 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const existing = await (prisma as any).gymClass.findFirst({
      where: { id, businessId: negocioId }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Clase no encontrada' }, { status: 404 });
    }

    const updated = await (prisma as any).gymClass.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.coach !== undefined && { coach: body.coach.trim() }),
        ...(body.category !== undefined && { category: body.category.trim() }),
        ...(body.room !== undefined && { room: body.room.trim() }),
        ...(body.daysOfWeek !== undefined && { daysOfWeek: body.daysOfWeek.trim() }),
        ...(body.startTime !== undefined && { startTime: body.startTime.trim() }),
        ...(body.durationMinutes !== undefined && { durationMinutes: Number(body.durationMinutes) }),
        ...(body.capacity !== undefined && { capacity: Number(body.capacity) }),
        ...(body.color !== undefined && { color: body.color }),
        ...(body.description !== undefined && { description: body.description?.trim() || null }),
        ...(body.active !== undefined && { active: Boolean(body.active) })
      }
    });

    return NextResponse.json({
      success: true,
      gymClass: updated
    });
  } catch (error: any) {
    console.error('[API_ADMIN_GYM_CLASS_PUT]', error);
    return NextResponse.json({ error: error.message || 'Error al actualizar clase' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getEffectiveAdminSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const negocioId = (session.user as any).negocioId;
  if (!negocioId) {
    return NextResponse.json({ error: 'No tienes un negocio asociado' }, { status: 400 });
  }

  const { id } = await params;

  try {
    const existing = await (prisma as any).gymClass.findFirst({
      where: { id, businessId: negocioId }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Clase no encontrada' }, { status: 404 });
    }

    await (prisma as any).gymClass.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Clase eliminada correctamente'
    });
  } catch (error: any) {
    console.error('[API_ADMIN_GYM_CLASS_DELETE]', error);
    return NextResponse.json({ error: error.message || 'Error al eliminar clase' }, { status: 500 });
  }
}
