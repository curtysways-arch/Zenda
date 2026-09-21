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

  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 1. Personas actualmente dentro (status = INSIDE)
    const currentlyInside = await (prisma as any).gymAttendance.findMany({
      where: {
        businessId: negocioId,
        status: 'INSIDE'
      },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            telefono: true,
            email: true,
            imagenUrl: true
          }
        },
        membership: {
          include: {
            membershipPlan: { select: { name: true } }
          }
        }
      },
      orderBy: { checkedInAt: 'desc' }
    });

    // 2. Conteo de hoy
    const [todayCheckIns, todayCheckOuts] = await Promise.all([
      (prisma as any).gymAttendance.count({
        where: {
          businessId: negocioId,
          checkedInAt: { gte: startOfDay }
        }
      }),
      (prisma as any).gymAttendance.count({
        where: {
          businessId: negocioId,
          checkedOutAt: { gte: startOfDay }
        }
      })
    ]);

    // 3. Actividad reciente de hoy
    const recentActivity = await (prisma as any).gymAttendance.findMany({
      where: {
        businessId: negocioId,
        checkedInAt: { gte: startOfDay }
      },
      include: {
        cliente: {
          select: { id: true, nombre: true, telefono: true, imagenUrl: true }
        },
        membership: {
          include: {
            membershipPlan: { select: { name: true } }
          }
        }
      },
      orderBy: { checkedInAt: 'desc' },
      take: 25
    });

    const enrichedInside = currentlyInside.map((att: any) => {
      const minutes = Math.max(1, Math.round((now.getTime() - new Date(att.checkedInAt).getTime()) / 60000));
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return {
        id: att.id,
        member: att.cliente,
        planName: att.membership?.membershipPlan?.name || 'Membresía General',
        checkedInAt: att.checkedInAt,
        durationMinutes: minutes,
        durationText: hours > 0 ? `${hours}h ${mins}m` : `${mins}m`,
        method: att.method
      };
    });

    return NextResponse.json({
      insideCount: currentlyInside.length,
      todayCheckIns,
      todayCheckOuts,
      currentlyInside: enrichedInside,
      recentActivity: recentActivity.map((att: any) => ({
        id: att.id,
        member: att.cliente,
        planName: att.membership?.membershipPlan?.name || 'Membresía General',
        checkedInAt: att.checkedInAt,
        checkedOutAt: att.checkedOutAt,
        status: att.status,
        durationMinutes: att.durationMinutes,
        method: att.method
      }))
    });

  } catch (error: any) {
    console.error('[API_GYM_ATTENDANCES_LIVE_ERROR]', error);
    return NextResponse.json({ error: error.message || 'Error al obtener asistencias en vivo' }, { status: 500 });
  }
}
