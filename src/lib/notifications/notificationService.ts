import prisma from '../prisma';
import { EventEmitter } from 'events';
import { whatsappService } from '../whatsapp';
import * as admin from 'firebase-admin';

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
    tipo: 'RESERVA' | 'PROMO' | 'CAMPANA' | 'PREMIO' | 'REFERIDOS' | 'AUTOMATIZACION' | 'NOTICIA' | 'SISTEMA' | 'AVISO' | 'RECORDATORIO';
    categoria: 'RESERVAS' | 'PROMOCIONES' | 'CAMPANAS' | 'PREMIOS' | 'NOTICIAS' | 'SISTEMA' | 'CUPONES';
    titulo: string;
    descripcion: string;
    imagenUrl?: string;
    icono?: string; // Nombre del icono de Lucide (ej: "Coins", "Gift", "Award")
    prioridad?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
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
            recipientType = 'USER',
            actionType,
            actionPayload,
            scheduledFor,
            expiresAt,
            channels = ['APP']
        } = params;

        // Estructura básica de métricas iniciales
        const metricasStr = JSON.stringify({
            enviadas: channels.length,
            entregadas: 0,
            vistas: 0,
            clics: 0
        });

        const actionPayloadStr = actionPayload ? JSON.stringify(actionPayload) : null;

        // 1. Persistir si incluye canal APP o si está programada
        let notification = null;
        if (channels.includes('APP') || scheduledFor) {
            notification = await prisma.notification.create({
                data: {
                    negocioId,
                    userId,
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
        }

        // Si está programada para el futuro, salimos aquí (un cron posterior la despachará)
        if (scheduledFor && scheduledFor.getTime() > Date.now()) {
            return notification;
        }

        // 2. Despachar inmediatamente por canales
        await this.dispatchChannels({
            negocioId,
            userId,
            tipo,
            titulo,
            descripcion,
            notificationId: notification?.id,
            actionType,
            actionPayload,
            channels
        });

        return notification;
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
    }) {
        const { negocioId, userId, tipo, titulo, descripcion, notificationId, actionType, actionPayload, channels } = data;

        // Canal APP: Empujar vía SSE
        if (channels.includes('APP') && notificationId) {
            // Publicar el evento SSE
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
        }

        // Si no hay usuario destinatario, los canales directos (WhatsApp/Push) no aplican de forma individual
        if (!userId) return;

        // Obtener datos del usuario
        const usuario = await prisma.usuario.findUnique({
            where: { id: userId },
            select: { phone: true, email: true }
        });

        if (!usuario) return;

        // Canal WHATSAPP
        if (channels.includes('WHATSAPP') && usuario.phone) {
            try {
                const dest = usuario.phone.replace(/\D/g, '');
                const cleanMsg = `*${titulo}*\n${descripcion}`;
                await whatsappService.sendWhatsApp(dest, cleanMsg, true, 'general');
                this.trackMetricDirectly(notificationId, 'entregadas');
            } catch (err) {
                console.error('[NotificationService] Error enviando WhatsApp:', err);
            }
        }

        // Canal PUSH (Firebase) — se dispara cuando APP o PUSH está seleccionado
        // APP implica notificación interna + push al dispositivo físico
        if (channels.includes('PUSH') || channels.includes('APP')) {
            try {
                const pushTokens = await prisma.pushToken.findMany({
                    where: { userId },
                    select: { token: true }
                });

                if (pushTokens.length > 0 && admin.apps.length > 0) {
                    const tokens = pushTokens.map(t => t.token);
                    await admin.messaging().sendEachForMulticast({
                        tokens,
                        notification: {
                            title: titulo,
                            body: descripcion,
                        },
                        data: {
                            notificationId: notificationId || '',
                            actionType: actionType || '',
                            actionPayload: actionPayload ? JSON.stringify(actionPayload) : '',
                            click_action: 'FLUTTER_NOTIFICATION_CLICK'
                        }
                    });
                    this.trackMetricDirectly(notificationId, 'entregadas');
                }
            } catch (err) {
                console.error('[NotificationService] Error enviando Push Notification:', err);
            }
        }
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
