import prisma from '@/lib/prisma';
import { notificationService } from '@/lib/notifications';
import { featureService } from '@/lib/services/featureService';
import crypto from 'crypto';

/**
 * Función que sería ejecutada por un CRON job cada hora/30 min
 * Busca reservas confirmadas que ocurran en las próximas 2 horas
 */
export async function sendUpcomingReminders() {
    const now = new Date();
    const currentHours = now.getHours().toString().padStart(2, '0');
    const currentMinutes = now.getMinutes().toString().padStart(2, '0');
    const currentTimeHHMM = `${currentHours}:${currentMinutes}`;
    
    // Normalizamos startOfToday (00:00:00)
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    let sentCount = 0;
    console.log(`[JOB] Verificando recordatorios (DÍA y 2H). Hora actual: ${currentTimeHHMM}`);

    // --- 1. RECORDATORIO DEL DÍA ---
    const reservasDia = await (prisma as any).appointment.findMany({
        where: {
            estado: 'confirmed',
            reminderDaySent: false,
            fecha: startOfToday
        },
        include: { cliente: true, negocio: true }
    });

    for (const reserva of reservasDia) {
        try {
            const canUseReminders = await featureService.canUseFeature(reserva.negocioId, 'whatsapp_reminders');
            if (!canUseReminders) continue;

            const configs = await prisma.configuracion.findMany({
                where: {
                    negocioId: reserva.negocioId,
                    clave: { in: ['REMINDER_DAY_ENABLED', 'REMINDER_DAY_TIME'] }
                }
            });
            const configMap: Record<string, string> = {};
            configs.forEach(c => configMap[c.clave] = c.valor);
            
            const enabled = configMap['REMINDER_DAY_ENABLED'] ?? '1';
            const sendTime = configMap['REMINDER_DAY_TIME'] ?? '08:00';

            if (enabled === '1' && currentTimeHHMM >= sendTime) {
                await notificationService.sendReminder(
                    reserva.negocioId, reserva.cliente.nombre, reserva.cliente.telefono, 
                    reserva.fecha.toLocaleDateString(), reserva.horaInicio, reserva.negocio.nombre, 
                    reserva.duracion, 'DAY'
                );
                console.log(`✅ [JOB] Recordatorio DIA enviado a ${reserva.cliente.telefono} (${reserva.horaInicio})`);
                
                await (prisma as any).appointment.update({
                    where: { id: reserva.id },
                    data: { reminderDaySent: true }
                });
                sentCount++;
            }
        } catch (e) {
            console.error(`❌ [JOB] Error enviando recordatorio DIA para reserva ${reserva.id}:`, e);
        }
    }

    // --- 2. RECORDATORIO 2 HORAS ANTES ---
    const reservas2H = await (prisma as any).appointment.findMany({
        where: {
            estado: 'confirmed',
            reminder2HSent: false,
            fecha: startOfToday
        },
        include: { cliente: true, negocio: true }
    });

    for (const reserva of reservas2H) {
        try {
            const canUseReminders = await featureService.canUseFeature(reserva.negocioId, 'whatsapp_reminders');
            if (!canUseReminders) continue;

            const config = await prisma.configuracion.findUnique({
                where: { clave_negocioId: { clave: 'REMINDER_2H_ENABLED', negocioId: reserva.negocioId } }
            });
            const enabled = config?.valor ?? '1';

            if (enabled === '1') {
                const [h, m] = reserva.horaInicio.split(':').map(Number);
                const appTime = new Date(startOfToday);
                appTime.setHours(h, m, 0, 0);

                const diffMs = appTime.getTime() - now.getTime();
                const diffHours = diffMs / (1000 * 60 * 60);

                if (diffHours >= 0 && diffHours <= 2) {
                    await notificationService.sendReminder(
                        reserva.negocioId, reserva.cliente.nombre, reserva.cliente.telefono, 
                        reserva.fecha.toLocaleDateString(), reserva.horaInicio, reserva.negocio.nombre, 
                        reserva.duracion, '2H'
                    );
                    console.log(`✅ [JOB] Recordatorio 2H enviado a ${reserva.cliente.telefono} (${reserva.horaInicio})`);
                    
                    await (prisma as any).appointment.update({
                        where: { id: reserva.id },
                        data: { reminder2HSent: true }
                    });
                    sentCount++;
                }
            }
        } catch (e) {
            console.error(`❌ [JOB] Error enviando recordatorio 2H para reserva ${reserva.id}:`, e);
        }
    }

    return sentCount;
}
/**
 * Busca suscripciones que vencen pronto y notifica al negocio
 */
export async function sendSubscriptionReminders() {
    const now = new Date();
    const startOfToday = new Date(now.setHours(0, 0, 0, 0));

    // Buscar suscripciones que venzan pronto y no se les haya notificado hoy
    const suscripciones = await prisma.suscripcion.findMany({
        where: {
            estado: { in: ['activa', 'trial'] },
            OR: [
                { lastReminderSent: null },
                { lastReminderSent: { lt: startOfToday } }
            ]
        },
        include: { negocio: true }
    });

    let count = 0;
    for (const sub of suscripciones) {
        if (!sub.negocio?.whatsapp) continue;

        const diffTime = sub.fechaFin.getTime() - Date.now();
        const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Notificar en hitos: 7 días, 3 días, 1 día y el día del vencimiento (0) o vencido (<0)
        const hitos = [7, 3, 1, 0];
        const debeNotificar = hitos.includes(diasRestantes) || (diasRestantes < 0 && diasRestantes > -3); // Notificar hasta 3 días después de vencido

        if (debeNotificar) {
            try {
                await notificationService.sendSubscriptionExpiryReminder(
                    sub.negocioId,
                    sub.negocio.whatsapp,
                    sub.negocio.nombre,
                    diasRestantes,
                    sub.fechaFin
                );

                await prisma.suscripcion.update({
                    where: { id: sub.id },
                    data: { lastReminderSent: new Date() }
                });
                count++;
            } catch (e) {
                console.error(`Error enviando aviso sub a ${sub.negocio.nombre}:`, e);
            }
        }
    }
    return count;
}

/**
 * Busca promociones activas que ya vencieron y las marca como caducadas, notificando al negocio.
 */
export async function expirePromotions() {
    const now = new Date();

    // 1. Buscar promociones activas que ya expiraron por fecha
    const expiredPromos = await prisma.promotion.findMany({
        where: {
            estado: 'activa',
            fechaFin: { lt: now }
        },
        include: {
            negocio: true
        }
    });

    console.log(`[JOB] Expirando ${expiredPromos.length} promociones vencidas.`);

    let count = 0;
    for (const promo of expiredPromos) {
        try {
            await prisma.promotion.update({
                where: { id: promo.id },
                data: { estado: 'caducada' }
            });

            // Notificación Push al negocio
            await notificationService.sendPushToBusiness(
                promo.businessId,
                "Promoción Caducada",
                `La promoción "${promo.titulo}" ha finalizado por fecha.`
            );

            // Notificación WhatsApp al negocio
            if (promo.negocio?.whatsapp) {
                const waMessage = `⚠️ *Promoción Finalizada* ⚽\n\nHola, te informamos que la promoción *"${promo.titulo}"* de *${promo.negocio.nombre}* ha llegado a su fecha de fin y ya no está visible para el público.\n\n📅 *Finalizó:* ${new Date(promo.fechaFin).toLocaleString('es-ES')}\n\n📲 *Gestiona tus promociones aquí:* \n${process.env.NEXT_PUBLIC_APP_URL}/admin/promociones`;
                
                await notificationService.provider.sendMessage({
                    to: promo.negocio.whatsapp.replace(/\D/g, ''),
                    message: waMessage,
                    template: 'promo_caducada'
                });
            }
            
            count++;
            console.log(`✅ [JOB] Promo "${promo.titulo}" marcada como caducada.`);
        } catch (e) {
            console.error(`❌ [JOB] Error expirando promo ${promo.id}:`, e);
        }
    }

    return count;
}

/**
 * Busca citas completadas que no han sido calificadas por el cliente
 * y envía recordatorios por WhatsApp a los 30 min y a las 6 horas.
 */
export async function sendRatingReminders() {
    const now = new Date();
    const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);

    console.log("[JOB] Iniciando envío de recordatorios de calificación.");

    // 1. Recordatorio 1 (30 min después)
    const pending1 = await (prisma as any).appointment.findMany({
        where: {
            estado: 'completed',
            completedAt: { lte: thirtyMinAgo },
            ratingReminder1Sent: false,
            ratings: { none: { raterRole: 'client' } }
        },
        include: { cliente: true, negocio: true }
    });

    for (const res of pending1) {
        try {
            await notificationService.sendRatingReminder(
                res.negocioId,
                res.cliente.nombre,
                res.cliente.telefono,
                res.negocio.nombre,
                res.negocio.slug
            );
            await (prisma as any).appointment.update({
                where: { id: res.id },
                data: { ratingReminder1Sent: true }
            });
            console.log(`✅ [JOB] Rating Reminder 1 enviado a ${res.cliente.telefono}`);
        } catch (e) {
            console.error(`❌ [JOB] Error enviando rating reminder 1 para ${res.id}:`, e);
        }
    }

    // 2. Recordatorio 2 (6 horas después)
    const pending2 = await (prisma as any).appointment.findMany({
        where: {
            estado: 'completed',
            completedAt: { lte: sixHoursAgo },
            ratingReminder2Sent: false,
            ratings: { none: { raterRole: 'client' } }
        },
        include: { cliente: true, negocio: true }
    });

    for (const res of pending2) {
        try {
            await notificationService.sendRatingReminder(
                res.negocioId,
                res.cliente.nombre,
                res.cliente.telefono,
                res.negocio.nombre,
                res.negocio.slug
            );
            await (prisma as any).appointment.update({
                where: { id: res.id },
                data: { ratingReminder2Sent: true }
            });
            console.log(`✅ [JOB] Rating Reminder 2 enviado a ${res.cliente.telefono}`);
        } catch (e) {
            console.error(`❌ [JOB] Error enviando rating reminder 2 para ${res.id}:`, e);
        }
    }

    return pending1.length + pending2.length;
}

/**
 * Busca citas pendientes cuya fecha y hora de inicio ya pasaron
 * y las marca como 'expired' (Expirada).
 */
export async function autoExpirePendingAppointments() {
    const now = new Date();
    
    // Obtener todas las citas pendientes
    const pendingAppointments = await (prisma as any).appointment.findMany({
        where: {
            estado: 'pending'
        }
    });
    
    console.log(`[JOB] Analizando ${pendingAppointments.length} citas pendientes para expiración.`);
    
    let count = 0;
    for (const app of pendingAppointments) {
        try {
            // Combinar la fecha de la cita con su horaInicio (ej: "14:30")
            const [hours, minutes] = app.horaInicio.split(':').map(Number);
            const appDateTime = new Date(app.fecha);
            appDateTime.setHours(hours, minutes, 0, 0);
            
            // Si la fecha y hora de la cita es anterior a "ahora"
            if (appDateTime < now) {
                await (prisma as any).appointment.update({
                    where: { id: app.id },
                    data: { estado: 'expired' }
                });
                
                console.log(`✅ [JOB] Cita #${app.id.slice(-8)} de ${app.fecha.toLocaleDateString()} ${app.horaInicio} ha expirado y se marcó como EXPIRED.`);
                count++;
            }
        } catch (error) {
            console.error(`❌ [JOB] Error procesando expiración para cita ${app.id}:`, error);
        }
    }
    
    return count;
}

/**
 * Función que procesa suscripciones expiradas:
 * 1. Pasa de 'trial' directamente a 'downgraded' (plan BEGIN) sin grace period.
 * 2. Pasa de 'active' a 'grace_period' si fechaFin ya pasó.
 * 3. Pasa de 'grace_period' a 'downgraded' (plan BEGIN) si pasaron 7 días desde fechaFin.
 */
export async function processExpiredSubscriptions() {
    const now = new Date();
    
    // 1. Encontrar suscripciones trial o active que ya expiraron por fecha
    const expiredSubs = await prisma.suscripcion.findMany({
        where: {
            estado: { in: ['trial', 'active'] },
            fechaFin: { lt: now }
        },
        include: { Negocio: true, Plan: true }
    });
    
    const beginPlan = await prisma.plan.findFirst({
        where: { name: { contains: 'BEGIN' } }
    });

    let countGrace = 0;
    let countDowngrade = 0;

    for (const sub of expiredSubs) {
        try {
            if (sub.estado === 'trial') {
                // Trial expira directamente a BEGIN sin periodo de gracia
                if (beginPlan) {
                    await prisma.suscripcion.update({
                        where: { id: sub.id },
                        data: {
                            estado: 'downgraded',
                            planId: beginPlan.id,
                            customFeatures: null
                        }
                    });

                    await prisma.subscriptionHistory.create({
                        data: {
                            id: crypto.randomUUID(),
                            negocio_id: sub.negocioId,
                            plan_anterior_id: sub.planId,
                            plan_nuevo_id: beginPlan.id,
                            tipo_cambio: 'downgrade_auto'
                        }
                    });

                    console.log(`✅ [JOB] Suscripción TRIAL del negocio "${sub.Negocio.nombre}" expiró y pasó directamente a BEGIN.`);

                    if (sub.Negocio.whatsapp) {
                        const waMessage = `❌ *Tu periodo de prueba ha finalizado* ⏳\n\nHola, te informamos que tu periodo de prueba premium de 14 días en *${sub.Negocio.nombre}* ha finalizado.\n\nTu cuenta ha sido cambiada al plan *BEGIN* (Gratuito) con funciones limitadas.\n\n📲 *Para recuperar tus funciones premium, mejora tu plan aquí:* \n${process.env.NEXT_PUBLIC_APP_URL}/admin/plan`;
                        await notificationService.provider.sendMessage({
                            to: sub.Negocio.whatsapp.replace(/\D/g, ''),
                            message: waMessage,
                            template: 'downgrade'
                        });
                    }
                    countDowngrade++;
                } else {
                    console.warn(`⚠️ [JOB] No se pudo expirar trial de "${sub.Negocio.nombre}" porque no se encontró el plan BEGIN.`);
                }
            } else {
                // Plan activo de pago entra en Grace Period de 7 días
                await prisma.suscripcion.update({
                    where: { id: sub.id },
                    data: { estado: 'grace_period' }
                });
                
                console.log(`⚠️ [JOB] Negocio "${sub.Negocio.nombre}" expiró y entró a GRACE PERIOD.`);
                
                if (sub.Negocio.whatsapp) {
                    const waMessage = `⚠️ *Tu plan ha expirado* ⏳\n\nHola, te informamos que tu plan premium en *${sub.Negocio.nombre}* ha expirado.\n\nTienes un periodo de gracia de 7 días antes de que tus funciones premium sean limitadas.\n\n📲 *Evita interrupciones mejorando tu plan aquí:* \n${process.env.NEXT_PUBLIC_APP_URL}/admin/plan`;
                    
                    await notificationService.provider.sendMessage({
                        to: sub.Negocio.whatsapp.replace(/\D/g, ''),
                        message: waMessage,
                        template: 'grace_period'
                    });
                }
                countGrace++;
            }
        } catch (e) {
            console.error(`❌ [JOB] Error procesando expiración para ${sub.id}:`, e);
        }
    }

    // 2. Encontrar suscripciones en GRACE PERIOD que ya superaron los 7 días (downgrade)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const toDowngrade = await prisma.suscripcion.findMany({
        where: {
            estado: 'grace_period',
            fechaFin: { lt: sevenDaysAgo }
        },
        include: { Negocio: true, Plan: true }
    });

    if (beginPlan && toDowngrade.length > 0) {
        for (const sub of toDowngrade) {
            try {
                await prisma.suscripcion.update({
                    where: { id: sub.id },
                    data: {
                        estado: 'downgraded',
                        planId: beginPlan.id,
                        customFeatures: null
                    }
                });
                
                await prisma.subscriptionHistory.create({
                    data: {
                        id: crypto.randomUUID(),
                        negocio_id: sub.negocioId,
                        plan_anterior_id: sub.planId,
                        plan_nuevo_id: beginPlan.id,
                        tipo_cambio: 'downgrade_auto'
                    }
                });
                
                console.log(`✅ [JOB] Downgrade automático por grace period expirado aplicado a negocio "${sub.Negocio.nombre}".`);
                
                if (sub.Negocio.whatsapp) {
                    const waMessage = `❌ *Periodo de Gracia Finalizado*\n\nTu cuenta ha sido cambiada al plan *BEGIN* (Gratuito) con funciones limitadas.\n\n📲 *Para recuperar tus funciones premium, mejora tu plan aquí:* \n${process.env.NEXT_PUBLIC_APP_URL}/admin/plan`;
                    await notificationService.provider.sendMessage({
                        to: sub.Negocio.whatsapp.replace(/\D/g, ''),
                        message: waMessage,
                        template: 'downgrade'
                    });
                }
                countDowngrade++;
            } catch (e) {
                console.error(`❌ [JOB] Error haciendo downgrade por grace period para ${sub.id}:`, e);
            }
        }
    }

    return countGrace + countDowngrade;
}
