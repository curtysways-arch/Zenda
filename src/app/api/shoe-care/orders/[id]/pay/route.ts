import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { metodoPago, monto, firmaCliente } = body;

    const pedido = await prisma.pedido.findUnique({
      where: { id },
      include: { negocio: true }
    });

    if (!pedido) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    const currentExtra = (pedido.extraInfo as any) || {};
    const updatedExtra = {
      ...currentExtra,
      metodoPagoRegistrado: metodoPago || 'EFECTIVO',
      montoPagado: monto || pedido.total,
      fechaPago: new Date().toISOString(),
      firmaCliente: firmaCliente || null
    };

    // 1. Actualizar orden a ENTREGADO y PAGO_CONFIRMADO
    const updatedPedido = await prisma.pedido.update({
      where: { id },
      data: {
        estado: 'ENTREGADO',
        extraInfo: updatedExtra
      }
    });

    // 2. Actualizar o crear OrderPayment
    await prisma.orderPayment.upsert({
      where: { pedidoId: id },
      update: {
        estado: 'CONFIRMADO',
        monto: pedido.total
      },
      create: {
        pedidoId: id,
        negocioId: pedido.negocioId,
        monto: pedido.total,
        estado: 'CONFIRMADO'
      }
    });

    // 3. Actualizar métricas del historial de cliente
    const cliente = await prisma.cliente.findUnique({
      where: {
        telefono_negocioId: {
          telefono: pedido.telefonoCliente,
          negocioId: pedido.negocioId
        }
      }
    });

    if (cliente) {
      const ordersCount = await prisma.pedido.count({
        where: {
          telefonoCliente: pedido.telefonoCliente,
          negocioId: pedido.negocioId,
          estado: 'ENTREGADO'
        }
      });

      const totalSpentAgg = await prisma.pedido.aggregate({
        where: {
          telefonoCliente: pedido.telefonoCliente,
          negocioId: pedido.negocioId,
          estado: 'ENTREGADO'
        },
        _sum: { total: true }
      });

      console.log(`👤 [Cliente Update] ${cliente.nombre}: ${ordersCount} órdenes finalizadas, Total invertido: $${totalSpentAgg._sum.total || 0}`);
    }

    console.log(`📱 [WhatsApp Notify] ¡Orden #${pedido.numeroPedido} finalizada y entregada con éxito!`);

    return NextResponse.json(updatedPedido);
  } catch (error: any) {
    console.error('Error registrando pago de orden:', error);
    return NextResponse.json({ error: 'Error al registrar el pago' }, { status: 500 });
  }
}
