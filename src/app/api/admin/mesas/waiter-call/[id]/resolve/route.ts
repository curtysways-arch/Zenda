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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const negocioId = await getAuthNegocioId();
    if (!negocioId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const newStatus = body.status || 'RESOLVED'; // 'ACKNOWLEDGED' | 'RESOLVED'

    const waiterCall = await (prisma as any).waiterCall.findFirst({
      where: { id, negocioId }
    });

    if (!waiterCall) {
      return NextResponse.json({ error: 'Llamada de mesero no encontrada' }, { status: 404 });
    }

    const updated = await (prisma as any).waiterCall.update({
      where: { id },
      data: { estado: newStatus }
    });

    return NextResponse.json({ success: true, waiterCall: updated });
  } catch (error: any) {
    console.error('[ADMIN_WAITER_CALL_RESOLVE_ERROR]', error);
    return NextResponse.json({ error: 'Error al actualizar llamada de mesero' }, { status: 500 });
  }
}
