/**
 * @file CatalogImportExecutor.ts
 * @module core/catalog/importer
 * @description Ejecutor por lotes transaccionales con idempotencia y persistencia canónica de productos y variantes.
 */

import prisma from '@/lib/prisma';
import { NormalizedProductRow, ImportExecutionOptions, ImportExecutionResult } from './types';
import { ImageResolverService } from './ImageResolverService';

export class CatalogImportExecutor {
    private static BATCH_SIZE = 25;

    /**
     * Ejecuta la importación por lotes de forma segura y transaccional
     */
    public static async execute(
        importId: string,
        rows: NormalizedProductRow[],
        businessId: string,
        userId: string | undefined,
        options: ImportExecutionOptions,
        zipMap?: Map<string, { buffer: Buffer; filename: string }>,
        onProgress?: (processed: number, total: number) => void
    ): Promise<ImportExecutionResult> {
        let createdCount = 0;
        let updatedCount = 0;
        let errorCount = 0;
        let skippedCount = 0;
        let createdCategoriesCount = 0;
        const errors: Array<{ row: number; sku?: string; error: string }> = [];

        // 1. Resolver y auto-crear categorías necesarias dentro del mismo businessId
        const categoryCache = new Map<string, string>();
        const existingCats = await (prisma as any).categoriaProducto.findMany({
            where: { negocioId: businessId }
        });
        for (const c of existingCats) {
            categoryCache.set(c.nombre.toLowerCase().trim(), c.id);
        }

        const distinctCategoryNames = Array.from(new Set(rows.map(r => r.categoria).filter(Boolean))) as string[];
        for (const catName of distinctCategoryNames) {
            const catLower = catName.toLowerCase().trim();
            if (!categoryCache.has(catLower)) {
                try {
                    const newCat = await (prisma as any).categoriaProducto.create({
                        data: {
                            nombre: catName.trim(),
                            negocioId: businessId,
                            orden: categoryCache.size + 1,
                            activo: true
                        }
                    });
                    categoryCache.set(catLower, newCat.id);
                    createdCategoriesCount++;
                } catch (e: any) {
                    console.error(`Error al crear categoría "${catName}":`, e?.message);
                }
            }
        }

        // 2. Procesar por lotes de tamaño controlado
        const validRows = rows.filter(r => r.isValid);
        const total = validRows.length;

        for (let i = 0; i < total; i += this.BATCH_SIZE) {
            const batch = validRows.slice(i, i + this.BATCH_SIZE);

            for (const row of batch) {
                try {
                    // Resolucin de imagen (URLs externas o ZIP por SKU)
                    let finalImageUrl: string | null = null;
                    const finalExtraImages: string[] = [];

                    // Prioridad 1: ZIP por SKU si fue suministrado
                    if (zipMap && row.sku) {
                        const zipImg = await ImageResolverService.matchAndStoreFromZip(row.sku, zipMap, businessId);
                        if (zipImg) finalImageUrl = zipImg;
                    }

                    // Prioridad 2: URLs de imágenes
                    if (row.imagenes && row.imagenes.length > 0) {
                        for (let imgIdx = 0; imgIdx < row.imagenes.length; imgIdx++) {
                            const rawUrl = row.imagenes[imgIdx];
                            if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
                                const storedUrl = await ImageResolverService.resolveAndStoreFromUrl(rawUrl, businessId, 'productos');
                                if (storedUrl) {
                                    if (!finalImageUrl) finalImageUrl = storedUrl;
                                    else finalExtraImages.push(storedUrl);
                                }
                            } else if (!finalImageUrl) {
                                finalImageUrl = rawUrl; // URL interna ya existente
                            }
                        }
                    }

                    // Resolver ID de categoría
                    const catId = row.categoria ? (categoryCache.get(row.categoria.toLowerCase().trim()) || options.defaultCategoryId || null) : (options.defaultCategoryId || null);

                    if (row.isExisting && row.existingId) {
                        if (options.productMode === 'SKIP') {
                            skippedCount++;
                            continue;
                        }

                        // Modo ACTUALIZACIÓN
                        const updateData: any = {};
                        if (options.productMode === 'UPDATE') {
                            updateData.nombre = row.nombre;
                            if (row.descripcion !== undefined) updateData.descripcion = row.descripcion;
                            updateData.precio = row.precio;
                            if (catId) updateData.categoriaId = catId;
                            updateData.activo = row.activo;
                            if (row.sku) updateData.sku = row.sku;
                            updateData.llevaEmpaque = row.llevaEmpaque;
                            updateData.precioEmpaque = row.precioEmpaque;
                        }

                        if (options.imageMode === 'REPLACE' && finalImageUrl) {
                            updateData.imagenUrl = finalImageUrl;
                        }

                        if (options.stockMode === 'REPLACE' && row.stock !== undefined) {
                            updateData.stock = row.stock;
                        } else if (options.stockMode === 'INCREMENT' && row.stock !== undefined) {
                            updateData.stock = { increment: row.stock };
                        }

                        const updatedProduct = await (prisma as any).producto.update({
                            where: { id: row.existingId },
                            data: updateData
                        });

                        // Variante asociada si existe
                        if (row.variante && row.variante.nombre) {
                            const varSku = row.variante.sku || (row.sku ? `${row.sku}-${row.variante.nombre.replace(/\s+/g, '-').toUpperCase()}` : null);
                            const existingVar = varSku ? await (prisma as any).productoVariante.findFirst({
                                where: { productoId: updatedProduct.id, sku: varSku }
                            }) : null;

                            if (existingVar) {
                                await (prisma as any).productoVariante.update({
                                    where: { id: existingVar.id },
                                    data: {
                                        nombre: row.variante.nombre,
                                        precio: row.variante.precio !== undefined ? row.variante.precio : existingVar.precio,
                                        stock: options.stockMode === 'INCREMENT' ? { increment: row.variante.stock || 0 } : (row.variante.stock !== undefined ? row.variante.stock : existingVar.stock),
                                        atributos: row.variante.atributos ? row.variante.atributos : existingVar.atributos
                                    }
                                });
                            } else {
                                await (prisma as any).productoVariante.create({
                                    data: {
                                        productoId: updatedProduct.id,
                                        nombre: row.variante.nombre,
                                        sku: varSku,
                                        precio: row.variante.precio || row.precio,
                                        stock: row.variante.stock || 0,
                                        atributos: row.variante.atributos || null
                                    }
                                });
                                await (prisma as any).producto.update({
                                    where: { id: updatedProduct.id },
                                    data: { tieneVariantes: true }
                                });
                            }
                        }

                        updatedCount++;
                    } else {
                        // Modo CREACIÓN DE NUEVO PRODUCTO
                        const extraData: any = {};
                        if (finalExtraImages.length > 0) extraData.imagenes = finalExtraImages;
                        if (row.extraInfo?.dimensiones) extraData.dimensiones = row.extraInfo.dimensiones;
                        if (row.extraInfo?.fichaTecnica) extraData.fichaTecnica = row.extraInfo.fichaTecnica;
                        if (row.extraInfo?.caracteristicas) extraData.caracteristicas = row.extraInfo.caracteristicas;

                        const newProduct = await (prisma as any).producto.create({
                            data: {
                                negocioId: businessId,
                                nombre: row.nombre,
                                descripcion: row.descripcion || null,
                                precio: row.precio,
                                imagenUrl: finalImageUrl || null,
                                stock: row.stock !== undefined ? row.stock : null,
                                sku: row.sku || null,
                                activo: row.activo,
                                categoriaId: catId,
                                llevaEmpaque: row.llevaEmpaque,
                                precioEmpaque: row.precioEmpaque,
                                tieneVariantes: Boolean(row.variante && row.variante.nombre),
                                extraInfo: Object.keys(extraData).length > 0 ? extraData : undefined
                            }
                        });

                        // Crear variante si viene especificada
                        if (row.variante && row.variante.nombre) {
                            const varSku = row.variante.sku || (row.sku ? `${row.sku}-${row.variante.nombre.replace(/\s+/g, '-').toUpperCase()}` : null);
                            await (prisma as any).productoVariante.create({
                                data: {
                                    productoId: newProduct.id,
                                    nombre: row.variante.nombre,
                                    sku: varSku,
                                    precio: row.variante.precio || row.precio,
                                    stock: row.variante.stock || 0,
                                    atributos: row.variante.atributos || null
                                }
                            });
                        }

                        // Si se especificó una sucursal, crear o vincular BranchInventory
                        if (options.branchId) {
                            try {
                                await (prisma as any).branchProduct.upsert({
                                    where: {
                                        branchId_productId: {
                                            branchId: options.branchId,
                                            productId: newProduct.id
                                        }
                                    },
                                    update: { enabled: true },
                                    create: {
                                        branchId: options.branchId,
                                        productId: newProduct.id,
                                        businessId: businessId,
                                        enabled: true
                                    }
                                });
                            } catch (_) {}
                        }

                        createdCount++;
                    }
                } catch (rowErr: any) {
                    errorCount++;
                    errors.push({
                        row: row.rowNumber,
                        sku: row.sku,
                        error: rowErr?.message || 'Error al persistir fila en base de datos'
                    });
                }
            }

            if (onProgress) {
                onProgress(Math.min(i + this.BATCH_SIZE, total), total);
            }
        }

        // 3. Actualizar registro en CatalogImport si existe
        try {
            await (prisma as any).catalogImport.update({
                where: { id: importId },
                data: {
                    status: errorCount === 0 ? 'COMPLETED' : (createdCount > 0 || updatedCount > 0 ? 'COMPLETED_WITH_ERRORS' : 'FAILED'),
                    processedRows: total,
                    createdCount,
                    updatedCount,
                    errorCount,
                    skippedCount,
                    errorSummary: errors.length > 0 ? errors.slice(0, 50) : undefined
                }
            });
        } catch (_) {}

        return {
            importId,
            success: errorCount === 0,
            totalRows: total,
            createdCount,
            updatedCount,
            errorCount,
            skippedCount,
            createdCategoriesCount,
            errors
        };
    }
}
