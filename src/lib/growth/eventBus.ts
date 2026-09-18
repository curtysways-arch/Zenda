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
  | 'APPOINTMENT_COMPLETED'
  | 'LAUNDRY_ORDER_COMPLETED'
  | 'ORDER_COMPLETED'
  | 'GYM_ATTENDANCE'
  | 'CLASS_ATTENDED'
  | 'MEMBERSHIP_PURCHASED'
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

export interface BusinessEventInput {
  negocioId: string;
  userId: string;
  eventType: GrowthEventType | string;
  entityId: string;
  monto?: number;
  cantidad?: number;
  metadata?: Record<string, any>;
}

/**
 * Publica un evento canónico de negocio al motor universal de misiones y recompensas.
 * Aplica deduplicación e idempotencia por (negocioId, eventType, entityId).
 */
export async function publishBusinessEvent(input: BusinessEventInput): Promise<void> {
  const { negocioId, userId, eventType, entityId, monto, cantidad, metadata = {} } = input;

  try {
    console.log(`[EventBus] Publicando evento canónico: ${eventType} para usuario: ${userId} en negocio: ${negocioId} (Entidad: ${entityId})`);

    const payload = {
      entityId,
      monto: monto !== undefined ? Number(monto) : undefined,
      cantidad: cantidad !== undefined ? Number(cantidad) : 1,
      idempotencyKey: `${negocioId}_${eventType}_${entityId}`,
      ...metadata
    };

    // 1. Verificación de idempotencia en QuestEventLog
    if (entityId) {
      const recentLogs = await prisma.questEventLog.findMany({
        where: {
          negocioId,
          eventType,
          procesado: true
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      });

      const existing = recentLogs.find(l => {
        const pStr = typeof l.payload === 'string' ? l.payload : JSON.stringify(l.payload);
        return pStr.includes(entityId);
      });

      if (existing) {
        console.log(`[EventBus] ℹ️ Evento duplicado ignorado por idempotencia: ${eventType} (${entityId})`);
        return;
      }
    }

    // 2. Persistir el evento para auditoría
    const log = await prisma.questEventLog.create({
      data: {
        negocioId,
        userId,
        eventType,
        payload: JSON.stringify(payload)
      }
    });

    // 3. Disparar procesamiento asíncrono no bloqueante
    const baseUrl = process.env.NEXTAUTH_URL || 'http://127.0.0.1:3000';
    fetch(`${baseUrl}/api/admin/misiones/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logId: log.id })
    }).catch(err => {
      console.error('[EventBus] Error disparando el worker de misiones:', err.message);
    });

    // 4. Registrar también en el Event Store de Dominio
    await publishDomainEvent(
      'BUSINESS_EVENT',
      `${negocioId}_${entityId}`,
      eventType,
      payload
    );

  } catch (err: any) {
    console.error(`[EventBus] Error publicando evento canónico ${eventType}:`, err.message);
  }
}

/**
 * Publica un evento de crecimiento de forma asíncrona no bloqueante.
 * Registra el evento en la BD y dispara el procesamiento en segundo plano.
 * Mantiene compatibilidad hacia atrás total.
 */
export async function publishGrowthEvent(
    negocioId: string, 
    userId: string, 
    eventType: GrowthEventType, 
    payload: any
): Promise<void> {
    try {
        console.log(`[EventBus] Publicando evento: ${eventType} para usuario: ${userId} en negocio: ${negocioId}`);

        // Si el payload contiene identificadores de entidad conocidos, enrutar a publishBusinessEvent
        const entityId = payload?.entityId || payload?.appointmentId || payload?.orderId || payload?.pedidoId;
        if (entityId) {
            return await publishBusinessEvent({
                negocioId,
                userId,
                eventType,
                entityId,
                monto: payload?.monto || payload?.total,
                cantidad: payload?.cantidad || payload?.itemsCount || 1,
                metadata: payload
            });
        }

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
