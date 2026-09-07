import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function getAuthNegocioId() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const user = session.user as any;
  return user.negocioId || user.businessId || null;
}

export async function POST(request: Request) {
  try {
    const negocioId = await getAuthNegocioId();
    if (!negocioId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { tableId, orderId, metodoPago, montoRecibido, notas } = body;

    if (!tableId) {
      return NextResponse.json({ error: 'El ID de la mesa es requerido' }, { status: 400 });
    }

    // 1. Validar mesa
    const mesa = await (prisma as any).restaurantTable.findFirst({
      where: { id: tableId, negocioId }
    });

    if (!mesa) {
      return NextResponse.json({ error: 'Mesa no encontrada' }, { status: 404 });
    }

    // 2. Buscar orden activa si no se pasó orderId
    let orderToClose: any = null;
    if (orderId) {
      orderToClose = await (prisma as any).pedido.findFirst({
        where: { id: orderId, negocioId }
      });
    } else {
      const activeOrders = await (prisma as any).pedido.findMany({
        where: {
          negocioId,
          NOT: {
            estado: { in: ['ENTREGADO', 'CANCELADO', 'COMPLETADO', 'RECHAZADO', 'DESPACHADO'] }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      orderToClose = activeOrders.find((ord: any) => {
        const extra = ord.extraInfo || {};
        if (extra.tableId && extra.tableId === mesa.id) return true;
        if (extra.tableName && extra.tableName.trim().toLowerCase() === mesa.nombre.trim().toLowerCase()) return true;
        if (ord.referenciaCliente && ord.referenciaCliente.toLowerCase().includes(mesa.nombre.toLowerCase())) return true;
        return false;
      });
    }

    await prisma.$transaction(async (tx: any) => {
      // Si hay una orden activa, cerrarla
      if (orderToClose) {
        const extra = (orderToClose.extraInfo as any) || {};
        await tx.pedido.update({
          where: { id: orderToClose.id },
          data: {
            estado: 'COMPLETADO',
            extraInfo: {
              ...extra,
              cerradoAt: new Date().toISOString(),
              metodoPago: metodoPago || 'EFECTIVO',
              montoRecibido: montoRecibido ? Number(montoRecibido) : orderToClose.total,
              kitchenStatus: 'LISTO',
              notasCierre: notas || null
            }
          }
        });

        // Registrar o actualizar comprobante de pago
        const existingPayment = await tx.orderPayment.findUnique({
          where: { pedidoId: orderToClose.id }
        });

        if (existingPayment) {
          await tx.orderPayment.update({
            where: { id: existingPayment.id },
            data: {
              estado: 'CONFIRMADO',
              monto: orderToClose.total,
              observaciones: `Cobrado en Salón - Mesa ${mesa.nombre} (${metodoPago || 'EFECTIVO'})`
            }
          });
        } else {
          await tx.orderPayment.create({
            data: {
              pedidoId: orderToClose.id,
              negocioId,
              monto: orderToClose.total,
              estado: 'CONFIRMADO',
              observaciones: `Cobrado en Salón - Mesa ${mesa.nombre} (${metodoPago || 'EFECTIVO'})`
            }
          });
        }
      }

      // Resolver cualquier llamado de mesero pendiente para esta mesa
      await tx.waiterCall.updateMany({
        where: {
          tableId: mesa.id,
          estado: { in: ['PENDING', 'ACKNOWLEDGED'] }
        },
        data: {
          estado: 'RESOLVED'
        }
      });

      // Liberar la mesa
      await tx.restaurantTable.update({
        where: { id: mesa.id },
        data: {
          estado: 'DISPONIBLE'
        }
      });
    });

    return NextResponse.json({
      success: true,
      message: `Mesa ${mesa.nombre} cobrada y liberada exitosamente`
    });
  } catch (error: any) {
    console.error('[ADMIN_MESAS_CLOSE_POST_ERROR]', error);
    return NextResponse.json({ error: 'Error al cerrar la mesa' }, { status: 500 });
  }
}
