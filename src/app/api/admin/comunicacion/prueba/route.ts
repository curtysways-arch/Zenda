import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import { normalizePhone } from '@/lib/loyalty/purchasePoints';
import { buildWhatsAppText, getWhatsAppConnection } from '@/lib/communications/campaigns';

export const dynamic = 'force-dynamic';

/**
 * POST { titulo, mensaje, link, telefono? }
 * Envía el mensaje por WhatsApp SOLO al número del negocio (o al que indique el
 * dueño) para ver cómo llega antes de enviarlo a todos.
 */
export async function POST(req: NextRequest) {
    const session = await getEffectiveAdminSession();
    const user = session?.user as any;
    if (!user?.negocioId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const negocio = await prisma.negocio.findUnique({ where: { id: user.negocioId }, select: { whatsapp: true, slug: true, nombre: true } });
    const phone = normalizePhone(body.telefono || negocio?.whatsapp || '');
    if (!phone) return NextResponse.json({ error: 'Agrega el WhatsApp de tu negocio en "Datos del negocio" o escribe un número.' }, { status: 400 });

    const wa = await getWhatsAppConnection();
    if (!wa.conectado) {
        return NextResponse.json({ error: 'El WhatsApp de Citiox no está conectado en este momento. Avísale a soporte.' }, { status: 503 });
    }

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://citiox.com').replace(/\/$/, '');
    const rawLink = String(body.link || '');
    const link = /^https?:\/\//.test(rawLink) ? rawLink : `${appUrl}/${negocio?.slug || ''}${rawLink && rawLink !== '/' ? rawLink : ''}`;
    const texto = buildWhatsAppText(
        String(body.titulo || 'Mensaje de prueba').slice(0, 65),
        String(body.mensaje || 'Así verán tus clientes tus mensajes.').slice(0, 500),
        (user.name || '').split(' ')[0] || '',
        negocio?.nombre || '',
        link,
    );

    const { sendWhatsAppMessage } = await import('@/lib/whatsapp-client');
    const res = await sendWhatsAppMessage(phone, texto, 'campana_prueba');
    if (!res?.success) return NextResponse.json({ error: res?.error || 'No se pudo enviar la prueba.' }, { status: 502 });
    return NextResponse.json({ success: true, enviadoA: phone });
}
