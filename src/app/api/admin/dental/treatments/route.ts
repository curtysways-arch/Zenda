import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  getDentalContext,
  jsonError,
  cleanText,
  findOwnedRecord,
  resolveRecord,
  validateStaffId,
  validateServiceId,
  validateAppointmentId,
} from '@/modules/dental/server/context';

export const dynamic = 'force-dynamic';

const STATES = ['PLANIFICADO', 'PENDIENTE', 'EN_PROCESO', 'REALIZADO', 'CANCELADO'];
const PRIORITIES = ['ALTA', 'MEDIA', 'BAJA'];

function parseTooth(value: unknown): string | null | false {
  const raw = cleanText(value, 40);
  if (!raw) return null;
  // Acepta una o varias piezas FDI separadas por coma ("16" o "11, 21").
  const parts = raw.split(/[\s,;]+/).filter(Boolean);
  const ok = parts.every((p) => /^[1-8][1-8]$/.test(p));
  return ok ? parts.join(', ') : false;
}

function parseMoney(value: unknown): number | null | false {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000) return false;
  return Math.round(n * 100) / 100;
}

export async function GET(req: NextRequest) {
  try {
    const access = await getDentalContext();
    if (!access.ok) return access.response;
    const { negocioId } = access.ctx;

    const { searchParams } = new URL(req.url);
    const where: any = { negocioId };
    const clinicalRecordId = searchParams.get('clinicalRecordId');
    if (clinicalRecordId) {
      const rec = await findOwnedRecord(negocioId, clinicalRecordId);
      if (!rec) return jsonError('Historia clínica no encontrada.', 404);
      where.clinicalRecordId = rec.id;
    }
    const estado = searchParams.get('estado');
    if (estado && STATES.includes(estado)) where.estado = estado;

    const treatments = await prisma.dentalTreatment.findMany({
      where,
      include: {
        ClinicalRecord: { select: { id: true, clienteId: true, Cliente: { select: { id: true, nombre: true, telefono: true } } } },
        Service: { select: { id: true, nombre: true, precio: true } },
        Staff: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });
    return NextResponse.json({ success: true, treatments });
  } catch (err) {
    console.error('Error en GET /api/admin/dental/treatments:', err);
    return jsonError('No se pudieron cargar los tratamientos.', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const access = await getDentalContext();
    if (!access.ok) return access.response;
    const { negocioId } = access.ctx;

    const body = await req.json().catch(() => ({}));
    const descripcion = cleanText(body.descripcion, 300);
    if (!descripcion) return jsonError('Describe el procedimiento.');

    const record = await resolveRecord(negocioId, body);
    if (!record) return jsonError('Paciente o historia clínica no encontrados.', 404);

    const diente = parseTooth(body.diente);
    if (diente === false) return jsonError('La pieza dental debe ser un número FDI (ej. 16 o 11, 21).');
    const costo = parseMoney(body.costoEstimado);
    if (costo === false) return jsonError('El costo no es válido.');

    const [serviceId, staffId, appointmentId] = await Promise.all([
      validateServiceId(negocioId, body.serviceId),
      validateStaffId(negocioId, body.staffId),
      validateAppointmentId(negocioId, body.appointmentId),
    ]);
    if (serviceId === false) return jsonError('El servicio seleccionado no es de la clínica.');
    if (staffId === false) return jsonError('El doctor seleccionado no es de la clínica.');
    if (appointmentId === false) return jsonError('La cita indicada no es de la clínica.');

    const estado = STATES.includes(body.estado) ? body.estado : 'PLANIFICADO';

    const treatment = await prisma.dentalTreatment.create({
      data: {
        negocioId,
        clinicalRecordId: record.id,
        serviceId,
        staffId,
        appointmentId,
        diente,
        superficies: cleanText(body.superficies, 40)?.toUpperCase() || null,
        descripcion,
        costoEstimado: costo,
        estado,
        prioridad: PRIORITIES.includes(body.prioridad) ? body.prioridad : 'MEDIA',
        notas: cleanText(body.notas, 1000),
        fechaInicio: estado === 'EN_PROCESO' ? new Date() : null,
        fechaRealizado: estado === 'REALIZADO' ? new Date() : null,
      },
      include: {
        Service: { select: { id: true, nombre: true } },
        Staff: { select: { id: true, name: true } },
      },
    });

    await prisma.clinicalRecord.update({ where: { id: record.id }, data: { updatedAt: new Date() } }).catch(() => {});

    return NextResponse.json({ success: true, treatment }, { status: 201 });
  } catch (err) {
    console.error('Error en POST /api/admin/dental/treatments:', err);
    return jsonError('No se pudo guardar el tratamiento.', 500);
  }
}

/** PATCH — cambia estado o edita un tratamiento. */
export async function PATCH(req: NextRequest) {
  try {
    const access = await getDentalContext();
    if (!access.ok) return access.response;
    const { negocioId } = access.ctx;

    const body = await req.json().catch(() => ({}));
    const id = typeof body.id === 'string' ? body.id : '';
    if (!id) return jsonError('Falta el tratamiento.');

    const existing = await prisma.dentalTreatment.findUnique({
      where: { id },
      select: { id: true, negocioId: true, estado: true, fechaInicio: true },
    });
    if (!existing || existing.negocioId !== negocioId) return jsonError('Tratamiento no encontrado.', 404);

    const data: Record<string, unknown> = {};

    if (body.estado !== undefined) {
      if (!STATES.includes(body.estado)) return jsonError('Estado no válido.');
      data.estado = body.estado;
      if (body.estado === 'REALIZADO') {
        const when = body.fechaRealizado ? new Date(body.fechaRealizado) : new Date();
        data.fechaRealizado = isNaN(when.getTime()) ? new Date() : when;
      } else {
        // Si se reabre un tratamiento, deja de figurar como realizado.
        data.fechaRealizado = null;
      }
      if (body.estado === 'EN_PROCESO' && !existing.fechaInicio) data.fechaInicio = new Date();
    }
    if (body.descripcion !== undefined) {
      const d = cleanText(body.descripcion, 300);
      if (!d) return jsonError('La descripción no puede quedar vacía.');
      data.descripcion = d;
    }
    if (body.diente !== undefined) {
      const diente = parseTooth(body.diente);
      if (diente === false) return jsonError('La pieza dental debe ser un número FDI (ej. 16).');
      data.diente = diente;
    }
    if (body.superficies !== undefined) data.superficies = cleanText(body.superficies, 40)?.toUpperCase() || null;
    if (body.costoEstimado !== undefined) {
      const c = parseMoney(body.costoEstimado);
      if (c === false) return jsonError('El costo no es válido.');
      data.costoEstimado = c;
    }
    if (body.prioridad !== undefined) {
      if (!PRIORITIES.includes(body.prioridad)) return jsonError('Prioridad no válida.');
      data.prioridad = body.prioridad;
    }
    if (body.notas !== undefined) data.notas = cleanText(body.notas, 1000);
    if (body.staffId !== undefined) {
      const st = await validateStaffId(negocioId, body.staffId);
      if (st === false) return jsonError('El doctor seleccionado no es de la clínica.');
      data.staffId = st;
    }

    const updated = await prisma.dentalTreatment.update({
      where: { id },
      data,
      include: {
        Service: { select: { id: true, nombre: true } },
        Staff: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json({ success: true, treatment: updated });
  } catch (err) {
    console.error('Error en PATCH /api/admin/dental/treatments:', err);
    return jsonError('No se pudo actualizar el tratamiento.', 500);
  }
}

/** DELETE — elimina un tratamiento creado por error (no se permite si ya fue realizado). */
export async function DELETE(req: NextRequest) {
  try {
    const access = await getDentalContext();
    if (!access.ok) return access.response;
    const { negocioId } = access.ctx;

    const id = new URL(req.url).searchParams.get('id') || '';
    const existing = await prisma.dentalTreatment.findUnique({
      where: { id },
      select: { id: true, negocioId: true, estado: true },
    });
    if (!existing || existing.negocioId !== negocioId) return jsonError('Tratamiento no encontrado.', 404);
    if (existing.estado === 'REALIZADO') {
      return jsonError('Un tratamiento realizado forma parte de la historia clínica y no se puede borrar.', 409);
    }

    await prisma.dentalTreatment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error en DELETE /api/admin/dental/treatments:', err);
    return jsonError('No se pudo eliminar el tratamiento.', 500);
  }
}
