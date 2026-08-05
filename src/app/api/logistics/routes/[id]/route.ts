import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// ─── PUT: Actualizar ruta (estado, paradas, nombre) ──────────────────────────
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const negocioId = (session.user as any).negocioId;
    const { id } = await params;
    const body = await req.json();

    const existing = await (prisma as any).deliveryRoute.findFirst({
      where: { id, negocioId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Ruta no encontrada' }, { status: 404 });
    }

    const { nombre, fecha, estado, notas, stops } = body;

    const updated = await (prisma as any).deliveryRoute.update({
      where: { id },
      data: {
        ...(nombre !== undefined ? { nombre } : {}),
        ...(fecha !== undefined ? { fecha: new Date(fecha) } : {}),
        ...(estado !== undefined ? { estado } : {}),
        ...(notas !== undefined ? { notas } : {}),
        updatedAt: new Date(),
      },
      include: {
        stops: { orderBy: { orden: 'asc' } },
        assignments: {
          include: { resource: { select: { id: true, name: true, avatar: true } } },
        },
      },
    });

    // Reordenar paradas si se envían
    if (stops && Array.isArray(stops)) {
      await Promise.all(
        stops.map((stop: any, idx: number) =>
          (prisma as any).deliveryRouteStop.update({
            where: { id: stop.id },
            data: { orden: idx + 1, ...(stop.estado ? { estado: stop.estado } : {}) },
          })
        )
      );
    }

    if (estado === 'COMPLETADA') {
      console.log('[LOGISTICS_EVENT] RouteCompleted', { routeId: id, negocioId });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[LOGISTICS/ROUTES/[id] PUT]', error);
    return NextResponse.json({ error: 'Error actualizando ruta' }, { status: 500 });
  }
}

// ─── DELETE: Cancelar ruta ────────────────────────────────────────────────────
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const negocioId = (session.user as any).negocioId;
    const { id } = await params;

    const existing = await (prisma as any).deliveryRoute.findFirst({
      where: { id, negocioId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Ruta no encontrada' }, { status: 404 });
    }

    await (prisma as any).deliveryRoute.update({
      where: { id },
      data: { estado: 'CANCELADA', updatedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[LOGISTICS/ROUTES/[id] DELETE]', error);
    return NextResponse.json({ error: 'Error cancelando ruta' }, { status: 500 });
  }
}
