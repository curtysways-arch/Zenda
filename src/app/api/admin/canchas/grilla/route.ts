// src/app/api/admin/canchas/grilla/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { CourtBookingService } from '@/modules/sports-courts/services/courtBookingService';
import { loadBusy } from '@/lib/courts/busy';
import { overlaps } from '@/lib/courts/slots';

const todayEc = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil' }).format(new Date());

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.negocioId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const negocioId = (session.user as any).negocioId;
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date') || todayEc();

    const resources = await CourtBookingService.getCourts(negocioId);
    const appointments = await CourtBookingService.getCourtAppointments(negocioId, dateStr);
    const stats = await CourtBookingService.getDailyStats(negocioId, dateStr, resources.length);
    const [timeoutCfg, negocio] = await Promise.all([
      prisma.configuracion.findUnique({ where: { clave_negocioId: { clave: 'BOOKING_TIMEOUT', negocioId } } }).catch(() => null),
      prisma.negocio.findUnique({ where: { id: negocioId }, select: { horarioApertura: true, horarioCierre: true } }),
    ]);
    const bookingTimeout = timeoutCfg ? parseInt(timeoutCfg.valor) || 0 : 10;

    return NextResponse.json({
      success: true,
      selectedDate: dateStr,
      today: todayEc(),
      resources,
      appointments,
      stats,
      settings: {
        autoConfirm: bookingTimeout === 0,
        minutosParaConfirmar: bookingTimeout,
        apertura: negocio?.horarioApertura || '08:00',
        cierre: negocio?.horarioCierre || '22:00',
      },
    });
  } catch (error: any) {
    console.error('Error fetching court grid data:', error);
    return NextResponse.json({ error: 'Error al cargar la grilla de canchas' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.negocioId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const negocioId = (session.user as any).negocioId;
    const body = await request.json();
    const { action } = body;

    // Acción: Bloquear cancha
    if (action === 'BLOCK') {
      const { fecha, horaInicio, horaFin, canchaId, motivo } = body;
      if (!fecha || !horaInicio || !horaFin || !canchaId) {
        return NextResponse.json({ error: 'Faltan campos para el bloqueo' }, { status: 400 });
      }

      const own = await prisma.service.findFirst({ where: { id: canchaId, negocioId }, select: { id: true } });
      if (!own) return NextResponse.json({ error: 'Cancha no encontrada' }, { status: 404 });
      const ocupado = (await loadBusy(negocioId, fecha, [canchaId])).get(canchaId) || [];
      if (overlaps(horaInicio, horaFin, ocupado.filter((b) => b.motivo === 'Reservada'))) {
        return NextResponse.json({ error: 'Hay una reserva en ese horario. Cancélala o muévela antes de bloquear.' }, { status: 409 });
      }

      const [year, month, day] = fecha.split('-').map(Number);
      const fechaUTC = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

      const bloqueo = await prisma.bloqueo.create({
        data: {
          id: `blk_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          fecha: fechaUTC,
          horaInicio,
          horaFin,
          serviceId: canchaId,
          negocioId,
          motivo: motivo || 'Mantenimiento de Cancha',
        },
      });

      return NextResponse.json({ success: true, bloqueo });
    }

    // Acción: Desbloquear
    if (action === 'UNBLOCK') {
      const { id } = body;
      await prisma.bloqueo.deleteMany({
        where: { id, negocioId },
      });
      return NextResponse.json({ success: true });
    }

    // Acción: Reserva Rápida desde el Admin
    if (action === 'QUICK_RESERVE') {
      const { fecha, horaInicio, horaFin, canchaId, clienteNombre, clienteTelefono, notas, total, duracion } = body;
      if (!fecha || !horaInicio || !canchaId || !clienteNombre?.trim()) {
        return NextResponse.json({ error: 'Faltan campos obligatorios (cancha, fecha, hora o nombre)' }, { status: 400 });
      }

      // Normalizador seguro de hora a formato 24h HH:mm
      const normalizeTime = (raw: string): string => {
        if (!raw) return '08:00';
        const str = raw.trim().toUpperCase();
        const isPM = str.includes('PM');
        const isAM = str.includes('AM');
        // Quitar todo lo que no sea dígito ni dos puntos
        const cleaned = str.replace(/[^0-9:]/g, '');
        const parts = cleaned.split(':').filter(Boolean);
        let h = parseInt(parts[0] || '8', 10);
        let m = parseInt(parts[1] || '0', 10);
        if (isPM && h < 12) h += 12;
        if (isAM && h === 12) h = 0;
        if (isNaN(h) || h < 0 || h > 23) h = 8;
        if (isNaN(m) || m < 0 || m > 59) m = 0;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      };

      const cleanHoraInicio = normalizeTime(horaInicio);

      const [year, month, day] = fecha.split('-').map(Number);
      const fechaUTC = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

      const court = await prisma.service.findFirst({ where: { id: canchaId, negocioId }, select: { id: true, precio: true } });
      if (!court) return NextResponse.json({ error: 'Cancha no encontrada' }, { status: 404 });
      {
        const [hh, mm] = cleanHoraInicio.split(':').map(Number);
        const fin = (hh || 0) * 60 + (mm || 0) + (Number(duracion) || 60);
        const finStr = horaFin ? normalizeTime(horaFin) : `${String(Math.floor(fin / 60) % 24).padStart(2, '0')}:${String(fin % 60).padStart(2, '0')}`;
        const ocupado = (await loadBusy(negocioId, fecha, [canchaId])).get(canchaId) || [];
        if (overlaps(cleanHoraInicio, finStr, ocupado)) {
          return NextResponse.json({ error: 'Ese horario ya está ocupado en esta cancha.' }, { status: 409 });
        }
      }

      // Buscar o crear cliente sin que rompa por restricciones únicas
      const rawPhone = (clienteTelefono || '').toString().trim();
      const phoneClean = rawPhone.replace(/[^0-9+]/g, '') || `0000${Date.now().toString().slice(-6)}`;
      
      let cliente = await prisma.cliente.findFirst({
        where: { negocioId, telefono: phoneClean },
      });

      if (!cliente) {
        try {
          cliente = await prisma.cliente.create({
            data: {
              id: `cli_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              nombre: clienteNombre.trim(),
              telefono: phoneClean,
              negocioId,
              updatedAt: new Date(),
            },
          });
        } catch (clientErr: any) {
          // Si hubo colisión de teléfono simultánea, reintentar findFirst
          cliente = await prisma.cliente.findFirst({
            where: { negocioId, telefono: phoneClean },
          });
          if (!cliente) throw clientErr;
        }
      } else {
        // Actualizar nombre si era diferente
        if (cliente.nombre !== clienteNombre.trim()) {
          await prisma.cliente.update({
            where: { id: cliente.id },
            data: { nombre: clienteNombre.trim(), updatedAt: new Date() },
          }).catch(() => {});
        }
      }

      // Calcular horaFin de manera segura en formato HH:mm
      let finalHoraFin = horaFin ? normalizeTime(horaFin) : null;
      if (!finalHoraFin) {
        const [h, m] = cleanHoraInicio.split(':').map(Number);
        const minsToAdd = Number(duracion) || 60;
        const totalMins = (h || 0) * 60 + (m || 0) + minsToAdd;
        const finH = Math.floor(totalMins / 60) % 24;
        const finM = totalMins % 60;
        finalHoraFin = `${finH.toString().padStart(2, '0')}:${finM.toString().padStart(2, '0')}`;
      }

      const duracionHoras = Math.max(Math.round((Number(duracion) || 60) / 60), 1);
      const parsedTotal = parseFloat(String(total || '0').replace(/[^0-9.]/g, '')) || 0;

      const reserva = await prisma.appointment.create({
        data: {
          id: `app_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          fecha: fechaUTC,
          horaInicio: cleanHoraInicio,
          horaFin: finalHoraFin,
          duracion: duracionHoras,
          estado: 'confirmed',
          pagoEstado: 'PENDIENTE',
          total: parsedTotal,
          clienteId: cliente.id,
          serviceId: canchaId,
          negocioId,
          comentarios: notas ? notas.trim() : 'Reserva manual desde grilla operativa',
          created_by_business: true,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({ success: true, reserva });
    }

    // Acción: confirmar reservas automáticamente o a mano
    if (action === 'SET_AUTO_CONFIRM') {
      const minutos = body.autoConfirm ? 0 : Math.min(240, Math.max(5, Number(body.minutos) || 30));
      await prisma.configuracion.upsert({
        where: { clave_negocioId: { clave: 'BOOKING_TIMEOUT', negocioId } },
        update: { valor: String(minutos) },
        create: { id: `cfg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, clave: 'BOOKING_TIMEOUT', valor: String(minutos), negocioId },
      });
      return NextResponse.json({ success: true, autoConfirm: minutos === 0, minutosParaConfirmar: minutos });
    }

    return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 });
  } catch (error: any) {
    console.error('Error en POST /api/admin/canchas/grilla:', error);
    return NextResponse.json({ error: error?.message || 'Error procesando solicitud' }, { status: 500 });
  }
}
