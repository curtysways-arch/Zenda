import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { AddonRegistry } from '@/core/entitlements/AddonRegistry';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    if (userRole !== 'SUPERADMIN' && userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const addons = await prisma.addon.findMany({
      orderBy: [
        { active: 'desc' },
        { type: 'asc' },
        { name: 'asc' }
      ]
    });

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
      return NextResponse.json({ error: 'Solo SuperAdmin puede crear Add-ons' }, { status: 403 });
    }

    const body = await req.json();
    const { code, name, description, priceMonthly, type, targetKey, amount, stackable, maxQuantity } = body;

    const cleanCode = (code || body.id || '').toUpperCase().trim();

    if (!cleanCode || !name || !type || !targetKey) {
      return NextResponse.json({ error: 'Campos obligatorios requeridos: code, name, type, targetKey' }, { status: 400 });
    }

    const existing = await prisma.addon.findUnique({
      where: { code: cleanCode }
    });

    if (existing) {
      return NextResponse.json({ error: `Ya existe un Add-on con el código ${cleanCode}` }, { status: 409 });
    }

    const newAddon = await prisma.addon.create({
      data: {
        code: cleanCode,
        name: name.trim(),
        description: description ? description.trim() : null,
        priceMonthly: parseFloat(priceMonthly || 0),
        type: type as 'CAPABILITY' | 'LIMIT',
        targetKey: targetKey.trim(),
        amount: type === 'LIMIT' && amount ? parseInt(amount, 10) : null,
        stackable: Boolean(stackable),
        maxQuantity: stackable && maxQuantity ? parseInt(maxQuantity, 10) : null,
        active: true
      }
    });

    AddonRegistry.register({
      id: newAddon.code,
      name: newAddon.name,
      description: newAddon.description || '',
      priceMonthly: newAddon.priceMonthly,
      type: newAddon.type,
      targetKey: newAddon.targetKey,
      amount: newAddon.amount ?? undefined,
      stackable: newAddon.stackable,
      maxQuantity: newAddon.maxQuantity ?? undefined,
      active: newAddon.active
    });

    return NextResponse.json({ success: true, addon: newAddon });
  } catch (error: any) {
    console.error('[API_SUPERADMIN_ADDONS_POST]', error);
    return NextResponse.json({ error: error?.message || 'Error al crear add-on' }, { status: 500 });
  }
}
