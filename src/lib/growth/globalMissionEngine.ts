import prisma from '../prisma';
import { GlobalMissionType, GlobalRewardType } from '@prisma/client';

export class GlobalMissionEngine {
    /**
     * Sincroniza una misión específica (por tipo de evento) para un negocio.
     */
    static async syncMission(negocioId: string, eventType: string): Promise<void> {
        try {
            console.log(`[GlobalMissionEngine] Sincronizando misiones para negocio: ${negocioId}, evento: ${eventType}`);

            // Mapear eventType a los tipos de misiones globales correspondientes
            const missionTypesToSync: GlobalMissionType[] = [];

            if (eventType === 'BOOKING_COMPLETED' || eventType === 'BOOKING_CREATED') {
                missionTypesToSync.push(
                    GlobalMissionType.FIRST_RESERVATIONS,
                    GlobalMissionType.COMPLETED_RESERVATIONS,
                    GlobalMissionType.CONSECUTIVE_RESERVATIONS
                );
            } else if (eventType === 'CLIENT_CREATED' || eventType === 'USER_REGISTERED') {
                missionTypesToSync.push(GlobalMissionType.CLIENTS_REGISTERED);
            } else if (eventType === 'SERVICE_CREATED') {
                missionTypesToSync.push(GlobalMissionType.SERVICES_CREATED);
            } else if (eventType === 'STAFF_CREATED') {
                missionTypesToSync.push(GlobalMissionType.STAFF_CREATED);
            } else if (eventType === 'PROFILE_UPDATED') {
                missionTypesToSync.push(GlobalMissionType.PROFILE_COMPLETED);
            } else if (eventType === 'LOYALTY_ENABLED') {
                missionTypesToSync.push(GlobalMissionType.LOYALTY_ENABLED);
            } else if (eventType === 'REFERRAL_COMPLETED' || eventType === 'REFERRALS') {
                missionTypesToSync.push(GlobalMissionType.REFERRALS);
            } else if (eventType === 'APP_DOWNLOADED' || eventType === 'APP_INSTALLED') {
                missionTypesToSync.push(GlobalMissionType.APP_DOWNLOAD);
            }

            if (missionTypesToSync.length === 0) return;

            // Obtener todas las misiones globales activas de estos tipos
            const activeMissions = await prisma.globalMission.findMany({
                where: {
                    tipo: { in: missionTypesToSync },
                    activa: true
                }
            });

            for (const mission of activeMissions) {
                await this.evaluateAndProcess(negocioId, mission);
            }
        } catch (error: any) {
            console.error('[GlobalMissionEngine] Error en syncMission:', error.message);
        }
    }

    /**
     * Sincroniza todas las misiones globales activas para un negocio (ej: al abrir el panel).
     */
    static async syncAllMissions(negocioId: string): Promise<void> {
        try {
            console.log(`[GlobalMissionEngine] Sincronización completa para negocio: ${negocioId}`);
            
            const activeMissions = await prisma.globalMission.findMany({
                where: { activa: true }
            });

            for (const mission of activeMissions) {
                await this.evaluateAndProcess(negocioId, mission);
            }
        } catch (error: any) {
            console.error('[GlobalMissionEngine] Error en syncAllMissions:', error.message);
        }
    }

    /**
     * Evalúa el progreso real de una misión para un negocio y procesa la entrega de premios.
     */
    private static async evaluateAndProcess(negocioId: string, mission: any): Promise<void> {
        try {
            // 1. Calcular progreso actual según el tipo
            const progreso = await this.calculateProgress(negocioId, mission.tipo);
            const completada = progreso >= mission.objetivo;

            // 2. Transacción atómica para upsert del progreso y entrega de recompensa
            await prisma.$transaction(async (tx) => {
                const existingProgress = await tx.businessGlobalMission.findUnique({
                    where: {
                        negocioId_missionId: { negocioId, missionId: mission.id }
                    }
                });

                // Si ya estaba completada y la recompensa fue entregada, actualizar el progreso si cambió y retornar
                if (existingProgress && existingProgress.completada && existingProgress.recompensaDada) {
                    if (existingProgress.progreso !== progreso) {
                        await tx.businessGlobalMission.update({
                            where: { id: existingProgress.id },
                            data: { progreso }
                        });
                    }
                    return;
                }

                const nuevoEstadoCompletado = completada;
                const recienCompletada = nuevoEstadoCompletado && (!existingProgress || !existingProgress.completada);

                // Upsert del progreso del negocio
                const progressRecord = await tx.businessGlobalMission.upsert({
                    where: {
                        negocioId_missionId: { negocioId, missionId: mission.id }
                    },
                    update: {
                        progreso,
                        completada: nuevoEstadoCompletado,
                        fechaCompletada: recienCompletada ? new Date() : (existingProgress?.fechaCompletada || null)
                    },
                    create: {
                        negocioId,
                        missionId: mission.id,
                        progreso,
                        completada: nuevoEstadoCompletado,
                        fechaCompletada: nuevoEstadoCompletado ? new Date() : null
                    }
                });

                // Si se acaba de completar, o si estaba completada pero el premio aún no se ha dado
                const debeDarPremio = nuevoEstadoCompletado && !progressRecord.recompensaDada;

                if (debeDarPremio) {
                    // Entregar recompensa
                    const recompensaAplicada = await this.applyReward(negocioId, mission, tx);
                    
                    if (recompensaAplicada) {
                        // Marcar premio como dado
                        await tx.businessGlobalMission.update({
                            where: { id: progressRecord.id },
                            data: { 
                                recompensaDada: true,
                                fechaCompletada: progressRecord.fechaCompletada || new Date()
                            }
                        });
                    }
                }
            });
        } catch (err: any) {
            console.error(`[GlobalMissionEngine] Error evaluando misión ${mission.id} para negocio ${negocioId}:`, err.message);
        }
    }

    /**
     * Calcula dinámicamente el progreso actual del negocio.
     */
    private static async calculateProgress(negocioId: string, tipo: GlobalMissionType): Promise<number> {
        switch (tipo) {
            case GlobalMissionType.FIRST_RESERVATIONS:
            case GlobalMissionType.COMPLETED_RESERVATIONS:
                return await prisma.appointment.count({
                    where: { negocioId, estado: 'completed' }
                });

            case GlobalMissionType.CLIENTS_REGISTERED:
                return await prisma.cliente.count({
                    where: { negocioId }
                });

            case GlobalMissionType.SERVICES_CREATED:
                return await prisma.service.count({
                    where: { negocioId }
                });

            case GlobalMissionType.STAFF_CREATED:
                return await prisma.staff.count({
                    where: { businessId: negocioId }
                });

            case GlobalMissionType.PROFILE_COMPLETED:
                const negocio = await prisma.negocio.findUnique({
                    where: { id: negocioId },
                    select: { logoUrl: true, direccion: true, ciudad: true, horarioApertura: true, horarioCierre: true }
                });
                if (!negocio) return 0;
                const hasLogo = !!negocio.logoUrl;
                const hasDir = !!negocio.direccion;
                const hasCiudad = !!negocio.ciudad;
                const hasHours = !!negocio.horarioApertura && !!negocio.horarioCierre;
                return (hasLogo && hasDir && hasCiudad && hasHours) ? 1 : 0;

            case GlobalMissionType.LOYALTY_ENABLED:
                // Verificar si tiene puntos habilitados en la configuración o si ha creado niveles de lealtad
                const negConfig = await prisma.negocio.findUnique({
                    where: { id: negocioId },
                    select: { configuracion: true }
                });
                const configObj = negConfig?.configuracion ? (typeof negConfig.configuracion === 'string' ? JSON.parse(negConfig.configuracion) : negConfig.configuracion) as any : {};
                const hasPointsActive = configObj?.puntosActivos === true;
                const hasLevels = await prisma.loyaltyLevel.count({
                    where: { negocioId }
                });
                return (hasPointsActive || hasLevels > 0) ? 1 : 0;

            case GlobalMissionType.REFERRALS:
                // Contar eventos de recomendación válidos del negocio
                return await prisma.referralEvent.count({
                    where: {
                        negocioId,
                        estado: 'VALIDO'
                    }
                });

            case GlobalMissionType.APP_DOWNLOAD:
                // Comprobamos si tiene al menos un evento logueado de tipo APP_INSTALLED en los logs de eventos
                const hasAppInstalledLog = await prisma.questEventLog.count({
                    where: { negocioId, eventType: 'APP_INSTALLED' }
                });
                return hasAppInstalledLog > 0 ? 1 : 0;

            case GlobalMissionType.CONSECUTIVE_RESERVATIONS:
                // Calcular días consecutivos con citas completadas
                return await this.calculateConsecutiveDays(negocioId);

            default:
                return 0;
        }
    }

    /**
     * Aplica la recompensa y escribe en el historial de auditoría.
     */
    private static async applyReward(negocioId: string, mission: any, tx: any): Promise<boolean> {
        try {
            const rewardType = mission.recompensaTipo as GlobalRewardType;
            const val = mission.recompensaValor ? (typeof mission.recompensaValor === 'string' ? JSON.parse(mission.recompensaValor) : mission.recompensaValor) as any : {};

            let logDetails = `Recompensa otorgada por completar la misión "${mission.titulo}".`;

            if (rewardType === GlobalRewardType.FREE_DAYS) {
                const dias = parseInt(val.dias || '0');
                if (dias > 0) {
                    // Buscar la suscripción activa
                    const sub = await tx.suscripcion.findUnique({
                        where: { negocioId }
                    });

                    if (sub) {
                        const currentFin = new Date(sub.fechaFin);
                        const newFin = new Date(currentFin.getTime() + dias * 24 * 60 * 60 * 1000);

                        await tx.suscripcion.update({
                            where: { negocioId },
                            data: { fechaFin: newFin }
                        });

                        // También actualizar planExpiresAt en Negocio para mantener sincronía
                        await tx.negocio.update({
                            where: { id: negocioId },
                            data: { planExpiresAt: newFin }
                        });

                        logDetails = `+${dias} días gratis de plan agregados. Nueva expiración: ${newFin.toLocaleDateString()}`;
                    } else {
                        console.warn(`[GlobalMissionEngine] No se encontró suscripción para el negocio ${negocioId} para aplicar días gratis.`);
                        return false;
                    }
                }
            } else if (rewardType === GlobalRewardType.DIAMONDS) {
                const diamantes = parseInt(val.diamantes || '0');
                logDetails = `+${diamantes} diamantes otorgados.`;
            } else if (rewardType === GlobalRewardType.CREDITS) {
                const creditos = parseFloat(val.creditos || '0');
                logDetails = `+$${creditos} créditos de saldo Citiox otorgados.`;
            } else if (rewardType === GlobalRewardType.BADGE) {
                const badge = val.badge || 'Socio Destacado';
                logDetails = `Medalla "${badge}" desbloqueada con éxito.`;
            } else if (rewardType === GlobalRewardType.UNLOCK_FEATURE) {
                const feature = val.feature || 'Módulo Premium';
                logDetails = `Función "${feature}" desbloqueada para tu negocio.`;

                const sub = await tx.suscripcion.findUnique({
                    where: { negocioId }
                });

                if (sub) {
                    const currentCustom = sub.customFeatures 
                        ? (typeof sub.customFeatures === 'string' ? JSON.parse(sub.customFeatures) : sub.customFeatures) as any 
                        : {};
                    currentCustom[feature] = true;

                    await tx.suscripcion.update({
                        where: { negocioId },
                        data: { customFeatures: currentCustom }
                    });
                    logDetails = `Función "${feature}" desbloqueada con éxito en la suscripción del negocio.`;
                } else {
                    console.warn(`[GlobalMissionEngine] No se encontró suscripción para el negocio ${negocioId} para aplicar la feature ${feature}.`);
                    return false;
                }
            }

            // Registrar en el historial de auditoría de recompensas globales
            await tx.globalMissionRewardHistory.create({
                data: {
                    negocioId,
                    missionId: mission.id,
                    tipo: rewardType,
                    valor: mission.recompensaValor,
                    detalles: logDetails
                }
            });

            console.log(`[GlobalMissionEngine] ✅ Recompensa aplicada con éxito al negocio ${negocioId} por misión ${mission.id}`);
            return true;
        } catch (err: any) {
            console.error(`[GlobalMissionEngine] Error aplicando recompensa al negocio ${negocioId}:`, err.message);
            return false;
        }
    }

    /**
     * Calcula la racha máxima de días consecutivos con reservas completadas.
     */
    private static async calculateConsecutiveDays(negocioId: string): Promise<number> {
        try {
            // Consultar las fechas únicas de todas las citas completadas
            const appointments = await prisma.appointment.findMany({
                where: { negocioId, estado: 'completed' },
                select: { fecha: true },
                orderBy: { fecha: 'asc' }
            });

            if (appointments.length === 0) return 0;

            const dates = Array.from(new Set(
                appointments.map(a => new Date(a.fecha).toDateString())
            )).map(d => new Date(d));

            let maxConsecutive = 0;
            let currentConsecutive = 1;

            for (let i = 0; i < dates.length - 1; i++) {
                const diffTime = Math.abs(dates[i+1].getTime() - dates[i].getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays === 1) {
                    currentConsecutive++;
                } else if (diffDays > 1) {
                    if (currentConsecutive > maxConsecutive) {
                        maxConsecutive = currentConsecutive;
                    }
                    currentConsecutive = 1;
                }
            }

            return Math.max(maxConsecutive, currentConsecutive);
        } catch (err) {
            return 0;
        }
    }
}
