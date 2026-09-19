import { NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import prisma from '@/lib/prisma';

export async function GET() {
  const session = await getEffectiveAdminSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const negocioId = (session.user as any).negocioId;
  if (!negocioId) {
    return NextResponse.json({ error: 'No tienes un negocio asociado' }, { status: 400 });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const classes = await (prisma as any).gymClass.findMany({
      where: { businessId: negocioId },
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

    const formattedClasses = classes.map((c: any) => ({
      id: c.id,
      name: c.name,
      description: c.description || '',
      coach: c.coach,
      category: c.category || 'General',
      room: c.room || 'Sala General',
      daysOfWeek: c.daysOfWeek || 'LUN,MIE,VIE',
      startTime: c.startTime,
      durationMinutes: c.durationMinutes || 45,
      capacity: c.capacity || 20,
      color: c.color || '#ea580c',
      active: c.active,
      enrolledToday: c._count?.bookings || 0
    }));

    return NextResponse.json({
      success: true,
      classes: formattedClasses
    });
  } catch (error: any) {
    console.error('[API_ADMIN_GYM_CLASSES_GET]', error);
    return NextResponse.json({ error: error.message || 'Error al obtener clases' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getEffectiveAdminSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const negocioId = (session.user as any).negocioId;
  if (!negocioId) {
    return NextResponse.json({ error: 'No tienes un negocio asociado' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const {
      name,
      coach,
      category,
      room,
      daysOfWeek,
      startTime,
      durationMinutes,
      capacity,
      color,
      description
    } = body;

    if (!name?.trim() || !coach?.trim() || !startTime?.trim()) {
      return NextResponse.json(
        { error: 'Nombre, coach y hora de inicio son requeridos' },
        { status: 400 }
      );
    }

    const newClass = await (prisma as any).gymClass.create({
      data: {
        businessId: negocioId,
        name: name.trim(),
        coach: coach.trim(),
        category: category?.trim() || 'General',
        room: room?.trim() || 'Sala General',
        daysOfWeek: daysOfWeek?.trim() || 'LUN,MIE,VIE',
        startTime: startTime.trim(),
        durationMinutes: Number(durationMinutes) || 45,
        capacity: Number(capacity) || 20,
        color: color || '#ea580c',
        description: description?.trim() || null,
        active: true
      }
    });

    return NextResponse.json({
      success: true,
      gymClass: newClass
    });
  } catch (error: any) {
    console.error('[API_ADMIN_GYM_CLASSES_POST]', error);
    return NextResponse.json({ error: error.message || 'Error al crear clase' }, { status: 500 });
  }
}
