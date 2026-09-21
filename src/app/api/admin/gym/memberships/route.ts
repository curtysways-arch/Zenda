import { NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  const session = await getEffectiveAdminSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const negocioId = (session.user as any).negocioId;
  if (!negocioId) {
    return NextResponse.json({ error: 'No tienes un negocio asociado' }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get('status');
  const searchQuery = searchParams.get('q')?.toLowerCase() || '';

  try {
    // 1. Auto-expirar membresías cuyo endAt ya pasó y siguen marcadas como ACTIVE
    const now = new Date();
    await (prisma as any).membership.updateMany({
      where: {
        businessId: negocioId,
        status: 'ACTIVE',
        endAt: { lt: now }
      },
      data: {
        status: 'EXPIRED'
      }
    });

    // 2. Consulta de membresías
    const whereClause: any = {
      businessId: negocioId
    };

    if (statusFilter && statusFilter !== 'ALL') {
      whereClause.status = statusFilter;
    }

    if (searchQuery) {
      whereClause.cliente = {
        OR: [
          { nombre: { contains: searchQuery } },
          { telefono: { contains: searchQuery } },
          { email: { contains: searchQuery } }
        ]
      };
    }

    const memberships = await (prisma as any).membership.findMany({
      where: whereClause,
      include: {
        cliente: true,
        membershipPlan: true,
        branch: { select: { id: true, name: true } },
        _count: {
          select: { attendances: true }
        }
      },
      orderBy: [{ endAt: 'desc' }, { createdAt: 'desc' }]
    });

    return NextResponse.json({ success: true, memberships });
  } catch (error: any) {
    console.error('[API_GYM_MEMBERSHIPS_GET]', error);
    return NextResponse.json({ error: error.message || 'Error al obtener membresías' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getEffectiveAdminSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const negocioId = (session.user as any).negocioId;
  const adminUserId = (session.user as any).id;
  if (!negocioId) {
    return NextResponse.json({ error: 'No tienes un negocio asociado' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { customerId, membershipPlanId, startAt, customPrice, paymentMethod = 'EFECTIVO', paymentReference, branchId } = body;

    if (!customerId || !membershipPlanId) {
      return NextResponse.json({ error: 'El socio y el plan de membresía son obligatorios' }, { status: 400 });
    }

    // Verificar pertenencia del socio al negocio
    const cliente = await prisma.cliente.findFirst({
      where: { id: customerId, negocioId }
    });
    if (!cliente) {
      return NextResponse.json({ error: 'Socio no encontrado en este negocio' }, { status: 404 });
    }

    // Verificar plan comercial
    const plan = await (prisma as any).membershipPlan.findFirst({
      where: { id: membershipPlanId, businessId: negocioId }
    });
    if (!plan) {
      return NextResponse.json({ error: 'Plan no encontrado en este negocio' }, { status: 404 });
    }

    // Calcular fechas
    const startDate = startAt ? new Date(startAt) : new Date();
    const endDate = new Date(startDate.getTime() + (plan.durationDays || 30) * 24 * 60 * 60 * 1000);
    const finalPrice = customPrice !== undefined && customPrice !== null ? parseFloat(customPrice) : plan.price;

    // Crear membresía preservando precio histórico
    const newMembership = await (prisma as any).membership.create({
      data: {
        businessId: negocioId,
        customerId,
        membershipPlanId,
        status: 'ACTIVE',
        startAt: startDate,
        endAt: endDate,
        price: finalPrice,
        currency: plan.currency || 'USD',
        paymentStatus: 'PAID',
        paymentMethod,
        paymentReference: paymentReference || null,
        branchId: branchId || null
      },
      include: {
        cliente: true,
        membershipPlan: true
      }
    });

    // Registrar en AdminAuditLog
    try {
      if (adminUserId) {
        await (prisma as any).adminAuditLog.create({
          data: {
            adminUserId,
            accion: 'MEMBERSHIP_CREATED',
            modulo: 'GIMNASIO',
            descripcion: `Membresía ${plan.name} asignada a ${cliente.nombre} por $${finalPrice}`,
            targetId: newMembership.id,
            targetType: 'MEMBERSHIP',
            datosDespues: JSON.stringify({
              membershipId: newMembership.id,
              customerId,
              planId: membershipPlanId,
              price: finalPrice,
              startAt: startDate,
              endAt: endDate
            })
          }
        });
      }
    } catch (_) {}

    return NextResponse.json({ success: true, membership: newMembership });
  } catch (error: any) {
    console.error('[API_GYM_MEMBERSHIPS_POST]', error);
    return NextResponse.json({ error: error.message || 'Error al crear membresía' }, { status: 500 });
  }
}
