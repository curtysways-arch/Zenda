import prisma from '../prisma';
import { addPoints, generateUniqueClaimCode } from '../loyalty/loyaltyEngine';
import { NotificationService } from '../notifications/notificationService';

export interface RewardAction {
  action: 'ADD_POINTS' | 'DECREASE_POINTS' | 'CREATE_COUPON' | 'SEND_PUSH' | 'SEND_WHATSAPP' | 'UNLOCK_QUEST' | 'UP_LEVEL' | 'GIVE_BADGE' | 'ADD_WALLET_BALANCE' | 'PRODUCT_GIFT' | 'SERVICE_GIFT';
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

                case 'PRODUCT_GIFT': {
                    const name = String(a.value?.name || 'Producto de Regalo');
                    const deliveryType = String(a.value?.deliveryType || 'MANUAL');
                    const recompensaImagenUrl = a.value?.recompensaImagenUrl || null;

                    // Buscar o crear un LoyaltyReward fantasma/de sistema para respaldar esta redención
                    let reward = await prisma.loyaltyReward.findFirst({
                        where: { negocioId, nombre: name, tipo: 'PRODUCTO' }
                    });

                    if (!reward) {
                        reward = await prisma.loyaltyReward.create({
                            data: {
                                negocioId,
                                nombre: name,
                                costoPuntos: 0,
                                tipo: 'PRODUCTO',
                                deliveryType: deliveryType === 'MANUAL' ? 'MANUAL' : 'AUTOMATICO',
                                recompensaImagenUrl,
                                activa: false, // Oculto del catálogo público
                                descripcion: `Premio ganado al completar una misión`
                            }
                        });
                    }

                    const claimCode = deliveryType === 'MANUAL' ? await generateUniqueClaimCode(prisma) : null;
                    const estado = deliveryType === 'MANUAL' ? 'PENDIENTE_ENTREGA' : 'DISPONIBLE';

                    // Crear la redención
                    await prisma.loyaltyRedemption.create({
                        data: {
                            negocioId,
                            userId,
                            rewardId: reward.id,
                            estado: estado as any,
                            claimCode,
                            notas: `Recompensa por completar misión: ${questName}`
                        }
                    });

                    await NotificationService.createNotification({
                        negocioId,
                        userId,
                        tipo: 'PREMIO',
                        categoria: 'PREMIOS',
                        titulo: '🎁 ¡Recompensa Física Ganada!',
                        descripcion: deliveryType === 'MANUAL'
                            ? `Completaste la misión "${questName}" y ganaste: ${name}. Código de reclamo: ${claimCode}`
                            : `Completaste la misión "${questName}" y obtuviste: ${name}.`,
                        icono: 'Gift',
                        prioridad: 'SUCCESS',
                        recipientType: 'USER'
                    });
                    break;
                }

                case 'SERVICE_GIFT': {
                    const name = String(a.value?.name || 'Servicio Gratis');
                    const serviceId = a.value?.serviceId || null;
                    const deliveryType = String(a.value?.deliveryType || 'AUTOMATICO');
                    const recompensaImagenUrl = a.value?.recompensaImagenUrl || null;

                    // Buscar o crear el LoyaltyReward de respaldo
                    let reward = await prisma.loyaltyReward.findFirst({
                        where: { negocioId, nombre: name, tipo: 'SERVICIO_GRATIS', serviceId }
                    });

                    if (!reward) {
                        reward = await prisma.loyaltyReward.create({
                            data: {
                                negocioId,
                                nombre: name,
                                costoPuntos: 0,
                                tipo: 'SERVICIO_GRATIS',
                                deliveryType: deliveryType === 'MANUAL' ? 'MANUAL' : 'AUTOMATICO',
                                serviceId,
                                recompensaImagenUrl,
                                activa: false, // Oculto del catálogo público
                                descripcion: `Servicio gratis ganado al completar una misión`
                            }
                        });
                    }

                    const claimCode = deliveryType === 'MANUAL' ? await generateUniqueClaimCode(prisma) : null;
                    const estado = deliveryType === 'MANUAL' ? 'PENDIENTE_ENTREGA' : 'DISPONIBLE';

                    // Crear la redención
                    await prisma.loyaltyRedemption.create({
                        data: {
                            negocioId,
                            userId,
                            rewardId: reward.id,
                            estado: estado as any,
                            claimCode,
                            notas: `Recompensa por completar misión: ${questName}`
                        }
                    });

                    await NotificationService.createNotification({
                        negocioId,
                        userId,
                        tipo: 'PREMIO',
                        categoria: 'PREMIOS',
                        titulo: '⚡ ¡Servicio Gratis Ganado!',
                        descripcion: deliveryType === 'MANUAL'
                            ? `Completaste la misión "${questName}" y ganaste: ${name}. Código de reclamo: ${claimCode}`
                            : `Completaste la misión "${questName}" y tienes un servicio gratis listo para usar al reservar!`,
                        icono: 'Sparkles',
                        prioridad: 'SUCCESS',
                        recipientType: 'USER'
                    });
                    break;
                }

                case 'ADD_WALLET_BALANCE': {
                    const monto = parseFloat(String(a.value.monto || a.value || 10));
                    
                    // Al no haber monedero acumulable por base de datos directa en esta estructura, 
                    // creamos una redención de tipo CASHBACK en el historial del cliente para que tenga constancia.
                    let reward = await prisma.loyaltyReward.findFirst({
                        where: { negocioId, tipo: 'CASHBACK', valor: String(monto) }
                    });

                    if (!reward) {
                        reward = await prisma.loyaltyReward.create({
                            data: {
                                negocioId,
                                nombre: `Cashback de $${monto}`,
                                costoPuntos: 0,
                                tipo: 'CASHBACK',
                                deliveryType: 'AUTOMATICO',
                                valor: String(monto),
                                activa: false,
                                descripcion: `Cashback ganado por misión`
                            }
                        });
                    }

                    await prisma.loyaltyRedemption.create({
                        data: {
                            negocioId,
                            userId,
                            rewardId: reward.id,
                            estado: 'CANJEADO',
                            notas: `Acreditado automáticamente $${monto} de cashback por la misión: ${questName}`
                        }
                    });

                    await NotificationService.createNotification({
                        negocioId,
                        userId,
                        tipo: 'PREMIO',
                        categoria: 'SISTEMA',
                        titulo: '💰 ¡Cashback Acreditado!',
                        descripcion: `Se ha acreditado $${monto} a tu monedero por completar la misión "${questName}".`,
                        icono: 'CreditCard',
                        prioridad: 'SUCCESS',
                        recipientType: 'USER'
                    });
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
