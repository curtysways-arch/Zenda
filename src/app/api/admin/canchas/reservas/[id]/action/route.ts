// src/app/api/admin/canchas/reservas/[id]/action/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import { BranchAccessService } from '@/core/branch/BranchAccessService';

// Normaliza horas en formato "HH:mm"
function normalizeTime(raw: string): string {
  if (!raw) return '08:00';
  const str = raw.trim().toUpperCase();
  const isPM = str.includes('PM');
  const isAM = str.includes('AM');
  const parts = str.replace(/[^0-9:]/g, '').split(':').filter(Boolean);
  let h = parseInt(parts[0] || '8', 10);
  let m = parseInt(parts[1] || '0', 10);
  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;
  if (isNaN(h) || h < 0 || h > 23) h = 8;
  if (isNaN(m) || m < 0 || m > 59) m = 0;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// Suma minutos a una hora "HH:mm"
function addMinutesToTime(timeStr: string, minutesToAdd: number): string {
  const [h, m] = timeStr.split(':').map(Number);
  const totalMins = (h || 0) * 60 + (m || 0) + minutesToAdd;
  const newH = Math.floor(totalMins / 60) % 24;
  const newM = totalMins % 60;
  return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
}

// Calcula la diferencia en minutos entre dos horas "HH:mm"
function diffMinutes(startStr: string, endStr: string): number {
  const [h1, m1] = startStr.split(':').map(Number);
  const [h2, m2] = endStr.split(':').map(Number);
  return ((h2 || 0) * 60 + (m2 || 0)) - ((h1 || 0) * 60 + (m1 || 0));
}

// Helper para registrar en AdminAuditLog de forma segura
async function logAudit(params: {
  adminUserId: string;
  accion: string;
  targetId: string;
  descripcion: string;
  datosAntes?: any;
  datosDespues?: any;
}) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        id: crypto.randomUUID(),
        adminUserId: params.adminUserId,
        accion: params.accion,
        modulo: 'SPORTS_COURTS',
        targetId: params.targetId,
        targetType: 'Appointment',
        descripcion: params.descripcion,
        datosAntes: params.datosAntes ? JSON.stringify(params.datosAntes) : null,
        datosDespues: params.datosDespues ? JSON.stringify(params.datosDespues) : null,
        resultado: 'EXITOSO'
      }
    });
  } catch (err) {
    console.error('[AdminAuditLog] No se pudo guardar log:', err);
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getEffectiveAdminSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id: rawId } = await params;
    const appointmentId = rawId.trim();
    const body = await req.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({ error: 'Acción requerida' }, { status: 400 });
    }

    // 1. Obtener la reserva y validar tenencia (Multi-Tenancy)
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        service: true,
        cliente: true,
        negocio: true,
        branch: true,
        pagoReserva: true
      }
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
    }

    const sessionNegocioId = (session.user as any).negocioId;
    const userRole = ((session.user as any).role || '').toUpperCase();
    const isSuperAdmin = userRole === 'SUPERADMIN' || (session.user as any).roles?.includes('SUPERADMIN');

    if (!isSuperAdmin && sessionNegocioId !== appointment.negocioId) {
      return NextResponse.json({ error: 'Acceso denegado a este recurso' }, { status: 403 });
    }

    // Validación de Sucursal si corresponde
    if (appointment.branchId) {
      try {
        await BranchAccessService.requireBranchAccess(
          session.user as any,
          appointment.negocioId,
          appointment.branchId
        );
      } catch (branchErr: any) {
        return NextResponse.json({ error: 'Acceso no autorizado a la sucursal de esta reserva' }, { status: 403 });
      }
    }

    const now = new Date();
    const currentStatus = appointment.estado;
    const currentHoraInicio = appointment.horaInicio;
    const currentHoraFin = appointment.horaFin;
    const canchaId = appointment.serviceId;
    const fechaReserva = appointment.fecha;

    // ─────────────────────────────────────────────────────────────
    // ACCIONES OPERATIVAS CONTEXTUALES
    // ─────────────────────────────────────────────────────────────

    // 1. CONFIRMAR RESERVA
    if (action === 'CONFIRM') {
      const updated = await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          estado: 'confirmed',
          expiresAt: null,
          updatedAt: now
        }
      });

      await logAudit({
        adminUserId: (session.user as any).id,
        accion: 'RESERVATION_CONFIRMED',
        targetId: appointment.id,
        descripcion: `Reserva confirmada para ${appointment.cliente?.nombre || 'Cliente'} en ${appointment.service?.nombre}`,
        datosAntes: { estado: currentStatus },
        datosDespues: { estado: 'confirmed' }
      });

      return NextResponse.json({ success: true, appointment: updated });
    }

    // 2. REGISTRAR LLEGADA DEL CLIENTE (CHECK-IN)
    if (action === 'CHECK_IN') {
      const updated = await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          estado: 'client_checked_in',
          checkedInAt: appointment.checkedInAt || now,
          updatedAt: now
        }
      });

      await logAudit({
        adminUserId: (session.user as any).id,
        accion: 'RESERVATION_ARRIVAL',
        targetId: appointment.id,
        descripcion: `Cliente ${appointment.cliente?.nombre || 'Cliente'} se presentó en el establecimiento a las ${now.toLocaleTimeString()}`,
        datosAntes: { estado: currentStatus, checkedInAt: appointment.checkedInAt },
        datosDespues: { estado: 'client_checked_in', checkedInAt: updated.checkedInAt }
      });

      return NextResponse.json({ success: true, appointment: updated });
    }

    // 3. INICIAR PARTIDO (USO REAL DE LA CANCHA)
    if (action === 'START_MATCH') {
      const updated = await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          estado: 'in_progress',
          startedAt: appointment.startedAt || now,
          checkedInAt: appointment.checkedInAt || now, // auto-checkin si no se marcó antes
          updatedAt: now
        }
      });

      await logAudit({
        adminUserId: (session.user as any).id,
        accion: 'RESERVATION_STARTED',
        targetId: appointment.id,
        descripcion: `Partido iniciado en ${appointment.service?.nombre} a las ${now.toLocaleTimeString()}`,
        datosAntes: { estado: currentStatus, startedAt: appointment.startedAt },
        datosDespues: { estado: 'in_progress', startedAt: updated.startedAt }
      });

      return NextResponse.json({ success: true, appointment: updated });
    }

    // 4. FINALIZAR PARTIDO
    if (action === 'FINISH_MATCH') {
      const updated = await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          estado: 'completed',
          completedAt: appointment.completedAt || now,
          updatedAt: now
        }
      });

      await logAudit({
        adminUserId: (session.user as any).id,
        accion: 'RESERVATION_FINISHED',
        targetId: appointment.id,
        descripcion: `Partido finalizado en ${appointment.service?.nombre}. Duración real registrada.`,
        datosAntes: { estado: currentStatus, completedAt: appointment.completedAt },
        datosDespues: { estado: 'completed', completedAt: updated.completedAt }
      });

      return NextResponse.json({ success: true, appointment: updated });
    }

    // 5. EXTENDER TIEMPO (+30 min, +60 min, etc.)
    if (action === 'EXTEND') {
      const additionalMinutes = Number(body.additionalMinutes);
      if (!additionalMinutes || additionalMinutes <= 0) {
        return NextResponse.json({ error: 'Cantidad de minutos a extender inválida' }, { status: 400 });
      }

      const nuevaHoraFin = addMinutesToTime(currentHoraFin, additionalMinutes);

      // VALIDAR DISPONIBILIDAD ESTRICTA EN BACKEND (Evitar colisión / dobles reservas)
      const conflictoReserva = await prisma.appointment.findFirst({
        where: {
          serviceId: canchaId,
          fecha: fechaReserva,
          id: { not: appointment.id },
          estado: { notIn: ['cancelled', 'CANCELADA', 'rejected', 'RECHAZADA', 'no_show', 'NO_SHOW'] },
          AND: [
            { horaInicio: { lt: nuevaHoraFin } },
            { horaFin: { gt: currentHoraFin } }
          ]
        },
        include: { cliente: { select: { nombre: true } } }
      });

      if (conflictoReserva) {
        return NextResponse.json({
          error: `No hay disponibilidad para extender: El turno de ${conflictoReserva.cliente?.nombre || 'otro jugador'} inicia a las ${conflictoReserva.horaInicio}`
        }, { status: 409 });
      }

      const conflictoBloqueo = await prisma.bloqueo.findFirst({
        where: {
          serviceId: canchaId,
          fecha: fechaReserva,
          AND: [
            { horaInicio: { lt: nuevaHoraFin } },
            { horaFin: { gt: currentHoraFin } }
          ]
        }
      });

      if (conflictoBloqueo) {
        return NextResponse.json({
          error: `No hay disponibilidad: La cancha tiene un bloqueo programado a las ${conflictoBloqueo.horaInicio} (${conflictoBloqueo.motivo || 'Mantenimiento'})`
        }, { status: 409 });
      }

      // Calcular importe adicional proporcional a la tarifa por hora de la cancha
      const precioPorHora = appointment.service?.precio || 0;
      const costoAdicional = Math.round((precioPorHora * (additionalMinutes / 60)) * 100) / 100;
      const nuevoTotal = (appointment.total || 0) + costoAdicional;
      const duracionTotalMins = diffMinutes(currentHoraInicio, nuevaHoraFin);
      const nuevaDuracionHoras = Math.max(Math.round(duracionTotalMins / 60), 1);

      const updated = await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          horaFin: nuevaHoraFin,
          duracion: nuevaDuracionHoras,
          total: nuevoTotal,
          comentarios: appointment.comentarios
            ? `${appointment.comentarios} | Extensión +${additionalMinutes}m (+$${costoAdicional})`
            : `Extensión +${additionalMinutes}m (+$${costoAdicional})`,
          updatedAt: now
        }
      });

      await logAudit({
        adminUserId: (session.user as any).id,
        accion: 'RESERVATION_EXTENDED',
        targetId: appointment.id,
        descripcion: `Reserva extendida en ${additionalMinutes} min (${currentHoraFin} -> ${nuevaHoraFin}). Tarifa adicional: $${costoAdicional}`,
        datosAntes: { horaFin: currentHoraFin, total: appointment.total },
        datosDespues: { horaFin: nuevaHoraFin, total: nuevoTotal, costoAdicional }
      });

      return NextResponse.json({
        success: true,
        appointment: updated,
        nuevaHoraFin,
        costoAdicional,
        nuevoTotal
      });
    }

    // 6. CAMBIAR CANCHA (RECURSO)
    if (action === 'CHANGE_COURT') {
      const newCanchaId = body.newCanchaId || body.newCourtId;
      if (!newCanchaId || newCanchaId === canchaId) {
        return NextResponse.json({ error: 'Debe seleccionar una cancha diferente' }, { status: 400 });
      }

      // Validar que la nueva cancha pertenece al negocio y está activa
      const targetCancha = await prisma.service.findFirst({
        where: {
          id: newCanchaId,
          negocioId: appointment.negocioId,
          estaActivo: true
        }
      });

      if (!targetCancha) {
        return NextResponse.json({ error: 'La cancha seleccionada no existe o no pertenece a este negocio' }, { status: 404 });
      }

      // Validar disponibilidad de la nueva cancha en el mismo horario
      const conflictoNuevaCancha = await prisma.appointment.findFirst({
        where: {
          serviceId: newCanchaId,
          fecha: fechaReserva,
          id: { not: appointment.id },
          estado: { notIn: ['cancelled', 'CANCELADA', 'rejected', 'RECHAZADA', 'no_show', 'NO_SHOW'] },
          AND: [
            { horaInicio: { lt: currentHoraFin } },
            { horaFin: { gt: currentHoraInicio } }
          ]
        },
        include: { cliente: { select: { nombre: true } } }
      });

      if (conflictoNuevaCancha) {
        return NextResponse.json({
          error: `La cancha ${targetCancha.nombre} está ocupada por ${conflictoNuevaCancha.cliente?.nombre || 'otro turno'} (${conflictoNuevaCancha.horaInicio}-${conflictoNuevaCancha.horaFin})`
        }, { status: 409 });
      }

      const conflictoBloqueoNueva = await prisma.bloqueo.findFirst({
        where: {
          serviceId: newCanchaId,
          fecha: fechaReserva,
          AND: [
            { horaInicio: { lt: currentHoraFin } },
            { horaFin: { gt: currentHoraInicio } }
          ]
        }
      });

      if (conflictoBloqueoNueva) {
        return NextResponse.json({
          error: `La cancha ${targetCancha.nombre} tiene un bloqueo de ${conflictoBloqueoNueva.horaInicio} a ${conflictoBloqueoNueva.horaFin}`
        }, { status: 409 });
      }

      const updated = await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          serviceId: newCanchaId,
          comentarios: appointment.comentarios
            ? `${appointment.comentarios} | Movido de ${appointment.service?.nombre} a ${targetCancha.nombre}`
            : `Movido a ${targetCancha.nombre}`,
          updatedAt: now
        }
      });

      await logAudit({
        adminUserId: (session.user as any).id,
        accion: 'RESERVATION_COURT_CHANGED',
        targetId: appointment.id,
        descripcion: `Cancha cambiada de "${appointment.service?.nombre}" a "${targetCancha.nombre}"`,
        datosAntes: { serviceId: canchaId, canchaNombre: appointment.service?.nombre },
        datosDespues: { serviceId: newCanchaId, canchaNombre: targetCancha.nombre }
      });

      return NextResponse.json({ success: true, appointment: updated, targetCancha });
    }

    // 7. CAMBIAR HORARIO
    if (action === 'CHANGE_TIME') {
      const { newStartTime, newEndTime, newDate } = body;
      if (!newStartTime || !newEndTime) {
        return NextResponse.json({ error: 'Horas de inicio y fin requeridas' }, { status: 400 });
      }

      const cleanInicio = normalizeTime(newStartTime);
      const cleanFin = normalizeTime(newEndTime);

      let targetFecha = fechaReserva;
      if (newDate) {
        const [y, m, d] = newDate.split('-').map(Number);
        targetFecha = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
      }

      // Validar solapamiento
      const conflicto = await prisma.appointment.findFirst({
        where: {
          serviceId: canchaId,
          fecha: targetFecha,
          id: { not: appointment.id },
          estado: { notIn: ['cancelled', 'CANCELADA', 'rejected', 'RECHAZADA', 'no_show', 'NO_SHOW'] },
          AND: [
            { horaInicio: { lt: cleanFin } },
            { horaFin: { gt: cleanInicio } }
          ]
        },
        include: { cliente: { select: { nombre: true } } }
      });

      if (conflicto) {
        return NextResponse.json({
          error: `Horario no disponible: Solapa con turno de ${conflicto.cliente?.nombre || 'otro jugador'} (${conflicto.horaInicio}-${conflicto.horaFin})`
        }, { status: 409 });
      }

      const durMins = diffMinutes(cleanInicio, cleanFin);
      const durHoras = Math.max(Math.round(durMins / 60), 1);

      const updated = await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          fecha: targetFecha,
          horaInicio: cleanInicio,
          horaFin: cleanFin,
          duracion: durHoras,
          updatedAt: now
        }
      });

      await logAudit({
        adminUserId: (session.user as any).id,
        accion: 'RESERVATION_TIME_CHANGED',
        targetId: appointment.id,
        descripcion: `Horario modificado de ${currentHoraInicio}-${currentHoraFin} a ${cleanInicio}-${cleanFin}`,
        datosAntes: { horaInicio: currentHoraInicio, horaFin: currentHoraFin },
        datosDespues: { horaInicio: cleanInicio, horaFin: cleanFin }
      });

      return NextResponse.json({ success: true, appointment: updated });
    }

    // 8. MARCAR NO SHOW
    if (action === 'NO_SHOW') {
      if (appointment.checkedInAt) {
        return NextResponse.json({ error: 'No se puede marcar No-Show: El cliente ya tiene llegada registrada' }, { status: 400 });
      }

      const updated = await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          estado: 'no_show',
          updatedAt: now
        }
      });

      await logAudit({
        adminUserId: (session.user as any).id,
        accion: 'RESERVATION_NO_SHOW',
        targetId: appointment.id,
        descripcion: `Cliente ${appointment.cliente?.nombre || 'Cliente'} no se presentó al turno`,
        datosAntes: { estado: currentStatus },
        datosDespues: { estado: 'no_show' }
      });

      return NextResponse.json({ success: true, appointment: updated });
    }

    // 9. CANCELAR RESERVA
    if (action === 'CANCEL') {
      const motivo = body.motivo || 'Cancelado por administración';
      const updated = await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          estado: 'cancelled',
          comentarios: appointment.comentarios
            ? `${appointment.comentarios} | Motivo cancelación: ${motivo}`
            : `Motivo cancelación: ${motivo}`,
          updatedAt: now
        }
      });

      await logAudit({
        adminUserId: (session.user as any).id,
        accion: 'RESERVATION_CANCELLED',
        targetId: appointment.id,
        descripcion: `Reserva cancelada: ${motivo}`,
        datosAntes: { estado: currentStatus },
        datosDespues: { estado: 'cancelled', motivo }
      });

      return NextResponse.json({ success: true, appointment: updated });
    }

    // 10. ACTUALIZAR NOTAS OPERATIVAS
    if (action === 'UPDATE_NOTES') {
      const { notas } = body;
      const updated = await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          comentarios: notas ? notas.trim() : null,
          updatedAt: now
        }
      });

      return NextResponse.json({ success: true, appointment: updated });
    }

    return NextResponse.json({ error: `Acción no soportada: ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error('CRITICAL ERROR en action reserva canchas:', error);
    return NextResponse.json({ error: error?.message || 'Error interno del servidor' }, { status: 500 });
  }
}
