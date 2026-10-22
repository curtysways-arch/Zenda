/**
 * Archivos clínicos (radiografías, fotos, consentimientos, exámenes).
 *
 * Son datos de salud: NO se guardan en /api/media (que es público), sino en
 * /storage/clinical/<negocioId>/<archivo>, y se sirven por
 * /api/admin/dental/files/<negocioId>/<archivo> solo a usuarios de esa clínica.
 */
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

export const CLINICAL_FILE_PREFIX = '/api/admin/dental/files/';
export const MAX_CLINICAL_FILE_BYTES = 20 * 1024 * 1024;

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.pdf': 'application/pdf',
};

const SAFE_ID = /^[A-Za-z0-9_-]{4,80}$/;
const SAFE_FILE = /^[a-f0-9-]{36}\.[a-z]{3,4}$/;

function baseDir() {
  return process.env.CLINICAL_STORAGE_PATH
    ? path.resolve(process.env.CLINICAL_STORAGE_PATH)
    : path.join(process.cwd(), 'storage', 'clinical');
}

export function clinicalFilePath(negocioId: string, file: string) {
  return path.join(baseDir(), negocioId, file);
}

export function isValidClinicalName(negocioId: string, file: string) {
  return SAFE_ID.test(negocioId) && SAFE_FILE.test(file) && Boolean(MIME[path.extname(file).toLowerCase()]);
}

export function mimeForFile(file: string) {
  return MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
}

/** Detecta el tipo real por los primeros bytes (no confiar en la extensión que manda el navegador). */
function sniffExtension(buf: Buffer, declaredName: string): string | null {
  if (buf.length >= 5 && buf.toString('ascii', 0, 5) === '%PDF-') return '.pdf';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return '.jpg';
  if (buf.length >= 8 && buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG') return '.png';
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return '.webp';
  if (buf.length >= 6 && buf.toString('ascii', 0, 3) === 'GIF') return '.gif';
  if (buf.length >= 12 && buf.toString('ascii', 4, 8) === 'ftyp') {
    const brand = buf.toString('ascii', 8, 12).toLowerCase();
    if (['heic', 'heix', 'hevc', 'mif1', 'msf1'].includes(brand)) {
      return /\.heif$/i.test(declaredName) ? '.heif' : '.heic';
    }
  }
  return null;
}

export async function saveClinicalFile(negocioId: string, buf: Buffer, declaredName: string) {
  if (!SAFE_ID.test(negocioId)) throw new Error('Clínica no válida.');
  if (buf.length === 0) throw new Error('El archivo está vacío.');
  if (buf.length > MAX_CLINICAL_FILE_BYTES) throw new Error('El archivo supera el máximo de 20 MB.');

  const ext = sniffExtension(buf, declaredName);
  if (!ext) throw new Error('Formato no soportado. Sube una imagen (JPG, PNG, WEBP, HEIC) o un PDF.');

  const file = `${crypto.randomUUID()}${ext}`;
  const dir = path.join(baseDir(), negocioId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, file), buf);

  return {
    url: `${CLINICAL_FILE_PREFIX}${negocioId}/${file}`,
    mimeType: MIME[ext],
    size: buf.length,
  };
}

/** Si la URL es un archivo clínico privado, devuelve a qué clínica pertenece. */
export function clinicalUrlOwner(url: string | null | undefined): string | null {
  if (!url || !url.startsWith(CLINICAL_FILE_PREFIX)) return null;
  const [negocioId] = url.slice(CLINICAL_FILE_PREFIX.length).split('/');
  return negocioId || null;
}

export async function deleteClinicalFile(url: string | null | undefined) {
  if (!url || !url.startsWith(CLINICAL_FILE_PREFIX)) return;
  const [negocioId, file] = url.slice(CLINICAL_FILE_PREFIX.length).split('/');
  if (!negocioId || !file || !isValidClinicalName(negocioId, file)) return;
  await fs.unlink(clinicalFilePath(negocioId, file)).catch(() => {});
}
