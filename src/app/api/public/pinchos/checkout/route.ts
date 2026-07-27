import { NextRequest, NextResponse } from 'next/server';
import { PinchoCheckoutSessionService } from '@/modules/pinchos/services/pinchoCheckoutSessionService';
import { PinchoAnalyticsService } from '@/modules/pinchos/services/pinchoAnalyticsService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
        return NextResponse.json({ error: 'sessionId requerido' }, { status: 400 });
    }

    try {
        const session = await PinchoCheckoutSessionService.getSession(sessionId);
        return NextResponse.json({ success: true, session });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Error al obtener checkout session' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { storeId, sessionId, clientPhone, clientName, stepIndex, cartState, stepName } = body;

        if (!storeId || !sessionId) {
            return NextResponse.json({ error: 'storeId y sessionId son obligatorios' }, { status: 400 });
        }

        const session = await PinchoCheckoutSessionService.saveSession({
            storeId,
            sessionId,
            clientPhone,
            clientName,
            stepIndex: stepIndex || 1,
            cartState: cartState || { items: [] }
        });

        // Track funnel step
        if (stepName) {
            await PinchoAnalyticsService.trackStep({
                storeId,
                sessionId,
                stepName,
                stepIndex: stepIndex || 1
            });
        }

        return NextResponse.json({ success: true, session });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Error al guardar checkout session' }, { status: 500 });
    }
}
