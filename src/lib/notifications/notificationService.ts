import prisma from '../prisma';
import { EventEmitter } from 'events';
import { whatsappService } from '../whatsapp';
import * as admin from 'firebase-admin';
import { initFirebaseAdmin } from '../notifications';

// Bus global de eventos SSE en memoria único
const globalSse = global as any;
if (!globalSse.sseEmitter) {
    globalSse.sseEmitter = new EventEmitter();
    globalSse.sseEmitter.setMaxListeners(200); // Evitar advertencias de límite de listeners
}
export const sseEmitter: EventEmitter = globalSse.sseEmitter;

export interface CreateNotificationParams {
    negocioId: string;
    userId?: string; // Opcional (ej: si es una promo masiva o noticia global)
    tipo: 'RESERVA' | 'PROMO' | 'CAMPANA' | 'PREMIO' | 'REFERIDOS' | 'AUTOMATIZACION' | 'NOTICIA' | 'SISTEMA' | 'AVISO' | 'RECORDATORIO' | 'RESERVA_CREADA'; // Permitiendo RESERVA_CREADA para compatibilidad
    categoria: 'RESERVAS' | 'PROMOCIONES' | 'CAMPANAS' | 'PREMIOS' | 'NOTICIAS' | 'SISTEMA' | 'CUPONES';
    titulo: string;
    descripcion: string;
    imagenUrl?: string;
    icono?: string; // Nombre del icono de Lucide (ej: "Coins", "Gift", "Award")
    prioridad?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'; // Prioridad de despacho/FCM
    recipientType?: 'ALL' | 'USER' | 'SEGMENT' | 'VIP' | 'INACTIVE' | 'NEW_CLIENTS';
    actionType?: 'VER_RESERVA' | 'VER_CAMPANA' | 'VER_PROMO' | 'VER_PREMIO' | 'VER_PERFIL' | 'ABRIR_URL' | 'CUSTOM';
    actionPayload?: any; // JSON stringificable
    scheduledFor?: Date;
    expiresAt?: Date;
    channels?: ('APP' | 'PUSH' | 'WHATSAPP' | 'EMAIL' | 'SMS')[];
}

export class NotificationService {
    /**
     * Crear y despachar una notificación multi-canal
     */
    static async createNotification(params: CreateNotificationParams) {
        const {
            negocioId,
            userId,
            tipo,
            categoria,
            titulo,
            descripcion,
            imagenUrl,
            icono,
            prioridad = 'INFO',
            priority = 'NORMAL',
            recipientType = 'USER',
            actionType,
            actionPayload,
            scheduledFor,
            expiresAt,
            channels = ['APP']
        } = params;

        console.log(`[PUSH-AUDIT][PASO 1] createNotification() invocado`, {
            negocioId,
            userId: userId || '(sin userId - será para admins)',
            tipo,
            titulo,
            channels,
            priority
        });

        // Estructura básica de métricas iniciales
        const metricasStr = JSON.stringify({
            enviadas: channels.length,
            entregadas: 0,
            vistas: 0,
            clics: 0
        });

        const actionPayloadStr = actionPayload ? (typeof actionPayload === 'string' ? actionPayload : JSON.stringify(actionPayload)) : null;

        // 1. Persistir si incluye canal APP o si está programada
        let notification = null;
        if (channels.includes('APP') || scheduledFor) {
            console.log(`[PUSH-AUDIT][PASO 2] Persistiendo notificación en BD (canal APP detectado)...`);
            notification = await prisma.notification.create({
                data: {
                    negocioId,
                    userId: userId || null,
                    tipo,
                    categoria,
                    titulo,
                    descripcion,
                    imagenUrl,
                    icono,
                    prioridad,
                    recipientType,
                    actionType,
                    actionPayload: actionPayloadStr,
                    metricas: metricasStr,
                    scheduledFor,
                    expiresAt,
                    leida: false,
                    archived: false
                }
            });
            console.log(`[PUSH-AUDIT][PASO 2] Notificación persistida en BD con ID: ${notification?.id}`);
        } else {
            console.log(`[PUSH-AUDIT][PASO 2] Canal APP no incluido y sin scheduledFor → NO se persiste en BD.`);
        }

        // Si está programada para el futuro, salimos aquí (un cron posterior la despachará)
        if (scheduledFor && scheduledFor.getTime() > Date.now()) {
            return notification;
        }

        // 2. Encolar/Despachar en segundo plano (arquitectura desacoplada)
        console.log(`[PUSH-AUDIT][PASO 3] Llamando a enqueueNotificationDispatch() con channels=[${channels.join(', ')}]`);
        await this.enqueueNotificationDispatch({
            negocioId,
            userId,
            tipo,
            titulo,
            descripcion,
            notificationId: notification?.id,
            actionType,
            actionPayload,
            channels,
            priority
        });
        console.log(`[PUSH-AUDIT][PASO 3] enqueueNotificationDispatch() lanzado en segundo plano.`);

        return notification;
    }

    /**
     * Encolar o despachar en segundo plano el procesamiento de canales
     * (Abstracción desacoplada lista para BullMQ en el futuro)
     */
    private static async enqueueNotificationDispatch(data: {
        negocioId: string;
        userId?: string;
        tipo: string;
        titulo: string;
        descripcion: string;
        notificationId?: string;
        actionType?: string;
        actionPayload?: any;
        channels: string[];
        priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    }) {
        // Ejecutar de forma asíncrona no bloqueante
        console.log(`[PUSH-AUDIT][PASO 4] enqueueNotificationDispatch() → lanzando dispatchChannels() de forma no bloqueante.`);
        this.dispatchChannels(data).catch(err => {
            console.error('[PUSH-AUDIT][PASO 4][ERROR] dispatchChannels() falló con error:', err);
        });
    }

    /**
     * Dispatcher por cada canal
     */
    private static async dispatchChannels(data: {
        negocioId: string;
        userId?: string;
        tipo: string;
        titulo: string;
        descripcion: string;
        notificationId?: string;
        actionType?: string;
        actionPayload?: any;
        channels: string[];
        priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    }) {
        const { negocioId, userId, tipo, titulo, descripcion, notificationId, actionType, actionPayload, channels, priority } = data;
        const startTime = Date.now();

        console.log(`[PUSH-AUDIT][PASO 5] dispatchChannels() iniciado. Canales a procesar: [${channels.join(', ')}]`);

        // 1. Obtener datos del negocio (siempre necesario para slug/nombre)
        const negocio = await prisma.negocio.findUnique({
            where: { id: negocioId },
            select: { slug: true, nombre: true }
        });
        if (!negocio) {
            console.warn(`[PUSH-AUDIT][PASO 5][ABORT] Negocio ID ${negocioId} no encontrado en BD. Despacho cancelado.`);
            return;
        }
        console.log(`[PUSH-AUDIT][PASO 5] Negocio encontrado: ${negocio.nombre} (slug: ${negocio.slug})`);

        // Calcular la ruta de destino/enlace
        let targetPath = '';
        if (actionType) {
            targetPath = actionPayload?.url || '';
            if (!targetPath) {
                if (actionType === 'VER_CAMPANA') targetPath = '/referidos';
                else if (actionType === 'VER_RESERVA') targetPath = '/mis-reservas';
                else if (actionType === 'VER_PERFIL') {
                    if (actionPayload?.screen === 'notifications') targetPath = '/notificaciones';
                    else targetPath = '/perfil';
                }
            }
        }

        // --- CANAL APP (SSE) ---
        if (channels.includes('APP') && notificationId) {
            try {
                this.publishRealtime(negocioId, userId || 'ALL', {
                    tipoEvento: 'NOTIFICATION',
                    payload: {
                        id: notificationId,
                        tipo,
                        titulo,
                        descripcion,
                        actionType,
                        actionPayload
                    }
                });
            } catch (sseErr) {
                console.error('[Notification] Error publicando evento SSE:', sseErr);
            }
        }

        // --- CANAL WHATSAPP ---
        if (channels.includes('WHATSAPP') && userId) {
            try {
                const usuario = await prisma.usuario.findUnique({
                    where: { id: userId },
                    select: { phone: true }
                });

                if (usuario && usuario.phone) {
                    const dest = usuario.phone.replace(/\D/g, '');
                    let cleanMsg = `*${titulo}*\n${descripcion}`;
                    
                    if (targetPath) {
                        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://citiox.com';
                        const fullUrl = targetPath.startsWith('http') ? targetPath : `${baseUrl}/${negocio.slug}${targetPath}`;
                        cleanMsg += `\n\n👉 Entra aquí: ${fullUrl}`;
                    }

                    await whatsappService.sendWhatsApp(dest, cleanMsg, true, 'general');
                    this.trackMetricDirectly(notificationId, 'entregadas');
                }
            } catch (err) {
                console.error('[Notification] Error enviando WhatsApp:', err);
            }
        }

        // --- CANAL PUSH (FIREBASE FCM) ---
        let totalTokensSent = 0;
        let pushSuccessCount = 0;
        let pushFailureCount = 0;

        console.log(`[PUSH-AUDIT][PASO 6] Verificando si se debe procesar canal PUSH. channels=[${channels.join(', ')}] → includes('PUSH')=${channels.includes('PUSH')}, includes('APP')=${channels.includes('APP')}`);

        if (channels.includes('PUSH') || channels.includes('APP')) {
            console.log(`[PUSH-AUDIT][PASO 6] ✅ Canal PUSH/APP detectado → entrando al bloque de Firebase FCM.`);
            try {
                // Obtener tokens FCM de destino
                let pushTokens: { token: string }[] = [];
                
                if (userId) {
                    // Si hay un usuario específico, buscar sus tokens
                    console.log(`[PUSH-AUDIT][PASO 7] Modo USER → buscando tokens FCM para userId=${userId}`);
                    pushTokens = await prisma.pushToken.findMany({
                        where: { userId },
                        select: { token: true }
                    });
                    console.log(`[PUSH-AUDIT][PASO 7] Tokens encontrados para usuario: ${pushTokens.length}`);
                } else {
                    // Si no hay usuario específico, es una notificación del negocio (ej: nueva reserva para los admins)
                    console.log(`[PUSH-AUDIT][PASO 7] Modo NEGOCIO (sin userId) → buscando admins del negocio ${negocioId}`);
                    // 1. Obtener todos los usuarios con rol ADMIN asociados al negocio
                    const admins = await prisma.usuario.findMany({
                        where: { negocioId, role: 'ADMIN' },
                        select: { id: true }
                    });
                    const adminIds = admins.map(a => a.id);
                    console.log(`[PUSH-AUDIT][PASO 7] Admins encontrados: ${admins.length} → IDs: [${adminIds.slice(0,5).join(', ')}${adminIds.length > 5 ? '...' : ''}]`);

                    if (adminIds.length > 0) {
                        // 2. Buscar los tokens de esos administradores
                        pushTokens = await prisma.pushToken.findMany({
                            where: { userId: { in: adminIds } },
                            select: { token: true }
                        });
                        console.log(`[PUSH-AUDIT][PASO 7] Tokens de admins encontrados: ${pushTokens.length}`);
                    } else {
                        console.warn(`[PUSH-AUDIT][PASO 7][WARN] No se encontraron admins con role='ADMIN' para negocio ${negocioId}`);
                    }

                    // 3. Obtener tokens asociados directamente al negocio en la tabla PushToken
                    const businessTokens = await prisma.pushToken.findMany({
                        where: { businessId: negocioId },
                        select: { token: true }
                    });
                    console.log(`[PUSH-AUDIT][PASO 7] Tokens directos del negocio (businessId): ${businessTokens.length}`);

                    // Unificar tokens y quitar duplicados
                    const allTokens = [...pushTokens, ...businessTokens];
                    const uniqueTokensMap = new Map();
                    allTokens.forEach(t => {
                        if (t.token) uniqueTokensMap.set(t.token, t);
                    });
                    pushTokens = Array.from(uniqueTokensMap.values());
                    console.log(`[PUSH-AUDIT][PASO 7] Total tokens únicos (admins + negocio): ${pushTokens.length}`);
                }

                // Filtrar tokens nulos, vacíos o no string
                const validTokens = pushTokens
                    .map(t => t.token)
                    .filter(t => typeof t === 'string' && t.trim().length > 0);

                totalTokensSent = validTokens.length;
                console.log(`[PUSH-AUDIT][PASO 8] Tokens válidos (no nulos/vacíos) listos para envío: ${validTokens.length}`);
                if (validTokens.length === 0) {
                    console.warn(`[PUSH-AUDIT][PASO 8][WARN] ⚠️ CERO tokens válidos. No se enviará ningún push. Verifica que los dispositivos hayan registrado su token FCM en la tabla PushToken.`);
                } else {
                    console.log(`[PUSH-AUDIT][PASO 8] Primeros tokens (prefijo): ${validTokens.slice(0, 3).map(t => t.substring(0, 20) + '...').join(' | ')}`);
                }

                if (validTokens.length > 0) {
                    console.log(`[PUSH-AUDIT][PASO 9] Inicializando Firebase Admin...`);
                    await initFirebaseAdmin();
                    console.log(`[PUSH-AUDIT][PASO 9] Firebase Admin apps activas: ${admin.apps.length}`);

                    if (admin.apps.length > 0) {
                        console.log(`[PUSH-AUDIT][PASO 9] ✅ Firebase Admin inicializado correctamente.`);
                        const pushLink = targetPath ? (targetPath.startsWith('http') ? targetPath : `/${negocio.slug}${targetPath}`) : `/${negocio.slug}`;
                        
                        // Configurar prioridades FCM
                        // Las reservas (nueva, cancelada), check-in y pagos se priorizan automáticamente
                        const isHighPriority = priority === 'HIGH' || priority === 'URGENT' || 
                            ['RESERVA', 'RESERVA_CREADA', 'check_in'].includes(tipo) || 
                            titulo.toLowerCase().includes('reserva') || 
                            titulo.toLowerCase().includes('pago');

                        const androidConfig: admin.messaging.AndroidConfig = {
                            priority: isHighPriority ? 'high' : 'normal'
                        };

                        const apnsConfig: admin.messaging.ApnsConfig = {
                            payload: {
                                aps: {
                                    sound: 'default',
                                    badge: 1,
                                    contentAvailable: true
                                }
                            },
                            headers: {
                                'apns-priority': isHighPriority ? '10' : '5'
                            }
                        };

                        const clickAction = 'FLUTTER_NOTIFICATION_CLICK';
                        const dataPayload: Record<string, string> = {
                            notificationId: notificationId || '',
                            actionType: actionType || '',
                            actionPayload: actionPayload ? (typeof actionPayload === 'string' ? actionPayload : JSON.stringify(actionPayload)) : '',
                            click_action: clickAction,
                            link: pushLink
                        };

                        // Aplanar variables del actionPayload para retrocompatibilidad
                        if (actionPayload && typeof actionPayload === 'object') {
                            Object.keys(actionPayload).forEach(key => {
                                if (actionPayload[key] !== undefined && actionPayload[key] !== null) {
                                    dataPayload[key] = String(actionPayload[key]);
                                }
                            });
                        }

                        console.log(`[PUSH-AUDIT][PASO 10] Llamando a admin.messaging().sendEachForMulticast() con ${validTokens.length} token(s)...`);
                        const response = await admin.messaging().sendEachForMulticast({
                            tokens: validTokens,
                            notification: {
                                title: titulo,
                                body: descripcion
                            },
                            data: dataPayload,
                            android: androidConfig,
                            apns: apnsConfig
                        });

                        pushSuccessCount = response.successCount;
                        pushFailureCount = response.failureCount;
                        console.log(`[PUSH-AUDIT][PASO 11] Respuesta de Firebase FCM:`, {
                            successCount: response.successCount,
                            failureCount: response.failureCount,
                            responses: response.responses.map((r, i) => ({
                                token: validTokens[i]?.substring(0, 20) + '...',
                                success: r.success,
                                messageId: r.messageId || null,
                                errorCode: r.error?.code || null,
                                errorMessage: r.error?.message || null
                            }))
                        });

                        // Limpieza de tokens inválidos u obsoletos en segundo plano
                        response.responses.forEach(async (res, index) => {
                            const currentToken = validTokens[index];
                            if (!res.success && res.error) {
                                const error = res.error;
                                const errCode = error.code;
                                const errMsg = error.message || '';

                                if (
                                    errCode === 'messaging/registration-token-not-registered' ||
                                    errCode === 'messaging/invalid-registration-token' ||
                                    errMsg.includes('not-registered') ||
                                    errMsg.includes('invalid')
                                ) {
                                    await prisma.pushToken.delete({
                                        where: { token: currentToken }
                                    }).catch(() => {});
                                    console.log(`[Notification] Token obsoleto limpiado de la base de datos: ${currentToken.substring(0, 15)}...`);
                                }
                            }
                        });

                        if (pushSuccessCount > 0) {
                            this.trackMetricDirectly(notificationId, 'entregadas');
                        }
                    } else {
                        console.error(`[PUSH-AUDIT][PASO 9][ERROR] ⛔ Firebase Admin NO está inicializado (admin.apps.length=0). Verifica credenciales FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY en las variables de entorno o en GlobalConfig de la BD.`);
                    }
                }
            } catch (err) {
                console.error('[PUSH-AUDIT][PASO 10][ERROR] ⛔ Error crítico en el canal PUSH (Firebase):', err);
            }
        }

        const duration = Date.now() - startTime;

        console.log(`[PUSH-AUDIT][PASO 12] ✅ dispatchChannels() completado.`, {
            tipo,
            destino: userId ? `Usuario (${userId})` : `Negocio (${negocioId} - admins)`,
            canales: channels.join(', '),
            pushTokensEncontrados: totalTokensSent,
            pushExitosos: pushSuccessCount,
            pushFallidos: pushFailureCount,
            duracionMs: duration
        });
    }

    /**
     * Sincronización SSE en Tiempo Real
     */
    static publishRealtime(negocioId: string, targetUserId: string, eventData: { tipoEvento: string; payload: any }) {
        sseEmitter.emit('realtime_event', {
            negocioId,
            userId: targetUserId,
            data: eventData
        });
    }

    /**
     * Marcar una notificación como leída
     */
    static async markAsRead(id: string) {
        return prisma.notification.update({
            where: { id },
            data: {
                leida: true,
                fechaLectura: new Date()
            }
        });
    }

    /**
     * Marcar todas las notificaciones como leídas para un usuario
     */
    static async markAllAsRead(userId: string, negocioId: string) {
        return prisma.notification.updateMany({
            where: {
                userId,
                negocioId,
                leida: false,
                archived: false
            },
            data: {
                leida: true,
                fechaLectura: new Date()
            }
        });
    }

    /**
     * Archivar o eliminar de vista una notificación
     */
    static async archiveNotification(id: string) {
        return prisma.notification.update({
            where: { id },
            data: { archived: true }
        });
    }

    /**
     * Eliminar físicamente una notificación
     */
    static async deleteNotification(id: string) {
        return prisma.notification.delete({
            where: { id }
        });
    }

    /**
     * Obtener cantidad de no leídas
     */
    static async getUnreadCount(userId: string, negocioId: string): Promise<number> {
        return prisma.notification.count({
            where: {
                negocioId,
                userId,
                leida: false,
                archived: false,
                OR: [
                    { scheduledFor: null },
                    { scheduledFor: { lte: new Date() } }
                ]
            }
        });
    }

    /**
     * Obtener historial con filtros de categoría y buscador
     */
    static async getNotifications(filters: {
        negocioId: string;
        userId: string;
        categoria?: string;
        search?: string;
        page?: number;
        limit?: number;
    }) {
        const { negocioId, userId, categoria, search, page = 1, limit = 15 } = filters;
        const skip = (page - 1) * limit;

        const whereClause: any = {
            negocioId,
            userId,
            archived: false,
            OR: [
                { scheduledFor: null },
                { scheduledFor: { lte: new Date() } }
            ]
        };

        if (categoria && categoria !== 'TODAS') {
            whereClause.categoria = categoria;
        }

        if (search) {
            whereClause.OR = [
                { titulo: { contains: search } },
                { descripcion: { contains: search } }
            ];
        }

        const items = await prisma.notification.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit
        });

        const total = await prisma.notification.count({
            where: whereClause
        });

        return {
            items,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Incrementar métricas de clicks/vistas de forma dinámica
     */
    static async trackMetric(id: string, metricName: 'vistas' | 'clics') {
        const notif = await prisma.notification.findUnique({
            where: { id },
            select: { metricas: true }
        });

        if (!notif) return;

        let metricsObj = { enviadas: 1, entregadas: 1, vistas: 0, clics: 0 };
        try {
            if (notif.metricas) {
                metricsObj = JSON.parse(notif.metricas);
            }
        } catch {}

        if (metricName === 'vistas') {
            metricsObj.vistas = (metricsObj.vistas || 0) + 1;
        } else if (metricName === 'clics') {
            metricsObj.clics = (metricsObj.clics || 0) + 1;
        }

        await prisma.notification.update({
            where: { id },
            data: { metricas: JSON.stringify(metricsObj) }
        });
    }

    /**
     * Auxiliar interno para métricas inmediatas
     */
    private static async trackMetricDirectly(id: string | undefined, metricName: 'entregadas' | 'vistas' | 'clics') {
        if (!id) return;
        try {
            const notif = await prisma.notification.findUnique({
                where: { id },
                select: { metricas: true }
            });
            if (!notif) return;
            let metricsObj = { enviadas: 1, entregadas: 0, vistas: 0, clics: 0 };
            try {
                if (notif.metricas) metricsObj = JSON.parse(notif.metricas);
            } catch {}
            metricsObj[metricName] = (metricsObj[metricName] || 0) + 1;
            await prisma.notification.update({
                where: { id },
                data: { metricas: JSON.stringify(metricsObj) }
            });
        } catch {}
    }
}
