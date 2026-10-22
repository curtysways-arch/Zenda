/**
 * Centro de comunicación: campañas a clientes por la app (centro de
 * notificaciones + push) y por WhatsApp.
 *
 * - La audiencia sale de la lista de clientes del negocio (Cliente), no de los
 *   usuarios con cuenta. Cada cliente se cruza por teléfono con su cuenta
 *   (Usuario) para la app/push.
 * - Cada campaña guarda un registro resumen (Notification tipo CAMPANA_ENVIO,
 *   archivado y sin destinatario, invisible para los clientes) con el estado y
 *   los resultados reales del envío.
 * - WhatsApp se envía en segundo plano, de uno en uno y con pausas, para no
 *   saturar ni arriesgar el número de WhatsApp.
 */
import prisma from '@/lib/prisma';
import { normalizePhone, phoneVariants } from '@/lib/loyalty/purchasePoints';

export const CAMPAIGN_TIPO = 'CAMPANA_ENVIO';

/** Máximo de WhatsApp de campañas por negocio y por día (protege el número). */
export const WHATSAPP_DAILY_LIMIT = 200;
/** Pausa entre mensajes de WhatsApp (ms), con algo de variación. */
const WA_DELAY_MIN = 2500;
const WA_DELAY_MAX = 5000;

export type Segment = 'ALL' | 'VIP' | 'INACTIVE' | 'NEW_CLIENTS' | 'BIRTHDAY' | 'USER';
export type Channel = 'APP' | 'WHATSAPP';

export const SEGMENT_LABELS: Record<Segment, string> = {
    ALL: 'Todos los clientes',
    VIP: 'Clientes frecuentes',
    INACTIVE: 'No vienen hace 60 días',
    NEW_CLIENTS: 'Clientes nuevos',
    BIRTHDAY: 'Cumpleañeros del mes',
    USER: 'Clientes elegidos',
};

export interface CampaignStats {
    campaignId: string;
    estado: 'PROGRAMADA' | 'ENVIANDO' | 'COMPLETADA' | 'ERROR';
    segmento: Segment;
    canales: Channel[];
    categoria: string;
    link: string;
    clienteIds?: string[];
    audiencia: number;
    app: { cuentas: number; enviadas: number; push: number; pushFallidos: number; pushSinConfigurar?: boolean };
    whatsapp: { total: number; enviados: number; fallidos: number; omitidos: number; estado: 'NO' | 'PENDIENTE' | 'ENVIANDO' | 'COMPLETADO' | 'SIN_CONEXION' | 'LIMITE' };
    error?: string;
    creadoPor?: string;
    finalizadaEn?: string;
}

interface AudienceClient { id: string; nombre: string; telefono: string; phone: string | null }

const COMPLETED_STATES = ['completed', 'finalizada', 'finalizado'];

function parseJSON<T = any>(raw: any, fallback: T): T {
    if (!raw) return fallback;
    if (typeof raw !== 'string') return raw as T;
    try { return JSON.parse(raw) as T; } catch { return fallback; }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Audiencia ──────────────────────────────────────────────────────────

export async function resolveAudience(negocioId: string, segment: Segment, clienteIds: string[] = []): Promise<AudienceClient[]> {
    const where: any = { negocioId };
    const now = new Date();

    if (segment === 'USER') {
        if (!clienteIds.length) return [];
        where.id = { in: clienteIds };
    } else if (segment === 'NEW_CLIENTS') {
        where.createdAt = { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
    } else if (segment === 'VIP') {
        const groups = await prisma.appointment.groupBy({
            by: ['clienteId'],
            where: { negocioId, estado: { in: COMPLETED_STATES } },
            _count: { id: true },
        });
        const ids = groups.filter((g: any) => (g._count?.id || 0) >= 5).map((g: any) => g.clienteId);
        if (!ids.length) return [];
        where.id = { in: ids };
    } else if (segment === 'INACTIVE') {
        const since = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        const [recent, ever] = await Promise.all([
            prisma.appointment.findMany({ where: { negocioId, fecha: { gte: since } }, select: { clienteId: true }, distinct: ['clienteId'] }),
            prisma.appointment.findMany({ where: { negocioId, fecha: { lt: since } }, select: { clienteId: true }, distinct: ['clienteId'] }),
        ]);
        const recentSet = new Set(recent.map((r) => r.clienteId));
        const ids = ever.map((r) => r.clienteId).filter((id) => !recentSet.has(id));
        if (!ids.length) return [];
        where.id = { in: ids };
    }

    let clientes = await prisma.cliente.findMany({
        where,
        select: { id: true, nombre: true, telefono: true, fechaNacimiento: true },
        orderBy: { createdAt: 'desc' },
    });

    if (segment === 'BIRTHDAY') {
        const month = now.getMonth();
        clientes = clientes.filter((c) => c.fechaNacimiento && new Date(c.fechaNacimiento).getUTCMonth() === month);
    }

    return clientes.map((c) => ({ id: c.id, nombre: c.nombre, telefono: c.telefono, phone: normalizePhone(c.telefono) }));
}

/** Cruza clientes con sus cuentas (Usuario) por teléfono. */
async function matchAccounts(clients: AudienceClient[]): Promise<Map<string, string>> {
    const variantToClient = new Map<string, string>();
    for (const c of clients) {
        if (!c.phone) continue;
        for (const v of phoneVariants(c.phone)) variantToClient.set(v, c.id);
    }
    const variants = Array.from(variantToClient.keys());
    const clientToUser = new Map<string, string>();
    for (let i = 0; i < variants.length; i += 400) {
        const chunk = variants.slice(i, i + 400);
        const users = await prisma.usuario.findMany({ where: { phone: { in: chunk } }, select: { id: true, phone: true } });
        for (const u of users) {
            const cid = u.phone ? variantToClient.get(u.phone) : undefined;
            if (cid && !clientToUser.has(cid)) clientToUser.set(cid, u.id);
        }
    }
    return clientToUser;
}

export async function audienceSummary(negocioId: string, segment: Segment, clienteIds: string[] = []) {
    const clients = await resolveAudience(negocioId, segment, clienteIds);
    const accounts = await matchAccounts(clients);
    const userIds = Array.from(new Set(accounts.values()));
    const withPush = userIds.length
        ? await prisma.pushToken.findMany({ where: { userId: { in: userIds } }, select: { userId: true }, distinct: ['userId'] })
        : [];
    return {
        total: clients.length,
        conApp: accounts.size,
        conPush: withPush.length,
        conWhatsApp: clients.filter((c) => c.phone).length,
    };
}

// ── Estado de los canales ──────────────────────────────────────────────

export async function getPushAdmin(): Promise<any | null> {
    try {
        const { initFirebaseAdmin } = await import('@/lib/notifications');
        await initFirebaseAdmin();
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const admin = require('firebase-admin');
        return admin?.apps?.length ? admin : null;
    } catch {
        return null;
    }
}

export async function getWhatsAppConnection(): Promise<{ conectado: boolean; estado: string; numero?: string }> {
    try {
        const { getWhatsAppStatus } = await import('@/lib/whatsapp-client');
        const s: any = await getWhatsAppStatus();
        return { conectado: Boolean(s?.connected), estado: s?.status || 'offline', numero: s?.connectedTo };
    } catch {
        return { conectado: false, estado: 'offline' };
    }
}

export async function whatsappSentToday(negocioId: string): Promise<number> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const rows = await prisma.notification.findMany({
        where: { negocioId, tipo: CAMPAIGN_TIPO, createdAt: { gte: start } },
        select: { metricas: true },
    });
    return rows.reduce((sum, r) => sum + (parseJSON<CampaignStats | null>(r.metricas, null)?.whatsapp?.enviados || 0), 0);
}

// ── Crear y ejecutar campañas ──────────────────────────────────────────

function tipoForCategoria(categoria: string): { tipo: string; icono: string } {
    switch (categoria) {
        case 'PROMOCIONES': return { tipo: 'PROMO', icono: 'Tag' };
        case 'PREMIOS': return { tipo: 'PREMIO', icono: 'Gift' };
        case 'CAMPANAS': return { tipo: 'CAMPANA', icono: 'Trophy' };
        case 'RECORDATORIOS': return { tipo: 'RECORDATORIO', icono: 'Calendar' };
        default: return { tipo: 'NOTICIA', icono: 'Bell' };
    }
}

export async function createCampaign(input: {
    negocioId: string;
    titulo: string;
    mensaje: string;
    segmento: Segment;
    clienteIds?: string[];
    canales: Channel[];
    categoria?: string;
    link?: string;
    scheduledFor?: Date | null;
    creadoPor?: string;
}) {
    const campaignId = `cmp_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
    const programada = Boolean(input.scheduledFor && input.scheduledFor.getTime() > Date.now() + 60 * 1000);
    const stats: CampaignStats = {
        campaignId,
        estado: programada ? 'PROGRAMADA' : 'ENVIANDO',
        segmento: input.segmento,
        canales: input.canales,
        categoria: input.categoria || 'NOTICIAS',
        link: input.link || '',
        clienteIds: input.segmento === 'USER' ? (input.clienteIds || []).slice(0, 500) : undefined,
        audiencia: 0,
        app: { cuentas: 0, enviadas: 0, push: 0, pushFallidos: 0 },
        whatsapp: { total: 0, enviados: 0, fallidos: 0, omitidos: 0, estado: input.canales.includes('WHATSAPP') ? 'PENDIENTE' : 'NO' },
        creadoPor: input.creadoPor,
    };

    const summary = await prisma.notification.create({
        data: {
            negocioId: input.negocioId,
            userId: null,
            tipo: CAMPAIGN_TIPO,
            categoria: stats.categoria,
            titulo: input.titulo,
            descripcion: input.mensaje,
            prioridad: 'INFO',
            recipientType: 'CAMPAIGN',
            archived: true, // invisible para los clientes
            leida: true,
            scheduledFor: programada ? input.scheduledFor : null,
            metricas: JSON.stringify(stats),
        },
    });

    if (!programada) {
        // No bloquea la respuesta: el envío sigue en segundo plano
        runCampaign(summary.id).catch((err) => console.error('[CAMPAIGN] Error ejecutando campaña', summary.id, err));
    }
    return { id: summary.id, campaignId, programada };
}

async function saveStats(id: string, stats: CampaignStats) {
    await prisma.notification.update({ where: { id }, data: { metricas: JSON.stringify(stats) } }).catch(() => {});
}

export async function runCampaign(summaryId: string) {
    const summary = await prisma.notification.findUnique({ where: { id: summaryId } });
    if (!summary || summary.tipo !== CAMPAIGN_TIPO) return;
    const stats = parseJSON<CampaignStats>(summary.metricas, null as any);
    if (!stats) return;

    const negocio = await prisma.negocio.findUnique({
        where: { id: summary.negocioId },
        select: { slug: true, nombre: true, logoUrl: true },
    });
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://citiox.com').replace(/\/$/, '');
    const link = stats.link && /^https?:\/\//.test(stats.link) ? stats.link : `${appUrl}/${negocio?.slug || ''}${stats.link && stats.link !== '/' ? stats.link : ''}`;
    const icon = negocio?.logoUrl ? (negocio.logoUrl.startsWith('http') ? negocio.logoUrl : `${appUrl}${negocio.logoUrl}`) : `${appUrl}/citiox-icon.png`;

    try {
        const clients = await resolveAudience(summary.negocioId, stats.segmento, stats.clienteIds || []);
        stats.audiencia = clients.length;
        stats.estado = 'ENVIANDO';
        await saveStats(summaryId, stats);

        // 1) App: centro de notificaciones + push
        if (stats.canales.includes('APP')) {
            const accounts = await matchAccounts(clients);
            const userIds = Array.from(new Set(accounts.values()));
            stats.app.cuentas = userIds.length;
            const { tipo, icono } = tipoForCategoria(stats.categoria);

            for (const userId of userIds) {
                await prisma.notification.create({
                    data: {
                        negocioId: summary.negocioId,
                        userId,
                        tipo,
                        categoria: stats.categoria,
                        titulo: summary.titulo,
                        descripcion: summary.descripcion,
                        icono,
                        prioridad: 'INFO',
                        recipientType: 'USER',
                        actionType: 'ABRIR_URL',
                        actionPayload: JSON.stringify({ url: stats.link || '/' }),
                        metricas: JSON.stringify({ campaignId: stats.campaignId, enviadas: 1 }),
                    },
                }).then(() => { stats.app.enviadas++; }).catch(() => {});
            }

            const admin = userIds.length ? await getPushAdmin() : null;
            if (userIds.length && !admin) {
                stats.app.pushSinConfigurar = true;
            } else if (admin) {
                const tokens = await prisma.pushToken.findMany({ where: { userId: { in: userIds } }, select: { token: true } });
                for (const t of tokens) {
                    try {
                        await admin.messaging().send({
                            token: t.token,
                            // Solo "data": el service worker muestra UNA notificación con el logo y el enlace correctos
                            data: {
                                title: summary.titulo,
                                body: summary.descripcion,
                                icon,
                                link,
                                campaignId: stats.campaignId,
                            },
                            webpush: { headers: { Urgency: 'high', TTL: '86400' } },
                        });
                        stats.app.push++;
                    } catch (err: any) {
                        stats.app.pushFallidos++;
                        const code = String(err?.code || err?.errorInfo?.code || '');
                        if (code.includes('registration-token-not-registered') || code.includes('invalid-registration-token') || code.includes('invalid-argument')) {
                            await prisma.pushToken.delete({ where: { token: t.token } }).catch(() => {});
                        }
                    }
                }
            }
            await saveStats(summaryId, stats);
        }

        // 2) WhatsApp: en segundo plano, de uno en uno
        if (stats.canales.includes('WHATSAPP')) {
            const conPhone = clients.filter((c) => c.phone);
            stats.whatsapp.total = conPhone.length;
            stats.whatsapp.omitidos = clients.length - conPhone.length;

            const wa = await getWhatsAppConnection();
            if (!wa.conectado) {
                stats.whatsapp.estado = 'SIN_CONEXION';
            } else {
                const disponibles = Math.max(0, WHATSAPP_DAILY_LIMIT - (await whatsappSentToday(summary.negocioId)));
                const lote = conPhone.slice(0, disponibles);
                if (lote.length < conPhone.length) stats.whatsapp.omitidos += conPhone.length - lote.length;
                stats.whatsapp.estado = lote.length ? 'ENVIANDO' : 'LIMITE';
                await saveStats(summaryId, stats);

                const { sendWhatsAppMessage } = await import('@/lib/whatsapp-client');
                for (let i = 0; i < lote.length; i++) {
                    const c = lote[i];
                    const firstName = (c.nombre || '').trim().split(/\s+/)[0] || '';
                    const texto = buildWhatsAppText(summary.titulo, summary.descripcion, firstName, negocio?.nombre || '', link);
                    const res = await sendWhatsAppMessage(c.phone!, texto, 'campana');
                    if (res?.success) stats.whatsapp.enviados++;
                    else stats.whatsapp.fallidos++;
                    if (i % 5 === 4) await saveStats(summaryId, stats);
                    if (i < lote.length - 1) await sleep(WA_DELAY_MIN + Math.random() * (WA_DELAY_MAX - WA_DELAY_MIN));
                }
                if (stats.whatsapp.estado === 'ENVIANDO') stats.whatsapp.estado = 'COMPLETADO';
            }
        }

        stats.estado = 'COMPLETADA';
        stats.finalizadaEn = new Date().toISOString();
        await saveStats(summaryId, stats);
    } catch (err: any) {
        stats.estado = 'ERROR';
        stats.error = String(err?.message || err).slice(0, 300);
        await saveStats(summaryId, stats);
        throw err;
    }
}

export function buildWhatsAppText(titulo: string, mensaje: string, nombre: string, negocio: string, link: string) {
    const saludo = nombre ? `Hola ${nombre} 👋\n\n` : '';
    const cuerpo = mensaje.replace(/\{nombre\}/gi, nombre || '');
    const firma = negocio ? `\n\n— ${negocio}` : '';
    return `${saludo}*${titulo}*\n\n${cuerpo}\n\n👉 ${link}${firma}`;
}

/** Envía las campañas programadas que ya llegaron a su hora. */
export async function processDueCampaigns() {
    const due = await prisma.notification.findMany({
        where: { tipo: CAMPAIGN_TIPO, scheduledFor: { lte: new Date() }, metricas: { contains: '"estado":"PROGRAMADA"' } },
        select: { id: true, metricas: true },
        take: 20,
    });
    for (const row of due) {
        const stats = parseJSON<CampaignStats | null>(row.metricas, null);
        if (!stats || stats.estado !== 'PROGRAMADA') continue;
        stats.estado = 'ENVIANDO';
        // "Reclamar" la campaña para que no se envíe dos veces
        const claimed = await prisma.notification.updateMany({
            where: { id: row.id, metricas: row.metricas },
            data: { metricas: JSON.stringify(stats) },
        });
        if (claimed.count === 1) {
            runCampaign(row.id).catch((err) => console.error('[CAMPAIGN] Error en campaña programada', row.id, err));
        }
    }
    return due.length;
}

/** Historial: una fila por campaña, con lecturas y clics reales de la app. */
export async function getCampaignHistory(negocioId: string, limit = 20) {
    const rows = await prisma.notification.findMany({
        where: { negocioId, tipo: CAMPAIGN_TIPO },
        orderBy: { createdAt: 'desc' },
        take: limit,
    });

    return Promise.all(rows.map(async (r) => {
        const stats = parseJSON<CampaignStats | null>(r.metricas, null);
        let leidas = 0;
        let clics = 0;
        if (stats?.campaignId && stats.app?.enviadas) {
            const sent = await prisma.notification.findMany({
                where: { negocioId, tipo: { not: CAMPAIGN_TIPO }, metricas: { contains: stats.campaignId } },
                select: { leida: true, metricas: true },
            });
            for (const s of sent) {
                if (s.leida) leidas++;
                clics += parseJSON<any>(s.metricas, {})?.clics || 0;
            }
        }
        return {
            id: r.id,
            titulo: r.titulo,
            mensaje: r.descripcion,
            createdAt: r.createdAt,
            scheduledFor: r.scheduledFor,
            stats,
            leidas,
            clics,
        };
    }));
}

/** Revisa cada minuto si hay campañas programadas por enviar (una sola vez por proceso). */
export function startCampaignScheduler() {
    const g = globalThis as any;
    if (g.__citioxCampaignScheduler) return;
    g.__citioxCampaignScheduler = setInterval(() => {
        processDueCampaigns().catch((err) => console.error('[CAMPAIGN] Programador:', err));
    }, 60 * 1000);
}
