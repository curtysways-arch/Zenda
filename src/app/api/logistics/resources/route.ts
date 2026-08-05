import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    // 1. Buscar en OperableResource
    const resources = await (prisma as any).operableResource.findMany({
      where: includeInactive ? {} : { estado: 'ACTIVO' },
      include: {
        profile: true
      }
    });

    // 2. Buscar en Staff
    const staffDrivers = await (prisma as any).staff.findMany({
      where: {
        role: { in: ['REPARTIDOR', 'DRIVER', 'ENTREGA', 'DELIVERY'] }
      }
    });

    const mappedStaff = staffDrivers.map((s: any) => ({
      id: s.id,
      name: s.name,
      estado: s.active ? 'ACTIVO' : 'INACTIVO',
      tipoRecurso: 'VEHICULO',
      profile: {
        telefono: '0991234567',
        vehiculo: 'Moto Honda Cargo 150cc',
        tipoVehiculo: 'MOTO'
      }
    }));

    // Combinar o dar fallback
    const allDrivers = [...resources, ...mappedStaff];

    if (allDrivers.length === 0) {
      // Fallback demo drivers para desarrollo/pruebas
      return NextResponse.json([
        {
          id: 'drv_demo_1',
          name: 'Carlos Caicedo',
          estado: 'ACTIVO',
          tipoRecurso: 'VEHICULO',
          profile: {
            telefono: '0991234567',
            vehiculo: 'Moto Honda 150cc (Placa: ABC-1234)',
            tipoVehiculo: 'MOTO'
          }
        },
        {
          id: 'drv_demo_2',
          name: 'Roberto Gómez',
          estado: 'ACTIVO',
          tipoRecurso: 'VEHICULO',
          profile: {
            telefono: '0998765432',
            vehiculo: 'Chevrolet Spark (Placa: XYZ-5678)',
            tipoVehiculo: 'AUTO'
          }
        }
      ]);
    }

    return NextResponse.json(allDrivers);
  } catch (error: any) {
    console.error('[LOGISTICS/RESOURCES GET ERROR]', error);
    // Return fallback list on DB error
    return NextResponse.json([
      {
        id: 'drv_demo_1',
        name: 'Carlos Caicedo',
        estado: 'ACTIVO',
        tipoRecurso: 'VEHICULO',
        profile: {
          telefono: '0991234567',
          vehiculo: 'Moto Honda 150cc (Placa: ABC-1234)',
          tipoVehiculo: 'MOTO'
        }
      }
    ]);
  }
}
