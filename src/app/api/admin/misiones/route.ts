import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GLOBAL_QUEST_TEMPLATES } from '@/lib/growth/globalTemplates';

/**
 * Gestiona el listado y la creación de campañas y misiones locales del negocio.
 */
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        const userId = (session?.user as any)?.id;

        if (!userId) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // Obtener el negocio asociado al administrador logueado
        // Buscamos en Negocio donde el administrador tenga permisos
        const user = await prisma.usuario.findUnique({
            where: { id: userId },
            select: { negocioId: true }
        });

        const negocioId = user?.negocioId;
        if (!negocioId) {
            return NextResponse.json({ error: 'Negocio no configurado para este usuario' }, { status: 400 });
        }

        // 1. Obtener todas las campañas de este negocio (excluyendo marketplace global Citiox)
        const campaigns = await prisma.campaign.findMany({
            where: { negocioId },
            include: {
                Quests: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // 2. Calcular analíticas generales simplificadas (Fase 1/2 Core)
        const questIds = campaigns.flatMap(c => c.Quests.map(q => q.id));

        const progressStats = await prisma.questProgress.groupBy({
            by: ['estado'],
            where: {
                questId: { in: questIds }
            },
            _count: {
                id: true
            }
        });

        let enProgreso = 0;
        let completadas = 0;

        progressStats.forEach(stat => {
            if (stat.estado === 'EN_PROGRESO' || stat.estado === 'PENDIENTE_APROBACION') {
                enProgreso += stat._count.id;
            } else if (stat.estado === 'COMPLETADA' || stat.estado === 'RECLAMADA') {
                completadas += stat._count.id;
            }
        });

        const totalParticipantes = await prisma.questProgress.count({
            where: { questId: { in: questIds } }
        });

        return NextResponse.json({
            success: true,
            campaigns,
            stats: {
                totalParticipantes,
                enProgreso,
                completadas,
                roiEstimado: completadas > 0 ? 32.5 : 0.0, // Valor mockeado representativo para Fase 2
                reservasGeneradas: completadas // Cada compleción de misiones automáticas representa reservas
            }
        });

    } catch (err: any) {
        console.error('[Admin-MisionesAPI-GET] Error:', err.message);
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
            return NextResponse.json({ error: 'Negocio no configurado para este usuario' }, { status: 400 });
        }

        const body = await request.json();
        const { templateId, customQuest } = body;

        // --- CASO A: INSTALAR PLANTILLA DEL MARKETPLACE (1 CLIC) ---
        if (templateId) {
            const template = GLOBAL_QUEST_TEMPLATES.find(t => t.id === templateId);
            if (!template) {
                return NextResponse.json({ error: 'Plantilla de Marketplace no encontrada' }, { status: 404 });
            }

            // 1. Crear campaña asociada localmente en el negocio
            const campaign = await prisma.campaign.create({
                data: {
                    negocioId,
                    nombre: `Campaña ${template.nombre}`,
                    descripcion: template.descripcion,
                    activa: true,
                    isMarketplace: true,
                    benefits: template.benefits,
                    difficulty: template.difficulty,
                    estImprovement: template.estImprovement
                }
            });

            // 2. Crear la misión asociada dentro de la campaña
            const quest = await prisma.quest.create({
                data: {
                    negocioId,
                    campaignId: campaign.id,
                    nombre: template.nombre,
                    descripcion: template.descripcion,
                    icono: template.icono,
                    color: template.color,
                    visible: true,
                    repetible: false,
                    limiteUsuario: 1,
                    triggerEvent: template.triggerEvent,
                    cantidadMeta: template.cantidadMeta,
                    validacionTipo: template.validacionTipo,
                    condicionesExtra: template.condicionesExtra ? JSON.stringify(template.condicionesExtra) : null,
                    acciones: JSON.stringify(template.acciones),
                }
            });

            return NextResponse.json({
                success: true,
                message: 'Campaña de Marketplace instalada con éxito.',
                campaignId: campaign.id,
                questId: quest.id
            });
        }

        // --- CASO B: CREAR MISIÓN PERSONALIZADA DESDE CERO ---
        if (customQuest) {
            const { nombre, descripcion, icono, color, triggerEvent, cantidadMeta, validacionTipo, acciones, campaignName } = customQuest;

            if (!nombre || !triggerEvent || !acciones) {
                return NextResponse.json({ error: 'Faltan parámetros requeridos para la misión' }, { status: 400 });
            }

            // 1. Crear campaña (o reutilizar una existente)
            let campaign = await prisma.campaign.findFirst({
                where: { negocioId, nombre: campaignName || 'Campaña Personalizada' }
            });

            if (!campaign) {
                campaign = await prisma.campaign.create({
                    data: {
                        negocioId,
                        nombre: campaignName || 'Campaña Personalizada',
                        descripcion: 'Grupo de misiones personalizadas creadas localmente.',
                        activa: true
                    }
                });
            }

            // 2. Crear misión
            const quest = await prisma.quest.create({
                data: {
                    negocioId,
                    campaignId: campaign.id,
                    nombre,
                    descripcion: descripcion || 'Completa esta acción para ganar recompensas.',
                    icono: icono || 'Award',
                    color: color || '#ec4899',
                    visible: true,
                    repetible: false,
                    limiteUsuario: 1,
                    triggerEvent,
                    cantidadMeta: cantidadMeta || 1,
                    validacionTipo: validacionTipo || 'AUTOMATICO',
                    acciones: JSON.stringify(acciones)
                }
            });

            return NextResponse.json({
                success: true,
                message: 'Misión personalizada creada con éxito.',
                campaignId: campaign.id,
                questId: quest.id
            });
        }

        return NextResponse.json({ error: 'Petición inválida' }, { status: 400 });

    } catch (err: any) {
        console.error('[Admin-MisionesAPI-POST] Error:', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
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
        const { questId, campaignId, data } = body;

        if (questId) {
            // Actualizar Misión
            const updatedQuest = await prisma.quest.updateMany({
                where: { id: questId, negocioId },
                data: {
                    nombre: data.nombre,
                    descripcion: data.descripcion,
                    icono: data.icono,
                    color: data.color,
                    triggerEvent: data.triggerEvent,
                    cantidadMeta: Number(data.cantidadMeta),
                    activa: data.activa !== undefined ? Boolean(data.activa) : undefined,
                    acciones: data.acciones ? JSON.stringify(data.acciones) : undefined
                }
            });
            return NextResponse.json({ success: true, message: 'Misión actualizada con éxito' });
        }

        if (campaignId) {
            // Actualizar Campaña
            const updatedCampaign = await prisma.campaign.updateMany({
                where: { id: campaignId, negocioId },
                data: {
                    nombre: data.nombre,
                    descripcion: data.descripcion,
                    activa: data.activa !== undefined ? Boolean(data.activa) : undefined
                }
            });
            return NextResponse.json({ success: true, message: 'Campaña actualizada con éxito' });
        }

        return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });

    } catch (err: any) {
        console.error('[Admin-MisionesAPI-PUT] Error:', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
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

        const { searchParams } = new URL(request.url);
        const questId = searchParams.get('questId');
        const campaignId = searchParams.get('campaignId');

        if (questId) {
            // Borrar Misión
            await prisma.quest.deleteMany({
                where: { id: questId, negocioId }
            });
            return NextResponse.json({ success: true, message: 'Misión eliminada con éxito' });
        }

        if (campaignId) {
            // Borrar Campaña (borra en cascada por configuración de schema.prisma)
            await prisma.campaign.deleteMany({
                where: { id: campaignId, negocioId }
            });
            return NextResponse.json({ success: true, message: 'Campaña eliminada con éxito' });
        }

        return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });

    } catch (err: any) {
        console.error('[Admin-MisionesAPI-DELETE] Error:', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

