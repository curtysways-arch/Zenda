/**
 * Escrituras ordenadas sobre un pedido.
 *
 * El chat, la llegada del repartidor, los cambios de estado y el programador de recordatorios guardan
 * cosas en el mismo `extraInfo`. Si dos de ellos escriben al mismo tiempo, el último podría borrar lo
 * del primero (por ejemplo, un mensaje). Para evitarlo:
 *   1. las escrituras de un mismo pedido se hacen en fila (una a la vez), y
 *   2. justo antes de guardar se vuelve a leer el pedido y se suman los mensajes que hayan llegado.
 */
import prisma from '@/lib/prisma';
import { CHAT_MAX_MENSAJES, mensajesDe, type ChatMensaje } from '@/lib/orders/orderChat';

const g = globalThis as any;
const colas: Map<string, Promise<unknown>> = g.__citioxOrderLocks || (g.__citioxOrderLocks = new Map());

/** Ejecuta `fn` cuando terminen las escrituras anteriores del mismo pedido. */
export async function withOrderLock<T>(orderId: string, fn: () => Promise<T>): Promise<T> {
    const anterior = colas.get(orderId) || Promise.resolve();
    let liberar!: () => void;
    const turno = new Promise<void>((r) => { liberar = r; });
    const cola = anterior.catch(() => {}).then(() => turno);
    colas.set(orderId, cola);
    await anterior.catch(() => {});
    try {
        return await fn();
    } finally {
        liberar();
        if (colas.get(orderId) === cola) colas.delete(orderId);
    }
}

const parse = (raw: any) => (typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return {}; } })() : (raw || {}));
const masReciente = (a?: string, b?: string) => (!a ? b : !b ? a : (Date.parse(a) >= Date.parse(b) ? a : b));

/**
 * Suma a `nuevo` los mensajes que existen en la base y que `nuevo` no conoce
 * (los que se escribieron mientras se preparaba este cambio). Los ya archivados no se vuelven a agregar.
 */
export function combinarChat(nuevo: any, actual: any): any {
    const propios = mensajesDe(nuevo);
    const ids = new Set(propios.map((m) => m.id));
    const archivados = new Set<string>(
        (Array.isArray(nuevo?.chatHistorial) ? nuevo.chatHistorial : []).flatMap((h: any) => (h?.mensajes || []).map((m: any) => m.id)),
    );
    const faltan = mensajesDe(actual).filter((m) => !ids.has(m.id) && !archivados.has(m.id));
    const res = { ...(nuevo || {}) };
    if (faltan.length) {
        res.chat = [...propios, ...faltan].sort((a: ChatMensaje, b: ChatMensaje) => Date.parse(a.at) - Date.parse(b.at)).slice(-CHAT_MAX_MENSAJES);
    }
    // Lecturas y avisos: se queda con lo más reciente (salvo que el chat se haya archivado en este cambio)
    if (propios.length || faltan.length) {
        const leido = { ...(nuevo?.chatLeido || {}) };
        for (const k of ['REPARTIDOR', 'CLIENTE']) {
            const v = masReciente(leido[k], actual?.chatLeido?.[k]);
            if (v) leido[k] = v;
        }
        res.chatLeido = leido;
    }
    const aviso = masReciente(nuevo?.chatAvisoClienteAt, actual?.chatAvisoClienteAt);
    if (aviso) res.chatAvisoClienteAt = aviso;
    return res;
}

export class ConflictoPedido extends Error {}

/**
 * Guarda el pedido en su turno, sin perder mensajes que hayan llegado mientras tanto.
 * `validar` revisa el pedido tal como está en la base justo antes de guardar; si devuelve un texto,
 * no se guarda y se lanza ConflictoPedido con ese texto (por ejemplo, "otro repartidor ya lo tomó").
 */
export async function guardarPedido(orderId: string, data: { estado?: string; extraInfo: any; [k: string]: any }, validar?: (actual: { estado: string; extra: any }) => string | null) {
    return withOrderLock(orderId, async () => {
        const actual = await (prisma as any).pedido.findUnique({ where: { id: orderId }, select: { extraInfo: true, estado: true } });
        const exActual = parse(actual?.extraInfo);
        const problema = validar ? validar({ estado: actual?.estado, extra: exActual }) : null;
        if (problema) throw new ConflictoPedido(problema);
        const extraInfo = combinarChat(data.extraInfo, exActual);
        return (prisma as any).pedido.update({ where: { id: orderId }, data: { ...data, extraInfo } });
    });
}

/**
 * Lee el pedido, aplica un cambio y lo guarda, todo en su turno (para el chat y los avisos cortos).
 * `cambio` recibe el extraInfo actual y devuelve el nuevo, o null para no guardar nada.
 */
export async function actualizarExtra<T = any>(orderId: string, cambio: (extra: any, pedido: any) => { extra: any; resultado?: T } | null | Promise<{ extra: any; resultado?: T } | null>) {
    return withOrderLock(orderId, async () => {
        const ped = await (prisma as any).pedido.findUnique({ where: { id: orderId } });
        if (!ped) return { ok: false as const, resultado: undefined as T | undefined, pedido: null };
        const r = await cambio(parse(ped.extraInfo), ped);
        if (!r) return { ok: false as const, resultado: undefined as T | undefined, pedido: ped };
        await (prisma as any).pedido.update({ where: { id: orderId }, data: { extraInfo: r.extra } });
        return { ok: true as const, resultado: r.resultado, pedido: { ...ped, extraInfo: r.extra } };
    });
}
