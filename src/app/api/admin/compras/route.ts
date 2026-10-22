import { NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import prisma from '@/lib/prisma';
import { PurchaseEngine } from '@/core/purchases/PurchaseEngine';

export async function GET(req: Request) {
  try {
    const session = await getEffectiveAdminSession();
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const businessId = (session.user as any).negocioId;
    if (!businessId) return NextResponse.json({ error: 'Negocio no especificado' }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');
    const supplierId = searchParams.get('supplierId');
    const status = searchParams.get('status');

    const where: any = { businessId };
    if (branchId && branchId !== 'ALL') where.branchId = branchId;
    if (supplierId) where.supplierId = supplierId;
    if (status && status !== 'ALL') where.status = status;

    const purchases = await (prisma as any).purchaseOrder.findMany({
      where,
      include: {
        supplier: true,
        branch: true,
        items: true,
        accountPayable: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, purchases });
  } catch (e: any) {
    console.error('[API_COMPRAS_GET]', e);
    return NextResponse.json({ error: e?.message || 'Error al obtener compras' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getEffectiveAdminSession();
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const businessId = (session.user as any).negocioId;
    const body = await req.json();
    const {
      supplierId,
      branchId,
      warehouseId,
      orderNumber,
      invoiceNumber,
      expectedDate,
      currency,
      discount,
      shippingCost,
      otherCosts,
      paymentMethod,
      items,
      autoReceive = false,
      requireApproval = false,
      notes
    } = body;

    if (!supplierId || !items || items.length === 0) {
      return NextResponse.json({ error: 'Proveedor e items requeridos' }, { status: 400 });
    }

    const purchase = await PurchaseEngine.createPurchaseOrder({
      businessId,
      branchId: branchId || undefined,
      warehouseId: warehouseId || undefined,
      supplierId,
      orderNumber: orderNumber || undefined,
      invoiceNumber: invoiceNumber || undefined,
      expectedDate: expectedDate || undefined,
      currency: currency || 'USD',
      discount: discount !== undefined ? Number(discount) : 0,
      shippingCost: shippingCost !== undefined ? Number(shippingCost) : 0,
      otherCosts: otherCosts !== undefined ? Number(otherCosts) : 0,
      paymentMethod: paymentMethod || undefined,
      notes,
      requireApproval: Boolean(requireApproval),
      createdById: (session.user as any).id,
      createdByName: session.user.name || session.user.email,
      items
    }, autoReceive);

    return NextResponse.json({ success: true, purchase });
  } catch (e: any) {
    console.error('[API_COMPRAS_POST]', e);
    return NextResponse.json({ error: e?.message || 'Error al registrar compra' }, { status: 400 });
  }
}
