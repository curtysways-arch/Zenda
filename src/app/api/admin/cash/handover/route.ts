import { NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import { CashSessionService } from '@/core/cash/CashSessionService';

export async function POST(req: Request) {
  try {
    const session = await getEffectiveAdminSession();
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const negocioId = (session.user as any).negocioId;
    const body = await req.json();
    const { currentSessionId, incomingCashier, cashCounted, newOpeningAmount, notes } = body;

    if (!currentSessionId || !incomingCashier || cashCounted === undefined) {
      return NextResponse.json({ error: 'Datos incompletos para el relevo de cajero' }, { status: 400 });
    }

    const outgoingCashier = session.user.email || session.user.name || 'Cajero Saliente';

    const handoverResult = await CashSessionService.shiftHandover({
      currentSessionId,
      businessId: negocioId,
      outgoingCashier,
      incomingCashier,
      cashCounted: Number(cashCounted),
      newOpeningAmount: newOpeningAmount !== undefined ? Number(newOpeningAmount) : Number(cashCounted),
      notes
    });

    return NextResponse.json({
      success: true,
      message: 'Relevo de turno y cambio de cajero completado exitosamente',
      handoverResult
    });
  } catch (e: any) {
    console.error('[API_CASH_HANDOVER_POST]', e);
    return NextResponse.json({ error: e?.message || 'Error en relevo de caja' }, { status: 400 });
  }
}
