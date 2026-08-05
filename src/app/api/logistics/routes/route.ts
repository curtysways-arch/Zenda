import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// ─── GET: Lista rutas del negocio ─────────────────────────────────────────────
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const negocioId = (session.user as any).negocioId;
    const { searchParams } = new URL(req.url);
    const fecha = searchParams.get('fecha'); // YYYY-MM-DD
    const estado = searchParams.get('estado');

    const where: any = { negocioId };
    if (estado) where.estado = estado;
    if (fecha) {
      const start = new Date(fecha);
      const end = new Date(fecha);
      end.setDate(end.getDate() + 1);
      where.fecha = { gte: start, lt: end };
    }

    const routes = await (prisma as any).deliveryRoute.findMany({
      where,
      include: {
        assignments: {
          include: {
            resource: {
              select: { id: true, name: true, avatar: true, estado: true },
            },
          },
        },
        stops: {
          include: {
            resource: {
              select: { id: true, name: true, avatar: true },
            },
          },
          orderBy: { orden: 'asc' },
        },
      },
      orderBy: { fecha: 'desc' },
    });

    return NextResponse.json(routes);
  } catch (error) {
    console.error('[LOGISTICS/ROUTES GET]', error);
    return NextResponse.json({ error: 'Error obteniendo rutas' }, { status: 500 });
  }
}

// ─── POST: Crear nueva ruta de entrega ────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const negocioId = (session.user as any).negocioId;
    const body = await req.json();

    const { nombre, fecha, notas, stops } = body;

    if (!nombre || !fecha) {
      return NextResponse.json({ error: 'nombre y fecha son requeridos' }, { status: 400 });
    }

    const route = await (prisma as any).deliveryRoute.create({
      data: {
        negocioId,
        nombre,
        fecha: new Date(fecha),
        estado: 'PLANIFICADA',
        notas: notas || null,
        stops: stops && stops.length > 0
          ? {
              create: stops.map((stop: any, idx: number) => ({
                orden: idx + 1,
                tipo: stop.tipo || 'ENTREGA',
                estado: 'PENDIENTE',
                clienteNombre: stop.clienteNombre || null,
                clienteTelefono: stop.clienteTelefono || null,
                clienteDireccion: stop.clienteDireccion || null,
                latitud: stop.latitud || null,
                longitud: stop.longitud || null,
                horaEstimada: stop.horaEstimada || null,
                notas: stop.notas || null,
                resourceId: stop.resourceId || null,
              })),
            }
          : undefined,
      },
      include: {
        stops: {
          orderBy: { orden: 'asc' },
        },
      },
    });

    console.log('[LOGISTICS_EVENT] RouteCreated', { routeId: route.id, negocioId });

    return NextResponse.json(route, { status: 201 });
  } catch (error) {
    console.error('[LOGISTICS/ROUTES POST]', error);
    return NextResponse.json({ error: 'Error creando ruta' }, { status: 500 });
  }
}
