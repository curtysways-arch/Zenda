import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  getDentalContext,
  jsonError,
  localDateKey,
  dayRangeUTC,
  addDaysKey,
  INACTIVE_APPOINTMENT_STATES,
} from '@/modules/dental/server/context';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/dental/dashboard-stats
 * Resumen del día para el consultorio, calculado con la zona horaria de la clínica.
 */
export async function GET() {
  try {
    const access = await getDentalContext();
    if (!access.ok) return access.response;
    const { negocioId, timeZone } = access.ctx;

    const todayKey = localDateKey(timeZone);
    const { start: todayStart, end: todayEnd } = dayRangeUTC(todayKey);
    const weekEnd = dayRangeUTC(addDaysKey(todayKey, 7)).end;
    const monthStartKey = `${todayKey.slice(0, 7)}-01`;
    const monthStart = dayRangeUTC(monthStartKey).start;

    const activeState = { notIn: INACTIVE_APPOINTMENT_STATES };

    const [citasHoy, proximas, pacientesTotal, pacientesNuevosMes, tratamientosActivos, encountersHoy, porConfirmar] =
      await Promise.all([
        prisma.appointment.findMany({
          where: { negocioId, fecha: { gte: todayStart, lte: todayEnd }, estado: activeState },
          include: {
            cliente: { select: { id: true, nombre: true, telefono: true } },
            service: { select: { id: true, nombre: true } },
            staff: { select: { id: true, name: true } },
          },
          orderBy: { horaInicio: 'asc' },
        }),
        prisma.appointment.findMany({
          where: { negocioId, fecha: { gt: todayEnd, lte: weekEnd }, estado: activeState },
          include: {
            cliente: { select: { id: true, nombre: true } },
            service: { select: { id: true, nombre: true } },
            staff: { select: { id: true, name: true } },
          },
          orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }],
          take: 8,
        }),
        prisma.cliente.count({ where: { negocioId } }),
        prisma.cliente.count({ where: { negocioId, createdAt: { gte: monthStart } } }),
        prisma.dentalTreatment.findMany({
          where: { negocioId, estado: { in: ['PLANIFICADO', 'PENDIENTE', 'EN_PROCESO'] } },
          select: { costoEstimado: true },
        }),
        prisma.clinicalEncounter.findMany({
          where: { negocioId, appointmentId: { not: null }, fecha: { gte: todayStart } },
          select: { appointmentId: true },
        }),
        prisma.appointment.count({
          where: { negocioId, fecha: { gte: todayStart }, estado: { in: ['pending', 'PENDIENTE', 'pendiente'] } },
        }),
      ]);

    const withNotes = new Set(encountersHoy.map((e) => e.appointmentId));
    const atendidas = citasHoy.filter((c) => ['completed', 'finalizada'].includes(c.estado)).length;
    const presupuestoPendiente = tratamientosActivos.reduce((s, t) => s + (Number(t.costoEstimado) || 0), 0);

    return NextResponse.json({
      success: true,
      today: todayKey,
      stats: {
        citasHoy: citasHoy.length,
        atendidasHoy: atendidas,
        porConfirmar,
        proximos7Dias: proximas.length,
        pacientesTotal,
        pacientesNuevosMes,
        tratamientosEnProceso: tratamientosActivos.length,
        presupuestoPendiente: Math.round(presupuestoPendiente * 100) / 100,
      },
      agendaHoy: citasHoy.map((c) => ({ ...c, tieneEvolucion: withNotes.has(c.id) })),
      proximasCitas: proximas,
    });
  } catch (err) {
    console.error('Error en GET /api/admin/dental/dashboard-stats:', err);
    return jsonError('No se pudo cargar el resumen.', 500);
  }
}
