import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const negocioId = (session.user as any).negocioId;
  if (!negocioId) {
    return NextResponse.json({ error: 'No tienes un negocio asociado' }, { status: 400 });
  }

  try {
    const heroItems = await (prisma as any).heroItem.findMany({
      where: { businessId: negocioId },
      orderBy: [
        { position: 'asc' },
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    });
    return NextResponse.json(heroItems);
  } catch (error: any) {
    console.error('[API_HERO_GET_ERROR]', error);
    return NextResponse.json({ error: 'Error al obtener elementos Hero' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const negocioId = (session.user as any).negocioId;
  if (!negocioId) {
    return NextResponse.json({ error: 'No tienes un negocio asociado' }, { status: 400 });
  }

  try {
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

    // Validación de botón: Si buttonEnabled === true, exigir buttonText y actionType
    if (buttonEnabled) {
      if (!buttonText || buttonText.trim() === '') {
        return NextResponse.json({ error: 'El texto del botón es obligatorio cuando el botón está activado' }, { status: 400 });
      }
      if (!actionType || actionType === 'NONE') {
        return NextResponse.json({ error: 'Debes seleccionar una acción válida para el botón' }, { status: 400 });
      }
    }

    const count = await (prisma as any).heroItem.count({ where: { businessId: negocioId } });

    const newHero = await (prisma as any).heroItem.create({
      data: {
        businessId: negocioId,
        type: type || 'IMAGE',
        sourceType: sourceType || 'CUSTOM',
        sourceId: sourceId || null,
        image: image || null,
        mobileImage: mobileImage || null,
        title: title || null,
        description: description || null,
        buttonEnabled: !!buttonEnabled,
        buttonText: buttonEnabled ? buttonText : null,
        actionType: buttonEnabled ? (actionType || 'NONE') : 'NONE',
        actionValue: buttonEnabled ? (actionValue || null) : null,
        isActive: isActive !== undefined ? !!isActive : true,
        position: position !== undefined ? Number(position) : count,
        priority: priority !== undefined ? Number(priority) : 1,
        startAt: startAt ? new Date(startAt) : null,
        endAt: endAt ? new Date(endAt) : null
      }
    });

    return NextResponse.json(newHero);
  } catch (error: any) {
    console.error('[API_HERO_POST_ERROR]', error);
    return NextResponse.json({ error: 'Error al crear elemento Hero' }, { status: 500 });
  }
}
