import { NextRequest, NextResponse } from 'next/server';
import { PinchoAnalyticsService } from '@/modules/pinchos/services/pinchoAnalyticsService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { storeId, sessionId, stepName, stepIndex, timeSpentMs, metadata } = body;

        if (!storeId || !sessionId || !stepName) {
            return NextResponse.json({ error: 'storeId, sessionId y stepName son obligatorios' }, { status: 400 });
        }

        const event = await PinchoAnalyticsService.trackStep({
            storeId,
            sessionId,
            stepName,
            stepIndex: stepIndex || 0,
            timeSpentMs,
            metadata
        });

        return NextResponse.json({ success: true, event });
    } catch (e: any) {
        console.error('[API_PINCHOS_ANALYTICS_POST]', e);
        return NextResponse.json({ error: e.message || 'Error al registrar evento' }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const storeId = searchParams.get('storeId');

        if (!storeId) {
            return NextResponse.json({ error: 'storeId requerido' }, { status: 400 });
        }

        const metrics = await PinchoAnalyticsService.getFunnelMetrics(storeId);
        return NextResponse.json({ success: true, metrics });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Error al obtener métricas' }, { status: 500 });
    }
}
