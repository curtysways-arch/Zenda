import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GLOBAL_QUEST_TEMPLATES } from '@/lib/growth/globalTemplates';
import { BusinessMissionService } from '@/lib/growth/businessMissionService';


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

        // 1. Auto-instalar todas las misiones publicadas para el negocio
        await BusinessMissionService.ensureAllMissionsInstalledForNegocio(negocioId);

        // 2. Obtener todas las BusinessMissions del negocio
        const businessMissions = await prisma.businessMission.findMany({
            where: {
                negocioId,
                MissionDefinition: {
                    status: 'PUBLISHED'
                }
            },
            include: {
                MissionDefinition: {
                    include: {
                        Rewards: {
                            include: {
                                RewardCatalog: true
                            },
                            orderBy: { orden: 'asc' }
                        }
                    }
                }
            }
        });

        // 3. Agrupar las BusinessMissions por categoria para simular campañas
        const CATEGORY_NAMES: Record<string, string> = {
            RESERVAS: 'Misiones de Reservas',
            REFERIDOS: 'Misiones de Referidos',
            RESENAS: 'Misiones de Reseñas',
            COMPRAS: 'Misiones de Compras',
            PERFIL: 'Misiones de Perfil',
            CUMPLEANOS: 'Misiones de Cumpleaños',
            SOCIAL: 'Misiones de Redes Sociales',
            OTRO: 'Misiones Especiales'
        };

        const CATEGORY_DESCS: Record<string, string> = {
            RESERVAS: 'Retos relacionados con reservas de citas y asistencia.',
            REFERIDOS: 'Retos de recomendación y captación de nuevos amigos.',
            RESENAS: 'Retos de opiniones y reseñas en la plataforma.',
            COMPRAS: 'Retos de consumo y compra de servicios/productos.',
            PERFIL: 'Retos para completar la información del perfil de usuario.',
            CUMPLEANOS: 'Retos de celebración estacional de cumpleaños.',
            SOCIAL: 'Retos de interacción social.',
            OTRO: 'Retos y promociones especiales del club.'
        };

        const CATEGORY_COLORS: Record<string, string> = {
            RESERVAS: '#ec4899',
            REFERIDOS: '#3b82f6',
            RESENAS: '#eab308',
            COMPRAS: '#f43f5e',
            PERFIL: '#06b6d4',
            CUMPLEANOS: '#10b981',
            SOCIAL: '#8b5cf6',
            OTRO: '#64748b'
        };

        const CATEGORY_ICONS: Record<string, string> = {
            RESERVAS: 'Calendar',
            REFERIDOS: 'Users',
            RESENAS: 'Star',
            COMPRAS: 'ShoppingBag',
            PERFIL: 'UserCheck',
            CUMPLEANOS: 'Cake',
            SOCIAL: 'Share2',
            OTRO: 'Award'
        };

        // Agrupar por categoría
        const groupedMap = new Map<string, any>();
        businessMissions.forEach(bm => {
            const def = bm.MissionDefinition;
            const cat = def.categoria || 'OTRO';
            if (!groupedMap.has(cat)) {
                groupedMap.set(cat, {
                    id: cat,
                    nombre: CATEGORY_NAMES[cat] || 'Misiones Generales',
                    descripcion: CATEGORY_DESCS[cat] || 'Misiones del club.',
                    activa: true,
                    Quests: []
                });
            }

            // Construir recompensas textuales
            const recompensas: string[] = [];
            def.Rewards.forEach(r => {
                const catalog = r.RewardCatalog;
                if (catalog.tipo === 'XP') {
                    recompensas.push(`+${(catalog.valor as any)?.cantidad ?? 0} XP`);
                } else if (catalog.tipo === 'DIAMONDS') {
                    recompensas.push(`+${(catalog.valor as any)?.cantidad ?? 0} Diamantes`);
                } else if (catalog.tipo === 'COUPON') {
                    recompensas.push(`Cupón: ${catalog.nombre}`);
                } else {
                    recompensas.push(catalog.nombre);
                }
            });

            if (bm.rewardConfiguration) {
                const rc = bm.rewardConfiguration as any;
                if (rc.rewardType === 'CASHBACK') {
                    recompensas.push(`+${rc.value || 0}% Cashback`);
                } else if (rc.rewardType === 'COUPON') {
                    recompensas.push(`Cupón de Descuento`);
                } else if (rc.rewardType === 'FREE_SERVICE' || rc.rewardType === 'SERVICE') {
                    recompensas.push(`Servicio Gratis`);
                } else if (rc.rewardType === 'PRODUCT') {
                    recompensas.push(`Producto Gratis`);
                } else {
                    recompensas.push(rc.descripcion || 'Recompensa local');
                }
            }

            groupedMap.get(cat).Quests.push({
                id: bm.id,
                nombre: def.nombre,
                descripcion: def.descripcion || '',
                icono: CATEGORY_ICONS[cat] || 'Award',
                color: CATEGORY_COLORS[cat] || '#ec4899',
                visible: true,
                repetible: false,
                limiteUsuario: 1,
                triggerEvent: def.triggerEvent,
                cantidadMeta: def.cantidadMeta,
                validacionTipo: def.triggerEvent === 'MANUAL' ? 'MANUAL' : 'AUTOMATICO',
                condicionesExtra: def.condicionesExtra ? JSON.stringify(def.condicionesExtra) : null,
                acciones: JSON.stringify(recompensas.map(r => ({ action: 'RECOMPENSA', value: r }))),
                activa: bm.status === 'ACTIVE'
            });
        });

        const campaigns = Array.from(groupedMap.values());

        // 4. Calcular estadísticas basadas en BusinessMissionProgress
        const bmIds = businessMissions.map(bm => bm.id);

        const progressStats = await prisma.businessMissionProgress.groupBy({
            by: ['estado'],
            where: {
                businessMissionId: { in: bmIds }
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
            } else if (stat.estado === 'COMPLETADA' || stat.estado === 'RECOMPENSADA') {
                completadas += stat._count.id;
            }
        });

        const totalParticipantes = await prisma.businessMissionProgress.count({
            where: { businessMissionId: { in: bmIds } }
        });

        return NextResponse.json({
            success: true,
            campaigns,
            stats: {
                totalParticipantes,
                enProgreso,
                completadas,
                roiEstimado: completadas > 0 ? 32.5 : 0.0,
                reservasGeneradas: completadas
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
            const { 
                nombre, 
                descripcion, 
                icono, 
                color, 
                triggerEvent, 
                cantidadMeta, 
                validacionTipo, 
                acciones, 
                campaignName,
                servicioId,
                montoMinimo,
                segmentacion,
                condicionesExtra,
                fechaInicio,
                fechaFin,
                visible,
                repetible,
                limiteUsuario,
                limiteGlobal,
                parentQuestId,
                activa
            } = customQuest;

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

            // Inyectar auditoría en condicionesExtra
            let parsedCondiciones = condicionesExtra ? (typeof condicionesExtra === 'string' ? JSON.parse(condicionesExtra) : condicionesExtra) : {};
            if (!parsedCondiciones.auditLog) {
                parsedCondiciones.auditLog = [];
            }
            parsedCondiciones.auditLog.push({
                action: 'CREADA',
                fecha: new Date().toISOString(),
                adminName: (session?.user as any)?.name || 'Administrador',
                detalles: 'Misión creada desde el asistente inteligente'
            });

            // 2. Crear misión
            const quest = await prisma.quest.create({
                data: {
                    negocioId,
                    campaignId: campaign.id,
                    nombre,
                    descripcion: descripcion || 'Completa esta acción para ganar recompensas.',
                    icono: icono || 'Award',
                    color: color || '#ec4899',
                    visible: visible !== undefined ? Boolean(visible) : true,
                    repetible: repetible !== undefined ? Boolean(repetible) : false,
                    limiteUsuario: limiteUsuario !== undefined ? Number(limiteUsuario) : 1,
                    limiteGlobal: limiteGlobal !== undefined && limiteGlobal !== null ? Number(limiteGlobal) : null,
                    triggerEvent,
                    cantidadMeta: cantidadMeta || 1,
                    validacionTipo: validacionTipo || 'AUTOMATICO',
                    acciones: typeof acciones === 'string' ? acciones : JSON.stringify(acciones),
                    servicioId: servicioId || null,
                    montoMinimo: montoMinimo ? Number(montoMinimo) : null,
                    segmentacion: segmentacion ? (typeof segmentacion === 'string' ? JSON.parse(segmentacion) : segmentacion) : null,
                    condicionesExtra: parsedCondiciones,
                    fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
                    fechaFin: fechaFin ? new Date(fechaFin) : null,
                    parentQuestId: parentQuestId || null,
                    activa: activa !== undefined ? Boolean(activa) : true
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
            // Buscamos si es una BusinessMission primero
            const bm = await prisma.businessMission.findFirst({
                where: { id: questId, negocioId }
            });
            if (bm) {
                if (data.activa !== undefined) {
                    await prisma.businessMission.update({
                        where: { id: questId },
                        data: {
                            status: data.activa ? 'ACTIVE' : 'PAUSED'
                        }
                    });
                    return NextResponse.json({ success: true, message: 'Estado de la misión actualizado con éxito' });
                }
                return NextResponse.json({ error: 'Operación no soportada para misiones globales' }, { status: 400 });
            }

            // Buscamos la misión existente para obtener su historial y no perderlo
            const currentQuest = await prisma.quest.findFirst({
                where: { id: questId, negocioId },
                select: { condicionesExtra: true, activa: true }
            });
            let currentCondiciones: any = {};
            if (currentQuest?.condicionesExtra) {
                currentCondiciones = typeof currentQuest.condicionesExtra === 'string' 
                    ? JSON.parse(currentQuest.condicionesExtra) 
                    : currentQuest.condicionesExtra;
            }
            
            let newCondiciones = data.condicionesExtra ? (typeof data.condicionesExtra === 'string' ? JSON.parse(data.condicionesExtra) : data.condicionesExtra) : {};
            let auditLog = currentCondiciones.auditLog || [];
            
            // Detectar qué acción se está realizando
            let actionType = 'EDITADA';
            let detallesMsg = 'Misión actualizada';
            if (data.activa !== undefined && currentQuest) {
                const wasActive = currentQuest.activa;
                if (wasActive !== Boolean(data.activa)) {
                    actionType = data.activa ? 'ACTIVADA' : 'PAUSADA';
                    detallesMsg = data.activa ? 'Misión activada por administrador' : 'Misión pausada por administrador';
                }
            }
            
            auditLog.push({
                action: actionType,
                fecha: new Date().toISOString(),
                adminName: (session?.user as any)?.name || 'Administrador',
                detalles: detallesMsg
            });
            
            newCondiciones.auditLog = auditLog;

            // Actualizar Misión
            const updatedQuest = await prisma.quest.updateMany({
                where: { id: questId, negocioId },
                data: {
                    nombre: data.nombre,
                    descripcion: data.descripcion,
                    icono: data.icono,
                    color: data.color,
                    triggerEvent: data.triggerEvent,
                    cantidadMeta: data.cantidadMeta !== undefined ? Number(data.cantidadMeta) : undefined,
                    activa: data.activa !== undefined ? Boolean(data.activa) : undefined,
                    acciones: data.acciones ? (typeof data.acciones === 'string' ? data.acciones : JSON.stringify(data.acciones)) : undefined,
                    servicioId: data.servicioId !== undefined ? data.servicioId : undefined,
                    montoMinimo: data.montoMinimo !== undefined ? (data.montoMinimo ? Number(data.montoMinimo) : null) : undefined,
                    segmentacion: data.segmentacion !== undefined ? (data.segmentacion ? (typeof data.segmentacion === 'string' ? JSON.parse(data.segmentacion) : data.segmentacion) : null) : undefined,
                    condicionesExtra: newCondiciones,
                    fechaInicio: data.fechaInicio !== undefined ? (data.fechaInicio ? new Date(data.fechaInicio) : null) : undefined,
                    fechaFin: data.fechaFin !== undefined ? (data.fechaFin ? new Date(data.fechaFin) : null) : undefined,
                    parentQuestId: data.parentQuestId !== undefined ? data.parentQuestId : undefined,
                    visible: data.visible !== undefined ? Boolean(data.visible) : undefined,
                    repetible: data.repetible !== undefined ? Boolean(data.repetible) : undefined,
                    limiteUsuario: data.limiteUsuario !== undefined ? Number(data.limiteUsuario) : undefined,
                    limiteGlobal: data.limiteGlobal !== undefined ? (data.limiteGlobal ? Number(data.limiteGlobal) : null) : undefined
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
            // Buscamos si es una BusinessMission primero
            const bm = await prisma.businessMission.findFirst({
                where: { id: questId, negocioId }
            });
            if (bm) {
                await prisma.businessMission.delete({
                    where: { id: questId }
                });
                return NextResponse.json({ success: true, message: 'Misión eliminada con éxito' });
            }

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

