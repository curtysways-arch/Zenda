import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// ─── GET: Lista invitaciones del negocio ──────────────────────────────────────
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const negocioId = (session.user as any).negocioId;
    const db = prisma as any;
    const invitations = await db.deliveryInvitation.findMany({
      where: { negocioId },
      include: {
        resource: {
          include: { profile: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(invitations);
  } catch (error: any) {
    console.error('[LOGISTICS/INVITATIONS GET]', error);
    return NextResponse.json({ error: error?.message || 'Error obteniendo invitaciones' }, { status: 500 });
  }
}

// ─── POST: Crear nueva invitación (Nuevo Repartidor) ─────────────────────────
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const negocioId = (session.user as any).negocioId;
    const body = await req.json();

    const { nombre, telefono, tipoVehiculo } = body;

    if (!nombre || !telefono) {
      return NextResponse.json(
        { error: 'El nombre y teléfono son requeridos' },
        { status: 400 }
      );
    }

    // Obtener información del negocio para el mensaje de WhatsApp
    const negocio = await prisma.negocio.findUnique({
      where: { id: negocioId },
      select: { nombre: true },
    });

    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48); // Vence en 48h

    // Crear OperableResource y DeliveryInvitation con llamada directa al singleton prisma
    const resource = await (prisma as any).operableResource.create({
      data: {
        negocioId,
        name: nombre,
        resourceType: 'HUMAN',
        category: 'DELIVERY_DRIVER',
        active: true,
        estado: 'FUERA_DE_SERVICIO',
        profile: {
          create: {
            telefono,
            tipoVehiculo: tipoVehiculo || 'MOTO',
            verificationStatus: 'INVITED',
            activo: false,
          },
        },
      },
      include: { profile: true },
    });

    const invitation = await (prisma as any).deliveryInvitation.create({
      data: {
        negocioId,
        resourceId: resource.id,
        telefono,
        token,
        expiresAt,
        status: 'PENDING',
      },
    });

    const inviteUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/invite/${token}`;
    const cleanPhone = telefono.replace(/\D/g, '');

    const waMessage = [
      `Hola ${nombre} 👋`,
      ``,
      `*${negocio?.nombre || 'Nuestro Negocio'}* te invita a ser repartidor oficial.`,
      ``,
      `Completa tu registro y carga de documentos aquí:`,
      `${inviteUrl}`,
      ``,
      `⚠️ Este enlace vence en 48 horas.`,
    ].join('\n');

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMessage)}`;

    console.log('[LOGISTICS_EVENT] DriverInvited', {
      resourceId: resource.id,
      token,
      negocioId,
    });

    return NextResponse.json(
      {
        resource,
        invitation,
        inviteUrl,
        whatsapp: {
          phone: telefono,
          message: waMessage,
          url: waUrl,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[LOGISTICS/INVITATIONS POST ERROR]', error);
    return NextResponse.json(
      { error: error?.message || 'Error creando invitación' },
      { status: 500 }
    );
  }
}
