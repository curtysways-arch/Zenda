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
      select: { id: true }
    });

    if (!negocio) {
      return NextResponse.json({ error: 'Gimnasio no encontrado' }, { status: 404 });
    }

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
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const cliente = await prisma.cliente.findFirst({
      where: { negocioId: negocio.id, telefono: memberPhone }
    });

    if (!cliente) {
      return NextResponse.json({ error: 'Socio no encontrado' }, { status: 404 });
    }

    const attendances = await (prisma as any).gymAttendance.findMany({
      where: {
        businessId: negocio.id,
        customerId: cliente.id
      },
      include: {
        branch: { select: { name: true } },
        membership: {
          include: {
            membershipPlan: { select: { name: true } }
          }
        }
      },
      orderBy: { checkedInAt: 'desc' },
      take: 100
    });

    const formatted = attendances.map((att: any) => {
      const checkIn = new Date(att.checkedInAt);
      const checkOut = att.checkedOutAt ? new Date(att.checkedOutAt) : null;
      let durationText = 'En curso';
      if (checkOut) {
        const minutes = att.durationMinutes || Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / 60000));
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        durationText = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
      }

      return {
        id: att.id,
        date: checkIn.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }),
        dayName: checkIn.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase(),
        checkInTime: checkIn.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        checkOutTime: checkOut ? checkOut.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : null,
        durationText,
        status: att.status,
        method: att.method,
        branchName: att.branch?.name || 'Sede Principal',
        planName: att.membership?.membershipPlan?.name || 'Membresía'
      };
    });

    return NextResponse.json({
      success: true,
      attendances: formatted
    });

  } catch (error: any) {
    console.error('[API_MEMBER_ATTENDANCES_HISTORY_ERROR]', error);
    return NextResponse.json({ error: error.message || 'Error al obtener historial' }, { status: 500 });
  }
}
