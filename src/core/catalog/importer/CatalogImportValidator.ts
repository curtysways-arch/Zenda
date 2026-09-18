/**
 * @file CatalogImportValidator.ts
 * @module core/catalog/importer
 * @description Validador de importación y motor de Dry Run (sin efectos secundarios en BD).
 */

import prisma from '@/lib/prisma';
import { EntitlementsService } from '@/core/entitlements/EntitlementsService';
import { 
    RawRowData, 
    CanonicalFieldKey, 
    NormalizedProductRow, 
    ImportPreviewResult, 
    ImportExecutionOptions 
} from './types';

export class CatalogImportValidator {
    /**
     * Ejecuta el Dry Run de validación normalizando cada fila y calculando estadísticas
     */
    public static async validateImport(
        rows: RawRowData[],
        mapping: Record<string, CanonicalFieldKey | 'IGNORE'>,
        businessId: string,
        options: ImportExecutionOptions
    ): Promise<ImportPreviewResult> {
        // 1. Obtener productos y categorías existentes del negocio en una sola consulta
        const [existingProducts, existingCategories, planLimit] = await Promise.all([
            (prisma as any).producto.findMany({
                where: { negocioId: businessId },
                select: { id: true, nombre: true, sku: true, precio: true, stock: true, categoriaId: true }
            }),
            (prisma as any).categoriaProducto.findMany({
                where: { negocioId: businessId },
                select: { id: true, nombre: true }
            }),
            EntitlementsService.checkProductLimit(businessId)
        ]);

        const existingSkuMap = new Map<string, any>();
        const existingNameMap = new Map<string, any>();

        for (const p of existingProducts) {
            if (p.sku) existingSkuMap.set(p.sku.toUpperCase().trim(), p);
            if (p.nombre) existingNameMap.set(p.nombre.toLowerCase().trim(), p);
        }

        const categorySet = new Set<string>();
        for (const c of existingCategories) {
            categorySet.add(c.nombre.toLowerCase().trim());
        }

        const normalizedRows: NormalizedProductRow[] = [];
        const seenSkusInFile = new Map<string, number>();
        const duplicateSkusInFile: string[] = [];
        const categoriesToCreateSet = new Set<string>();
        const sampleErrors: Array<{ row: number; sku?: string; error: string }> = [];
        const sampleWarnings: Array<{ row: number; sku?: string; warning: string }> = [];

        let newProductsCount = 0;
        let updateProductsCount = 0;
        let errorRowsCount = 0;
        let warningRowsCount = 0;

        for (const raw of rows) {
            const rowNumber = raw.__rowNumber || 0;
            const mappedValues: Partial<Record<CanonicalFieldKey, any>> = {};

            // Extraer valores según mapping
            for (const [fileCol, canonicalField] of Object.entries(mapping)) {
                if (canonicalField !== 'IGNORE' && raw[fileCol] !== undefined) {
                    mappedValues[canonicalField] = raw[fileCol];
                }
            }

            const rowErrors: string[] = [];
            const rowWarnings: string[] = [];

            // ── Validación de Nombre (Obligatorio) ──
            const nombre = mappedValues.nombre ? String(mappedValues.nombre).trim() : '';
            if (!nombre) {
                rowErrors.push('El nombre del producto es obligatorio.');
            }

            // ── Validación de Precio (Obligatorio numérico >= 0) ──
            let precio = 0;
            if (mappedValues.precio === undefined || mappedValues.precio === null || String(mappedValues.precio).trim() === '') {
                rowErrors.push('El precio es obligatorio.');
            } else {
                const cleanPrice = String(mappedValues.precio).replace(',', '.').replace(/[^0-9.]/g, '').trim();
                precio = parseFloat(cleanPrice);
                if (isNaN(precio) || precio < 0) {
                    rowErrors.push(`Precio inválido: "${mappedValues.precio}".`);
                }
            }

            // ── SKU y Unicidad en el archivo ──
            const rawSku = mappedValues.sku ? String(mappedValues.sku).trim() : undefined;
            const sku = rawSku || undefined;

            if (sku) {
                const skuUpper = sku.toUpperCase();
                if (seenSkusInFile.has(skuUpper)) {
                    duplicateSkusInFile.push(sku);
                    rowErrors.push(`SKU duplicado en el archivo (repetido en fila ${seenSkusInFile.get(skuUpper)} y ${rowNumber}).`);
                } else {
                    seenSkusInFile.set(skuUpper, rowNumber);
                }
            }

            // ── Identificación de Producto Existente vs Nuevo ──
            let isExisting = false;
            let existingId: string | undefined = undefined;

            if (sku && existingSkuMap.has(sku.toUpperCase())) {
                isExisting = true;
                existingId = existingSkuMap.get(sku.toUpperCase()).id;
            } else if (!sku && nombre && existingNameMap.has(nombre.toLowerCase())) {
                isExisting = true;
                existingId = existingNameMap.get(nombre.toLowerCase()).id;
            }

            if (isExisting) {
                updateProductsCount++;
            } else {
                newProductsCount++;
            }

            // ── Categoría ──
            const categoria = mappedValues.categoria ? String(mappedValues.categoria).trim() : undefined;
            if (categoria) {
                const catLower = categoria.toLowerCase();
                if (!categorySet.has(catLower)) {
                    categoriesToCreateSet.add(categoria);
                    if (options.categoryMode === 'ERROR') {
                        rowErrors.push(`La categoría "${categoria}" no existe.`);
                    } else {
                        rowWarnings.push(`La categoría "${categoria}" no existe y se creará automáticamente.`);
                    }
                }
            }

            // ── Stock ──
            let stock: number | undefined = undefined;
            if (mappedValues.stock !== undefined && mappedValues.stock !== null && String(mappedValues.stock).trim() !== '') {
                const cleanStock = parseInt(String(mappedValues.stock).replace(/[^0-9-]/g, ''), 10);
                if (isNaN(cleanStock)) {
                    rowWarnings.push(`Stock inválido "${mappedValues.stock}", se usará 0.`);
                    stock = 0;
                } else {
                    stock = cleanStock;
                }
            }

            // ── Imágenes ──
            const imagenes: string[] = [];
            if (mappedValues.imagen && String(mappedValues.imagen).trim()) imagenes.push(String(mappedValues.imagen).trim());
            if (mappedValues.imagen2 && String(mappedValues.imagen2).trim()) imagenes.push(String(mappedValues.imagen2).trim());
            if (mappedValues.imagen3 && String(mappedValues.imagen3).trim()) imagenes.push(String(mappedValues.imagen3).trim());
            if (mappedValues.imagen4 && String(mappedValues.imagen4).trim()) imagenes.push(String(mappedValues.imagen4).trim());

            const isValid = rowErrors.length === 0;

            if (!isValid) {
                errorRowsCount++;
                for (const err of rowErrors) {
                    if (sampleErrors.length < 20) sampleErrors.push({ row: rowNumber, sku, error: err });
                }
            }
            if (rowWarnings.length > 0) {
                warningRowsCount++;
                for (const warn of rowWarnings) {
                    if (sampleWarnings.length < 20) sampleWarnings.push({ row: rowNumber, sku, warning: warn });
                }
            }

            normalizedRows.push({
                rowNumber,
                sku,
                nombre,
                descripcion: mappedValues.descripcion ? String(mappedValues.descripcion).trim() : undefined,
                categoria,
                precio,
                precioComparacion: mappedValues.precioComparacion ? parseFloat(String(mappedValues.precioComparacion).replace(',', '.')) : undefined,
                stock,
                activo: mappedValues.activo !== undefined ? (String(mappedValues.activo).toLowerCase() !== 'false' && String(mappedValues.activo).toLowerCase() !== '0') : true,
                imagenes,
                marca: mappedValues.marca ? String(mappedValues.marca).trim() : undefined,
                codigoBarras: mappedValues.codigoBarras ? String(mappedValues.codigoBarras).trim() : undefined,
                peso: mappedValues.peso ? String(mappedValues.peso).trim() : undefined,
                llevaEmpaque: mappedValues.llevaEmpaque !== undefined ? (String(mappedValues.llevaEmpaque).toLowerCase() !== 'false') : true,
                precioEmpaque: mappedValues.precioEmpaque ? parseFloat(String(mappedValues.precioEmpaque).replace(',', '.')) : 0.25,
                variante: mappedValues.varianteNombre ? {
                    nombre: String(mappedValues.varianteNombre).trim(),
                    sku: mappedValues.varianteSku ? String(mappedValues.varianteSku).trim() : undefined,
                    precio: mappedValues.variantePrecio ? parseFloat(String(mappedValues.variantePrecio).replace(',', '.')) : undefined,
                    stock: mappedValues.varianteStock ? parseInt(String(mappedValues.varianteStock), 10) : undefined,
                    imagenUrl: mappedValues.varianteImagen ? String(mappedValues.varianteImagen).trim() : undefined,
                    atributos: (mappedValues.color || mappedValues.talla) ? {
                        ...(mappedValues.color ? { color: String(mappedValues.color).trim() } : {}),
                        ...(mappedValues.talla ? { talla: String(mappedValues.talla).trim() } : {})
                    } : undefined
                } : undefined,
                isValid,
                isExisting,
                existingId,
                errors: rowErrors,
                warnings: rowWarnings
            });
        }

        // ── Validación de Límites de Plan ──
        const allowedNewProducts = planLimit.remaining ?? 9999;
        const planLimitReached = !planLimit.allowed || (newProductsCount > allowedNewProducts);
        const planLimitMessage = planLimitReached 
            ? `Tu plan actual permite ${planLimit.limit} productos (restan ${allowedNewProducts} cupos). El archivo intenta crear ${newProductsCount} productos nuevos.`
            : undefined;

        const importId = `imp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        return {
            importId,
            stats: {
                totalRows: rows.length,
                validRows: rows.length - errorRowsCount,
                newProductsCount,
                updateProductsCount,
                errorRowsCount,
                warningRowsCount,
                categoriesToCreate: Array.from(categoriesToCreateSet),
                duplicateSkusInFile,
                planLimitReached,
                planLimitMessage,
                allowedNewProducts
            },
            previewRows: normalizedRows.slice(0, 50), // Primeras 50 filas para vista previa rápida
            sampleErrors,
            sampleWarnings,
            detectedColumns: Object.keys(rows[0] || {}).filter(k => k !== '__rowNumber'),
            suggestedMapping: mapping
        };
    }
}
