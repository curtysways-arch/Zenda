import { NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import prisma from '@/lib/prisma';
import { ProductionEngine } from '@/core/production/ProductionEngine';

export async function GET(req: Request) {
  try {
    const session = await getEffectiveAdminSession();
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const businessId = (session.user as any).negocioId;
    if (!businessId) return NextResponse.json({ error: 'Negocio no especificado' }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');

    const whereClause: any = { businessId };
    if (branchId) {
      whereClause.branchId = branchId;
    }

    const orders = await (prisma as any).productionOrder.findMany({
      where: whereClause,
      include: {
        recipe: { include: { producto: true } },
        items: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, orders });
  } catch (e: any) {
    console.error('[API_PRODUCCION_GET]', e);
    return NextResponse.json({ error: e?.message || 'Error al obtener órdenes de producción' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getEffectiveAdminSession();
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const businessId = (session.user as any).negocioId;
    const body = await req.json();
    const { recipeId, targetQuantity, branchId, sourceWarehouseId, targetWarehouseId, notes } = body;

    if (!recipeId || !targetQuantity) {
      return NextResponse.json({ error: 'Receta y cantidad requeridas' }, { status: 400 });
    }

    if (!branchId || !sourceWarehouseId || !targetWarehouseId) {
      return NextResponse.json({
        error: 'Las órdenes de producción requieren sucursal (branchId), bodega origen (sourceWarehouseId) y bodega destino (targetWarehouseId).'
      }, { status: 400 });
    }

    const order = await ProductionEngine.createOrder({
      businessId,
      branchId,
      sourceWarehouseId,
      targetWarehouseId,
      recipeId,
      targetQuantity: Number(targetQuantity),
      operatorId: (session.user as any).id,
      operatorName: session.user.name || session.user.email,
      notes
    });

    return NextResponse.json({ success: true, order });
  } catch (e: any) {
    console.error('[API_PRODUCCION_POST]', e);
    return NextResponse.json({ error: e?.message || 'Error al crear orden de producción' }, { status: 400 });
  }
}
