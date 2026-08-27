import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const negocioId = (session.user as any).negocioId;
  if (!negocioId) {
    return NextResponse.json({ error: 'No tienes un negocio asociado' }, { status: 400 });
  }

  const { id } = await params;

  try {
    const existing = await (prisma as any).highlightItem.findUnique({ where: { id } });
    if (!existing || existing.businessId !== negocioId) {
      return NextResponse.json({ error: 'Elemento Destacado no encontrado' }, { status: 404 });
    }

    const body = await req.json();
    const {
      type,
      sourceType,
      sourceId,
      image,
      title,
      description,
      priority,
      position,
      isActive,
      startAt,
      endAt
    } = body;

    const updated = await (prisma as any).highlightItem.update({
      where: { id },
      data: {
        ...(type !== undefined ? { type } : {}),
        ...(sourceType !== undefined ? { sourceType } : {}),
        ...(sourceId !== undefined ? { sourceId } : {}),
        ...(image !== undefined ? { image } : {}),
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(priority !== undefined ? { priority: Number(priority) } : {}),
        ...(position !== undefined ? { position: Number(position) } : {}),
        ...(isActive !== undefined ? { isActive: !!isActive } : {}),
        startAt: startAt !== undefined ? (startAt ? new Date(startAt) : null) : existing.startAt,
        endAt: endAt !== undefined ? (endAt ? new Date(endAt) : null) : existing.endAt
      }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('[API_HIGHLIGHT_PATCH_ERROR]', error);
    return NextResponse.json({ error: 'Error al actualizar elemento Destacado' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const negocioId = (session.user as any).negocioId;
  if (!negocioId) {
    return NextResponse.json({ error: 'No tienes un negocio asociado' }, { status: 400 });
  }

  const { id } = await params;

  try {
    const existing = await (prisma as any).highlightItem.findUnique({ where: { id } });
    if (!existing || existing.businessId !== negocioId) {
      return NextResponse.json({ error: 'Elemento Destacado no encontrado' }, { status: 404 });
    }

    await (prisma as any).highlightItem.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Elemento Destacado eliminado correctamente' });
  } catch (error: any) {
    console.error('[API_HIGHLIGHT_DELETE_ERROR]', error);
    return NextResponse.json({ error: 'Error al eliminar elemento Destacado' }, { status: 500 });
  }
}
