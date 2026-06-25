import prisma from './prisma';
import * as admin from 'firebase-admin';
import { sendWhatsAppMessage } from '@/lib/whatsapp-client';
import { whatsappService } from './whatsapp';


// Función auxiliar para obtener configuración global (usada para Firebase Admin)
async function getGlobalConfig(clave: string): Promise<string | null> {
    try {
        const config = await prisma.globalConfig.findUnique({
            where: { clave }
        });
        return config?.valor || null;
    } catch {
        return null;
    }
}

// Variable to track initialization promise
let firebaseInitPromise: Promise<void> | null = null;

async function initFirebaseAdmin() {
    if (admin.apps.length > 0) return;
    if (firebaseInitPromise) return firebaseInitPromise;

    firebaseInitPromise = (async () => {
        try {
            const isExample = (val: string | null | undefined) => {
                if (!val) return true;
                const v = val.toLowerCase();
                return v.includes('tu-proyecto') || v.includes('example') || v === 'dummy' || v.includes('placeholder');
            };

            const dbProjectId = await getGlobalConfig('NEXT_PUBLIC_FIREBASE_PROJECT_ID') || await getGlobalConfig('FIREBASE_PROJECT_ID');
            let projectId = dbProjectId;
            if (isExample(projectId)) {
                projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || null;
            }
            if (isExample(projectId)) {
                projectId = null;
            }
            projectId = projectId?.trim() || null;

            const dbEmail = await getGlobalConfig('FIREBASE_CLIENT_EMAIL');
            let clientEmail = dbEmail;
            if (isExample(clientEmail)) {
                clientEmail = process.env.FIREBASE_CLIENT_EMAIL || null;
            }
            if (isExample(clientEmail)) {
                clientEmail = null;
            }
            clientEmail = clientEmail?.trim() || null;

            const dbKey = await getGlobalConfig('FIREBASE_PRIVATE_KEY');
            let privateKey = dbKey;
            if (privateKey && privateKey.length < 500) {
                privateKey = null;
            }
            if (!privateKey) {
                privateKey = process.env.FIREBASE_PRIVATE_KEY || null;
            }
            if (privateKey && privateKey.length < 500) {
                privateKey = null;
            }
            privateKey = privateKey?.replace(/\\n/g, '\n')?.trim() || null;

            // Extraer ProjectID si falta pero tenemos el email
            if (!projectId && clientEmail && clientEmail.includes('@')) {
                const domain = clientEmail.split('@')[1];
                if (domain && domain.includes('.iam.gserviceaccount.com')) {
                    projectId = domain.replace('.iam.gserviceaccount.com', '');
                    console.log('[PUSH] Falta ProjectID. Extraído del email de servicio:', projectId);
                }
            }

            if (projectId && clientEmail && privateKey) {
                if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
                    console.warn('Firebase Private Key no tiene formato PEM válido');
                }

                admin.initializeApp({
                    credential: admin.credential.cert({
                        projectId,
                        clientEmail,
                        privateKey,
                    }),
                });
                console.log('Firebase Admin inicializado correctamente para [', projectId, ']');
            } else {
                console.warn('Firebase Admin no inicializado: Faltan credenciales.', { hasProject: !!projectId, hasEmail: !!clientEmail, hasKey: !!privateKey });
            }
        } catch (error) {
            console.error('Firebase Admin initialization error:', error);
        }
    })();
    return firebaseInitPromise;
}

// Inicializar en background
initFirebaseAdmin();

export interface NotificationPayload {
    to: string;
    message: string;
    template?: string;
    variables?: Record<string, string>;
}

export interface INotificationProvider {
    sendMessage(payload: NotificationPayload): Promise<{ success: boolean; messageId?: string }>;
}

export class WebhookNotificationProvider implements INotificationProvider {
    constructor(private webhookUrl: string) { }

    async sendMessage(payload: NotificationPayload): Promise<{ success: boolean; messageId?: string }> {
        if (!this.webhookUrl) {
            try {
                console.log(`[NOTIFICATION SERVICE] Redirigiendo a whatsappService [${payload.template || 'GENERAL'}] para ${payload.to}`);
                await whatsappService.sendWhatsApp(payload.to, payload.message, true, payload.template || 'general');
                return { success: true };
            } catch (err) {
                console.error('[NOTIFICATION SERVICE] Error delegando a whatsappService:', err);
                return { success: false };
            }
        }
        try {
            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            return { success: true, messageId: data.id };
        } catch (error) {
            console.error('Notification Error (Webhook):', error);
            return { success: false };
        }
    }
}

export class FirebasePushProvider implements INotificationProvider {
    async sendMessage(payload: NotificationPayload): Promise<{ success: boolean; messageId?: string }> {
        await initFirebaseAdmin();
        try {
            // Enviamos mensaje con AMBOS: notification (para SW background) + data (para onMessage foreground)
            // El webpush.headers.Urgency = 'high' garantiza entrega inmediata
            const message: any = {
                notification: {
                    title: payload.template || 'Nueva notificación',
                    body: payload.message,
                },
                webpush: {
                    headers: {
                        Urgency: 'high',
                        TTL: '60',
                    },
                    notification: {
                        title: payload.template || 'Nueva notificación',
                        body: payload.message,
                        icon: payload.variables?.icon || '/icons/icon-192x192.png',
                        badge: '/icons/icon-72x72.png',
                        requireInteraction: false,
                        silent: false,
                        vibrate: [200, 100, 200],
                        // Datos adicionales accesibles en notificationclick
                        data: {
                            ...(payload.variables || {}),
                            link: payload.variables?.link || '/admin/reservas',
                        },
                    },
                    fcmOptions: {
                        link: payload.variables?.link || '/admin/reservas',
                    },
                },
                data: {
                    title: payload.template || 'Nueva notificación',
                    body: payload.message,
                    icon: payload.variables?.icon || '/icons/icon-192x192.png',
                    link: payload.variables?.link || '/admin/reservas',
                    reservaId: payload.variables?.reservaId || '',
                },
                token: payload.to,
            };

            const response = await admin.messaging().send(message);
            return { success: true, messageId: response };
        } catch (error) {
            console.error('Firebase Push error:', error);
            return { success: false };
        }
    }
}

export class NotificationService {
    public provider: INotificationProvider;
    public pushProvider: FirebasePushProvider;

    constructor(provider?: INotificationProvider) {
        this.provider = provider || new WebhookNotificationProvider(process.env.NOTIFICATIONS_WEBHOOK_URL || '');
        this.pushProvider = new FirebasePushProvider();
    }

    private async getTemplate(negocioId: string, clave: string, defaultValue: string): Promise<string> {
        const config = await prisma.configuracion.findUnique({
            where: {
                clave_negocioId: {
                    clave,
                    negocioId
                }
            }
        });
        return config?.valor || defaultValue;
    }

    private replaceVariables(template: string, vars: Record<string, string>): string {
        let result = template;
        Object.entries(vars).forEach(([key, value]) => {
            result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
        });
        return result;
    }

    async sendBookingConfirmation(
        negocioId: string,
        clienteName: string,
        telefono: string,
        fecha: string | Date,
        hora: string,
        negocioName: string,
        servicioName: string,
        duracion?: string | number,
        confirmada: boolean = false,
        direccion?: string,
        mapUrl?: string,
        reservaId?: string,
        comentarios?: string
    ) {
        const clave = confirmada ? 'CONFIRMATION_MSG' : 'REJECTION_MSG';
        const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
        const fechaLegible = fechaObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

        // Extraer servicios adicionales si existen en el comentario
        let extrasPart = "";
        if (comentarios && comentarios.includes("Servicios extra:")) {
            const parts = comentarios.split("Servicios extra:");
            if (parts.length > 1) {
                extrasPart = `\n➕ *Servicios Extra:* ${parts[1].trim()}`;
            }
        }

        const defaultMsg = confirmada
            ? `✅ ¡Hola {{nombre}}! Tu cita en *{{negocio}}* ha sido *CONFIRMADA*. 💆\n\n✨ *Servicio:* {{servicio}}${extrasPart}\n📅 *Fecha:* {{fecha}}\n⏰ *Hora:* {{hora}}\n\n📲 *¿Dudas o cambios? Contacta al negocio:* \nhttps://wa.me/{{telefono_negocio}}\n\n¡Te esperamos!`
            : `❌ ¡Hola {{nombre}}! Lo sentimos, tu solicitud de cita en *{{negocio}}* para el {{fecha}} a las {{hora}} *NO PUEDE SER CONFIRMADA* en este momento o ha sido cancelada.\n\n📲 *Para más info o reagendar:* \nhttps://wa.me/{{telefono_negocio}}\n\n¡Esperamos verte en otra ocasión!`;

        const template = await this.getTemplate(negocioId, clave, defaultMsg);
        
        // Obtener datos del negocio (whatsapp, slug y logo)
        const negocio = await prisma.negocio.findUnique({
            where: { id: negocioId },
            select: { whatsapp: true, slug: true, logoUrl: true }
        });
        
        const telefonoNegocio = negocio?.whatsapp?.replace(/\D/g, '') || '';
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://citiox.com';
        const linkReserva = reservaId ? `${appUrl}/${negocio?.slug}/reservas/${reservaId}` : `${appUrl}/${negocio?.slug}`;

        const iconUrl = negocio?.logoUrl || '/icons/icon-192x192.png';

        const message = this.replaceVariables(template, {
            nombre: clienteName,
            fecha: fechaLegible,
            hora,
            negocio: negocioName,
            servicio: servicioName,
            duracion: duracion?.toString() || '1',
            telefono_negocio: telefonoNegocio,
            link_reserva: linkReserva,
            iconUrl: iconUrl
        });

        const mainResponse = await this.provider.sendMessage({ 
            to: telefono, 
            message, 
            template: confirmada ? 'Reserva Confirmada' : 'Solicitud de Reserva',
            variables: { icon: iconUrl }
        });

        // Si está confirmada y tenemos ubicación, enviar segundo mensaje
        if (confirmada) {
            console.log(`[NOTIFICATION SERVICE] Validación ubicación para ${telefono}:`, { direccion, mapUrl });
            
            if (direccion || mapUrl) {
                let locationMsg = `📍 *Ubicación de tu cita:*\n${direccion || 'Confirmada'}`;
                
                // Si tenemos dirección, creamos un link de navegación directa para que no tengan que presionar "Iniciar"
                const navUrl = direccion 
                    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(direccion)}&dir_action=navigate`
                    : mapUrl;

                if (navUrl) {
                    locationMsg += `\n\n🗺 *Navegación Directa:*\n${navUrl}`;
                }
                
                // Esperar un poco para que lleguen en orden
                await new Promise(resolve => setTimeout(resolve, 2000));
                console.log(`[NOTIFICATION SERVICE] Enviando segundo mensaje (ubicación) a ${telefono}`);
                await this.provider.sendMessage({ to: telefono, message: locationMsg, template: 'ubicacion' });
            } else {
                console.log(`[NOTIFICATION SERVICE] No se envía ubicación a ${telefono}: Faltan datos.`);
            }
        }

        return mainResponse;
    }

    async sendReminder(negocioId: string, clienteName: string, telefono: string, fecha: string, hora: string, negocioName: string, duracion?: string | number, type: 'DAY' | '2H' | 'LEGACY' = 'LEGACY') {
        const durText = duracion ? ` (${duracion} ${duracion === 1 ? 'hora' : 'horas'})` : '';
        
        let configKey = 'REMINDER_MSG';
        let defaultMsg = `Recordatorio: Tienes una cita hoy en {{negocio}} a las {{hora}}${durText}. ¡Te esperamos! 💆`;
        
        if (type === 'DAY') {
            configKey = 'REMINDER_DAY_MSG';
            defaultMsg = `☀️ ¡Buen día {{nombre}}! Te recordamos que hoy tienes una cita en *{{negocio}}* a las {{hora}}. ¡Te esperamos!`;
        } else if (type === '2H') {
            configKey = 'REMINDER_2H_MSG';
            defaultMsg = `⏰ ¡Hola {{nombre}}! En 2 horas es tu cita en *{{negocio}}*. ¡Nos vemos pronto!`;
        }

        const template = await this.getTemplate(negocioId, configKey, defaultMsg);
        const message = this.replaceVariables(template, {
            nombre: clienteName,
            fecha,
            hora,
            negocio: negocioName,
            duracion: duracion?.toString() || ''
        });
        return this.provider.sendMessage({ to: telefono, message, template: `reminder_${type.toLowerCase()}` });
    }

    async sendOTP(negocioId: string, telefono: string, code: string, negocioName: string) {
        const defaultMsg = `Tu código de verificación es: *{{code}}*. Válido por 5 minutos.`;
        const template = await this.getTemplate(negocioId, 'OTP_MSG', defaultMsg);
        const message = this.replaceVariables(template, {
            negocio: negocioName,
            code
        });
        return this.provider.sendMessage({ to: telefono, message, template: 'otp' });
    }

    async sendPushToUser(userId: string, title: string, body: string, data?: Record<string, string>) {
        try {
            const tokens = await prisma.pushToken.findMany({
                where: { userId }
            });

            if (tokens.length === 0) return;

            const promises = tokens.map(t =>
                this.pushProvider.sendMessage({
                    to: t.token,
                    message: body,
                    template: title,
                    variables: data
                })
            );

            await Promise.all(promises);
        } catch (error) {
            console.error('Error sending push notifications:', error);
        }
    }

    async sendPushToBusiness(businessId: string, title: string, body: string, data?: Record<string, string>) {
        try {
            const tokens = await prisma.pushToken.findMany({
                where: { businessId }
            });

            if (tokens.length === 0) return;

            const promises = tokens.map(t =>
                this.pushProvider.sendMessage({
                    to: t.token,
                    message: body,
                    template: title,
                    variables: data
                })
            );

            await Promise.all(promises);
        } catch (error) {
            console.error('Error sending push notifications to business:', error);
        }
    }

    async sendCourseEnrollmentConfirmation(
        negocioId: string,
        clienteName: string,
        telefono: string,
        courseName: string,
        negocioName: string,
        enrollmentId: string,
        slug: string,
        studentCount: number = 1
    ) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://citiox.com';
        const linkInscripcion = `${appUrl}/${slug}/cursos/inscripcion/${enrollmentId}`;
        const linkAdmin = `${appUrl}/admin/cursos/inscripciones`;

        // Obtener teléfono del negocio para el contacto
        const negocioInfo = await prisma.negocio.findUnique({
            where: { id: negocioId },
            select: { whatsapp: true }
        });
        const telefonoNegocio = negocioInfo?.whatsapp?.replace(/\D/g, '') || '';

        const defaultMsg = studentCount > 1
            ? `🎓 ¡Hola {{nombre}}! Hemos recibido la solicitud de inscripción para tus *{{count}} alumnos* en el curso *{{curso}}* de *{{negocio}}*. \n\n⏳ *Estado:* Pendiente de confirmación.\n\n📲 *Dudas o pagos:* https://wa.me/{{telefono_negocio}}\n\n📲 *Detalles y horarios aquí:*\n{{link}}\n\n¡Gracias por confiar en nosotros!`
            : `🎓 ¡Hola {{nombre}}! Hemos recibido tu solicitud de inscripción al curso *{{curso}}* en *{{negocio}}*. \n\n⏳ *Estado:* Pendiente de confirmación.\n\n📲 *Dudas o pagos:* https://wa.me/{{telefono_negocio}}\n\n📲 *Gestiona tu inscripción y mira tus horarios aquí:*\n{{link}}\n\n¡Te esperamos!`;

        const template = await this.getTemplate(negocioId, 'COURSE_ENROLL_PENDING_MSG', defaultMsg);
        
        const message = this.replaceVariables(template, {
            nombre: clienteName,
            curso: courseName,
            negocio: negocioName,
            link: linkInscripcion,
            count: studentCount.toString(),
            telefono_negocio: telefonoNegocio
        });

        // 1. Enviar mensaje al cliente
        const response = await this.provider.sendMessage({ to: telefono, message, template: 'inscripcion_curso' });

        // 2. Alerta al negocio (WhatsApp Administrador)
        try {
            const negocio = await prisma.negocio.findUnique({
                where: { id: negocioId },
                select: { whatsapp: true }
            });

            if (negocio?.whatsapp) {
                const businessMessage = `🚨 *Nueva Inscripción a Academia*\n\n👤 *Representante:* {{nombre}}\n🎓 *Curso:* {{curso}}\n👥 *Alumnos:* {{count}}\n\n📲 *Gestionar ahora en el panel:* \n{{link_admin}} \n\n¡Atiende pronto esta solicitud!`;
                
                const formattedBusinessMsg = this.replaceVariables(businessMessage, {
                    nombre: clienteName,
                    curso: courseName,
                    count: studentCount.toString(),
                    link_admin: linkAdmin
                });

                // Esperamos un poco para que no se crucen si el admin es el mismo cliente probando
                setTimeout(async () => {
                    await this.provider.sendMessage({ 
                        to: negocio.whatsapp.replace(/\D/g, ''), 
                        message: formattedBusinessMsg, 
                        template: 'alerta_negocio' 
                    });
                }, 1000);
            }
        } catch (e) {
            console.error("Error sending enrollment alert to business:", e);
        }

        return response;
    }

    async adminAlert(title: string, body: string, data?: Record<string, string>) {
        try {
            const superAdmins = await prisma.usuario.findMany({
                where: {
                    role: 'SUPER_ADMIN'
                },
                select: { id: true }
            });

            if (superAdmins.length === 0) return;

            const promises = superAdmins.map(admin =>
                this.sendPushToUser(admin.id, title, body, data)
            );

            await Promise.all(promises);
        } catch (error) {
            console.error('Error sending admin alert:', error);
        }
    }

    async sendSubscriptionExpiryReminder(
        negocioId: string,
        telefono: string,
        negocioName: string,
        diasRestantes: number,
        fechaFin: Date
    ) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://citiox.com';
        const linkRenovacion = `${appUrl}/admin/plan`;
        const fechaFormat = fechaFin.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
        
        const message = diasRestantes <= 0
            ? `🔴 *Suscripción Vencida* ✨\n\nHola, el plan de *{{negocio}}* ha vencido el día {{fecha}}.\n\n⚠️ *Estado:* Acceso restringido.\n\n📲 *Restaura tu servicio ahora aquí:* \n{{link}}\n\n¡Te esperamos de vuelta!`
            : `⚠️ *Aviso de Vencimiento* ✨\n\nHola, el plan de *{{negocio}}* está próximo a vencer.\n\n📅 *Fecha Corte:* {{fecha}}\n⏳ *Quedan:* {{dias}} día(s)\n\n📲 *Evita cortes en tu servicio renovando aquí:* \n{{link}}\n\n¡Gracias por tu confianza!`;
        
        const formatted = this.replaceVariables(message, {
            negocio: negocioName,
            fecha: fechaFormat,
            dias: diasRestantes.toString(),
            link: linkRenovacion
        });

        return this.provider.sendMessage({ to: telefono, message: formatted, template: 'aviso_suscripcion' });
    }

    async sendSubscriptionApprovalNotification(
        negocioId: string,
        telefono: string,
        negocioName: string,
        planName: string,
        fechaFin: Date,
        isAnnual: boolean = false
    ) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://citiox.com';
        const linkDashboard = `${appUrl}/admin`;
        const fechaFormat = fechaFin.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
        
        const message = `🎉 *¡Felicidades! Tu Plan ha sido Activado* ✨\n\nHola, el plan de *{{negocio}}* ha sido actualizado exitosamente.\n\n⭐ *Plan:* {{plan}} ({{ciclo}})\n📅 *Vence el:* {{fecha}}\n\n✅ Todas las funciones premium están ahora disponibles para tu negocio.\n\n📲 *Accede a tu panel aquí:* \n{{link}}\n\n¡Gracias por seguir creciendo con nosotros!`;
        
        const formatted = this.replaceVariables(message, {
            negocio: negocioName,
            plan: planName,
            ciclo: isAnnual ? 'Anual' : 'Mensual',
            fecha: fechaFormat,
            link: linkDashboard
        });

        return this.provider.sendMessage({ to: telefono, message: formatted, template: 'aprobacion_plan' });
    }

    async sendCheckInNotification(negocioId: string, clienteName: string, servicio: string, hora: string) {
        const negocio = await prisma.negocio.findUnique({
            where: { id: negocioId },
            select: { whatsapp: true, nombre: true }
        });

        if (!negocio?.whatsapp) return;

        const message = `🚶 *¡CLIENTE EN SALA!* ✨\n\nEl cliente *${clienteName}* acaba de realizar el check-in para su cita de las *${hora}*.\n\n💆 *Servicio:* ${servicio}\n📍 Ya puedes verlo en la *Sala de Espera* de tu panel.\n\n¡Atiéndelo pronto!`;

        return this.provider.sendMessage({ 
            to: negocio.whatsapp.replace(/\D/g, ''), 
            message, 
            template: 'check_in_alerta' 
        });
    }

    async sendRatingReminder(negocioId: string, clienteName: string, telefono: string, negocioName: string, slug: string) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://citiox.com';
        const link = `${appUrl}/${slug}/mis-reservas`;
        
        const defaultMsg = `🌟 ¡Hola {{nombre}}! Esperamos que hayas disfrutado tu servicio en *{{negocio}}*. \n\nTu opinión es muy importante para nosotros. ¿Podrías regalarnos 1 minuto para calificar tu experiencia?\n\n⭐ *Califica aquí:* \n{{link}}\n\n¡Gracias!`;
        const template = await this.getTemplate(negocioId, 'RATING_REMINDER_MSG', defaultMsg);
        
        const message = this.replaceVariables(template, {
            nombre: clienteName,
            negocio: negocioName,
            link: link
        });

        return this.provider.sendMessage({ to: telefono, message, template: 'rating_reminder' });
    }
}

export const notificationService = new NotificationService();
