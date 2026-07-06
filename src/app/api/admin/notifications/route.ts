import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NotificationService } from "@/lib/notifications/notificationService";

async function getAdminNegocioId() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return null;
    return (session.user as any).negocioId;
}

/**
 * GET: Obtener historial de notificaciones enviadas y métricas del panel de administrador
 */
export async function GET(req: NextRequest) {
    try {
        const negocioId = await getAdminNegocioId();
        if (!negocioId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get("limit") || "20", 10);
        const page = parseInt(searchParams.get("page") || "1", 10);
        const skip = (page - 1) * limit;

        // Listar notificaciones enviadas (globales o con segmentaciones)
        const notifications = await prisma.notification.findMany({
            where: {
                negocioId,
                // Filtramos por notificaciones enviadas por campañas (tipo RECORDATORIO, AVISO, PROMO, NOTICIA)
                tipo: { in: ['AVISO', 'PROMO', 'NOTICIA', 'RECORDATORIO'] }
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            include: {
                Usuario: {
                    select: { nombre: true, phone: true }
                }
            }
        });

        const total = await prisma.notification.count({
            where: {
                negocioId,
                tipo: { in: ['AVISO', 'PROMO', 'NOTICIA', 'RECORDATORIO'] }
            }
        });

        // Enriquecer con parsing de métricas JSON
        const items = notifications.map(n => {
            let parsedMetricas = { enviadas: 1, entregadas: 0, vistas: 0, clics: 0 };
            try {
                if (n.metricas) parsedMetricas = JSON.parse(n.metricas);
            } catch {}
            return {
                ...n,
                metricas: parsedMetricas
            };
        });

        return NextResponse.json({
            items,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error: any) {
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}

/**
 * POST: Enviar / Programar notificaciones segmentadas a clientes
 */
export async function POST(req: NextRequest) {
    try {
        const negocioId = await getAdminNegocioId();
        if (!negocioId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const body = await req.json();
        const {
            tipo,
            categoria,
            titulo,
            descripcion,
            icono = "Bell",
            prioridad = "INFO",
            recipientType,
            actionType,
            actionPayload,
            scheduledFor,
            channels = ["APP"],
            userIds = [] // Destinatarios específicos si recipientType === 'USER'
        } = body;

        if (!titulo || !descripcion || !recipientType) {
            return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
        }

        const scheduledDate = scheduledFor ? new Date(scheduledFor) : undefined;

        // 1. Identificar usuarios destinatarios basándose en la segmentación
        let targetUsers: { id: string }[] = [];

        if (recipientType === 'USER' && userIds.length > 0) {
            // Clientes específicos
            targetUsers = userIds.map((id: string) => ({ id }));
        } else if (recipientType === 'ALL') {
            // Todos los usuarios de este negocio
            targetUsers = await prisma.usuario.findMany({
                where: { negocioId, role: 'CLIENTE' },
                select: { id: true }
            });
        } else if (recipientType === 'VIP') {
            // Clientes VIP: Más de 5 citas completadas
            const activeVips = await prisma.appointment.groupBy({
                by: ['usuarioId'],
                where: { negocioId, estado: 'completed', usuarioId: { not: null } },
                _count: { id: true },
                having: { id: { _count: { gt: 5 } } }
            });
            const vipIds = activeVips.map(v => v.usuarioId).filter((id): id is string => !!id);
            targetUsers = await prisma.usuario.findMany({
                where: { id: { in: vipIds } },
                select: { id: true }
            });
        } else if (recipientType === 'INACTIVE') {
            // Clientes inactivos: No han reservado en los últimos 60 días
            const sesentaDiasAgo = new Date();
            sesentaDiasAgo.setDate(sesentaDiasAgo.getDate() - 60);

            const activeRecently = await prisma.appointment.findMany({
                where: { negocioId, fecha: { gte: sesentaDiasAgo }, usuarioId: { not: null } },
                select: { usuarioId: true }
            });
            const activeIds = activeRecently.map(a => a.usuarioId).filter((id): id is string => !!id);

            targetUsers = await prisma.usuario.findMany({
                where: { negocioId, role: 'CLIENTE', id: { notIn: activeIds } },
                select: { id: true }
            });
        } else if (recipientType === 'NEW_CLIENTS') {
            // Nuevos clientes: Creados en los últimos 30 días
            const treintaDiasAgo = new Date();
            treintaDiasAgo.setDate(treintaDiasAgo.getDate() - 30);

            targetUsers = await prisma.usuario.findMany({
                where: { negocioId, role: 'CLIENTE', createdAt: { gte: treintaDiasAgo } },
                select: { id: true }
            });
        }

        if (targetUsers.length === 0) {
            return NextResponse.json({ error: "No se encontraron clientes para la segmentación elegida" }, { status: 400 });
        }

        // 2. Crear una notificación en lote para todos los destinatarios
        const createdNotifications = await Promise.all(
            targetUsers.map(async (u) => {
                return NotificationService.createNotification({
                    negocioId,
                    userId: u.id,
                    tipo,
                    categoria,
                    titulo,
                    descripcion,
                    icono,
                    prioridad,
                    recipientType,
                    actionType,
                    actionPayload,
                    scheduledFor: scheduledDate,
                    channels
                });
            })
        );

        return NextResponse.json({
            success: true,
            destinatariosCount: targetUsers.length,
            scheduled: !!scheduledDate
        });
    } catch (error: any) {
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}
