import { NextRequest, NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// PUT — Actualizar área
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getEffectiveAdminSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const negocioId = (session.user as any).negocioId;
    const { id } = params;

    // Verificar propiedad
    const existing = await (prisma as any).gymArea.findFirst({
      where: { id, businessId: negocioId }
    });
    if (!existing) {
      return NextResponse.json({ error: 'Área no encontrada' }, { status: 404 });
    }

    const body = await req.json();
    const { name, description, imageUrl, imageMediaId, order, active } = body;

    const area = await (prisma as any).gymArea.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
        ...(imageMediaId !== undefined && { imageMediaId: imageMediaId || null }),
        ...(order !== undefined && { order }),
        ...(active !== undefined && { active }),
        updatedAt: new Date()
      },
      include: {
        imageMedia: { select: { id: true, url: true } }
      }
    });

    return NextResponse.json({ success: true, area });
  } catch (err: any) {
    console.error('[gym/areas/[id] PUT]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — Eliminar área
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getEffectiveAdminSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const negocioId = (session.user as any).negocioId;
    const { id } = params;

    // Verificar propiedad
    const existing = await (prisma as any).gymArea.findFirst({
      where: { id, businessId: negocioId }
    });
    if (!existing) {
      return NextResponse.json({ error: 'Área no encontrada' }, { status: 404 });
    }

    // Desvincular equipos del área antes de eliminar
    await (prisma as any).gymEquipment.updateMany({
      where: { areaId: id, businessId: negocioId },
      data: { areaId: null }
    });

    await (prisma as any).gymArea.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[gym/areas/[id] DELETE]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
