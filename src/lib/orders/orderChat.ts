/**
 * Chat interno entre el repartidor y el cliente de un pedido.
 *
 * Vive dentro del pedido (`extraInfo.chat`), así que no necesita tablas nuevas. Existe solo mientras
 * hay un repartidor asignado: al terminar o cancelar el tramo se archiva en `extraInfo.chatHistorial`
 * y el siguiente repartidor empieza con la conversación vacía.
 */

export type ChatAutor = 'REPARTIDOR' | 'CLIENTE' | 'SISTEMA';
export interface ChatMensaje { id: string; de: ChatAutor; texto: string; at: string; driverId?: string | null }

export const CHAT_MAX_MENSAJES = 200;
export const CHAT_MAX_TEXTO = 500;

/** Estados en los que el repartidor y el cliente pueden escribirse. */
export const ESTADOS_CON_CHAT = [
    // Lavandería: retiro
    'REPARTIDOR_EN_CAMINO', 'RECOGIDO',
    // Lavandería y restaurante: entrega
    'REPARTIDOR_ASIGNADO', 'REPARTIDOR_EN_LOCAL', 'ENTREGADO_A_REPARTIDOR', 'EN_RUTA_ENTREGA', 'EN_CAMINO', 'EN_RUTA',
    'ESPERANDO_CLIENTE', 'WAITING_CLIENT',
];

export function chatActivo(estado: string, extra: any): boolean {
    return Boolean(extra?.assignedDriverId) && ESTADOS_CON_CHAT.includes(String(estado || ''));
}

export function mensajesDe(extra: any): ChatMensaje[] {
    return Array.isArray(extra?.chat) ? extra.chat : [];
}

export function limpiarTexto(t: any): string {
    return String(t ?? '').replace(/\s+/g, ' ').trim().slice(0, CHAT_MAX_TEXTO);
}

/** Agrega un mensaje (devuelve el extra nuevo y el mensaje). */
export function agregarMensaje(extra: any, de: ChatAutor, texto: string, driverId?: string | null): { extra: any; mensaje: ChatMensaje } {
    const mensaje: ChatMensaje = {
        id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
        de, texto: limpiarTexto(texto), at: new Date().toISOString(), driverId: driverId ?? null,
    };
    const chat = [...mensajesDe(extra), mensaje].slice(-CHAT_MAX_MENSAJES);
    const leido = { ...(extra?.chatLeido || {}) };
    if (de !== 'SISTEMA') leido[de] = mensaje.at; // quien escribe ya leyó todo
    return { extra: { ...(extra || {}), chat, chatLeido: leido }, mensaje };
}

export function marcarLeido(extra: any, quien: 'REPARTIDOR' | 'CLIENTE'): any {
    return { ...(extra || {}), chatLeido: { ...(extra?.chatLeido || {}), [quien]: new Date().toISOString() } };
}

/** Mensajes que la otra parte escribió después de la última lectura de `quien`. */
export function sinLeer(extra: any, quien: 'REPARTIDOR' | 'CLIENTE'): number {
    const visto = extra?.chatLeido?.[quien] ? Date.parse(extra.chatLeido[quien]) : 0;
    return mensajesDe(extra).filter((m) => m.de !== quien && m.de !== 'SISTEMA' && Date.parse(m.at) > visto).length;
}

/** Cierra la conversación del tramo actual (se guarda para el negocio) y deja el chat vacío. */
export function archivarChat(extra: any, motivo: string): any {
    const chat = mensajesDe(extra);
    if (!chat.length) return { ...(extra || {}), chat: [], chatLeido: {} };
    const historial = Array.isArray(extra?.chatHistorial) ? extra.chatHistorial : [];
    return {
        ...(extra || {}),
        chat: [],
        chatLeido: {},
        chatHistorial: [...historial, { cerradoAt: new Date().toISOString(), motivo, driverId: extra?.assignedDriverId || null, mensajes: chat }].slice(-10),
    };
}

/** Lo que ve cada parte (sin datos internos). */
export function chatPublico(extra: any) {
    return mensajesDe(extra).map((m) => ({ id: m.id, de: m.de, texto: m.texto, at: m.at }));
}
