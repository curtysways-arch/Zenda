import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import PromotionDashboard from '@/components/admin/promotions/PromotionDashboard';
import PromotionClient from './PromotionClient';
import { getPromotions } from '@/app/actions/promotionActions';
import PromocionesHybridView from '@/components/admin/promotions/PromocionesHybridView';
import { EntitlementsService } from '@/core/entitlements/EntitlementsService';

export const dynamic = 'force-dynamic';

export default async function PromocionesPage() {
  const session = await getEffectiveAdminSession();

  if (!session?.user) {
    redirect('/login');
  }

  const negocioId = (session.user as any).negocioId;

  if (!negocioId) {
    redirect('/login');
  }

  const rawNegocio = await (prisma as any).negocio.findUnique({
    where: { id: negocioId },
    select: {
      id: true,
      slug: true,
      nombre: true,
      tipoNegocio: true,
      isDemo: true,
      horarioApertura: true,
      horarioCierre: true,
      configuracion: true,
      Service: { where: { estaActivo: true }, select: { id: true, nombre: true, precio: true } },
      Suscripcion: {
        select: {
          estado: true,
          Plan: {
            select: {
              automatic_discounts_enabled: true
            }
          }
        }
      }
    }
  });

  if (!rawNegocio) {
    redirect('/login');
  }

  const tipoUpper = (rawNegocio.tipoNegocio || '').toUpperCase();
  const nameUpper = (rawNegocio.nombre || '').toUpperCase();
  const slugUpper = (rawNegocio.slug || '').toUpperCase();

  // Detección de vertical de servicios (Spa, Estética, Peluquería, Barbería)
  const isServiceBiz = 
    tipoUpper === 'SPA' || 
    tipoUpper === 'BEAUTY_SPA' || 
    tipoUpper === 'PELUQUERIA' || 
    tipoUpper === 'BARBERIA' || 
    tipoUpper === 'CENTRO_ESTETICA' ||
    tipoUpper === 'ORDENES-SERVICIO' ||
    tipoUpper === 'LAVANDERIA' ||
    tipoUpper === 'SHOE_CARE' ||
    slugUpper.includes('SPA') ||
    slugUpper.includes('BARBER') ||
    nameUpper.includes('SPA') ||
    nameUpper.includes('ESTETICA') ||
    nameUpper.includes('PELUQUERIA') ||
    nameUpper.includes('BARBERIA');

  // Evaluar capabilities y productos existentes
  const [servicesCount, productsCount, entitlements] = await Promise.all([
    (prisma as any).service.count({ where: { negocioId, estaActivo: true } }),
    (prisma as any).producto.count({ where: { negocioId } }),
    EntitlementsService.resolve(negocioId)
  ]);

  const hasProductCapability = Boolean(
    entitlements.capabilities['PRODUCTS'] ||
    entitlements.capabilities['products'] ||
    entitlements.capabilities['COMMERCE'] ||
    entitlements.capabilities['commerce'] ||
    entitlements.capabilities['PRODUCT_SALES'] ||
    entitlements.capabilities['product_sales'] ||
    entitlements.capabilities['RESTAURANT']
  );

  const hasProducts = productsCount > 0 || hasProductCapability;
  const hasServices = isServiceBiz || servicesCount > 0;
  const isHybrid = hasServices && hasProducts;

  // ── PREPARAR DATOS DE PRODUCTOS (Si aplica) ──────────────────────────────────
  let formattedProductPromotions: any[] = [];
  let products: any[] = [];
  let categories: any[] = [];
  let productMetrics = {
    totalSalesWithPromo: 0,
    totalOrdersWithPromo: 0,
    totalDiscountsGiven: 0,
    avgTicketPromo: 0,
    activeCount: 0
  };

  if (hasProducts) {
    const [rawPromotions, prods, cats, orders] = await Promise.all([
      (prisma as any).promotion.findMany({
        where: { businessId: negocioId },
        include: { PromotionToService: true },
        orderBy: { createdAt: 'desc' }
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
        select: {
          id: true,
          total: true,
          subtotal: true,
          extraInfo: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 200
      })
    ]);

    products = prods;
    categories = cats;

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
        totalOrdersWithPromo += 1;
        totalSalesWithPromo += Number(o.total) || 0;
        totalDiscountsGiven += discount;

        if (pId) {
          if (!promoStatsMap[pId]) {
            promoStatsMap[pId] = { ordersCount: 0, salesTotal: 0, discountTotal: 0 };
          }
          promoStatsMap[pId].ordersCount += 1;
          promoStatsMap[pId].salesTotal += Number(o.total) || 0;
          promoStatsMap[pId].discountTotal += discount;
        }
      }
    });

    formattedProductPromotions = rawPromotions.map((p: any) => {
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
      const st = promoStatsMap[p.id] || { ordersCount: 0, salesTotal: 0, discountTotal: 0 };
      const productoRequeridoId = meta.productoRequeridoId || meta.servicioRequeridoId || (p.PromotionToService && p.PromotionToService[0]?.B) || null;
      const linkedProduct = productoRequeridoId ? productsMap.get(productoRequeridoId) : null;
      const finalImagenUrl = p.imagenUrl && p.imagenUrl.trim() !== '' ? p.imagenUrl : (linkedProduct?.imagenUrl || '');

      return {
        ...p,
        descripcion: cleanDesc,
        imagenUrl: finalImagenUrl,
        goalPreset: meta.goalPreset || 'CUSTOM',
        alcance: meta.alcance || 'PEDIDO_COMPLETO',
        productoRequeridoId,
        categoriaRequeridaId: meta.categoriaRequeridaId || null,
        cuponCodigo: meta.cuponCodigo || null,
        tipoPromo: meta.tipoPromo || p.tipoPromo || 'PORCENTAJE',
        stats: {
          ordersCount: st.ordersCount,
          salesTotal: st.salesTotal,
          discountTotal: st.discountTotal
        }
      };
    });

    const activeCount = rawPromotions.filter((p: any) => p.status === 'ACTIVE' || p.status === 'activa').length;
    const avgTicketPromo = totalOrdersWithPromo > 0 ? totalSalesWithPromo / totalOrdersWithPromo : 0;

    productMetrics = {
      totalSalesWithPromo,
      totalOrdersWithPromo,
      totalDiscountsGiven,
      avgTicketPromo,
      activeCount
    };
  }

  // ── PREPARAR DATOS DE SERVICIOS (Si aplica) ──────────────────────────────────
  let formattedServicePromotions: any[] = [];
  if (hasServices) {
    const promotionsData = await getPromotions();

    formattedServicePromotions = promotionsData.map((promo: any) => ({
      id: promo.id,
      titulo: promo.titulo || promo.title || '',
      descripcion: promo.descripcion || promo.description || '',
      imagenUrl: promo.imagenUrl || promo.imageUrl || undefined,
      estado: promo.estaActivo ? 'activa' : 'inactiva',
      precioPromo: promo.precioPromo || promo.promoPrice || undefined,
      precioAnterior: promo.Servicio?.precio ? Number(promo.Servicio.precio) : undefined,
      tipoPromo: promo.tipoDescuento === 'PORCENTAJE' ? `${promo.valorDescuento}% OFF` : `$${promo.valorDescuento} OFF`,
      shareCount: promo._count?.Reserva || 0,
      title: promo.titulo || promo.title || '',
      description: promo.descripcion || promo.description || '',
      serviceId: promo.servicioId,
      serviceName: promo.Servicio?.nombre || 'Servicio General',
      discountType: promo.tipoDescuento === 'PORCENTAJE' ? ('PERCENTAGE' as const) : ('FIXED' as const),
      discountValue: promo.valorDescuento,
      promoPrice: promo.precioPromo || promo.promoPrice || undefined,
      startDate: promo.fechaInicio ? (typeof promo.fechaInicio === 'string' ? promo.fechaInicio : promo.fechaInicio.toISOString()) : undefined,
      endDate: promo.fechaFin ? (typeof promo.fechaFin === 'string' ? promo.fechaFin : promo.fechaFin.toISOString()) : undefined,
      isActive: Boolean(promo.estaActivo),
      usageCount: promo._count?.Reserva || 0,
      imageUrl: promo.imagenUrl || promo.imageUrl || undefined
    }));
  }

  // ── RENDERIZADO SEGÚN LA CAPACIDAD DEL NEGOCIO ────────────────────────────────

  // 1. Negocio Híbrido (Servicios + Productos, ej. Aura Spa con Venta de Productos activa)
  if (isHybrid) {
    return (
      <PromocionesHybridView
        initialServicePromotions={formattedServicePromotions}
        initialProductPromotions={formattedProductPromotions}
        products={products}
        categories={categories}
        initialMetrics={productMetrics}
        negocio={rawNegocio}
        defaultTab="SERVICIOS"
      />
    );
  }

  // 2. Negocio Exclusivo de Servicios (Spa o Peluquería tradicional sin productos)
  if (hasServices) {
    return (
      <PromotionClient
        initialPromotions={formattedServicePromotions}
        negocio={rawNegocio}
      />
    );
  }

  // 3. Negocio Exclusivo de Productos (Restaurante o Tienda tradicional)
  return (
    <PromotionDashboard
      initialPromotions={formattedProductPromotions}
      products={products}
      categories={categories}
      initialMetrics={productMetrics}
      negocio={rawNegocio}
    />
  );
}
