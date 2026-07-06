import prisma from './prisma';
import { v4 as uuidv4 } from 'uuid';
import { notificationService } from './notifications';
import { sendWhatsAppMessage } from './whatsapp-client';
import { sendUpcomingReminders, sendSubscriptionReminders } from './cron';
import { featureService } from './services/featureService';


export interface WhatsAppMessage {
    id: string; // Message ID from the provider
    from: string;
    body: string;
    timestamp: number;
    bot_number?: string;
    is_from_me?: boolean;
}

export class WhatsAppService {
    private static messageCounts: Map<string, number> = new Map();
    private static lastReset: number = Date.now();
    
    private normalizePhone(phone: string): string {
        let clean = phone.replace(/\D/g, '');
        
        // Si el número empieza con 0 y tiene 10 dígitos (ej: 0959997521), asumimos Ecuador
        if (clean.startsWith('0') && clean.length === 10) {
            clean = '593' + clean.substring(1);
        }

        // Regla específica para Ecuador: 5930... -> 593...
        if (clean.startsWith('5930')) {
            clean = '593' + clean.substring(4);
        }
        
        return clean;
    }

    private async getGlobalConfig(clave: string, defaultValue: string): Promise<string> {
        try {
            const config = await (prisma as any).globalConfig.findUnique({ where: { clave } });
            return config?.valor || defaultValue;
        } catch {
            return defaultValue;
        }
    }

    private checkRateLimit(limit: number): boolean {
        const now = Date.now();
        if (now - WhatsAppService.lastReset > 60000) {
            WhatsAppService.messageCounts.clear();
            WhatsAppService.lastReset = now;
        }
        const totalMessages = Array.from(WhatsAppService.messageCounts.values()).reduce((a, b) => (typeof b === 'number' ? a + b : a), 0);
        return totalMessages < limit;
    }

    private incrementRateLimit(from: string) {
        const current = WhatsAppService.messageCounts.get(from) || 0;
        WhatsAppService.messageCounts.set(from, current + 1);
    }

    async handleIncomingMessage(msg: WhatsAppMessage) {
        const rateLimitMin = parseInt(await this.getGlobalConfig('WA_RATE_LIMIT_MIN', '20'));
        if (!this.checkRateLimit(rateLimitMin)) return null;

        // 1. Control de duplicados
        const alreadyProcessed = await (prisma as any).processedMessage.findUnique({
            where: { message_id: msg.id }
        });
        if (alreadyProcessed) {
            console.log(`[WA] Mensaje ${msg.id} ya procesado, ignorando.`);
            return null;
        }

        const rawBody = msg.body.trim().toLowerCase();
        const body = rawBody.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const from = msg.from;

        // Registrar mensaje procesado
        await (prisma as any).processedMessage.create({
            data: { message_id: msg.id, phone: from }
        });

        // Actualizar última interacción
        try {
            await (prisma as any).usuario.updateMany({
                where: { phone: from },
                data: { last_message_at: new Date() }
            });
        } catch (e) {}

        let actionTaken = "none";
        let responseText = "";

        // REGEX para sistema basado en ID (ej: 1-FZI6, confirmar fzi6)
        const idCommandRegex = /^(1|2|confirmar|cancelar)[\s-]*([a-z0-9]{4})$/i;
        const idMatch = body.match(idCommandRegex);

        if (body === 'activar') {
            responseText = await this.handleActivar(from);
            actionTaken = "activar_notifications";
        } else if (body === 'reservas') {
            responseText = await this.handleReservas(from);
            actionTaken = "list_reservas";
        } else if (body === 'horarios') {
            responseText = await this.handleHorarios(from);
            actionTaken = "check_horarios";
        } else if (body === 'login') {
            responseText = await this.handleLogin(from);
            actionTaken = "generate_login";
        } else if (body === 'ayuda' || body === 'help') {
            responseText = await this.handleAyuda();
            actionTaken = "show_help";
        } else if (idMatch) {
            const action = idMatch[1].toLowerCase();
            const shortId = idMatch[2].toUpperCase();
            const status = (action === '1' || action === 'confirmar') ? 'approved' : 'rejected';
            
            responseText = await this.handleReservaAction(from, status, shortId, msg.bot_number, msg.is_from_me);
            actionTaken = status === 'approved' ? "approve_by_id" : "reject_by_id";
        } else {
            const isSimpleLegacy = /^(1|2|3)$/.test(body);
            if (isSimpleLegacy) {
                // Verificar si es admin antes de responder con formato incorrecto
                const senderUser = await (prisma as any).usuario.findFirst({
                    where: { phone: from },
                    select: { role: true }
                });
                const isAdmin = senderUser && ['ADMIN', 'SUPER_ADMIN', 'ADMIN_NEGOCIO'].includes(senderUser.role);
                if (isAdmin) {
                    responseText = "⚠️ Formato incorrecto. Para gestionar una reserva debes incluir su ID.\nEjemplo: *1-${ID}* para confirmar.";
                }
                // Clientes: silencio total
            } else {
                // Solo responder con 'Comando no reconocido' si es un admin/staff
                const senderUser = await (prisma as any).usuario.findFirst({
                    where: { phone: from },
                    select: { role: true }
                });
                const isAdmin = senderUser && ['ADMIN', 'SUPER_ADMIN', 'ADMIN_NEGOCIO'].includes(senderUser.role);
                if (isAdmin) {
                    responseText = "Comando no reconocido. Escribe *AYUDA* para ver los comandos disponibles.";
                }
                // Clientes normales: no responder nada
            }
            actionTaken = "unknown_command";
        }

        // Auditoría: Registrar en bot_logs
        await (prisma as any).botLog.create({
            data: {
                id: uuidv4(),
                phone: from,
                message_received: msg.body,
                message_sent: responseText,
                action_taken: actionTaken
            }
        });

        return responseText;
    }

    private async handleActivar(phone: string) {
        try {
            const user = await (prisma as any).usuario.findFirst({ where: { phone } });
            if (!user) return "No hemos encontrado una cuenta asociada a este número.";
            await (prisma as any).usuario.update({
                where: { id: user.id },
                data: { whatsapp_notifications: true }
            });
            return "Notificaciones de reservas activadas correctamente.";
        } catch (error) {
            return "Hubo un error al activar las notificaciones.";
        }
    }

    private async handleReservas(phone: string) {
        try {
            const user = await (prisma as any).usuario.findFirst({
                where: { phone },
                include: { negocio: true }
            });
            if (!user?.negocioId) return "No tienes un negocio asociado.";

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const reservas = await (prisma as any).appointment.findMany({
                where: {
                    negocioId: user.negocioId,
                    fecha: { gte: today, lt: tomorrow },
                    estado: 'confirmed'
                },
                include: { service: true },
                orderBy: { horaInicio: 'asc' }
            });

            if (reservas.length === 0) return "No hay citas registradas para hoy.";
            let response = "Citas de hoy 💆\n\n";
            reservas.forEach((r: any) => response += `${r.horaInicio} - ${r.service?.nombre || 'Servicio'}\n`);
            return response;
        } catch (error) {
            return "Error al consultar las reservas.";
        }
    }

    private async handleHorarios(phone: string) {
        try {
            const user = await (prisma as any).usuario.findFirst({ where: { phone } });
            if (!user?.negocioId) return "No autorizado.";

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const canchas = await (prisma as any).service.findMany({ where: { negocioId: user.negocioId } });
            const reservas = await (prisma as any).appointment.findMany({
                where: { negocioId: user.negocioId, fecha: { gte: today, lt: tomorrow }, estado: 'confirmed' }
            });

            const slots = ["08:00", "09:00", "10:00", "11:00", "12:00", "15:00", "16:00", "17:00", "18:00"];
            let response = "Disponibilidad hoy 💆\n\n";
            slots.forEach(slot => {
                const reservedAtSlot = reservas.filter((r: any) => r.horaInicio === slot).length;
                const freeCanchas = canchas.length - reservedAtSlot;
                response += `${slot} - ${freeCanchas > 0 ? `${freeCanchas} libres` : 'ocupado'}\n`;
            });
            return response;
        } catch (error) {
            return "Error al consultar horarios.";
        }
    }

    private async handleLogin(phone: string) {
        try {
            const otpLimit = parseInt(await this.getGlobalConfig('WA_OTP_LIMIT_HOUR', '5'));
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            const recentOtps = await (prisma as any).otpCode.count({
                where: { phone, created_at: { gte: oneHourAgo } }
            });
            if (recentOtps >= otpLimit) return "Has solicitado demasiados códigos. Intenta nuevamente en unos minutos.";

            const user = await (prisma as any).usuario.findFirst({ where: { phone } });
            if (!user) return "Este número no está registrado.";

            if (user?.negocioId) {
                const canUseOtp = await featureService.canUseFeature(user.negocioId, 'whatsapp_otp');
                if (!canUseOtp) {
                    return "❌ Tu plan actual no permite el envío de códigos OTP por WhatsApp. Actualiza a un plan PRO para habilitarlo.";
                }
            }

            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const expiry = new Date(Date.now() + 5 * 60 * 1000);
            await (prisma as any).otpCode.create({
                data: {
                    id: uuidv4(),
                    telefono: phone,
                    businessId: user.negocioId || "",
                    code: otp,
                    expires_at: expiry
                }
            });

            const magicToken = uuidv4();
            await (prisma as any).usuario.update({ where: { id: user.id }, data: { magic_token: magicToken } });
            const magicLink = `https://${process.env.NEXTAUTH_URL || 'tuapp.com'}/login/${magicToken}`;

            return `Tu código de acceso es: ${otp}. Este código expira en 5 minutos.\n\nAccede directamente desde enlace seguro:\n${magicLink}`;
        } catch (error) {
            return "Error al generar el acceso.";
        }
    }

    private async handleAyuda() {
        return `Comandos disponibles:\n\n*ACTIVAR* – notificaciones del negocio\n*RESERVAS* – reservas del día\n*HORARIOS* – disponibilidad\n*LOGIN* – acceder al sistema\n*AYUDA* – mostrar comandos`;
    }

    private async handleReservaAction(from: string, status: 'approved' | 'rejected', shortId: string, bot_number?: string, is_from_me?: boolean) {
        try {
            console.log(`[WA ACTION ID] Remitente: ${from}, ID: ${shortId}, Acción: ${status}, Bot: ${bot_number}, Self: ${is_from_me}`);

            const cleanFrom = from.split(':')[0].replace(/\D/g, '');
            const isBotOwner = !!(bot_number && cleanFrom === bot_number.replace(/\D/g, ''));
            // 1. SEGURIDAD: Validar que el remitente sea administrador
            let myBusinessIds: string[] = [];
            let isAuthorized = false;
            
            // SI ES DESDE EL MISMO BOT (Self-Chat), ES ADMINISTRADOR
            if (is_from_me || isBotOwner) {
                console.log("[WA ACTION] Acción autorizada por ser mensaje propio o del dueño del Bot");
                isAuthorized = true;
                const bPhone = (bot_number || cleanFrom).replace(/\D/g, '').slice(-9);
                const bByBot = await (prisma as any).negocio.findMany({
                    where: { whatsapp: { contains: bPhone } },
                    select: { id: true }
                });
                myBusinessIds = bByBot.map((b: any) => b.id);
            } else {
                const variants = [from, cleanFrom];
                if (cleanFrom.startsWith('593')) {
                    variants.push(cleanFrom.substring(3));
                    variants.push('0' + cleanFrom.substring(3));
                }

                // A) Buscar por rol explícito
                const adminUserRecords = await (prisma as any).usuario.findMany({
                    where: { 
                        phone: { in: variants },
                        role: { in: ['ADMIN', 'STAFF', 'ADMIN_NEGOCIO', 'SUPERADMIN', 'SUPER_ADMIN'] }
                    },
                    select: { negocioId: true }
                });

                // B) VALIDACIÓN DINÁMICA: ¿Es el número oficial de un negocio?
                const phoneSufix = cleanFrom.slice(-8);
                const businessByPhone = await (prisma as any).negocio.findMany({
                    where: { whatsapp: { contains: phoneSufix } },
                    select: { id: true }
                });

                if (adminUserRecords.length > 0 || businessByPhone.length > 0 || from.includes('@lid')) {
                    isAuthorized = true;
                }

                myBusinessIds = [
                    ...adminUserRecords.map(u => u.negocioId),
                    ...businessByPhone.map(b => b.id)
                ].filter(Boolean) as string[];
            }

            // 2. BUSCAR RESERVA POR ID CORTO
            const normalizedShortId = shortId.toUpperCase().replace(/O/g, '0').replace(/I/g, '1');
            const possibleReservations = await (prisma as any).appointment.findMany({
                where: {
                    negocioId: myBusinessIds.length > 0 ? { in: myBusinessIds } : undefined,
                    OR: [
                        { id: { endsWith: shortId.toLowerCase() } },
                        { id: { endsWith: shortId.toUpperCase() } },
                        { id: { endsWith: normalizedShortId.toLowerCase() } },
                        { id: { endsWith: normalizedShortId.toUpperCase() } }
                    ]
                },
                include: { 
                    service: true, 
                    cliente: true, 
                    negocio: true 
                }
            });

            if (possibleReservations.length === 0) {
                return `❌ Reserva #${shortId} no encontrada o no pertenece a tu negocio.`;
            }

            // Seleccionar la reserva (si hay colisión, tomar la pendiente más reciente)
            const reserva = possibleReservations.find((r: any) => r.estado === 'pending') || possibleReservations[0];

            // VALIDACIÓN FINAL DE PERMISOS (Incluyendo PendingReservation de respaldo)
            if (!isAuthorized) {
                const phoneSufix = cleanFrom.slice(-8);
                const hasPending = await (prisma as any).pendingReservation.findFirst({
                    where: {
                        admin_phone: { contains: phoneSufix },
                        reservation_id: reserva.id,
                        status: 'pending'
                    }
                });

                if (!hasPending) {
                    console.log(`[WA AUTH FAIL] Denegado para ${from} (clean: ${cleanFrom}). No es Admin, no es dueño y no hay PendingReservation.`);
                    return "No tienes permisos para realizar esta acción.";
                }
            }

            if (reserva.estado !== 'pending') {
                return `Esta reserva (#${shortId}) ya fue procesada anteriormente. Estado actual: ${reserva.estado.toUpperCase()}`;
            }

            // 3. ACTUALIZAR BASE DE DATOS
            const dbEstado = status === 'approved' ? 'confirmed' : 'cancelled';
            await (prisma as any).appointment.update({ 
                where: { id: reserva.id }, 
                data: { estado: dbEstado } 
            });

            // Limpiar tabla auxiliar de pendientes
            await (prisma as any).pendingReservation.updateMany({
                where: { reservation_id: reserva.id },
                data: { status: 'processed' }
            });

            // 4. NOTIFICAR AL CLIENTE
            const canUseNotifications = await featureService.canUseFeature(reserva.negocioId, 'whatsapp_notifications');
            if (reserva.cliente?.telefono && canUseNotifications) {
                await notificationService.sendBookingConfirmation(
                    reserva.negocioId,
                    reserva.cliente?.nombre || "Cliente",
                    reserva.cliente?.telefono,
                    reserva.fecha,
                    `${reserva.horaInicio} - ${reserva.horaFin}`,
                    reserva.negocio?.nombre || "Negocio",
                    reserva.service?.nombre || "Tratamiento", // Nombre del servicio para el cliente
                    reserva.duracion,
                    status === 'approved',
                    reserva.service?.ubicacion?.direccion || reserva.negocio?.direccion,
                    reserva.service?.ubicacion?.mapUrl,
                    reserva.id,
                    reserva.comentarios // Incluimos los extras para que el cliente los vea
                ).catch(e => console.error("Error al notificar al cliente:", e));
            }

            if (status === 'approved') {
                const clienteNombre = reserva.cliente?.nombre || "Cliente";
                const serviceName = reserva.service?.nombre || "Servicio";
                const horaInicio = reserva.horaInicio || "N/A";
                return `✅ *¡Listo!* La reserva *#${shortId}* de *${clienteNombre}* ha sido *CONFIRMADA*. \n\n✨ Servicio: ${serviceName}\n⏰ Hora: ${horaInicio}\n\nCliente notificado automáticamente. 📲`;
            } else {
                const clienteNombre = reserva.cliente?.nombre || "Cliente";
                return `❌ *Reserva Rechazada* (#${shortId})\n\nLa solicitud de *${clienteNombre}* ha sido cancelada correctamente.`;
            }
        } catch (error: any) {
            console.error(`[WA ERROR] handleReservaAction:`, error);
            return `❌ Ocurrió un error: ${error.message || "Error desconocido"}`;
        }
    }

    async sendWhatsApp(to: string, message: string, isFromBot: boolean = false, tipo: string = 'general') {
        try {
            if (!to) {
                console.error(`[WA SERVICE] Intento de envío a número vacío. Tipo: ${tipo}`);
                return;
            }

            const cleanTo = this.normalizePhone(to);
            
            // Log de depuración detallado
            console.log(`[WA SERVICE] [${tipo.toUpperCase()}] Enviando a: ${cleanTo} (Original: ${to})`);

            // Intentar actualizar last_message_at si el usuario existe (opcional, no bloqueante)
            try {
                const user = await (prisma as any).usuario.findFirst({ where: { phone: { contains: cleanTo.slice(-9) } } });
                if (user) {
                    await (prisma as any).usuario.update({
                        where: { id: user.id },
                        data: { last_message_at: new Date() }
                    });
                }
            } catch (e) {
                // Silencioso, no debe afectar el envío
            }

            this.incrementRateLimit(cleanTo);
            const result = await sendWhatsAppMessage(cleanTo, message, tipo);
            
            if (!result.success) {
                throw new Error(result.error || 'Error desconocido en el bot');
            }
        } catch (error: any) {
            console.error(`[WA] Error enviando a ${to}:`, error.message || error);
            
            // Registrar para reintento
            try {
                await (prisma as any).retryMessage.create({
                    data: {
                        id: uuidv4(),
                        phone: to,
                        message: message,
                        attempts: 0,
                        next_retry_at: new Date(Date.now() + 5 * 60 * 1000)
                    }
                });
            } catch (retryErr) {
                console.error('[WA] Fallo al crear RetryMessage:', retryErr);
            }
        }
    }

    async processRetries() {
        const toRetry = await (prisma as any).retryMessage.findMany({
            where: {
                attempts: { lt: 3 },
                next_retry_at: { lte: new Date() }
            }
        });

        for (const retry of toRetry) {
            try {
                console.log(`[RETRY] Intento ${retry.attempts + 1} para ${retry.phone}`);
                
                const cleanTo = this.normalizePhone(retry.phone);
                const result = await sendWhatsAppMessage(cleanTo, retry.message, 'retry');
                
                if (result.success) {
                    await (prisma as any).retryMessage.delete({ where: { id: retry.id } });
                    console.log(`✅ [RETRY] Éxito para ${retry.phone}`);
                } else {
                    throw new Error(result.error || 'Error en reintento');
                }
            } catch (e: any) {
                const nextAttempts = retry.attempts + 1;
                console.error(`❌ [RETRY] Fallo ${nextAttempts}/3 para ${retry.phone}:`, e.message);
                
                if (nextAttempts >= 3) {
                    await this.sendFallbackNotification(retry.phone, retry.message);
                    await (prisma as any).retryMessage.delete({ where: { id: retry.id } });
                } else {
                    await (prisma as any).retryMessage.update({
                        where: { id: retry.id },
                        data: {
                            attempts: nextAttempts,
                            next_retry_at: new Date(Date.now() + Math.pow(2, nextAttempts) * 5 * 60 * 1000)
                        }
                    });
                }
            }
        }
    }

    private async sendFallbackNotification(phone: string, message: string) {
        try {
            const user = await (prisma as any).usuario.findFirst({ where: { phone } });
            if (user) {
                await notificationService.sendPushToUser(user.id, "Notificación de Spa 💆", message, { type: 'whatsapp_fallback' });
            }
        } catch (e) {
            console.error("[FALLBACK] Error enviando notificación alternativa:", e);
        }
    }

    async notifyNewReserva(reserva: any) {
        const canUseNotifications = await featureService.canUseFeature(reserva.negocioId, 'whatsapp_notifications');
        if (!canUseNotifications) {
            console.log(`[WA SERVICE] Omitiendo notificación de reserva #${reserva.id} para negocio ${reserva.negocioId} (No habilitado en su Plan)`);
            return;
        }

        const negocio = await (prisma as any).negocio.findUnique({
            where: { id: reserva.negocioId },
            select: { nombre: true, whatsapp: true }
        });

        // Buscar si es un referido y obtener la campaña asociada
        const referralEvent = await (prisma as any).referralEvent.findFirst({
            where: { appointmentId: reserva.id },
            include: {
                Campaign: { select: { valorIncentivo: true } },
                Usuario: { select: { nombre: true } } // El que invitó
            }
        });

        let referralMsg = "";
        if (referralEvent) {
            const referidorNombre = referralEvent.Usuario?.nombre || "Un amigo";
            const premioInvitado = referralEvent.Campaign?.valorIncentivo || "Descuento/Regalo";
            referralMsg = `\n\n👥 *Referido por:* ${referidorNombre}\n🎁 *Premio a entregar:* ${premioInvitado}`;
        }

        const shortId = reserva.id.slice(-4).toUpperCase();
        
        // 1. Notificar a administradores del negocio
        const admins = await (prisma as any).usuario.findMany({
            where: { negocioId: reserva.negocioId, whatsapp_notifications: true },
            select: { phone: true }
        });

        const fechaLegible = new Date(reserva.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
        const serviceName = reserva.service?.nombre || reserva.servicio?.nombre || 'Tratamiento Spa';
        
        // Extraer servicios adicionales de los comentarios si existen
        let extrasMsg = "";
        if (reserva.comentarios && reserva.comentarios.includes("Servicios extra:")) {
            const parts = reserva.comentarios.split("Servicios extra:");
            if (parts.length > 1) {
                extrasMsg = `\n➕ *Extras:* ${parts[1].trim()}`;
            }
        }

        const isConfirmedDirectly = reserva.estado === 'confirmed';

        const message = isConfirmedDirectly
            ? `🚨 *NUEVA CITA CONFIRMADA* 💆\n\nID: *#${shortId}*\n\n✨ *Servicio:* ${serviceName}${extrasMsg}\n📅 *Fecha:* ${fechaLegible}\n⏰ *Hora:* ${reserva.horaInicio} - ${reserva.horaFin}\n👤 *Cliente:* ${reserva.cliente?.nombre || 'Cliente'}\n📞 *Tel:* ${reserva.cliente?.telefono || 'N/A'}${referralMsg}\n\n✅ *Estado:* Confirmada directamente (sin tiempo de espera).\n\n_Gestiona tus citas desde el panel admin._`
            : `🚨 *NUEVA CITA RECIBIDA* 💆\n\nID: *#${shortId}*\n\n✨ *Servicio:* ${serviceName}${extrasMsg}\n📅 *Fecha:* ${fechaLegible}\n⏰ *Hora:* ${reserva.horaInicio} - ${reserva.horaFin}\n👤 *Cliente:* ${reserva.cliente?.nombre || 'Cliente'}\n📞 *Tel:* ${reserva.cliente?.telefono || 'N/A'}${referralMsg}\n\n⚠️ Responde con:\n*1-${shortId}* para Confirmar ✅\n*2-${shortId}* para Rechazar ❌\n\n_Gestiona tus citas desde el panel admin._`;

        const uniquePhones = new Set<string>();
        
        // Función limpia para teléfonos (solo quita el +, pero deja el código de país original)
        const cleanPhone = (p: string) => this.normalizePhone(p);

        for (const admin of admins) {
            if (admin.phone) {
                const target = cleanPhone(admin.phone);
                uniquePhones.add(target);
                
                if (!isConfirmedDirectly) {
                    await (prisma as any).pendingReservation.create({
                        data: {
                            id: uuidv4(),
                            admin_phone: admin.phone,
                            reservation_id: reserva.id,
                            status: 'pending'
                        }
                    }).catch(() => {});
                }
                
                await this.sendWhatsApp(admin.phone, message, true, isConfirmedDirectly ? 'confirmacion_cliente' : 'solicitud_reserva');
            }
        }

        // 2. RESPALDO: Asegurar que llegue al whatsapp oficial del negocio
        if (negocio?.whatsapp) {
            const bizPhoneClean = cleanPhone(negocio.whatsapp);
            if (!uniquePhones.has(bizPhoneClean)) {
                if (!isConfirmedDirectly) {
                    await (prisma as any).pendingReservation.create({
                        data: {
                            id: uuidv4(),
                            admin_phone: negocio.whatsapp,
                            reservation_id: reserva.id,
                            status: 'pending'
                        }
                    }).catch(() => {});
                }
                await this.sendWhatsApp(negocio.whatsapp, message, true, isConfirmedDirectly ? 'confirmacion_cliente' : 'solicitud_reserva');
            }
        }
    }

    async checkExpirations() {
        const now = new Date();
        
        // 0. Ejecutar tareas de mantenimiento periódicas
        try {
            await sendUpcomingReminders();
            await sendSubscriptionReminders();
            await this.processRetries();
            // También podemos importar y llamar a expirePromotions de cron.ts si queremos centralizar
            const { expirePromotions } = require('./cron');
            await expirePromotions();
        } catch (err) {
            console.error("[WA SERVICE] Error en tareas de mantenimiento:", err);
        }

        const limitTimeLegacy = new Date(Date.now() - 15 * 60 * 1000); // 15 min fallback
        
        // 1. Buscar reservas cuyo tiempo de expiración ya pasó O son muy antiguas sin expiración definida
        const expiredReservations = await (prisma as any).appointment.findMany({
            where: { 
                estado: 'pending', 
                OR: [
                    { expiresAt: { lt: now } },
                    { 
                        expiresAt: null, 
                        createdAt: { lt: limitTimeLegacy } 
                    }
                ]
            },
            include: { cliente: true }
        });

        if (expiredReservations.length > 0) {
            console.log(`[WA SERVICE] [${now.toISOString()}] Detectadas ${expiredReservations.length} reservas expiradas.`);
        }

        for (const r of expiredReservations) {
            console.log(`[WA SERVICE] Expirando reserva ID: ${r.id} (${r.cliente?.nombre}) - Creada: ${r.createdAt.toISOString()} - Expira: ${r.expiresAt?.toISOString() ?? 'N/A'}`);
            
            await (prisma as any).appointment.update({ 
                where: { id: r.id }, 
                data: { estado: 'expired', expiresAt: now } // Guardamos cuándo expiró
            });

            await (prisma as any).pendingReservation.updateMany({
                where: { reservation_id: r.id, status: 'pending' },
                data: { status: 'processed' }
            });

            if (r.cliente?.telefono) {
                await this.sendWhatsApp(r.cliente.telefono, "Tu solicitud de reserva expiró porque el establecimiento no respondió a tiempo. Puedes intentarlo de nuevo.", true, 'expirada');
            }

            // Notificar también al negocio que una cita expiró
            try {
                const biz = await (prisma as any).negocio.findUnique({
                    where: { id: r.negocioId },
                    select: { whatsapp: true, nombre: true }
                });
                if (biz?.whatsapp) {
                    const shortId = r.id.slice(-4).toUpperCase();
                    const bizMsg = `⚠️ *Cita Expirada* 💆\n\nLa solicitud de *${r.cliente?.nombre || 'Cliente'}* (#${shortId}) ha expirado porque no fue procesada a tiempo.\n\nRecuerda revisar tus notificaciones para no perder clientes. 📲`;
                    await this.sendWhatsApp(biz.whatsapp, bizMsg, true, 'expirada_negocio');
                }
            } catch (err) {
                console.error("[WA SERVICE] Error al notificar expiración al negocio:", err);
            }
        }
    }
}

export const whatsappService = new WhatsAppService();

// Registrar manejador global para el Bot de Baileys
if (typeof global !== 'undefined') {
    (global as any).onWhatsAppMessage = (msg: WhatsAppMessage) => whatsappService.handleIncomingMessage(msg);
}
