import { NextRequest, NextResponse } from 'next/server';
import { PinchoExpirationService } from '@/modules/pinchos/services/pinchoExpirationService';
import { PinchoFriendlyCodeService } from '@/modules/pinchos/services/pinchoFriendlyCodeService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { pedidoId } = body;

        if (!pedidoId) {
            return NextResponse.json({ error: 'pedidoId requerido' }, { status: 400 });
        }

        const reactivatedOrder = await PinchoExpirationService.reactivateExpiredOrder(pedidoId);
        const friendlyCode = PinchoFriendlyCodeService.formatFriendlyCode(reactivatedOrder.numeroPedido, 'PIN');

        return NextResponse.json({
            success: true,
            pedido: {
                ...reactivatedOrder,
                friendlyCode
            }
        });
    } catch (e: any) {
        console.error('[API_PINCHOS_ORDERS_REACTIVATE]', e);
        return NextResponse.json({ error: e.message || 'Error al reactivar el pedido' }, { status: 500 });
    }
}
