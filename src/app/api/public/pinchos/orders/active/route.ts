import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { PinchoFriendlyCodeService } from '@/modules/pinchos/services/pinchoFriendlyCodeService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug') || 'pinchos';
    const phone = searchParams.get('phone');

    if (!phone) {
        return NextResponse.json({ activeOrder: null });
    }

    try {
        const negocio = await prisma.negocio.findUnique({ where: { slug } });
        if (!negocio) {
            return NextResponse.json({ activeOrder: null });
        }

        const cleanPhone = phone.replace(/\D/g, '');
        const activeOrder = await (prisma as any).pedido.findFirst({
            where: {
                negocioId: negocio.id,
                telefonoCliente: {
                    contains: cleanPhone.slice(-7)
                },
                estado: {
                    in: ['PENDIENTE_PAGO', 'PAGO_INICIADO', 'PAGO_EN_REVISION', 'COMPROBANTE_ENVIADO', 'EN_PREPARACION', 'LISTO', 'EN_RUTA']
                }
            },
            include: {
                items: true,
                payment: {
                    include: {
                        evidences: { orderBy: { createdAt: 'desc' } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        if (activeOrder) {
            const friendlyCode = PinchoFriendlyCodeService.formatFriendlyCode(activeOrder.numeroPedido, 'PIN');
            return NextResponse.json({
                success: true,
                activeOrder: {
                    ...activeOrder,
                    friendlyCode
                }
            });
        }

        return NextResponse.json({ success: true, activeOrder: null });
    } catch (e: any) {
        console.error('[API_PINCHOS_ORDERS_ACTIVE]', e);
        return NextResponse.json({ activeOrder: null });
    }
}
