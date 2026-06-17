/**
 * Cliente HTTP para comunicarse con el bot de WhatsApp (proceso independiente).
 * Next.js llama a este cliente en lugar de importar Baileys directamente.
 * El bot escucha en http://localhost:3001
 */

const BOT_URL = process.env.BOT_HTTP_URL || "http://127.0.0.1:3001";

export async function sendWhatsAppMessage(numero: string, mensaje: string, tipo: string = 'general'): Promise<{ success: boolean; error?: string }> {
    try {
        console.log(`[WA CLIENT] [${tipo.toUpperCase()}] Enviando a ${numero}`);
        
        const res = await fetch(`${BOT_URL}/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ numero, mensaje }),
            signal: AbortSignal.timeout(15000), 
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Bot respondió ${res.status}: ${err}`);
        }

        const data = await res.json();
        console.log(`[WA CLIENT] [${tipo.toUpperCase()}] Resultado para ${numero}:`, data.success ? '✅ OK' : `❌ Error: ${data.error}`);
        return data;
    } catch (error: any) {
        console.error(`[WA CLIENT] [${tipo.toUpperCase()}] Error crítico para ${numero}:`, error.message);
        return { success: false, error: error.message };
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
