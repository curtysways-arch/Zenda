import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get('businessId') || searchParams.get('negocioId') || 'demo-canchas';

    const drivers = await prisma.staff.findMany({
      where: {
        businessId,
        role: { in: ['REPARTIDOR', 'DRIVER', 'ENTREGA'] }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(drivers);
  } catch (error) {
    console.error('Error fetching drivers:', error);
    return NextResponse.json({ error: 'Error al obtener repartidores' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { businessId = 'demo-canchas', name, role = 'REPARTIDOR', active = true, avatar } = body;

    if (!name) {
      return NextResponse.json({ error: 'El nombre del repartidor es requerido' }, { status: 400 });
    }

    const newDriver = await prisma.staff.create({
      data: {
        id: `drv_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        businessId,
        name,
        role,
        active: active !== undefined ? active : true,
        avatar: avatar || null,
        updatedAt: new Date()
      }
    });

    return NextResponse.json(newDriver, { status: 201 });
  } catch (error) {
    console.error('Error creando repartidor:', error);
    return NextResponse.json({ error: 'Error al crear repartidor' }, { status: 500 });
  }
}
