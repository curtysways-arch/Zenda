import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET: Buscar si un repartidor ya está registrado en la Red Citiox por su teléfono
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone') || '';

    if (!phone.trim()) {
      return NextResponse.json({ exists: false });
    }

    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length < 7) {
      return NextResponse.json({ exists: false });
    }

    const last8or9 = digitsOnly.slice(-8);

    // Buscar en ResourceProfile
    const profile = await (prisma as any).resourceProfile.findFirst({
      where: {
        telefono: { contains: last8or9 }
      },
      include: {
        resource: {
          include: {
            negocio: { select: { nombre: true, logoUrl: true } }
          }
        }
      }
    });

    if (!profile) {
      return NextResponse.json({ exists: false });
    }

    // Contar cuántos negocios tienen asociado a este repartidor
    const associatedResources = await (prisma as any).operableResource.findMany({
      where: {
        OR: [
          { category: 'DELIVERY_DRIVER' },
          { resourceType: { in: ['HUMAN', 'VEHICLE'] } }
        ],
        profile: {
          telefono: { contains: last8or9 }
        }
      },
      include: {
        negocio: { select: { id: true, nombre: true } }
      }
    });

    return NextResponse.json({
      exists: true,
      profileId: profile.id,
      driverName: profile.resource?.name || 'Repartidor Registrado',
      phone: profile.telefono || phone,
      documento: profile.documento || null,
      tipoVehiculo: profile.tipoVehiculo || 'MOTO',
      vehiculo: profile.vehiculo || 'Motocicleta',
      placa: profile.placa || null,
      verificationStatus: profile.verificationStatus,
      isGlobalVerified: profile.verificationStatus === 'APPROVED' || profile.activo === true,
      negociosCount: associatedResources.length,
      negociosNombres: associatedResources.map((r: any) => r.negocio?.nombre).filter(Boolean),
      documentos: {
        cedulaFrenteUrl: profile.cedulaFrenteUrl,
        licenciaUrl: profile.licenciaUrl,
        matriculaUrl: profile.matriculaUrl,
        fotoVehiculoUrl: profile.fotoVehiculoUrl
      }
    });

  } catch (error: any) {
    console.error('[SEARCH DRIVER API ERROR]', error);
    return NextResponse.json({ exists: false }, { status: 500 });
  }
}
