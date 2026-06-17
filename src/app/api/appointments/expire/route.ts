import { NextResponse } from 'next/server';
import { autoExpirePendingAppointments } from '@/lib/cron';

export async function GET(req: Request) {
    try {
        const count = await autoExpirePendingAppointments();
        
        return NextResponse.json({
            success: true,
            message: `Limpieza de citas completada. Citas expiradas: ${count}`,
            expiredCount: count
        });
    } catch (error: any) {
        console.error('Error in appointments expire route:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Internal Server Error'
        }, { status: 500 });
    }
}
