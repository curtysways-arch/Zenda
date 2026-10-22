import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { InventoryEngine } from '@/core/inventory/InventoryEngine';
import { CashSessionService } from '@/core/cash/CashSessionService';
import { ElectronicBillingService } from '@/core/billing/ElectronicBillingService';
import { requireBusinessAccess } from '@/lib/auth/requireBusinessAccess';
import { awardPurchasePoints } from '@/lib/loyalty/purchasePoints';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const negocio = await (prisma as any).negocio.findUnique({
      where: { slug }
    });

    if (!negocio) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    // Solo el personal del negocio puede cobrar en su caja
    const access = await requireBusinessAccess(negocio.id);
    if (!access.ok) return access.response;

    const body = await req.json();
    const {
      items,
      paymentMethod = 'EFECTIVO',
      amountPaid = 0,
      client,
      clubPhone,
      notes,
      issueElectronicInvoice = false
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'El carrito no contiene productos' }, { status: 400 });
    }

    // 1. Validar sesión obligatoria de caja para este negocio
    const activeSession = await CashSessionService.getActiveSession(negocio.id);
    if (!activeSession) {
      return NextResponse.json({
        error: 'No se puede procesar la venta: No existe una sesión de caja abierta para este negocio. Debe abrir caja con fondo inicial antes de vender.'
      }, { status: 403 });
    }

    // 2. Transacción atómica completa: Validación, Pedido, Inventario y Caja
    const { pedido, total, paidNum, changeDue, orderItemsData } = await (prisma as any).$transaction(async (tx: any) => {
      // Re-verificar que la sesión de caja continúe abierta y pertenezca al negocio
      const verifiedSession = await tx.cashRegisterSession.findFirst({
        where: { id: activeSession.id, businessId: negocio.id, status: 'OPEN' }
      });
      if (!verifiedSession) {
        throw new Error('La sesión de caja ya no se encuentra abierta o no pertenece a este negocio.');
      }

      // Validar productos, existencias e importes en servidor
      let subtotal = 0;
      const verifiedItems: any[] = [];

      for (const item of items) {
        if (!item.productId) {
          throw new Error('Identificador de producto inválido en el carrito.');
        }

        const dbProduct = await tx.producto.findFirst({
          where: { id: item.productId, negocioId: negocio.id }
        });

        if (!dbProduct) {
          throw new Error(`Producto no válido o no pertenece a este negocio: ${item.name || item.productId}`);
        }

        let price = dbProduct.precio;
        let variantName = null;

        if (item.variantId) {
          const dbVariant = await tx.productoVariante.findFirst({
            where: { id: item.variantId, productoId: dbProduct.id }
          });
          if (!dbVariant) {
            throw new Error(`Variante no encontrada para el producto "${dbProduct.nombre}".`);
          }
          if (dbVariant.precio && dbVariant.precio > 0) {
            price = dbVariant.precio;
          }
          variantName = dbVariant.nombre;
        }

        const qty = Math.max(1, parseInt(item.quantity) || 1);
        const lineSubtotal = price * qty;
        subtotal += lineSubtotal;

        verifiedItems.push({
          productoId: dbProduct.id,
          varianteId: item.variantId || null,
          varianteNombre: variantName,
          sku: dbProduct.sku || null,
          nombreProducto: dbProduct.nombre,
          precioUnitario: price,
          cantidad: qty,
          tipoProducto: dbProduct.tipoProducto
        });
      }

      // Resolver branch y warehouse físico obligatorio para la venta POS (excluir bodegas virtuales)
      const branchId = verifiedSession.branchId;
      const defaultWh = await tx.warehouse.findFirst({
        where: { businessId: negocio.id, branchId, isDefault: true, active: true, type: { notIn: ['TRANSIT', 'SCRAP_WASTE'] } }
      });
      let warehouseId = defaultWh?.id;
      if (!warehouseId) {
        const anyWh = await tx.warehouse.findFirst({
          where: { businessId: negocio.id, branchId, active: true, type: { notIn: ['TRANSIT', 'SCRAP_WASTE'] } }
        });
        if (anyWh) warehouseId = anyWh.id;
      }

      if (!warehouseId) {
        throw new Error('La sucursal asociada a la caja no tiene una bodega física de inventario configurada. Configure una bodega física antes de procesar ventas en mostrador.');
      }

      const totalCalculated = subtotal;
      const numPaid = Number(amountPaid) || totalCalculated;
      if (paymentMethod === 'EFECTIVO' && numPaid < totalCalculated) {
        throw new Error(`El monto en efectivo ingresado ($${numPaid.toFixed(2)}) es menor al total a cobrar ($${totalCalculated.toFixed(2)}).`);
      }
      const calculatedChange = Math.max(0, numPaid - totalCalculated);

      // Obtener número incremental correlativo por negocio
      const lastOrder = await tx.pedido.findFirst({
        where: { negocioId: negocio.id },
        orderBy: { numeroPedido: 'desc' }
      });
      const numeroPedido = (lastOrder?.numeroPedido || 0) + 1;

      // Crear el pedido
      const customerName = client?.nombre || 'Cliente Mostrador';
      const customerPhone = client?.telefono || '0999999999';

      const nuevoPedido = await tx.pedido.create({
        data: {
          negocioId: negocio.id,
          branchId,
          numeroPedido,
          tipoEntrega: 'MOSTRADOR_POS',
          nombreCliente: customerName,
          telefonoCliente: customerPhone,
          direccionCliente: client?.direccion || 'Venta Local',
          fechaEntrega: new Date(),
          franjaHoraria: 'POS',
          subtotal: totalCalculated,
          costoEnvio: 0,
          total: totalCalculated,
          estado: 'FINALIZADO',
          estadoDisponibilidad: 'PRODUCTOS_CONFIRMADOS',
          notas: notes || `Venta POS - Caja: ${activeSession.cashRegister?.name || '01'}`,
          extraInfo: {
            metodoPago: paymentMethod,
            montoRecibido: numPaid,
            cambioDevuelto: calculatedChange,
            cajero: activeSession.openedBy,
            sessionId: activeSession.id
          },
          items: {
            create: verifiedItems.map(it => ({
              productoId: it.productoId,
              varianteId: it.varianteId,
              varianteNombre: it.varianteNombre,
              sku: it.sku,
              nombreProducto: it.nombreProducto,
              precioUnitario: it.precioUnitario,
              cantidad: it.cantidad
            }))
          }
        },
        include: {
          items: true
        }
      });

      // Descontar inventario en la misma transacción (sin silenciar errores)
      for (const it of verifiedItems) {
        if (it.tipoProducto !== 'NO_INVENTARIABLE') {
          if (!warehouseId) {
            throw new Error('La sucursal no tiene una bodega de inventario configurada. Configure una bodega antes de realizar esta operación.');
          }
          await InventoryEngine.recordMovement({
            businessId: negocio.id,
            branchId,
            warehouseId,
            productId: it.productoId,
            variantId: it.varianteId,
            quantity: -it.cantidad, // Salida por venta
            type: 'VENTA',
            // NO se envía precioUnitario como unitCost: InventoryEngine valoriza al PMP certificado de la sucursal
            reason: `Venta POS #${nuevoPedido.numeroPedido}`,
            reference: `ORD-${nuevoPedido.numeroPedido}`,
            sourceDocType: 'VENTA',
            sourceDocId: nuevoPedido.id,
            createdBy: activeSession.openedBy,
            allowNegative: true // En mostrador se permite saldo negativo para no frenar la fila, pero fallos de BD revierten todo
          }, tx);
        }
      }

      // Registrar movimiento en sesión de caja en la misma transacción
      await CashSessionService.recordMovement({
        sessionId: activeSession.id,
        businessId: negocio.id,
        type: 'VENTA_EFECTIVO',
        amount: totalCalculated,
        paymentMethod,
        concept: `Venta POS #${nuevoPedido.numeroPedido} - ${customerName}`,
        reference: `ORD-${nuevoPedido.numeroPedido}`,
        userName: activeSession.openedBy
      }, tx);

      return {
        pedido: nuevoPedido,
        total: totalCalculated,
        paidNum: numPaid,
        changeDue: calculatedChange,
        orderItemsData: verifiedItems
      };
    }, { maxWait: 10000, timeout: 30000 });

    // 3. Facturación Electrónica SRI (fuera de la transacción de stock/caja)
    let electronicInvoice = null;
    if (issueElectronicInvoice && client?.identificacion) {
      try {
        electronicInvoice = await ElectronicBillingService.issueInvoice({
          businessId: negocio.id,
          orderId: pedido.id,
          cliente: {
            identificacion: client.identificacion,
            tipoIdentificacion: client.tipoIdentificacion,
            razonSocial: client.razonSocial || pedido.nombreCliente,
            direccion: client.direccion,
            email: client.email,
            telefono: client.telefono
          },
          items: orderItemsData.map((i: any) => ({
            nombre: i.nombreProducto,
            cantidad: i.cantidad,
            precioUnitario: i.precioUnitario,
            subtotal: i.precioUnitario * i.cantidad
          })),
          formaPago: paymentMethod.toUpperCase().includes('TARJETA') ? '19' : '01'
        });
      } catch (invErr: any) {
        console.warn('[POS_BILLING_WARNING]', invErr?.message);
      }
    }

    // 4. Club de beneficios: sumar puntos al cliente (si dio su teléfono)
    const club = await awardPurchasePoints({
      negocioId: negocio.id,
      referenciaId: pedido.id,
      monto: total,
      telefono: clubPhone || client?.telefono,
      nombre: client?.nombre,
      eventType: 'ORDER_COMPLETED',
      cantidad: orderItemsData.reduce((acc: number, it: any) => acc + (it.cantidad || 1), 0),
      metadata: { numeroPedido: pedido.numeroPedido, tipoEntrega: 'MOSTRADOR_POS' }
    });

    return NextResponse.json({
      success: true,
      message: 'Venta completada exitosamente',
      club,
      pedido,
      changeDue,
      amountPaid: paidNum,
      electronicInvoice
    });
  } catch (e: any) {
    console.error('[API_POS_CHECKOUT_POST]', e);
    return NextResponse.json({ error: e?.message || 'Error al procesar la venta en POS' }, { status: 400 });
  }
}
