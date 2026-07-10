import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
    request: Request,
    { params }: { params: { slug: string } }
) {
    try {
        const slug = params.slug;

        // 1. Buscar el negocio
        const negocio = await prisma.negocio.findUnique({
            where: { slug }
        });

        if (!negocio) {
            return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
        }

        // 2. Obtener sesión de usuario (opcional)
        const session = await getServerSession(authOptions);
        const userId = (session?.user as any)?.id;

        // 3. Obtener todas las campañas activas de este negocio (o globales de Citiox)
        const campaigns = await prisma.campaign.findMany({
            where: {
                OR: [
                    { negocioId: negocio.id },
                    { negocioId: null } // Campañas globales de Citiox
                ],
                activa: true
            },
            include: {
                Quests: {
                    where: {
                        activa: true,
                        visible: true // Misiones no secretas por defecto
                    },
                    orderBy: {
                        fechaInicio: 'asc'
                    }
                }
            }
        });

        // Aplanar todas las misiones activas
        const quests = campaigns.flatMap(c => c.Quests.map(q => ({
            ...q,
            campañaNombre: c.nombre
        })));

        let userProgressMap: Record<string, any> = {};
        let gamificationData = {
            level: { nombre: 'Bronce', xpTotal: 0, puntosTier: 0, siguienteNivelXP: 100, progresoXP: 0 },
            badges: [] as any[],
            streak: 0
        };

        if (userId) {
            // 4. Cargar el progreso de misiones del usuario
            const progressList = await prisma.questProgress.findMany({
                where: {
                    userId,
                    Quest: {
                        OR: [
                            { negocioId: negocio.id },
                            { negocioId: null }
                        ]
                    }
                }
            });

            progressList.forEach(p => {
                userProgressMap[p.questId] = p;
            });

            // 5. Cargar datos de gamificación (Nivel, Experiencia)
            const userLevel = await prisma.userLevel.findUnique({
                where: { userId },
                include: { LevelTier: true }
            });

            if (userLevel) {
                // Buscar si existe un siguiente tier de nivel
                const nextTier = await prisma.levelTier.findFirst({
                    where: {
                        negocioId: negocio.id,
                        puntosRequeridos: {
                            gt: userLevel.xpTotal
                        }
                    },
                    orderBy: { puntosRequeridos: 'asc' }
                });

                const siguienteNivelXP = nextTier ? nextTier.puntosRequeridos : userLevel.xpTotal + 100;
                const puntosBase = userLevel.LevelTier.puntosRequeridos;
                const xpParaSubir = siguienteNivelXP - puntosBase;
                const xpActualRelativo = userLevel.xpTotal - puntosBase;
                const progresoXP = xpParaSubir > 0 ? Math.min(100, Math.round((xpActualRelativo / xpParaSubir) * 100)) : 100;

                gamificationData.level = {
                    nombre: userLevel.LevelTier.nombre,
                    xpTotal: userLevel.xpTotal,
                    puntosTier: userLevel.puntosTier,
                    siguienteNivelXP,
                    progresoXP
                };
            }

            // 6. Cargar insignias del usuario
            const userBadges = await prisma.userBadge.findMany({
                where: { userId },
                include: { Badge: true }
            });
            gamificationData.badges = userBadges.map(ub => ub.Badge);

            // 7. Cargar racha (streak)
            const streak = await prisma.userStreak.findUnique({
                where: { userId_negocioId: { userId, negocioId: negocio.id } }
            });
            gamificationData.streak = streak?.rachaActual || 0;
        }

        // 8. Combinar misiones con el progreso del cliente
        const mappedQuests = quests.map(q => {
            const progress = userProgressMap[q.id];
            
            // Parsear acciones/recompensas para el cliente
            const accionesRaw = typeof q.acciones === 'string' ? JSON.parse(q.acciones) : q.acciones;
            const recompensas = Array.isArray(accionesRaw) ? accionesRaw.map((a: any) => {
                if (a.action === 'ADD_POINTS') return `${a.value.puntos || a.value} Puntos`;
                if (a.action === 'CREATE_COUPON') return `Cupón Descuento`;
                if (a.action === 'GIVE_BADGE') return `Insignia Exclusiva`;
                if (a.action === 'UP_LEVEL') return `+${a.value.xp || a.value} XP`;
                return 'Recompensa especial';
            }) : ['Premio de fidelidad'];

            return {
                id: q.id,
                nombre: q.nombre,
                descripcion: q.descripcion,
                imagenUrl: q.imagenUrl,
                icono: q.icono,
                color: q.color,
                campaignId: q.campaignId,
                campañaNombre: q.campañaNombre,
                fechaInicio: q.fechaInicio,
                fechaFin: q.fechaFin,
                validacionTipo: q.validacionTipo,
                progresoActual: progress ? progress.progresoActual : 0,
                progresoRequerido: q.cantidadMeta,
                estado: progress ? progress.estado : 'EN_PROGRESO',
                fechaCompletada: progress?.fechaCompletada || null,
                recompensas
            };
        });

        // 9. Separar por pestañas
        const todas = mappedQuests;
        const enProgreso = mappedQuests.filter(q => q.estado === 'EN_PROGRESO' || q.estado === 'PENDIENTE_APROBACION');
        const completadas = mappedQuests.filter(q => q.estado === 'COMPLETADA' || q.estado === 'RECLAMADA');

        return NextResponse.json({
            success: true,
            todas,
            enProgreso,
            completadas,
            gamification: gamificationData
        });

    } catch (err: any) {
        console.error('[Misiones-PublicAPI] Error:', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
