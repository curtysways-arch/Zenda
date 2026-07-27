import prisma from '@/lib/prisma';
import { PinchoOrderService } from './pinchoOrderService';

export class PinchoExpirationService {
    public static async processExpiredOrders(storeId?: string) {
        const now = new Date();
        const sixtyMinutesAgo = new Date(now.getTime() - (60 * 60 * 1000));
        const thirtyMinutesAgo = new Date(now.getTime() - (30 * 60 * 1000));
        const fiftyMinutesAgo = new Date(now.getTime() - (50 * 60 * 1000));

        const whereClause: any = {
            estado: 'PENDIENTE_PAGO',
            createdAt: { lte: sixtyMinutesAgo }
        };
        if (storeId) whereClause.negocioId = storeId;

        // Find orders > 60m pending
        const expiredOrders = await (prisma as any).pedido.findMany({
            where: whereClause
        });

        const results = [];
        for (const order of expiredOrders) {
            const updated = await (prisma as any).pedido.update({
                where: { id: order.id },
                data: { estado: 'PAGO_EXPIRADO' }
            });

            await (prisma as any).orderPayment.updateMany({
                where: { pedidoId: order.id },
                data: { estado: 'EXPIRADO' }
            });

            await (prisma as any).pinchoOrderTimeline.create({
                data: {
                    pedidoId: order.id,
                    estadoAnterior: 'PENDIENTE_PAGO',
                    estadoNuevo: 'PAGO_EXPIRADO',
                    comentario: 'Pedido expirado automáticamente por superar 60 minutos sin comprobante de pago.',
                    creadoPor: 'SISTEMA'
                }
            });

            results.push(updated);
        }

        return {
            expiredCount: results.length,
            expiredOrders: results
        };
    }

    public static async reactivateExpiredOrder(pedidoId: string) {
        const order = await (prisma as any).pedido.findUnique({
            where: { id: pedidoId },
            include: { items: true, payment: true }
        });

        if (!order) {
            throw new Error('Pedido no encontrado');
        }

        if (order.estado !== 'PAGO_EXPIRADO' && order.estado !== 'CANCELADO') {
            return order;
        }

        // Reactivate order
        const reactivatedOrder = await (prisma as any).pedido.update({
            where: { id: pedidoId },
            data: { 
                estado: 'PENDIENTE_PAGO',
                createdAt: new Date() // Reset timer for new 60m window
            }
        });

        if (order.payment) {
            await (prisma as any).orderPayment.update({
                where: { id: order.payment.id },
                data: { estado: 'PENDIENTE' }
            });
        }

        await (prisma as any).pinchoOrderTimeline.create({
            data: {
                pedidoId,
                estadoAnterior: 'PAGO_EXPIRADO',
                estadoNuevo: 'PENDIENTE_PAGO',
                comentario: 'Pedido reactivado exitosamente por el cliente. Productos y dirección conservados.',
                creadoPor: 'CLIENTE'
            }
        });

        return reactivatedOrder;
    }
}
