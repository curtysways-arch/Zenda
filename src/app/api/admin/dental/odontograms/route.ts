import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getDentalContext, jsonError, cleanText, findOwnedRecord, resolveRecord } from '@/modules/dental/server/context';

export const dynamic = 'force-dynamic';

const VALID_TEETH = new Set<string>([
  ...[1, 2, 3, 4].flatMap((q) => [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `${q}${n}`)),
  ...[5, 6, 7, 8].flatMap((q) => [1, 2, 3, 4, 5].map((n) => `${q}${n}`)),
]);
const VALID_CONDITIONS = new Set([
  'SANO', 'CARIES', 'OBTURADO', 'CORONA', 'ENDODONCIA', 'AUSENTE',
  'EXTRACCION_INDICADA', 'PROTESIS', 'IMPLANTE', 'SELLANTE', 'FRACTURA',
]);
const SURFACES = ['vestibular', 'lingual', 'mesial', 'distal', 'oclusal'] as const;

/** Normaliza el mapa de piezas: solo dientes FDI válidos, condiciones conocidas y notas cortas. */
function sanitizePiezas(input: unknown): Record<string, any> | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const out: Record<string, any> = {};
  for (const [tooth, raw] of Object.entries(input as Record<string, any>)) {
    if (!VALID_TEETH.has(tooth) || !raw || typeof raw !== 'object') continue;
    const superficies: Record<string, string> = {};
    for (const s of SURFACES) {
      const v = raw.superficies?.[s];
      if (typeof v === 'string' && VALID_CONDITIONS.has(v)) superficies[s] = v;
    }
    const estadoGeneral = typeof raw.estadoGeneral === 'string' && VALID_CONDITIONS.has(raw.estadoGeneral)
      ? raw.estadoGeneral
      : undefined;
    const notas = cleanText(raw.notas, 300) || undefined;
    const isEmpty = !estadoGeneral && !notas && Object.values(superficies).every((v) => v === 'SANO');
    if (isEmpty) continue;
    out[tooth] = { diente: tooth, ...(estadoGeneral ? { estadoGeneral } : {}), superficies, ...(notas ? { notas } : {}) };
  }
  return out;
}

export async function GET(req: NextRequest) {
  try {
    const access = await getDentalContext();
    if (!access.ok) return access.response;
    const { negocioId } = access.ctx;

    const record = await findOwnedRecord(negocioId, new URL(req.url).searchParams.get('clinicalRecordId'));
    if (!record) return jsonError('Historia clínica no encontrada.', 404);

    const odontograms = await prisma.dentalOdontogram.findMany({
      where: { clinicalRecordId: record.id, negocioId },
      include: { Staff: { select: { id: true, name: true } } },
      orderBy: { snapshotNumber: 'desc' },
    });
    return NextResponse.json({ success: true, odontograms });
  } catch (err) {
    console.error('Error en GET /api/admin/dental/odontograms:', err);
    return jsonError('No se pudo cargar el odontograma.', 500);
  }
}

/** POST — guarda una nueva versión del odontograma (las anteriores quedan como historial). */
export async function POST(req: NextRequest) {
  try {
    const access = await getDentalContext({ withStaff: true });
    if (!access.ok) return access.response;
    const { negocioId, userName, staffId } = access.ctx;

    const body = await req.json().catch(() => ({}));
    const piezas = sanitizePiezas(body.piezas);
    if (!piezas) return jsonError('El odontograma está vacío o no es válido.');

    const record = await resolveRecord(negocioId, body);
    if (!record) return jsonError('Paciente o historia clínica no encontrados.', 404);

    const tipo = ['PERMANENTE', 'TEMPORAL', 'MIXTO'].includes(body.tipo) ? body.tipo : 'PERMANENTE';

    const odontogram = await prisma.$transaction(async (tx) => {
      const last = await tx.dentalOdontogram.findFirst({
        where: { clinicalRecordId: record.id, negocioId },
        orderBy: { snapshotNumber: 'desc' },
        select: { snapshotNumber: true },
      });
      const next = (last?.snapshotNumber || 0) + 1;
      return tx.dentalOdontogram.create({
        data: {
          negocioId,
          clinicalRecordId: record.id,
          tipo,
          titulo: cleanText(body.titulo, 120) || `Evaluación #${next}`,
          piezas,
          especificaciones: {},
          isSnapshot: true,
          snapshotNumber: next,
          registeredBy: userName,
          staffId,
        },
        include: { Staff: { select: { id: true, name: true } } },
      });
    });

    await prisma.clinicalRecord.update({ where: { id: record.id }, data: { updatedAt: new Date() } }).catch(() => {});

    return NextResponse.json({ success: true, odontogram }, { status: 201 });
  } catch (err) {
    console.error('Error en POST /api/admin/dental/odontograms:', err);
    return jsonError('No se pudo guardar el odontograma.', 500);
  }
}
