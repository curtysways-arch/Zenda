import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AddonRegistry, SYSTEM_ADDONS } from '@/core/entitlements/AddonRegistry';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    if (userRole !== 'SUPERADMIN' && userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const addons = AddonRegistry.getAll();
    return NextResponse.json({ success: true, addons });
  } catch (error: any) {
    console.error('[API_SUPERADMIN_ADDONS_GET]', error);
    return NextResponse.json({ error: error?.message || 'Error al obtener add-ons' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    if (userRole !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Solo SuperAdmin puede administrar Add-ons' }, { status: 403 });
    }

    const body = await req.json();
    const { id, name, description, priceMonthly, type, targetKey, amount, stackable, maxQuantity } = body;

    if (!id || !name || !type || !targetKey) {
      return NextResponse.json({ error: 'Campos obligatorios requeridos (id, name, type, targetKey)' }, { status: 400 });
    }

    const newAddon = {
      id: id.toUpperCase().trim(),
      name,
      description: description || '',
      priceMonthly: parseFloat(priceMonthly || 0),
      type: type as 'CAPABILITY' | 'LIMIT',
      targetKey,
      amount: amount ? parseInt(amount, 10) : undefined,
      stackable: Boolean(stackable),
      maxQuantity: maxQuantity ? parseInt(maxQuantity, 10) : undefined,
      active: true
    };

    AddonRegistry.register(newAddon);
    return NextResponse.json({ success: true, addon: newAddon });
  } catch (error: any) {
    console.error('[API_SUPERADMIN_ADDONS_POST]', error);
    return NextResponse.json({ error: error?.message || 'Error al crear add-on' }, { status: 500 });
  }
}
