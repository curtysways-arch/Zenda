import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// ─── POST: Aprobar o Rechazar la verificación del repartidor ────────────────
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const negocioId = (session.user as any).negocioId;
    const body = await req.json();

    const { resourceId, action, motivoRechazo } = body; // action: 'APPROVE' | 'REJECT'

    if (!resourceId || !action) {
      return NextResponse.json(
        { error: 'resourceId y action son requeridos' },
        { status: 400 }
      );
    }

    const resource = await (prisma as any).operableResource.findFirst({
      where: { id: resourceId, negocioId, category: 'DELIVERY_DRIVER' },
      include: { profile: true },
    });

    if (!resource) {
      return NextResponse.json({ error: 'Repartidor no encontrado' }, { status: 404 });
    }

    const negocio = await prisma.negocio.findUnique({
      where: { id: negocioId },
      select: { nombre: true },
    });

    const driverPhone = resource.profile?.telefono;

    if (action === 'APPROVE') {
      const updated = await (prisma as any).operableResource.update({
        where: { id: resourceId },
        data: {
          active: true,
          estado: 'DISPONIBLE',
          profile: {
            update: {
              verificationStatus: 'APPROVED',
              activo: true,
              motivoRechazo: null,
            },
          },
        },
        include: { profile: true },
      });

      console.log('[LOGISTICS_EVENT] DriverApproved', { resourceId, negocioId });

      const waMessage = [
        `Hola ${resource.name} 🎉`,
        ``,
        `¡Tu cuenta fue aprobada! Ya puedes recibir entregas.`,
        ``,
        `Bienvenido a *${negocio?.nombre || 'Citiox Logística'}*.`,
        ``,
        `Accede a tu portal aquí: ${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/driver`,
      ].join('\n');

      return NextResponse.json({
        ok: true,
        resource: updated,
        whatsapp: driverPhone
          ? {
              phone: driverPhone,
              message: waMessage,
              url: `https://wa.me/${driverPhone.replace(/\D/g, '')}?text=${encodeURIComponent(waMessage)}`,
            }
          : null,
      });
    }

    if (action === 'REJECT') {
      const updated = await (prisma as any).operableResource.update({
        where: { id: resourceId },
        data: {
          active: false,
          estado: 'FUERA_DE_SERVICIO',
          profile: {
            update: {
              verificationStatus: 'REJECTED',
              activo: false,
              motivoRechazo: motivoRechazo || 'Información o documentos incompletos.',
            },
          },
        },
        include: { profile: true },
      });

      console.log('[LOGISTICS_EVENT] DriverRejected', { resourceId, negocioId, motivoRechazo });

      const waMessage = [
        `Hola ${resource.name}.`,
        ``,
        `Tu registro como repartidor en *${negocio?.nombre || 'Citiox Logística'}* ha sido rechazado.`,
        ``,
        `Motivo: *${motivoRechazo || 'Información o documentos incompletos'}*`,
        ``,
        `Puedes ingresar nuevamente al enlace de invitación para actualizar tus datos.`,
      ].join('\n');

      return NextResponse.json({
        ok: true,
        resource: updated,
        whatsapp: driverPhone
          ? {
              phone: driverPhone,
              message: waMessage,
              url: `https://wa.me/${driverPhone.replace(/\D/g, '')}?text=${encodeURIComponent(waMessage)}`,
            }
          : null,
      });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    console.error('[LOGISTICS/VERIFY POST]', error);
    return NextResponse.json({ error: 'Error procesando verificación' }, { status: 500 });
  }
}
