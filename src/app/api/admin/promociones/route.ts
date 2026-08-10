import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const negocioId = (session.user as any).negocioId;
    if (!negocioId) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 400 });
    }

    // 1. Obtener todas las promociones
    const promotions = await (prisma as any).promotion.findMany({
      where: { businessId: negocioId },
      orderBy: { createdAt: 'desc' },
      include: {
        PromotionToService: true
      }
    });

    // 2. Obtener productos y categorías para el selector
    const [products, categories, orders] = await Promise.all([
      (prisma as any).producto.findMany({
        where: { negocioId },
        orderBy: { orden: 'asc' }
      }),
      (prisma as any).categoriaProducto.findMany({
        where: { negocioId, activo: true },
        orderBy: { orden: 'asc' }
      }),
      (prisma as any).pedido.findMany({
        where: { negocioId },
        select: {
          id: true,
          total: true,
          subtotal: true,
          extraInfo: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 300
      })
    ]);

    // 3. Calcular métricas en tiempo real por promoción
    let totalSalesWithPromo = 0;
    let totalOrdersWithPromo = 0;
    let totalDiscountsGiven = 0;
    const promoStatsMap: Record<string, { ordersCount: number; salesTotal: number; discountTotal: number }> = {};

    orders.forEach((o: any) => {
      let extra: any = {};
      if (typeof o.extraInfo === 'string') {
        try { extra = JSON.parse(o.extraInfo); } catch {}
      } else if (o.extraInfo) {
        extra = o.extraInfo;
      }

      const pId = extra?.promotionId;
      const discount = Number(extra?.discountAmount || extra?.descuento || 0);

      if (pId || discount > 0) {
        const orderTotal = Number(o.total || 0);
        totalSalesWithPromo += orderTotal;
        totalOrdersWithPromo += 1;
        totalDiscountsGiven += discount;

        if (pId) {
          if (!promoStatsMap[pId]) {
            promoStatsMap[pId] = { ordersCount: 0, salesTotal: 0, discountTotal: 0 };
          }
          promoStatsMap[pId].ordersCount += 1;
          promoStatsMap[pId].salesTotal += orderTotal;
          promoStatsMap[pId].discountTotal += discount;
        }
      }
    });

    // Enriquecer cada promoción con métricas reales
    const enrichedPromotions = promotions.map((p: any) => {
      const stats = promoStatsMap[p.id] || { ordersCount: 0, salesTotal: 0, discountTotal: 0 };
      return {
        ...p,
        ordersGenerated: stats.ordersCount,
        salesGenerated: stats.salesTotal,
        discountGiven: stats.discountTotal
      };
    });

    const activeCount = enrichedPromotions.filter((p: any) => p.estado === 'ACTIVA' || p.estado === 'activa').length;
    const avgTicketPromo = totalOrdersWithPromo > 0 ? totalSalesWithPromo / totalOrdersWithPromo : 0;

    return NextResponse.json({
      success: true,
      promotions: enrichedPromotions,
      products,
      categories,
      metrics: {
        totalSalesWithPromo,
        totalOrdersWithPromo,
        totalDiscountsGiven,
        avgTicketPromo,
        activeCount
      }
    });
  } catch (error: any) {
    console.error('[API_ADMIN_PROMOCIONES_GET_ERROR]', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const negocioId = (session.user as any).negocioId;
    if (!negocioId) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 400 });
    }

    const body = await request.json();

    const {
      titulo,
      descripcion = '',
      tipoPromo = 'PORCENTAJE',
      precioPromo = 0,
      precioAnterior,
      porcentajeDescuento,
      montoDescuento,
      imagenUrl = '',
      fechaInicio = new Date().toISOString(),
      fechaFin = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      diasValidos,
      horaInicioValida,
      horaFinValida,
      canales = ['POS', 'MESEROS', 'DELIVERY', 'PICKUP', 'LANDING'],
      montoMinimo,
      cantidadMinima,
      productoRequeridoId,
      categoriaRequeridaId,
      cuponCodigo,
      tipoCliente = 'ANY',
      usosTotalesMaximo,
      usosPorClienteMaximo,
      presupuestoMaximo,
      esCombinable = false,
      productosRelacionados = [],
      estado = 'ACTIVA'
    } = body;

    if (!titulo) {
      return NextResponse.json({ error: 'El título de la promoción es obligatorio' }, { status: 400 });
    }

    const promoId = `promo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newPromo = await (prisma as any).promotion.create({
      data: {
        id: promoId,
        businessId: negocioId,
        titulo,
        descripcion: descripcion || '',
        precioPromo: parseFloat(precioPromo) || 0,
        precioAnterior: precioAnterior ? parseFloat(precioAnterior) : null,
        imagenUrl: imagenUrl || '',
        fechaInicio: new Date(fechaInicio),
        fechaFin: new Date(fechaFin),
        estado,
        tipoPromo,
        diasValidos: Array.isArray(diasValidos) ? diasValidos.join(',') : diasValidos,
        horaInicioValida: horaInicioValida || null,
        horaFinValida: horaFinValida || null,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Promoción creada exitosamente',
      promotion: newPromo
    });
  } catch (error: any) {
    console.error('[API_ADMIN_PROMOCIONES_POST_ERROR]', error);
    return NextResponse.json({ error: error.message || 'Error al crear promoción' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const negocioId = (session.user as any).negocioId;
    const body = await request.json();
    const { id, action, ...updateFields } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID de promoción es requerido' }, { status: 400 });
    }

    const existing = await (prisma as any).promotion.findUnique({ where: { id } });
    if (!existing || existing.businessId !== negocioId) {
      return NextResponse.json({ error: 'Promoción no encontrada o no autorizada' }, { status: 404 });
    }

    if (action === 'TOGGLE_STATUS') {
      const nextStatus = existing.estado === 'ACTIVA' || existing.estado === 'activa' ? 'PAUSADA' : 'ACTIVA';
      const updated = await (prisma as any).promotion.update({
        where: { id },
        data: { estado: nextStatus, updatedAt: new Date() }
      });
      return NextResponse.json({ success: true, promotion: updated });
    }

    if (action === 'DUPLICATE') {
      const dupId = `promo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const duplicated = await (prisma as any).promotion.create({
        data: {
          id: dupId,
          businessId: negocioId,
          titulo: `${existing.titulo} (Copia)`,
          descripcion: existing.descripcion,
          precioPromo: existing.precioPromo,
          precioAnterior: existing.precioAnterior,
          imagenUrl: existing.imagenUrl,
          fechaInicio: existing.fechaInicio,
          fechaFin: existing.fechaFin,
          estado: 'ACTIVA',
          tipoPromo: existing.tipoPromo,
          diasValidos: existing.diasValidos,
          horaInicioValida: existing.horaInicioValida,
          horaFinValida: existing.horaFinValida,
          updatedAt: new Date()
        }
      });
      return NextResponse.json({ success: true, promotion: duplicated });
    }

    const updated = await (prisma as any).promotion.update({
      where: { id },
      data: {
        ...updateFields,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({ success: true, promotion: updated });
  } catch (error: any) {
    console.error('[API_ADMIN_PROMOCIONES_PUT_ERROR]', error);
    return NextResponse.json({ error: error.message || 'Error al actualizar promoción' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const negocioId = (session.user as any).negocioId;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });
    }

    await (prisma as any).promotion.deleteMany({
      where: { id, businessId: negocioId }
    });

    return NextResponse.json({ success: true, message: 'Promoción eliminada' });
  } catch (error: any) {
    console.error('[API_ADMIN_PROMOCIONES_DELETE_ERROR]', error);
    return NextResponse.json({ error: error.message || 'Error al eliminar promoción' }, { status: 500 });
  }
}
