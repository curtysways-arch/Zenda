import { NextRequest, NextResponse } from 'next/server';
import { getDentalContext, jsonError } from '@/modules/dental/server/context';
import { saveClinicalFile, MAX_CLINICAL_FILE_BYTES } from '@/modules/dental/server/clinicalFiles';

export const dynamic = 'force-dynamic';

/** POST /api/admin/dental/upload — sube un archivo clínico privado (imagen o PDF). */
export async function POST(req: NextRequest) {
  try {
    const access = await getDentalContext();
    if (!access.ok) return access.response;
    const { negocioId } = access.ctx;

    const form = await req.formData().catch(() => null);
    const file = form?.get('file');
    if (!file || typeof file === 'string') return jsonError('No se recibió ningún archivo.');
    if (file.size > MAX_CLINICAL_FILE_BYTES) return jsonError('El archivo supera el máximo de 20 MB.');

    const buf = Buffer.from(await file.arrayBuffer());
    const saved = await saveClinicalFile(negocioId, buf, file.name || 'archivo');
    return NextResponse.json({ success: true, ...saved });
  } catch (err: any) {
    const message = err?.message && /Formato|vacío|20 MB|no válida/.test(err.message)
      ? err.message
      : 'No se pudo subir el archivo.';
    if (message === 'No se pudo subir el archivo.') console.error('Error en POST /api/admin/dental/upload:', err);
    return jsonError(message, 400);
  }
}
