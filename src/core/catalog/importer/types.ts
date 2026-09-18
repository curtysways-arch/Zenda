/**
 * @file types.ts
 * @module core/catalog/importer
 * @description Tipos canónicos del Importador Universal de Catálogo para Citiox.
 */

export type ImportSourceType = 'GOOGLE_SHEETS' | 'EXCEL' | 'CSV' | 'ZIP';

export type ProductConflictMode = 'UPDATE' | 'SKIP' | 'KEEP_EXISTING';
export type StockConflictMode = 'REPLACE' | 'INCREMENT' | 'KEEP';
export type ImageConflictMode = 'REPLACE' | 'APPEND' | 'KEEP';
export type CategoryConflictMode = 'AUTO_CREATE' | 'ERROR';

export interface ImportExecutionOptions {
    productMode: ProductConflictMode;
    stockMode: StockConflictMode;
    imageMode: ImageConflictMode;
    categoryMode: CategoryConflictMode;
    defaultCategoryId?: string;
    branchId?: string;
}

export type CanonicalFieldKey = 
    | 'sku'
    | 'nombre'
    | 'descripcion'
    | 'categoria'
    | 'precio'
    | 'precioComparacion'
    | 'stock'
    | 'activo'
    | 'imagen'
    | 'imagen2'
    | 'imagen3'
    | 'imagen4'
    | 'marca'
    | 'codigoBarras'
    | 'peso'
    | 'llevaEmpaque'
    | 'precioEmpaque'
    | 'varianteNombre'
    | 'varianteSku'
    | 'variantePrecio'
    | 'varianteStock'
    | 'varianteImagen'
    | 'color'
    | 'talla'
    | 'dimensiones'
    | 'material'
    | 'origen';

export interface ColumnMappingDefinition {
    fileColumn: string;
    canonicalField: CanonicalFieldKey | 'IGNORE';
    confidence: number;
}

export interface RawRowData {
    __rowNumber: number;
    [key: string]: any;
}

export interface NormalizedProductRow {
    rowNumber: number;
    sku?: string;
    nombre: string;
    descripcion?: string;
    categoria?: string;
    precio: number;
    precioComparacion?: number;
    stock?: number;
    activo: boolean;
    imagenes: string[];
    marca?: string;
    codigoBarras?: string;
    peso?: string;
    llevaEmpaque: boolean;
    precioEmpaque: number;
    
    // Variantes
    variante?: {
        nombre?: string;
        sku?: string;
        precio?: number;
        stock?: number;
        imagenUrl?: string;
        atributos?: Record<string, string>;
    };

    // Extra metadata
    extraInfo?: {
        dimensiones?: string[];
        fichaTecnica?: Record<string, string>;
        caracteristicas?: string[];
    };

    // Estado de validación
    isValid: boolean;
    isExisting: boolean;
    existingId?: string;
    errors: string[];
    warnings: string[];
}

export interface ImportPreviewStats {
    totalRows: number;
    validRows: number;
    newProductsCount: number;
    updateProductsCount: number;
    errorRowsCount: number;
    warningRowsCount: number;
    categoriesToCreate: string[];
    duplicateSkusInFile: string[];
    planLimitReached: boolean;
    planLimitMessage?: string;
    allowedNewProducts: number;
}

export interface ImportPreviewResult {
    importId: string;
    stats: ImportPreviewStats;
    previewRows: NormalizedProductRow[];
    sampleErrors: Array<{ row: number; sku?: string; error: string }>;
    sampleWarnings: Array<{ row: number; sku?: string; warning: string }>;
    detectedColumns: string[];
    suggestedMapping: Record<string, CanonicalFieldKey | 'IGNORE'>;
}

export interface ImportExecutionResult {
    importId: string;
    success: boolean;
    totalRows: number;
    createdCount: number;
    updatedCount: number;
    errorCount: number;
    skippedCount: number;
    createdCategoriesCount: number;
    errors: Array<{ row: number; sku?: string; error: string }>;
}
