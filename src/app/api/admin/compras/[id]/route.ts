import { NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import prisma from '@/lib/prisma';
import { PurchaseEngine } from '@/core/purchases/PurchaseEngine';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getEffectiveAdminSession();
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const businessId = (session.user as any).negocioId;
    const { id } = await params;

    const purchase = await (prisma as any).purchaseOrder.findFirst({
      where: { id, businessId },
      include: {
        supplier: true,
        branch: true,
        items: true,
        accountPayable: {
          include: { payments: true }
        }
      }
    });

    if (!purchase) return NextResponse.json({ error: 'Orden de compra no encontrada' }, { status: 404 });
    return NextResponse.json({ success: true, purchase });
  } catch (e: any) {
    console.error('[API_COMPRAS_DETAIL_GET]', e);
    return NextResponse.json({ error: e?.message || 'Error al obtener orden de compra' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getEffectiveAdminSession();
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const businessId = (session.user as any).negocioId;
    const { id } = await params;
    const body = await req.json();
    const { action } = body; // "APPROVE" | "CANCEL"

    const userId = (session.user as any).id;
    const userName = session.user.name || session.user.email || 'Admin';

    if (action === 'APPROVE') {
      const updated = await PurchaseEngine.approvePurchaseOrder(id, businessId, userId, userName);
      return NextResponse.json({ success: true, message: 'Orden de compra aprobada', purchase: updated });
    } else if (action === 'CANCEL') {
      const updated = await PurchaseEngine.cancelPurchaseOrder(id, businessId, userId, userName);
      return NextResponse.json({ success: true, message: 'Orden de compra cancelada', purchase: updated });
    } else {
      return NextResponse.json({ error: 'Acción no reconocida (debe ser APPROVE o CANCEL)' }, { status: 400 });
    }
  } catch (e: any) {
    console.error('[API_COMPRAS_PATCH]', e);
    return NextResponse.json({ error: e?.message || 'Error al procesar acción sobre la compra' }, { status: 400 });
  }
}
