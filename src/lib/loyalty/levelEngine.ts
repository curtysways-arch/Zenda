import prisma from '../prisma';
import crypto from 'crypto';
import { addPoints } from './loyaltyEngine';
import { executeRewardActions, RewardAction } from '../growth/rewardEngine';
import { NotificationService } from '../notifications/notificationService';

/**
 * Crea los niveles por defecto para un negocio si este no posee ningún nivel configurado.
 */
export async function ensureDefaultLevels(negocioId: string): Promise<any[]> {
    const count = await prisma.loyaltyLevel.count({
        where: { negocioId }
    });

    if (count > 0) {
        return await prisma.loyaltyLevel.findMany({
            where: { negocioId },
            orderBy: { orden: 'asc' }
        });
    }

    console.log(`[levelEngine] Inicializando niveles por defecto para el negocio: ${negocioId}`);

    const defaultLevels = [
        {
            nombre: 'Bronce',
            diamantesRequeridos: 0,
            color: '#cd7f32',
            icono: 'Award',
            orden: 1,
            beneficios: ['Acceso al Club de Beneficios', '1x diamantes en citas'],
            recompensaTipo: 'NULL',
            recompensaValor: null,
            multiplicador: 1.0
        },
        {
            nombre: 'Plata',
            diamantesRequeridos: 200,
            color: '#94a3b8',
            icono: 'Shield',
            orden: 2,
            beneficios: ['1.1x diamantes en citas', 'Prioridad en lista de espera'],
            recompensaTipo: 'NULL',
            recompensaValor: null,
            multiplicador: 1.1
        },
        {
            nombre: 'Oro',
            diamantesRequeridos: 400,
            color: '#eab308',
            icono: 'Crown',
            orden: 3,
            beneficios: ['1.2x diamantes en citas', 'Cupón del 10% DTO al ascender'],
            recompensaTipo: 'CUPON',
            recompensaValor: { valor: 10, tipo: 'PORCENTAJE', vencimientoDias: 30 },
            multiplicador: 1.2
        },
        {
            nombre: 'Diamante',
            diamantesRequeridos: 700,
            color: '#06b6d4',
            icono: 'Gem',
            orden: 4,
            beneficios: ['1.3x diamantes en citas', 'Bono de 100 diamantes de regalo', 'Reservas VIP'],
            recompensaTipo: 'PUNTOS',
            recompensaValor: 100,
            multiplicador: 1.3
        },
        {
            nombre: 'Élite',
            diamantesRequeridos: 1000,
            color: '#8b5cf6',
            icono: 'Trophy',
            orden: 5,
            beneficios: ['1.5x diamantes en citas', 'Regalo sorpresa en local al ascender', 'Soporte premium'],
            recompensaTipo: 'REGALO',
            recompensaValor: { nombre: 'Regalo Sorpresa Élite', vencimientoDias: 30 },
            multiplicador: 1.5
        }
    ];

    const created = [];
    for (const lvl of defaultLevels) {
        const item = await prisma.loyaltyLevel.create({
            data: {
                id: crypto.randomUUID(),
                negocioId,
                nombre: lvl.nombre,
                diamantesRequeridos: lvl.diamantesRequeridos,
                color: lvl.color,
                icono: lvl.icono,
                orden: lvl.orden,
                beneficios: lvl.beneficios,
                recompensaTipo: lvl.recompensaTipo,
                recompensaValor: lvl.recompensaValor as any,
                multiplicador: lvl.multiplicador
            }
        });
        created.push(item);
    }

    return created;
}

/**
 * Obtiene el nivel correspondiente al usuario según sus diamantes acumulados.
 */
export async function getCurrentLevel(diamonds: number, negocioId: string) {
    // Asegurar niveles por defecto
    const levels = await ensureDefaultLevels(negocioId);

    if (levels.length === 0) return null;

    // Retornar el primer nivel que cumpla
    const current = [...levels].reverse().find(l => diamonds >= l.diamantesRequeridos);
    
    // Si tiene menos diamantes que el primer nivel, retornar el de menor requerimiento
    return current || levels[0];
}

/**
 * Obtiene la información del siguiente nivel al que puede subir el usuario.
 */
export async function getNextLevel(diamonds: number, currentLevelId: string | null, negocioId: string) {
    if (!currentLevelId) {
        // Si no tiene nivel actual, buscar el nivel más bajo
        const lowestLevel = await prisma.loyaltyLevel.findFirst({
            where: { negocioId },
            orderBy: { diamantesRequeridos: 'asc' }
        });
        if (!lowestLevel) return null;
        return {
            level: lowestLevel,
            diamondsRequired: lowestLevel.diamantesRequeridos,
            diamondsNeeded: Math.max(0, lowestLevel.diamantesRequeridos - diamonds),
            progressPercent: lowestLevel.diamantesRequeridos > 0 
                ? Math.min(100, Math.max(0, (diamonds / lowestLevel.diamantesRequeridos) * 100))
                : 100
        };
    }

    const currentLevel = await prisma.loyaltyLevel.findUnique({
        where: { id: currentLevelId }
    });

    if (!currentLevel) return null;

    // Buscar el nivel inmediato superior en orden
    const nextLevel = await prisma.loyaltyLevel.findFirst({
        where: {
            negocioId,
            orden: { gt: currentLevel.orden }
        },
        orderBy: { orden: 'asc' }
    });

    if (!nextLevel) return null;

    const baseDiamonds = currentLevel.diamantesRequeridos;
    const targetDiamonds = nextLevel.diamantesRequeridos;
    const diffTotal = targetDiamonds - baseDiamonds;
    
    let progressPercent = 0;
    if (diamonds < baseDiamonds) {
        progressPercent = targetDiamonds > 0 
            ? Math.min(100, Math.max(0, (diamonds / targetDiamonds) * 100))
            : 100;
    } else {
        const diffCurrent = diamonds - baseDiamonds;
        progressPercent = diffTotal > 0 
            ? Math.min(100, Math.max(0, (diffCurrent / diffTotal) * 100))
            : 100;
    }

    return {
        level: nextLevel,
        diamondsRequired: targetDiamonds,
        diamondsNeeded: Math.max(0, targetDiamonds - diamonds),
        progressPercent
    };
}

/**
 * Recalcula el nivel del usuario basándose en sus diamantes actuales y entrega recompensas automáticas si sube.
 */
export async function updateUserLevel(userId: string, negocioId: string, currentDiamonds: number) {
    try {
        // 1. Obtener registro de UserPoints actual
        const userPoints = await prisma.userPoints.findUnique({
            where: { userId_negocioId: { userId, negocioId } }
        });

        if (!userPoints) return;

        // 2. Calcular el nivel correspondiente
        const calculatedLevel = await getCurrentLevel(currentDiamonds, negocioId);
        if (!calculatedLevel) return;

        const prevLevelId = userPoints.nivelActualId;

        // 3. Si el nivel cambió, actualizar
        if (prevLevelId !== calculatedLevel.id) {
            await prisma.userPoints.update({
                where: { id: userPoints.id },
                data: { nivelActualId: calculatedLevel.id }
            });

            // 4. Si subió de nivel (calculado tiene mayor orden que el anterior)
            let isLevelUp = false;
            if (prevLevelId) {
                const prevLevel = await prisma.loyaltyLevel.findUnique({ where: { id: prevLevelId } });
                if (prevLevel && calculatedLevel.orden > prevLevel.orden) {
                    isLevelUp = true;
                }
            } else if (calculatedLevel.orden > 1) {
                // Si no tenía nivel y pasa a un nivel con orden > 1, cuenta como subida
                isLevelUp = true;
            }

            if (isLevelUp) {
                // Notificación por FCM / Centro de Actividad
                await NotificationService.createNotification({
                    negocioId,
                    userId,
                    tipo: 'PREMIO',
                    categoria: 'NOTICIAS',
                    titulo: `🎉 ¡Subiste de Nivel: Nivel ${calculatedLevel.nombre}!`,
                    descripcion: `Felicidades, alcanzaste el rango de ${calculatedLevel.nombre}. ¡Desbloqueaste nuevos beneficios!`,
                    icono: 'Award',
                    prioridad: 'SUCCESS',
                    recipientType: 'USER'
                });

                // 5. Si el nivel tiene recompensa configurada, entregarla automáticamente
                if (calculatedLevel.recompensaTipo && calculatedLevel.recompensaTipo !== 'NULL') {
                    await deliverLevelReward(userId, negocioId, calculatedLevel);
                }
            }
        }
    } catch (e: any) {
        console.error('[levelEngine] Error al actualizar nivel de usuario:', e.message);
    }
}

/**
 * Entrega la recompensa de subida de nivel utilizando el RewardEngine.
 */
async function deliverLevelReward(userId: string, negocioId: string, level: any) {
    try {
        console.log(`[levelEngine] Entregando recompensa de nivel ${level.nombre} para usuario ${userId}: ${level.recompensaTipo}`);
        
        let actions: RewardAction[] = [];
        const val = level.recompensaValor as any;

        switch (level.recompensaTipo) {
            case 'CUPON':
                actions.push({
                    action: 'CREATE_COUPON',
                    value: {
                        valor: val?.valor || 10,
                        tipo: val?.tipo || 'PORCENTAJE',
                        vencimientoDias: val?.vencimientoDias || 30
                    }
                });
                break;
            case 'PUNTOS':
                actions.push({
                    action: 'ADD_POINTS',
                    value: val?.puntos || val || 100
                });
                break;
            case 'REGALO':
                actions.push({
                    action: 'PRODUCT_GIFT',
                    value: {
                        name: val?.nombre || 'Regalo por subir de nivel',
                        deliveryType: 'MANUAL',
                        vencimientoDias: val?.vencimientoDias || 30
                    }
                });
                break;
            case 'SERVICIO':
                actions.push({
                    action: 'SERVICE_GIFT',
                    value: {
                        name: val?.nombre || 'Servicio de Regalo por subir de nivel',
                        deliveryType: 'MANUAL',
                        vencimientoDias: val?.vencimientoDias || 30
                    }
                });
                break;
            case 'CASHBACK':
                actions.push({
                    action: 'ADD_WALLET_BALANCE',
                    value: val?.monto || val || 10
                });
                break;
        }

        if (actions.length > 0) {
            await executeRewardActions(negocioId, userId, actions, `LEVEL-${level.id}`, `Nivel ${level.nombre}`);
        }
    } catch (e: any) {
        console.error('[levelEngine] Error entregando recompensa de nivel:', e.message);
    }
}
