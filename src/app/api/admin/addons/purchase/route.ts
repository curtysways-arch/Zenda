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
    const { addonCodeOrId, quantity, metodoPago, referencia, comprobanteUrl } = body;

    if (!addonCodeOrId) {
      return NextResponse.json({ error: 'Se requiere addonCodeOrId' }, { status: 400 });
    }

    const result = await addonService.purchaseAddon({
      businessId,
      addonCodeOrId,
      requestedQuantity: quantity ? parseInt(quantity, 10) : 1,
      metodoPago: metodoPago || 'TRANSFERENCIA',
      referencia,
      comprobanteUrl,
      performedBy: (session.user as any).role || 'ADMIN'
    });

    return NextResponse.json({
      success: true,
      message: 'Solicitud de Add-on registrada exitosamente. Tu módulo se activará una vez verificado el pago.',
      subscriptionAddon: result.subscriptionAddon,
      payment: result.payment,
      proration: result.proration
    });
  } catch (error: any) {
    console.error('[API_ADMIN_ADDONS_PURCHASE]', error);
    return NextResponse.json({ error: error?.message || 'Error al procesar solicitud de add-on' }, { status: 400 });
  }
}
