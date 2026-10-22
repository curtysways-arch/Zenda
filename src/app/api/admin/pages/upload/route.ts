import { NextResponse } from 'next/server';
import { storageService } from '@/lib/storage/storageService';
import { getPagesAccess, pageError } from '@/lib/customPagesServer';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 10 * 1024 * 1024;

/** Reconoce el tipo real del archivo por sus primeros bytes (no por el nombre). */
function sniffImage(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (buf.toString('ascii', 0, 4) === 'GIF8') return 'image/gif';
  return null;
}

/** Sube una imagen para usarla dentro del contenido de una página. */
export async function POST(req: Request) {
  try {
    const access = await getPagesAccess();
    if (!access.ok) return access.response;

    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || typeof file === 'string') return pageError('No se recibió ninguna imagen.');
    if (file.size > MAX_BYTES) return pageError('La imagen pesa más de 10 MB. Usa una más liviana.');

    const buffer = Buffer.from(await file.arrayBuffer());
    const mime = sniffImage(buffer);
    if (!mime) return pageError('Solo se aceptan imágenes JPG, PNG, WEBP o GIF.');

    const safeName = (file.name || 'imagen').replace(/[^\w.\-]+/g, '-').slice(-80);
    const result = await storageService.handleUpload(buffer, access.businessId, 'page', mime, safeName);
    return NextResponse.json({ id: result.id, url: result.mediumUrl || result.url, fullUrl: result.url });
  } catch (error: any) {
    console.error('[PAGES_UPLOAD_ERROR]', error);
    return pageError(error?.message || 'No se pudo subir la imagen.', 500);
  }
}
