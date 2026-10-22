import { NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import { decide, HttpError } from '@/lib/logistics/driverNetwork';

export const dynamic = 'force-dynamic';

// POST { resourceId, action: 'APPROVE' | 'REJECT', motivoRechazo? }
export async function POST(req: Request) {
  const session = await getEffectiveAdminSession();
  const negocioId = (session?.user as any)?.negocioId;
  if (!negocioId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  try {
    const { resourceId, action, motivoRechazo } = await req.json();
    if (!resourceId || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'resourceId y action son requeridos' }, { status: 400 });
    }
    const r = await decide(negocioId, resourceId, action === 'APPROVE' ? 'approve' : 'reject', motivoRechazo);
    return NextResponse.json({ ok: true, whatsapp: r.whatsappUrl ? { url: r.whatsappUrl } : null });
  } catch (error: any) {
    if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('[LOGISTICS/VERIFY POST]', error);
    return NextResponse.json({ error: 'Error procesando verificación' }, { status: 500 });
  }
}
