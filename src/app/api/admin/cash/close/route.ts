import { NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import { CashSessionService } from '@/core/cash/CashSessionService';

export async function POST(req: Request) {
  try {
    const session = await getEffectiveAdminSession();
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const negocioId = (session.user as any).negocioId;
    const closedBy = session.user.email || session.user.name || 'Cajero';

    const body = await req.json();
    const { sessionId, cashCounted, notes } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'ID de sesión requerido' }, { status: 400 });
    }

    const result = await CashSessionService.closeSession({
      sessionId,
      businessId: negocioId,
      closedBy,
      cashCounted: Number(cashCounted) || 0,
      notes
    });

    return NextResponse.json({
      success: true,
      message: 'Caja cerrada y arqueada exitosamente',
      result
    });
  } catch (e: any) {
    console.error('[API_CASH_CLOSE_POST]', e);
    return NextResponse.json({ error: e?.message || 'Error al cerrar caja' }, { status: 400 });
  }
}
