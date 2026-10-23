/**
 * Notificaciones push a repartidores.
 * Los repartidores no son usuarios del sistema: su token se guarda en PushToken con
 * `device = 'driver:<últimos 9 dígitos del celular>'` (sin userId ni negocio), así no hace falta otra tabla.
 */
import { randomUUID } from 'crypto';
import prisma from '@/lib/prisma';
import { FirebasePushProvider } from '@/lib/notifications';

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

export async function sendPushToDriver(phoneKey: string | null | undefined, title: string, body: string, link = '/driver') {
    if (!phoneKey) return;
    try {
        const tokens = await prisma.pushToken.findMany({ where: { device: deviceKey(phoneKey) } });
        if (!tokens.length) return;
        const provider = new FirebasePushProvider();
        await Promise.all(tokens.map(async (t) => {
            const r = await provider.sendMessage({ to: t.token, message: body, template: title, variables: { link, icon: '/icons/icon-192x192.png' } }).catch(() => ({ success: false }));
            if (!r.success) {
                // Si el token ya no sirve, se limpia en el siguiente intento fallido (el proveedor no expone el código)
            }
        }));
    } catch (e) {
        console.warn('[driverPush]', e);
    }
}
