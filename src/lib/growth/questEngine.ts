import prisma from '../prisma';
import { evaluateRules, RuleGroup } from './ruleEngine';
import { executeRewardActions, RewardAction } from './rewardEngine';
import { GlobalMissionEngine } from './globalMissionEngine';

/**
 * Procesa un evento persistido en QuestEventLog.
 * Recupera las misiones correspondientes y evalúa el progreso del usuario de forma atómica.
 */
export async function processGrowthEventLog(logId: string): Promise<void> {
    try {
        console.log(`[QuestEngine] Procesando log de evento: ${logId}`);

        // 1. Obtener el log del evento
        const eventLog = await prisma.questEventLog.findUnique({
            where: { id: logId }
        });

        if (!eventLog || eventLog.procesado) return;

        const { negocioId, userId, eventType } = eventLog;
        const payload = typeof eventLog.payload === 'string' 
            ? JSON.parse(eventLog.payload) 
            : eventLog.payload;

        // 2. Buscar todas las misiones activas asociadas al evento trigger de este negocio
        const activeQuests = await prisma.quest.findMany({
            where: {
                negocioId,
                triggerEvent: eventType,
                activa: true
            }
        });

        // 3. Evaluar cada misión local para el cliente (si existen)
        if (activeQuests.length > 0) {
            for (const quest of activeQuests) {
            try {
                // A. Verificar segmentación (si aplica)
                if (quest.segmentacion) {
                    const seg = typeof quest.segmentacion === 'string'
                        ? JSON.parse(quest.segmentacion)
                        : quest.segmentacion;
                    
                    // Comprobar nivel del usuario (ej: si requiere Oro, Plata)
                    if (seg.level) {
                        const userLevel = await prisma.userLevel.findUnique({
                            where: { userId },
                            include: { LevelTier: true }
                        });
                        if (!userLevel || !seg.level.includes(userLevel.LevelTier.nombre)) {
                            continue; // No cumple segmentación por nivel
                        }
                    }
                }

                // B. Verificar prerrequisitos (Quest Chain)
                if (quest.parentQuestId) {
                    const parentProgress = await prisma.questProgress.findUnique({
                        where: { questId_userId: { questId: quest.parentQuestId, userId } }
                    });
                    if (!parentProgress || parentProgress.estado !== 'COMPLETADA') {
                        continue; // La misión prerrequisito aún no se ha completado
                    }
                }

                // C. Evaluar condiciones dinámicas en columnas indexadas
                if (quest.servicioId && payload.servicioId !== quest.servicioId) {
                    continue; // No aplica al servicio requerido
                }

                if (quest.montoMinimo && (!payload.monto || payload.monto < quest.montoMinimo)) {
                    continue; // No cumple el monto mínimo requerido
                }

                // D. Evaluar condiciones variables complejas usando Rule Engine
                if (quest.condicionesExtra) {
                    const ruleGroup = (typeof quest.condicionesExtra === 'string'
                        ? JSON.parse(quest.condicionesExtra)
                        : quest.condicionesExtra) as RuleGroup;
                    
                    const isRuleValid = evaluateRules(payload, ruleGroup);
                    if (!isRuleValid) continue;
                }

                // E. Misión elegible -> Transacción de progreso para evitar condiciones de carrera (race conditions)
                await prisma.$transaction(async (tx) => {
                    // Buscar o crear progreso
                    let progress = await tx.questProgress.findUnique({
                        where: { questId_userId: { questId: quest.id, userId } }
                    });

                    if (!progress) {
                        progress = await tx.questProgress.create({
                            data: {
                                questId: quest.id,
                                userId,
                                progresoActual: 0,
                                progresoRequerido: quest.cantidadMeta,
                                estado: 'EN_PROGRESO'
                            }
                        });
                    }

                    // Si ya está completada y no es repetible, no avanzar
                    if (progress.estado === 'COMPLETADA' && !quest.repetible) return;

                    const nuevoProgreso = progress.progresoActual + 1;
                    const completada = nuevoProgreso >= progress.progresoRequerido;

                    // Actualizar el progreso (si es repetible vuelve a 0 y EN_PROGRESO)
                    await tx.questProgress.update({
                        where: { id: progress.id },
                        data: {
                            progresoActual: completada ? (quest.repetible ? 0 : progress.progresoRequerido) : nuevoProgreso,
                            estado: completada ? (quest.repetible ? 'EN_PROGRESO' : 'COMPLETADA') : 'EN_PROGRESO',
                            fechaCompletada: completada ? new Date() : null
                        }
                    });

                    // Registrar en la bitácora de participación de misiones
                    await tx.questParticipant.create({
                        data: {
                            questId: quest.id,
                            userId,
                            action: completada ? 'COMPLETADA' : 'AVANCE',
                            detalles: completada && quest.repetible 
                                ? `Completada (repetible) y reiniciada. Recompensas entregadas.` 
                                : `Avance a ${nuevoProgreso}/${progress.progresoRequerido}`
                        }
                    });

                    // Si se completó, disparar ejecutor de recompensas (Reward Engine) y publicar evento de dominio
                    if (completada) {
                        const acciones = (typeof quest.acciones === 'string'
                            ? JSON.parse(quest.acciones)
                            : quest.acciones) as RewardAction[];
                        
                        await executeRewardActions(negocioId, userId, acciones, quest.id, quest.nombre);

                        // Publicar evento de dominio QUEST_COMPLETED de forma asíncrona
                        const { publishGrowthEvent } = require('./eventBus');
                        publishGrowthEvent(negocioId, userId, 'QUEST_COMPLETED', {
                          questId: quest.id,
                          questName: quest.nombre,
                          xp: quest.xp || 0
                        }).catch((err: any) => {
                          console.error('[QuestEngine] Error publicando evento QUEST_COMPLETED:', err.message);
                        });
                    }
                });

            } catch (questErr: any) {
                console.error(`[QuestEngine] Error evaluando misión ${quest.id} para usuario ${userId}:`, questErr.message);
            }
        }
        }

        // 3.5 Evaluar misiones de Citiox de tipo BusinessMission (Desacopladas)
        try {
            const { BusinessMissionService } = require('./businessMissionService');
            await BusinessMissionService.processUserProgress(negocioId, userId, eventType, payload);
        } catch (bmErr: any) {
            console.error('[QuestEngine] Error evaluando misiones de Citiox (BusinessMissions):', bmErr.message);
        }

        // 3.6 Sincronizar Misiones de Citiox para Negocios y Clientes finales (asíncronamente)
        const { AutomationEngine } = require('./automationEngine');
        const { GlobalClientMissionEngine } = require('./globalClientMissionEngine');
        
        AutomationEngine.handleDomainEvent({
          eventType,
          negocioId,
          userId,
          payload
        }).catch((err: any) => {
          console.error('[QuestEngine] Error en segundo plano evaluando reglas en AutomationEngine:', err.message);
        });

        GlobalClientMissionEngine.processClientGlobalCampaigns(
          negocioId,
          userId,
          eventType,
          payload
        ).catch((err: any) => {
          console.error('[QuestEngine] Error en segundo plano procesando campañas en GlobalClientMissionEngine:', err.message);
        });

        GlobalMissionEngine.syncMission(negocioId, eventType).catch(err => {
            console.error('[QuestEngine] Error en segundo plano sincronizando misiones globales para negocios:', err.message);
        });

        // 4. Marcar log del evento como procesado con éxito
        await prisma.questEventLog.update({
            where: { id: logId },
            data: { procesado: true }
        });

        console.log(`[QuestEngine] Log de evento ${logId} procesado con éxito.`);
    } catch (err: any) {
        console.error(`[QuestEngine] Error crítico procesando log ${logId}:`, err.message);
    }
}
