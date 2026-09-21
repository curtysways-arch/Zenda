import { NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import prisma from '@/lib/prisma';
import { publishBusinessEvent } from '@/lib/growth/eventBus';

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
  const period = searchParams.get('period') || 'today'; // today | week | month | all
  const searchQuery = searchParams.get('q')?.toLowerCase() || '';

  try {
    const now = new Date();
    let dateFilter: any = undefined;

    if (period === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      dateFilter = { gte: startOfDay };
    } else if (period === 'week') {
      const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFilter = { gte: startOfWeek };
    } else if (period === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter = { gte: startOfMonth };
    }

    const whereClause: any = {
      businessId: negocioId,
      ...(dateFilter && { checkedInAt: dateFilter })
    };

    if (searchQuery) {
      whereClause.cliente = {
        OR: [
          { nombre: { contains: searchQuery } },
          { telefono: { contains: searchQuery } },
          { email: { contains: searchQuery } }
        ]
      };
    }

    const attendances = await (prisma as any).gymAttendance.findMany({
      where: whereClause,
      include: {
        cliente: true,
        membership: {
          include: { membershipPlan: true }
        },
        branch: { select: { id: true, name: true } }
      },
      orderBy: { checkedInAt: 'desc' },
      take: 100
    });

    return NextResponse.json({ success: true, attendances });
  } catch (error: any) {
    console.error('[API_GYM_ATTENDANCES_GET]', error);
    return NextResponse.json({ error: error.message || 'Error al obtener asistencias' }, { status: 500 });
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
    const { customerId, notes, customDate, branchId } = body;

    if (!customerId) {
      return NextResponse.json({ error: 'El socio es obligatorio' }, { status: 400 });
    }

    const cliente = await prisma.cliente.findFirst({
      where: { id: customerId, negocioId }
    });

    if (!cliente) {
      return NextResponse.json({ error: 'Socio no encontrado' }, { status: 404 });
    }

    // Buscar membresía activa del socio
    const now = new Date();
    const activeMembership = await (prisma as any).membership.findFirst({
      where: {
        businessId: negocioId,
        customerId: cliente.id,
        status: 'ACTIVE',
        endAt: { gte: now }
      },
      include: { membershipPlan: true }
    });

    const checkInTime = customDate ? new Date(customDate) : now;

    // Crear registro de asistencia manual
    const attendance = await (prisma as any).gymAttendance.create({
      data: {
        businessId: negocioId,
        customerId: cliente.id,
        membershipId: activeMembership?.id || null,
        checkedInAt: checkInTime,
        method: 'MANUAL',
        notes: notes || 'Entrada manual registrada por recepción',
        branchId: branchId || null
      },
      include: {
        cliente: true,
        membership: {
          include: { membershipPlan: true }
        }
      }
    });

    // Registrar en AdminAuditLog (Regla 50 y 51)
    try {
      if (adminUserId) {
        await (prisma as any).adminAuditLog.create({
          data: {
            adminUserId,
            accion: 'ATTENDANCE_REGISTERED',
            modulo: 'GIMNASIO',
            descripcion: `Asistencia manual registrada para ${cliente.nombre}. Motivo: ${notes || 'Recepción'}`,
            targetId: attendance.id,
            targetType: 'ATTENDANCE',
            resultado: 'EXITOSO'
          }
        });
      }
    } catch (_) {}

    // Publicar evento al EventBus
    try {
      await publishBusinessEvent({
        negocioId,
        userId: cliente.id,
        eventType: 'GYM_ATTENDANCE',
        entityId: attendance.id,
        cantidad: 1,
        metadata: {
          method: 'MANUAL',
          notes: notes || 'Manual'
        }
      });
    } catch (_) {}

    return NextResponse.json({ success: true, attendance });
  } catch (error: any) {
    console.error('[API_GYM_ATTENDANCES_POST]', error);
    return NextResponse.json({ error: error.message || 'Error al registrar asistencia manual' }, { status: 500 });
  }
}
