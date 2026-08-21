import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import PromotionDashboard from '@/components/admin/promotions/PromotionDashboard';
import PromotionClient from './PromotionClient';
import { getPromotions } from '@/app/actions/promotionActions';

export const dynamic = 'force-dynamic';

export default async function PromocionesPage() {
  const session = await getServerSession(authOptions);

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
  const isRestaurant = tipoUpper === 'RESTAURANTE' || tipoUpper === 'GASTRONOMIA';

  // 1. VISTA DE RESTAURANTES (Módulo exclusivo gastronómico)
  if (isRestaurant) {
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

    const enrichedPromotions = rawPromotions.map((p: any) => {
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

    const initialMetrics = {
      totalSalesWithPromo,
      totalOrdersWithPromo,
      totalDiscountsGiven,
      avgTicketPromo,
      activeCount
    };

    return (
      <div className="p-4 sm:p-6 bg-slate-50 min-h-screen">
        <PromotionDashboard
          initialPromotions={enrichedPromotions}
          products={products}
          categories={categories}
          initialMetrics={initialMetrics}
          negocio={rawNegocio}
        />
      </div>
    );
  }

  // 2. VISTA ORIGINAL PARA SERVICIOS (SPA, Lavandería, Zapatería, Peluquería, Canchas, etc.)
  const negocioServices = {
    ...rawNegocio,
    services: rawNegocio.Service || []
  };

  const isPromotionsEnabled = !!(rawNegocio.isDemo || rawNegocio.Suscripcion?.Plan?.automatic_discounts_enabled);
  const promociones = await getPromotions();

  return (
    <PromotionClient
      initialPromotions={promociones}
      negocio={negocioServices}
      isPromotionsEnabled={isPromotionsEnabled}
    />
  );
}
