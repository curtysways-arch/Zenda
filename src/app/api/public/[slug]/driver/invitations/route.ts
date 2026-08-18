import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

// GET: Obtener las invitaciones pendientes enviadas a un repartidor por su teléfono
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone') || '';

    if (!phone) {
      return NextResponse.json({ invitations: [] });
    }

    const digitsOnly = phone.replace(/\D/g, '');
    const last8or9 = digitsOnly.slice(-8);

    const invitations = await (prisma as any).deliveryInvitation.findMany({
      where: {
        telefono: { contains: last8or9 },
        status: { in: ['INVITACION_ENVIADA', 'PENDING'] }
      },
      include: {
        negocio: {
          select: { id: true, nombre: true, logoUrl: true, direccion: true, ciudad: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      invitations: invitations.map((inv: any) => ({
        id: inv.id,
        negocioId: inv.negocioId,
        negocioNombre: inv.negocio?.nombre || 'Negocio Citiox',
        negocioLogo: inv.negocio?.logoUrl || null,
        negocioDireccion: inv.negocio?.direccion || 'Ecuador',
        fecha: inv.createdAt
      }))
    });

  } catch (error: any) {
    console.error('[DRIVER INVITATIONS GET ERROR]', error);
    return NextResponse.json({ error: error?.message || 'Error cargando invitaciones' }, { status: 500 });
  }
}

// POST: Aceptar o Rechazar una invitación de negocio
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { invitationId, action, driverPhone, driverName, driverId } = body;

    if (!invitationId || !action) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 });
    }

    const inv = await (prisma as any).deliveryInvitation.findUnique({
      where: { id: invitationId }
    });

    if (!inv) {
      return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 });
    }

    if (action === 'ACCEPT') {
      // 1. Actualizar estado de la invitación
      await (prisma as any).deliveryInvitation.update({
        where: { id: invitationId },
        data: { status: 'ACCEPTED', usedAt: new Date() }
      });

      // 2. Crear OperableResource para este negocio en estado PENDIENTE_VERIFICACION
      // Buscamos si existe un perfil previo del driver para vincularlo
      const existingProfile = await (prisma as any).resourceProfile.findFirst({
        where: { telefono: { contains: inv.telefono.slice(-8) } }
      });

      await (prisma as any).operableResource.create({
        data: {
          negocioId: inv.negocioId,
          name: driverName || 'Repartidor',
          resourceType: 'HUMAN',
          category: 'DELIVERY_DRIVER',
          active: false,
          estado: 'FUERA_DE_SERVICIO',
          profile: {
            create: {
              telefono: inv.telefono,
              verificationStatus: 'PENDING_VERIFICATION',
              tipoVehiculo: existingProfile?.tipoVehiculo || 'MOTO',
              vehiculo: existingProfile?.vehiculo || 'Motocicleta',
              placa: existingProfile?.placa || '',
              cedulaFrenteUrl: existingProfile?.cedulaFrenteUrl || null,
              licenciaUrl: existingProfile?.licenciaUrl || null,
              matriculaUrl: existingProfile?.matriculaUrl || null,
              fotoVehiculoUrl: existingProfile?.fotoVehiculoUrl || null,
            }
          }
        }
      });

      return NextResponse.json({
        success: true,
        message: '¡Invitación aceptada! Tu perfil está en revisión por la administración del negocio.'
      });
    }

    if (action === 'REJECT') {
      await (prisma as any).deliveryInvitation.update({
        where: { id: invitationId },
        data: { status: 'REJECTED' }
      });

      return NextResponse.json({
        success: true,
        message: 'Invitación rechazada'
      });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });

  } catch (error: any) {
    console.error('[DRIVER INVITATIONS POST ERROR]', error);
    return NextResponse.json({ error: error?.message || 'Error al procesar invitación' }, { status: 500 });
  }
}
