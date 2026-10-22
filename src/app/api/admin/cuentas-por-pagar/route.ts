import { NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import prisma from '@/lib/prisma';

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

    const payables = await (prisma as any).accountPayable.findMany({
      where,
      include: {
        supplier: true,
        branch: true,
        purchase: {
          select: {
            id: true,
            orderNumber: true,
            invoiceNumber: true,
            status: true,
            total: true
          }
        },
        payments: {
          orderBy: { paymentDate: 'desc' }
        }
      },
      orderBy: { dueDate: 'asc' }
    });

    return NextResponse.json({ success: true, payables });
  } catch (e: any) {
    console.error('[API_CUENTAS_POR_PAGAR_GET]', e);
    return NextResponse.json({ error: e?.message || 'Error al obtener cuentas por pagar' }, { status: 500 });
  }
}
