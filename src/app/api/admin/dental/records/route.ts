import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getDentalContext, jsonError, cleanText, ensureClinicalRecord } from '@/modules/dental/server/context';

export const dynamic = 'force-dynamic';

const BLOOD_GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

/** Solo guarda banderas booleanas conocidas y textos cortos: evita guardar basura en los JSON clínicos. */
function sanitizeFlags(input: unknown, textKeys: string[] = []) {
  if (!input || typeof input !== 'object') return {};
  const out: Record<string, boolean | string> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (!/^[a-zA-Z_]{1,40}$/.test(k)) continue;
    if (typeof v === 'boolean') out[k] = v;
    else if (textKeys.includes(k) && typeof v === 'string') out[k] = v.trim().slice(0, 500);
  }
  return out;
}

export async function GET(req: NextRequest) {
  try {
    const access = await getDentalContext();
    if (!access.ok) return access.response;
    const { negocioId } = access.ctx;

    const clienteId = new URL(req.url).searchParams.get('clienteId');

    if (clienteId) {
      const cliente = await prisma.cliente.findUnique({ where: { id: clienteId }, select: { negocioId: true } });
      if (!cliente || cliente.negocioId !== negocioId) {
        return jsonError('Paciente no encontrado.', 404);
      }
      const record = await prisma.clinicalRecord.findUnique({
        where: { negocioId_clienteId: { negocioId, clienteId } },
        include: {
          Cliente: { select: { id: true, nombre: true, telefono: true, email: true, fechaNacimiento: true, imagenUrl: true } },
          encounters: { orderBy: { fecha: 'desc' }, include: { Staff: { select: { id: true, name: true } } } },
          odontograms: { orderBy: { snapshotNumber: 'desc' }, take: 30 },
          treatments: { orderBy: { createdAt: 'desc' }, include: { Service: { select: { id: true, nombre: true } } } },
          documents: { orderBy: { createdAt: 'desc' } },
        },
      });
      return NextResponse.json({ success: true, record });
    }

    const records = await prisma.clinicalRecord.findMany({
      where: { negocioId },
      include: {
        Cliente: { select: { id: true, nombre: true, telefono: true, email: true, fechaNacimiento: true } },
        _count: { select: { encounters: true, odontograms: true, treatments: true, documents: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json({ success: true, records });
  } catch (err) {
    console.error('Error en GET /api/admin/dental/records:', err);
    return jsonError('No se pudieron cargar las historias clínicas.', 500);
  }
}

/** POST — crea o actualiza la anamnesis (historia clínica) del paciente. */
export async function POST(req: NextRequest) {
  try {
    const access = await getDentalContext();
    if (!access.ok) return access.response;
    const { negocioId } = access.ctx;

    const body = await req.json().catch(() => ({}));
    const clienteId = typeof body.clienteId === 'string' ? body.clienteId : '';
    if (!clienteId) return jsonError('Falta el paciente.');

    const cliente = await prisma.cliente.findUnique({ where: { id: clienteId }, select: { negocioId: true } });
    if (!cliente || cliente.negocioId !== negocioId) {
      return jsonError('Paciente no encontrado.', 404);
    }

    const record = await ensureClinicalRecord(negocioId, clienteId);

    const data: Record<string, unknown> = {};
    if (body.numeroHistoria !== undefined) data.numeroHistoria = cleanText(body.numeroHistoria, 30) || record.numeroHistoria;
    if (body.grupoSanguineo !== undefined) {
      const g = cleanText(body.grupoSanguineo, 4);
      data.grupoSanguineo = g && BLOOD_GROUPS.includes(g) ? g : null;
    }
    if (body.antecedentesMedicos !== undefined) data.antecedentesMedicos = sanitizeFlags(body.antecedentesMedicos, ['otros']);
    if (body.alergias !== undefined) data.alergias = sanitizeFlags(body.alergias, ['detalle']);
    if (body.habitos !== undefined) data.habitos = sanitizeFlags(body.habitos, ['otros']);
    if (body.medicacionActual !== undefined) data.medicacionActual = cleanText(body.medicacionActual, 1000);
    if (body.observaciones !== undefined) data.observaciones = cleanText(body.observaciones, 4000);

    const updated = Object.keys(data).length
      ? await prisma.clinicalRecord.update({ where: { id: record.id }, data })
      : record;

    return NextResponse.json({ success: true, record: updated });
  } catch (err) {
    console.error('Error en POST /api/admin/dental/records:', err);
    return jsonError('No se pudo guardar la historia clínica.', 500);
  }
}
