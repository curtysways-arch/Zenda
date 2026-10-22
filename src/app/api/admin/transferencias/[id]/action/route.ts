import { NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import { InventoryTransferEngine } from '@/core/inventory/InventoryTransferEngine';

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
    const { action, receivedItems, idempotencyKey } = body;

    const operatorName = session.user.name || session.user.email || 'Operador';
    const operatorId = (session.user as any).id;

    if (action === 'CANCEL') {
      const cancelled = await InventoryTransferEngine.cancelDraftTransfer(id, businessId);
      return NextResponse.json({
        success: true,
        message: 'Transferencia cancelada',
        transfer: cancelled
      });
    }

    if (action === 'DISPATCH') {
      const dispatched = await InventoryTransferEngine.dispatchTransfer({
        transferId: id,
        businessId,
        dispatchedById: operatorId,
        dispatchedByName: operatorName,
        idempotencyKey
      });
      return NextResponse.json({
        success: true,
        message: 'Transferencia despachada a custodia en tránsito',
        transfer: dispatched
      });
    }

    if (action === 'RECEIVE') {
      if (!receivedItems || !Array.isArray(receivedItems) || receivedItems.length === 0) {
        return NextResponse.json({ error: 'Debe especificar los artículos recibidos' }, { status: 400 });
      }

      const received = await InventoryTransferEngine.receiveTransfer({
        transferId: id,
        businessId,
        receivedItems,
        receivedById: operatorId,
        receivedByName: operatorName,
        idempotencyKey
      });
      return NextResponse.json({
        success: true,
        message: 'Recepción procesada exitosamente',
        transfer: received
      });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (e: any) {
    console.error('[API_TRANSFERENCIAS_ACTION_POST]', e);
    return NextResponse.json({ error: e?.message || 'Error al procesar acción de transferencia' }, { status: 400 });
  }
}
