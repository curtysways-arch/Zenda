import prisma from '@/lib/prisma';
import { PinchoOrderService } from './pinchoOrderService';

export type PinchoPaymentStatus = 
    | 'PENDIENTE'
    | 'PAGO_INICIADO'
    | 'COMPROBANTE_ENVIADO'
    | 'EN_REVISION'
    | 'CONFIRMADO'
    | 'RECHAZADO'
    | 'EXPIRADO'
    | 'REEMBOLSADO';

export class PinchoPaymentService {
    public static async markPaymentInitiated(pedidoId: string) {
        const orderPayment = await (prisma as any).orderPayment.findUnique({
            where: { pedidoId }
        });

        if (!orderPayment) return null;

        if (orderPayment.estado === 'PENDIENTE') {
            const prev = orderPayment.estado;
            const updated = await (prisma as any).orderPayment.update({
                where: { pedidoId },
                data: { estado: 'PAGO_INICIADO' }
            });

            await (prisma as any).paymentHistory.create({
                data: {
                    paymentId: orderPayment.id,
                    estadoAnterior: prev,
                    estadoNuevo: 'PAGO_INICIADO',
                    observacion: 'Cliente ingresó a la pantalla de pago',
                    responsableId: 'CLIENTE',
                    responsableNombre: 'Cliente'
                }
            });

            return updated;
        }

        return orderPayment;
    }

    public static async uploadEvidence(pedidoId: string, fileUrl: string, fileType: string, fileSize: number, mimeType: string) {
        const payment = await (prisma as any).orderPayment.findUnique({
            where: { pedidoId }
        });

        if (!payment) {
            throw new Error('Registro de pago no encontrado para este pedido');
        }

        const evidence = await (prisma as any).paymentEvidence.create({
            data: {
                paymentId: payment.id,
                fileUrl,
                fileType: fileType.toUpperCase().includes('PDF') ? 'PDF' : 'IMAGE',
                mimeType,
                fileSize,
                uploadedBy: 'CLIENT',
                status: 'ENVIADO'
            }
        });

        const prevStatus = payment.estado;
        const updatedPayment = await (prisma as any).orderPayment.update({
            where: { id: payment.id },
            data: { estado: 'COMPROBANTE_ENVIADO' }
        });

        await (prisma as any).pedido.update({
            where: { id: pedidoId },
            data: { estado: 'PAGO_EN_REVISION' }
        });

        await (prisma as any).paymentHistory.create({
            data: {
                paymentId: payment.id,
                estadoAnterior: prevStatus,
                estadoNuevo: 'COMPROBANTE_ENVIADO',
                observacion: 'Comprobante de pago subido por el cliente',
                responsableId: 'CLIENTE',
                responsableNombre: 'Cliente'
            }
        });

        return { evidence, payment: updatedPayment };
    }

    public static async confirmPaymentByAdmin(pedidoId: string, adminUserId: string, adminName: string) {
        const payment = await (prisma as any).orderPayment.findUnique({
            where: { pedidoId },
            include: { pedido: true }
        });

        if (!payment) {
            throw new Error('Pago no encontrado');
        }

        const prevPaymentStatus = payment.estado;

        // Transaction: Confirm Payment & Move Order to PREPARANDO_PEDIDO
        const result = await prisma.$transaction(async (tx) => {
            const updatedPayment = await (tx as any).orderPayment.update({
                where: { id: payment.id },
                data: { estado: 'CONFIRMADO' }
            });

            const updatedOrder = await (tx as any).pedido.update({
                where: { id: pedidoId },
                data: { estado: 'EN_PREPARACION' }
            });

            await (tx as any).paymentHistory.create({
                data: {
                    paymentId: payment.id,
                    estadoAnterior: prevPaymentStatus,
                    estadoNuevo: 'CONFIRMADO',
                    observacion: 'Pago verificado y confirmado en 1 clic por el administrador',
                    responsableId: adminUserId,
                    responsableNombre: adminName
                }
            });

            await (tx as any).pinchoOrderTimeline.create({
                data: {
                    pedidoId,
                    estadoAnterior: payment.pedido.estado,
                    estadoNuevo: 'EN_PREPARACION',
                    comentario: `Pago confirmado por ${adminName}. Pedido enviado a producción.`,
                    creadoPor: adminName
                }
            });

            return { updatedPayment, updatedOrder };
        });

        return result;
    }
}
