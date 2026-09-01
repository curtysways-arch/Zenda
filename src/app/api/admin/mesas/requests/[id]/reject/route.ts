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
    const motivo = body.motivo || 'Solicitud de mesa rechazada por el administrador.';

    const orderReq = await (prisma as any).tableOrderRequest.findFirst({
      where: { id, negocioId }
    });

    if (!orderReq) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 });
    }

    const updated = await (prisma as any).tableOrderRequest.update({
      where: { id },
      data: {
        estado: 'REJECTED',
        notas: orderReq.notas ? `${orderReq.notas} [Rechazado: ${motivo}]` : `Rechazado: ${motivo}`
      }
    });

    return NextResponse.json({ success: true, message: 'Solicitud rechazada', request: updated });
  } catch (error: any) {
    console.error('[ADMIN_MESAS_REQUEST_REJECT_ERROR]', error);
    return NextResponse.json({ error: 'Error al rechazar solicitud' }, { status: 500 });
  }
}
