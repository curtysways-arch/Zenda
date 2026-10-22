import { NextResponse } from 'next/server';
import { checkSubscriptionStatus, subscriptionEnforced } from '@/lib/subscriptions';

/**
 * Corta la creación de reservas/pedidos públicos cuando el negocio está bloqueado por
 * falta de pago (pasada la gracia) o suspendido por Citiox. Así ningún cliente reserva
 * o paga algo que el negocio no va a atender.
 *
 * Uso:  const blocked = await guardCustomerIntake(negocio.id); if (blocked) return blocked;
 */
export async function guardCustomerIntake(negocioId?: string | null): Promise<NextResponse | null> {
  if (!negocioId || !subscriptionEnforced()) return null;
  try {
    const status = await checkSubscriptionStatus(negocioId);
    if (status.active) return null;
    return NextResponse.json(
      {
        error: 'Este negocio no está recibiendo reservas ni pedidos en este momento. Intenta más tarde.',
        code: 'BUSINESS_UNAVAILABLE',
      },
      { status: 423 }
    );
  } catch {
    // Ante un error de lectura no bloqueamos al cliente
    return null;
  }
}
