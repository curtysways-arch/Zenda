import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

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
    const { kind, items } = await req.json(); // kind: 'HERO' | 'HIGHLIGHT', items: [{ id: string, position: number }]

    if (!kind || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
    }

    const modelName = kind === 'HERO' ? 'heroItem' : 'highlightItem';

    // Procesar cada ítem garantizando que pertenece al negocio del usuario
    await (prisma as any).$transaction(
      items.map((item: { id: string; position: number }) =>
        (prisma as any)[modelName].updateMany({
          where: {
            id: item.id,
            businessId: negocioId
          },
          data: {
            position: Number(item.position)
          }
        })
      )
    );

    return NextResponse.json({ success: true, message: 'Orden actualizado correctamente' });
  } catch (error: any) {
    console.error('[API_REORDER_ERROR]', error);
    return NextResponse.json({ error: 'Error al reordenar elementos' }, { status: 500 });
  }
}
