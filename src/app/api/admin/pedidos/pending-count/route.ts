import { NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import prisma from '@/lib/prisma';

/** Órdenes de lavandería que esperan una acción del local (confirmar, revisar, iniciar, enviar, entregar). */
const LAUNDRY_ACTION_STATES = [
    'SOLICITADA', 'PENDIENTE_RETIRO', 'RECIBIDO', 'RETIRADO', 'INSPECCIONADO', 'ACEPTADO', 'PRODUCTOS_CONFIRMADOS',
    'CAMBIOS_ACEPTADOS', 'LISTO', 'LISTO_PARA_ENTREGA', 'REPARTIDOR_EN_LOCAL',
];

const isServiceOrder = (extraInfo: any) => {
    const ex = typeof extraInfo === 'string' ? (() => { try { return JSON.parse(extraInfo); } catch { return {}; } })() : (extraInfo || {});
    return Boolean(ex.modoIngreso);
};

export async function GET(req: Request) {
    const session = await getEffectiveAdminSession();
    if (!session?.user) {
        return NextResponse.json({ count: 0 });
    }
    const negocioId = (session.user as any).negocioId;
    if (!negocioId) {
        return NextResponse.json({ count: 0 });
    }

    try {
        const tipo = new URL(req.url).searchParams.get('tipo');
        if (tipo === 'lavanderia') {
            const count = await (prisma as any).pedido.count({ where: { negocioId, estado: { in: LAUNDRY_ACTION_STATES } } });
            return NextResponse.json({ count });
        }

        // Pedidos de tienda / restaurante (las órdenes de lavado tienen su propia bandeja)
        const pedidos = await (prisma as any).pedido.findMany({
            where: {
                negocioId,
                estado: { in: ['PENDIENTE', 'PENDING', 'WAITING_CONFIRMATION', 'POR_CONFIRMAR', 'PAGO_EN_REVISION', 'PENDIENTE_PAGO', 'COMPROBANTE_ENVIADO', 'RECIBIDO', 'PREPARACION', 'LISTO', 'RUTA'] }
            },
            select: { extraInfo: true },
        });
        return NextResponse.json({ count: pedidos.filter((p: any) => !isServiceOrder(p.extraInfo)).length });
    } catch (e) {
        console.error('[API_PEDIDOS_PENDING_COUNT]', e);
        return NextResponse.json({ count: 0 });
    }
}
