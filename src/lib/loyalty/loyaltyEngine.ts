import prisma from '../prisma';
import { whatsappService } from '../whatsapp';
import { NotificationService } from '../notifications/notificationService';

// ─── TIPOS ────────────────────────────────────────────────────────────────────

export type CampaignType =
    | 'CLIENTES_NUEVOS'
    | 'CLIENTES_EXISTENTES'
    | 'CLIENTES_INACTIVOS'
    | 'CUMPLEANOS'
    | 'PRIMERA_RESERVA_MES'
    | 'CUALQUIER_RESERVA'
    | 'COMPLETAR_RESERVAS'
    | 'GASTAR_DOLARES'
    | 'COMPRAR_SERVICIO'
    | 'COMPRAR_CATEGORIA'
    | 'RESERVAR_DIAS'
    | 'RESERVAR_HORARIOS'
    | 'FLASH'
    | 'RANKING'
    | 'TEMPORADA'
    | 'RESENA'
    | 'COMPARTIR'
    | 'PERSONALIZADA';

// ─── PUNTO DE ENTRADA PRINCIPAL: Al completar una cita ───────────────────────

/**
 * Se ejecuta cuando una cita pasa a estado "completed".
 * Procesa puntos, campañas, automatizaciones y notificaciones.
 */
export async function processAppointmentCompleted(appointmentId: string): Promise<void> {
    try {
        console.log(`[Loyalty] Procesando cita completada: ${appointmentId}`);

        const appointment = await prisma.appointment.findUnique({
            where: { id: appointmentId },
            include: { cliente: true, negocio: true, service: true }
        });

        if (!appointment || appointment.estado !== 'completed') return;

        const negocioId = appointment.negocioId;
        const usuarioId = appointment.usuarioId;

        if (!usuarioId) return;

        const config = (appointment as any).negocio.configuracion
            ? (typeof (appointment as any).negocio.configuracion === 'string'
                ? JSON.parse((appointment as any).negocio.configuracion)
                : (appointment as any).negocio.configuracion) as any
            : {};

        // 1. Sumar puntos por reserva completada (si el módulo de puntos está activo)
        if (config?.puntosActivos) {
            const serviceExtra = (appointment.service?.extraInfo as any) || {};
            const puntosOtorgados = serviceExtra.puntosOtorgados !== undefined 
                ? parseInt(String(serviceExtra.puntosOtorgados)) 
                : (config?.puntosReserva ?? 10);
            
            await addPoints(usuarioId, negocioId, puntosOtorgados, 'RESERVA', appointmentId);
        }

        // 2. Procesar referidos del sistema actual (compatibilidad total)
        await processReferralForAppointment(appointmentId);

        // 3. Evaluar campañas de fidelización (nuevas reglas)
        await evaluateLoyaltyCampaigns(appointmentId, usuarioId, negocioId, appointment);

        // 4. Ejecutar automatizaciones activas
        await runAutomations(usuarioId, negocioId, 'RESERVAS_COMPLETADAS', { appointmentId });

        console.log(`[Loyalty] ✅ Procesamiento completado para cita: ${appointmentId}`);
    } catch (err: any) {
        console.error(`[Loyalty] Error procesando cita ${appointmentId}:`, err.message);
    }
}

// ─── SISTEMA DE PUNTOS ────────────────────────────────────────────────────────

/**
 * Agrega (o deduce) puntos al balance del cliente y registra en el historial.
 */
export async function addPoints(
    userId: string,
    negocioId: string,
    puntos: number,
    concepto: string,
    referenciaId?: string,
    notas?: string
): Promise<void> {
    try {
        // Upsert del balance de puntos
        const userPoints = await (prisma as any).userPoints.upsert({
            where: { userId_negocioId: { userId, negocioId } },
            create: { userId, negocioId, puntos },
            update: { puntos: { increment: puntos } }
        });

        // Registrar en historial
        await (prisma as any).pointsHistory.create({
            data: { userId, negocioId, puntos, concepto, referenciaId, notas }
        });

        console.log(`[Puntos] +${puntos} pts para ${userId} (${concepto})`);

        // 1. Notificación al Centro de Actividad
        const esBono = puntos > 0;
        await NotificationService.createNotification({
            negocioId,
            userId,
            tipo: 'AUTOMATIZACION',
            categoria: 'CUPONES',
            titulo: esBono ? '🪙 ¡Sumaste Puntos!' : '🛍️ Canje de Puntos Exitoso',
            descripcion: esBono 
                ? `Acabas de ganar ${puntos} puntos por concepto de: ${concepto || 'Bono de lealtad'}.`
                : `Has utilizado ${Math.abs(puntos)} puntos para realizar un canje.`,
            icono: 'Coins',
            prioridad: esBono ? 'SUCCESS' : 'INFO',
            recipientType: 'USER',
            actionType: 'VER_PERFIL',
            actionPayload: { screen: 'profile' }
        });

        // 2. Transmitir actualización de puntos por SSE en tiempo real
        NotificationService.publishRealtime(negocioId, userId, {
            tipoEvento: 'PUNTOS_UPDATE',
            payload: { puntos: userPoints.puntos }
        });

    } catch (err: any) {
        console.error(`[Puntos] Error agregando puntos:`, err.message);
    }
}

/**
 * Obtiene el balance de puntos de un cliente en un negocio.
 */
export async function getPoints(userId: string, negocioId: string): Promise<number> {
    const record = await (prisma as any).userPoints.findUnique({
        where: { userId_negocioId: { userId, negocioId } }
    });
    return record?.puntos ?? 0;
}

// ─── EVALUADOR DE CAMPAÑAS DE FIDELIZACIÓN ───────────────────────────────────

/**
 * Evalúa todas las campañas activas del negocio frente a la cita completada.
 * Aplica la regla de cada campaña y actualiza el progreso del cliente.
 */
async function evaluateLoyaltyCampaigns(
    appointmentId: string,
    userId: string,
    negocioId: string,
    appointment: any
): Promise<void> {
    const campaigns = await (prisma as any).referralCampaign.findMany({
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
        }
    });

    for (const campaign of campaigns) {
        await evaluateSingleCampaign(campaign, appointmentId, userId, negocioId, appointment);
    }
}

/**
 * Evalúa si una cita aplica para una campaña según su tipoCampana.
 * Devuelve true si es válida.
 */
async function checkCampaignRule(
    campaign: any,
    userId: string,
    negocioId: string,
    appointment: any
): Promise<boolean> {
    const tipo: CampaignType = campaign.tipoCampana || 'CLIENTES_NUEVOS';

    switch (tipo) {
        case 'CLIENTES_NUEVOS': {
            // El usuario NO debe tener citas completadas previas en el negocio (solo la actual)
            const count = await prisma.appointment.count({
                where: { usuarioId: userId, negocioId, estado: 'completed' }
            });
            return count === 1;
        }

        case 'CLIENTES_EXISTENTES':
        case 'CUALQUIER_RESERVA':
        case 'FLASH':
        case 'TEMPORADA':
            return true;

        case 'CLIENTES_INACTIVOS': {
            // El usuario no debe haber reservado en los últimos X días (excluyendo la cita actual)
            const dias = campaign.diasInactividad || 60;
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - dias);
            const prevCount = await prisma.appointment.count({
                where: {
                    usuarioId: userId,
                    negocioId,
                    estado: 'completed',
                    completedAt: { gte: cutoff },
                    id: { not: appointment.id }
                }
            });
            return prevCount === 0;
        }

        case 'PRIMERA_RESERVA_MES': {
            // Solo cuenta la primera cita completada del mes actual
            const now = new Date();
            const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const countMonth = await prisma.appointment.count({
                where: {
                    usuarioId: userId,
                    negocioId,
                    estado: 'completed',
                    completedAt: { gte: startMonth }
                }
            });
            return countMonth === 1;
        }

        case 'COMPRAR_SERVICIO': {
            // La cita debe ser del servicio configurado en el icono (usamos campo icono para guardar servicioId)
            const requiredServiceId = campaign.icono;
            if (!requiredServiceId) return true;
            return appointment.canchaId === requiredServiceId || appointment.serviceId === requiredServiceId;
        }

        case 'RESERVAR_DIAS': {
            // El campo color guarda los días permitidos (ej: "1,2,3" para Lun-Mie)
            const allowedDays = campaign.color?.split(',').map(Number) || [];
            if (allowedDays.length === 0) return true;
            const dayOfWeek = new Date(appointment.fecha).getDay();
            return allowedDays.includes(dayOfWeek);
        }

        default:
            return true;
    }
}

/**
 * Evalúa una campaña específica frente a una cita.
 */
async function evaluateSingleCampaign(
    campaign: any,
    appointmentId: string,
    userId: string,
    negocioId: string,
    appointment: any
): Promise<void> {
    // Para campañas de tipo REFERIDO, solo se procesa vía el sistema de referidos
    const tiposReferido: CampaignType[] = ['CLIENTES_NUEVOS', 'CLIENTES_EXISTENTES', 'CLIENTES_INACTIVOS'];
    if (tiposReferido.includes(campaign.tipoCampana || 'CLIENTES_NUEVOS')) return;

    const isValid = await checkCampaignRule(campaign, userId, negocioId, appointment);
    if (!isValid) return;

    // Verificar si ya existe progreso para esta cita y campaña (idempotencia)
    const existing = await (prisma as any).referralEvent.findFirst({
        where: { campaignId: campaign.id, referrerId: userId, appointmentId }
    });
    if (existing) return;

    // Verificar límite de premios total
    if (campaign.limitePremios !== null && campaign.premiosEntregados >= campaign.limitePremios) return;

    // Verificar límite de premios por cliente
    if (campaign.maxPremiosPorCliente) {
        const rewardsCount = await (prisma as any).referralReward.count({
            where: { campaignId: campaign.id, userId }
        });
        if (rewardsCount >= campaign.maxPremiosPorCliente && !campaign.permitirRepetir) return;
    }

    // Obtener código de referido del usuario
    let refCode = await (prisma as any).referralCode.findFirst({ where: { userId, negocioId } });
    if (!refCode) {
        refCode = await (prisma as any).referralCode.create({
            data: { userId, negocioId, codigo: `AUTO${Date.now()}` }
        });
    }

    // Registrar el evento de progreso como VALIDO directamente (el usuario se "refiere a sí mismo" para campañas de acumulación propia)
    await (prisma as any).referralEvent.create({
        data: {
            campaignId: campaign.id,
            codeId: refCode.id,
            negocioId,
            referrerId: userId,
            referredId: userId,
            appointmentId,
            estado: 'VALIDO'
        }
    });

    // Contar progreso total no consumido
    const validCount = await (prisma as any).referralEvent.count({
        where: { campaignId: campaign.id, referrerId: userId, estado: 'VALIDO', rewardId: null }
    });

    console.log(`[Loyalty] Campaña "${campaign.nombre}" — progreso: ${validCount}/${campaign.referidosRequeridos}`);

    // ¿Completó la meta?
    if (validCount >= campaign.referidosRequeridos) {
        await generateReward(campaign, userId, negocioId, validCount);
    }
}

// ─── GENERACIÓN DE RECOMPENSAS ────────────────────────────────────────────────

/**
 * Crea una recompensa cuando el usuario completa la meta de la campaña.
 */
async function generateReward(campaign: any, userId: string, negocioId: string, validCount: number): Promise<void> {
    const reward = await (prisma as any).referralReward.create({
        data: {
            campaignId: campaign.id,
            negocioId,
            userId,
            estado: 'DISPONIBLE'
        }
    });

    // Asociar los eventos válidos consumidos a la recompensa
    const events = await (prisma as any).referralEvent.findMany({
        where: { campaignId: campaign.id, referrerId: userId, estado: 'VALIDO', rewardId: null },
        take: campaign.referidosRequeridos
    });

    for (const ev of events) {
        await (prisma as any).referralEvent.update({
            where: { id: ev.id },
            data: { rewardId: reward.id }
        });
    }

    // Incrementar contador de premios entregados
    await (prisma as any).referralCampaign.update({
        where: { id: campaign.id },
        data: { premiosEntregados: { increment: 1 } }
    });

    // Notificar al usuario
    await notifyRewardEarned(userId, negocioId, campaign, reward);

    console.log(`[Loyalty] 🎁 Premio generado para ${userId} en campaña "${campaign.nombre}"`);
}

// ─── SISTEMA DE REFERIDOS (COMPATIBILIDAD TOTAL) ──────────────────────────────

/**
 * Procesa el referido para campañas de tipo REFERIDOS (lógica original preservada).
 */
async function processReferralForAppointment(appointmentId: string): Promise<void> {
    try {
        const appointment = await prisma.appointment.findUnique({
            where: { id: appointmentId },
            include: { negocio: true }
        });

        if (!appointment || appointment.estado !== 'completed') return;

        const negocioId = appointment.negocioId;
        const referredId = appointment.usuarioId;
        if (!referredId) return;

        const referralEvent = await (prisma as any).referralEvent.findFirst({
            where: { referredId, negocioId, estado: 'PENDIENTE' },
            include: { Code: true, Campaign: true }
        });

        if (!referralEvent) return;

        const referrerId = referralEvent.referrerId;

        // Anti-fraude
        if (referrerId === referredId) {
            await (prisma as any).referralEvent.update({
                where: { id: referralEvent.id },
                data: { estado: 'INVALIDO' }
            });
            return;
        }

        const campaign = referralEvent.Campaign;
        const tipoCampana: CampaignType = campaign?.tipoCampana || 'CLIENTES_NUEVOS';

        // Evaluar la regla de referidos según tipoCampana
        const isValid = await checkReferralRule(tipoCampana, referredId, negocioId, appointment, campaign);

        if (!isValid) {
            await (prisma as any).referralEvent.update({
                where: { id: referralEvent.id },
                data: { estado: 'INVALIDO', appointmentId }
            });
            return;
        }

        // Marcar como VALIDO
        await (prisma as any).referralEvent.update({
            where: { id: referralEvent.id },
            data: { estado: 'VALIDO', appointmentId }
        });

        console.log(`[Referidos] ✅ Evento validado: ${referrerId} → ${referredId}`);

        // Sumar puntos al referidor si tiene puntos activos
        const config = appointment.negocio.configuracion
            ? (typeof appointment.negocio.configuracion === 'string'
                ? JSON.parse(appointment.negocio.configuracion)
                : appointment.negocio.configuracion) as any
            : {};

        if (config?.puntosActivos) {
            const puntosReferido = config?.puntosReferido ?? 50;
            await addPoints(referrerId, negocioId, puntosReferido, 'REFERIDO', referralEvent.id);
        }

        // Procesar recompensas para campañas de referidos activas
        await processReferralRewards(referrerId, negocioId, campaign, appointment.negocio);

    } catch (err: any) {
        console.error('[Referidos] Error procesando referido:', err.message);
    }
}

/**
 * Evalúa si un referido es válido según la regla de la campaña.
 */
async function checkReferralRule(
    tipoCampana: CampaignType,
    referredId: string,
    negocioId: string,
    appointment: any,
    campaign: any
): Promise<boolean> {
    switch (tipoCampana) {
        case 'CLIENTES_NUEVOS': {
            const count = await prisma.appointment.count({
                where: { usuarioId: referredId, negocioId, estado: 'completed' }
            });
            return count === 1;
        }
        case 'CLIENTES_EXISTENTES':
        case 'CUALQUIER_RESERVA':
            return true;
        case 'CLIENTES_INACTIVOS': {
            const dias = campaign?.diasInactividad || 60;
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - dias);
            const prevCount = await prisma.appointment.count({
                where: { usuarioId: referredId, negocioId, estado: 'completed', completedAt: { gte: cutoff }, id: { not: appointment.id } }
            });
            return prevCount === 0;
        }
        case 'PRIMERA_RESERVA_MES': {
            const now = new Date();
            const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const count = await prisma.appointment.count({
                where: { usuarioId: referredId, negocioId, estado: 'completed', completedAt: { gte: startMonth } }
            });
            return count === 1;
        }
        default:
            return true;
    }
}

/**
 * Procesa las recompensas de referidos (campañas de tipo referido).
 */
async function processReferralRewards(referrerId: string, negocioId: string, campaign: any, negocio: any): Promise<void> {
    if (!campaign) return;

    if (campaign.limitePremios !== null && campaign.premiosEntregados >= campaign.limitePremios) return;

    const validCount = await (prisma as any).referralEvent.count({
        where: { referrerId, negocioId, campaignId: campaign.id, estado: 'VALIDO', rewardId: null }
    });

    // Notificar avance
    const remaining = campaign.referidosRequeridos - validCount;
    if (remaining === 1) {
        await notifyOneAway(referrerId, negocioId, campaign);
    }

    if (validCount >= campaign.referidosRequeridos) {
        await generateReward(campaign, referrerId, negocioId, validCount);
    }
}

// ─── AUTOMATIZACIONES ─────────────────────────────────────────────────────────

/**
 * Ejecuta las reglas de automatización activas que coincidan con el disparador.
 */
export async function runAutomations(
    userId: string,
    negocioId: string,
    disparador: string,
    context: Record<string, any> = {}
): Promise<void> {
    try {
        const rules = await (prisma as any).automationRule.findMany({
            where: { negocioId, disparador, activa: true }
        });

        for (const rule of rules) {
            try {
                const condiciones = rule.condiciones || {};
                const acciones: any[] = rule.acciones || [];

                // Validar condición
                if (disparador === 'RESERVAS_COMPLETADAS' && condiciones.reservasRequeridas) {
                    const count = await prisma.appointment.count({
                        where: { usuarioId: userId, negocioId, estado: 'completed' }
                    });
                    if (count !== condiciones.reservasRequeridas) continue;
                }

                // Ejecutar acciones
                for (const accion of acciones) {
                    await executeAutomationAction(accion, userId, negocioId, context);
                }

                // Log de ejecución
                await (prisma as any).automationLog.create({
                    data: { ruleId: rule.id, negocioId, userId, detalles: JSON.stringify(context), estado: 'OK' }
                });

            } catch (ruleErr: any) {
                await (prisma as any).automationLog.create({
                    data: { ruleId: rule.id, negocioId, userId, detalles: ruleErr.message, estado: 'ERROR' }
                }).catch(() => {});
            }
        }
    } catch (err: any) {
        console.error('[Automatizaciones] Error:', err.message);
    }
}

/**
 * Ejecuta una acción individual de automatización.
 */
async function executeAutomationAction(accion: any, userId: string, negocioId: string, context: any): Promise<void> {
    const user = await prisma.usuario.findUnique({ where: { id: userId }, select: { nombre: true, phone: true } });

    switch (accion.tipo) {
        case 'PUNTOS':
            if (accion.cantidad) {
                await addPoints(userId, negocioId, accion.cantidad, 'BONO', undefined, accion.notas);
            }
            break;

        case 'WHATSAPP':
            if (user?.phone && accion.mensaje) {
                const msg = accion.mensaje.replace('{{nombre}}', user.nombre || 'Cliente');
                await whatsappService.sendWhatsApp(user.phone, msg).catch(() => {});
            }
            break;

        case 'CUPON':
            if (accion.codigo) {
                await (prisma as any).coupon.create({
                    data: {
                        negocioId,
                        codigo: `${accion.codigo}-${userId.substring(0, 6).toUpperCase()}`,
                        tipo: accion.tipoCupon || 'PORCENTAJE',
                        valor: accion.valor || 10,
                        maxUsos: 1,
                        maxUsosPorCliente: 1,
                        fechaFin: accion.diasExpiracion
                            ? new Date(Date.now() + accion.diasExpiracion * 24 * 60 * 60 * 1000)
                            : undefined,
                        activa: true
                    }
                });
            }
            break;

        default:
            console.log(`[Automatizaciones] Tipo de acción no implementado: ${accion.tipo}`);
    }
}

// ─── NOTIFICACIONES ───────────────────────────────────────────────────────────

async function notifyRewardEarned(userId: string, negocioId: string, campaign: any, reward: any): Promise<void> {
    try {
        const user = await prisma.usuario.findUnique({ where: { id: userId }, select: { phone: true, nombre: true } });
        const negocio = await prisma.negocio.findUnique({ where: { id: negocioId }, select: { nombre: true } });

        if (user?.phone) {
            const msg = `🎉 ¡Felicitaciones ${user.nombre || 'Cliente'}! Ganaste una recompensa en ${negocio?.nombre}: *${campaign.valorRecompensa}*. Muestra este mensaje al llegar a tu próxima cita. 🏆`;
            await whatsappService.sendWhatsApp(user.phone, msg).catch(() => {});
        }

        // Crear notificación interna en el Centro de Actividad
        await NotificationService.createNotification({
            negocioId,
            userId,
            tipo: 'PREMIO',
            categoria: 'PREMIOS',
            titulo: '🎁 ¡Felicidades! Ganaste un Premio',
            descripcion: `Has completado el reto y ganaste: ${campaign.valorRecompensa}. Muestra este cupón en el negocio para canjearlo.`,
            icono: 'Gift',
            prioridad: 'SUCCESS',
            recipientType: 'USER',
            actionType: 'VER_PREMIO',
            actionPayload: { screen: 'reward', rewardId: reward.id }
        });
    } catch {}
}

async function notifyOneAway(userId: string, negocioId: string, campaign: any): Promise<void> {
    try {
        const user = await prisma.usuario.findUnique({ where: { id: userId }, select: { phone: true, nombre: true } });
        const negocio = await prisma.negocio.findUnique({ where: { id: negocioId }, select: { nombre: true } });

        if (user?.phone) {
            const msg = `🔥 ¡Ya casi, ${user.nombre || 'Cliente'}! Te falta solo *1 referido* para ganar tu premio en ${negocio?.nombre}: *${campaign.valorRecompensa}*. ¡Sigue así!`;
            await whatsappService.sendWhatsApp(user.phone, msg).catch(() => {});
        }

        // Crear notificación interna en el Centro de Actividad
        await NotificationService.createNotification({
            negocioId,
            userId,
            tipo: 'CAMPANA',
            categoria: 'CAMPANAS',
            titulo: '🔥 ¡Estás a solo 1 paso!',
            descripcion: `Te falta solo 1 recomendado para ganar tu premio: ${campaign.valorRecompensa}. ¡Comparte tu código de referido!`,
            icono: 'Trophy',
            prioridad: 'INFO',
            recipientType: 'USER',
            actionType: 'VER_CAMPANA',
            actionPayload: { screen: 'campaign', campaignId: campaign.id }
        });
    } catch {}
}

// ─── CRON DIARIO ──────────────────────────────────────────────────────────────

/**
 * Tarea programada diaria.
 * - Dispara automatizaciones de cumpleaños.
 * - Dispara automatizaciones de inactividad.
 * - Desactiva campañas/cupones expirados.
 */
export async function runDailyCronJob(): Promise<void> {
    console.log('[Loyalty Cron] Iniciando tarea diaria...');

    try {
        // 1. Automatizaciones de cumpleaños
        await runBirthdayAutomations();

        // 2. Automatizaciones de inactividad
        await runInactivityAutomations();

        // 3. Desactivar campañas expiradas
        await (prisma as any).referralCampaign.updateMany({
            where: { fechaFin: { lt: new Date() }, activa: true },
            data: { activa: false, estado: 'FINALIZADA' }
        });

        // 4. Desactivar cupones expirados
        await (prisma as any).coupon.updateMany({
            where: { fechaFin: { lt: new Date() }, activa: true },
            data: { activa: false }
        });

        console.log('[Loyalty Cron] ✅ Tarea diaria completada.');
    } catch (err: any) {
        console.error('[Loyalty Cron] Error:', err.message);
    }
}

async function runBirthdayAutomations(): Promise<void> {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    // Buscar usuarios con cumpleaños registrado (cast a any para nuevos campos)
    const users = await (prisma as any).usuario.findMany({
        where: { fechaNacimiento: { not: null } },
        select: { id: true, negocioId: true, fechaNacimiento: true }
    });

    for (const u of users) {
        if (!u.fechaNacimiento || !u.negocioId) continue;
        const bday = new Date(u.fechaNacimiento);
        if (bday.getMonth() + 1 === month && bday.getDate() === day) {
            await runAutomations(u.id, u.negocioId, 'CUMPLEANOS', {});
        }
    }
}

async function runInactivityAutomations(): Promise<void> {
    const rules = await (prisma as any).automationRule.findMany({
        where: { disparador: 'INACTIVIDAD', activa: true }
    });

    for (const rule of rules) {
        const dias = rule.condiciones?.diasInactividad || 60;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - dias);

        // Buscar usuarios del negocio que no hayan reservado en los últimos X días
        const inactiveAppointments = await prisma.appointment.findMany({
            where: { negocioId: rule.negocioId, completedAt: { lt: cutoff } },
            distinct: ['usuarioId'],
            select: { usuarioId: true }
        });

        for (const appt of inactiveAppointments) {
            if (!appt.usuarioId) continue;
            // Verificar que no hayan reservado más recientemente
            const recent = await prisma.appointment.count({
                where: { usuarioId: appt.usuarioId, negocioId: rule.negocioId, completedAt: { gte: cutoff } }
            });
            if (recent === 0) {
                await executeAutomationAction(
                    (rule.acciones as any[])[0],
                    appt.usuarioId,
                    rule.negocioId,
                    { diasInactividad: dias }
                );
            }
        }
    }
}
