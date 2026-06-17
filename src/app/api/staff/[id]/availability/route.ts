import { NextResponse } from 'next/server';
import { staffSchedulingService } from '@/lib/services/staffSchedulingService';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(req.url);
        const date = searchParams.get('date');
        const duration = parseInt(searchParams.get('duration') || '60');
        const staffId = id;

        if (!date || !staffId) {
            return NextResponse.json({ error: 'Faltan parámetros obligatorios (date, staffId)' }, { status: 400 });
        }

        const slots = await staffSchedulingService.getAvailableSlots(staffId, date, duration);

        return NextResponse.json({ slots });
    } catch (error: any) {
        console.error('Error fetching availability:', error);
        return NextResponse.json({ error: 'Error interno del servidor', details: error.message }, { status: 500 });
    }
}
