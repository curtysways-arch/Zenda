import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const negocioId = (session.user as any).negocioId;
    if (!negocioId) {
        return NextResponse.json({ error: 'No tienes un negocio asociado' }, { status: 400 });
    }

    try {
        const pedidos = await (prisma as any).pedido.findMany({
            where: { negocioId },
            include: { items: true },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(pedidos);
    } catch (e) {
        console.error('[API_PEDIDOS_GET]', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const negocioId = (session.user as any).negocioId;

    try {
        const body = await req.json();
        const { id, estado } = body;

        if (!id || !estado) {
            return NextResponse.json({ error: 'El ID y el estado son obligatorios' }, { status: 400 });
        }

        // Validar propiedad del negocio
        const pedido = await (prisma as any).pedido.findUnique({
            where: { id },
            include: { negocio: true }
        });

        if (!pedido || pedido.negocioId !== negocioId) {
            return NextResponse.json({ error: 'No autorizado o pedido no encontrado' }, { status: 403 });
        }

        const pedidoActualizado = await (prisma as any).pedido.update({
            where: { id },
            data: { estado }
        });

        // Notificación de WhatsApp al cliente
        if (pedido.telefonoCliente) {
            try {
                const { whatsappService } = require('@/lib/whatsapp');
                let mensaje = '';
                
                switch (estado) {
                    case 'PREPARACION':
                        mensaje = `🍢 *Tu pedido #${pedido.numeroPedido} está en preparación* en *${pedido.negocio.nombre}*. ¡Muy pronto estará listo!`;
                        break;
                    case 'LISTO':
                        mensaje = pedido.tipoEntrega === 'DOMICILIO' 
                            ? `📦 *Tu pedido #${pedido.numeroPedido} está listo* y empacado. Pronto saldrá el repartidor.`
                            : `🏪 *Tu pedido #${pedido.numeroPedido} está listo para retirar* en el local de *${pedido.negocio.nombre}*. ¡Te esperamos!`;
                        break;
                    case 'RUTA':
                        mensaje = `🛵 *Tu pedido #${pedido.numeroPedido} está en ruta* a tu domicilio. ¡El repartidor llegará en breve!`;
                        break;
                    case 'ENTREGADO':
                        mensaje = `🎉 *Tu pedido #${pedido.numeroPedido} ha sido entregado*. ¡Gracias por tu compra en *${pedido.negocio.nombre}*! Que lo disfrutes.`;
                        break;
                    case 'CANCELADO':
                        mensaje = `❌ *Tu pedido #${pedido.numeroPedido} ha sido cancelado* por el establecimiento. Si tienes dudas, contáctanos.`;
                        break;
                }

                if (mensaje) {
                    await whatsappService.sendWhatsApp(pedido.telefonoCliente, mensaje).catch(() => {});
                }
            } catch (notifErr) {
                console.error('[ORDER_STATUS_NOTIF_ERROR]', notifErr);
            }
        }

        return NextResponse.json(pedidoActualizado);
    } catch (e) {
        console.error('[API_PEDIDOS_PUT]', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
