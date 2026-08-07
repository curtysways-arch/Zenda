import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    // 1. Buscar en OperableResource filtrando SOLO repartidores/conductores (excluyendo infraestructura/mesas)
    const resources = await (prisma as any).operableResource.findMany({
      where: {
        ...(includeInactive ? {} : { active: true }),
        OR: [
          { category: 'DELIVERY_DRIVER' },
          { resourceType: { in: ['HUMAN', 'VEHICLE'] } }
        ],
        NOT: [
          { name: { contains: 'Mesa', mode: 'insensitive' } },
          { category: 'TABLE' },
          { resourceType: 'INFRASTRUCTURE' }
        ]
      },
      include: {
        profile: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // 2. Buscar en Staff repartidores
    const staffDrivers = await (prisma as any).staff.findMany({
      where: {
        role: { in: ['REPARTIDOR', 'DRIVER', 'ENTREGA', 'DELIVERY'] }
      }
    });

    const mappedStaff = staffDrivers.map((s: any) => ({
      id: s.id,
      name: s.name,
      estado: s.active ? 'DISPONIBLE' : 'FUERA_DE_SERVICIO',
      active: s.active,
      tipoRecurso: 'VEHICULO',
      profile: {
        verificationStatus: 'APPROVED',
        telefono: '0991234567',
        vehiculo: 'Moto Honda Cargo 150cc',
        tipoVehiculo: 'MOTO'
      }
    }));

    // Combinar los repartidores
    const allDrivers = [...resources, ...mappedStaff];

    return NextResponse.json(allDrivers);
  } catch (error: any) {
    console.error('[LOGISTICS/RESOURCES GET ERROR]', error);
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const negocioId = (session.user as any).negocioId;
    if (!negocioId) return NextResponse.json({ error: 'Sin negocio asociado' }, { status: 400 });

    const body = await req.json();
    const { name, telefono, tipoVehiculo = 'MOTO', placa, documento, estado = 'DISPONIBLE', autoApprove = true } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'El nombre del repartidor es requerido' }, { status: 400 });
    }

    const resource = await (prisma as any).operableResource.create({
      data: {
        negocioId,
        name: name.trim(),
        resourceType: 'HUMAN',
        category: 'DELIVERY_DRIVER',
        active: true,
        estado,
        profile: {
          create: {
            verificationStatus: autoApprove ? 'APPROVED' : 'INVITED',
            telefono: telefono || '',
            tipoVehiculo,
            placa: placa || '',
            documento: documento || '',
            vehiculo: `${tipoVehiculo} ${placa ? `(${placa})` : ''}`.trim()
          }
        }
      },
      include: {
        profile: true
      }
    });

    return NextResponse.json({ success: true, resource }, { status: 201 });
  } catch (error: any) {
    console.error('[LOGISTICS/RESOURCES POST ERROR]', error);
    return NextResponse.json({ error: error.message || 'Error creando repartidor' }, { status: 500 });
  }
}
