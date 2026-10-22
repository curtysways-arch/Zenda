import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  getDentalContext,
  jsonError,
  isValidDateKey,
  localDateKey,
  localTimeKey,
  dayRangeUTC,
  addDaysKey,
} from '@/modules/dental/server/context';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/dental/agenda?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Citas, bloqueos y doctores del rango pedido (máximo 31 días), con el horario de la clínica.
 */
export async function GET(req: NextRequest) {
  try {
    const access = await getDentalContext();
    if (!access.ok) return access.response;
    const { negocioId, timeZone } = access.ctx;

    const { searchParams } = new URL(req.url);
    const today = localDateKey(timeZone);
    let from = searchParams.get('from') || today;
    let to = searchParams.get('to') || from;
    if (!isValidDateKey(from) || !isValidDateKey(to)) return jsonError('Rango de fechas no válido.');
    if (to < from) [from, to] = [to, from];
    if (to > addDaysKey(from, 31)) to = addDaysKey(from, 31);

    const start = dayRangeUTC(from).start;
    const end = dayRangeUTC(to).end;

    const [negocio, appointments, blocks, staff, pendingTotal] = await Promise.all([
      prisma.negocio.findUnique({ where: { id: negocioId }, select: { horarioApertura: true, horarioCierre: true, slug: true } }),
      prisma.appointment.findMany({
        where: { negocioId, fecha: { gte: start, lte: end } },
        select: {
          id: true, fecha: true, horaInicio: true, horaFin: true, estado: true, comentarios: true,
          total: true, pagoEstado: true, staffId: true, clienteId: true, expiresAt: true, checkedInAt: true,
          cliente: { select: { id: true, nombre: true, telefono: true } },
          service: { select: { id: true, nombre: true, duracion: true } },
          staff: { select: { id: true, name: true } },
          clinicalEncounters: { select: { id: true }, take: 1 },
        },
        orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }],
      }),
      prisma.bloqueo.findMany({
        where: { negocioId, fecha: { gte: start, lte: end } },
        select: { id: true, fecha: true, horaInicio: true, horaFin: true, motivo: true, staffId: true, serviceId: true },
      }),
      prisma.staff.findMany({
        where: { businessId: negocioId, active: true },
        select: { id: true, name: true, role: true },
        orderBy: { name: 'asc' },
      }),
      prisma.appointment.count({
        where: { negocioId, fecha: { gte: dayRangeUTC(today).start }, estado: { in: ['pending', 'PENDIENTE', 'pendiente'] } },
      }),
    ]);

    const now = new Date();
    return NextResponse.json({
      success: true,
      today,
      nowTime: localTimeKey(timeZone),
      from,
      to,
      hours: { open: negocio?.horarioApertura || '08:00', close: negocio?.horarioCierre || '19:00' },
      slug: negocio?.slug || null,
      pendingTotal,
      staff,
      blocks,
      appointments: appointments.map(({ clinicalEncounters, expiresAt, ...a }) => ({
        ...a,
        // Una solicitud pendiente cuyo plazo para confirmar ya venció se muestra como vencida.
        estado: ['pending', 'PENDIENTE', 'pendiente'].includes(a.estado) && expiresAt && expiresAt < now ? 'expired' : a.estado,
        tieneEvolucion: clinicalEncounters.length > 0,
      })),
    });
  } catch (err) {
    console.error('Error en GET /api/admin/dental/agenda:', err);
    return jsonError('No se pudo cargar la agenda.', 500);
  }
}
