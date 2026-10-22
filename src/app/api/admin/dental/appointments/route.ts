import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import {
  getDentalContext,
  jsonError,
  cleanText,
  isValidDateKey,
  isValidTime,
  timeToMinutes,
  minutesToTime,
  localDateKey,
  localTimeKey,
  dayRangeUTC,
  INACTIVE_APPOINTMENT_STATES,
} from '@/modules/dental/server/context';

export const dynamic = 'force-dynamic';

/** Devuelve un mensaje si el doctor o el paciente ya tienen otra cita activa que se cruza con ese horario. */
async function findClash(opts: {
  negocioId: string; fecha: string; startMin: number; endMin: number;
  staffId: string | null; clienteId: string; excludeId?: string;
}): Promise<string | null> {
  const { start, end } = dayRangeUTC(opts.fecha);
  const sameDay = await prisma.appointment.findMany({
    where: {
      negocioId: opts.negocioId,
      fecha: { gte: start, lte: end },
      estado: { notIn: INACTIVE_APPOINTMENT_STATES },
      ...(opts.excludeId ? { id: { not: opts.excludeId } } : {}),
      OR: [...(opts.staffId ? [{ staffId: opts.staffId }] : []), { clienteId: opts.clienteId }],
    },
    select: { horaInicio: true, horaFin: true, clienteId: true, estado: true, expiresAt: true },
  });
  const now = new Date();
  const clash = sameDay.find((a) => {
    const pendingExpired = ['pending', 'PENDIENTE', 'pendiente'].includes(a.estado) && a.expiresAt && a.expiresAt < now;
    if (pendingExpired) return false;
    return timeToMinutes(a.horaInicio) < opts.endMin && timeToMinutes(a.horaFin) > opts.startMin;
  });
  if (!clash) return null;
  const who = clash.clienteId === opts.clienteId ? 'El paciente ya tiene' : 'El doctor ya tiene';
  return `${who} una cita de ${clash.horaInicio} a ${clash.horaFin} ese día.`;
}

export async function GET(req: NextRequest) {
  try {
    const access = await getDentalContext();
    if (!access.ok) return access.response;
    const { negocioId } = access.ctx;

    const { searchParams } = new URL(req.url);
    const where: any = { negocioId };
    const clienteId = searchParams.get('clienteId');
    if (clienteId) where.clienteId = clienteId;
    const fecha = searchParams.get('fecha');
    if (fecha && isValidDateKey(fecha)) {
      const { start, end } = dayRangeUTC(fecha);
      where.fecha = { gte: start, lte: end };
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        service: { select: { id: true, nombre: true, precio: true, duracion: true } },
        staff: { select: { id: true, name: true, role: true } },
        cliente: { select: { id: true, nombre: true, telefono: true, email: true } },
      },
      orderBy: [{ fecha: 'desc' }, { horaInicio: 'desc' }],
      take: 200,
    });
    return NextResponse.json({ success: true, appointments });
  } catch (err) {
    console.error('Error en GET /api/admin/dental/appointments:', err);
    return jsonError('No se pudieron cargar las citas.', 500);
  }
}

/**
 * POST — agenda una cita desde la ficha del paciente.
 * Valida que el doctor no tenga otra cita en el mismo horario.
 */
export async function POST(req: NextRequest) {
  try {
    const access = await getDentalContext();
    if (!access.ok) return access.response;
    const { negocioId, timeZone } = access.ctx;

    const body = await req.json().catch(() => ({}));
    const { clienteId, serviceId, staffId, fecha, horaInicio } = body;

    if (!clienteId || !serviceId) return jsonError('Elige el paciente y el servicio.');
    if (!isValidDateKey(fecha)) return jsonError('La fecha no es válida.');
    if (!isValidTime(horaInicio)) return jsonError('La hora no es válida.');

    const today = localDateKey(timeZone);
    if (fecha < today || (fecha === today && horaInicio < localTimeKey(timeZone))) {
      return jsonError('No se puede agendar en una fecha u hora que ya pasó.');
    }

    const [cliente, service] = await Promise.all([
      prisma.cliente.findUnique({ where: { id: String(clienteId) }, select: { negocioId: true } }),
      prisma.service.findUnique({
        where: { id: String(serviceId) },
        select: { negocioId: true, nombre: true, precio: true, duracion: true },
      }),
    ]);
    if (!cliente || cliente.negocioId !== negocioId) return jsonError('Paciente no encontrado.', 404);
    if (!service || service.negocioId !== negocioId) return jsonError('El servicio no pertenece a la clínica.');

    if (staffId) {
      const st = await prisma.staff.findUnique({ where: { id: String(staffId) }, select: { businessId: true, active: true } });
      if (!st || st.businessId !== negocioId) return jsonError('El doctor seleccionado no pertenece a la clínica.');
      if (st.active === false) return jsonError('El doctor seleccionado está inactivo.');
    }

    const durMins = Math.min(Math.max(Number(body.duracionMinutos) || service.duracion || 45, 10), 8 * 60);
    const startMin = timeToMinutes(horaInicio);
    const endMin = startMin + durMins;
    if (endMin > 24 * 60) return jsonError('La cita no puede terminar después de la medianoche.');
    const horaFin = minutesToTime(endMin);

    const { start } = dayRangeUTC(fecha);

    const clash = await findClash({ negocioId, fecha, startMin, endMin, staffId: staffId ? String(staffId) : null, clienteId: String(clienteId) });
    if (clash) return jsonError(clash, 409);

    const appointment = await prisma.appointment.create({
      data: {
        id: crypto.randomUUID(),
        negocioId,
        clienteId: String(clienteId),
        serviceId: String(serviceId),
        staffId: staffId ? String(staffId) : null,
        fecha: start,
        horaInicio,
        horaFin,
        // El campo "duracion" de la reserva se guarda en horas (convención del resto de la app).
        duracion: Math.max(1, Math.round(durMins / 60)),
        estado: 'confirmed',
        total: Number(service.precio) || 0,
        comentarios: cleanText(body.comentarios, 500),
        created_by_business: true,
        updatedAt: new Date(),
      },
      include: {
        service: { select: { id: true, nombre: true, precio: true } },
        staff: { select: { id: true, name: true, role: true } },
      },
    });

    return NextResponse.json({ success: true, appointment }, { status: 201 });
  } catch (err) {
    console.error('Error en POST /api/admin/dental/appointments:', err);
    return jsonError('No se pudo agendar la cita.', 500);
  }
}

/**
 * PATCH — reprogramar una cita: fecha, hora, duración y/o doctor.
 * No se permite en citas atendidas, canceladas o vencidas.
 */
export async function PATCH(req: NextRequest) {
  try {
    const access = await getDentalContext();
    if (!access.ok) return access.response;
    const { negocioId, timeZone } = access.ctx;

    const body = await req.json().catch(() => ({}));
    const id = typeof body.id === 'string' ? body.id : '';
    const appt = await prisma.appointment.findUnique({
      where: { id },
      select: { id: true, negocioId: true, clienteId: true, staffId: true, fecha: true, horaInicio: true, horaFin: true, estado: true },
    });
    if (!appt || appt.negocioId !== negocioId) return jsonError('Cita no encontrada.', 404);
    if ([...INACTIVE_APPOINTMENT_STATES, 'completed', 'finalizada'].includes(appt.estado)) {
      return jsonError('Esta cita ya no se puede reprogramar.', 409);
    }

    const fecha: string = body.fecha ?? appt.fecha.toISOString().slice(0, 10);
    const horaInicio: string = body.horaInicio ?? appt.horaInicio;
    if (!isValidDateKey(fecha)) return jsonError('La fecha no es válida.');
    if (!isValidTime(horaInicio)) return jsonError('La hora no es válida.');

    const today = localDateKey(timeZone);
    if (fecha < today || (fecha === today && horaInicio < localTimeKey(timeZone))) {
      return jsonError('No se puede mover la cita a una fecha u hora que ya pasó.');
    }

    let staffId: string | null = appt.staffId;
    if (body.staffId !== undefined) {
      if (!body.staffId) staffId = null;
      else {
        const st = await prisma.staff.findUnique({ where: { id: String(body.staffId) }, select: { businessId: true, active: true } });
        if (!st || st.businessId !== negocioId) return jsonError('El doctor seleccionado no pertenece a la clínica.');
        if (st.active === false) return jsonError('El doctor seleccionado está inactivo.');
        staffId = String(body.staffId);
      }
    }

    const prevDuration = Math.max(10, timeToMinutes(appt.horaFin) - timeToMinutes(appt.horaInicio));
    const durMins = Math.min(Math.max(Number(body.duracionMinutos) || prevDuration, 10), 8 * 60);
    const startMin = timeToMinutes(horaInicio);
    const endMin = startMin + durMins;
    if (endMin > 24 * 60) return jsonError('La cita no puede terminar después de la medianoche.');

    const clash = await findClash({ negocioId, fecha, startMin, endMin, staffId, clienteId: appt.clienteId, excludeId: appt.id });
    if (clash) return jsonError(clash, 409);

    const updated = await prisma.appointment.update({
      where: { id: appt.id },
      data: {
        fecha: dayRangeUTC(fecha).start,
        horaInicio,
        horaFin: minutesToTime(endMin),
        duracion: Math.max(1, Math.round(durMins / 60)),
        staffId,
        // Al moverla se vuelven a enviar los recordatorios automáticos.
        reminderDaySent: false,
        reminder2HSent: false,
        ...(body.comentarios !== undefined ? { comentarios: cleanText(body.comentarios, 500) } : {}),
        updatedAt: new Date(),
      },
      select: { id: true, fecha: true, horaInicio: true, horaFin: true, staffId: true },
    });

    return NextResponse.json({ success: true, appointment: updated });
  } catch (err) {
    console.error('Error en PATCH /api/admin/dental/appointments:', err);
    return jsonError('No se pudo reprogramar la cita.', 500);
  }
}
