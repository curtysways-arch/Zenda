import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'SUPERADMIN') {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { paymentId, approved } = await req.json();

        const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
        if (!payment) return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 });

        if (!approved) {
            // Rechazar pago
            const updatedPayment = await prisma.payment.update({
                where: { id: paymentId },
                data: { estado_pago: 'rejected' },
                include: { Negocio: true }
            });

            // Enviar WhatsApp de rechazo al negocio
            if (updatedPayment.Negocio?.whatsapp) {
                try {
                    const plan = await prisma.plan.findUnique({
                        where: { id: updatedPayment.plan_id },
                        select: { name: true }
                    });
                    const waMessage = `❌ *Comprobante de Pago Rechazado* ⚠️\n\nHola, te informamos que tu comprobante de pago para el plan *${plan?.name || 'Premium'}* ha sido *RECHAZADO*.\n\nPor favor, verifica los datos del pago y vuelve a subir el comprobante correcto desde tu panel administrativo.\n\n📲 *Ir al Dashboard:* \n${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/plan`;
                    
                    const { notificationService } = await import('@/lib/notifications');
                    await notificationService.provider.sendMessage({
                        to: updatedPayment.Negocio.whatsapp.replace(/\D/g, ''),
                        message: waMessage,
                        template: 'rechazo_plan'
                    });
                } catch (err) {
                    console.error('Error enviando WhatsApp de rechazo:', err);
                }
            }

            return NextResponse.json({ success: true, status: 'rejected' });
        }

        // Aprobar pago
        await prisma.payment.update({
            where: { id: paymentId },
            data: { estado_pago: 'approved' }
        });

        const sub = await prisma.suscripcion.findUnique({ where: { negocioId: payment.negocio_id } });
        
        // Calcular próxima fecha fin:
        // - Si aún está vigente: extender desde su fecha de corte actual (no desde hoy)
        // - Si ya expiró: contar 1 mes desde hoy
        const now = new Date();
        const baseDate = (sub?.fechaFin && new Date(sub.fechaFin) > now)
            ? new Date(sub.fechaFin)  // Vigente: extiende desde su corte actual
            : now;                    // Expirado: empieza desde hoy
        const nuevaFechaFin = new Date(baseDate);
        nuevaFechaFin.setMonth(nuevaFechaFin.getMonth() + 1);

        // Detectar si es renovación (mismo plan) o upgrade (plan diferente)
        const tipoCambio = sub?.planId === payment.plan_id ? 'renewal' : 'upgrade_manual';

        await prisma.suscripcion.update({
            where: { negocioId: payment.negocio_id },
            data: {
                planId: payment.plan_id,
                estado: 'active',
                solicitudPlanId: null,
                fechaFin: nuevaFechaFin,
                customFeatures: null
            }
        });

        // Registrar en historial
        await prisma.subscriptionHistory.create({
            data: {
                id: crypto.randomUUID(),
                negocio_id: payment.negocio_id,
                plan_anterior_id: sub?.planId,
                plan_nuevo_id: payment.plan_id,
                tipo_cambio: tipoCambio,
                admin_id: (session.user as any).id
            }
        });

        // Enviar WhatsApp de aprobación al negocio
        try {
            const negocio = await prisma.negocio.findUnique({
                where: { id: payment.negocio_id },
                select: { nombre: true, whatsapp: true }
            });
            const plan = await prisma.plan.findUnique({
                where: { id: payment.plan_id },
                select: { name: true }
            });

            if (negocio?.whatsapp) {
                const { notificationService } = await import('@/lib/notifications');
                await notificationService.sendSubscriptionApprovalNotification(
                    payment.negocio_id,
                    negocio.whatsapp.replace(/\D/g, ''),
                    negocio.nombre,
                    plan?.name || 'Premium',
                    nuevaFechaFin,
                    false
                );
            }
        } catch (err) {
            console.error('Error enviando WhatsApp de aprobacion:', err);
        }

        return NextResponse.json({ success: true, status: 'approved' });
    } catch (error) {
        console.error('Error approve payment:', error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}
