import { NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import { CashSessionService } from '@/core/cash/CashSessionService';

export async function GET(req: Request) {
  try {
    const session = await getEffectiveAdminSession();
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const negocioId = (session.user as any).negocioId;
    if (!negocioId) return NextResponse.json({ error: 'Negocio no especificado' }, { status: 400 });

    const userEmail = session.user.email || 'cajero';
    const activeSession = await CashSessionService.getActiveSession(negocioId, undefined, undefined);

    let summary = null;
    if (activeSession) {
      summary = await CashSessionService.calculateSessionSummary(activeSession.id, negocioId);
    }

    return NextResponse.json({
      success: true,
      hasActiveSession: Boolean(activeSession),
      session: activeSession,
      summary
    });
  } catch (e: any) {
    console.error('[API_CASH_SESSION_GET]', e);
    return NextResponse.json({ error: e?.message || 'Error al consultar sesión de caja' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getEffectiveAdminSession();
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const negocioId = (session.user as any).negocioId;
    const userEmail = session.user.email || session.user.name || 'Cajero';

    const body = await req.json();
    const { openingAmount, notes, cashRegisterId } = body;

    const newSession = await CashSessionService.openSession({
      businessId: negocioId,
      cashRegisterId,
      openedBy: userEmail,
      openingAmount: Number(openingAmount) || 0,
      notes
    });

    return NextResponse.json({
      success: true,
      message: 'Caja abierta exitosamente',
      session: newSession
    });
  } catch (e: any) {
    console.error('[API_CASH_SESSION_POST]', e);
    return NextResponse.json({ error: e?.message || 'Error al abrir caja' }, { status: 400 });
  }
}
