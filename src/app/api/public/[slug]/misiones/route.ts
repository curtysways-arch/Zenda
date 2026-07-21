import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCurrentLevel, getNextLevel } from '@/lib/loyalty/levelEngine';
import { BusinessMissionService } from '@/lib/growth/businessMissionService';

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

export const dynamic = 'force-dynamic';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const resolvedParams = await params;
        const slug = resolvedParams.slug;

        // 1. Buscar el negocio
        const negocio = await prisma.negocio.findUnique({
            where: { slug }
        });

        if (!negocio) {
            return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
        }

        // 2. Obtener sesión de usuario (opcional)
        let userId: string | undefined = undefined;

        // Intentar primero con la cookie de cliente customer_token (OTP)
        const { cookies } = await import('next/headers');
        const cookieStore = await cookies();
        const token = cookieStore.get("customer_token")?.value;

        if (token) {
            try {
                const { jwtVerify } = await import('jose');
                const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "default_otp_secret_key_change_me");
                const verification = await jwtVerify(token, secret);
                const payload = verification.payload;
                const phone = payload.telefono as string;

                const localTelefono = phone.replace(/^\+(\d{1,4})/, ''); 
                const digitsOnly = phone.replace(/\D/g, ''); 
                const localNoZero = localTelefono.replace(/^0+/, '');

                const user = await prisma.usuario.findFirst({
                    where: {
                        OR: [
                            { phone: phone },
                            { phone: localTelefono },
                            { phone: digitsOnly },
                            { phone: { endsWith: localNoZero } }
                        ]
                    }
                });
                if (user) {
                    userId = user.id;
                }
            } catch (e) {
                console.error("Error validando customer_token en API pública misiones:", e);
            }
        }

        // Si no se obtuvo de la cookie de cliente, intentar con la sesión next-auth
        if (!userId) {
            const session = await getServerSession(authOptions);
            userId = (session?.user as any)?.id;
        }

        // 3. Auto-instalar todas las misiones publicadas para el negocio
        await BusinessMissionService.ensureAllMissionsInstalledForNegocio(negocio.id);

        // 4. Obtener las BusinessMissions del negocio
        const businessMissions = await prisma.businessMission.findMany({
            where: {
                negocioId: negocio.id,
                status: 'ACTIVE',
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

        let userProgressMap: Record<string, any> = {};
        let gamificationData = {
            level: { nombre: 'Bronce', xpTotal: 0, puntosTier: 0, siguienteNivelXP: 100, progresoXP: 0 },
            badges: [] as any[],
            streak: 0
        };

        if (userId) {
            // Cargar el progreso de misiones del usuario
            const progressList = await prisma.businessMissionProgress.findMany({
                where: {
                    userId,
                    BusinessMission: {
                        negocioId: negocio.id
                    }
                }
            });

            progressList.forEach(p => {
                userProgressMap[p.businessMissionId] = p;
            });

            // 5. Cargar datos del Club de Beneficios (Niveles y Temporadas)
            let userPoints = await prisma.userPoints.findUnique({
                where: { userId_negocioId: { userId, negocioId: negocio.id } },
                include: {
                    NivelActual: true,
                    UltimoNivelVisto: true,
                    UltimaTemporadaVista: true
                }
            });

            if (!userPoints) {
                // Crear balance inicial si no existe
                userPoints = await prisma.userPoints.create({
                    data: {
                        userId,
                        negocioId: negocio.id,
                        puntos: 0
                    },
                    include: {
                        NivelActual: true,
                        UltimoNivelVisto: true,
                        UltimaTemporadaVista: true
                    }
                });
            }

            // Recalcular nivel de usuario basándose en su experiencia para mantener consistencia siempre
            const { updateUserLevel } = await import('@/lib/loyalty/levelEngine');
            await updateUserLevel(userId, negocio.id, userPoints.experiencia);

            // Refrescar el registro de userPoints para reflejar cualquier cambio en el nivel
            userPoints = await prisma.userPoints.findUnique({
                where: { userId_negocioId: { userId, negocioId: negocio.id } },
                include: {
                    NivelActual: true,
                    UltimoNivelVisto: true,
                    UltimaTemporadaVista: true
                }
            }) || userPoints;

            // Si no tiene nivel actual, asignárselo de inmediato
            if (!userPoints.nivelActualId) {
                const currentLvl = await getCurrentLevel(userPoints.experiencia, negocio.id);
                if (currentLvl) {
                    userPoints = await prisma.userPoints.update({
                        where: { id: userPoints.id },
                        data: { 
                            nivelActualId: currentLvl.id,
                            ultimoNivelVistoId: currentLvl.id // Inicializar sin animación
                        },
                        include: {
                            NivelActual: true,
                            UltimoNivelVisto: true,
                            UltimaTemporadaVista: true
                        }
                    });
                }
            }

            // Obtener el siguiente nivel y progreso
            const nextLevelData = await getNextLevel(userPoints.experiencia, userPoints.nivelActualId, negocio.id);

            // Obtener temporada activa
            const activeSeason = await prisma.loyaltySeason.findFirst({
                where: { negocioId: negocio.id, activa: true },
                orderBy: { createdAt: 'desc' }
            });

            // Obtener todos los niveles del negocio para el mapa visual
            const allLevels = await prisma.loyaltyLevel.findMany({
                where: { negocioId: negocio.id },
                orderBy: { orden: 'asc' }
            });

            // Determinar si mostramos animación de subida de nivel
            const mostrarAnimacionNivel = userPoints.nivelActualId !== null && 
                                           userPoints.nivelActualId !== userPoints.ultimoNivelVistoId;

            // Determinar si mostramos modal de temporada nueva
            const mostrarModalTemporada = activeSeason !== null && 
                                           (!userPoints.ultimaTemporadaVistaId || userPoints.ultimaTemporadaVistaId !== activeSeason.id);

            gamificationData.level = {
                nombre: userPoints.NivelActual?.nombre || 'Inicial',
                xpTotal: userPoints.experiencia, // Puntos de nivel acumulados
                puntosTier: userPoints.experiencia,
                siguienteNivelXP: nextLevelData ? nextLevelData.diamondsRequired : userPoints.experiencia,
                progresoXP: nextLevelData ? Math.round(nextLevelData.progressPercent) : 100
            } as any;

            (gamificationData as any).loyaltyStatus = {
                diamantes: userPoints.puntos, // Saldo gastable
                experiencia: userPoints.experiencia, // Experiencia de nivel
                cashback: userPoints.cashback || 0.0, // Cashback acumulado del cliente
                nivelActual: userPoints.NivelActual,
                siguienteNivel: nextLevelData,
                mostrarAnimacionNivel,
                mostrarModalTemporada,
                temporadaActiva: activeSeason,
                todosLosNiveles: allLevels
            };

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

        // 8. Mapear las BusinessMissions a Quests compatibles con el frontend
        const mappedQuests = businessMissions.map(bm => {
            const def = bm.MissionDefinition;
            const progress = userProgressMap[bm.id];

            // Formatear recompensas como lista de strings
            const recompensas: string[] = [];
            
            // Recompensas de Citiox (definición)
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

            // Recompensa local del negocio
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
                    recompensas.push(rc.descripcion || 'Premio de fidelidad');
                }
            }

            const recompensasFinal = recompensas.length > 0 ? recompensas : ['Premio de fidelidad'];

            // Determinar estado compatible
            let estado: 'EN_PROGRESO' | 'PENDIENTE_APROBACION' | 'COMPLETADA' | 'RECLAMADA' = 'EN_PROGRESO';
            if (progress) {
                if (progress.estado === 'RECOMPENSADA') {
                    estado = 'RECLAMADA';
                } else if (progress.estado === 'COMPLETADA') {
                    estado = 'COMPLETADA';
                } else if (progress.estado === 'PENDIENTE_APROBACION') {
                    estado = 'PENDIENTE_APROBACION';
                }
            }

            return {
                id: bm.id,
                nombre: def.nombre,
                descripcion: def.descripcion || '',
                imagenUrl: def.imagenUrl || undefined,
                icono: CATEGORY_ICONS[def.categoria] || 'Award',
                color: CATEGORY_COLORS[def.categoria] || '#3b82f6',
                campaignId: bm.id,
                campañaNombre: def.categoria || 'Retos',
                fechaInicio: bm.publishedAt?.toISOString(),
                fechaFin: undefined,
                validacionTipo: def.triggerEvent === 'MANUAL' ? 'MANUAL' : 'AUTOMATICO',
                progresoActual: progress ? progress.progresoActual : 0,
                progresoRequerido: def.cantidadMeta,
                estado,
                fechaCompletada: progress?.fechaCompletada?.toISOString() || null,
                recompensas: recompensasFinal
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
