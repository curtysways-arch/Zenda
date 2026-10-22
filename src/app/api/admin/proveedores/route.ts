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
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const where: any = { businessId };
    if (!includeInactive) {
      where.active = true;
    }

    const suppliers = await (prisma as any).supplier.findMany({
      where,
      include: {
        orders: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        },
        accountsPayable: {
          where: { status: { in: ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'] } }
        }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({ success: true, suppliers });
  } catch (e: any) {
    console.error('[API_PROVEEDORES_GET]', e);
    return NextResponse.json({ error: e?.message || 'Error al obtener proveedores' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getEffectiveAdminSession();
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const businessId = (session.user as any).negocioId;
    const body = await req.json();
    const {
      taxId,
      taxIdType,
      name,
      commercialName,
      contactPerson,
      email,
      phone,
      address,
      notes,
      paymentTerms,
      creditDays
    } = body;

    if (!taxId?.trim() || !name?.trim()) {
      return NextResponse.json({ error: 'Identificación y Razón Social son obligatorios' }, { status: 400 });
    }

    const supplier = await PurchaseEngine.upsertSupplier({
      businessId,
      taxId: taxId.trim(),
      taxIdType: taxIdType || 'RUC',
      name: name.trim(),
      commercialName,
      contactPerson,
      email,
      phone,
      address,
      notes,
      paymentTerms: paymentTerms || 'CONTADO',
      creditDays: creditDays !== undefined ? Number(creditDays) : 0
    });

    return NextResponse.json({ success: true, supplier });
  } catch (e: any) {
    console.error('[API_PROVEEDORES_POST]', e);
    return NextResponse.json({ error: e?.message || 'Error al guardar proveedor' }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getEffectiveAdminSession();
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const businessId = (session.user as any).negocioId;
    const body = await req.json();
    const { id, active } = body;

    if (!id || active === undefined) {
      return NextResponse.json({ error: 'ID de proveedor y estado active requeridos' }, { status: 400 });
    }

    const updated = await PurchaseEngine.toggleSupplierStatus(id, businessId, Boolean(active));
    return NextResponse.json({ success: true, supplier: updated });
  } catch (e: any) {
    console.error('[API_PROVEEDORES_PATCH]', e);
    return NextResponse.json({ error: e?.message || 'Error al actualizar proveedor' }, { status: 400 });
  }
}
