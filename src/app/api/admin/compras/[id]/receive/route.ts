import { NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import { PurchaseEngine } from '@/core/purchases/PurchaseEngine';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getEffectiveAdminSession();
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const businessId = (session.user as any).negocioId;
    const { id } = await params;

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body opcional (si no se envía body, recibe 100% de lo pendiente)
    }

    const { receivedItems, notes } = body;
    const receivedById = (session.user as any).id;
    const receivedByName = session.user.name || session.user.email || 'Admin';

    const updated = await PurchaseEngine.receivePurchase({
      purchaseId: id,
      businessId,
      receivedItems,
      receivedById,
      receivedByName,
      notes
    });

    return NextResponse.json({
      success: true,
      message: 'Recepción procesada exitosamente',
      purchase: updated
    });
  } catch (e: any) {
    console.error('[API_COMPRAS_RECEIVE_POST]', e);
    return NextResponse.json({ error: e?.message || 'Error al recibir compra' }, { status: 400 });
  }
}
