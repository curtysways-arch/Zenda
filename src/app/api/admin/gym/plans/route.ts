import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const negocioId = (session.user as any).negocioId;
  if (!negocioId) {
    return NextResponse.json({ error: 'No tienes un negocio asociado' }, { status: 400 });
  }

  try {
    const plans = await (prisma as any).membershipPlan.findMany({
      where: { businessId: negocioId },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
      include: {
        _count: {
          select: { memberships: true }
        }
      }
    });
    return NextResponse.json({ success: true, plans });
  } catch (error: any) {
    console.error('[API_GYM_PLANS_GET]', error);
    return NextResponse.json({ error: error.message || 'Error al obtener planes' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const negocioId = (session.user as any).negocioId;
  if (!negocioId) {
    return NextResponse.json({ error: 'No tienes un negocio asociado' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { name, description, price, currency = 'USD', durationDays = 30, displayOrder = 0, featured = false, benefits, accessRules, active = true } = body;

    if (!name || price === undefined || price === null) {
      return NextResponse.json({ error: 'El nombre y el precio son obligatorios' }, { status: 400 });
    }

    const newPlan = await (prisma as any).membershipPlan.create({
      data: {
        businessId: negocioId,
        name,
        description: description || null,
        price: parseFloat(price),
        currency,
        durationDays: parseInt(durationDays, 10) || 30,
        displayOrder: parseInt(displayOrder, 10) || 0,
        featured: Boolean(featured),
        benefits: benefits || [],
        accessRules: accessRules || {},
        active: Boolean(active)
      }
    });

    return NextResponse.json({ success: true, plan: newPlan });
  } catch (error: any) {
    console.error('[API_GYM_PLANS_POST]', error);
    return NextResponse.json({ error: error.message || 'Error al crear plan' }, { status: 500 });
  }
}
