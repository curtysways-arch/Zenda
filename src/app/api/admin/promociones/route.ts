import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function extractMetadata(p: any, productsMap: Map<string, any>) {
  let meta: any = {};
  let cleanDesc = p.descripcion || '';

  if (cleanDesc.includes('<!-- CITIOX_META:')) {
    try {
      const parts = cleanDesc.split('<!-- CITIOX_META:');
      cleanDesc = parts[0].trim();
      const jsonStr = parts[1].split('-->')[0].trim();
      meta = JSON.parse(jsonStr);
    } catch (_) {}
  }

  const productoRequeridoId = meta.productoRequeridoId || (p.PromotionToService && p.PromotionToService[0]?.B) || null;
  const linkedProduct = productoRequeridoId ? productsMap.get(productoRequeridoId) : null;
  const finalImagenUrl = p.imagenUrl && p.imagenUrl.trim() !== '' 
    ? p.imagenUrl 
    : (linkedProduct?.imagenUrl || '');

  return {
    ...p,
    descripcion: cleanDesc,
    imagenUrl: finalImagenUrl,
    productoRequeridoId,
    categoriaRequeridaId: meta.categoriaRequeridaId || null,
    productosRelacionados: meta.productosRelacionados || [],
    cuponCodigo: meta.cuponCodigo || null,
    canales: meta.canales || ['POS', 'MESEROS', 'DELIVERY', 'PICKUP', 'LANDING'],
    montoMinimo: meta.montoMinimo || 0,
    tipoCliente: meta.tipoCliente || 'ANY'
  };
}

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

    const [promotions, products, categories, orders] = await Promise.all([
      (prisma as any).promotion.findMany({
        where: { businessId: negocioId },
        orderBy: { createdAt: 'desc' },
        include: { PromotionToService: true }
      }),
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
        select: { id: true, total: true, subtotal: true, extraInfo: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 300
      })
    ]);

    const productsMap = new Map<string, any>();
    products.forEach((prod: any) => productsMap.set(prod.id, prod));

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

    const enrichedPromotions = promotions.map((p: any) => {
      const stats = promoStatsMap[p.id] || { ordersCount: 0, salesTotal: 0, discountTotal: 0 };
      const baseWithMeta = extractMetadata(p, productsMap);
      return {
        ...baseWithMeta,
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
      imagenUrl = '',
      fechaInicio = new Date().toISOString(),
      fechaFin = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      diasValidos,
      horaInicioValida,
      horaFinValida,
      canales = ['POS', 'MESEROS', 'DELIVERY', 'PICKUP', 'LANDING'],
      montoMinimo = 0,
      productoRequeridoId,
      categoriaRequeridaId,
      cuponCodigo,
      tipoCliente = 'ANY',
      productosRelacionados = [],
      estado = 'ACTIVA'
    } = body;

    if (!titulo) {
      return NextResponse.json({ error: 'El título de la promoción es obligatorio' }, { status: 400 });
    }

    const metaObj = {
      productoRequeridoId,
      categoriaRequeridaId,
      productosRelacionados,
      cuponCodigo,
      canales,
      montoMinimo,
      tipoCliente
    };

    const finalDescription = `${descripcion.trim()}\n<!-- CITIOX_META: ${JSON.stringify(metaObj)} -->`;
    const promoId = `promo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newPromo = await (prisma as any).promotion.create({
      data: {
        id: promoId,
        businessId: negocioId,
        titulo,
        descripcion: finalDescription,
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

    if (productoRequeridoId) {
      try {
        await (prisma as any).promotionToService.create({
          data: { A: promoId, B: productoRequeridoId }
        });
      } catch (_) {}
    }

    return NextResponse.json({
      success: true,
      message: 'Promoción creada exitosamente',
      promotion: {
        ...newPromo,
        descripcion,
        productoRequeridoId,
        categoriaRequeridaId,
        productosRelacionados,
        cuponCodigo,
        canales,
        montoMinimo,
        tipoCliente
      }
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

    const metaObj = {
      productoRequeridoId: updateFields.productoRequeridoId,
      categoriaRequeridaId: updateFields.categoriaRequeridaId,
      productosRelacionados: updateFields.productosRelacionados || [],
      cuponCodigo: updateFields.cuponCodigo,
      canales: updateFields.canales,
      montoMinimo: updateFields.montoMinimo,
      tipoCliente: updateFields.tipoCliente
    };

    let cleanDesc = updateFields.descripcion || '';
    if (cleanDesc.includes('<!-- CITIOX_META:')) {
      cleanDesc = cleanDesc.split('<!-- CITIOX_META:')[0].trim();
    }
    const finalDescription = `${cleanDesc}\n<!-- CITIOX_META: ${JSON.stringify(metaObj)} -->`;

    const updated = await (prisma as any).promotion.update({
      where: { id },
      data: {
        titulo: updateFields.titulo,
        descripcion: finalDescription,
        tipoPromo: updateFields.tipoPromo,
        precioPromo: parseFloat(updateFields.precioPromo) || 0,
        precioAnterior: updateFields.precioAnterior ? parseFloat(updateFields.precioAnterior) : null,
        imagenUrl: updateFields.imagenUrl || '',
        fechaInicio: updateFields.fechaInicio ? new Date(updateFields.fechaInicio) : undefined,
        fechaFin: updateFields.fechaFin ? new Date(updateFields.fechaFin) : undefined,
        diasValidos: Array.isArray(updateFields.diasValidos) ? updateFields.diasValidos.join(',') : updateFields.diasValidos,
        horaInicioValida: updateFields.horaInicioValida,
        horaFinValida: updateFields.horaFinValida,
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
