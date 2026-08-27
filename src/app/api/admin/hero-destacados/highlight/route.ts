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
    const highlights = await (prisma as any).highlightItem.findMany({
      where: { businessId: negocioId },
      orderBy: [
        { position: 'asc' },
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    });
    return NextResponse.json(highlights);
  } catch (error: any) {
    console.error('[API_HIGHLIGHT_GET_ERROR]', error);
    return NextResponse.json({ error: 'Error al obtener elementos Destacados' }, { status: 500 });
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
      title,
      description,
      priority,
      position,
      isActive,
      startAt,
      endAt
    } = body;

    const count = await (prisma as any).highlightItem.count({ where: { businessId: negocioId } });

    const newHighlight = await (prisma as any).highlightItem.create({
      data: {
        businessId: negocioId,
        type: type || 'IMAGE',
        sourceType: sourceType || 'CUSTOM',
        sourceId: sourceId || null,
        image: image || null,
        title: title || null,
        description: description || null,
        priority: priority !== undefined ? Number(priority) : 1,
        position: position !== undefined ? Number(position) : count,
        isActive: isActive !== undefined ? !!isActive : true,
        startAt: startAt ? new Date(startAt) : null,
        endAt: endAt ? new Date(endAt) : null
      }
    });

    return NextResponse.json(newHighlight);
  } catch (error: any) {
    console.error('[API_HIGHLIGHT_POST_ERROR]', error);
    return NextResponse.json({ error: 'Error al crear elemento Destacado' }, { status: 500 });
  }
}
