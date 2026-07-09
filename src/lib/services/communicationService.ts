import prisma from '../prisma';
import { sseEmitter, NotificationService } from '../notifications/notificationService';
import { whatsappService } from '../whatsapp';
import nodemailer from 'nodemailer';
import * as admin from 'firebase-admin';
import { initFirebaseAdmin } from '../notifications';

export interface TargetingFilters {
  type:
    | 'ALL_USERS'
    | 'ALL_NEGOCIOS'
    | 'ADMINS'
    | 'CLIENTES'
    | 'STAFF'
    | 'VENDEDORES'
    | 'SOPORTE'
    | 'MARKETING'
    | 'PREMIUM'
    | 'TRIAL'
    | 'VENCIDOS'
    | 'ACTIVOS'
    | 'SUSPENDIDOS'
    | 'ESPECIFICO_NEGOCIO'
    | 'ESPECIFICO_USUARIO'
    | 'INTERNO';
  negocioId?: string;
  userIds?: string[];
  ciudad?: string;
  provincia?: string;
  pais?: string;
  planId?: string;
  idioma?: string;
  registrationDateStart?: string;
  registrationDateEnd?: string;
  lastLoginStart?: string;
  lastLoginEnd?: string;
  rolesInternos?: string[];
  etiquetas?: string[];
}

export class CommunicationService {
  /**
   * Reemplazar variables dinámicas en plantillas o mensajes
   */
  static parseVariables(
    text: string,
    vars: {
      nombre?: string;
      negocio?: string;
      plan?: string;
      fecha_vencimiento?: string;
      reservas?: number;
      ciudad?: string;
      pais?: string;
    }
  ): string {
    if (!text) return '';
    let result = text;
    const mapping = {
      nombre: vars.nombre || '',
      negocio: vars.negocio || '',
      plan: vars.plan || 'Ninguno',
      fecha_vencimiento: vars.fecha_vencimiento || 'N/A',
      reservas: String(vars.reservas ?? 0),
      ciudad: vars.ciudad || '',
      pais: vars.pais || '',
    };

    for (const [key, value] of Object.entries(mapping)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
      result = result.replace(regex, value);
    }
    return result;
  }

  /**
   * Obtener destinatarios basados en filtros de segmentación inteligente
   */
  static async resolveRecipients(filters: TargetingFilters): Promise<Array<{
    id: string; // ID del usuario (Usuario o AdminUser)
    nombre: string;
    email?: string;
    phone?: string;
    negocioId?: string;
    negocioNombre?: string;
    planNombre?: string;
    fechaVencimiento?: string;
    reservasCount?: number;
    ciudad?: string;
    pais?: string;
    isInternal?: boolean;
  }>> {
    const list: any[] = [];

    // --- CASO 1: Destinatarios Internos (AdminUser) ---
    if (
      filters.type === 'INTERNO' ||
      filters.type === 'VENDEDORES' ||
      filters.type === 'SOPORTE' ||
      filters.type === 'MARKETING'
    ) {
      let roleNames: string[] = [];
      if (filters.type === 'VENDEDORES') roleNames = ['Ventas'];
      else if (filters.type === 'SOPORTE') roleNames = ['Soporte'];
      else if (filters.type === 'MARKETING') roleNames = ['Marketing'];
      else if (filters.rolesInternos) roleNames = filters.rolesInternos;

      const whereClause: any = { activo: true };
      if (roleNames.length > 0) {
        whereClause.rol = { nombre: { in: roleNames } };
      }

      const admins = await prisma.adminUser.findMany({
        where: whereClause,
        include: { rol: true },
      });

      return admins.map(a => ({
        id: a.id,
        nombre: `${a.nombre} ${a.apellido || ''}`.trim(),
        email: a.email,
        phone: a.telefono || undefined,
        isInternal: true,
      }));
    }

    // --- CASO 2: Destinatarios Externos (Usuario / Negocio) ---
    const whereUsuario: any = {};
    const whereNegocio: any = {};

    // Filtros de fecha de registro
    if (filters.registrationDateStart || filters.registrationDateEnd) {
      whereUsuario.createdAt = {};
      if (filters.registrationDateStart) {
        whereUsuario.createdAt.gte = new Date(filters.registrationDateStart);
      }
      if (filters.registrationDateEnd) {
        whereUsuario.createdAt.lte = new Date(filters.registrationDateEnd);
      }
    }

    // Filtro por idioma
    if (filters.idioma) {
      // guardado en configuraciones de forma implícita o explícita, por defecto español
    }

    // Filtros de Negocios
    if (filters.type === 'PREMIUM') {
      whereNegocio.Suscripcion = { estado: 'active', Plan: { isFree: false } };
    } else if (filters.type === 'TRIAL') {
      whereNegocio.Suscripcion = { estado: 'trial' };
    } else if (filters.type === 'VENCIDOS') {
      whereNegocio.Suscripcion = { estado: 'expired' };
    } else if (filters.type === 'ACTIVOS') {
      whereNegocio.estado = 'ACTIVO';
    } else if (filters.type === 'SUSPENDIDOS') {
      whereNegocio.estado = 'SUSPENDIDO';
    } else if (filters.type === 'ESPECIFICO_NEGOCIO' && filters.negocioId) {
      whereNegocio.id = filters.negocioId;
    }

    if (filters.ciudad) {
      whereNegocio.ciudad = { equals: filters.ciudad, mode: 'insensitive' };
    }

    if (filters.planId) {
      whereNegocio.Suscripcion = { planId: filters.planId };
    }

    // Resolver Negocios que coincidan
    const negocios = await prisma.negocio.findMany({
      where: whereNegocio,
      include: {
        Suscripcion: { include: { Plan: true } },
      },
    });

    const negocioIds = negocios.map(n => n.id);
    if (negocioIds.length === 0 && filters.type !== 'ALL_USERS' && filters.type !== 'ESPECIFICO_USUARIO') {
      return [];
    }

    // Construir la condición de usuario en base al rol
    if (filters.type === 'ADMINS' || filters.type === 'ALL_NEGOCIOS') {
      whereUsuario.role = { in: ['ADMIN', 'ADMIN_NEGOCIO'] };
      whereUsuario.negocioId = { in: negocioIds };
    } else if (filters.type === 'STAFF') {
      whereUsuario.role = { in: ['STAFF', 'PROFESOR', 'PROFESIONAL'] };
      whereUsuario.negocioId = { in: negocioIds };
    } else if (filters.type === 'CLIENTES') {
      whereUsuario.role = 'USER';
      if (negocioIds.length > 0) {
        whereUsuario.negocioId = { in: negocioIds };
      }
    } else if (filters.type === 'ESPECIFICO_USUARIO' && filters.userIds) {
      whereUsuario.id = { in: filters.userIds };
    } else {
      // ALL_USERS o tipos generales
      if (negocioIds.length > 0) {
        whereUsuario.negocioId = { in: negocioIds };
      }
    }

    const usuarios = await prisma.usuario.findMany({
      where: whereUsuario,
      include: {
        Negocio: {
          include: { Suscripcion: { include: { Plan: true } } },
        },
        _count: { select: { Appointment: true } },
      },
    });

    // Filtros lógicos en memoria para segmentación avanzada
    let filteredUsers = usuarios;

    // Filtros por país basados en código telefónico
    if (filters.pais) {
      let prefix = '';
      if (filters.pais.toLowerCase() === 'ecuador') prefix = '593';
      else if (filters.pais.toLowerCase() === 'colombia') prefix = '57';
      else if (filters.pais.toLowerCase() === 'argentina') prefix = '54';

      if (prefix) {
        filteredUsers = filteredUsers.filter(u => u.phone && u.phone.replace(/\D/g, '').startsWith(prefix));
      }
    }

    // Segmentos: negocios sin reservas o negocios con muchas reservas
    if (filters.type === 'PREMIUM' || filters.type === 'TRIAL' || filters.type === 'ALL_NEGOCIOS') {
      // Ya filtrado por negocios
    }

    // Mapeo final
    return filteredUsers.map(u => {
      const plan = u.Negocio?.Suscripcion?.Plan?.name || 'Ninguno';
      const vto = u.Negocio?.Suscripcion?.fechaFin
        ? u.Negocio.Suscripcion.fechaFin.toLocaleDateString()
        : 'N/A';

      // Inferir país
      let inferredPais = 'Desconocido';
      const cleanPhone = u.phone ? u.phone.replace(/\D/g, '') : '';
      if (cleanPhone.startsWith('593')) inferredPais = 'Ecuador';
      else if (cleanPhone.startsWith('57')) inferredPais = 'Colombia';
      else if (cleanPhone.startsWith('54')) inferredPais = 'Argentina';

      return {
        id: u.id,
        nombre: u.nombre || u.email?.split('@')[0] || 'Usuario',
        email: u.email || undefined,
        phone: u.phone || undefined,
        negocioId: u.negocioId || undefined,
        negocioNombre: u.Negocio?.nombre || undefined,
        planNombre: plan,
        fechaVencimiento: vto,
        reservasCount: u._count?.Appointment || 0,
        ciudad: u.Negocio?.ciudad || undefined,
        pais: inferredPais,
        isInternal: false,
      };
    });
  }

  /**
   * Enviar comunicación a todos los destinatarios filtrados (Despacho multicanal asíncrono)
   */
  static async dispatch(communicationId: string) {
    console.log(`[Communications Hub] Iniciando despacho para campaña ${communicationId}...`);
    
    // 1. Obtener la campaña y actualizar estado a ENVIANDO
    const communication = await prisma.globalCommunication.findUnique({
      where: { id: communicationId },
      include: { autor: true },
    });

    if (!communication || communication.estado === 'ENVIADO') {
      console.warn(`[Communications Hub] Campaña ${communicationId} no encontrada o ya enviada.`);
      return;
    }

    await prisma.globalCommunication.update({
      where: { id: communicationId },
      data: { estado: 'ENVIANDO' },
    });

    try {
      const filters = JSON.parse(communication.destinatarios) as TargetingFilters;
      const channels = JSON.parse(communication.canales) as string[];

      // 2. Resolver destinatarios
      const recipients = await this.resolveRecipients(filters);
      console.log(`[Communications Hub] Se resolvieron ${recipients.length} destinatario(s) para la campaña.`);

      if (recipients.length === 0) {
        await prisma.globalCommunication.update({
          where: { id: communicationId },
          data: { estado: 'ENVIADO', sentAt: new Date() },
        });
        await this.createOrUpdateAnalytics(communicationId, 0, 0, 0);
        return;
      }

      // 3. Inicializar Firebase si se requiere PUSH
      if (channels.includes('PUSH')) {
        try {
          await initFirebaseAdmin();
        } catch (e) {
          console.error('[Communications Hub] Error inicializando Firebase para Push:', e);
        }
      }

      // Configurar transportador de Email (Nodemailer) si se requiere EMAIL
      let emailTransporter: nodemailer.Transporter | null = null;
      if (channels.includes('EMAIL')) {
        const smtpHost = process.env.SMTP_HOST;
        const smtpPort = Number(process.env.SMTP_PORT || '587');
        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS;

        if (smtpHost && smtpUser && smtpPass) {
          emailTransporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: { user: smtpUser, pass: smtpPass },
          });
          console.log('[Communications Hub] Transportador SMTP de Nodemailer configurado correctamente.');
        } else {
          console.warn('[Communications Hub] Credenciales SMTP no configuradas. Los emails se enviarán en modo MOCK.');
        }
      }

      // 4. Despachar por lotes (chunks de 50) de forma asíncrona para no bloquear el hilo principal
      const CHUNK_SIZE = 50;
      let totalEnviados = 0;
      let totalEntregados = 0;
      let totalErrores = 0;

      const uniqueNegocios = new Set<string>();
      const uniqueClientes = new Set<string>();

      for (let i = 0; i < recipients.length; i += CHUNK_SIZE) {
        const chunk = recipients.slice(i, i + CHUNK_SIZE);
        
        await Promise.all(
          chunk.map(async recipient => {
            if (recipient.negocioId) uniqueNegocios.add(recipient.negocioId);
            uniqueClientes.add(recipient.id);

            // Reemplazo de variables dinámicas por cada usuario
            const variables = {
              nombre: recipient.nombre,
              negocio: recipient.negocioNombre || '',
              plan: recipient.planNombre || '',
              fecha_vencimiento: recipient.fechaVencimiento || '',
              reservas: recipient.reservasCount || 0,
              ciudad: recipient.ciudad || '',
              pais: recipient.pais || '',
            };

            const parsedTitle = this.parseVariables(communication.titulo, variables);
            const parsedSubtitle = this.parseVariables(communication.subtitulo || '', variables);
            const parsedContent = this.parseVariables(communication.contenido, variables);

            // Enviar por cada canal configurado
            for (const canal of channels) {
              let deliverySuccess = false;
              let errorMsg: string | null = null;

              try {
                if (canal === 'APP') {
                  // Entrega nativa en el centro de notificaciones
                  if (!recipient.isInternal && recipient.negocioId) {
                    await NotificationService.createNotification({
                      negocioId: recipient.negocioId,
                      userId: recipient.id,
                      tipo: communication.prioridad === 'ERROR' ? 'SISTEMA' : 'NOTICIA',
                      categoria: 'NOTICIAS',
                      titulo: parsedTitle,
                      descripcion: parsedSubtitle || parsedContent.substring(0, 100),
                      imagenUrl: communication.imagenUrl || undefined,
                      icono: communication.icono || 'Megaphone',
                      prioridad: communication.prioridad as any,
                      channels: ['APP'],
                      actionType: 'ABRIR_URL',
                      actionPayload: { url: communication.videoUrl || '' },
                    });
                  }
                  deliverySuccess = true;
                } 
                else if (canal === 'PUSH') {
                  // Despacho Push Firebase
                  if (admin.apps.length > 0) {
                    const tokens = await prisma.pushToken.findMany({
                      where: { userId: recipient.id },
                      select: { token: true },
                    });
                    const validTokens = tokens.map(t => t.token).filter(t => t);

                    if (validTokens.length > 0) {
                      const payload = {
                        tokens: validTokens,
                        notification: {
                          title: parsedTitle,
                          body: parsedSubtitle || parsedContent.substring(0, 100),
                        },
                        data: {
                          communicationId,
                          click_action: 'FLUTTER_NOTIFICATION_CLICK',
                        },
                      };
                      const response = await admin.messaging().sendEachForMulticast(payload);
                      deliverySuccess = response.successCount > 0;
                      if (response.failureCount > 0) {
                        errorMsg = `Fallo de envío en ${response.failureCount} tokens.`;
                      }
                    } else {
                      errorMsg = 'Sin tokens push registrados.';
                    }
                  } else {
                    errorMsg = 'FCM Admin no inicializado.';
                  }
                } 
                else if (canal === 'WHATSAPP') {
                  // Despacho WhatsApp
                  if (recipient.phone) {
                    const dest = recipient.phone.replace(/\D/g, '');
                    let msg = `*${parsedTitle}*\n`;
                    if (parsedSubtitle) msg += `_${parsedSubtitle}_\n\n`;
                    msg += parsedContent;
                    if (communication.imagenUrl) msg += `\n\n🖼 ${communication.imagenUrl}`;

                    await whatsappService.sendWhatsApp(dest, msg, true, 'general');
                    deliverySuccess = true;
                  } else {
                    errorMsg = 'Sin número de teléfono registrado.';
                  }
                } 
                else if (canal === 'EMAIL') {
                  // Despacho Email
                  if (recipient.email) {
                    if (emailTransporter) {
                      await emailTransporter.sendMail({
                        from: process.env.SMTP_FROM || '"Citiox Communications" <noreply@citiox.com>',
                        to: recipient.email,
                        subject: parsedTitle,
                        html: `
                          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                            <h2 style="color: #0ea5e9;">${parsedTitle}</h2>
                            ${parsedSubtitle ? `<p style="font-size: 16px; color: #64748b;">${parsedSubtitle}</p>` : ''}
                            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                            <div style="font-size: 14px; line-height: 1.6; color: #334155;">
                              ${parsedContent}
                            </div>
                            ${communication.imagenUrl ? `<img src="${communication.imagenUrl}" style="max-width:100%; border-radius:8px; margin-top:20px;" />` : ''}
                          </div>
                        `,
                      });
                      deliverySuccess = true;
                    } else {
                      // Mock exitoso
                      console.log(`[SMTP MOCK] Enviar email a ${recipient.email}: ${parsedTitle}`);
                      deliverySuccess = true;
                    }
                  } else {
                    errorMsg = 'Sin correo electrónico registrado.';
                  }
                }
                else if (canal === 'BANNER' || canal === 'POPUP') {
                  // Los banners/popups se guardan a nivel de destinatario log,
                  // y se sirven en caliente a través del endpoint GET /api/public/comunicaciones/activas
                  deliverySuccess = true;
                }
                else {
                  // SMS o Canales futuros
                  deliverySuccess = true;
                }
              } catch (err: any) {
                errorMsg = err.message || 'Error desconocido.';
              }

              // Registrar destinatario individual en base de datos
              totalEnviados++;
              if (deliverySuccess) {
                totalEntregados++;
              } else {
                totalErrores++;
              }

              await prisma.globalCommunicationRecipient.create({
                data: {
                  communicationId,
                  negocioId: recipient.negocioId || null,
                  userId: recipient.id,
                  canal,
                  estado: deliverySuccess ? 'ENTREGADO' : 'ERROR',
                  errorDetail: errorMsg,
                  fechaEntrega: deliverySuccess ? new Date() : null,
                },
              });
            }
          })
        );

        // Retardo leve de 100ms para ceder control del event loop entre chunks
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 5. Actualizar campaña a ENVIADO y fijar fecha de envío
      await prisma.globalCommunication.update({
        where: { id: communicationId },
        data: { estado: 'ENVIADO', sentAt: new Date() },
      });

      // 6. Consolidar métricas de analíticas
      await this.createOrUpdateAnalytics(
        communicationId,
        totalEnviados,
        totalEntregados,
        totalErrores,
        uniqueNegocios.size,
        uniqueClientes.size
      );

      console.log(`[Communications Hub] Despacho completado con éxito para campaña ${communicationId}.`);
    } catch (e: any) {
      console.error(`[Communications Hub] Error crítico durante el despacho de ${communicationId}:`, e);
      await prisma.globalCommunication.update({
        where: { id: communicationId },
        data: { estado: 'CANCELADO' }, // Marcar como cancelado/fallido
      });
    }
  }

  /**
   * Crear o actualizar la tabla consolidada de analíticas
   */
  private static async createOrUpdateAnalytics(
    communicationId: string,
    enviados: number,
    entregados: number,
    errores: number,
    negociosAlcanzados = 0,
    clientesAlcanzados = 0
  ) {
    try {
      await prisma.globalCommunicationAnalytics.upsert({
        where: { communicationId },
        update: {
          enviados,
          entregados,
          errores,
          negociosAlcanzados,
          clientesAlcanzados,
        },
        create: {
          communicationId,
          enviados,
          entregados,
          errores,
          negociosAlcanzados,
          clientesAlcanzados,
        },
      });
    } catch (e) {
      console.error('[Communications Hub] Error guardando analíticas consolidadas:', e);
    }
  }

  /**
   * Registrar Clic en una comunicación
   */
  static async registerClick(recipientId: string) {
    try {
      const log = await prisma.globalCommunicationRecipient.update({
        where: { id: recipientId },
        data: {
          estado: 'CLIC',
          fechaClic: new Date(),
        },
      });

      // Actualizar analíticas agregadas
      const analytics = await prisma.globalCommunicationAnalytics.findUnique({
        where: { communicationId: log.communicationId },
      });

      if (analytics) {
        const newClicks = analytics.clicks + 1;
        const newCtr = analytics.enviados > 0 ? (newClicks / analytics.enviados) * 100 : 0;

        await prisma.globalCommunicationAnalytics.update({
          where: { communicationId: log.communicationId },
          data: {
            clicks: newClicks,
            ctr: newCtr,
          },
        });
      }
    } catch (e) {
      console.error('[Communications Hub] Error al registrar clic:', e);
    }
  }

  /**
   * Registrar Conversión en una comunicación
   */
  static async registerConversion(recipientId: string) {
    try {
      const log = await prisma.globalCommunicationRecipient.update({
        where: { id: recipientId },
        data: {
          estado: 'CONVERTIDO',
          fechaConversion: new Date(),
        },
      });

      // Actualizar analíticas agregadas
      const analytics = await prisma.globalCommunicationAnalytics.findUnique({
        where: { communicationId: log.communicationId },
      });

      if (analytics) {
        const newConversions = analytics.conversiones + 1;
        const newConvRate = analytics.enviados > 0 ? (newConversions / analytics.enviados) * 100 : 0;

        await prisma.globalCommunicationAnalytics.update({
          where: { communicationId: log.communicationId },
          data: {
            conversiones: newConversions,
            conversionRate: newConvRate,
          },
        });
      }
    } catch (e) {
      console.error('[Communications Hub] Error al registrar conversión:', e);
    }
  }

  /**
   * Despachar comunicaciones programadas (Corazón del cron)
   */
  static async checkAndDispatchScheduled() {
    const now = new Date();
    try {
      const scheduled = await prisma.globalCommunication.findMany({
        where: {
          estado: 'PROGRAMADO',
          scheduledFor: { lte: now },
        },
      });

      if (scheduled.length > 0) {
        console.log(`[Communications Hub Cron] Detectadas ${scheduled.length} campaña(s) programada(s) para envío.`);
        for (const campaign of scheduled) {
          // Despachar en segundo plano no bloqueante
          this.dispatch(campaign.id).catch(err => {
            console.error(`[Communications Hub Cron] Error despachando campaña ${campaign.id}:`, err);
          });
        }
      }
    } catch (e) {
      console.error('[Communications Hub Cron] Error verificando campañas programadas:', e);
    }
  }
}
