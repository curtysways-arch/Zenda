import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function getAuthNegocioId() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const user = session.user as any;
  return user.negocioId || user.businessId || null;
}

export async function GET() {
  try {
    const negocioId = await getAuthNegocioId();
    if (!negocioId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const mesas = await (prisma as any).restaurantTable.findMany({
      where: { negocioId },
      include: {
        _count: {
          select: {
            orderRequests: { where: { estado: 'PENDING_ADMIN_CONFIRMATION' } },
            waiterCalls: { where: { estado: { in: ['PENDING', 'ACKNOWLEDGED'] } } }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json({ success: true, mesas });
  } catch (error: any) {
    console.error('[ADMIN_MESAS_GET_ERROR]', error);
    return NextResponse.json({ error: 'Error al obtener mesas' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const negocioId = await getAuthNegocioId();
    if (!negocioId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { nombre, numero, permitePedidos, estado, capacidad } = body;

    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      return NextResponse.json({ error: 'El nombre de la mesa es obligatorio' }, { status: 400 });
    }

    const nuevaMesa = await (prisma as any).restaurantTable.create({
      data: {
        negocioId,
        nombre: nombre.trim(),
        numero: numero ? parseInt(numero, 10) : null,
        capacidad: capacidad ? parseInt(capacidad, 10) : 4,
        activa: true,
        permitePedidos: permitePedidos !== undefined ? Boolean(permitePedidos) : true,
        estado: estado || 'DISPONIBLE'
      }
    });

    return NextResponse.json({ success: true, mesa: nuevaMesa }, { status: 201 });
  } catch (error: any) {
    console.error('[ADMIN_MESAS_POST_ERROR]', error);
    return NextResponse.json({ error: 'Error al crear la mesa' }, { status: 500 });
  }
}
