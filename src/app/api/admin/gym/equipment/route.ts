import { NextRequest, NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET — Lista equipamiento del gimnasio
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

    const equipment = await (prisma as any).gymEquipment.findMany({
      where: { businessId: negocioId },
      include: {
        imageMedia: { select: { id: true, url: true } },
        area: { select: { id: true, name: true } }
      },
      orderBy: { order: 'asc' }
    });

    return NextResponse.json({ success: true, equipment });
  } catch (err: any) {
    console.error('[gym/equipment GET]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — Crear nuevo equipo
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
    const { name, description, imageUrl, imageMediaId, areaId, order, active } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
    }

    const item = await (prisma as any).gymEquipment.create({
      data: {
        id: crypto.randomUUID(),
        businessId: negocioId,
        name: name.trim(),
        description: description?.trim() || null,
        imageUrl: imageUrl || null,
        imageMediaId: imageMediaId || null,
        areaId: areaId || null,
        order: order ?? 0,
        active: active !== undefined ? active : true,
        updatedAt: new Date()
      },
      include: {
        imageMedia: { select: { id: true, url: true } },
        area: { select: { id: true, name: true } }
      }
    });

    return NextResponse.json({ success: true, equipment: item }, { status: 201 });
  } catch (err: any) {
    console.error('[gym/equipment POST]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
