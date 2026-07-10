import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { executeRewardActions } from '@/lib/growth/rewardEngine';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        const userId = (session?.user as any)?.id;

        if (!userId) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const user = await prisma.usuario.findUnique({
            where: { id: userId },
            select: { negocioId: true }
        });

        const negocioId = user?.negocioId;
        if (!negocioId) {
            return NextResponse.json({ error: 'Negocio no configurado' }, { status: 400 });
        }

        // Obtener todos los progresos de misiones del negocio
        const progressList = await prisma.questProgress.findMany({
            where: {
                Quest: { negocioId }
            },
            include: {
                Quest: true,
                Usuario: {
                    select: {
                        id: true,
                        nombre: true,
                        email: true,
                        phone: true
                    }
                }
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });

        // Obtener historial global de participantes
        const historyList = await prisma.questParticipant.findMany({
            where: {
                Quest: { negocioId }
            },
            include: {
                Quest: true,
                Usuario: {
                    select: {
                        id: true,
                        nombre: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 100
        });

        return NextResponse.json({
            success: true,
            progress: progressList,
            history: historyList
        });

    } catch (err: any) {
        console.error('[Admin-MisionesParticipants-GET] Error:', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        const userId = (session?.user as any)?.id;

        if (!userId) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const user = await prisma.usuario.findUnique({
            where: { id: userId },
            select: { negocioId: true }
        });

        const negocioId = user?.negocioId;
        if (!negocioId) {
            return NextResponse.json({ error: 'Negocio no configurado' }, { status: 400 });
        }

        const body = await request.json();
        const { progressId, action, notas } = body;

        if (!progressId || !action) {
            return NextResponse.json({ error: 'Faltan parámetros progressId o action' }, { status: 400 });
        }

        // Buscar el progreso y validar pertenencia
        const progress = await prisma.questProgress.findFirst({
            where: {
                id: progressId,
                Quest: { negocioId }
            },
            include: {
                Quest: true
            }
        });

        if (!progress) {
            return NextResponse.json({ error: 'Registro de progreso no encontrado' }, { status: 404 });
        }

        if (action === 'APROBAR') {
            // 1. Actualizar el estado del progreso
            await prisma.questProgress.update({
                where: { id: progressId },
                data: {
                    estado: 'COMPLETADA',
                    fechaCompletada: new Date(),
                    progresoActual: progress.progresoRequerido
                }
            });

            // 2. Registrar en la bitácora de participantes
            await prisma.questParticipant.create({
                data: {
                    questId: progress.questId,
                    userId: progress.userId,
                    action: 'APROBADO_ADMIN',
                    detalles: notas || 'Aprobado manualmente por el administrador'
                }
            });

            // 3. Ejecutar las recompensas asociadas
            let rewardActions = [];
            try {
                rewardActions = typeof progress.Quest.acciones === 'string'
                    ? JSON.parse(progress.Quest.acciones)
                    : progress.Quest.acciones;
            } catch (e) {
                console.error('[ParticipantsAPI] Error al parsear acciones:', e);
            }

            if (Array.isArray(rewardActions) && rewardActions.length > 0) {
                await executeRewardActions(
                    negocioId,
                    progress.userId,
                    rewardActions,
                    progress.questId,
                    progress.Quest.nombre
                );
            }

            return NextResponse.json({ success: true, message: 'Misión aprobada y recompensa otorgada con éxito' });
        }

        if (action === 'RECHAZAR') {
            // 1. Regresar progreso a "EN_PROGRESO" y reiniciar el avance
            await prisma.questProgress.update({
                where: { id: progressId },
                data: {
                    estado: 'EN_PROGRESO',
                    progresoActual: 0,
                    fechaCompletada: null
                }
            });

            // 2. Registrar en la bitácora de participantes
            await prisma.questParticipant.create({
                data: {
                    questId: progress.questId,
                    userId: progress.userId,
                    action: 'RECHAZADO_ADMIN',
                    detalles: notas || 'Rechazado manualmente por el administrador'
                }
            });

            return NextResponse.json({ success: true, message: 'Misión rechazada y restablecida con éxito' });
        }

        return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 });

    } catch (err: any) {
        console.error('[Admin-MisionesParticipants-POST] Error:', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
