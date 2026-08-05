import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// ─── GET: Detalle completo de una Orden de Servicio (ServiceEngine) ───────────
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const order = await prisma.pedido.findUnique({
      where: { id },
      include: {
        items: true,
        payment: true,
        negocio: {
          select: {
            id: true,
            nombre: true,
            configuracion: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    // 1. Obtener datos del cliente e historial previo
    const cliente = await prisma.cliente.findFirst({
      where: { telefono: order.telefonoCliente, negocioId: order.negocioId },
    });

    let historial: any[] = [];
    if (cliente) {
      historial = await prisma.pedido.findMany({
        where: {
          negocioId: order.negocioId,
          telefonoCliente: order.telefonoCliente,
          id: { not: order.id },
        },
        select: {
          id: true,
          numeroPedido: true,
          total: true,
          estado: true,
          createdAt: true,
          extraInfo: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
    }

    // 2. Obtener asignación de logística (si existe)
    let deliveryAssignment: any = null;
    try {
      deliveryAssignment = await (prisma as any).deliveryAssignment.findFirst({
        where: { ordenReferenciaId: order.id },
        include: {
          resource: {
            include: { profile: true },
          },
        },
      });
    } catch {
      // Ignorar si no existe
    }

    // 3. Obtener lista de repartidores aprobados (si delivery == true)
    let approvedDrivers: any[] = [];
    try {
      approvedDrivers = await (prisma as any).operableResource.findMany({
        where: {
          negocioId: order.negocioId,
          category: 'DELIVERY_DRIVER',
          active: true,
        },
        include: { profile: true },
      });
    } catch {
      // Ignorar
    }

    return NextResponse.json({
      order,
      cliente,
      historial,
      deliveryAssignment,
      approvedDrivers,
    });
  } catch (error) {
    console.error('[SERVICE_ORDERS_GET_ERROR]', error);
    return NextResponse.json({ error: 'Error obteniendo detalle de la orden' }, { status: 500 });
  }
}

// ─── PUT / PATCH: Actualizar Orden de Servicio (ServiceEngine Workspace) ──────
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;
    const body = await req.json();

    const existingOrder = await prisma.pedido.findUnique({
      where: { id },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    const userName = session?.user?.name || 'Administrador';
    const currentExtra = (existingOrder.extraInfo as any) || {};

    const {
      estado,
      items,
      subtotal,
      descuento,
      costoEnvio,
      total,
      fechaEstimadaEntrega,
      horaEstimadaEntrega,
      prioridad,
      fotos,
      notasInternas,
      pago,
      repartidorId,
    } = body;

    const newExtra = {
      ...currentExtra,
      ...(fechaEstimadaEntrega ? { fechaEstimadaEntrega } : {}),
      ...(horaEstimadaEntrega ? { horaEstimadaEntrega } : {}),
      ...(prioridad ? { prioridad } : {}),
      ...(notasInternas !== undefined ? { notasInternas } : {}),
    };

    // Actualizar Fotos si se envían nuevas
    if (fotos) {
      newExtra.fotosRecepcion = fotos.recepcion || currentExtra.fotosRecepcion || [];
      newExtra.fotosProceso = fotos.proceso || currentExtra.fotosProceso || [];
      newExtra.fotosEntrega = fotos.entrega || currentExtra.fotosEntrega || [];
    }

    // Registrar evento en la línea de tiempo (Timeline & Auditoría)
    const currentTimeline = Array.isArray(newExtra.timeline) ? newExtra.timeline : [];
    if (estado && estado !== existingOrder.estado) {
      currentTimeline.push({
        id: `tl_${Date.now()}`,
        type: 'STATUS_CHANGE',
        action: `Estado cambiado a: ${estado}`,
        estado,
        user: userName,
        timestamp: new Date().toISOString(),
      });
    }

    if (repartidorId && repartidorId !== currentExtra.repartidorId) {
      currentTimeline.push({
        id: `tl_${Date.now()}`,
        type: 'LOGISTICS',
        action: `Repartidor asignado`,
        user: userName,
        timestamp: new Date().toISOString(),
      });
      newExtra.repartidorId = repartidorId;
    }

    newExtra.timeline = currentTimeline;

    // 1. Transacción de actualización de Pedido
    const updatedOrder = await prisma.pedido.update({
      where: { id },
      data: {
        ...(estado ? { estado } : {}),
        ...(subtotal !== undefined ? { subtotal: parseFloat(subtotal) } : {}),
        ...(total !== undefined ? { total: parseFloat(total) } : {}),
        ...(costoEnvio !== undefined ? { costoEnvio: parseFloat(costoEnvio) } : {}),
        ...(fechaEstimadaEntrega ? { fechaEntrega: new Date(fechaEstimadaEntrega) } : {}),
        extraInfo: newExtra,
      },
      include: { items: true, payment: true },
    });

    // 2. Si se actualizaron items, recrear PedidoItems
    if (Array.isArray(items) && items.length > 0) {
      await prisma.pedidoItem.deleteMany({ where: { pedidoId: id } });
      await prisma.pedidoItem.createMany({
        data: items.map((it: any) => ({
          pedidoId: id,
          nombreProducto: it.nombreProducto || it.nombre,
          precioUnitario: parseFloat(it.precioUnitario || it.precio || 0),
          cantidad: parseInt(it.cantidad || 1),
        })),
      });
    }

    // Si se envían PINs de retiro o entrega o actualización de pins
    if (body.pinRetiro !== undefined) {
      newExtra.pinRetiro = body.pinRetiro;
    }
    if (body.pinEntrega !== undefined) {
      newExtra.pinEntrega = body.pinEntrega;
    }
    if (body.pinRetiroValidado !== undefined) {
      newExtra.pinRetiroValidado = body.pinRetiroValidado;
    }
    if (body.pinEntregaValidado !== undefined) {
      newExtra.pinEntregaValidado = body.pinEntregaValidado;
    }

    // 3. Si hay cambio de repartidor y capability delivery está activa, actualizar o crear DeliveryAssignment
    if (repartidorId) {
      try {
        // Generar PINs automáticos de 6 dígitos si no existen
        if (!newExtra.pinRetiro) {
          newExtra.pinRetiro = Math.floor(100000 + Math.random() * 900000).toString();
        }
        if (!newExtra.pinEntrega) {
          newExtra.pinEntrega = Math.floor(100000 + Math.random() * 900000).toString();
        }

        const existingAssigment = await (prisma as any).deliveryAssignment.findFirst({
          where: { ordenReferenciaId: id },
        });

        if (existingAssigment) {
          await (prisma as any).deliveryAssignment.update({
            where: { id: existingAssigment.id },
            data: { resourceId: repartidorId, estado: 'ASIGNADO' },
          });
        } else {
          await (prisma as any).deliveryAssignment.create({
            data: {
              negocioId: existingOrder.negocioId,
              resourceId: repartidorId,
              tipo: existingOrder.tipoEntrega === 'DOMICILIO' ? 'RETIRO' : 'ENTREGA',
              estado: 'ASIGNADO',
              ordenReferenciaId: id,
              ordenReferenciaTipo: 'SERVICE_ORDER',
              clienteNombre: existingOrder.nombreCliente,
              clienteTelefono: existingOrder.telefonoCliente,
              clienteDireccion: existingOrder.direccionCliente || 'Local',
            },
          });
        }
      } catch (err) {
        console.error('Error sincronizando DeliveryAssignment:', err);
      }
    }

    // 4. Si se registra o actualiza Pago
    if (pago) {
      const { metodo, monto, estadoPago } = pago;
      const amountVal = parseFloat(monto !== undefined ? monto : updatedOrder.total);
      const targetState = estadoPago || 'CONFIRMADO';

      await prisma.orderPayment.upsert({
        where: { pedidoId: id },
        update: {
          monto: amountVal,
          estado: targetState,
        },
        create: {
          id: `pay_${Date.now()}`,
          pedidoId: id,
          negocioId: existingOrder.negocioId,
          monto: amountVal,
          estado: targetState,
          codigoPago: `PAGO-${id.slice(0, 6).toUpperCase()}`,
        },
      });

      // Actualizar extraInfo con estado de pago para compatibilidad visual inmediata
      const updatedExtraWithPayment = {
        ...newExtra,
        estadoPago: targetState,
        metodoPago: metodo || 'EFECTIVO',
      };

      await prisma.pedido.update({
        where: { id },
        data: {
          extraInfo: updatedExtraWithPayment,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      order: updatedOrder,
    });
  } catch (error: any) {
    console.error('[SERVICE_ORDERS_PUT_ERROR]', error);
    return NextResponse.json({ error: error?.message || 'Error actualizando la orden' }, { status: 500 });
  }
}
