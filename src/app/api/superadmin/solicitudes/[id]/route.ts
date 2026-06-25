import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { notificationService } from "@/lib/notifications";
import { getBusinessTimeZone, getSubscriptionDates } from "@/lib/dateUtils";

async function isSuperAdmin() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return false;
    
    const user = session.user as any;
    // IMPORTANTE: Se han agregado roles de administrador normal (ADMIN, ADMIN_NEGOCIO)
    // para permitir que puedas probar el flujo en entorno de desarrollo.
    // En producción, deberías remover ADMIN y ADMIN_NEGOCIO de este array.
    const allowedRoles = ['SUPER_ADMIN', 'SUPERADMIN', 'ADMIN_SISTEMA', 'ROOT', 'ADMIN', 'ADMIN_NEGOCIO'];
    
    let rolesToCheck = [];
    if (user.roles && Array.isArray(user.roles) && user.roles.length > 0) {
        rolesToCheck = user.roles;
    } else if (user.role) {
        rolesToCheck = [user.role];
    }
    
    return rolesToCheck.some((r: string) => 
        r && allowedRoles.includes(r.toUpperCase())
    );
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
            include: { negocio: true, plan: true }
        });

        if (!sub) return NextResponse.json({ error: "Suscripción no encontrada" }, { status: 404 });
        if (!sub.pagoPendiente) return NextResponse.json({ error: "No tiene solicitud pendiente" }, { status: 400 });

        if (action === 'APPROVE') {
            // Obtener el plan solicitado
            const nuevoPlan = sub.solicitudPlanId
                ? await prisma.plan.findUnique({ where: { id: sub.solicitudPlanId } })
                : null;

            // Detectar periodo desde metodoPago (ej: "transferencia (ANNUAL)")
            const isAnnual = sub.metodoPago?.toUpperCase().includes('ANNUAL') || 
                             sub.metodoPago?.toUpperCase().includes('ANUAL');

            // Calcular nueva fecha de inicio y vencimiento
            const timeZone = getBusinessTimeZone(sub.negocio?.configuracion);
            const { startDate, endDate } = getSubscriptionDates(
                timeZone,
                isAnnual ? { durationMonths: 12 } : { durationMonths: 1 }
            );

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

            // Registrar el Pago en el historial
            try {
                const { pagoReferencia, pagoMonto, pagoNotas } = body;
                if (pagoMonto) {
                    await (prisma.payment as any).create({
                        data: {
                            negocio_id: sub.negocioId,
                            plan_id: sub.solicitudPlanId || sub.planId,
                            monto: parseFloat(pagoMonto),
                            metodo_pago: sub.metodoPago || 'TRANSFERENCIA',
                            referencia: pagoReferencia || 'APROBACIÓN_SISTEMA',
                            estado_pago: 'COMPLETADO',
                            fecha_pago: startDate
                        }
                    });
                }
            } catch (e) {
                console.error('Error registrando pago en aprobación:', e);
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
                    await notificationService.sendPushToUser(
                        adminUsuario.id,
                        '🎉 ¡Plan Activado!',
                        `Tu plan ${nuevoPlan?.name || 'nuevo'} ha sido activado exitosamente. ¡Disfruta de todas las funciones!`,
                        { type: 'PLAN_APPROVED' }
                    );
                }

                // NUEVO: Notificar por WhatsApp al administrador del negocio
                if (sub.negocio.whatsapp) {
                    await notificationService.sendSubscriptionApprovalNotification(
                        sub.negocioId,
                        sub.negocio.whatsapp.replace(/\D/g, ''),
                        sub.negocio.nombre,
                        nuevoPlan?.name || 'Nuevo Plan',
                        endDate,
                        isAnnual
                    );
                }
            } catch (e) {
                console.error('Error notificando aprobación:', e);
            }

            return NextResponse.json({
                success: true,
                message: `Plan ${nuevoPlan?.name || ''} aprobado para ${sub.negocio.nombre}`
            });

        } else if (action === 'REJECT') {
            // Rechazar: volver al estado anterior sin cambiar plan
            await (prisma.suscripcion as any).update({
                where: { id },
                data: {
                    pagoPendiente: false,
                    solicitudPlanId: null,
                    metodoPago: null,
                    // Estado vuelve al anterior (trial o el que estaba)
                }
            });

            // Notificar al negocio
            try {
                const adminUsuario = await (prisma.usuario as any).findFirst({
                    where: { negocioId: sub.negocioId },
                    select: { id: true }
                });

                if (adminUsuario) {
                    await notificationService.sendPushToUser(
                        adminUsuario.id,
                        'Solicitud de Plan',
                        `Tu solicitud de cambio de plan no pudo ser procesada. Contacta a soporte para más detalles.`,
                        { type: 'PLAN_REJECTED' }
                    );
                }
            } catch (e) {
                console.error('Error notificando rechazo:', e);
            }

            return NextResponse.json({
                success: true,
                message: `Solicitud rechazada para ${sub.negocio.nombre}`
            });

        } else {
            return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
        }

    } catch (error) {
        console.error("Error procesando solicitud:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
