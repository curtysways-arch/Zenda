/**
 * Cliente HTTP para comunicarse con el bot de WhatsApp (proceso independiente).
 * Next.js llama a este cliente en lugar de importar Baileys directamente.
 * El bot escucha en http://localhost:3001
 */

const BOT_URL = process.env.BOT_HTTP_URL || "http://127.0.0.1:3001";

/**
 * Si el bot no responde, NO hacemos esperar a nadie.
 * Antes cada mensaje esperaba hasta 15 s; crear un pedido o una reserva (que envían 1–2 mensajes)
 * tardaba 15–30 s cuando el bot estaba colgado o desconectado. Ahora:
 *  - el envío espera como máximo 6 s, y
 *  - si falla por tiempo o conexión, los siguientes envíos se omiten durante 60 s (se registra en consola).
 */
const SEND_TIMEOUT_MS = 6000;
const COOL_DOWN_MS = 60000;
const breaker = () => {
    const g = globalThis as any;
    if (!g.__citioxWaBreaker) g.__citioxWaBreaker = { downUntil: 0, skipped: 0 };
    return g.__citioxWaBreaker as { downUntil: number; skipped: number };
};

export async function sendWhatsAppMessage(numero: string, mensaje: string, tipo: string = 'general'): Promise<{ success: boolean; error?: string }> {
    const b = breaker();
    if (Date.now() < b.downUntil) {
        b.skipped++;
        console.warn(`[WA CLIENT] [${tipo.toUpperCase()}] Bot sin respuesta: se omite el envío a ${numero} (${b.skipped} omitidos)`);
        return { success: false, error: 'Bot de WhatsApp no disponible' };
    }
    try {
        console.log(`[WA CLIENT] [${tipo.toUpperCase()}] Enviando a ${numero}`);

        const res = await fetch(`${BOT_URL}/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ numero, mensaje }),
            signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Bot respondió ${res.status}: ${err}`);
        }

        const data = await res.json();
        b.downUntil = 0;
        b.skipped = 0;
        console.log(`[WA CLIENT] [${tipo.toUpperCase()}] Resultado para ${numero}:`, data.success ? '✅ OK' : `❌ Error: ${data.error}`);
        return data;
    } catch (error: any) {
        const msg = String(error?.message || error);
        // Tiempo agotado o bot apagado: pausar envíos un minuto
        if (/timeout|aborted|ECONNREFUSED|fetch failed|ECONNRESET|EHOSTUNREACH/i.test(msg) || error?.name === 'TimeoutError' || error?.name === 'AbortError') {
            b.downUntil = Date.now() + COOL_DOWN_MS;
        }
        console.error(`[WA CLIENT] [${tipo.toUpperCase()}] Error crítico para ${numero}:`, msg);
        return { success: false, error: msg };
    }
}

export async function getWhatsAppStatus(): Promise<{ status: string, connected: boolean, connectedTo?: string, hasQR: boolean }> {
    try {
        const res = await fetch(`${BOT_URL}/status`, {
            signal: AbortSignal.timeout(3000),
        });
        if (!res.ok) throw new Error("Status failed");
        return await res.json();
    } catch {
        return { status: 'offline', connected: false, hasQR: false };
    }
}

export async function getWhatsAppQR(): Promise<{ qr: string | null }> {
    try {
        const res = await fetch(`${BOT_URL}/qr`, {
            signal: AbortSignal.timeout(3000),
        });
        if (!res.ok) throw new Error("QR failed");
        return await res.json();
    } catch {
        return { qr: null };
    }
}

export async function whatsappDisconnect(): Promise<boolean> {
    try {
        const res = await fetch(`${BOT_URL}/logout`, {
            method: "POST",
            signal: AbortSignal.timeout(5000),
        });
        return res.ok;
    } catch {
        return false;
    }
}

export async function whatsappConnect(): Promise<boolean> {
    try {
        const res = await fetch(`${BOT_URL}/connect`, {
            method: "POST",
            signal: AbortSignal.timeout(5000),
        });
        return res.ok;
    } catch {
        return false;
    }
}

export async function isBotConnected(): Promise<boolean> {
    const status = await getWhatsAppStatus();
    return status.connected;
}
