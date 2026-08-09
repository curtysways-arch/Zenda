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
      // Buscar negocio por slug o nombre relacionad con citiox o parrilla
      const negocioCitiox = await (prisma as any).negocio.findFirst({
        where: {
          OR: [
            { slug: { contains: 'citiox', mode: 'insensitive' } },
            { slug: { contains: 'parrilla', mode: 'insensitive' } },
            { nombre: { contains: 'Citiox', mode: 'insensitive' } },
            { nombre: { contains: 'Parrilla', mode: 'insensitive' } }
          ]
        }
      });
      if (negocioCitiox) {
        targetNegocioId = negocioCitiox.id;
      }
    }

    if (!targetNegocioId) {
      return NextResponse.json({ error: 'No se logró identificar el negocio para limpiar pedidos.' }, { status: 400 });
    }

    // 1. Obtener IDs de pedidos
    const pedidos = await prisma.pedido.findMany({
      where: { negocioId: targetNegocioId },
      select: { id: true }
    });

    const pedidoIds = pedidos.map(p => p.id);

    if (pedidoIds.length === 0) {
      return NextResponse.json({
        success: true,
        deletedOrdersCount: 0,
        message: 'No se encontraron pedidos de prueba para eliminar en este restaurante.'
      });
    }

    // 2. Eliminar asignaciones de delivery asociadas
    await (prisma as any).deliveryAssignment.deleteMany({
      where: { ordenReferenciaId: { in: pedidoIds } }
    }).catch(() => {});

    // 3. Eliminar ítems de pedidos
    await prisma.pedidoItem.deleteMany({
      where: { pedidoId: { in: pedidoIds } }
    }).catch(() => {});

    // 4. Eliminar evidencias de pago
    await (prisma as any).paymentEvidence.deleteMany({
      where: { payment: { pedidoId: { in: pedidoIds } } }
    }).catch(() => {});

    // 5. Eliminar pagos de ordenes
    await (prisma as any).orderPayment.deleteMany({
      where: { pedidoId: { in: pedidoIds } }
    }).catch(() => {});

    // 6. Eliminar Pedidos definitivamente
    const deletedCount = await prisma.pedido.deleteMany({
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
