import { NextRequest, NextResponse } from 'next/server';
import { processDueCampaigns } from '@/lib/communications/campaigns';

export const dynamic = 'force-dynamic';

/**
 * Envía las campañas programadas que ya llegaron a su hora.
 * El servidor ya lo revisa cada minuto (src/instrumentation.ts); esta ruta
 * sirve como respaldo para un cron externo. Si CRON_SECRET está definido,
 * exige el encabezado "Authorization: Bearer <CRON_SECRET>".
 */
export async function GET(req: NextRequest) {
    const secret = process.env.CRON_SECRET;
    if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const revisadas = await processDueCampaigns();
    return NextResponse.json({ ok: true, revisadas });
}
