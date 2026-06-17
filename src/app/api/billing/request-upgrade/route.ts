import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const negocioId = (session.user as any).negocioId;
        const { planId, metodoPago, referencia, comprobanteUrl, monto } = await req.json();

        // Obtener plan para verificar
        const plan = await prisma.plan.findUnique({ where: { id: planId } });
        if (!plan) return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 });

        // Crear registro en Payment
        const payment = await prisma.payment.create({
            data: {
                id: crypto.randomUUID(),
                negocio_id: negocioId,
                plan_id: planId,
                monto: monto || plan.price,
                metodo_pago: metodoPago,
                referencia: referencia || null,
                comprobante: comprobanteUrl || null,
                estado_pago: 'pending'
            }
        });

        // Actualizar suscripción
        await prisma.suscripcion.update({
            where: { negocioId },
            data: {
                estado: 'payment_pending',
                solicitudPlanId: planId
            }
        });

        // Notificar por WhatsApp al Súper Admin si está configurado
        try {
            const adminConfig = await prisma.globalConfig.findUnique({
                where: { clave: 'NUMERO_WHATSAPP_ADMIN' }
            });
            const adminWhatsApp = adminConfig?.valor;

            const negocio = await prisma.negocio.findUnique({
                where: { id: negocioId },
                select: { nombre: true }
            });

            if (adminWhatsApp) {
                const { notificationService } = await import('@/lib/notifications');
                const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
                const waMessage = `🚨 *Nueva Solicitud de Pago/Plan* 💳\n\nHola Admin, el negocio *${negocio?.nombre || 'Desconocido'}* ha solicitado la activación/renovación del plan *${plan.name}*.\n\n💰 *Monto:* $${monto || plan.price}\n🏦 *Método:* ${metodoPago}\n🔢 *Referencia:* ${referencia || 'N/A'}\n\n📲 *Revisa y aprueba el comprobante en el Super Panel:* \n${appUrl}/superadmin/pagos`;

                await notificationService.provider.sendMessage({
                    to: adminWhatsApp.replace(/\D/g, ''),
                    message: waMessage,
                    template: 'solicitud_plan_admin'
                });
            }
        } catch (err) {
            console.error('Error enviando WhatsApp de solicitud al admin:', err);
        }

        return NextResponse.json({ success: true, payment });
    } catch (error) {
        console.error('Error request upgrade:', error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}
