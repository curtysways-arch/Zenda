import { NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import prisma from '@/lib/prisma';
import { InventoryTransferEngine } from '@/core/inventory/InventoryTransferEngine';

export async function GET(req: Request) {
  try {
    const session = await getEffectiveAdminSession();
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const businessId = (session.user as any).negocioId;
    if (!businessId) return NextResponse.json({ error: 'Negocio no especificado' }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const sourceBranchId = searchParams.get('sourceBranchId');
    const targetBranchId = searchParams.get('targetBranchId');

    const whereClause: any = { businessId };
    if (status) whereClause.status = status;
    if (sourceBranchId) whereClause.sourceBranchId = sourceBranchId;
    if (targetBranchId) whereClause.targetBranchId = targetBranchId;

    const transfers = await (prisma as any).inventoryTransfer.findMany({
      where: whereClause,
      include: {
        source: true,
        target: true,
        items: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, transfers });
  } catch (e: any) {
    console.error('[API_TRANSFERENCIAS_GET]', e);
    return NextResponse.json({ error: e?.message || 'Error al obtener transferencias' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getEffectiveAdminSession();
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const businessId = (session.user as any).negocioId;
    const body = await req.json();
    const {
      sourceBranchId,
      sourceWarehouseId,
      targetBranchId,
      targetWarehouseId,
      items,
      notes,
      idempotencyKey
    } = body;

    const transfer = await InventoryTransferEngine.createTransfer({
      businessId,
      sourceBranchId,
      sourceWarehouseId,
      targetBranchId,
      targetWarehouseId,
      items,
      notes,
      idempotencyKey,
      createdById: (session.user as any).id,
      createdByName: session.user.name || session.user.email
    });

    return NextResponse.json({ success: true, transfer });
  } catch (e: any) {
    console.error('[API_TRANSFERENCIAS_POST]', e);
    return NextResponse.json({ error: e?.message || 'Error al crear transferencia' }, { status: 400 });
  }
}
