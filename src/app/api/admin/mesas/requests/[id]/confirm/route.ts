import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notificationService } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

async function getAuthNegocioId() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const user = session.user as any;
  return user.negocioId || user.businessId || null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const negocioId = await getAuthNegocioId();
    if (!negocioId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    // 1. Buscar la solicitud de pedido
    const orderReq = await (prisma as any).tableOrderRequest.findFirst({
      where: { id, negocioId },
      include: { table: true }
    });

    if (!orderReq) {
      return NextResponse.json({ error: 'Solicitud de mesa no encontrada' }, { status: 404 });
    }

    // 🔒 2. Protección contra doble confirmación
    if (orderReq.estado !== 'PENDING_ADMIN_CONFIRMATION') {
      return NextResponse.json({
        error: `Esta solicitud ya fue procesada anteriormente (Estado: ${orderReq.estado}).`
      }, { status: 400 });
    }

    // 3. Ejecutar transacción atómica de confirmación
    const result = await prisma.$transaction(async (tx: any) => {
      // a. Actualizar estado de solicitud atómicamente
      const updatedReq = await tx.tableOrderRequest.update({
        where: { id },
        data: { estado: 'CONFIRMED' }
      });

      // b. Obtener número de pedido incremental
      const lastOrder = await tx.pedido.findFirst({
        where: { negocioId },
        orderBy: { numeroPedido: 'desc' },
        select: { numeroPedido: true }
      });
      const nextOrderNumber = lastOrder ? lastOrder.numeroPedido + 1 : 1;

      // c. Formatear items
      const rawItems = Array.isArray(orderReq.items) ? orderReq.items : [];
      const itemsToCreate = rawItems.map((item: any) => ({
        productoId: item.productoId || null,
        varianteId: item.varianteId || null,
        varianteNombre: item.varianteNombre || null,
        sku: item.sku || null,
        nombreProducto: item.nombre || item.nombreProducto || 'Producto de Mesa',
        precioUnitario: Number(item.precioUnitario || item.precio || 0),
        cantidad: Number(item.cantidad || 1)
      }));

      // d. Crear Pedido definitivo en el sistema existente
      const newOrder = await tx.pedido.create({
        data: {
          negocioId,
          numeroPedido: nextOrderNumber,
          tipoEntrega: 'MESA',
          nombreCliente: orderReq.nombreCliente || `Cliente Mesa ${orderReq.table?.nombre || ''}`,
          telefonoCliente: orderReq.telefonoCliente || '0999999999',
          direccionCliente: `Mesa ${orderReq.table?.nombre || ''}`,
          referenciaCliente: `Mesa: ${orderReq.table?.nombre || ''}`,
          latitud: orderReq.clientLat || null,
          longitud: orderReq.clientLng || null,
          fechaEntrega: new Date(),
          franjaHoraria: 'Inmediata (En Mesa)',
          subtotal: orderReq.subtotal,
          costoEnvio: 0,
          total: orderReq.total,
          estado: 'ACEPTADO', // Listo para preparación KDS
          notas: orderReq.notas || `Pedido solicitado desde ${orderReq.table?.nombre || 'Mesa'}`,
          extraInfo: {
            origin: 'TABLE_ORDER',
            tableId: orderReq.tableId,
            tableToken: orderReq.table?.token,
            tableSessionId: orderReq.tableSessionId,
            tableName: orderReq.table?.nombre,
            orderRequestId: orderReq.id,
            locationValidated: orderReq.locationValidated,
            distanceFromBusiness: orderReq.distanceFromBusiness
          },
          items: {
            create: itemsToCreate
          }
        },
        include: {
          items: true
        }
      });

      // e. Vincular pedidoId en la solicitud y marcar mesa como OCUPADA
      await tx.tableOrderRequest.update({
        where: { id },
        data: { pedidoId: newOrder.id }
      });

      await tx.restaurantTable.update({
        where: { id: orderReq.tableId },
        data: { estado: 'OCUPADA' }
      });

      return newOrder;
    });

    // 4. Notificar al administrador / KDS
    try {
      await notificationService.adminAlert(
        'NUEVO_PEDIDO_MESA_CONFIRMADO',
        `Pedido #${result.numeroPedido} de Mesa ${orderReq.table?.nombre || ''} por $${result.total.toFixed(2)}`
      );
    } catch (notifErr) {
      console.error('[CONFIRM_TABLE_ORDER_NOTIF_WARNING]', notifErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Pedido de mesa confirmado con éxito y enviado a cocina',
      pedido: result
    });
  } catch (error: any) {
    console.error('[ADMIN_MESAS_REQUEST_CONFIRM_ERROR]', error);
    return NextResponse.json({ error: error.message || 'Error al confirmar solicitud' }, { status: 500 });
  }
}
