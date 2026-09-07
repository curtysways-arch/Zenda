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

export async function POST(request: Request) {
  try {
    const negocioId = await getAuthNegocioId();
    if (!negocioId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { tableId, items, notas } = body;

    if (!tableId) {
      return NextResponse.json({ error: 'El ID de la mesa es requerido' }, { status: 400 });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Debe incluir al menos un producto' }, { status: 400 });
    }

    // 1. Validar que la mesa existe y pertenece al negocio
    const mesa = await (prisma as any).restaurantTable.findFirst({
      where: { id: tableId, negocioId }
    });

    if (!mesa) {
      return NextResponse.json({ error: 'Mesa no encontrada' }, { status: 404 });
    }

    // 2. Buscar si ya existe una orden activa para esta mesa
    const activeOrders = await (prisma as any).pedido.findMany({
      where: {
        negocioId,
        NOT: {
          estado: { in: ['ENTREGADO', 'CANCELADO', 'COMPLETADO', 'RECHAZADO', 'DESPACHADO'] }
        }
      },
      include: { items: true },
      orderBy: { createdAt: 'desc' }
    });

    const existingOrder = activeOrders.find((ord: any) => {
      const extra = ord.extraInfo || {};
      if (extra.tableId && extra.tableId === mesa.id) return true;
      if (extra.tableName && extra.tableName.trim().toLowerCase() === mesa.nombre.trim().toLowerCase()) return true;
      if (ord.referenciaCliente && ord.referenciaCliente.toLowerCase().includes(mesa.nombre.toLowerCase())) return true;
      return false;
    });

    // 3. Formatear items a agregar
    const itemsToAdd = items.map((it: any) => ({
      productoId: it.productoId || null,
      varianteId: it.varianteId || null,
      varianteNombre: it.varianteNombre || null,
      sku: it.sku || null,
      nombreProducto: it.nombreProducto || it.nombre || 'Producto',
      precioUnitario: Number(it.precioUnitario || it.precio || 0),
      cantidad: Number(it.cantidad || 1)
    }));

    const additionalSubtotal = itemsToAdd.reduce(
      (sum: number, it: any) => sum + it.precioUnitario * it.cantidad,
      0
    );

    let finalOrder: any;

    if (existingOrder) {
      // Modificar orden existente agregando los nuevos items
      finalOrder = await prisma.$transaction(async (tx: any) => {
        // Crear los nuevos ítems de la comanda
        for (const item of itemsToAdd) {
          await tx.pedidoItem.create({
            data: {
              pedidoId: existingOrder.id,
              productoId: item.productoId,
              varianteId: item.varianteId,
              varianteNombre: item.varianteNombre,
              sku: item.sku,
              nombreProducto: item.nombreProducto,
              precioUnitario: item.precioUnitario,
              cantidad: item.cantidad
            }
          });
        }

        const newSubtotal = Number(existingOrder.subtotal) + additionalSubtotal;
        const newTotal = Number(existingOrder.total) + additionalSubtotal;
        const currentExtra = (existingOrder.extraInfo as any) || {};

        const updated = await tx.pedido.update({
          where: { id: existingOrder.id },
          data: {
            subtotal: newSubtotal,
            total: newTotal,
            estado: 'EN_PREPARACION',
            extraInfo: {
              ...currentExtra,
              tableId: mesa.id,
              tableName: mesa.nombre,
              kitchenStatus: 'PENDIENTE', // Reabre aviso de preparación en KDS
              lastItemAddedAt: new Date().toISOString()
            }
          },
          include: { items: true }
        });

        // Asegurar que la mesa esté en estado OCUPADA
        await tx.restaurantTable.update({
          where: { id: mesa.id },
          data: { estado: 'OCUPADA' }
        });

        return updated;
      });
    } else {
      // Crear nueva orden directa para la mesa
      finalOrder = await prisma.$transaction(async (tx: any) => {
        const lastOrder = await tx.pedido.findFirst({
          where: { negocioId },
          orderBy: { numeroPedido: 'desc' },
          select: { numeroPedido: true }
        });
        const nextOrderNumber = lastOrder ? lastOrder.numeroPedido + 1 : 1;

        const newOrder = await tx.pedido.create({
          data: {
            negocioId,
            numeroPedido: nextOrderNumber,
            tipoEntrega: 'MESA',
            nombreCliente: `Cliente ${mesa.nombre}`,
            telefonoCliente: '0999999999',
            direccionCliente: `Mesa ${mesa.nombre}`,
            referenciaCliente: `Mesa: ${mesa.nombre}`,
            fechaEntrega: new Date(),
            franjaHoraria: 'Inmediata (En Salón)',
            subtotal: additionalSubtotal,
            costoEnvio: 0,
            total: additionalSubtotal,
            estado: 'ACEPTADO',
            notas: notas || `Comanda abierta en ${mesa.nombre}`,
            extraInfo: {
              origin: 'TABLE_ORDER',
              tableId: mesa.id,
              tableName: mesa.nombre,
              tableToken: mesa.token,
              kitchenStatus: 'PENDIENTE'
            },
            items: {
              create: itemsToAdd
            }
          },
          include: { items: true }
        });

        await tx.restaurantTable.update({
          where: { id: mesa.id },
          data: { estado: 'OCUPADA' }
        });

        return newOrder;
      });
    }

    // Notificar alerta a cocina / KDS
    try {
      await notificationService.adminAlert(
        'NUEVA_COMANDA_MESA',
        `Comanda actualizada en ${mesa.nombre} (Orden #${finalOrder.numeroPedido}) por $${finalOrder.total.toFixed(2)}`
      );
    } catch (_) {}

    return NextResponse.json({
      success: true,
      isNew: !existingOrder,
      pedido: finalOrder
    });
  } catch (error: any) {
    console.error('[ADMIN_MESAS_ORDER_POST_ERROR]', error);
    return NextResponse.json({ error: 'Error al procesar comanda en mesa' }, { status: 500 });
  }
}
