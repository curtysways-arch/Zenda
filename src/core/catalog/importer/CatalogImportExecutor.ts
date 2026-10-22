/**
 * @file CatalogImportExecutor.ts
 * @module core/catalog/importer
 * @description Ejecutor por lotes transaccionales con idempotencia y persistencia canónica de productos y variantes.
 */

import prisma from '@/lib/prisma';
import { NormalizedProductRow, ImportExecutionOptions, ImportExecutionResult } from './types';
import { ImageResolverService } from './ImageResolverService';
import { InventoryEngine } from '@/core/inventory/InventoryEngine';
import { toDecimal, roundQty } from '@/lib/math/money';

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

        // Resolver bodega de la sucursal especificada para movimientos de inventario
        let resolvedWarehouseId: string | null = null;
        if (options.branchId) {
            const wh = await (prisma as any).warehouse.findFirst({
                where: { businessId, branchId: options.branchId, isDefault: true, active: true }
            });
            if (wh) {
                resolvedWarehouseId = wh.id;
            } else {
                const anyWh = await (prisma as any).warehouse.findFirst({
                    where: { businessId, branchId: options.branchId, active: true }
                });
                if (anyWh) resolvedWarehouseId = anyWh.id;
            }
        }

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

                        const updatedProduct = await (prisma as any).producto.update({
                            where: { id: row.existingId },
                            data: updateData
                        });

                        // Sincronización explícita de inventario físico mediante InventoryEngine
                        if (options.stockMode !== 'IGNORE' && row.stock !== undefined) {
                            if (options.branchId && resolvedWarehouseId) {
                                try {
                                    const currentStockDec = toDecimal(updatedProduct.stock ?? 0);
                                    const targetStockDec = roundQty(row.stock);
                                    const delta = options.stockMode === 'INCREMENT'
                                        ? targetStockDec
                                        : targetStockDec.minus(currentStockDec);
                                    if (!delta.isZero()) {
                                        await InventoryEngine.recordMovement({
                                            businessId,
                                            branchId: options.branchId,
                                            warehouseId: resolvedWarehouseId,
                                            productId: updatedProduct.id,
                                            quantity: delta,
                                            type: 'AJUSTE',
                                            reason: 'Ajuste de inventario por importación de catálogo',
                                            createdBy: userId || 'IMPORTADOR'
                                        });
                                    }
                                } catch (invErr: any) {
                                    errors.push({ row: row.index, sku: row.sku, error: `Error registrando inventario: ${invErr?.message}` });
                                }
                            } else {
                                errors.push({ row: row.index, sku: row.sku, error: 'Configuración pendiente: se requiere sucursal y bodega configurada para registrar movimientos físicos de inventario.' });
                            }
                        }

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
                                        atributos: row.variante.atributos ? row.variante.atributos : existingVar.atributos
                                    }
                                });

                                if (options.stockMode !== 'IGNORE' && row.variante.stock !== undefined) {
                                    if (options.branchId && resolvedWarehouseId) {
                                        try {
                                            const curVarStock = toDecimal(existingVar.stock ?? 0);
                                            const targetVarStock = roundQty(row.variante.stock);
                                            const varDelta = options.stockMode === 'INCREMENT'
                                                ? targetVarStock
                                                : targetVarStock.minus(curVarStock);
                                            if (!varDelta.isZero()) {
                                                await InventoryEngine.recordMovement({
                                                    businessId,
                                                    branchId: options.branchId,
                                                    warehouseId: resolvedWarehouseId,
                                                    productId: updatedProduct.id,
                                                    variantId: existingVar.id,
                                                    quantity: varDelta,
                                                    type: 'AJUSTE',
                                                    reason: 'Ajuste de inventario de variante por importación',
                                                    createdBy: userId || 'IMPORTADOR'
                                                });
                                            }
                                        } catch (varErr: any) {
                                            errors.push({ row: row.index, sku: varSku || undefined, error: `Error inventario variante: ${varErr?.message}` });
                                        }
                                    }
                                }
                            } else {
                                const nuevaVar = await (prisma as any).productoVariante.create({
                                    data: {
                                        productoId: updatedProduct.id,
                                        nombre: row.variante.nombre,
                                        sku: varSku,
                                        precio: row.variante.precio || row.precio,
                                        stock: 0,
                                        atributos: row.variante.atributos || null
                                    }
                                });
                                await (prisma as any).producto.update({
                                    where: { id: updatedProduct.id },
                                    data: { tieneVariantes: true }
                                });

                                if (row.variante.stock !== undefined && Number(row.variante.stock) > 0) {
                                    if (options.branchId && resolvedWarehouseId) {
                                        try {
                                            await InventoryEngine.recordMovement({
                                                businessId,
                                                branchId: options.branchId,
                                                warehouseId: resolvedWarehouseId,
                                                productId: updatedProduct.id,
                                                variantId: nuevaVar.id,
                                                quantity: roundQty(row.variante.stock),
                                                type: 'INICIAL',
                                                reason: `Inventario inicial variante ${row.variante.nombre}`,
                                                createdBy: userId || 'IMPORTADOR'
                                            });
                                        } catch (varInitErr: any) {
                                            errors.push({ row: row.index, sku: varSku || undefined, error: `Error stock inicial variante: ${varInitErr?.message}` });
                                        }
                                    }
                                }
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
                                stock: 0,
                                sku: row.sku || null,
                                activo: row.activo,
                                categoriaId: catId,
                                llevaEmpaque: row.llevaEmpaque,
                                precioEmpaque: row.precioEmpaque,
                                tieneVariantes: Boolean(row.variante && row.variante.nombre),
                                extraInfo: Object.keys(extraData).length > 0 ? extraData : undefined
                            }
                        });

                        // Registrar inventario inicial si se indicó stock
                        if (row.stock !== undefined && Number(row.stock) > 0) {
                            if (options.branchId && resolvedWarehouseId) {
                                try {
                                    await InventoryEngine.recordMovement({
                                        businessId,
                                        branchId: options.branchId,
                                        warehouseId: resolvedWarehouseId,
                                        productId: newProduct.id,
                                        quantity: roundQty(row.stock),
                                        type: 'INICIAL',
                                        reason: 'Inventario inicial por importación masiva',
                                        createdBy: userId || 'IMPORTADOR'
                                    });
                                } catch (pInitErr: any) {
                                    errors.push({ row: row.index, sku: row.sku, error: `Error stock inicial: ${pInitErr?.message}` });
                                }
                            } else {
                                errors.push({ row: row.index, sku: row.sku, error: 'Configuración pendiente: se requiere sucursal y bodega para registrar inventario físico inicial.' });
                            }
                        }

                        // Crear variante si viene especificada
                        if (row.variante && row.variante.nombre) {
                            const varSku = row.variante.sku || (row.sku ? `${row.sku}-${row.variante.nombre.replace(/\s+/g, '-').toUpperCase()}` : null);
                            const nuevaVar = await (prisma as any).productoVariante.create({
                                data: {
                                    productoId: newProduct.id,
                                    nombre: row.variante.nombre,
                                    sku: varSku,
                                    precio: row.variante.precio || row.precio,
                                    stock: 0,
                                    atributos: row.variante.atributos || null
                                }
                            });

                            if (row.variante.stock !== undefined && Number(row.variante.stock) > 0) {
                                if (options.branchId && resolvedWarehouseId) {
                                    try {
                                        await InventoryEngine.recordMovement({
                                            businessId,
                                            branchId: options.branchId,
                                            warehouseId: resolvedWarehouseId,
                                            productId: newProduct.id,
                                            variantId: nuevaVar.id,
                                            quantity: roundQty(row.variante.stock),
                                            type: 'INICIAL',
                                            reason: `Inventario inicial variante ${row.variante.nombre} por importación`,
                                            createdBy: userId || 'IMPORTADOR'
                                        });
                                    } catch (vInitErr: any) {
                                        errors.push({ row: row.index, sku: varSku || undefined, error: `Error stock inicial variante: ${vInitErr?.message}` });
                                    }
                                }
                            }
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
