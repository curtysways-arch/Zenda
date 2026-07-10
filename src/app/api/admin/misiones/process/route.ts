import { NextResponse } from 'next/server';
import { processGrowthEventLog } from '@/lib/growth/questEngine';

/**
 * Worker asíncrono en background que procesa un log de evento del Growth Engine.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { logId } = body;

        if (!logId) {
            return NextResponse.json({ error: 'Falta el parámetro logId' }, { status: 400 });
        }

        // Ejecutar procesamiento del log de evento en el QuestEngine de forma asíncrona
        // No bloqueamos la respuesta HTTP del worker
        processGrowthEventLog(logId).catch(err => {
            console.error('[Worker-Misiones] Error en segundo plano procesando el log:', err.message);
        });

        return NextResponse.json({ success: true, message: 'Procesamiento encolado asíncronamente.' });

    } catch (err: any) {
        console.error('[Worker-Misiones] Error en endpoint:', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
