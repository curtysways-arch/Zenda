import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

async function getSessionNegocioId() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return null;

  let negocioId = (session.user as any).negocioId;
  if (!negocioId && session.user.email) {
    const u = await prisma.usuario.findUnique({ where: { email: session.user.email } });
    negocioId = u?.negocioId;
  }
  return negocioId || null;
}

export async function GET(req: NextRequest) {
  try {
    const negocioId = await getSessionNegocioId();
    if (!negocioId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const clienteId = searchParams.get('clienteId');

    const whereClause: any = { negocioId };
    if (clienteId) {
      whereClause.clienteId = clienteId;
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        service: { select: { id: true, nombre: true, precio: true, duracion: true } },
        staff: { select: { id: true, name: true, role: true } },
        cliente: { select: { id: true, nombre: true, telefono: true, email: true } }
      },
      orderBy: { fecha: 'desc' },
      take: 50
    });

    return NextResponse.json({ appointments });
  } catch (error) {
    console.error('Error al obtener citas dentales:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const negocioId = await getSessionNegocioId();
    if (!negocioId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { clienteId, serviceId, staffId, fecha, horaInicio, duracionMinutos, comentarios, estado } = body;

    if (!clienteId || !serviceId || !fecha || !horaInicio) {
      return NextResponse.json({ error: 'Faltan campos requeridos (cliente, servicio, fecha u hora)' }, { status: 400 });
    }

    // 1. Validar pertenencia del cliente al negocio (Multi-Tenant)
    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
      select: { id: true, negocioId: true, nombre: true, telefono: true }
    });
    if (!cliente || cliente.negocioId !== negocioId) {
      return NextResponse.json({ error: 'Paciente no encontrado en este consultorio' }, { status: 403 });
    }

    // 2. Validar servicio
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { id: true, negocioId: true, nombre: true, precio: true, duracion: true }
    });
    if (!service || service.negocioId !== negocioId) {
      return NextResponse.json({ error: 'Servicio odontológico no válido para este consultorio' }, { status: 400 });
    }

    // 3. Validar staff opcional
    if (staffId) {
      const st = await prisma.staff.findUnique({
        where: { id: staffId },
        select: { id: true, businessId: true }
      });
      if (!st || st.businessId !== negocioId) {
        return NextResponse.json({ error: 'Especialista odontológico no válido' }, { status: 400 });
      }
    }

    // 4. Calcular hora fin según duración
    const durMins = Number(duracionMinutos) || service.duracion || 45;
    const [h, m] = horaInicio.split(':').map(Number);
    const startTotalMinutes = (h || 0) * 60 + (m || 0);
    const endTotalMinutes = startTotalMinutes + durMins;
    const endH = Math.floor(endTotalMinutes / 60) % 24;
    const endM = endTotalMinutes % 60;
    const horaFin = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

    // Normalizar fecha
    const parsedDate = new Date(fecha);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 });
    }

    // 5. Crear la cita
    const newAppointment = await prisma.appointment.create({
      data: {
        id: crypto.randomUUID(),
        negocioId,
        clienteId,
        serviceId,
        staffId: staffId || null,
        fecha: parsedDate,
        horaInicio,
        horaFin,
        duracion: Math.max(1, Math.round(durMins / 60)),
        estado: estado || 'confirmed',
        total: service.precio || 0,
        comentarios: comentarios || `Cita odontológica: ${service.nombre}`,
        created_by_business: true,
        updatedAt: new Date()
      },
      include: {
        service: { select: { id: true, nombre: true, precio: true } },
        staff: { select: { id: true, name: true, role: true } }
      }
    });

    return NextResponse.json({ appointment: newAppointment }, { status: 201 });
  } catch (error) {
    console.error('Error creando cita odontológica:', error);
    return NextResponse.json({ error: 'Error interno del servidor al crear cita' }, { status: 500 });
  }
}
