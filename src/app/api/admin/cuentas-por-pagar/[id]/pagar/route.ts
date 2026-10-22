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
    const body = await req.json();
    const { amount, paymentMethod, reference, notes, paymentDate } = body;

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ error: 'El monto a pagar debe ser mayor a 0' }, { status: 400 });
    }

    const registeredById = (session.user as any).id;
    const registeredByName = session.user.name || session.user.email || 'Admin';

    const result = await PurchaseEngine.registerPayment({
      payableId: id,
      businessId,
      amount: Number(amount),
      paymentMethod,
      reference,
      notes,
      paymentDate,
      registeredById,
      registeredByName
    });

    return NextResponse.json({
      success: true,
      message: 'Pago registrado exitosamente',
      payment: result.payment,
      payable: result.payable
    });
  } catch (e: any) {
    console.error('[API_CUENTAS_POR_PAGAR_PAGO_POST]', e);
    return NextResponse.json({ error: e?.message || 'Error al registrar pago' }, { status: 400 });
  }
}
