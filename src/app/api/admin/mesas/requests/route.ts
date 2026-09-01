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

    const [orderRequests, waiterCalls] = await Promise.all([
      (prisma as any).tableOrderRequest.findMany({
        where: { negocioId },
        include: {
          table: {
            select: { id: true, nombre: true, numero: true, estado: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      }),
      (prisma as any).waiterCall.findMany({
        where: { negocioId },
        include: {
          table: {
            select: { id: true, nombre: true, numero: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 30
      })
    ]);

    return NextResponse.json({
      success: true,
      orderRequests,
      waiterCalls
    });
  } catch (error: any) {
    console.error('[ADMIN_MESAS_REQUESTS_GET_ERROR]', error);
    return NextResponse.json({ error: 'Error al consultar solicitudes' }, { status: 500 });
  }
}
