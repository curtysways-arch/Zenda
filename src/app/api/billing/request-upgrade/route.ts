import { NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const session = await getEffectiveAdminSession();
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await req.json();
        const { planId, metodoPago, referencia, comprobanteUrl, monto, businessId } = body;

        let negocioId = (session.user as any).negocioId;
        const isAdmin = (session.user as any).role === 'SUPERADMIN' || (session.user as any).isAdminUser;

        if (!negocioId && isAdmin && businessId) {
            negocioId = businessId;
        }

        if (!negocioId) {
            return NextResponse.json({ error: 'No se pudo identificar el negocio asociado' }, { status: 400 });
        }

        if (!planId) {
            return NextResponse.json({ error: 'Debes seleccionar un plan' }, { status: 400 });
        }

        // Obtener plan para verificar (por id o por slug)
        const plan = await prisma.plan.findFirst({
            where: {
                OR: [
                    { id: planId },
                    { slug: planId }
                ]
            }
        });

        if (!plan) {
            return NextResponse.json({ error: 'Plan no encontrado en el sistema' }, { status: 404 });
        }

        // Crear registro en Payment
        const payment = await prisma.payment.create({
            data: {
                id: crypto.randomUUID(),
                negocio_id: negocioId,
                plan_id: plan.id,
                monto: monto !== undefined && monto !== null ? Number(monto) : plan.price,
                metodo_pago: metodoPago || 'TRANSFERENCIA',
                referencia: referencia ? String(referencia).trim() : null,
                comprobante: comprobanteUrl || null,
                estado_pago: 'pending'
            }
        });

        // Actualizar o crear suscripción de forma segura con upsert
        await prisma.suscripcion.upsert({
            where: { negocioId },
            update: {
                estado: 'payment_pending',
                solicitudPlanId: plan.id,
                metodoPago: metodoPago || 'TRANSFERENCIA',
                pagoPendiente: true,
                updatedAt: new Date()
            },
            create: {
                id: crypto.randomUUID(),
                negocioId,
                planId: plan.id,
                estado: 'payment_pending',
                solicitudPlanId: plan.id,
                metodoPago: metodoPago || 'TRANSFERENCIA',
                pagoPendiente: true,
                fechaInicio: new Date(),
                fechaFin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                updatedAt: new Date()
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

        return NextResponse.json({
            success: true,
            message: 'Solicitud enviada correctamente',
            payment
        });
    } catch (error: any) {
        console.error('[API_BILLING_REQUEST_UPGRADE] Error:', error);
        return NextResponse.json({ error: error?.message || 'Error interno al procesar la solicitud' }, { status: 500 });
    }
}
