import { NextRequest, NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// PUT — Actualizar equipo
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getEffectiveAdminSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const negocioId = (session.user as any).negocioId;
    const { id } = await params;

    const existing = await (prisma as any).gymEquipment.findFirst({
      where: { id, businessId: negocioId }
    });
    if (!existing) {
      return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 });
    }

    const body = await req.json();
    const { name, description, imageUrl, imageMediaId, areaId, order, active } = body;

    const item = await (prisma as any).gymEquipment.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
        ...(imageMediaId !== undefined && { imageMediaId: imageMediaId || null }),
        ...(areaId !== undefined && { areaId: areaId || null }),
        ...(order !== undefined && { order }),
        ...(active !== undefined && { active }),
        updatedAt: new Date()
      },
      include: {
        imageMedia: { select: { id: true, url: true } },
        area: { select: { id: true, name: true } }
      }
    });

    return NextResponse.json({ success: true, equipment: item });
  } catch (err: any) {
    console.error('[gym/equipment/[id] PUT]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — Eliminar equipo
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getEffectiveAdminSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const negocioId = (session.user as any).negocioId;
    const { id } = await params;

    const existing = await (prisma as any).gymEquipment.findFirst({
      where: { id, businessId: negocioId }
    });
    if (!existing) {
      return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 });
    }

    await (prisma as any).gymEquipment.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[gym/equipment/[id] DELETE]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
