/**
 * Avisos en vivo del chat de un pedido (repartidor ↔ cliente).
 * Un EventEmitter en memoria del servidor: las conexiones abiertas (Server-Sent Events) se enteran al
 * instante de un mensaje nuevo y vuelven a pedir la conversación. Si el servidor tuviera varios procesos,
 * las pantallas igual se actualizan con su consulta periódica.
 */
import { EventEmitter } from 'events';

const g = globalThis as any;
export const chatBus: EventEmitter = g.__citioxChatBus || (g.__citioxChatBus = new EventEmitter());
chatBus.setMaxListeners(500);

export type ChatEvento = { tipo: 'mensaje' | 'leido' | 'estado'; de?: string };

export function avisarChat(orderId: string, evento: ChatEvento) {
    try { chatBus.emit(`pedido:${orderId}`, evento); } catch { /* sin oyentes */ }
}

/** Respuesta SSE que reenvía los avisos de un pedido. Se cierra sola cuando el navegador se va. */
export function streamDeChat(orderId: string, signal: AbortSignal): Response {
    const enc = new TextEncoder();
    let cerrar = () => {};
    const stream = new ReadableStream({
        start(controller) {
            const enviar = (txt: string) => { try { controller.enqueue(enc.encode(txt)); } catch { cerrar(); } };
            const oyente = (e: ChatEvento) => enviar(`event: chat\ndata: ${JSON.stringify(e)}\n\n`);
            chatBus.on(`pedido:${orderId}`, oyente);
            enviar(`retry: 3000\nevent: listo\ndata: {}\n\n`);
            const latido = setInterval(() => enviar(`: ping\n\n`), 20000);
            // Se renueva cada 5 minutos para no dejar conexiones colgadas detrás de proxies
            const tope = setTimeout(() => cerrar(), 5 * 60 * 1000);
            cerrar = () => {
                clearInterval(latido); clearTimeout(tope);
                chatBus.off(`pedido:${orderId}`, oyente);
                try { controller.close(); } catch { /* ya cerrado */ }
            };
            signal.addEventListener('abort', () => cerrar());
        },
        cancel() { cerrar(); },
    });
    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no', // nginx: no acumular, enviar al instante
        },
    });
}
