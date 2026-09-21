import { NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import prisma from '@/lib/prisma';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getEffectiveAdminSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const negocioId = (session.user as any).negocioId;
  if (!negocioId) {
    return NextResponse.json({ error: 'No tienes un negocio asociado' }, { status: 400 });
  }

  const { id } = await params;

  try {
    const existing = await (prisma as any).membershipPlan.findFirst({
      where: { id, businessId: negocioId }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Plan no encontrado o no pertenece a este negocio' }, { status: 404 });
    }

    const body = await req.json();
    const { name, description, price, currency, durationDays, displayOrder, featured, benefits, accessRules, active } = body;

    const updated = await (prisma as any).membershipPlan.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(currency !== undefined && { currency }),
        ...(durationDays !== undefined && { durationDays: parseInt(durationDays, 10) }),
        ...(displayOrder !== undefined && { displayOrder: parseInt(displayOrder, 10) }),
        ...(featured !== undefined && { featured: Boolean(featured) }),
        ...(benefits !== undefined && { benefits }),
        ...(accessRules !== undefined && { accessRules }),
        ...(active !== undefined && { active: Boolean(active) })
      }
    });

    return NextResponse.json({ success: true, plan: updated });
  } catch (error: any) {
    console.error('[API_GYM_PLANS_PUT]', error);
    return NextResponse.json({ error: error.message || 'Error al actualizar plan' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getEffectiveAdminSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const negocioId = (session.user as any).negocioId;
  if (!negocioId) {
    return NextResponse.json({ error: 'No tienes un negocio asociado' }, { status: 400 });
  }

  const { id } = await params;

  try {
    const existing = await (prisma as any).membershipPlan.findFirst({
      where: { id, businessId: negocioId },
      include: {
        _count: { select: { memberships: true } }
      }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 });
    }

    // Si tiene membresías históricas asociadas, hacer soft-delete (active: false) para no romper relaciones foráneas
    if (existing._count?.memberships > 0) {
      const deactivated = await (prisma as any).membershipPlan.update({
        where: { id },
        data: { active: false }
      });
      return NextResponse.json({ success: true, message: 'Plan desactivado (contiene membresías históricas)', plan: deactivated });
    }

    await (prisma as any).membershipPlan.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Plan eliminado' });
  } catch (error: any) {
    console.error('[API_GYM_PLANS_DELETE]', error);
    return NextResponse.json({ error: error.message || 'Error al eliminar plan' }, { status: 500 });
  }
}
