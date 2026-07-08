import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import * as admin from 'firebase-admin';
import { initFirebaseAdmin } from "@/lib/notifications";

async function getAdminNegocioId() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return null;
    return (session.user as any).negocioId;
}

export async function POST(req: NextRequest) {
    try {
        const negocioId = await getAdminNegocioId();
        if (!negocioId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const body = await req.json();
        const { token } = body;

        if (!token) {
            return NextResponse.json({ error: "Token requerido" }, { status: 400 });
        }

        console.log(`[PUSH TEST API] Enviando test push a token: ${token.substring(0, 15)}...`);

        // Inicializar Firebase Admin
        await initFirebaseAdmin();

        if (admin.apps.length === 0) {
            return NextResponse.json({ error: "Firebase no inicializado. Verifica las credenciales en la base de datos." }, { status: 500 });
        }

        const message = {
            notification: {
                title: "🔔 ¡Test de Push Exitoso!",
                body: "Tus notificaciones push nativas están funcionando correctamente."
            },
            data: {
                title: "🔔 ¡Test de Push Exitoso!",
                body: "Tus notificaciones push nativas están funcionando correctamente.",
                link: "/admin/citas",
                reservaId: "test-manual"
            },
            token: token
        };

        const response = await admin.messaging().send(message);

        return NextResponse.json({
            success: true,
            messageId: response
        });

    } catch (error: any) {
        console.error("[PUSH TEST API] Error:", error);
        return NextResponse.json({
            error: "Error al enviar la push",
            details: error.message || error
        }, { status: 500 });
    }
}
