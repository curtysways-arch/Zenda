import { NextRequest, NextResponse } from 'next/server';
import { PinchoExpirationService } from '@/modules/pinchos/services/pinchoExpirationService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const storeId = searchParams.get('storeId') || undefined;

        const result = await PinchoExpirationService.processExpiredOrders(storeId);
        return NextResponse.json({
            success: true,
            ...result
        });
    } catch (e: any) {
        console.error('[CRON_PINCHOS_EXPIRE_ORDERS]', e);
        return NextResponse.json({ error: e.message || 'Error en cron de expiración' }, { status: 500 });
    }
}
