import { NextRequest, NextResponse } from "next/server";
import { NotificationService } from "@/lib/notifications/notificationService";
import { jwtVerify } from "jose";
import prisma from "@/lib/prisma";

async function getAuthenticatedUser(req: NextRequest, slug: string) {
    const cookieHeader = req.headers.get("cookie") || "";
    const tokenMatch = cookieHeader.match(/customer_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;

    if (!token) return null;

    try {
        const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "default_otp_secret_key_change_me");
        const verification = await jwtVerify(token, secret);
        const payload = verification.payload;
        
        if (payload.slug !== slug) return null;

        const negocioId = payload.negocioId as string;
        const phone = payload.telefono as string;

        const user = await prisma.usuario.findFirst({
            where: {
                negocioId,
                OR: [
                    { phone: { contains: phone.replace(/\D/g, '') } },
                    { phone }
                ]
            },
            select: { id: true, negocioId: true }
        });

        return user;
    } catch {
        return null;
    }
}

/**
 * GET: Obtener catálogo de notificaciones y actividades del cliente
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const user = await getAuthenticatedUser(req, slug);
        if (!user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const categoria = searchParams.get("categoria") || undefined;
        const search = searchParams.get("search") || undefined;
        const page = parseInt(searchParams.get("page") || "1", 10);
        const limit = parseInt(searchParams.get("limit") || "15", 10);

        const data = await NotificationService.getNotifications({
            negocioId: user.negocioId || '',
            userId: user.id,
            categoria,
            search,
            page,
            limit
        });

        const unreadCount = await NotificationService.getUnreadCount(user.id, user.negocioId || '');

        return NextResponse.json({
            ...data,
            unreadCount
        });
    } catch (error: any) {
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}

/**
 * PATCH: Marcar leídas / Trackear métricas de click
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const user = await getAuthenticatedUser(req, slug);
        if (!user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const body = await req.json();
        const { id, markAll, trackClick } = body;

        // 1. Incrementar clics si se solicita
        if (id && trackClick) {
            await NotificationService.trackMetric(id, 'clics');
            return NextResponse.json({ success: true });
        }

        // 2. Marcar todas como leídas
        if (markAll) {
            await NotificationService.markAllAsRead(user.id, user.negocioId || '');
            return NextResponse.json({ success: true });
        }

        // 3. Marcar una individual como leída
        if (!id) {
            return NextResponse.json({ error: "Falta el ID de la notificación" }, { status: 400 });
        }

        // Validar propiedad de la notificación
        const notif = await prisma.notification.findUnique({
            where: { id },
            select: { userId: true }
        });

        if (!notif || notif.userId !== user.id) {
            return NextResponse.json({ error: "No encontrado" }, { status: 404 });
        }

        await NotificationService.markAsRead(id);
        
        // Registrar vista al marcar como leída
        await NotificationService.trackMetric(id, 'vistas');

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}

/**
 * DELETE: Archivar o eliminar notificación
 */
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const user = await getAuthenticatedUser(req, slug);
        if (!user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Falta el ID de la notificación" }, { status: 400 });
        }

        // Validar propiedad de la notificación
        const notif = await prisma.notification.findUnique({
            where: { id },
            select: { userId: true }
        });

        if (!notif || notif.userId !== user.id) {
            return NextResponse.json({ error: "No encontrado" }, { status: 404 });
        }

        // Archivamos la notificación en lugar de eliminarla físicamente ( UX premium y retención de datos )
        await NotificationService.archiveNotification(id);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}
