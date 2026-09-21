import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET público — áreas y equipamiento activos del gimnasio para la landing
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const negocio = await (prisma as any).negocio.findUnique({
      where: { slug },
      select: { id: true }
    });

    if (!negocio) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    const [areas, equipment] = await Promise.all([
      (prisma as any).gymArea.findMany({
        where: { businessId: negocio.id, active: true },
        include: {
          imageMedia: { select: { url: true } }
        },
        orderBy: { order: 'asc' }
      }),
      (prisma as any).gymEquipment.findMany({
        where: { businessId: negocio.id, active: true },
        include: {
          imageMedia: { select: { url: true } },
          area: { select: { id: true, name: true } }
        },
        orderBy: { order: 'asc' }
      })
    ]);

    // Normalizar URLs de imagen
    const normalizeImage = (item: any) => ({
      ...item,
      imageUrl: item.imageMedia?.url || item.imageUrl || null
    });

    return NextResponse.json({
      success: true,
      areas: areas.map(normalizeImage),
      equipment: equipment.map(normalizeImage)
    });
  } catch (err: any) {
    console.error('[slug/gym/know-the-gym GET]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
