import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { StorageProvider } from '../storage/storageProvider';
import { STORAGE_PATH, STORAGE_PROVIDER } from '../config/storage';

/**
 * Clase que implementa la lógica de subida, procesamiento y borrado de archivos.
 * Actualmente solo soporta el provider 'local'. Los demás providers pueden
 * implementarse siguiendo la misma interfaz.
 */
class LocalStorageProvider implements StorageProvider {
  /**
   * Guarda un buffer en disco y devuelve la URL pública.
   */
  async uploadFile(
    fileBuffer: Buffer,
    folderPath: string,
    filename: string,
    mimeType: string
  ): Promise<string> {
    // Garantizar la ruta absoluta dentro de STORAGE_PATH
    const targetDir = path.resolve(STORAGE_PATH, folderPath);
    await fs.promises.mkdir(targetDir, { recursive: true });

    // Guardar usando el nombre de archivo exacto provisto
    const fullPath = path.join(targetDir, filename);
    await fs.promises.writeFile(fullPath, fileBuffer);

    // URL pública servida mediante el endpoint /api/media/[...key]
    const publicUrl = `${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/media/${folderPath}/${filename}`;
    return publicUrl;
  }

  async deleteFile(fileUrl: string): Promise<void> {
    // Extraer la parte de la ruta después de /api/media/
    const match = fileUrl.match(/\/api\/media\/(.*)$/);
    if (!match) return; // No es una URL manejada por este provider
    const relativePath = decodeURIComponent(match[1]);
    const absolutePath = path.resolve(STORAGE_PATH, relativePath);
    try {
      await fs.promises.unlink(absolutePath);
    } catch (e) {
      // Ignorar error si el archivo ya no existe
    }
  }
}

/**
 * Service de alto nivel que coordina la subida, generación de thumbnails y
 * creación del registro Media en la base de datos.
 */
export class StorageService {
  private provider: StorageProvider;

  constructor() {
    this.provider = new LocalStorageProvider();
  }

  /**
   * Procesa una carga de imagen: validación, generación de variantes y registro DB.
   * @param buffer Buffer del archivo subido
   * @param businessId Id del negocio al que pertenece la imagen
   * @param category Categoría (logo, banner, service, staff, promotion, page, …)
   * @returns Información del media creado
   */
  async handleUpload(
    buffer: Buffer,
    businessId: string,
    category: string
  ): Promise<{
    id: string;
    url: string;
    thumbUrl: string;
    mediumUrl: string;
  }> {
    // 1️⃣ Detectar MIME real
    const { fileTypeFromBuffer } = await import('file-type');
    const type = await fileTypeFromBuffer(buffer);
    if (!type) throw new Error('Unable to detect file type');
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(type.mime)) {
      throw new Error('Unsupported file type');
    }

    // 2️⃣ Redimensionar y generar variantes con Sharp
    const original = await sharp(buffer)
      .rotate()
      .resize({ width: 1200, withoutEnlargement: true })
      .toFormat('webp')
      .toBuffer();
    const medium = await sharp(buffer)
      .rotate()
      .resize({ width: 600, withoutEnlargement: true })
      .toFormat('webp')
      .toBuffer();
    const thumb = await sharp(buffer)
      .rotate()
      .resize({ width: 200, withoutEnlargement: true })
      .toFormat('webp')
      .toBuffer();

    // 3️⃣ Guardar archivos con nombres predecibles y únicos
    const folder = `${businessId}/${category}`;
    const fileId = uuidv4();
    const originalName = `${fileId}_original.webp`;
    const mediumName = `${fileId}_medium.webp`;
    const thumbName = `${fileId}_thumb.webp`;

    const [originalUrl, mediumUrl, thumbUrl] = await Promise.all([
      this.provider.uploadFile(original, folder, originalName, 'image/webp'),
      this.provider.uploadFile(medium, folder, mediumName, 'image/webp'),
      this.provider.uploadFile(thumb, folder, thumbName, 'image/webp'),
    ]);

    // 4️⃣ Registrar en Prisma
    const db = (await import('../prisma')).default;
    const media = await db.media.create({
      data: {
        businessId,
        url: originalUrl,
        fileKey: `${folder}/${originalName}`,
        provider: STORAGE_PROVIDER,
        mimeType: 'image/webp',
        size: original.length,
        width: 1200,
        height: null,
        category,
      },
    });

    return {
      id: media.id,
      url: originalUrl,
      mediumUrl,
      thumbUrl,
    };
  }

  async deleteMedia(mediaId: string): Promise<void> {
    const db = (await import('../prisma')).default;
    const media = await db.media.findUnique({ where: { id: mediaId } });
    if (!media) return;

    // Borrar archivo original
    await this.provider.deleteFile(media.url);

    // Borrar medium y thumb utilizando el patrón predecible de sufijos
    const mediumUrl = media.url.replace('_original.webp', '_medium.webp');
    const thumbUrl = media.url.replace('_original.webp', '_thumb.webp');

    await Promise.all([
      this.provider.deleteFile(mediumUrl),
      this.provider.deleteFile(thumbUrl),
    ]);

    // Borrar el registro
    await db.media.delete({ where: { id: mediaId } });
  }
}

export const storageService = new StorageService();
