import { prisma } from '@/lib/prisma';
import {
    PaymentStatus,
    OrderStatus,
    UploadEvidenceDTO,
    ChangePaymentStatusDTO
} from './types';
import { NotificationService } from '@/lib/notifications/NotificationService';

export class PaymentService {
    /**
     * Genera un código de pago de referencia único
     */
    private static generatePaymentCode(prefix: string = 'PAY'): string {
        const randomNum = Math.floor(100000 + Math.random() * 900000);
        return `${prefix}-${randomNum}`;
    }

    /**
     * Crea la entidad de pago inicial asociada a un pedido
     */
    static async createInitialPayment(params: {
        pedidoId: string;
        negocioId: string;
        monto: number;
        methodId?: string;
    }) {
        const { pedidoId, negocioId, monto, methodId } = params;

        const codigoPago = this.generatePaymentCode('PINCHOS');

        const payment = await prisma.orderPayment.create({
            data: {
                pedidoId,
                negocioId,
                methodId: methodId || null,
                monto,
                moneda: 'USD',
                estado: 'PENDIENTE',
                codigoPago,
                history: {
                    create: {
                        estadoAnterior: null,
                        estadoNuevo: 'PENDIENTE',
                        observacion: 'Pago generado en estado pendiente.',
                        responsableNombre: 'SISTEMA'
                    }
                }
            },
            include: {
                pedido: true,
                method: true,
                evidences: true,
                history: true
            }
        });

        return payment;
    }

    /**
     * Registra o actualiza la evidencia de pago (Comprobante PNG/JPG/PDF)
     */
    static async uploadEvidence(dto: UploadEvidenceDTO) {
        const { paymentId, fileUrl, fileType, mimeType, fileSize, uploadedBy } = dto;

        // 1. Validar tipos de archivo permitidos
        const allowedMimeTypes = [
            'image/jpeg',
            'image/png',
            'image/webp',
            'application/pdf'
        ];
        if (!allowedMimeTypes.includes(mimeType.toLowerCase())) {
            throw new Error(
                `Tipo de archivo no permitido. Solo se permiten imágenes (PNG, JPG, WEBP) o documentos PDF.`
            );
        }

        // 2. Validar tamaño máximo (5 MB)
        const MAX_SIZE = 5 * 1024 * 1024;
        if (fileSize > MAX_SIZE) {
            throw new Error(`El archivo supera el tamaño máximo permitido de 5 MB.`);
        }

        // 3. Buscar el pago
        const currentPayment = await prisma.orderPayment.findUnique({
            where: { id: paymentId },
            include: { pedido: true }
        });

        if (!currentPayment) {
            throw new Error(`Pago no encontrado: ${paymentId}`);
        }

        // 4. Crear registro de evidencia
        const evidence = await prisma.paymentEvidence.create({
            data: {
                paymentId,
                fileUrl,
                fileType,
                mimeType,
                fileSize,
                uploadedBy: uploadedBy || 'CLIENT',
                status: 'ENVIADO'
            }
        });

        const estadoAnterior = currentPayment.estado;
        const nuevoEstado: PaymentStatus = 'COMPROBANTE_ENVIADO';

        // 5. Actualizar estado del pago y del pedido en transacción
        const updatedPayment = await prisma.$transaction(async (tx) => {
            const paymentUpdated = await tx.orderPayment.update({
                where: { id: paymentId },
                data: {
                    estado: nuevoEstado,
                    motivoRechazo: null, // Limpiar motivo si era un reintento
                    history: {
                        create: {
                            estadoAnterior,
                            estadoNuevo: nuevoEstado,
                            observacion: 'Comprobante de pago subido por el cliente.',
                            responsableNombre: uploadedBy || 'CLIENTE'
                        }
                    }
                },
                include: {
                    pedido: true,
                    evidences: true,
                    history: true
                }
            });

            // Actualizar estado del Pedido a PAGO_EN_REVISION
            await tx.pedido.update({
                where: { id: currentPayment.pedidoId },
                data: { estado: 'PAGO_EN_REVISION' }
            });

            return paymentUpdated;
        });

        // 6. Disparar notificación desacoplada
        await NotificationService.notify({
            event: 'COMPROBANTE_RECIBIDO',
            negocioId: currentPayment.negocioId,
            pedidoId: currentPayment.pedidoId,
            paymentId: currentPayment.id,
            monto: currentPayment.monto,
            telefonoCliente: currentPayment.pedido.telefonoCliente,
            nombreCliente: currentPayment.pedido.nombreCliente
        });

        return { evidence, payment: updatedPayment };
    }

    /**
     * Cambia el estado del pago (Aprobación/Rechazo por Administrador)
     */
    static async changePaymentStatus(dto: ChangePaymentStatusDTO) {
        const {
            paymentId,
            newStatus,
            observacion,
            motivoRechazo,
            responsableId,
            responsableNombre
        } = dto;

        const currentPayment = await prisma.orderPayment.findUnique({
            where: { id: paymentId },
            include: { pedido: true }
        });

        if (!currentPayment) {
            throw new Error(`Pago no encontrado: ${paymentId}`);
        }

        const estadoAnterior = currentPayment.estado;

        // Actualizar Pago y Pedido
        const result = await prisma.$transaction(async (tx) => {
            const updatedPayment = await tx.orderPayment.update({
                where: { id: paymentId },
                data: {
                    estado: newStatus,
                    motivoRechazo: motivoRechazo || null,
                    observaciones: observacion || null,
                    history: {
                        create: {
                            estadoAnterior,
                            estadoNuevo: newStatus,
                            observacion: observacion || (newStatus === 'CONFIRMADO' ? 'Pago verificado y confirmado por el administrador.' : 'Pago rechazado.'),
                            responsableId: responsableId || null,
                            responsableNombre: responsableNombre || 'ADMINISTRADOR'
                        }
                    }
                },
                include: {
                    pedido: true,
                    evidences: true,
                    history: true
                }
            });

            let nuevoEstadoPedido: OrderStatus = 'PENDIENTE_PAGO';

            if (newStatus === 'CONFIRMADO') {
                // Al confirmar pago, el pedido entra AUTOMÁTICAMENTE a producción (EN_PREPARACION)
                nuevoEstadoPedido = 'EN_PREPARACION';
            } else if (newStatus === 'RECHAZADO') {
                nuevoEstadoPedido = 'PENDIENTE_PAGO';
            } else if (newStatus === 'EN_REVISION' || newStatus === 'COMPROBANTE_ENVIADO') {
                nuevoEstadoPedido = 'PAGO_EN_REVISION';
            }

            await tx.pedido.update({
                where: { id: currentPayment.pedidoId },
                data: { estado: nuevoEstadoPedido }
            });

            return { updatedPayment, nuevoEstadoPedido };
        });

        // Notificaciones desacopladas
        if (newStatus === 'CONFIRMADO') {
            await NotificationService.notify({
                event: 'PAGO_CONFIRMADO',
                negocioId: currentPayment.negocioId,
                pedidoId: currentPayment.pedidoId,
                paymentId: currentPayment.id,
                monto: currentPayment.monto,
                telefonoCliente: currentPayment.pedido.telefonoCliente,
                nombreCliente: currentPayment.pedido.nombreCliente
            });

            await NotificationService.notify({
                event: 'PEDIDO_EN_PREPARACION',
                negocioId: currentPayment.negocioId,
                pedidoId: currentPayment.pedidoId,
                paymentId: currentPayment.id,
                monto: currentPayment.monto,
                telefonoCliente: currentPayment.pedido.telefonoCliente,
                nombreCliente: currentPayment.pedido.nombreCliente
            });
        } else if (newStatus === 'RECHAZADO') {
            await NotificationService.notify({
                event: 'PAGO_RECHAZADO',
                negocioId: currentPayment.negocioId,
                pedidoId: currentPayment.pedidoId,
                paymentId: currentPayment.id,
                monto: currentPayment.monto,
                telefonoCliente: currentPayment.pedido.telefonoCliente,
                nombreCliente: currentPayment.pedido.nombreCliente,
                motivo: motivoRechazo
            });
        }

        return result;
    }

    /**
     * GUARD ESTRICTO: Impide pasar a produccion (EN_PREPARACION, LISTO, EN_RUTA, ENTREGADO) si no hay pago CONFIRMADO.
     */
    static async guardOrderProduction(pedidoId: string, targetState: OrderStatus) {
        const productionStates: OrderStatus[] = [
            'EN_PREPARACION',
            'LISTO',
            'EN_RUTA',
            'ENTREGADO'
        ];

        if (productionStates.includes(targetState)) {
            const payment = await prisma.orderPayment.findUnique({
                where: { pedidoId }
            });

            if (!payment || payment.estado !== 'CONFIRMADO') {
                throw new Error(
                    `BLOCKED: El pedido ${pedidoId} no puede pasar al estado '${targetState}' porque su pago no está CONFIRMADO (Estado actual del pago: ${payment ? payment.estado : 'SIN_PAGO'}).`
                );
            }
        }
    }
}
