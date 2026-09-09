import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { AddonRegistry } from '@/core/entitlements/AddonRegistry';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    if (userRole !== 'SUPERADMIN' && userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const addon = await prisma.addon.findFirst({
      where: {
        OR: [{ id }, { code: id.toUpperCase() }]
      }
    });

    if (!addon) {
      return NextResponse.json({ error: 'Add-on no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, addon });
  } catch (error: any) {
    console.error('[API_SUPERADMIN_ADDON_GET_BY_ID]', error);
    return NextResponse.json({ error: error?.message || 'Error al obtener add-on' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    if (userRole !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Solo SuperAdmin puede modificar Add-ons' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.addon.findFirst({
      where: {
        OR: [{ id }, { code: id.toUpperCase() }]
      }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Add-on no encontrado' }, { status: 404 });
    }

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.description !== undefined) updateData.description = body.description ? body.description.trim() : null;
    if (body.priceMonthly !== undefined) updateData.priceMonthly = parseFloat(body.priceMonthly);
    if (body.type !== undefined) updateData.type = body.type;
    if (body.targetKey !== undefined) updateData.targetKey = body.targetKey.trim();
    if (body.amount !== undefined) updateData.amount = body.amount !== null && body.amount !== '' ? parseInt(body.amount, 10) : null;
    if (body.stackable !== undefined) updateData.stackable = Boolean(body.stackable);
    if (body.maxQuantity !== undefined) updateData.maxQuantity = body.maxQuantity !== null && body.maxQuantity !== '' ? parseInt(body.maxQuantity, 10) : null;
    if (body.active !== undefined) updateData.active = Boolean(body.active);

    const updated = await prisma.addon.update({
      where: { id: existing.id },
      data: updateData
    });

    AddonRegistry.register({
      id: updated.code,
      name: updated.name,
      description: updated.description || '',
      priceMonthly: updated.priceMonthly,
      type: updated.type,
      targetKey: updated.targetKey,
      amount: updated.amount ?? undefined,
      stackable: updated.stackable,
      maxQuantity: updated.maxQuantity ?? undefined,
      active: updated.active
    });

    return NextResponse.json({ success: true, addon: updated });
  } catch (error: any) {
    console.error('[API_SUPERADMIN_ADDON_PATCH]', error);
    return NextResponse.json({ error: error?.message || 'Error al actualizar add-on' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    if (userRole !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Solo SuperAdmin puede desactivar Add-ons' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.addon.findFirst({
      where: {
        OR: [{ id }, { code: id.toUpperCase() }]
      }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Add-on no encontrado' }, { status: 404 });
    }

    // Soft-delete: active = false
    const updated = await prisma.addon.update({
      where: { id: existing.id },
      data: { active: false }
    });

    AddonRegistry.register({
      id: updated.code,
      name: updated.name,
      description: updated.description || '',
      priceMonthly: updated.priceMonthly,
      type: updated.type,
      targetKey: updated.targetKey,
      amount: updated.amount ?? undefined,
      stackable: updated.stackable,
      maxQuantity: updated.maxQuantity ?? undefined,
      active: false
    });

    return NextResponse.json({
      success: true,
      message: 'Add-on desactivado correctamente (soft-delete)',
      addon: updated
    });
  } catch (error: any) {
    console.error('[API_SUPERADMIN_ADDON_DELETE]', error);
    return NextResponse.json({ error: error?.message || 'Error al desactivar add-on' }, { status: 500 });
  }
}
