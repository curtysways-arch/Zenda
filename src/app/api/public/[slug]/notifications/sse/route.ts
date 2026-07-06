import { NextRequest } from "next/server";
import { sseEmitter } from "@/lib/notifications/notificationService";
import { jwtVerify } from "jose";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;

    // 1. Obtener customer_token de las cookies
    const cookieHeader = req.headers.get("cookie") || "";
    const tokenMatch = cookieHeader.match(/customer_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;

    if (!token) {
        return new Response("Unauthorized", { status: 401 });
    }

    let payload;
    try {
        const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "default_otp_secret_key_change_me");
        const verification = await jwtVerify(token, secret);
        payload = verification.payload;
    } catch (e) {
        return new Response("Unauthorized", { status: 401 });
    }

    const negocioId = payload.negocioId as string;
    const phone = payload.telefono as string;

    // Buscar al usuario
    const user = await prisma.usuario.findFirst({
        where: {
            negocioId,
            OR: [
                { phone: { contains: phone.replace(/\D/g, '') } },
                { phone }
            ]
        },
        select: { id: true }
    });

    if (!user) {
        return new Response("User not found", { status: 404 });
    }

    const userId = user.id;

    // 2. Establecer stream de eventos SSE
    const responseStream = new TransformStream();
    const writer = responseStream.writable.getWriter();
    const encoder = new TextEncoder();

    // Función para enviar mensaje
    const sendEvent = async (event: string, data: any) => {
        try {
            await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch (e) {
            // Conexión probablemente cerrada
        }
    };

    // Escuchar eventos en tiempo real
    const handleRealtimeEvent = async (event: { negocioId: string; userId: string; data: any }) => {
        if (event.negocioId === negocioId && (event.userId === 'ALL' || event.userId === userId)) {
            await sendEvent(event.data.tipoEvento, event.data.payload);
        }
    };

    sseEmitter.on('realtime_event', handleRealtimeEvent);

    // Keep-alive heartbeat cada 20 segundos
    const heartbeatInterval = setInterval(async () => {
        await sendEvent('heartbeat', { time: Date.now() });
    }, 20000);

    // Limpieza al cerrar la conexión
    req.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
        sseEmitter.off('realtime_event', handleRealtimeEvent);
        try {
            writer.close();
        } catch {}
    });

    // Enviar conexión exitosa
    sendEvent('connected', { userId, status: 'listening' });

    return new Response(responseStream.readable, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
        },
    });
}
