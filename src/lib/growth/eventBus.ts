import prisma from '../prisma';

export type GrowthEventType =
  | 'USER_REGISTERED'
  | 'USER_LOGIN'
  | 'BOOKING_CREATED'
  | 'BOOKING_APPROVED'
  | 'BOOKING_COMPLETED'
  | 'BOOKING_CANCELLED'
  | 'PAYMENT_APPROVED'
  | 'PAYMENT_REJECTED'
  | 'REVIEW_CREATED'
  | 'REFERRAL_COMPLETED'
  | 'CHECKIN'
  | 'PROFILE_COMPLETED'
  | 'APP_INSTALLED'
  | 'QR_SCANNED'
  | 'PROMOTION_OPENED'
  | 'NOTIFICATION_OPENED'
  | 'COUPON_USED'
  | 'POINTS_EARNED'
  | 'LEVEL_UP'
  | 'BADGE_UNLOCKED'
  | 'CLIENT_CREATED'
  | 'SERVICE_CREATED'
  | 'STAFF_CREATED'
  | 'PROFILE_UPDATED'
  | 'LOYALTY_ENABLED'
  | 'APP_DOWNLOADED'
  | 'RESERVATION_COMPLETED'
  | 'QUEST_COMPLETED'
  | 'CAMPAIGN_COMPLETED'
  | 'XP_GAINED'
  | 'DIAMONDS_EARNED'
  | 'SEASON_POINTS_EARNED'
  | 'CUSTOM_EVENT'
  // Eventos del Motor Global de Gamificación Citiox
  | 'LEVEL_REWARD_GRANTED'
  | 'GLOBAL_LEVEL_REACHED'
  | 'GLOBAL_SEASON_STARTED'
  | 'GLOBAL_SEASON_FINISHED'
  | 'GLOBAL_SEASON_ARCHIVED'
  | 'GLOBAL_REWARD_FAILED'
  | 'REWARD_ROLLBACK'
  | 'WALLET_UPDATED'
  // Eventos del nuevo sistema de misiones desacoplado Citiox
  | 'MISSION_INSTALLED'
  | 'MISSION_PUBLISHED'
  | 'MISSION_ACTIVATED'
  | 'MISSION_DEACTIVATED'
  | 'MISSION_ARCHIVED'
  | 'BUSINESS_REWARD_SELECTED'
  | 'BUSINESS_REWARD_GRANTED';

/**
 * Publica un evento de crecimiento de forma asíncrona no bloqueante.
 * Registra el evento en la BD y dispara el procesamiento en segundo plano.
 */
export async function publishGrowthEvent(
    negocioId: string, 
    userId: string, 
    eventType: GrowthEventType, 
    payload: any
): Promise<void> {
    try {
        console.log(`[EventBus] Publicando evento: ${eventType} para usuario: ${userId} en negocio: ${negocioId}`);

        // 1. Persistir el evento para auditoría, re-evaluaciones futuras e IA
        const log = await prisma.questEventLog.create({
            data: {
                negocioId,
                userId,
                eventType,
                payload: payload ? (typeof payload === 'string' ? payload : JSON.stringify(payload)) : '{}'
            }
        });

        // 2. Disparar procesamiento asíncrono vía fetch no bloqueante
        const baseUrl = process.env.NEXTAUTH_URL || 'http://127.0.0.1:3000';
        
        // Ejecutamos fetch en segundo plano (Promise flotante) sin await
        fetch(`${baseUrl}/api/admin/misiones/process`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ logId: log.id })
        }).catch(err => {
            // Silenciar o loguear error de conexión del worker en background
            console.error('[EventBus] Error disparando el procesamiento en segundo plano:', err.message);
        });

        // 3. Registrar también como Evento de Dominio si corresponde
        await publishDomainEvent(
            'USER_BUSINESS',
            `${userId}_${negocioId}`,
            eventType,
            payload
        );

    } catch (err: any) {
        console.error(`[EventBus] Error publicando evento ${eventType}:`, err.message);
    }
}

/**
 * Publica y registra un Evento de Dominio de forma persistente (Event Store)
 * aggregate: ej. "USER", "QUEST", "SEASON", "REWARD", "USER_BUSINESS"
 * aggregateId: ID de la entidad afectada
 * eventType: ej. "LEVEL_UP", "QUEST_COMPLETED", "XP_GRANTED"
 */
export async function publishDomainEvent(
  aggregate: string,
  aggregateId: string,
  eventType: string,
  payload: any
): Promise<void> {
  try {
    console.log(`[EventBus] Registrando Evento de Dominio: ${eventType} para ${aggregate}:${aggregateId}`);
    
    // Registrar en el Event Store de forma persistente
    await prisma.domainEvent.create({
      data: {
        aggregate,
        aggregateId,
        eventType,
        payload: payload || {},
        status: 'PROCESSED',
        processedAt: new Date()
      }
    });
  } catch (err: any) {
    console.error(`[EventBus] Error persistiendo Evento de Dominio ${eventType}:`, err.message);
  }
}
