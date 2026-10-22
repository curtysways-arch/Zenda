import { NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import { CashSessionService } from '@/core/cash/CashSessionService';

export async function POST(req: Request) {
  try {
    const session = await getEffectiveAdminSession();
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const negocioId = (session.user as any).negocioId;
    const userName = session.user.name || session.user.email || 'Cajero';

    const body = await req.json();
    const { sessionId, type, amount, paymentMethod = 'EFECTIVO', concept, reference } = body;

    if (!sessionId || !type || !amount || !concept) {
      return NextResponse.json({ error: 'Datos incompletos para el movimiento de caja' }, { status: 400 });
    }

    const movement = await CashSessionService.recordMovement({
      sessionId,
      businessId: negocioId,
      type,
      amount: Number(amount),
      paymentMethod,
      concept,
      reference,
      userId: (session.user as any).id,
      userName
    });

    return NextResponse.json({
      success: true,
      message: 'Movimiento de caja registrado exitosamente',
      movement
    });
  } catch (e: any) {
    console.error('[API_CASH_MOVEMENT_POST]', e);
    return NextResponse.json({ error: e?.message || 'Error al registrar movimiento' }, { status: 400 });
  }
}
