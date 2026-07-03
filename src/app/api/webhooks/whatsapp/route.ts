import { NextResponse } from 'next/server';
import { whatsappService } from '@/lib/whatsapp';
import { sendWhatsAppMessage } from '@/lib/whatsapp-client';

import prisma from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        
        // { from: "593987654321" | "72332131446914@lid", text: "1", message_id: "...", raw_jid: "..." }
        let { from, text, message_id, raw_jid, action, bot_number, is_from_me, status, reason } = body;

        // Caso especial: Tarea periódica de mantenimiento (latido)
        if (action === 'check-expirations') {
            try {
                // console.log("[WEBHOOK WA] [MAINTENANCE] Ejecutando control de expiraciones...");
                await (whatsappService as any).checkExpirations();
                return NextResponse.json({ success: true, processed: "expirations" });
            } catch (err) {
                console.error("[WEBHOOK WA] Error en checkExpirations:", err);
                return NextResponse.json({ status: 500, error: "Mantenimiento falló" });
            }
        }

        // Caso especial: Alerta de desconexión del Bot de WhatsApp
        if (action === 'connection-status' && status === 'disconnected') {
            try {
                const { notificationService } = await import('@/lib/notifications');
                await notificationService.adminAlert(
                    "⚠️ WhatsApp Desconectado",
                    `El servicio de WhatsApp se ha desconectado. Detalle: ${reason || 'Desconexión de WhatsApp detectada'}`
                );
                return NextResponse.json({ success: true, processed: "disconnection-alert" });
            } catch (err) {
                console.error("[WEBHOOK WA] Error enviando alerta de desconexión:", err);
                return NextResponse.json({ status: 500, error: "Fallo al enviar alerta" });
            }
        }

        if (!text) {
            return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
        }

        const msgId = message_id || `internal_${Date.now()}_${Math.random()}`;

        console.log(`[WEBHOOK WA] Recibido de ${from}: "${text}" (id: ${msgId}, bot: ${bot_number}, isFromMe: ${is_from_me})`);

        const responseText = await whatsappService.handleIncomingMessage({
            id: msgId,
            from,
            body: text,
            timestamp: Date.now(),
            bot_number,
            is_from_me
        });

        return NextResponse.json({ success: true, response: responseText });
    } catch (error) {
        console.error("WhatsApp Webhook Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
