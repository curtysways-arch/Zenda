import { NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import { addonService } from '@/lib/services/addonService';
import { planService } from '@/lib/services/planService';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getEffectiveAdminSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get('businessId') || (session.user as any).negocioId;

    if (!businessId) {
      return NextResponse.json({ error: 'Sin negocio asociado' }, { status: 400 });
    }

    const availabilityList = await addonService.getAddonsForBusiness(businessId);
    const availableAddons = (availabilityList || []).map((item) => ({
      ...(item.addon || {}),
      available: Boolean(item.available),
      ineligibilityReason: item.ineligibilityReason || undefined,
      isPurchased: Boolean(item.isPurchased),
      isPendingPayment: Boolean(item.isPendingPayment),
      activeContract: item.activeContract || undefined,
      addon: item.addon // compatibilidad si la UI consulta item.addon
    }));

    // Obtener detalles financieros consolidados y contratos de add-ons
    const subscription = await prisma.suscripcion.findUnique({
      where: { negocioId: businessId },
      include: {
        Plan: true,
        subscriptionAddons: {
          include: { addon: true }
        }
      }
    });

    const now = new Date();
    const isExpired = !subscription || (subscription.fechaFin && new Date(subscription.fechaFin) < now) || ['expired', 'vencida', 'suspendida', 'cancelada'].includes((subscription.estado || '').toLowerCase());
    const isFreePlan = Boolean(subscription?.Plan?.isFree || subscription?.Plan?.price === 0);
    const hasActivePaidPlan = !isExpired && !isFreePlan;

    // Obtener planes comerciales disponibles si necesita contratar plan
    let availablePlans: any[] = [];
    if (!hasActivePaidPlan) {
      const familyId = subscription?.Plan?.familyId;
      availablePlans = await prisma.plan.findMany({
        where: {
          activo: true,
          isFree: false,
          ...(familyId ? { familyId } : {})
        },
        orderBy: { price: 'asc' }
      });
      if (availablePlans.length === 0) {
        availablePlans = await prisma.plan.findMany({
          where: { activo: true, isFree: false },
          orderBy: { price: 'asc' }
        });
      }
    }

    const activeSubscriptions = subscription?.subscriptionAddons || [];
    const pricingDetails = null;

    return NextResponse.json({
      success: true,
      availableAddons,
      activeSubscriptions,
      pricingDetails,
      hasActivePaidPlan,
      availablePlans: availablePlans.map(p => ({
        id: p.id,
        name: p.name,
        price: Number(p.price),
        slug: p.slug
      }))
    });
  } catch (error: any) {
    console.error('[API_ADMIN_ADDONS_GET]', error);
    return NextResponse.json({ error: error?.message || 'Error al obtener add-ons' }, { status: 500 });
  }
}
