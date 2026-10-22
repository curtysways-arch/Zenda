/**
 * Documentos de repartidores (cédula, licencia, matrícula, vehículo, selfie).
 *
 * Antes se guardaban en /public/uploads/drivers/<token>/ y cualquiera con el enlace
 * (o adivinando la ruta) podía verlos. Ahora se guardan fuera de /public, en
 * /storage/drivers/<token>/, y se sirven por /api/logistics/driver-docs/<token>/<archivo>
 * solo a quien tiene derecho a verlos (ver route.ts de driver-docs).
 *
 * Los archivos antiguos de /public se mueven automáticamente la primera vez que se piden.
 */
import path from 'path';
import fs from 'fs/promises';

export const DOC_PREFIX = '/api/logistics/driver-docs/';
export const LEGACY_PREFIX = '/uploads/drivers/';
export const DOC_FIELDS = ['cedulaFrenteUrl', 'cedulaReversoUrl', 'licenciaUrl', 'matriculaUrl', 'fotoVehiculoUrl', 'selfieUrl'] as const;

export const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.gif', '.pdf']);
const MIME: Record<string, string> = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
    '.heic': 'image/heic', '.heif': 'image/heif', '.gif': 'image/gif', '.pdf': 'application/pdf',
};

const SAFE = /^[A-Za-z0-9_-]{4,80}$/;
const SAFE_FILE = /^[A-Za-z0-9_-]{1,40}_[A-Za-z0-9-]{8,60}\.[a-z]{2,5}$/;

export function privateDir(...parts: string[]) {
    return path.join(process.cwd(), 'storage', 'drivers', ...parts);
}

function legacyDir(...parts: string[]) {
    return path.join(process.cwd(), 'public', 'uploads', 'drivers', ...parts);
}

export function docUrl(token: string, file: string) {
    return `${DOC_PREFIX}${token}/${file}`;
}

/** Convierte una URL antigua (/uploads/drivers/...) a la nueva ruta protegida. */
export function normalizeDocUrl(url?: string | null): string | null {
    if (!url) return null;
    const u = String(url);
    if (u.startsWith(DOC_PREFIX)) return u;
    if (u.startsWith(LEGACY_PREFIX)) return DOC_PREFIX + u.slice(LEGACY_PREFIX.length);
    return u;
}

export function isDocOfToken(url: string | null | undefined, token: string) {
    const n = normalizeDocUrl(url);
    return !!n && n.startsWith(`${DOC_PREFIX}${token}/`);
}

export function validNames(token: string, file: string) {
    return SAFE.test(token) && SAFE_FILE.test(file) && ALLOWED_EXT.has(path.extname(file).toLowerCase());
}

/** La foto de perfil (selfie) se puede mostrar al cliente que recibe el pedido. */
export function isPublicDoc(file: string) {
    return file.startsWith('selfieUrl_');
}

export function mimeOf(file: string) {
    return MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
}

/** Lee el archivo protegido; si solo existe en /public (versión anterior), lo mueve primero. */
export async function readDoc(token: string, file: string): Promise<Buffer | null> {
    if (!validNames(token, file)) return null;
    const target = privateDir(token, file);
    try {
        return await fs.readFile(target);
    } catch {}
    const old = legacyDir(token, file);
    try {
        const buf = await fs.readFile(old);
        await fs.mkdir(privateDir(token), { recursive: true });
        await fs.writeFile(target, buf);
        await fs.unlink(old).catch(() => {});
        return buf;
    } catch {
        return null;
    }
}

export async function saveDoc(token: string, file: string, data: Buffer) {
    await fs.mkdir(privateDir(token), { recursive: true });
    await fs.writeFile(privateDir(token, file), data);
    return docUrl(token, file);
}

/** Todas las variantes de URL con las que puede estar guardado un archivo en la base. */
export function urlVariants(token: string, file: string) {
    return [`${DOC_PREFIX}${token}/${file}`, `${LEGACY_PREFIX}${token}/${file}`];
}
