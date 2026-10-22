import { NextRequest, NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import { audienceSummary, type Segment } from '@/lib/communications/campaigns';

export const dynamic = 'force-dynamic';

const SEGMENTS: Segment[] = ['ALL', 'VIP', 'INACTIVE', 'NEW_CLIENTS', 'BIRTHDAY', 'USER'];

/** GET ?segmento=ALL&ids=a,b → cuántos clientes recibirán el mensaje por cada canal */
export async function GET(req: NextRequest) {
    const session = await getEffectiveAdminSession();
    const negocioId = (session?.user as any)?.negocioId;
    if (!negocioId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const raw = searchParams.get('segmento') || 'ALL';
    const segmento = (SEGMENTS.includes(raw as Segment) ? raw : 'ALL') as Segment;
    const ids = (searchParams.get('ids') || '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 500);

    try {
        return NextResponse.json(await audienceSummary(negocioId, segmento, ids));
    } catch (err) {
        console.error('[comunicacion audiencia]', err);
        return NextResponse.json({ error: 'No se pudo calcular la audiencia' }, { status: 500 });
    }
}
