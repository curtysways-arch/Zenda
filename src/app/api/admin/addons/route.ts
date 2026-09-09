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

    const activeSubscriptions = subscription?.subscriptionAddons || [];

    let pricingDetails = null;
    if (subscription) {
      pricingDetails = await planService.getPricingDetails(subscription.id);
    }

    return NextResponse.json({
      success: true,
      availableAddons,
      activeSubscriptions,
      pricingDetails
    });
  } catch (error: any) {
    console.error('[API_ADMIN_ADDONS_GET]', error);
    return NextResponse.json({ error: error?.message || 'Error al obtener add-ons' }, { status: 500 });
  }
}
