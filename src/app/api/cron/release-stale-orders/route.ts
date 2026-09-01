import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * API Cron: Liberación automática de reservas de stock para pedidos en estado PENDIENTE no pagados.
 * Frecuencia recomendada en VPS: cada 15 minutos
 * Comando VPS Crontab: curl -s "https://tu-dominio.com/api/cron/release-stale-orders?secret=CRON_SECRET"
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');
    const cronSecret = process.env.CRON_SECRET || 'citiox_cron_secret_2026';

    if (secret !== cronSecret && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Expiración por defecto: 30 minutos en PENDIENTE sin comprobante/pago
    const expirationMinutes = parseInt(process.env.PENDING_ORDER_EXPIRATION_MINUTES || '30', 10);
    const expirationThreshold = new Date(Date.now() - expirationMinutes * 60 * 1000);

    // Buscar pedidos pendientes expirados
    const staleOrders = await (prisma as any).pedido.findMany({
      where: {
        estado: 'PENDIENTE',
        createdAt: { lte: expirationThreshold }
      },
      include: {
        items: true,
        payment: true
      }
    });

    let releasedCount = 0;

    for (const order of staleOrders) {
      // Si ya adjuntó comprobante o pago en revisión, omitir cancelación automática
      if (order.payment && (order.payment.estado === 'CONFIRMADO' || order.payment.estado === 'EN_REVISION')) {
        continue;
      }

      const extra = (order.extraInfo as any) || {};
      if (extra.stockRestored === true) continue;

      await prisma.$transaction(async (tx) => {
        // Restauración idempotente de stock por variante o producto
        for (const item of order.items || []) {
          if (item.varianteId) {
            await (tx as any).productoVariante.update({
              where: { id: item.varianteId },
              data: { stock: { increment: item.cantidad } }
            }).catch(() => {});
          } else if (item.productoId) {
            await (tx as any).producto.update({
              where: { id: item.productoId },
              data: { stock: { increment: item.cantidad } }
            }).catch(() => {});
          }
        }

        // Marcar como cancelado por expiración
        await (tx as any).pedido.update({
          where: { id: order.id },
          data: {
            estado: 'CANCELADO',
            extraInfo: {
              ...extra,
              stockRestored: true,
              cancellationReason: 'EXPIRED_UNPAID_RESERVATION',
              cancelledAt: new Date().toISOString()
            }
          }
        });
      });

      releasedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Procesados ${staleOrders.length} pedidos. ${releasedCount} reservas expiradas liberadas.`,
      releasedCount,
      timestamp: new Date().toISOString()
    });
  } catch (e: any) {
    console.error('[CRON_RELEASE_STALE_ORDERS_ERROR]', e);
    return NextResponse.json({ error: e?.message || 'Error en cron de expiración de stock' }, { status: 500 });
  }
}
