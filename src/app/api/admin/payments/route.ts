import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PaymentService } from '@/lib/payments/PaymentService';
import { PaymentStatus } from '@/lib/payments/types';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const { searchParams } = new URL(req.url);
        const businessId = searchParams.get('businessId') || (session?.user as any)?.negocioId;
        const estado = searchParams.get('estado');

        if (!businessId) {
            return NextResponse.json(
                { success: false, error: 'Negocio no especificado.' },
                { status: 400 }
            );
        }

        const where: any = { negocioId: businessId };
        if (estado && estado !== 'ALL') {
            where.estado = estado;
        }

        const payments = await prisma.orderPayment.findMany({
            where,
            include: {
                pedido: {
                    include: {
                        items: true
                    }
                },
                method: true,
                evidences: {
                    orderBy: { createdAt: 'desc' }
                },
                history: {
                    orderBy: { createdAt: 'desc' }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({
            success: true,
            payments
        });
    } catch (error: any) {
        console.error('Error al listar pagos:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const body = await req.json();
        const { paymentId, newStatus, motivoRechazo, observacion } = body;

        if (!paymentId || !newStatus) {
            return NextResponse.json(
                { success: false, error: 'paymentId y newStatus son requeridos.' },
                { status: 400 }
            );
        }

        const userName = (session?.user as any)?.nombre || 'ADMINISTRADOR';
        const userId = (session?.user as any)?.id || 'ADMIN';

        const result = await PaymentService.changePaymentStatus({
            paymentId,
            newStatus: newStatus as PaymentStatus,
            motivoRechazo,
            observacion,
            responsableId: userId,
            responsableNombre: userName
        });

        return NextResponse.json({
            success: true,
            payment: result.updatedPayment,
            nuevoEstadoPedido: result.nuevoEstadoPedido,
            message: `Estado del pago actualizado a ${newStatus}.`
        });
    } catch (error: any) {
        console.error('Error al cambiar estado del pago:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
