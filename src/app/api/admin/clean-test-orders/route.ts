import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    const negocioId = (session?.user as any)?.negocioId;

    let targetNegocioId = negocioId;

    if (!targetNegocioId) {
      // Buscar negocio por slug citiox o parrilla-citiox-demo
      const negocioCitiox = await (prisma as any).negocio.findFirst({
        where: {
          OR: [
            { slug: { contains: 'citiox', mode: 'insensitive' } },
            { slug: { contains: 'parrilla', mode: 'insensitive' } },
            { nombre: { contains: 'Citiox', mode: 'insensitive' } }
          ]
        }
      });
      if (negocioCitiox) {
        targetNegocioId = negocioCitiox.id;
      }
    }

    if (!targetNegocioId) {
      return NextResponse.json({ error: 'No se identificó el negocio Citiox para limpiar pedidos.' }, { status: 400 });
    }

    // Obtenemos los pedidos a eliminar para este negocio específico
    const pedidos = await (prisma as any).pedido.findMany({
      where: { negocioId: targetNegocioId },
      select: { id: true, paymentId: true }
    });

    const pedidoIds = pedidos.map((p: any) => p.id);

    if (pedidoIds.length === 0) {
      return NextResponse.json({ message: 'No se encontraron pedidos de prueba para eliminar en este restaurante.' });
    }

    // 1. Eliminar DeliveryAssignments
    await (prisma as any).deliveryAssignment.deleteMany({
      where: { ordenReferenciaId: { in: pedidoIds } }
    }).catch(() => {});

    // 2. Eliminar PedidoItems
    await (prisma as any).pedidoItem.deleteMany({
      where: { pedidoId: { in: pedidoIds } }
    });

    // 3. Eliminar OrderPayments & Evidencias
    const paymentIds = pedidos.map((p: any) => p.paymentId).filter(Boolean);
    if (paymentIds.length > 0) {
      await (prisma as any).paymentEvidence.deleteMany({
        where: { orderPaymentId: { in: paymentIds } }
      }).catch(() => {});

      await (prisma as any).orderPayment.deleteMany({
        where: { id: { in: paymentIds } }
      }).catch(() => {});
    }

    // 4. Eliminar Pedidos
    const deletedCount = await (prisma as any).pedido.deleteMany({
      where: { id: { in: pedidoIds } }
    });

    return NextResponse.json({
      success: true,
      negocioId: targetNegocioId,
      deletedOrdersCount: deletedCount.count,
      message: `Se han eliminado exitosamente ${deletedCount.count} pedidos de prueba del restaurante.`
    });
  } catch (error: any) {
    console.error('[CLEAN_TEST_ORDERS_ERROR]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
