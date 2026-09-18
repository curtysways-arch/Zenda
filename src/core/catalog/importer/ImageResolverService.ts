/**
 * @file ImageResolverService.ts
 * @module core/catalog/importer
 * @description Resolutor seguro de imágenes: descarga desde URLs con anti-SSRF, extracción de ZIPs y persistencia en StorageService.
 */

import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';
import { storageService } from '@/lib/storage/storageService';
import { ImageUrlValidator } from './ImageUrlValidator';

export class ImageResolverService {
    /**
     * Descarga y procesa una imagen por URL externa y la almacena permanentemente en Citiox
     */
    public static async resolveAndStoreFromUrl(
        url: string,
        businessId: string,
        category: string = 'productos'
    ): Promise<string | null> {
        const validation = ImageUrlValidator.validateUrl(url);
        if (!validation.valid) {
            console.warn(`[ImageResolver] URL rechazada (${validation.reason}): ${url}`);
            return null;
        }

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000); // 10s max

            const res = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'CitioxImageIngestion/1.0',
                    'Accept': 'image/*'
                }
            });
            clearTimeout(timeout);

            if (!res.ok) {
                console.warn(`[ImageResolver] Error al descargar imagen (${res.status}): ${url}`);
                return null;
            }

            // Límite de tamaño: 15MB
            const contentLength = res.headers.get('content-length');
            if (contentLength && parseInt(contentLength, 10) > 15 * 1024 * 1024) {
                console.warn(`[ImageResolver] Imagen excede 15MB: ${url}`);
                return null;
            }

            const arrayBuffer = await res.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // Almacenar mediante StorageService canónico
            const mediaResult = await storageService.handleUpload(buffer, businessId, category);
            return mediaResult.url;
        } catch (e: any) {
            console.warn(`[ImageResolver] Falla al resolver imagen ${url}:`, e?.message);
            return null;
        }
    }

    /**
     * Extrae un archivo ZIP de imágenes y genera un mapa de búsqueda por SKU / nombre de archivo
     * Protegido estrictamente contra ZIP Slip
     */
    public static extractZipImages(
        zipBuffer: Buffer
    ): Map<string, { buffer: Buffer; filename: string }> {
        const map = new Map<string, { buffer: Buffer; filename: string }>();
        const zip = new AdmZip(zipBuffer);
        const zipEntries = zip.getEntries();

        const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

        for (const entry of zipEntries) {
            if (entry.isDirectory) continue;

            const cleanName = path.basename(entry.entryName);
            // Protección Anti-ZIP Slip
            if (entry.entryName.includes('..') || cleanName.startsWith('.')) continue;

            const ext = path.extname(cleanName).toLowerCase();
            if (!allowedExtensions.has(ext)) continue;

            const baseKey = path.parse(cleanName).name.toUpperCase().trim();
            const fileBuffer = entry.getData();

            map.set(baseKey, { buffer: fileBuffer, filename: cleanName });
            // Guardar también con nombre completo
            map.set(cleanName.toUpperCase().trim(), { buffer: fileBuffer, filename: cleanName });
        }

        return map;
    }

    /**
     * Busca y almacena una imagen desde el mapa del ZIP haciendo match por SKU
     */
    public static async matchAndStoreFromZip(
        skuOrName: string,
        zipMap: Map<string, { buffer: Buffer; filename: string }>,
        businessId: string
    ): Promise<string | null> {
        if (!skuOrName) return null;
        const key = skuOrName.toUpperCase().trim();

        const match = zipMap.get(key);
        if (!match) return null;

        try {
            const mediaResult = await storageService.handleUpload(match.buffer, businessId, 'productos');
            return mediaResult.url;
        } catch (e: any) {
            console.warn(`[ImageResolver] Error al guardar imagen de ZIP para ${skuOrName}:`, e?.message);
            return null;
        }
    }
}
