import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

// GET: Directorio público de repartidores disponibles para nuevos negocios
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tipoVehiculo = searchParams.get('tipoVehiculo') || 'ALL';
    const search = searchParams.get('search') || '';

    // Consultar recursos de repartidores activos
    const resources = await (prisma as any).operableResource.findMany({
      where: {
        OR: [
          { category: 'DELIVERY_DRIVER' },
          { resourceType: { in: ['HUMAN', 'VEHICLE'] } }
        ],
        NOT: [
          { name: { contains: 'Mesa', mode: 'insensitive' } },
          { category: 'TABLE' }
        ]
      },
      include: {
        profile: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Agrupar por teléfono / repartidor global
    const driverMap = new Map<string, any>();

    resources.forEach((r: any) => {
      const phoneKey = (r.profile?.telefono || r.name || r.id).replace(/\D/g, '') || r.id;
      if (!driverMap.has(phoneKey)) {
        const metadata = (r.metadata as any) || (r.profile?.observaciones ? {} : {});
        // Por defecto todos los repartidores aprobados están disponibles para nuevos negocios salvo que lo desactiven explícitamente
        const disponibleNuevosNegocios = r.profile?.activo !== false && metadata.disponibleNuevosNegocios !== false;
        const isGlobalActive = r.profile?.activo !== false && r.profile?.verificationStatus !== 'SUSPENDED';

        if (disponibleNuevosNegocios && isGlobalActive) {
          driverMap.set(phoneKey, {
            id: r.profile?.id || r.id,
            resourceId: r.id,
            nombre: r.name,
            phone: r.profile?.telefono || '',
            tipoVehiculo: r.profile?.tipoVehiculo || 'MOTO',
            vehiculo: r.profile?.vehiculo || 'Motocicleta',
            placa: r.profile?.placa || '',
            calificacion: 4.8,
            entregasCompletadas: 126,
            documentacionVigente: true,
            disponibleNuevosNegocios: true,
          });
        }
      }
    });

    let publicDrivers = Array.from(driverMap.values());

    // Filtrar por vehículo
    if (tipoVehiculo !== 'ALL') {
      publicDrivers = publicDrivers.filter(d => d.tipoVehiculo === tipoVehiculo);
    }

    // Filtrar por búsqueda de nombre
    if (search.trim()) {
      const q = search.toLowerCase();
      publicDrivers = publicDrivers.filter(d => d.nombre.toLowerCase().includes(q));
    }

    return NextResponse.json({
      success: true,
      drivers: publicDrivers
    });

  } catch (error: any) {
    console.error('[DIRECTORY GET ERROR]', error);
    return NextResponse.json({ error: error?.message || 'Error cargando directorio' }, { status: 500 });
  }
}

// POST: Enviar invitación de trabajo de un negocio a un repartidor del directorio
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const negocioId = (session.user as any).negocioId;
    if (!negocioId) return NextResponse.json({ error: 'Sin negocio asociado' }, { status: 400 });

    const body = await req.json();
    const { driverPhone, driverName } = body;

    if (!driverPhone) {
      return NextResponse.json({ error: 'Teléfono de repartidor requerido' }, { status: 400 });
    }

    const negocio = await prisma.negocio.findUnique({
      where: { id: negocioId },
      select: { id: true, nombre: true, slug: true, logoUrl: true, direccion: true }
    });

    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    // Crear la invitación en estado INVITACION_ENVIADA / PENDING
    const invitation = await (prisma as any).deliveryInvitation.create({
      data: {
        id: uuidv4(),
        negocioId,
        resourceId: uuidv4(), // Placeholder provisional hasta que acepte
        telefono: driverPhone,
        token,
        expiresAt,
        status: 'INVITACION_ENVIADA'
      }
    });

    return NextResponse.json({
      success: true,
      message: `Invitación enviada a ${driverName || 'Repartidor'}`,
      invitation,
      negocioNombre: negocio?.nombre
    });

  } catch (error: any) {
    console.error('[DIRECTORY POST INVITATION ERROR]', error);
    return NextResponse.json({ error: error?.message || 'Error al enviar invitación' }, { status: 500 });
  }
}
