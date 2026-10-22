import { NextRequest, NextResponse } from "next/server";
import { getTeamContext } from "@/lib/admin/teamGuard";
import prisma from "@/lib/prisma";
import { getEffectiveAdminSession } from "@/lib/delegatedAuth";
import { notificationService } from "@/lib/notifications";
import { NotificationService } from "@/lib/notifications/notificationService";
import { getBusinessTimeZone, getSubscriptionDates } from "@/lib/dateUtils";
import { nextPeriodStart, addMonths } from "@/lib/subscription/lifecycle";

async function isSuperAdmin() {
    // Usuario del equipo Citiox; el permiso de cada acción lo valida el middleware (lib/admin/teamAccessMap)
    return Boolean(await getTeamContext());
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!await isSuperAdmin()) {
        console.warn("Intento de acceso no autorizado a aprobación de planes");
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const { id } = await params;
        const body = await req.json();
        const { action } = body; // 'APPROVE' | 'REJECT'

        const sub = await (prisma.suscripcion as any).findUnique({
            where: { id },
            include: { Negocio: true, Plan: true }
        });

        if (!sub) return NextResponse.json({ error: "Suscripción no encontrada" }, { status: 404 });
        if (!sub.pagoPendiente) return NextResponse.json({ error: "No tiene solicitud pendiente" }, { status: 400 });

        const negocio = sub.Negocio;
        const nombreNegocio = negocio?.nombre || "Negocio";

        if (action === 'APPROVE') {
            // Obtener el plan solicitado
            const nuevoPlan = sub.solicitudPlanId
                ? await prisma.plan.findUnique({ where: { id: sub.solicitudPlanId } })
                : null;

            // Detectar periodo desde metodoPago (ej: "transferencia (ANNUAL)")
            const isAnnual = sub.metodoPago?.toUpperCase().includes('ANNUAL') || 
                             sub.metodoPago?.toUpperCase().includes('ANUAL');

            // Nuevo período: si aún le quedaban días (prueba o plan vigente) se suman, no se pierden
            const startDate = nextPeriodStart(sub.fechaFin);
            const endDate = addMonths(startDate, isAnnual ? 12 : 1);

            // Actualizar la suscripción: activar el nuevo plan
            await (prisma.suscripcion as any).update({
                where: { id },
                data: {
                    estado: 'ACTIVA',
                    pagoPendiente: false,
                    planId: sub.solicitudPlanId || sub.planId,
                    solicitudPlanId: null,
                    metodoPago: null,
                    fechaInicio: startDate,
                    fechaFin: endDate,
                }
            });

            // Socio Fundador: si su tipo de negocio tiene cupos, este primer pago confirma el cupo
            // y el precio de por vida (el mismo flujo que el cobro desde el panel del negocio).
            try {
                const { planService } = await import('@/lib/services/planService');
                await planService.activateFounderOnPayment(sub.negocioId, Number(body?.pagoMonto || 0), 'SUPERADMIN', { keepDates: true });
            } catch (founderErr) {
                console.warn('No se pudo confirmar Socio Fundador:', founderErr);
            }

            // Precio negociado temporal: este pago consume un ciclo (al terminar vuelve a $29.99 o al de fundador)
            try {
                const { pricingService } = await import('@/lib/services/pricingService');
                await pricingService.advanceSubscriptionCycle(id);
            } catch (cycleErr) {
                console.warn('No se pudo avanzar el ciclo de precio negociado:', cycleErr);
            }

            // Si había Add-ons pendientes de pago (Combo), activarlos
            try {
                const pendingAddons = await prisma.subscriptionAddon.findMany({
                    where: { subscriptionId: id, status: 'PENDING' }
                });
                for (const item of pendingAddons) {
                    await prisma.subscriptionAddon.update({
                        where: { id: item.id },
                        data: {
                            status: 'ACTIVE',
                            startedAt: startDate,
                            updatedAt: new Date()
                        }
                    });
                    await prisma.subscriptionAddonHistory.create({
                        data: {
                            businessId: sub.negocioId,
                            subscriptionId: id,
                            addonId: item.addonId,
                            subscriptionAddonId: item.id,
                            action: 'ACTIVATED',
                            quantityBefore: item.quantity,
                            quantityAfter: item.quantity,
                            priceBefore: item.priceContracted,
                            priceAfter: item.priceContracted,
                            statusBefore: 'PENDING',
                            statusAfter: 'ACTIVE',
                            performedBy: 'SUPERADMIN',
                            reason: 'Combo Plan + Add-on aprobado desde Solicitudes'
                        }
                    });
                }
            } catch (addonErr) {
                console.error('Error activando add-ons pendientes en solicitud:', addonErr);
            }

            // Sincronizar o registrar el Pago en el historial
            try {
                const { pagoReferencia, pagoMonto, pagoNotas } = body;
                const pendingPayments = await prisma.payment.findMany({
                    where: {
                        negocio_id: sub.negocioId,
                        estado_pago: { in: ['pending', 'PENDING'] }
                    }
                });

                if (pendingPayments.length > 0) {
                    await prisma.payment.updateMany({
                        where: {
                            negocio_id: sub.negocioId,
                            estado_pago: { in: ['pending', 'PENDING'] }
                        },
                        data: {
                            estado_pago: 'approved',
                            referencia: pagoReferencia || undefined,
                            monto: pagoMonto ? parseFloat(pagoMonto) : undefined
                        }
                    });
                } else if (pagoMonto) {
                    await (prisma.payment as any).create({
                        data: {
                            negocio_id: sub.negocioId,
                            plan_id: sub.solicitudPlanId || sub.planId,
                            monto: parseFloat(pagoMonto),
                            metodo_pago: sub.metodoPago || 'TRANSFERENCIA',
                            referencia: pagoReferencia || 'APROBACIÓN_SISTEMA',
                            estado_pago: 'approved',
                            fecha_pago: startDate
                        }
                    });
                }
            } catch (e) {
                console.error('Error registrando o sincronizando pago en aprobación:', e);
            }

            // Registrar en el historial de suscripciones
            try {
                await (prisma.subscriptionHistory as any).create({
                    data: {
                        negocio_id: sub.negocioId,
                        plan_anterior_id: sub.planId,
                        plan_nuevo_id: sub.solicitudPlanId || sub.planId,
                        tipo_cambio: isAnnual ? 'RENOVACION_ANUAL' : 'UPGRADE',
                        fecha_cambio: startDate,
                        admin_id: 'SISTEMA'
                    }
                });
            } catch (e) {
                console.error('Error registrando historial:', e);
            }

            // Asegurar que el negocio esté ACTIVO
            await (prisma.negocio as any).update({
                where: { id: sub.negocioId },
                data: { estado: 'ACTIVO' }
            });

            // Notificar al negocio (push al admin del negocio)
            try {
                const adminUsuario = await (prisma.usuario as any).findFirst({
                    where: { negocioId: sub.negocioId },
                    select: { id: true }
                });

                if (adminUsuario) {
                    await NotificationService.createNotification({
                        negocioId: sub.negocioId,
                        userId: adminUsuario.id,
                        tipo: 'SISTEMA',
                        categoria: 'SISTEMA',
                        titulo: '🎉 ¡Plan Activado!',
                        descripcion: `Tu plan ${nuevoPlan?.name || 'nuevo'} ha sido activado exitosamente. ¡Disfruta de todas las funciones!`,
                        icono: 'Sparkles',
                        prioridad: 'SUCCESS',
                        priority: 'HIGH',
                        recipientType: 'USER',
                        actionType: 'CUSTOM',
                        actionPayload: { screen: 'subscription' },
                        channels: ['APP', 'PUSH']
                    });
                }

                // Notificar por WhatsApp al administrador del negocio
                if (negocio?.whatsapp) {
                    await notificationService.sendSubscriptionApprovalNotification(
                        sub.negocioId,
                        negocio.whatsapp.replace(/\D/g, ''),
                        nombreNegocio,
                        nuevoPlan?.name || 'Nuevo Plan',
                        endDate,
                        isAnnual
                    );
                }

                // Notificar al Super Admin de la activación del plan
                try {
                    const { notifyAdminPlanEvent } = await import('@/lib/adminNotificationHelper');
                    await notifyAdminPlanEvent({
                        eventType: 'ACTIVADO',
                        businessName: nombreNegocio,
                        planName: nuevoPlan?.name || 'Plan',
                        period: isAnnual ? 'Anual' : 'Mensual',
                        paymentMethod: sub.metodoPago || 'TRANSFERENCIA',
                        amount: body.pagoMonto ? parseFloat(body.pagoMonto) : undefined,
                        reference: body.pagoReferencia || 'APROBACIÓN'
                    });
                } catch (adminWaErr) {
                    console.error('Error notificando al admin por plan activado:', adminWaErr);
                }
            } catch (e) {
                console.error('Error notificando aprobación:', e);
            }

            return NextResponse.json({
                success: true,
                message: `Plan ${nuevoPlan?.name || ''} aprobado para ${nombreNegocio}`
            });

        } else if (action === 'REJECT') {
            // Rechazar: volver al estado anterior sin cambiar plan
            await (prisma.suscripcion as any).update({
                where: { id },
                data: {
                    pagoPendiente: false,
                    solicitudPlanId: null,
                    metodoPago: null,
                }
            });

            // Si había Add-ons pendientes asociados, cancelarlos
            try {
                await prisma.subscriptionAddon.updateMany({
                    where: { subscriptionId: id, status: 'PENDING' },
                    data: {
                        status: 'CANCELLED',
                        cancelledAt: new Date(),
                        updatedAt: new Date()
                    }
                });
            } catch (addonErr) {
                console.error('Error cancelando add-ons pendientes en rechazo:', addonErr);
            }

            // Notificar al negocio
            try {
                const adminUsuario = await (prisma.usuario as any).findFirst({
                    where: { negocioId: sub.negocioId },
                    select: { id: true }
                });

                if (adminUsuario) {
                    await NotificationService.createNotification({
                        negocioId: sub.negocioId,
                        userId: adminUsuario.id,
                        tipo: 'SISTEMA',
                        categoria: 'SISTEMA',
                        titulo: 'Solicitud de Plan',
                        descripcion: `Tu solicitud de cambio de plan no pudo ser procesada. Contacta a soporte para más detalles.`,
                        icono: 'XCircle',
                        prioridad: 'ERROR',
                        priority: 'HIGH',
                        recipientType: 'USER',
                        actionType: 'CUSTOM',
                        actionPayload: { screen: 'subscription' },
                        channels: ['APP', 'PUSH']
                    });
                }
            } catch (e) {
                console.error('Error notificando rechazo:', e);
            }

            return NextResponse.json({
                success: true,
                message: `Solicitud rechazada para ${nombreNegocio}`
            });

        } else {
            return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
        }

    } catch (error) {
        console.error("Error procesando solicitud:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
