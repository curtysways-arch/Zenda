import prisma from '../prisma';
import { addPoints } from '../loyalty/loyaltyEngine';
import { NotificationService } from '../notifications/notificationService';

export interface RewardAction {
  action: 'ADD_POINTS' | 'DECREASE_POINTS' | 'CREATE_COUPON' | 'SEND_PUSH' | 'SEND_WHATSAPP' | 'UNLOCK_QUEST' | 'UP_LEVEL' | 'GIVE_BADGE' | 'ADD_WALLET_BALANCE';
  value: any;
}

/**
 * Ejecuta en lote las múltiples recompensas ganadas por el cliente al completar una misión.
 */
export async function executeRewardActions(
    negocioId: string, 
    userId: string, 
    actions: RewardAction[],
    questId: string,
    questName: string
): Promise<void> {
    console.log(`[RewardEngine] Iniciando ejecución de ${actions.length} acciones de recompensa para el usuario: ${userId} en negocio: ${negocioId}`);

    for (const a of actions) {
        try {
            switch (a.action) {
                case 'ADD_POINTS': {
                    const puntos = parseInt(String(a.value.puntos || a.value));
                    await addPoints(userId, negocioId, puntos, 'QUEST_COMPLETED', questId, `Misión completada: ${questName}`);
                    break;
                }
                
                case 'CREATE_COUPON': {
                    const couponCode = `QUEST-${questId.substring(0,4)}-${Math.random().toString(36).substring(2,7).toUpperCase()}`;
                    const valor = parseFloat(String(a.value.valor || 10));
                    const tipo = String(a.value.tipo || 'PORCENTAJE'); // PORCENTAJE | FIJO

                    // Crear cupón en BD
                    const coupon = await prisma.coupon.create({
                        data: {
                            negocioId,
                            codigo: couponCode,
                            tipo,
                            valor,
                            descripcion: `Recompensa por completar la misión: ${questName}`,
                            usosActuales: 0,
                            maxUsos: 1,
                            maxUsosPorCliente: 1,
                            activa: true
                        }
                    });

                    // Registrar uso del cupón asignado al usuario
                    await prisma.couponUsage.create({
                        data: {
                            couponId: coupon.id,
                            userId
                        }
                    });

                    // Notificar al cliente de su cupón ganado
                    await NotificationService.createNotification({
                        negocioId,
                        userId,
                        tipo: 'PREMIO',
                        categoria: 'CUPONES',
                        titulo: '🎁 ¡Cupón de Regalo Ganado!',
                        descripcion: `Completaste la misión "${questName}" y ganaste un cupón de ${tipo === 'PORCENTAJE' ? `${valor}%` : `$${valor}`} de descuento. Código: ${couponCode}`,
                        icono: 'Ticket',
                        prioridad: 'SUCCESS',
                        recipientType: 'USER',
                        actionType: 'VER_PERFIL',
                        actionPayload: JSON.stringify({ screen: 'profile' })
                    });
                    break;
                }

                case 'SEND_PUSH': {
                    const title = String(a.value.title || '🏆 ¡Misión Completada!');
                    const body = String(a.value.body || `Felicidades, completaste la misión: ${questName}`);
                    await NotificationService.createNotification({
                        negocioId,
                        userId,
                        tipo: 'AUTOMATIZACION',
                        categoria: 'PREMIOS',
                        titulo: title,
                        descripcion: body,
                        icono: 'Award',
                        prioridad: 'SUCCESS',
                        recipientType: 'USER'
                    });
                    break;
                }

                case 'GIVE_BADGE': {
                    const badgeId = String(a.value.badgeId || a.value);
                    
                    // Verificar si la insignia ya fue otorgada para evitar duplicados
                    const existing = await prisma.userBadge.findUnique({
                        where: { userId_badgeId: { userId, badgeId } }
                    });

                    if (!existing) {
                        await prisma.userBadge.create({
                            data: { userId, badgeId }
                        });

                        const badge = await prisma.badge.findUnique({
                            where: { id: badgeId }
                        });

                        // Alerta de nueva insignia desbloqueada
                        await NotificationService.createNotification({
                            negocioId,
                            userId,
                            tipo: 'PREMIO',
                            categoria: 'NOTICIAS',
                            titulo: `🎖️ ¡Nueva Insignia Desbloqueada: ${badge?.nombre || 'Logro'}!`,
                            descripcion: `Has ganado la insignia "${badge?.nombre || 'Logro'}" por tu lealtad en nuestro negocio.`,
                            icono: 'ShieldCheck',
                            prioridad: 'SUCCESS',
                            recipientType: 'USER'
                        });
                    }
                    break;
                }

                case 'UP_LEVEL': {
                    const xp = parseInt(String(a.value.xp || a.value || 50));
                    
                    // Buscar o crear registro de nivel de usuario
                    let userLevel = await prisma.userLevel.findUnique({
                        where: { userId }
                    });

                    if (!userLevel) {
                        // Buscar el primer LevelTier del negocio
                        const firstTier = await prisma.levelTier.findFirst({
                            where: { negocioId },
                            orderBy: { puntosRequeridos: 'asc' }
                        });

                        if (firstTier) {
                            userLevel = await prisma.userLevel.create({
                                data: {
                                    userId,
                                    negocioId,
                                    levelId: firstTier.id,
                                    puntosTier: xp,
                                    xpTotal: xp
                                }
                            });
                        }
                    } else {
                        const newXpTotal = userLevel.xpTotal + xp;
                        const newPuntosTier = userLevel.puntosTier + xp;

                        // Evaluar si sube de nivel (buscando el siguiente Tier superior)
                        const nextTier = await prisma.levelTier.findFirst({
                            where: {
                                negocioId,
                                puntosRequeridos: {
                                    lte: newXpTotal,
                                    gt: userLevel.xpTotal
                                }
                            },
                            orderBy: { puntosRequeridos: 'desc' }
                        });

                        await prisma.userLevel.update({
                            where: { userId },
                            data: {
                                xpTotal: newXpTotal,
                                puntosTier: newPuntosTier,
                                levelId: nextTier ? nextTier.id : userLevel.levelId
                            }
                        });

                        if (nextTier) {
                            // Alerta de subida de nivel
                            await NotificationService.createNotification({
                                negocioId,
                                userId,
                                tipo: 'PREMIO',
                                categoria: 'SISTEMA',
                                titulo: `✨ ¡Subiste de Nivel: ${nextTier.nombre}!`,
                                descripcion: `Felicidades, tu nivel actual ahora es ${nextTier.nombre}. ¡Sigue completando misiones!`,
                                icono: 'ChevronsUp',
                                prioridad: 'SUCCESS',
                                recipientType: 'USER'
                            });
                        }
                    }
                    break;
                }

                default:
                    console.warn(`[RewardEngine] Acción de recompensa no soportada: ${a.action}`);
            }
        } catch (e: any) {
            console.error(`[RewardEngine] Error ejecutando acción de recompensa ${a.action}:`, e.message);
        }
    }
}
export type { RewardAction as GrowthRewardAction };
