import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import {
    createCampaign,
    getCampaignHistory,
    getPushAdmin,
    getWhatsAppConnection,
    processDueCampaigns,
    whatsappSentToday,
    WHATSAPP_DAILY_LIMIT,
    type Channel,
    type Segment,
} from '@/lib/communications/campaigns';

export const dynamic = 'force-dynamic';

const SEGMENTS: Segment[] = ['ALL', 'VIP', 'INACTIVE', 'NEW_CLIENTS', 'BIRTHDAY', 'USER'];
const CATEGORIAS = ['NOTICIAS', 'PROMOCIONES', 'PREMIOS', 'CAMPANAS', 'RECORDATORIOS'];

async function ctx() {
    const session = await getEffectiveAdminSession();
    const user = session?.user as any;
    if (!user?.negocioId) return { error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) };
    const role = String(user.role || '').toUpperCase();
    if (role === 'STAFF' || role === 'PROFESIONAL') {
        return { error: NextResponse.json({ error: 'Solo el dueño o un administrador puede enviar mensajes.' }, { status: 403 }) };
    }
    return { negocioId: user.negocioId as string, userName: (user.name || user.email || '') as string };
}

/** GET: estado de los canales + historial de campañas */
export async function GET() {
    const c = await ctx();
    if ('error' in c) return c.error;
    try {
        processDueCampaigns().catch(() => {});
        const [push, whatsapp, enviadosHoy, historial, negocio] = await Promise.all([
            getPushAdmin(),
            getWhatsAppConnection(),
            whatsappSentToday(c.negocioId),
            getCampaignHistory(c.negocioId),
            prisma.negocio.findUnique({ where: { id: c.negocioId }, select: { whatsapp: true, slug: true, nombre: true, logoUrl: true, colorPrimario: true } }),
        ]);
        return NextResponse.json({
            canales: {
                push: { configurado: Boolean(push) },
                whatsapp: { ...whatsapp, enviadosHoy, limiteDiario: WHATSAPP_DAILY_LIMIT },
            },
            negocio,
            historial,
        });
    } catch (err: any) {
        console.error('[comunicacion GET]', err);
        return NextResponse.json({ error: 'No se pudo cargar el centro de comunicación' }, { status: 500 });
    }
}

/** POST: crear y enviar (o programar) una campaña */
export async function POST(req: NextRequest) {
    const c = await ctx();
    if ('error' in c) return c.error;
    try {
        const body = await req.json().catch(() => ({}));
        const titulo = String(body.titulo || '').trim().slice(0, 65);
        const mensaje = String(body.mensaje || '').trim().slice(0, 500);
        const segmento = (SEGMENTS.includes(body.segmento) ? body.segmento : 'ALL') as Segment;
        const canales = (Array.isArray(body.canales) ? body.canales : []).filter((x: string) => x === 'APP' || x === 'WHATSAPP') as Channel[];
        const categoria = CATEGORIAS.includes(body.categoria) ? body.categoria : 'NOTICIAS';
        const link = typeof body.link === 'string' ? body.link.trim().slice(0, 300) : '';
        const clienteIds = Array.isArray(body.clienteIds) ? body.clienteIds.filter((x: any) => typeof x === 'string').slice(0, 500) : [];
        const scheduledFor = body.scheduledFor ? new Date(body.scheduledFor) : null;

        if (!titulo || !mensaje) return NextResponse.json({ error: 'Escribe un título y un mensaje.' }, { status: 400 });
        if (!canales.length) return NextResponse.json({ error: 'Elige al menos un canal: App o WhatsApp.' }, { status: 400 });
        if (segmento === 'USER' && !clienteIds.length) return NextResponse.json({ error: 'Elige al menos un cliente.' }, { status: 400 });
        if (scheduledFor && isNaN(scheduledFor.getTime())) return NextResponse.json({ error: 'La fecha programada no es válida.' }, { status: 400 });
        if (link && !link.startsWith('/') && !/^https?:\/\//.test(link)) {
            return NextResponse.json({ error: 'El enlace debe empezar con / o con https://' }, { status: 400 });
        }

        const result = await createCampaign({
            negocioId: c.negocioId,
            titulo,
            mensaje,
            segmento,
            clienteIds,
            canales,
            categoria,
            link,
            scheduledFor,
            creadoPor: c.userName,
        });
        return NextResponse.json({ success: true, ...result });
    } catch (err: any) {
        console.error('[comunicacion POST]', err);
        return NextResponse.json({ error: 'No se pudo crear la campaña' }, { status: 500 });
    }
}
