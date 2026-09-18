import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get('phone');
  const customerId = searchParams.get('customerId');

  if (!phone && !customerId) {
    return NextResponse.json({ error: 'Se requiere teléfono o ID del socio' }, { status: 400 });
  }

  try {
    const negocio = await prisma.negocio.findUnique({
      where: { slug }
    });

    if (!negocio) {
      return NextResponse.json({ error: 'Gimnasio no encontrado' }, { status: 404 });
    }

    const cliente = await prisma.cliente.findFirst({
      where: {
        negocioId: negocio.id,
        OR: [
          ...(customerId ? [{ id: customerId }] : []),
          ...(phone ? [{ telefono: phone.trim() }] : [])
        ]
      }
    });

    if (!cliente) {
      return NextResponse.json({
        found: false,
        message: 'No se encontró un socio registrado con esos datos'
      }, { status: 404 });
    }

    // Buscar la membresía más reciente
    const now = new Date();
    const latestMembership = await (prisma as any).membership.findFirst({
      where: {
        businessId: negocio.id,
        customerId: cliente.id
      },
      include: {
        membershipPlan: true
      },
      orderBy: { endAt: 'desc' }
    });

    const isActive = latestMembership && latestMembership.status === 'ACTIVE' && new Date(latestMembership.endAt) >= now;
    const daysRemaining = latestMembership
      ? Math.max(0, Math.ceil((new Date(latestMembership.endAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    // Generar código de acceso seguro no sensible (Regla 58)
    const qrPayload = `CITIOX_GYM:${negocio.id}:${cliente.id}:${Date.now()}`;

    return NextResponse.json({
      found: true,
      member: {
        id: cliente.id,
        nombre: cliente.nombre,
        telefono: cliente.telefono,
        email: cliente.email,
        imagenUrl: cliente.imagenUrl
      },
      membership: latestMembership ? {
        id: latestMembership.id,
        planName: latestMembership.membershipPlan.name,
        status: latestMembership.status,
        isActive,
        startAt: latestMembership.startAt,
        endAt: latestMembership.endAt,
        daysRemaining,
        benefits: latestMembership.membershipPlan.benefits
      } : null,
      qrPayload
    });

  } catch (error: any) {
    console.error('[API_GYM_MEMBER_QR]', error);
    return NextResponse.json({ error: error.message || 'Error al obtener código QR' }, { status: 500 });
  }
}
