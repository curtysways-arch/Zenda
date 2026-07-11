import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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
            const recompensas = Array.isArray(accionesRaw)
                ? accionesRaw
                    .filter((a: any) => !['SEND_WHATSAPP', 'SEND_PUSH', 'SEND_EMAIL'].includes(a.action))
                    .map((a: any) => {
                        if (a.action === 'ADD_POINTS') {
                            const pts = a.value?.puntos ?? a.value;
                            return `+${pts} puntos`;
                        }
                        if (a.action === 'CREATE_COUPON') {
                            const desc = a.value?.descuento || a.value?.porcentaje;
                            return desc ? `${desc}% descuento` : 'Cupón descuento';
                        }
                        if (a.action === 'GIVE_BADGE' || a.action === 'AWARD_BADGE') return 'Insignia exclusiva';
                        if (a.action === 'UP_LEVEL') return `+${a.value?.xp ?? a.value} XP`;
                        if (a.action === 'PRODUCT_GIFT') return a.value?.name ? `🎁 ${a.value.name}` : 'Producto gratis';
                        if (a.action === 'SERVICE_GIFT') return a.value?.name ? `✨ ${a.value.name}` : 'Servicio gratis';
                        if (a.action === 'ADD_WALLET_BALANCE') {
                            const amt = a.value?.monto ?? a.value;
                            return `$${amt} saldo`;
                        }
                        return null;
                    })
                    .filter(Boolean)
                : [];
            const recompensasFinal = recompensas.length > 0 ? recompensas : ['Premio de fidelidad'];

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
