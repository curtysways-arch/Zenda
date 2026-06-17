import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { notificationService } from '@/lib/notifications';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const { planId, metodoPago, periodo = 'mensual' } = await req.json();
        const negocioId = (session.user as any).negocioId;

        if (!negocioId || !planId || !metodoPago) {
            return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
        }

        // Obtener la suscripción actual
        const suscripcion = await (prisma.suscripcion as any).findUnique({
            where: { negocioId }
        });

        if (!suscripcion) {
            return NextResponse.json({ error: 'No se encontró la suscripción del negocio' }, { status: 404 });
        }

        // Obtener información del plan solicitado y el negocio
        const [planSolicitado, negocio, globalConfig] = await Promise.all([
            prisma.plan.findUnique({ where: { id: planId } }),
            (prisma.negocio as any).findUnique({ where: { id: negocioId } }),
            (prisma as any).globalConfig.findUnique({
                where: { clave: 'NUMERO_WHATSAPP_ADMIN' }
            })
        ]);

        if (!planSolicitado) {
            return NextResponse.json({ error: 'El plan solicitado no existe' }, { status: 404 });
        }

        // Actualizar la suscripción a estado 'ESPERA' y marcar pago pendiente
        await (prisma.suscripcion as any).update({
            where: { id: suscripcion.id },
            data: {
                estado: 'pendiente',
                pagoPendiente: true,
                solicitudPlanId: planId,
                metodoPago: `${metodoPago} (${periodo.toUpperCase()})`
            }
        });

        // --- NOTIFICAR AL SUPERADMIN ---

        // 1. Notificación Push a SuperAdmin(s)
        await notificationService.adminAlert(
            'Solicitud de Plan',
            `El negocio ${negocio.nombre} ha solicitado el plan ${planSolicitado.name} (${periodo.toUpperCase()}) vía ${metodoPago}.`,
            { type: 'PLAN_REQUEST', businessId: negocioId }
        );

        // 2. Mensaje de WhatsApp al SuperAdmin (opcional si está configurado)
        const adminPhone = globalConfig?.valor;
        if (adminPhone) {
            const message = `🔔 *Nueva Solicitud de Suscripción*\n\n🏘 *Negocio:* ${negocio.nombre}\n📋 *Plan:* ${planSolicitado.name} [${periodo.toUpperCase()}]\n💳 *Método:* ${metodoPago}\n\n⚠️ Revisar el panel de SuperAdmin para validar el pago.`;
            
            // Intentar enviar mensaje de WhatsApp vía connector (lib/notifications lo maneja)
            // Usamos notificationService.provider que por defecto llama a sendWhatsAppMessage
            try {
                // @ts-ignore
                await notificationService.provider.sendMessage({
                    to: adminPhone,
                    message,
                    template: 'subscription_request'
                });
            } catch (error) {
                console.error('Error enviando WhatsApp al admin:', error);
            }
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Error al solicitar plan:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
