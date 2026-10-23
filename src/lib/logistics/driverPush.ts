/**
 * Notificaciones push a repartidores.
 * Los repartidores no son usuarios del sistema: su token se guarda en PushToken con
 * `device = 'driver:<últimos 9 dígitos del celular>'` (sin userId ni negocio), así no hace falta otra tabla.
 */
import { randomUUID } from 'crypto';
import prisma from '@/lib/prisma';
import { FirebasePushProvider, firebasePushListo, tokenInvalido } from '@/lib/notifications';

const deviceKey = (phoneKey: string) => `driver:${phoneKey}`;

export async function registerDriverPushToken(phoneKey: string, token: string) {
    if (!phoneKey || !token || token.length < 20) return false;
    const device = deviceKey(phoneKey);
    const existing = await prisma.pushToken.findUnique({ where: { token } }).catch(() => null);
    if (existing) {
        if (existing.device !== device) await prisma.pushToken.update({ where: { token }, data: { device, userId: null, businessId: null } });
    } else {
        await prisma.pushToken.create({ data: { id: randomUUID(), token, device } });
    }
    return true;
}

export type ResultadoPush = { firebaseListo: boolean; tokens: number; enviados: number; borrados: number; errores: string[] };

export async function sendPushToDriver(phoneKey: string | null | undefined, title: string, body: string, link = '/driver'): Promise<ResultadoPush> {
    const res: ResultadoPush = { firebaseListo: false, tokens: 0, enviados: 0, borrados: 0, errores: [] };
    if (!phoneKey) { res.errores.push('sin-celular'); return res; }
    try {
        res.firebaseListo = await firebasePushListo();
        const tokens = await prisma.pushToken.findMany({ where: { device: deviceKey(phoneKey) } });
        res.tokens = tokens.length;
        if (!tokens.length || !res.firebaseListo) return res;
        const provider = new FirebasePushProvider();
        await Promise.all(tokens.map(async (t) => {
            const r = await provider.sendMessage({ to: t.token, message: body, template: title, variables: { link, icon: '/icons/icon-192x192.png' } })
                .catch((e: any) => ({ success: false, code: e?.code || 'desconocido', error: e?.message }));
            if (r.success) { res.enviados++; return; }
            res.errores.push(r.code || 'desconocido');
            // El teléfono ya no acepta avisos con este token (permiso quitado, app borrada…): se elimina
            if (tokenInvalido(r.code)) {
                await prisma.pushToken.delete({ where: { token: t.token } }).catch(() => {});
                res.borrados++;
            }
        }));
        if (res.errores.length) console.warn('[driverPush]', phoneKey, res.errores.join(', '));
    } catch (e: any) {
        console.warn('[driverPush]', e);
        res.errores.push(e?.message || 'error');
    }
    return res;
}

/** Texto claro para el repartidor después de una prueba. */
export function explicarPrueba(r: ResultadoPush): { ok: boolean; mensaje: string } {
    if (!r.firebaseListo) return { ok: false, mensaje: 'El servidor todavía no tiene configurado el servicio de notificaciones (Firebase). Avísale al administrador.' };
    if (!r.tokens) return { ok: false, mensaje: 'Este teléfono no está registrado para recibir avisos. Activa las notificaciones y vuelve a probar.' };
    if (r.enviados > 0) return { ok: true, mensaje: 'Aviso enviado. Debería aparecer en unos segundos.' };
    if (r.borrados > 0) return { ok: false, mensaje: 'El registro de este teléfono había vencido. Activa las notificaciones de nuevo y vuelve a probar.' };
    return { ok: false, mensaje: `No se pudo enviar el aviso (${r.errores[0] || 'error desconocido'}).` };
}
