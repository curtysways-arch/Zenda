import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// ─── GET: Obtener datos de la invitación por token ────────────────────────────
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;

    const invitation = await (prisma as any).deliveryInvitation.findUnique({
      where: { token },
      include: {
        negocio: {
          select: { id: true, nombre: true, logoUrl: true, colorPrimario: true },
        },
        resource: {
          include: { profile: true },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 });
    }

    // Permitir consulta continua para ver el estado actual del repartidor (Pendiente / Aprobado / Activo)

    if (new Date() > new Date(invitation.expiresAt)) {
      // Marcar como expirado
      await (prisma as any).deliveryInvitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      return NextResponse.json({ error: 'Este enlace ha expirado (válido por 48 horas)' }, { status: 410 });
    }

    return NextResponse.json(invitation);
  } catch (error) {
    console.error('[LOGISTICS/INVITATIONS/[token] GET]', error);
    return NextResponse.json({ error: 'Error cargando invitación' }, { status: 500 });
  }
}

// ─── POST: Completar registro de expediente del repartidor ────────────────────
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const body = await req.json();

    const invitation = await (prisma as any).deliveryInvitation.findUnique({
      where: { token },
      include: { resource: { include: { profile: true } } },
    });

    if (!invitation || invitation.status !== 'PENDING') {
      return NextResponse.json({ error: 'Invitación inválida o ya procesada' }, { status: 400 });
    }

    const {
      // Personales
      name,
      documento,
      fechaNacimiento,
      direccion,
      email,
      contactoEmergencia,
      fotografiaUrl,

      // Vehículo
      tipoVehiculo,
      vehiculo,
      marca,
      modelo,
      color,
      placa,
      anio,

      // Documentos
      cedulaFrenteUrl,
      cedulaReversoUrl,
      licenciaUrl,
      matriculaUrl,
      fotoVehiculoUrl,
      selfieUrl,
    } = body;

    // Actualizar OperableResource + ResourceProfile + marcar invitation como USED
    const [updatedResource] = await (prisma as any).$transaction([
      (prisma as any).operableResource.update({
        where: { id: invitation.resourceId },
        data: {
          name: name || invitation.resource.name,
          avatar: selfieUrl || fotografiaUrl || invitation.resource.avatar,
          updatedAt: new Date(),
          profile: {
            update: {
              verificationStatus: 'PENDING_VERIFICATION', // 👈 Pasa a Pendiente de Aprobación
              documento: documento || null,
              fechaNacimiento: fechaNacimiento || null,
              direccion: direccion || null,
              email: email || null,
              contactoEmergencia: contactoEmergencia || null,
              fotografiaUrl: fotografiaUrl || null,

              tipoVehiculo: tipoVehiculo || 'MOTO',
              vehiculo: vehiculo || null,
              marca: marca || null,
              modelo: modelo || null,
              color: color || null,
              placa: placa || null,
              anio: anio || null,

              cedulaFrenteUrl: cedulaFrenteUrl || null,
              cedulaReversoUrl: cedulaReversoUrl || null,
              licenciaUrl: licenciaUrl || null,
              matriculaUrl: matriculaUrl || null,
              fotoVehiculoUrl: fotoVehiculoUrl || null,
              selfieUrl: selfieUrl || null,

              activo: false, // Inactivo hasta que el administrador lo apruebe
            },
          },
        },
        include: { profile: true },
      }),
      (prisma as any).deliveryInvitation.update({
        where: { id: invitation.id },
        data: { status: 'USED', usedAt: new Date() },
      }),
    ]);

    console.log('[LOGISTICS_EVENT] DriverSubmittedVerification', {
      resourceId: invitation.resourceId,
      token,
      negocioId: invitation.negocioId,
    });

    return NextResponse.json({
      ok: true,
      message: 'Registro completado. Tu expediente está en revisión por el administrador.',
      resource: updatedResource,
    });
  } catch (error) {
    console.error('[LOGISTICS/INVITATIONS/[token] POST]', error);
    return NextResponse.json({ error: 'Error procesando registro' }, { status: 500 });
  }
}
