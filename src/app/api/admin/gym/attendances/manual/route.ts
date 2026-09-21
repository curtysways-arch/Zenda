import { NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import prisma from '@/lib/prisma';
import { publishBusinessEvent } from '@/lib/growth/eventBus';

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
    const { customerId, action = 'CHECK_IN', notes } = body;

    if (!customerId) {
      return NextResponse.json({ error: 'Se requiere ID del socio' }, { status: 400 });
    }

    const cliente = await prisma.cliente.findFirst({
      where: { id: customerId, negocioId }
    });

    if (!cliente) {
      return NextResponse.json({ error: 'Socio no encontrado en este negocio' }, { status: 404 });
    }

    const now = new Date();

    if (action === 'CHECK_OUT') {
      const openAttendance = await (prisma as any).gymAttendance.findFirst({
        where: {
          businessId: negocioId,
          customerId: cliente.id,
          status: 'INSIDE'
        },
        orderBy: { checkedInAt: 'desc' }
      });

      if (!openAttendance) {
        return NextResponse.json({ error: 'El socio no tiene una entrada activa actualmente' }, { status: 400 });
      }

      const diffMs = now.getTime() - new Date(openAttendance.checkedInAt).getTime();
      const durationMinutes = Math.max(1, Math.round(diffMs / 60000));

      const updated = await (prisma as any).gymAttendance.update({
        where: { id: openAttendance.id },
        data: {
          checkedOutAt: now,
          status: 'COMPLETED',
          durationMinutes,
          notes: notes || openAttendance.notes
        }
      });

      return NextResponse.json({
        success: true,
        type: 'CHECK_OUT',
        message: `Salida manual registrada para ${cliente.nombre}.`,
        attendance: updated
      });
    }

    // CHECK_IN manual
    const activeMembership = await (prisma as any).membership.findFirst({
      where: {
        businessId: negocioId,
        customerId: cliente.id,
        status: 'ACTIVE',
        endAt: { gte: now }
      },
      include: { membershipPlan: true }
    });

    const attendance = await (prisma as any).gymAttendance.create({
      data: {
        businessId: negocioId,
        customerId: cliente.id,
        membershipId: activeMembership?.id || null,
        checkedInAt: now,
        status: 'INSIDE',
        method: 'ADMIN',
        notes: notes || 'Entrada manual registrada por recepción'
      }
    });

    await publishBusinessEvent({
      negocioId,
      userId: cliente.id,
      eventType: 'GYM_ATTENDANCE',
      entityId: attendance.id,
      cantidad: 1,
      metadata: { method: 'ADMIN' }
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      type: 'CHECK_IN',
      message: `Entrada manual registrada para ${cliente.nombre}.`,
      attendance
    });

  } catch (error: any) {
    console.error('[API_MANUAL_ATTENDANCE_ERROR]', error);
    return NextResponse.json({ error: error.message || 'Error al registrar asistencia manual' }, { status: 500 });
  }
}
