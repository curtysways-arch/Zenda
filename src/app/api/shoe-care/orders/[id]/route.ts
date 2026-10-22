import { getCanonicalLogistics } from '@/core/logistics/CanonicalLogisticsService';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { requireOrderAccess } from '@/lib/laundry/orderAccess';

export const dynamic = 'force-dynamic';

// ─── GET: Detalle completo de una Orden de Servicio (ServiceEngine) ───────────
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const access = await requireOrderAccess(id);
    if (!access.ok) return access.response;

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

    // Solo el personal del negocio. (El cliente aprueba o rechaza el precio en /api/public/laundry/[id].)
    const access = await requireOrderAccess(id);
    if (!access.ok) return access.response;

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
      ...(body.articulos ? { articulos: body.articulos } : {}),
      ...(body.propuestaNegocio ? { propuestaNegocio: body.propuestaNegocio } : {}),
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

    const productionStates = ['RECIBIDO', 'EN_PROCESO', 'LAVANDO', 'SECANDO', 'DETALLADO', 'LISTO'];
    const isNowInProduction = estado ? productionStates.includes(estado) : productionStates.includes(existingOrder.estado);

    if (isNowInProduction) {
      // Las prendas están en taller bajo cuidado del negocio; no hay repartidor de entrega activo
      newExtra.assignedDriverId = null;
      newExtra.assignedDriverName = null;
      newExtra.assignedDriver = null;
      newExtra.assignedDriverPhone = null;
      newExtra.repartidorId = null;
      newExtra.driverAcceptedAt = null;
    } else if (repartidorId && repartidorId !== currentExtra.repartidorId) {
      currentTimeline.push({
        id: `tl_${Date.now()}`,
        type: 'LOGISTICS',
        action: `Repartidor asignado`,
        user: userName,
        timestamp: new Date().toISOString(),
      });
      newExtra.repartidorId = repartidorId;
      newExtra.assignedDriverId = repartidorId;
    } else if (repartidorId === null || repartidorId === '') {
      newExtra.repartidorId = null;
      newExtra.assignedDriverId = null;
      newExtra.assignedDriverName = null;
      newExtra.assignedDriver = null;
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

    // Acciones de compensación y liquidación en órdenes de servicio
    if (body.markPickupPaid || body.markDeliveryPaid || body.markCollectionLiquidated) {
      let assignment: any = null;
      try {
        assignment = await (prisma as any).deliveryAssignment.findFirst({
          where: { ordenReferenciaId: id },
          include: { resource: true },
        });
      } catch {}

      const canonical = getCanonicalLogistics({ ...existingOrder, extraInfo: newExtra });

      if (body.markPickupPaid) {
        if (!canonical.pickupDriver) {
          const dName = assignment?.tipo === 'RETIRO' ? assignment?.resource?.name : (newExtra.assignedDriverName || newExtra.assignedDriver || 'Chofer Retiro');
          const dId = assignment?.tipo === 'RETIRO' ? assignment?.resourceId : (newExtra.assignedDriverId || newExtra.repartidorId || null);
          canonical.pickupDriver = {
            driverId: dId,
            driverName: dName || 'Chofer Retiro',
            misionTipo: 'RECOGIDA',
            compensacion: canonical.pickupFee || 2.00,
            estadoCompensacion: 'PENDING',
          };
        }
        canonical.pickupDriver.estadoCompensacion = 'PAID';
        canonical.pickupDriver.pagadoAt = new Date().toISOString();
        canonical.pickupDriver.pagadoPor = userName;
        newExtra.pickupCompensacionEstado = 'PAID';

        currentTimeline.push({
          id: `tl_${Date.now()}`,
          type: 'LOGISTICS',
          action: `Compensación de retiro ($${(canonical.pickupFee || 2.0).toFixed(2)}) pagada al chofer (${canonical.pickupDriver.driverName || 'Chofer'})`,
          user: userName,
          timestamp: new Date().toISOString(),
        });
      }

      if (body.markDeliveryPaid) {
        if (!canonical.deliveryDriver) {
          const dName = assignment?.tipo === 'ENTREGA' ? assignment?.resource?.name : (newExtra.assignedDriverName || newExtra.assignedDriver || 'Chofer Entrega');
          const dId = assignment?.tipo === 'ENTREGA' ? assignment?.resourceId : (newExtra.assignedDriverId || newExtra.repartidorId || null);
          canonical.deliveryDriver = {
            driverId: dId,
            driverName: dName || 'Chofer Entrega',
            misionTipo: 'ENTREGA',
            compensacion: canonical.deliveryFee || 2.00,
            estadoCompensacion: 'PENDING',
          };
        }
        canonical.deliveryDriver.estadoCompensacion = 'PAID';
        canonical.deliveryDriver.pagadoAt = new Date().toISOString();
        canonical.deliveryDriver.pagadoPor = userName;
        newExtra.deliveryCompensacionEstado = 'PAID';

        currentTimeline.push({
          id: `tl_${Date.now()}`,
          type: 'LOGISTICS',
          action: `Compensación de entrega ($${(canonical.deliveryFee || 2.0).toFixed(2)}) pagada al chofer (${canonical.deliveryDriver.driverName || 'Chofer'})`,
          user: userName,
          timestamp: new Date().toISOString(),
        });
      }

      if (body.markCollectionLiquidated) {
        canonical.recaudacion.estado = 'LIQUIDATED';
        canonical.recaudacion.liquidadoAt = new Date().toISOString();
        canonical.recaudacion.liquidadoPor = userName;
      }

      newExtra.canonicalLogistics = canonical;
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

    // 3. Si hay cambio de repartidor o estado logístico, sincronizar DeliveryAssignment
    try {
      const existingAssigment = await (prisma as any).deliveryAssignment.findFirst({
        where: { ordenReferenciaId: id },
      });

      if (isNowInProduction) {
        // En producción de taller, si existía una asignación de RETIRO, se marca como COMPLETADO
        if (existingAssigment && existingAssigment.tipo === 'RETIRO' && existingAssigment.estado !== 'COMPLETADO') {
          await (prisma as any).deliveryAssignment.update({
            where: { id: existingAssigment.id },
            data: { estado: 'COMPLETADO' },
          });
        }
      } else if (estado === 'ESPERANDO_REPARTIDOR_ENTREGA') {
        // Publicación de entrega final a domicilio
        if (repartidorId) {
          // Asignado a un repartidor específico
          if (existingAssigment) {
            await (prisma as any).deliveryAssignment.update({
              where: { id: existingAssigment.id },
              data: { resourceId: repartidorId, estado: 'ASIGNADO', tipo: 'ENTREGA' },
            });
          } else {
            await (prisma as any).deliveryAssignment.create({
              data: {
                negocioId: existingOrder.negocioId,
                resourceId: repartidorId,
                tipo: 'ENTREGA',
                estado: 'ASIGNADO',
                ordenReferenciaId: id,
                ordenReferenciaTipo: 'SERVICE_ORDER',
                clienteNombre: existingOrder.nombreCliente,
                clienteTelefono: existingOrder.telefonoCliente,
                clienteDireccion: existingOrder.direccionCliente || 'Local',
              },
            });
          }
        } else {
          // Bolsa Abierta (/driver) para cualquier repartidor (sin chofer preasignado)
          if (existingAssigment) {
            await (prisma as any).deliveryAssignment.update({
              where: { id: existingAssigment.id },
              data: { resourceId: null, estado: 'PENDIENTE', tipo: 'ENTREGA' },
            });
          } else {
            await (prisma as any).deliveryAssignment.create({
              data: {
                negocioId: existingOrder.negocioId,
                resourceId: null,
                tipo: 'ENTREGA',
                estado: 'PENDIENTE',
                ordenReferenciaId: id,
                ordenReferenciaTipo: 'SERVICE_ORDER',
                clienteNombre: existingOrder.nombreCliente,
                clienteTelefono: existingOrder.telefonoCliente,
                clienteDireccion: existingOrder.direccionCliente || 'Local',
              },
            });
          }
        }
      } else if (repartidorId) {
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
      }
    } catch (err) {
      console.error('Error sincronizando DeliveryAssignment:', err);
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
