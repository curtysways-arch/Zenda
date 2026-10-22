import { NextRequest } from 'next/server';
import fs from 'fs/promises';
import { getDentalContext, jsonError } from '@/modules/dental/server/context';
import { clinicalFilePath, isValidClinicalName, mimeForFile } from '@/modules/dental/server/clinicalFiles';

export const dynamic = 'force-dynamic';

/** Sirve un archivo clínico solo a usuarios de la clínica dueña del archivo. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ negocioId: string; file: string }> }
) {
  const access = await getDentalContext();
  if (!access.ok) return access.response;

  const { negocioId, file } = await params;
  if (!isValidClinicalName(negocioId, file)) return jsonError('Archivo no válido.', 400);
  if (negocioId !== access.ctx.negocioId) return jsonError('No tienes acceso a este archivo.', 403);

  try {
    const data = await fs.readFile(clinicalFilePath(negocioId, file));
    const download = new URL(req.url).searchParams.get('download') === '1';
    return new Response(new Uint8Array(data), {
      headers: {
        'Content-Type': mimeForFile(file),
        'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${file}"`,
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return jsonError('Archivo no encontrado.', 404);
  }
}
