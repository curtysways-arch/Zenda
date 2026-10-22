import { NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import { ProductionEngine } from '@/core/production/ProductionEngine';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getEffectiveAdminSession();
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const businessId = (session.user as any).negocioId;
    const { id } = await params;
    const body = await req.json();
    const { action, actualQuantity, wasteQuantity, reason } = body;

    const operatorName = session.user.name || session.user.email || 'Operador';

    if (action === 'START') {
      const order = await ProductionEngine.startOrder(id, businessId, operatorName);
      return NextResponse.json({ success: true, message: 'Orden iniciada', order });
    }

    if (action === 'COMPLETE') {
      if (!actualQuantity || Number(actualQuantity) <= 0) {
        return NextResponse.json({ error: 'Ingresa la cantidad real producida' }, { status: 400 });
      }

      const completed = await ProductionEngine.completeOrder({
        productionOrderId: id,
        businessId,
        actualQuantity: Number(actualQuantity),
        wasteQuantity: Number(wasteQuantity) || 0,
        completedBy: operatorName
      });

      return NextResponse.json({
        success: true,
        message: 'Producción completada, insumos consumidos y producto terminado ingresado al stock',
        order: completed
      });
    }

    if (action === 'REVERSE') {
      if (!reason || String(reason).trim() === '') {
        return NextResponse.json({ error: 'El motivo de reversión es obligatorio' }, { status: 400 });
      }

      const reversed = await ProductionEngine.reverseOrder({
        productionOrderId: id,
        businessId,
        reason: String(reason),
        reversedBy: operatorName
      });

      return NextResponse.json({
        success: true,
        message: 'Orden de producción revertida con éxito',
        result: reversed
      });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (e: any) {
    console.error('[API_PRODUCCION_ACTION_POST]', e);
    return NextResponse.json({ error: e?.message || 'Error al procesar acción de producción' }, { status: 400 });
  }
}
