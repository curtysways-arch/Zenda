import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const negocioId = (session.user as any).negocioId;

        if (!negocioId) {
            return NextResponse.json([]);
        }

        const { searchParams } = new URL(req.url);
        const filter = searchParams.get('filter'); // 'unread' | 'read' | 'all'

        // 1. WHERE clause para comunicaciones globales masivas
        const globalWhere: any = {
            negocioId,
            canal: 'APP',
            communication: {
                estado: 'ENVIADO'
            }
        };

        // 2. WHERE clause para notificaciones operativas del negocio (excluyendo las notificaciones dirigidas al cliente final)
        const operationalWhere: any = {
            negocioId,
            OR: [
                { recipientType: null },
                { recipientType: { not: 'USER' } }
            ]
        };

        if (filter === 'unread') {
            globalWhere.estado = 'ENVIADO';
            globalWhere.fechaLectura = null;

            operationalWhere.leida = false;
            operationalWhere.fechaLectura = null;
        } else if (filter === 'read') {
            globalWhere.estado = 'LEIDO';

            operationalWhere.leida = true;
        }

        // 3. Consultar ambas tablas en paralelo
        const [recipients, operationalNotifications] = await Promise.all([
            prisma.globalCommunicationRecipient.findMany({
                where: globalWhere,
                include: {
                    communication: {
                        include: {
                            autor: {
                                select: {
                                    nombre: true,
                                    apellido: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            }),
            prisma.notification.findMany({
                where: operationalWhere,
                orderBy: {
                    createdAt: 'desc'
                }
            })
        ]);

        // 4. Mapear notificaciones operativas al formato esperado por el frontend
        const mappedOperational = operationalNotifications.map((notif) => {
            let parsedColor = '#0ea5e9';
            if (notif.prioridad === 'ERROR') parsedColor = '#ef4444';
            else if (notif.prioridad === 'WARNING') parsedColor = '#f59e0b';
            else if (notif.prioridad === 'SUCCESS') parsedColor = '#10b981';

            return {
                id: notif.id,
                negocioId: notif.negocioId,
                estado: notif.leida ? 'LEIDO' : 'ENVIADO',
                fechaLectura: notif.fechaLectura,
                createdAt: notif.createdAt,
                isOperational: true,
                actionType: notif.actionType,
                actionPayload: notif.actionPayload,
                communication: {
                    id: notif.id,
                    titulo: notif.titulo,
                    subtitulo: notif.categoria,
                    contenido: notif.descripcion,
                    icono: notif.icono || 'Bell',
                    color: parsedColor,
                    prioridad: notif.prioridad,
                    actionType: notif.actionType,
                    actionPayload: notif.actionPayload
                }
            };
        });

        // 5. Unificar y ordenar de forma cronológica descendente
        const unmergedList = [...recipients, ...mappedOperational];
        const sortedList = unmergedList.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        return NextResponse.json(sortedList);
    } catch (error) {
        console.error('Error al listar notificaciones del admin:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const negocioId = (session.user as any).negocioId;

        if (!negocioId) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await req.json();
        const { recipientId, markAllAsRead } = body;

        if (markAllAsRead) {
            // Marcar ambas tablas como leídas
            await Promise.all([
                prisma.globalCommunicationRecipient.updateMany({
                    where: {
                        negocioId,
                        canal: 'APP',
                        estado: 'ENVIADO',
                        fechaLectura: null
                    },
                    data: {
                        estado: 'LEIDO',
                        fechaLectura: new Date()
                    }
                }),
                prisma.notification.updateMany({
                    where: {
                        negocioId,
                        leida: false,
                        fechaLectura: null
                    },
                    data: {
                        leida: true,
                        fechaLectura: new Date()
                    }
                })
            ]);

            return NextResponse.json({ success: true, count: 'all' });
        }

        if (!recipientId) {
            return NextResponse.json({ error: 'Campos faltantes: recipientId' }, { status: 400 });
        }

        // Intentar actualizar primero en la tabla de notificaciones operativas (Notification)
        const isOperational = await prisma.notification.findFirst({
            where: {
                id: recipientId,
                negocioId
            }
        });

        if (isOperational) {
            const updated = await prisma.notification.update({
                where: { id: recipientId },
                data: {
                    leida: true,
                    fechaLectura: new Date()
                }
            });

            return NextResponse.json({ 
                success: true, 
                item: {
                    id: updated.id,
                    negocioId: updated.negocioId,
                    estado: 'LEIDO',
                    fechaLectura: updated.fechaLectura,
                    createdAt: updated.createdAt,
                    isOperational: true
                } 
            });
        }

        // Si no es operativa, procesar con la tabla GlobalCommunicationRecipient
        const recipient = await prisma.globalCommunicationRecipient.findFirst({
            where: {
                id: recipientId,
                negocioId
            }
        });

        if (!recipient) {
            return NextResponse.json({ error: 'Notificación no encontrada' }, { status: 404 });
        }

        // Marcar como leído
        const updated = await prisma.globalCommunicationRecipient.update({
            where: { id: recipientId },
            data: {
                estado: 'LEIDO',
                fechaLectura: new Date()
            }
        });

        return NextResponse.json({ success: true, item: updated });
    } catch (error) {
        console.error('Error al actualizar notificación del admin:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
