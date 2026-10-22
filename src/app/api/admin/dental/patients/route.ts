import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import {
  getDentalContext,
  jsonError,
  localDateKey,
  dayRangeUTC,
  cleanText,
  INACTIVE_APPOINTMENT_STATES,
} from '@/modules/dental/server/context';

export const dynamic = 'force-dynamic';

const ACTIVE_TREATMENT_STATES = ['PLANIFICADO', 'PENDIENTE', 'EN_PROCESO'];

function digits(value: string) {
  return value.replace(/\D/g, '');
}

function hasTrueFlag(obj: unknown, ignore: string[] = []) {
  if (!obj || typeof obj !== 'object') return false;
  return Object.entries(obj as Record<string, unknown>).some(([k, v]) => !ignore.includes(k) && v === true);
}

/**
 * GET /api/admin/dental/patients
 * Lista de pacientes con lo que el consultorio necesita ver de un vistazo:
 * última visita, próxima cita, alertas médicas y tratamientos abiertos.
 */
export async function GET() {
  try {
    const access = await getDentalContext();
    if (!access.ok) return access.response;
    const { negocioId, timeZone } = access.ctx;

    const todayStart = dayRangeUTC(localDateKey(timeZone)).start;

    const clientes = await prisma.cliente.findMany({
      where: { negocioId },
      select: {
        id: true,
        nombre: true,
        telefono: true,
        email: true,
        fechaNacimiento: true,
        identificacion: true,
        createdAt: true,
        clinicalRecord: {
          select: {
            id: true,
            numeroHistoria: true,
            alergias: true,
            antecedentesMedicos: true,
            treatments: {
              where: { estado: { in: ACTIVE_TREATMENT_STATES } },
              select: { id: true, costoEstimado: true },
            },
          },
        },
        Appointment: {
          where: { estado: { notIn: INACTIVE_APPOINTMENT_STATES } },
          select: { id: true, fecha: true, horaInicio: true, estado: true },
          orderBy: [{ fecha: 'desc' }, { horaInicio: 'desc' }],
        },
      },
      orderBy: { nombre: 'asc' },
    });

    const patients = clientes.map((c) => {
      const past = c.Appointment.filter((a) => a.fecha < todayStart);
      const upcoming = c.Appointment
        .filter((a) => a.fecha >= todayStart && !['completed', 'finalizada'].includes(a.estado))
        .sort((a, b) => a.fecha.getTime() - b.fecha.getTime() || a.horaInicio.localeCompare(b.horaInicio));
      const completed = c.Appointment.filter((a) => ['completed', 'finalizada'].includes(a.estado));
      const lastVisit = [...past, ...completed].sort((a, b) => b.fecha.getTime() - a.fecha.getTime())[0];
      const rec = c.clinicalRecord;
      const pendingBudget = (rec?.treatments || []).reduce((sum, t) => sum + (Number(t.costoEstimado) || 0), 0);

      return {
        id: c.id,
        nombre: c.nombre,
        telefono: c.telefono?.startsWith('CF-') || c.telefono?.startsWith('ST-') ? '' : c.telefono,
        email: c.email,
        fechaNacimiento: c.fechaNacimiento,
        identificacion: c.identificacion && c.identificacion !== '9999999999999' ? c.identificacion : null,
        createdAt: c.createdAt,
        numeroHistoria: rec?.numeroHistoria || null,
        hasRecord: Boolean(rec),
        alertAlergia: hasTrueFlag(rec?.alergias, ['detalle']) || Boolean((rec?.alergias as any)?.detalle),
        alertCondicion: hasTrueFlag(rec?.antecedentesMedicos),
        tratamientosActivos: rec?.treatments.length || 0,
        presupuestoPendiente: Math.round(pendingBudget * 100) / 100,
        totalCitas: c.Appointment.length,
        ultimaVisita: lastVisit ? lastVisit.fecha : null,
        proximaCita: upcoming[0] ? { fecha: upcoming[0].fecha, hora: upcoming[0].horaInicio } : null,
      };
    });

    return NextResponse.json({ success: true, patients });
  } catch (err) {
    console.error('Error en GET /api/admin/dental/patients:', err);
    return jsonError('No se pudo cargar la lista de pacientes.', 500);
  }
}

/**
 * POST /api/admin/dental/patients
 * Registra un paciente nuevo. Si ya existe otro con el mismo teléfono en la clínica,
 * no lo duplica: responde 409 con su id para abrir su ficha.
 */
export async function POST(req: NextRequest) {
  try {
    const access = await getDentalContext();
    if (!access.ok) return access.response;
    const { negocioId } = access.ctx;

    const body = await req.json().catch(() => ({}));
    const nombre = cleanText(body.nombre, 120);
    const telefono = cleanText(body.telefono, 30);
    const email = cleanText(body.email, 120)?.toLowerCase() || null;
    const identificacion = cleanText(body.identificacion, 20)?.toUpperCase() || null;
    const fechaNacimiento = cleanText(body.fechaNacimiento, 10);

    if (!nombre) return jsonError('Escribe el nombre del paciente.');
    if (!telefono || digits(telefono).length < 7) return jsonError('Escribe un teléfono válido (mínimo 7 dígitos).');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonError('El correo no es válido.');

    let birth: Date | null = null;
    if (fechaNacimiento) {
      birth = new Date(`${fechaNacimiento}T12:00:00Z`);
      if (isNaN(birth.getTime()) || birth > new Date()) return jsonError('La fecha de nacimiento no es válida.');
    }

    // Evitar duplicados: mismo teléfono (comparando los últimos 9 dígitos) dentro de la clínica.
    const last9 = digits(telefono).slice(-9);
    const candidates = await prisma.cliente.findMany({
      where: { negocioId, telefono: { contains: last9.slice(-7) } },
      select: { id: true, nombre: true, telefono: true },
    });
    const duplicate = candidates.find((c) => digits(c.telefono).endsWith(last9));
    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          error: `Ya existe un paciente con ese teléfono: ${duplicate.nombre}.`,
          existingId: duplicate.id,
        },
        { status: 409 }
      );
    }

    if (identificacion) {
      const sameId = await prisma.cliente.findFirst({
        where: { negocioId, identificacion },
        select: { id: true, nombre: true },
      });
      if (sameId) {
        return NextResponse.json(
          {
            success: false,
            error: `Ya existe un paciente con esa cédula: ${sameId.nombre}.`,
            existingId: sameId.id,
          },
          { status: 409 }
        );
      }
    }

    const cliente = await prisma.cliente.create({
      data: {
        id: crypto.randomUUID(),
        negocioId,
        nombre,
        telefono,
        email,
        identificacion,
        fechaNacimiento: birth,
        updatedAt: new Date(),
      },
      select: { id: true, nombre: true, telefono: true },
    });

    return NextResponse.json({ success: true, patient: cliente }, { status: 201 });
  } catch (err) {
    console.error('Error en POST /api/admin/dental/patients:', err);
    return jsonError('No se pudo registrar al paciente.', 500);
  }
}
