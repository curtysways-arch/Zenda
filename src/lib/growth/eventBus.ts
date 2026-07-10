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
  | 'CUSTOM_EVENT';

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

    } catch (err: any) {
        console.error(`[EventBus] Error publicando evento ${eventType}:`, err.message);
    }
}
