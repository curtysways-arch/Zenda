import prisma from './prisma';
import { whatsappService } from './whatsapp';
import crypto from 'crypto';

/**
 * Genera un código de referido único para un usuario y negocio
 */
export async function generateReferralCode(userId: string, negocioId: string): Promise<string> {
    // 1. Verificar si ya tiene un código para este negocio
    const existing = await prisma.referralCode.findUnique({
        where: {
            userId_negocioId: { userId, negocioId }
        }
    });

    if (existing) return existing.codigo;

    // 2. Obtener el nombre del usuario
    const user = await prisma.usuario.findUnique({
        where: { id: userId },
        select: { nombre: true }
    });

    const baseName = user?.nombre || 'USER';
    // Limpiar nombre: quitar acentos, caracteres especiales y dejar solo letras A-Z
    const cleanName = baseName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .replace(/[^A-Z]/g, '')
        .substring(0, 5);

    const prefix = cleanName || 'REF';

    // 3. Generar y comprobar unicidad
    let finalCode = "";
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 15) {
        // Generar un número aleatorio de 3 dígitos
        const rand = Math.floor(100 + Math.random() * 900);
        finalCode = `${prefix}${rand}`;

        const duplicate = await prisma.referralCode.findUnique({
            where: { codigo: finalCode }
        });

        if (!duplicate) {
            isUnique = true;
        }
        attempts++;
    }

    // Si fallan los 15 intentos (extremadamente improbable), usar UUID corto
    if (!isUnique) {
        finalCode = `${prefix}${crypto.randomUUID().substring(0, 4).toUpperCase()}`;
    }

    // 4. Crear el código en la base de datos
    const created = await prisma.referralCode.create({
        data: {
            id: crypto.randomUUID(),
            userId,
            negocioId,
            codigo: finalCode
        }
    });

    return created.codigo;
}

/**
 * Obtiene el progreso de referidos del usuario en las campañas activas del negocio
 */
export async function getReferralProgress(userId: string, negocioId: string) {
    // 1. Obtener todas las campañas activas
    const activeCampaigns = await prisma.referralCampaign.findMany({
        where: {
            negocioId,
            activa: true,
            fechaInicio: { lte: new Date() },
            AND: [
                {
                    OR: [
                        { estado: 'ACTIVA' },
                        { estado: null }
                    ]
                },
                {
                    OR: [
                        { fechaFin: null },
                        { fechaFin: { gte: new Date() } }
                    ]
                }
            ]
        },
        orderBy: { createdAt: 'desc' }
    });

    const progress = [];

    for (const campaign of activeCampaigns) {
        // Contar eventos válidos que aún no han sido consumidos para esta campaña
        const validCount = await prisma.referralEvent.count({
            where: {
                referrerId: userId,
                negocioId,
                campaignId: campaign.id,
                estado: 'VALIDO',
                rewardId: null
            }
        });

        progress.push({
            campaignId: campaign.id,
            nombre: campaign.nombre,
            descripcion: campaign.descripcion,
            imagenUrl: campaign.imagenUrl,
            tipoRecompensa: campaign.tipoRecompensa,
            valorRecompensa: campaign.valorRecompensa,
            referidosRequeridos: campaign.referidosRequeridos,
            progreso: validCount,
            completado: validCount >= campaign.referidosRequeridos,
            tipoIncentivo: campaign.tipoIncentivo,
            valorIncentivo: campaign.valorIncentivo,
            tipoCampana: (campaign as any).tipoCampana || "CLIENTES_NUEVOS"
        });
    }

    return progress;
}

/**
 * Hook que se ejecuta cuando una cita cambia a estado "completed" (finalizada).
 * Procesa el referido asociado al usuario invitado si existe.
 */
export async function processReferralCompletion(appointmentId: string) {
    try {
        console.log(`[Referidos] Procesando finalización de cita: ${appointmentId}`);

        // 1. Obtener la cita completada con relaciones
        const appointment = await prisma.appointment.findUnique({
            where: { id: appointmentId },
            include: {
                cliente: true,
                negocio: true,
            }
        });

        if (!appointment || appointment.estado !== 'completed') {
            console.log(`[Referidos] Cita ${appointmentId} no encontrada o no finalizada/completada.`);
            return;
        }

        const negocioId = appointment.negocioId;
        const referredId = appointment.usuarioId; // El ID de usuario del cliente invitado

        if (!referredId) {
            console.log(`[Referidos] La cita ${appointmentId} no tiene un usuarioId asociado. Saltando.`);
            return;
        }

        // 2. Buscar si hay algún evento de referido PENDIENTE para este invitado en este negocio
        const referralEvent = await prisma.referralEvent.findFirst({
            where: {
                referredId,
                negocioId,
                estado: 'PENDIENTE'
            },
            include: {
                Code: true
            }
        });

        if (!referralEvent) {
            console.log(`[Referidos] No se encontró evento de referido PENDIENTE para el usuario ${referredId} en el negocio ${negocioId}.`);
            return;
        }

        const referrerId = referralEvent.referrerId;

        // Anti-fraude: Un cliente no puede referirse a sí mismo
        if (referrerId === referredId) {
            console.log(`[Referidos] Intento de auto-referido detectado para el usuario ${referredId}. Marcando como INVALIDO.`);
            await prisma.referralEvent.update({
                where: { id: referralEvent.id },
                data: { estado: 'INVALIDO', updatedAt: new Date() }
            });
            return;
        }

        // 3. Validar si es realmente la PRIMERA cita finalizada del cliente en este negocio
        const completedAppointmentsCount = await prisma.appointment.count({
            where: {
                usuarioId: referredId,
                negocioId,
                estado: 'completed',
                completedAt: { not: null }
            }
        });

        // Si ya tiene más de una cita completada (esta incluida), entonces no cuenta como primeriza
        if (completedAppointmentsCount > 1) {
            console.log(`[Referidos] El usuario ${referredId} ya tiene citas previas completadas en este negocio. Marcando como INVALIDO.`);
            await prisma.referralEvent.update({
                where: { id: referralEvent.id },
                data: { estado: 'INVALIDO', updatedAt: new Date() }
            });
            return;
        }

        // 4. ¡Es válido! Marcar evento como VALIDO
        await prisma.referralEvent.update({
            where: { id: referralEvent.id },
            data: {
                estado: 'VALIDO',
                appointmentId,
                updatedAt: new Date()
            }
        });

        console.log(`[Referidos] Referido de ${referrerId} a ${referredId} validado correctamente.`);

        // 5. Obtener campañas activas para procesar las recompensas
        const activeCampaigns = await prisma.referralCampaign.findMany({
            where: {
                negocioId,
                activa: true,
                fechaInicio: { lte: new Date() },
                OR: [
                    { fechaFin: null },
                    { fechaFin: { gte: new Date() } }
                ]
            }
        });

        const referrerUser = await prisma.usuario.findUnique({ where: { id: referrerId } });
        const referredUser = await prisma.usuario.findUnique({ where: { id: referredId } });

        for (const campaign of activeCampaigns) {
            // Verificar si tiene límite de premios total
            if (campaign.limitePremios !== null && campaign.premiosEntregados >= campaign.limitePremios) {
                console.log(`[Referidos] Campaña ${campaign.nombre} ha alcanzado su límite de premios.`);
                continue;
            }

            // Contar eventos válidos no consumidos para esta campaña específica
            const validEventsCount = await prisma.referralEvent.count({
                where: {
                    referrerId,
                    negocioId,
                    campaignId: campaign.id,
                    estado: 'VALIDO',
                    rewardId: null
                }
            });

            // Si completa la meta de referidos requeridos
            if (validEventsCount >= campaign.referidosRequeridos) {
                // Crear recompensa
                const reward = await prisma.referralReward.create({
                    data: {
                        id: crypto.randomUUID(),
                        campaignId: campaign.id,
                        negocioId,
                        userId: referrerId,
                        estado: 'DISPONIBLE',
                        updatedAt: new Date()
                    }
                });

                // Consumir los referidos válidos asociándolos a este premio
                const eventsToConsume = await prisma.referralEvent.findMany({
                    where: {
                        referrerId,
                        negocioId,
                        campaignId: campaign.id,
                        estado: 'VALIDO',
                        rewardId: null
                    },
                    take: campaign.referidosRequeridos,
                    orderBy: { createdAt: 'asc' }
                });

                await prisma.referralEvent.updateMany({
                    where: {
                        id: { in: eventsToConsume.map(e => e.id) }
                    },
                    data: {
                        rewardId: reward.id,
                        updatedAt: new Date()
                    }
                });

                // Incrementar total de premios en la campaña
                await prisma.referralCampaign.update({
                    where: { id: campaign.id },
                    data: { premiosEntregados: { increment: 1 } }
                });

                console.log(`[Referidos] 🎉 ¡Meta alcanzada! Premio generado para el usuario ${referrerId}.`);

                // WhatsApp al referidor (Ganó el premio)
                if (referrerUser?.phone) {
                    try {
                        const msg = `🎉 *¡Felicidades ${referrerUser.nombre || 'Embajador'}!* 🎉\n\n¡Has completado la meta de referidos en *${appointment.negocio.nombre}*! 🥳\n\n🏆 *Premio obtenido:* ${campaign.valorRecompensa}\n\nAcércate al establecimiento y muestra este mensaje para canjear tu premio. ¡Gracias por recomendarnos! 🙌`;
                        await whatsappService.sendWhatsApp(referrerUser.phone, msg, true, 'recompensa_completada');
                    } catch (err) {
                        console.error("[Referidos] Error al enviar WhatsApp de premio:", err);
                    }
                }
            } else {
                // Si no completó la meta, enviamos WhatsApp de avance
                const faltantes = campaign.referidosRequeridos - validEventsCount;
                if (referrerUser?.phone) {
                    try {
                        let msg = "";
                        if (faltantes === 1) {
                            msg = `👋 *¡Hola ${referrerUser.nombre}!* 🤩\n\nTu amigo *${referredUser?.nombre || 'Alguien'}* completó su cita en *${appointment.negocio.nombre}*.\n\n🔥 *¡Te falta solo 1 referido* para ganar tu premio: *${campaign.valorRecompensa}*!\n\n🔗 Comparte tu enlace de referido para lograrlo hoy mismo.`;
                        } else {
                            msg = `👋 *¡Hola ${referrerUser.nombre}!*\n\nTu amigo *${referredUser?.nombre || 'Alguien'}* completó su cita en *${appointment.negocio.nombre}*.\n\n📈 Tienes *${validEventsCount} de ${campaign.referidosRequeridos}* referidos válidos.\n\n✨ Te faltan *${faltantes}* referidos para obtener tu premio: *${campaign.valorRecompensa}*.`;
                        }
                        await whatsappService.sendWhatsApp(referrerUser.phone, msg, true, 'progreso_referido');
                    } catch (err) {
                        console.error("[Referidos] Error al enviar WhatsApp de avance:", err);
                    }
                }
            }

            // 7. Enviar incentivo de bienvenida al referido (si la campaña tiene)
            if (campaign.tipoIncentivo && campaign.valorIncentivo && referredUser?.phone) {
                try {
                    const welcomeMsg = `🎁 *¡Bienvenido a ${appointment.negocio.nombre}!* 🎁\n\nPor haber reservado con la invitación de *${referrerUser?.nombre || 'tu amigo'}*, tienes un regalo especial:\n\n✨ *${campaign.valorIncentivo}*\n\n¡Gracias por confiar en nosotros! Hazlo válido en tu próxima visita o compra.`;
                    await whatsappService.sendWhatsApp(referredUser.phone, welcomeMsg, true, 'bienvenida_referido');
                } catch (err) {
                    console.error("[Referidos] Error al enviar WhatsApp de bienvenida al referido:", err);
                }
            }
        }
    } catch (e) {
        console.error("[Referidos] Error crítico en processReferralCompletion:", e);
    }
}
