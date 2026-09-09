import { NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import { addonService } from '@/lib/services/addonService';

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getEffectiveAdminSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const businessId = (session.user as any).negocioId;
    if (!businessId) {
      return NextResponse.json({ error: 'Sin negocio asociado' }, { status: 400 });
    }

    const { id } = await params;
    const cancelled = await addonService.cancelAddonAtPeriodEnd(id, businessId);

    return NextResponse.json({
      success: true,
      message: 'Cancelación programada para el final del ciclo de facturación',
      subscriptionAddon: cancelled
    });
  } catch (error: any) {
    console.error('[API_ADMIN_ADDONS_CANCEL]', error);
    return NextResponse.json({ error: error?.message || 'Error al programar cancelación del add-on' }, { status: 400 });
  }
}
