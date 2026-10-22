import { NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import prisma from '@/lib/prisma';
import { ElectronicBillingService } from '@/core/billing/ElectronicBillingService';

export async function GET() {
  try {
    const session = await getEffectiveAdminSession();
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const businessId = (session.user as any).negocioId;
    if (!businessId) return NextResponse.json({ error: 'Negocio no especificado' }, { status: 400 });

    const [invoices, config] = await Promise.all([
      (prisma as any).electronicInvoice.findMany({
        where: { businessId },
        orderBy: { fechaEmision: 'desc' },
        take: 100
      }),
      (prisma as any).taxConfiguration.findUnique({
        where: { businessId }
      })
    ]);

    return NextResponse.json({ success: true, invoices, config });
  } catch (e: any) {
    console.error('[API_FACTURACION_GET]', e);
    return NextResponse.json({ error: e?.message || 'Error al obtener facturas electrónicas' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getEffectiveAdminSession();
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const businessId = (session.user as any).negocioId;
    const body = await req.json();
    const { cliente, items, formaPago, propina } = body;

    if (!cliente || !items || items.length === 0) {
      return NextResponse.json({ error: 'Datos de cliente e items requeridos' }, { status: 400 });
    }

    const invoice = await ElectronicBillingService.issueInvoice({
      businessId,
      cliente,
      items,
      formaPago,
      propina
    });

    return NextResponse.json({ success: true, invoice });
  } catch (e: any) {
    console.error('[API_FACTURACION_POST]', e);
    return NextResponse.json({ error: e?.message || 'Error al emitir factura electrónica' }, { status: 400 });
  }
}
