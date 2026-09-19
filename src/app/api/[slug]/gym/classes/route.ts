import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const negocio = await prisma.negocio.findFirst({
      where: { slug: { equals: slug } },
      select: { id: true, nombre: true }
    });

    if (!negocio) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const dayFilter = searchParams.get('day'); // ej. "LUN", "MAR", "MIE", etc.

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const classes = await (prisma as any).gymClass.findMany({
      where: {
        businessId: negocio.id,
        active: true,
        ...(dayFilter ? { daysOfWeek: { contains: dayFilter } } : {})
      },
      include: {
        _count: {
          select: {
            bookings: {
              where: {
                date: { gte: today },
                status: 'CONFIRMED'
              }
            }
          }
        }
      },
      orderBy: { startTime: 'asc' }
    });

    const formatted = classes.map((c: any) => {
      const bookedCount = c._count?.bookings || 0;
      const spotsLeft = Math.max(0, c.capacity - bookedCount);

      return {
        id: c.id,
        name: c.name,
        description: c.description,
        coach: c.coach,
        category: c.category,
        room: c.room,
        daysOfWeek: c.daysOfWeek,
        startTime: c.startTime,
        durationMinutes: c.durationMinutes,
        capacity: c.capacity,
        color: c.color,
        bookedCount,
        spotsLeft,
        isFull: spotsLeft === 0
      };
    });

    return NextResponse.json({
      success: true,
      businessName: negocio.nombre,
      classes: formatted
    });
  } catch (error: any) {
    console.error('[API_PUBLIC_GYM_CLASSES_GET]', error);
    return NextResponse.json({ error: error.message || 'Error al obtener clases' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const negocio = await prisma.negocio.findFirst({
      where: { slug: { equals: slug } },
      select: { id: true }
    });

    if (!negocio) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    const body = await req.json();
    const { classId, customerPhone, customerName } = body;

    if (!classId) {
      return NextResponse.json({ error: 'ID de clase requerido' }, { status: 400 });
    }

    const gymClass = await (prisma as any).gymClass.findFirst({
      where: { id: classId, businessId: negocio.id, active: true }
    });

    if (!gymClass) {
      return NextResponse.json({ error: 'Clase no encontrada' }, { status: 404 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Comprobar cupo disponible hoy
    const currentBookings = await (prisma as any).gymClassBooking.count({
      where: {
        classId,
        date: { gte: today },
        status: 'CONFIRMED'
      }
    });

    if (currentBookings >= gymClass.capacity) {
      return NextResponse.json(
        { error: 'La clase ya alcanzó su aforo máximo para hoy' },
        { status: 400 }
      );
    }

    // Buscar o registrar al socio por teléfono
    let cliente = null;
    if (customerPhone) {
      cliente = await prisma.cliente.findFirst({
        where: { negocioId: negocio.id, telefono: customerPhone }
      });
      if (!cliente && customerName) {
        cliente = await prisma.cliente.create({
          data: {
            id: crypto.randomUUID(),
            negocioId: negocio.id,
            nombre: customerName.trim(),
            telefono: customerPhone.trim(),
            updatedAt: new Date()
          }
        });
      }
    }

    if (!cliente) {
      cliente = await prisma.cliente.findFirst({
        where: { negocioId: negocio.id }
      });
    }

    if (!cliente) {
      return NextResponse.json(
        { error: 'Debes estar registrado como socio para reservar' },
        { status: 400 }
      );
    }

    // Crear la reserva
    const booking = await (prisma as any).gymClassBooking.create({
      data: {
        businessId: negocio.id,
        classId,
        customerId: cliente.id,
        date: new Date(),
        status: 'CONFIRMED'
      }
    });

    return NextResponse.json({
      success: true,
      message: '¡Cupo reservado con éxito!',
      booking: {
        id: booking.id,
        className: gymClass.name,
        coach: gymClass.coach,
        time: gymClass.startTime,
        room: gymClass.room
      }
    });
  } catch (error: any) {
    console.error('[API_PUBLIC_GYM_CLASSES_POST]', error);
    return NextResponse.json({ error: error.message || 'Error al reservar clase' }, { status: 500 });
  }
}
