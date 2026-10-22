import prisma from '@/lib/prisma';
import { EventEmitter } from 'events';

/**
 * Servicio Desacoplado de Notificaciones Multicanal (WhatsApp, Push, Email)
 * Clean Architecture - Event Driven System
 */

export type NotificationEvent =
    | 'COMPROBANTE_RECIBIDO'
    | 'PAGO_CONFIRMADO'
    | 'PAGO_RECHAZADO'
    | 'PEDIDO_EN_PREPARACION'
    | 'PEDIDO_ENVIADO'
    | 'PEDIDO_ENTREGADO';

export interface NotificationPayload {
    event: NotificationEvent;
    negocioId: string;
    pedidoId: string;
    paymentId?: string;
    monto: number;
    telefonoCliente: string;
    nombreCliente: string;
    motivo?: string;
}

export class NotificationService {
    /**
     * Emite un evento de notificación a través de todos los proveedores activos
     */
    static async notify(payload: NotificationPayload) {
        console.log(`[NotificationService Event]: ${payload.event}`, {
            pedidoId: payload.pedidoId,
            monto: payload.monto,
            cliente: payload.nombreCliente,
            telefono: payload.telefonoCliente
        });

        try {
            // 1. Canal WhatsApp
            await this.sendWhatsAppMessage(payload);

            // 2. Canal Push Notifications (si está configurado)
            await this.sendPushNotification(payload);
        } catch (error) {
            console.error(`[NotificationService Error] Fallo al enviar notificación:`, error);
        }
    }

    private static async sendWhatsAppMessage(payload: NotificationPayload) {
        let text = '';
        switch (payload.event) {
            case 'COMPROBANTE_RECIBIDO':
                text = `Hola ${payload.nombreCliente}, hemos recibido tu comprobante de pago por $${payload.monto.toFixed(2)} para el pedido #${payload.pedidoId.slice(0, 8)}. Está en proceso de verificación.`;
                break;
            case 'PAGO_CONFIRMADO':
                text = `¡Excelente noticias ${payload.nombreCliente}! Tu pago por $${payload.monto.toFixed(2)} ha sido CONFIRMADO con éxito.`;
                break;
            case 'PAGO_RECHAZADO':
                text = `Hola ${payload.nombreCliente}, lamentablemente tu comprobante para el pedido #${payload.pedidoId.slice(0, 8)} ha sido rechazado. Motivo: ${payload.motivo || 'Comprobante no legible o incorrecto'}. Por favor sube un nuevo comprobante en 'Mis Pedidos'.`;
                break;
            case 'PEDIDO_EN_PREPARACION':
                text = `🔥 ¡Tu pedido en Pinchos ha ingresado a producción! Estamos preparando tus pinchos con la máxima calidad.`;
                break;
            case 'PEDIDO_ENVIADO':
                text = `🛵 Tu pedido #${payload.pedidoId.slice(0, 8)} ya está en ruta hacia tu dirección.`;
                break;
            case 'PEDIDO_ENTREGADO':
                text = `🎉 ¡Tu pedido ha sido entregado! ¡Que disfrutes de tus pinchos! Gracias por preferirnos.`;
                break;
        }

        if (text) {
            // Simulación / Integración con el Bot de WhatsApp existente de Citiox
            console.log(`[WhatsApp Outbound -> ${payload.telefonoCliente}]: ${text}`);
        }
    }

    private static async sendPushNotification(payload: NotificationPayload) {
        // Integrable con Web Push / Firebase Tokens
        console.log(`[Push Notification Event -> ${payload.event}] Dispatch for client ${payload.nombreCliente}`);
    }

    /**
     * Crea y persiste una notificación en la base de datos, despachándola por SSE y Push
     */
    static async createNotification(params: {
        negocioId: string;
        userId?: string | null;
        clienteId?: string | null;
        telefonoCliente?: string | null;
        tipo: string;
        categoria: string;
        titulo: string;
        descripcion: string;
        imagenUrl?: string | null;
        icono?: string | null;
        prioridad?: string;
        priority?: string;
        recipientType?: string;
        actionType?: string | null;
        actionPayload?: any;
        channels?: string[];
        scheduledFor?: Date | null;
        expiresAt?: Date | null;
    }): Promise<any> {
        try {
            const {
                negocioId,
                clienteId,
                telefonoCliente,
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
                channels = ['APP'],
                scheduledFor,
                expiresAt
            } = params;

            let finalUserId: string | null = params.userId || null;

            // Si no viene userId pero viene teléfono o clienteId, intentar resolver el Usuario
            if (!finalUserId && (telefonoCliente || clienteId)) {
                try {
                    const phoneToSearch = telefonoCliente;
                    if (clienteId) {
                        const cliente = await prisma.cliente.findUnique({
                            where: { id: clienteId },
                            select: { telefono: true }
                        });
                        if (cliente?.telefono) {
                            const cleanPhone = cliente.telefono.replace(/\D/g, '');
                            const user = await prisma.usuario.findFirst({
                                where: {
                                    negocioId,
                                    OR: [
                                        { phone: cliente.telefono },
                                        { phone: cleanPhone },
                                        { phone: `+${cleanPhone}` }
                                    ]
                                },
                                select: { id: true }
                            });
                            if (user) finalUserId = user.id;
                        }
                    }

                    if (!finalUserId && phoneToSearch) {
                        const cleanPhone = phoneToSearch.replace(/\D/g, '');
                        const user = await prisma.usuario.findFirst({
                            where: {
                                negocioId,
                                OR: [
                                    { phone: phoneToSearch },
                                    { phone: cleanPhone },
                                    { phone: `+${cleanPhone}` }
                                ]
                            },
                            select: { id: true }
                        });
                        if (user) finalUserId = user.id;
                    }
                } catch (resolveErr) {
                    console.warn('[NotificationService] No se pudo resolver usuario previo:', resolveErr);
                }
            }

            // Sanitizar actionPayload como JSON string
            let payloadStr: string | null = null;
            if (actionPayload) {
                payloadStr = typeof actionPayload === 'string' ? actionPayload : JSON.stringify(actionPayload);
            }

            // Persistir en Base de Datos
            const created = await prisma.notification.create({
                data: {
                    negocioId,
                    userId: finalUserId,
                    tipo: tipo || 'SISTEMA',
                    categoria: (categoria || 'SISTEMA').toUpperCase(),
                    titulo,
                    descripcion,
                    imagenUrl: imagenUrl || null,
                    icono: icono || null,
                    prioridad: prioridad || 'INFO',
                    recipientType: recipientType || (finalUserId ? 'USER' : 'ALL'),
                    actionType: actionType || null,
                    actionPayload: payloadStr,
                    leida: false,
                    archived: false,
                    scheduledFor: scheduledFor || null,
                    expiresAt: expiresAt || null
                }
            });

            console.log(`[NotificationService] Notificación creada id=${created.id} tipo=${created.tipo} categoria=${created.categoria} userId=${finalUserId || 'GLOBAL'}`);

            // Despachar en tiempo real a clientes conectados vía SSE
            this.publishRealtime(negocioId, finalUserId || 'ALL', {
                tipoEvento: 'NOTIFICATION',
                payload: {
                    ...created,
                    createdAt: created.createdAt.toISOString()
                }
            });

            // Enviar Push FCM a través de tokens si el canal PUSH está solicitado y hay usuario
            if (channels.includes('PUSH') && finalUserId) {
                try {
                    const { NotificationService: LegacyService } = await import('@/lib/notifications');
                    const legacy = new LegacyService();
                    await legacy.sendPushToUser(finalUserId, titulo, descripcion, {
                        notificationId: created.id,
                        actionType: actionType || '',
                        actionPayload: payloadStr || ''
                    });
                } catch (pushErr: any) {
                    console.warn('[NotificationService] Push delivery warning:', pushErr.message);
                }
            }

            return created;
        } catch (error: any) {
            console.error('[NotificationService.createNotification Error]:', error);
            return null;
        }
    }

    /**
     * Obtiene el listado de notificaciones para el cliente y/o negocio con soporte de filtros
     */
    static async getNotifications(params: {
        negocioId: string;
        userId?: string | null;
        categoria?: string;
        search?: string;
        page?: number;
        limit?: number;
    }): Promise<{ items: any[]; total: number; pagination: any }> {
        try {
            const { negocioId, userId, categoria, search, page = 1, limit = 15 } = params;

            const where: any = {
                negocioId,
                archived: false
            };

            // Filtrado de audiencia: notificaciones dirigidas al usuario O globales de la marca
            if (userId) {
                where.OR = [
                    { userId },
                    { recipientType: 'ALL' },
                    { userId: null }
                ];
            } else {
                where.OR = [
                    { recipientType: 'ALL' },
                    { userId: null }
                ];
            }

            // Normalización y agrupación de categorías según tipo de negocio
            if (categoria && categoria !== 'TODAS') {
                const upperCat = categoria.toUpperCase();
                if (upperCat === 'ORDENES' || upperCat === 'PEDIDOS') {
                    where.categoria = { in: ['ORDENES', 'PEDIDOS', 'ORDEN', 'PEDIDO'] };
                } else if (upperCat === 'CITAS' || upperCat === 'RESERVAS') {
                    where.categoria = { in: ['CITAS', 'RESERVAS', 'CITA', 'RESERVA'] };
                } else if (upperCat === 'PROMOCIONES' || upperCat === 'PROMO' || upperCat === 'OFERTAS') {
                    where.categoria = { in: ['PROMOCIONES', 'PROMO', 'PROMOS', 'OFERTAS'] };
                } else if (upperCat === 'PREMIOS' || upperCat === 'CUPONES' || upperCat === 'CAMPANAS') {
                    where.categoria = { in: ['PREMIOS', 'PREMIO', 'CUPONES', 'CUPON', 'CAMPANAS', 'CAMPANA'] };
                } else if (upperCat === 'COMUNICACIONES' || upperCat === 'NOTICIAS' || upperCat === 'AVISOS') {
                    where.categoria = { in: ['COMUNICACIONES', 'NOTICIAS', 'AVISOS', 'NOTICIA', 'AVISO', 'SISTEMA'] };
                } else if (upperCat === 'MEMBRESIAS') {
                    where.categoria = { in: ['MEMBRESIAS', 'MEMBRESIA', 'PLANES'] };
                } else {
                    where.categoria = upperCat;
                }
            }

            // Búsqueda por texto en título o descripción
            if (search && search.trim() !== '') {
                const searchCondition = {
                    OR: [
                        { titulo: { contains: search } },
                        { descripcion: { contains: search } }
                    ]
                };

                if (where.OR) {
                    where.AND = [searchCondition];
                } else {
                    where.OR = searchCondition.OR;
                }
            }

            const skip = Math.max(0, (page - 1) * limit);

            const [items, total] = await Promise.all([
                prisma.notification.findMany({
                    where,
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: limit
                }),
                prisma.notification.count({ where })
            ]);

            return {
                items,
                total,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit) || 1
                }
            };
        } catch (error: any) {
            console.error('[NotificationService.getNotifications Error]:', error);
            return {
                items: [],
                total: 0,
                pagination: { page: 1, limit: 15, total: 0, totalPages: 1 }
            };
        }
    }

    /**
     * Cuenta cuántas notificaciones no leídas tiene el usuario
     */
    static async getUnreadCount(userId: string, negocioId: string): Promise<number> {
        try {
            if (!userId) {
                return await prisma.notification.count({
                    where: {
                        negocioId,
                        recipientType: 'ALL',
                        leida: false,
                        archived: false
                    }
                });
            }
            return await prisma.notification.count({
                where: {
                    negocioId,
                    userId,
                    leida: false,
                    archived: false
                }
            });
        } catch (error) {
            console.error('[NotificationService.getUnreadCount Error]:', error);
            return 0;
        }
    }

    /**
     * Marca una notificación individual como leída
     */
    static async markAsRead(id: string): Promise<void> {
        try {
            await prisma.notification.update({
                where: { id },
                data: {
                    leida: true,
                    fechaLectura: new Date()
                }
            });
        } catch (error) {
            console.error('[NotificationService.markAsRead Error]:', error);
        }
    }

    /**
     * Marca todas las notificaciones del usuario como leídas
     */
    static async markAllAsRead(userId: string, negocioId: string): Promise<void> {
        try {
            const whereClause: any = {
                negocioId,
                leida: false,
                archived: false
            };
            if (userId) {
                whereClause.OR = [
                    { userId },
                    { recipientType: 'ALL' }
                ];
            } else {
                whereClause.recipientType = 'ALL';
            }

            await prisma.notification.updateMany({
                where: whereClause,
                data: {
                    leida: true,
                    fechaLectura: new Date()
                }
            });
        } catch (error) {
            console.error('[NotificationService.markAllAsRead Error]:', error);
        }
    }

    /**
     * Archiva o borra lógicamente una notificación
     */
    static async archiveNotification(id: string): Promise<void> {
        try {
            await prisma.notification.update({
                where: { id },
                data: { archived: true }
            });
        } catch (error) {
            console.error('[NotificationService.archiveNotification Error]:', error);
        }
    }

    /**
     * Registra métricas de uso de la notificación (vistas, clics)
     */
    static async trackMetric(id: string, metric: 'vistas' | 'clics'): Promise<void> {
        try {
            const notif = await prisma.notification.findUnique({
                where: { id },
                select: { metricas: true }
            });
            if (!notif) return;

            let metricsObj: Record<string, number> = {};
            if (notif.metricas) {
                try {
                    metricsObj = JSON.parse(notif.metricas);
                } catch {}
            }

            metricsObj[metric] = (metricsObj[metric] || 0) + 1;

            await prisma.notification.update({
                where: { id },
                data: { metricas: JSON.stringify(metricsObj) }
            });
        } catch (error) {
            console.error('[NotificationService.trackMetric Error]:', error);
        }
    }

    /**
     * Emite un evento en tiempo real por el canal SSE
     */
    static publishRealtime(negocioId: string, userId: string, data: any): void {
        try {
            sseEmitter.emit('realtime_event', {
                negocioId,
                userId,
                data
            });
        } catch (error) {
            console.error('[NotificationService.publishRealtime Error]:', error);
        }
    }
}

// Exportaciones de compatibilidad para rutas SSE y notificaciones Push legacy
export const sseEmitter = new EventEmitter();
sseEmitter.setMaxListeners(100);

export const notificationService = {
    sendPushToBusiness: async (negocioId: string, title: string, body: string) => {
        console.log(`[PushToBusiness -> ${negocioId}]: ${title} - ${body}`);
    },
    sendAppointmentCompletedNotification: async (
        negocioId: string,
        clienteName: string,
        telefono: string,
        negocioName: string,
        servicioName: string,
        professionalName: string,
        reservaId: string,
        slug: string
    ) => {
        try {
            const { NotificationService: LegacyService } = await import('@/lib/notifications');
            const legacy = new LegacyService();
            await legacy.sendAppointmentCompletedNotification(
                negocioId, clienteName, telefono, negocioName, servicioName, professionalName, reservaId, slug
            );
        } catch (e) {
            console.warn('[notificationService.sendAppointmentCompletedNotification error]:', e);
        }
    }
};

