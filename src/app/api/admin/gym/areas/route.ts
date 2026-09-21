import { NextRequest, NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET — Lista áreas del gimnasio
export async function GET(req: NextRequest) {
  try {
    const session = await getEffectiveAdminSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const negocioId = (session.user as any).negocioId;
    if (!negocioId) {
      return NextResponse.json({ error: 'Sin negocio asociado' }, { status: 403 });
    }

    const areas = await (prisma as any).gymArea.findMany({
      where: { businessId: negocioId },
      include: {
        imageMedia: { select: { id: true, url: true } },
        equipment: {
          where: { active: true },
          select: { id: true, name: true, active: true }
        }
      },
      orderBy: { order: 'asc' }
    });

    return NextResponse.json({ success: true, areas });
  } catch (err: any) {
    console.error('[gym/areas GET]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — Crear nueva área
export async function POST(req: NextRequest) {
  try {
    const session = await getEffectiveAdminSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const negocioId = (session.user as any).negocioId;
    if (!negocioId) {
      return NextResponse.json({ error: 'Sin negocio asociado' }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, imageUrl, imageMediaId, order, active } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
    }

    const area = await (prisma as any).gymArea.create({
      data: {
        id: crypto.randomUUID(),
        businessId: negocioId,
        name: name.trim(),
        description: description?.trim() || null,
        imageUrl: imageUrl || null,
        imageMediaId: imageMediaId || null,
        order: order ?? 0,
        active: active !== undefined ? active : true,
        updatedAt: new Date()
      },
      include: {
        imageMedia: { select: { id: true, url: true } }
      }
    });

    return NextResponse.json({ success: true, area }, { status: 201 });
  } catch (err: any) {
    console.error('[gym/areas POST]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
