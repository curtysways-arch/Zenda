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
    const existing = await (prisma as any).heroItem.findUnique({ where: { id } });
    if (!existing || existing.businessId !== negocioId) {
      return NextResponse.json({ error: 'Elemento Hero no encontrado' }, { status: 404 });
    }

    const body = await req.json();
    const {
      type,
      sourceType,
      sourceId,
      image,
      mobileImage,
      title,
      description,
      buttonEnabled,
      buttonText,
      actionType,
      actionValue,
      isActive,
      position,
      priority,
      startAt,
      endAt
    } = body;

    const isButtonActive = buttonEnabled !== undefined ? !!buttonEnabled : existing.buttonEnabled;
    const finalButtonText = isButtonActive ? (buttonText !== undefined ? buttonText : existing.buttonText) : null;
    const finalActionType = isButtonActive ? (actionType !== undefined ? actionType : existing.actionType) : 'NONE';
    const finalActionValue = isButtonActive ? (actionValue !== undefined ? actionValue : existing.actionValue) : null;

    if (isButtonActive) {
      if (!finalButtonText || finalButtonText.trim() === '') {
        return NextResponse.json({ error: 'El texto del botón es obligatorio cuando el botón está activado' }, { status: 400 });
      }
      if (!finalActionType || finalActionType === 'NONE') {
        return NextResponse.json({ error: 'Debes seleccionar una acción válida para el botón' }, { status: 400 });
      }
    }

    const updated = await (prisma as any).heroItem.update({
      where: { id },
      data: {
        ...(type !== undefined ? { type } : {}),
        ...(sourceType !== undefined ? { sourceType } : {}),
        ...(sourceId !== undefined ? { sourceId } : {}),
        ...(image !== undefined ? { image } : {}),
        ...(mobileImage !== undefined ? { mobileImage } : {}),
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
        buttonEnabled: isButtonActive,
        buttonText: finalButtonText,
        actionType: finalActionType,
        actionValue: finalActionValue,
        ...(isActive !== undefined ? { isActive: !!isActive } : {}),
        ...(position !== undefined ? { position: Number(position) } : {}),
        ...(priority !== undefined ? { priority: Number(priority) } : {}),
        startAt: startAt !== undefined ? (startAt ? new Date(startAt) : null) : existing.startAt,
        endAt: endAt !== undefined ? (endAt ? new Date(endAt) : null) : existing.endAt
      }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('[API_HERO_PATCH_ERROR]', error);
    return NextResponse.json({ error: 'Error al actualizar elemento Hero' }, { status: 500 });
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
    const existing = await (prisma as any).heroItem.findUnique({ where: { id } });
    if (!existing || existing.businessId !== negocioId) {
      return NextResponse.json({ error: 'Elemento Hero no encontrado' }, { status: 404 });
    }

    await (prisma as any).heroItem.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Elemento Hero eliminado correctamente' });
  } catch (error: any) {
    console.error('[API_HERO_DELETE_ERROR]', error);
    return NextResponse.json({ error: 'Error al eliminar elemento Hero' }, { status: 500 });
  }
}
