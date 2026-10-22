import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireOrderAccess } from '@/lib/laundry/orderAccess';

export const dynamic = 'force-dynamic';

/**
 * Registra el pago del cliente al local (efectivo, transferencia, tarjeta…).
 * El cliente siempre le paga al local; el repartidor no cobra.
 * Solo cierra la orden como ENTREGADO si se pide (retiro en el local: paga y se lleva sus prendas).
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const access = await requireOrderAccess(id);
    if (!access.ok) return access.response;
    const pedido = access.pedido;

    const body = await req.json().catch(() => ({}));
    const { metodoPago, monto, firmaCliente, entregar } = body || {};
    const montoFinal = Number(monto) > 0 ? Number(monto) : Number(pedido.total || 0);

    const currentExtra = (pedido.extraInfo as any) || {};
    const timeline = Array.isArray(currentExtra.timeline) ? [...currentExtra.timeline] : [];
    timeline.push({
      id: `tl_${Date.now()}`,
      type: 'PAYMENT',
      action: `Pago del cliente registrado: $${montoFinal.toFixed(2)} (${metodoPago || 'EFECTIVO'})`,
      user: access.user?.name || 'Administrador',
      timestamp: new Date().toISOString(),
    });

    const updatedPedido = await prisma.pedido.update({
      where: { id },
      data: {
        ...(entregar ? { estado: 'ENTREGADO' } : {}),
        extraInfo: {
          ...currentExtra,
          metodoPagoRegistrado: metodoPago || 'EFECTIVO',
          montoPagado: montoFinal,
          fechaPago: new Date().toISOString(),
          pagoCliente: 'PAGADO',
          firmaCliente: firmaCliente || currentExtra.firmaCliente || null,
          timeline,
        },
      },
    });

    await prisma.orderPayment.upsert({
      where: { pedidoId: id },
      update: { estado: 'CONFIRMADO', monto: montoFinal, observaciones: metodoPago || 'EFECTIVO' },
      create: { pedidoId: id, negocioId: pedido.negocioId, monto: montoFinal, estado: 'CONFIRMADO', observaciones: metodoPago || 'EFECTIVO' },
    });

    return NextResponse.json(updatedPedido);
  } catch (error: any) {
    console.error('Error registrando pago de orden:', error);
    return NextResponse.json({ error: 'Error al registrar el pago' }, { status: 500 });
  }
}
