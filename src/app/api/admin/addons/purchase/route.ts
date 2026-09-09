import { NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import { addonService } from '@/lib/services/addonService';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const session = await getEffectiveAdminSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const businessId = (session.user as any).negocioId;
    if (!businessId) {
      return NextResponse.json({ error: 'Sin negocio asociado' }, { status: 400 });
    }

    const body = await req.json();
    const { addonCodeOrId, quantity } = body;

    if (!addonCodeOrId) {
      return NextResponse.json({ error: 'Se requiere addonCodeOrId' }, { status: 400 });
    }

    const subscriptionAddon = await addonService.purchaseAddon(
      businessId,
      addonCodeOrId,
      quantity ? parseInt(quantity, 10) : 1
    );

    return NextResponse.json({
      success: true,
      message: 'Add-on contratado exitosamente',
      subscriptionAddon
    });
  } catch (error: any) {
    console.error('[API_ADMIN_ADDONS_PURCHASE]', error);
    return NextResponse.json({ error: error?.message || 'Error al contratar add-on' }, { status: 400 });
  }
}
