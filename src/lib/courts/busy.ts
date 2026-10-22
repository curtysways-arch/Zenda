/**
 * Horarios ocupados de las canchas de un negocio en un día (solo servidor):
 * reservas vigentes + bloqueos (mantenimiento, clima…) + clases de la academia.
 * Una reserva pendiente cuyo tiempo para confirmar ya venció no ocupa la cancha.
 */
import prisma from '@/lib/prisma';
import { ACTIVE_BOOKING_STATES_EXCLUDED, dayOfWeek, type Busy } from '@/lib/courts/slots';

export function dayRange(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return {
    start: new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0)),
    end: new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999)),
  };
}

export async function loadBusy(negocioId: string, dateStr: string, serviceIds?: string[], excludeAppointmentId?: string) {
  const { start, end } = dayRange(dateStr);
  const now = new Date();
  const serviceFilter = serviceIds && serviceIds.length ? { serviceId: { in: serviceIds } } : {};

  const [reservas, bloqueos, clases] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        negocioId,
        ...serviceFilter,
        fecha: { gte: start, lte: end },
        estado: { notIn: ACTIVE_BOOKING_STATES_EXCLUDED },
        ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
      },
      select: { serviceId: true, horaInicio: true, horaFin: true, estado: true, expiresAt: true },
    }),
    prisma.bloqueo.findMany({
      where: { negocioId, ...serviceFilter, fecha: { gte: start, lte: end } },
      select: { serviceId: true, horaInicio: true, horaFin: true, motivo: true },
    }),
    (prisma as any).courseSchedule
      .findMany({
        where: {
          ...(serviceIds && serviceIds.length ? { serviceId: { in: serviceIds } } : { Service: { negocioId } }),
          day_of_week: dayOfWeek(dateStr),
          Course: {
            status: 'active',
            AND: [
              { OR: [{ start_date: null }, { start_date: { lte: end } }] },
              { OR: [{ end_date: null }, { end_date: { gte: start } }] },
            ],
          },
        },
        select: { serviceId: true, start_time: true, end_time: true, Course: { select: { name: true } } },
      })
      .catch(() => []),
  ]);

  const map = new Map<string, Busy[]>();
  const add = (sid: string | null | undefined, b: Busy) => {
    if (!sid) return;
    if (!map.has(sid)) map.set(sid, []);
    map.get(sid)!.push(b);
  };
  for (const r of reservas) {
    const pendingExpired = ['pending', 'PENDIENTE', 'pendiente'].includes(String(r.estado)) && r.expiresAt && r.expiresAt < now;
    if (!pendingExpired) add(r.serviceId, { inicio: r.horaInicio, fin: r.horaFin, motivo: 'Reservada' });
  }
  for (const b of bloqueos) add(b.serviceId, { inicio: b.horaInicio, fin: b.horaFin, motivo: b.motivo || 'No disponible' });
  for (const c of clases as any[]) add(c.serviceId, { inicio: c.start_time, fin: c.end_time, motivo: `Clase: ${c.Course?.name || 'academia'}` });
  return map;
}
