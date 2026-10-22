import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  getDentalContext,
  jsonError,
  cleanText,
  findOwnedRecord,
  resolveRecord,
  validateStaffId,
  validateAppointmentId,
  isValidDateKey,
} from '@/modules/dental/server/context';

export const dynamic = 'force-dynamic';

function cleanVitals(input: unknown) {
  const out: Record<string, string> = {};
  if (!input || typeof input !== 'object') return out;
  for (const key of ['presionArterial', 'frecuenciaCardiaca', 'frecuenciaRespiratoria', 'temperatura', 'saturacion']) {
    const v = cleanText((input as any)[key], 20);
    if (v) out[key] = v;
  }
  return out;
}

export async function GET(req: NextRequest) {
  try {
    const access = await getDentalContext();
    if (!access.ok) return access.response;
    const { negocioId } = access.ctx;

    const clinicalRecordId = new URL(req.url).searchParams.get('clinicalRecordId');
    const record = await findOwnedRecord(negocioId, clinicalRecordId);
    if (!record) return jsonError('Historia clínica no encontrada.', 404);

    const encounters = await prisma.clinicalEncounter.findMany({
      where: { clinicalRecordId: record.id, negocioId },
      include: {
        Staff: { select: { id: true, name: true } },
        Appointment: { select: { id: true, fecha: true, horaInicio: true } },
        Odontogram: { select: { id: true, titulo: true, snapshotNumber: true } },
      },
      orderBy: { fecha: 'desc' },
    });
    return NextResponse.json({ success: true, encounters });
  } catch (err) {
    console.error('Error en GET /api/admin/dental/encounters:', err);
    return jsonError('No se pudieron cargar las consultas.', 500);
  }
}

/** POST — registra una consulta (evolución). Las consultas no se editan: quedan como registro clínico. */
export async function POST(req: NextRequest) {
  try {
    const access = await getDentalContext({ withStaff: true });
    if (!access.ok) return access.response;
    const { negocioId, staffId: sessionStaffId } = access.ctx;

    const body = await req.json().catch(() => ({}));
    const motivoConsulta = cleanText(body.motivoConsulta, 300);
    if (!motivoConsulta) return jsonError('Escribe el motivo de la consulta.');

    const record = await resolveRecord(negocioId, body);
    if (!record) return jsonError('Paciente o historia clínica no encontrados.', 404);

    const staffId = await validateStaffId(negocioId, body.staffId);
    if (staffId === false) return jsonError('El doctor seleccionado no pertenece a la clínica.');
    const appointmentId = await validateAppointmentId(negocioId, body.appointmentId);
    if (appointmentId === false) return jsonError('La cita indicada no pertenece a la clínica.');

    let odontogramId: string | null = null;
    if (body.odontogramId) {
      const od = await prisma.dentalOdontogram.findUnique({
        where: { id: String(body.odontogramId) },
        select: { clinicalRecordId: true },
      });
      if (!od || od.clinicalRecordId !== record.id) return jsonError('El odontograma indicado no es de este paciente.');
      odontogramId = String(body.odontogramId);
    }

    let proximaCita: Date | null = null;
    if (body.proximaCita) {
      if (!isValidDateKey(body.proximaCita)) return jsonError('La fecha del próximo control no es válida.');
      proximaCita = new Date(`${body.proximaCita}T12:00:00Z`);
    }

    const problema = cleanText(
      typeof body.problemaActual === 'object' ? body.problemaActual?.descripcion : body.problemaActual,
      2000
    );

    const encounter = await prisma.clinicalEncounter.create({
      data: {
        negocioId,
        clinicalRecordId: record.id,
        appointmentId,
        staffId: staffId || sessionStaffId || null,
        fecha: new Date(),
        motivoConsulta,
        problemaActual: problema ? { descripcion: problema } : {},
        signosVitales: cleanVitals(body.signosVitales),
        examenFisico: cleanText(body.examenFisico, 2000),
        diagnostico: cleanText(body.diagnostico, 1000),
        codigoCIE: cleanText(body.codigoCIE, 20)?.toUpperCase() || null,
        procedimientoRealizado: cleanText(body.procedimientoRealizado, 2000),
        prescripcion: cleanText(body.prescripcion, 2000),
        indicaciones: cleanText(body.indicaciones, 2000),
        proximaCita,
        odontogramId,
      },
      include: { Staff: { select: { id: true, name: true } } },
    });

    // Mantener "actualizado" el expediente para ordenar por actividad reciente.
    await prisma.clinicalRecord.update({ where: { id: record.id }, data: { updatedAt: new Date() } }).catch(() => {});

    return NextResponse.json({ success: true, encounter }, { status: 201 });
  } catch (err) {
    console.error('Error en POST /api/admin/dental/encounters:', err);
    return jsonError('No se pudo guardar la consulta.', 500);
  }
}
