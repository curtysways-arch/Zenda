import { NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import prisma from '@/lib/prisma';
import { tokenHasPermission } from '@/lib/admin/teamAccessMap';
import crypto from 'crypto';
import { getBusinessTimeZone, getSubscriptionDates } from '@/lib/dateUtils';

export async function POST(req: Request) {
    try {
        const session = await getEffectiveAdminSession();
        const user = session?.user as any;
        const role = user?.role;
        const roles = user?.roles || [];
        // Solo superadmin o equipo interno de Citiox. Antes 'ADMIN' (rol de todo dueño de negocio) también podía aprobar pagos.
        const isSuper = role === 'SUPERADMIN' || role === 'SUPER_ADMIN' || roles.includes('SUPERADMIN') || roles.includes('SUPER_ADMIN') || user?.isAdminUser === true;
        if (!session || !isSuper) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }
        // Equipo Citiox: solo quien tenga el permiso de aprobar pagos (Finanzas, Director, dueño)
        if (user?.isAdminUser && !tokenHasPermission(user, 'PAGOS_APROBAR')) {
            return NextResponse.json({ error: 'Tu rol no puede aprobar pagos.' }, { status: 403 });
        }

        const { paymentId, approved } = await req.json();

        const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
        if (!payment) return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 });

        // Compra de un diseño de página (tienda de diseños)
        if (payment.plan_id.startsWith('LANDING:')) {
            const designId = payment.plan_id.slice('LANDING:'.length);
            if (!approved) {
                await prisma.payment.update({ where: { id: paymentId }, data: { estado_pago: 'rejected' } });
                return NextResponse.json({ success: true, status: 'rejected', isLandingDesign: true });
            }
            const { readLandingState, withLandingState, getLandingDesign } = await import('@/lib/landingDesigns');
            if (!getLandingDesign(designId)) {
                return NextResponse.json({ error: 'El diseño de esta compra ya no existe' }, { status: 400 });
            }
            const negocioLanding = await prisma.negocio.findUnique({ where: { id: payment.negocio_id }, select: { configuracion: true } });
            const state = readLandingState(negocioLanding?.configuracion);
            const next = withLandingState(negocioLanding?.configuracion, {
                activo: designId,
                comprados: [...state.comprados, designId],
            });
            await prisma.$transaction([
                prisma.payment.update({ where: { id: paymentId }, data: { estado_pago: 'approved' } }),
                prisma.negocio.update({ where: { id: payment.negocio_id }, data: { configuracion: next as any } }),
            ]);
            return NextResponse.json({ success: true, status: 'approved', isLandingDesign: true, designId });
        }

        // Detectar si el cobro corresponde a un Add-on o Combo (Plan + Add-on)
        const isComboPayment = payment.plan_id.startsWith('COMBO:');
        const isAddonPayment = payment.plan_id.startsWith('ADDON:') || 
                               isComboPayment ||
                               Boolean(await prisma.addon.findUnique({ where: { id: payment.plan_id } }));

        if (isAddonPayment) {
            const { addonService } = await import('@/lib/services/addonService');
            const result = await addonService.activateAddonPayment(
                payment.id, 
                approved, 
                (session.user as any).role || 'SUPERADMIN'
            );
            return NextResponse.json({ 
                success: true, 
                status: approved ? 'approved' : 'rejected',
                isAddon: !isComboPayment,
                isCombo: isComboPayment,
                contract: result 
            });
        }

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
        const business = await prisma.negocio.findUnique({
            where: { id: payment.negocio_id },
            select: { configuracion: true }
        });
        const timeZone = getBusinessTimeZone(business?.configuracion);

        // ── ACTIVACIÓN SOCIO FUNDADOR EN PAGO EFECTIVO ($10) ──
        // Si el negocio califica como candidato a Socio Fundador y aprueba el pago,
        // se activa formalmente consumiendo el cupo histórico atómicamente.
        // Cualquier primer pago de un negocio cuyo tipo tenga cupos de fundador confirma el cupo
        // (activateFounderOnPayment valida que haya programa y cupos).
        const isFounderCandidate = !sub?.isFounder;

        if (isFounderCandidate) {
            try {
                const { planService } = await import('@/lib/services/planService');
                const founderResult = await planService.activateFounderOnPayment(
                    payment.negocio_id,
                    payment.monto,
                    (session.user as any).id || 'SUPERADMIN',
                    { keepDates: true }
                );
                console.log(`[billing/approve] Activación de Socio Fundador para negocio ${payment.negocio_id}:`, founderResult);
            } catch (founderErr) {
                console.error('[billing/approve] Error al activar Socio Fundador en pago:', founderErr);
            }
        }
        
        // Calcular próxima fecha fin:
        // - Si aún está vigente: extender desde su fecha de corte actual (no desde hoy)
        // - Si ya expiró: contar 1 mes desde hoy
        const now = new Date();
        let nuevaFechaFin: Date;
        
        if (sub?.fechaFin && new Date(sub.fechaFin) > now) {
            // Vigente: extiende desde su corte actual. 
            // Como ya está alineada, sumarle 1 mes mantiene la alineación local.
            nuevaFechaFin = new Date(sub.fechaFin);
            nuevaFechaFin.setMonth(nuevaFechaFin.getMonth() + 1);
        } else {
            // Expirado: empieza desde hoy alineado a la hora del negocio
            const dates = getSubscriptionDates(timeZone, { durationMonths: 1, baseDate: now });
            nuevaFechaFin = dates.endDate;
        }

        // Detectar si es renovación (mismo plan) o upgrade (plan diferente)
        const tipoCambio = sub?.planId === payment.plan_id ? 'renewal' : 'upgrade_manual';

        await prisma.suscripcion.update({
            where: { negocioId: payment.negocio_id },
            data: {
                planId: payment.plan_id,
                estado: 'active',
                pagoPendiente: false,
                solicitudPlanId: null,
                fechaFin: nuevaFechaFin
            }
        });

        // Avanzar ciclo de precio negociado (si hay un override temporal activo).
        // Si el override llega a su último ciclo, se expira automáticamente.
        try {
            const subForOverride = await prisma.suscripcion.findUnique({
                where: { negocioId: payment.negocio_id },
                select: { id: true }
            });
            if (subForOverride) {
                const { pricingService } = await import('@/lib/services/pricingService');
                await pricingService.advanceSubscriptionCycle(subForOverride.id);
            }
        } catch (cycleErr) {
            console.error('[billing/approve] Error al avanzar ciclo de precio negociado:', cycleErr);
        }


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
                // Notificar también al Super Admin por WhatsApp
                try {
                    const { notifyAdminPlanEvent } = await import('@/lib/adminNotificationHelper');
                    await notifyAdminPlanEvent({
                        eventType: 'ACTIVADO',
                        businessName: negocio?.nombre || 'Negocio',
                        planName: plan?.name || 'Plan',
                        paymentMethod: payment.metodo_pago || 'TRANSFERENCIA',
                        amount: Number(payment.monto),
                        reference: payment.referencia || 'APROBACIÓN'
                    });
                } catch (adminWaErr) {
                    console.error('Error notificando al admin por plan activado:', adminWaErr);
                }
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
