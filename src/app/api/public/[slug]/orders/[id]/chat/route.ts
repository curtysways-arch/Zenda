import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { avisarChat } from '@/lib/orders/chatBus';
import { actualizarExtra } from '@/lib/orders/orderLock';
import { sendPushToDriver } from '@/lib/logistics/driverPush';
import { phoneKey } from '@/lib/logistics/driverNetwork';
import { agregarMensaje, chatActivo, chatPublico, limpiarTexto, marcarLeido, mensajesDe, sinLeer } from '@/lib/orders/orderChat';

export const dynamic = 'force-dynamic';

/**
 * Chat del cliente con su repartidor.
 * Se entra con el enlace privado del pedido (el id largo que le llega por WhatsApp), igual que para
 * ingresar los códigos de retiro: buscar por número de orden NO da acceso al chat.
 */
async function cargar(slug: string, id: string) {
    const negocio = await prisma.negocio.findUnique({ where: { slug }, select: { id: true } });
    if (!negocio) return null;
    const ord = await (prisma as any).pedido.findUnique({ where: { id }, select: { id: true, negocioId: true, estado: true, extraInfo: true, nombreCliente: true } });
    if (!ord || ord.negocioId !== negocio.id) return null;
    const extra = typeof ord.extraInfo === 'string' ? (() => { try { return JSON.parse(ord.extraInfo); } catch { return {}; } })() : (ord.extraInfo || {});
    return { ord, extra };
}

function respuesta(ord: any, extra: any) {
    const activo = chatActivo(ord.estado, extra);
    return {
        success: true,
        activo,
        repartidor: activo ? { nombre: String(extra.assignedDriverName || extra.assignedDriver || 'Tu repartidor') } : null,
        mensajes: activo ? chatPublico(extra) : [],
        sinLeer: activo ? sinLeer(extra, 'CLIENTE') : 0,
    };
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
    const { slug, id } = await params;
    const c = await cargar(slug, id);
    if (!c) return NextResponse.json({ success: false, error: 'Pedido no encontrado' }, { status: 404 });
    // ?leer=1 marca como leído (la página lo pide cuando el chat está abierto)
    if (new URL(request.url).searchParams.get('leer') === '1' && chatActivo(c.ord.estado, c.extra) && sinLeer(c.extra, 'CLIENTE') > 0) {
        const r = await actualizarExtra(c.ord.id, (ex) => ({ extra: marcarLeido(ex, 'CLIENTE') }));
        if (r.ok && r.pedido) { c.extra = r.pedido.extraInfo; avisarChat(c.ord.id, { tipo: 'leido', de: 'CLIENTE' }); }
    }
    return NextResponse.json(respuesta(c.ord, c.extra), { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
    const { slug, id } = await params;
    const c = await cargar(slug, id);
    if (!c) return NextResponse.json({ success: false, error: 'Pedido no encontrado' }, { status: 404 });
    const body = await request.json().catch(() => ({}));
    const texto = limpiarTexto(body?.texto);
    if (!texto) return NextResponse.json({ success: false, error: 'Escribe un mensaje.' }, { status: 400 });

    // Se lee, valida y guarda en el turno del pedido: dos mensajes simultáneos no se pisan
    let error: { msg: string; status: number } | null = null;
    const r = await actualizarExtra(c.ord.id, (ex, ped) => {
        if (!chatActivo(ped.estado, ex)) { error = { msg: 'Tu pedido ya no tiene un repartidor en camino.', status: 409 }; return null; }
        const ultimo = mensajesDe(ex).filter((m) => m.de === 'CLIENTE').at(-1);
        if (ultimo && Date.now() - Date.parse(ultimo.at) < 800) { error = { msg: 'Espera un momento antes de enviar otro mensaje.', status: 429 }; return null; }
        return { extra: agregarMensaje(ex, 'CLIENTE', texto).extra };
    });
    if (!r.ok || !r.pedido) {
        const e = error as { msg: string; status: number } | null;
        return NextResponse.json({ success: false, error: e?.msg || 'No se pudo enviar.' }, { status: e?.status || 400 });
    }
    const extra = r.pedido.extraInfo;
    avisarChat(c.ord.id, { tipo: 'mensaje', de: 'CLIENTE' });
    // Push al repartidor (por si tiene el teléfono bloqueado)
    try {
        const rec = await (prisma as any).operableResource.findUnique({ where: { id: extra.assignedDriverId }, include: { profile: true } });
        const quien = String(c.ord.nombreCliente || 'El cliente').split(' ')[0];
        sendPushToDriver(phoneKey(rec?.profile?.telefono || extra.assignedDriverPhone), `💬 ${quien} te escribió`, texto.length > 120 ? texto.slice(0, 117) + '…' : texto, '/driver').catch(() => {});
    } catch { /* sin push */ }
    return NextResponse.json(respuesta(r.pedido, extra));
}
