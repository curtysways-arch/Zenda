/**
 * Retiros agendados: cuando se acerca la hora (45 min antes de la franja), la misión arranca sola
 * y se le avisa al repartidor por notificación push y por WhatsApp.
 * Desde ese momento la app del repartidor muestra solo ese pedido hasta que lo termine.
 */
import prisma from '@/lib/prisma';
import { sendWhatsAppMessage } from '@/lib/whatsapp-client';
import { ventanaRetiro, esParaMasTarde, textoVentana } from '@/lib/laundry/pickupWindow';
import { sendPushToDriver } from '@/lib/logistics/driverPush';
import { phoneKey } from '@/lib/logistics/driverNetwork';
import { agregarMensaje } from '@/lib/orders/orderChat';
import { avisarChat } from '@/lib/orders/chatBus';
import { actualizarExtra } from '@/lib/orders/orderLock';

const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL || 'https://citiox.com';

function waNumber(phone?: string | null) {
    let d = String(phone || '').replace(/\D/g, '');
    if (d.startsWith('0') && d.length === 10) d = '593' + d.slice(1);
    else if (d.length === 9 && d.startsWith('9')) d = '593' + d;
    return d;
}

export async function activateDuePickups(now = new Date()) {
    const orders = await (prisma as any).pedido.findMany({
        where: { estado: 'REPARTIDOR_EN_CAMINO' },
        select: { id: true, numeroPedido: true, createdAt: true, extraInfo: true, nombreCliente: true, direccionCliente: true, negocio: { select: { nombre: true } } },
        take: 500,
    });
    let activados = 0;
    for (const o of orders) {
        const ex: any = typeof o.extraInfo === 'string' ? (() => { try { return JSON.parse(o.extraInfo); } catch { return {}; } })() : (o.extraInfo || {});
        // Solo los agendados (retiroIniciadoAt === null) con repartidor; los pedidos anteriores no tienen el campo
        if (ex.retiroIniciadoAt !== null || !ex.assignedDriverId) continue;
        const v = ventanaRetiro(ex, o.createdAt);
        if (esParaMasTarde(v, now)) continue;

        // Se activa en el turno del pedido: no pisa mensajes ni una cancelación que esté ocurriendo
        const r = await actualizarExtra(o.id, (exF, ped) => {
            if (ped.estado !== 'REPARTIDOR_EN_CAMINO' || exF.retiroIniciadoAt !== null || !exF.assignedDriverId) return null;
            const iso = now.toISOString();
            const nuevo = agregarMensaje({ ...exF, retiroIniciadoAt: iso, recordatorioRepartidorAt: iso }, 'SISTEMA', 'Empezó la hora de tu retiro: el repartidor saldrá hacia tu dirección.').extra;
            return { extra: nuevo };
        });
        if (!r.ok || !r.pedido) continue;
        const exF: any = r.pedido.extraInfo;
        avisarChat(o.id, { tipo: 'estado' });
        activados++;

        const cuando = v.fecha ? textoVentana(v, now) : 'ahora';
        // Celular del repartidor: el de su ficha (el del pedido puede venir vacío)
        const recurso = await (prisma as any).operableResource.findUnique({ where: { id: exF.assignedDriverId }, include: { profile: true } }).catch(() => null);
        const telRepartidor = recurso?.profile?.telefono || exF.assignedDriverPhone;
        const titulo = '⏰ Es hora de tu retiro';
        const cuerpo = `${o.nombreCliente || 'Cliente'} · ${o.direccionCliente || ''} · ${cuando}`.trim();
        sendPushToDriver(phoneKey(telRepartidor), titulo, cuerpo, '/driver').catch(() => {});
        const tel = waNumber(telRepartidor);
        if (tel.length >= 11) {
            const msg = [
                `⏰ *Es hora de tu retiro* (${o.negocio?.nombre || 'Citiox'} · #${o.numeroPedido})`,
                ``,
                `👤 ${o.nombreCliente || 'Cliente'}`,
                o.direccionCliente ? `📍 ${o.direccionCliente}` : null,
                `🕒 ${cuando}`,
                ``,
                `Abre la app para navegar hasta el cliente: ${APP_URL()}/driver`,
            ].filter((l) => l !== null).join('\n');
            sendWhatsAppMessage(tel, msg, 'driver_pickup_reminder').catch(() => {});
        }
    }
    return activados;
}

export function startPickupReminderScheduler() {
    const g = globalThis as any;
    if (g.__citioxPickupReminders) return;
    g.__citioxPickupReminders = true;
    let corriendo = false; // no empieza una vuelta si la anterior sigue trabajando
    const run = async () => {
        if (corriendo) return;
        corriendo = true;
        try { await activateDuePickups(); } catch (e) { console.error('[pickupReminders]', e); } finally { corriendo = false; }
    };
    setTimeout(run, 30 * 1000);
    setInterval(run, 60 * 1000);
}
