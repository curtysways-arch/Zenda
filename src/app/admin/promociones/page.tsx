import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import PromotionDashboard from '@/components/admin/promotions/PromotionDashboard';
import PromotionClient from './PromotionClient';
import { getPromotions } from '@/app/actions/promotionActions';

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

  // Detección estricta de negocios de servicios (Spa, Estética, Peluquería, Barbería)
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

  // Si NO es un negocio de servicios (es decir, es Restaurante, Parrilla, Gastronomía, Tienda), usa PromotionDashboard
  const isRestaurantOrStore = !isServiceBiz;

  // 1. VISTA DE RESTAURANTES Y GASTRONOMÍA (Combos, Platillos, Cupones, Promociones de Delivery)
  if (isRestaurantOrStore) {
    const [rawPromotions, products, categories, orders] = await Promise.all([
      (prisma as any).promotion.findMany({
        where: { businessId: negocioId },
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

    const activeCount = rawPromotions.filter((p: any) => p.status === 'ACTIVE' || p.status === 'activa').length;
    const avgTicketPromo = totalOrdersWithPromo > 0 ? totalSalesWithPromo / totalOrdersWithPromo : 0;

    const formattedPromotions = rawPromotions.map((p: any) => {
      const st = promoStatsMap[p.id] || { ordersCount: 0, salesTotal: 0, discountTotal: 0 };
      return {
        ...p,
        stats: {
          ordersCount: st.ordersCount,
          salesTotal: st.salesTotal,
          discountTotal: st.discountTotal
        }
      };
    });

    return (
      <PromotionDashboard
        initialPromotions={formattedPromotions}
        products={products}
        categories={categories}
        initialMetrics={{
          totalSalesWithPromo,
          totalOrdersWithPromo,
          totalDiscountsGiven,
          avgTicketPromo,
          activeCount
        }}
        negocio={rawNegocio}
      />
    );
  }

  // 2. VISTA EXCLUSIVA DE SERVICIOS / SPAS / BEAUTY (Intacta para su vertical)
  const promotionsData = await getPromotions();

  const formattedPromotionsForService = promotionsData.map((promo: any) => ({
    id: promo.id,
    // Propiedades canónicas en español (para MobilePromotions y PromotionForm)
    titulo: promo.titulo || promo.title || '',
    descripcion: promo.descripcion || promo.description || '',
    imagenUrl: promo.imagenUrl || promo.imageUrl || undefined,
    estado: promo.estaActivo ? 'activa' : 'inactiva',
    precioPromo: promo.precioPromo || promo.promoPrice || undefined,
    precioAnterior: promo.Servicio?.precio ? Number(promo.Servicio.precio) : undefined,
    tipoPromo: promo.tipoDescuento === 'PORCENTAJE' ? `${promo.valorDescuento}% OFF` : `$${promo.valorDescuento} OFF`,
    shareCount: promo._count?.Reserva || 0,
    // Propiedades en inglés (compatibilidad con vistas de escritorio)
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

  return (
    <PromotionClient
      initialPromotions={formattedPromotionsForService}
      negocio={rawNegocio}
    />
  );
}
