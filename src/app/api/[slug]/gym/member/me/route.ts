import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import prisma from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const queryPhone = searchParams.get('phone');

  try {
    const negocio = await prisma.negocio.findUnique({
      where: { slug },
      select: { id: true, nombre: true, logoUrl: true, configuracion: true, whatsapp: true }
    });

    if (!negocio) {
      return NextResponse.json({ error: 'Gimnasio no encontrado' }, { status: 404 });
    }

    // 1. Identificar al socio
    let memberPhone = queryPhone || '';
    const cookieStore = await cookies();
    const token = cookieStore.get('customer_token')?.value;

    if (token) {
      try {
        const secretKey = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'default_otp_secret_key_change_me');
        const { payload } = await jwtVerify(token, secretKey);
        if (payload.telefono) memberPhone = payload.telefono as string;
      } catch (_) {}
    }

    if (!memberPhone) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const cliente = await prisma.cliente.findFirst({
      where: {
        negocioId: negocio.id,
        telefono: memberPhone
      }
    });

    if (!cliente) {
      return NextResponse.json({
        authenticated: true,
        isMember: false,
        phone: memberPhone,
        message: 'No tienes una membresía registrada en este gimnasio.'
      });
    }

    const now = new Date();

    // 2. Membresías del socio
    const memberships = await (prisma as any).membership.findMany({
      where: {
        businessId: negocio.id,
        customerId: cliente.id
      },
      include: {
        membershipPlan: true,
        branch: { select: { id: true, name: true } }
      },
      orderBy: [
        { status: 'asc' },
        { endAt: 'desc' }
      ]
    });

    const activeMembership = memberships.find((m: any) => m.status === 'ACTIVE' && new Date(m.endAt) >= now);
    const latestMembership = activeMembership || memberships[0] || null;

    let membershipDetails = null;
    if (latestMembership) {
      const startMs = new Date(latestMembership.startAt).getTime();
      const endMs = new Date(latestMembership.endAt).getTime();
      const nowMs = now.getTime();
      const totalDays = Math.max(1, Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24)));
      const daysRemaining = Math.max(0, Math.ceil((endMs - nowMs) / (1000 * 60 * 60 * 24)));
      const daysPassed = Math.max(0, Math.min(totalDays, totalDays - daysRemaining));
      const progressPercent = Math.min(100, Math.round((daysPassed / totalDays) * 100));

      membershipDetails = {
        id: latestMembership.id,
        planId: latestMembership.membershipPlanId,
        planName: latestMembership.membershipPlan.name,
        description: latestMembership.membershipPlan.description,
        price: latestMembership.price,
        currency: latestMembership.currency,
        status: latestMembership.status,
        isActive: latestMembership.status === 'ACTIVE' && endMs >= nowMs,
        isExpiringSoon: daysRemaining <= 7 && daysRemaining > 0,
        startAt: latestMembership.startAt,
        endAt: latestMembership.endAt,
        daysRemaining,
        totalDays,
        progressPercent,
        benefits: latestMembership.membershipPlan.benefits,
        branchName: latestMembership.branch?.name || 'Sede Principal'
      };
    }

    // 3. Estado actual de permanencia (¿Está dentro del gym?)
    const openAttendance = await (prisma as any).gymAttendance.findFirst({
      where: {
        businessId: negocio.id,
        customerId: cliente.id,
        status: 'INSIDE',
        checkedInAt: {
          gte: new Date(now.getTime() - 12 * 60 * 60 * 1000)
        }
      },
      orderBy: { checkedInAt: 'desc' }
    });

    let currentStatus = {
      isInside: !!openAttendance,
      openAttendanceId: openAttendance?.id || null,
      checkedInAt: openAttendance?.checkedInAt || null,
      durationMinutes: openAttendance 
        ? Math.max(1, Math.round((now.getTime() - new Date(openAttendance.checkedInAt).getTime()) / 60000))
        : 0
    };

    // 4. Estadísticas de asistencia
    const attendances = await (prisma as any).gymAttendance.findMany({
      where: {
        businessId: negocio.id,
        customerId: cliente.id
      },
      orderBy: { checkedInAt: 'desc' },
      take: 60
    });

    // Asistencias esta semana (Lunes a Domingo)
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const weekAttendances = attendances.filter((a: any) => new Date(a.checkedInAt) >= startOfWeek).length;
    const monthAttendances = attendances.filter((a: any) => new Date(a.checkedInAt) >= startOfMonth).length;
    const lastVisit = attendances[0] ? attendances[0].checkedInAt : null;

    // Generar código QR dinámico de socio
    const qrPayload = `CITIOX_GYM:${negocio.id}:${cliente.id}:${now.getTime()}`;

    return NextResponse.json({
      authenticated: true,
      isMember: !!membershipDetails,
      member: {
        id: cliente.id,
        nombre: cliente.nombre,
        telefono: cliente.telefono,
        email: cliente.email,
        imagenUrl: cliente.imagenUrl
      },
      membership: membershipDetails,
      currentStatus,
      stats: {
        weekAttendances,
        monthAttendances,
        totalAttendances: attendances.length,
        lastVisit
      },
      qrPayload,
      business: {
        id: negocio.id,
        nombre: negocio.nombre,
        logoUrl: negocio.logoUrl,
        whatsapp: negocio.whatsapp
      }
    });

  } catch (error: any) {
    console.error('[API_GYM_MEMBER_ME_ERROR]', error);
    return NextResponse.json({ error: error.message || 'Error al obtener datos del socio' }, { status: 500 });
  }
}
