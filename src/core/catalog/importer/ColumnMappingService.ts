/**
 * @file ColumnMappingService.ts
 * @module core/catalog/importer
 * @description Mapeador heurístico inteligente de columnas de archivos a campos canónicos de Citiox.
 */

import { CanonicalFieldKey } from './types';

export class ColumnMappingService {
    private static SYNONYMS: Record<CanonicalFieldKey, string[]> = {
        sku: ['sku', 'codigo', 'código', 'cod', 'referencia', 'ref', 'barcode', 'codigo de barras', 'código de barras', 'codigo_producto', 'identificador'],
        nombre: ['nombre', 'producto', 'nombre producto', 'nombre_producto', 'articulo', 'artículo', 'descripcion corta', 'title', 'name', 'item', 'titulo'],
        descripcion: ['descripcion', 'descripción', 'detalle', 'detalles', 'description', 'observaciones', 'resumen', 'info'],
        categoria: ['categoria', 'categoría', 'seccion', 'sección', 'departamento', 'category', 'rubro', 'tipo', 'grupo'],
        precio: ['precio', 'pvp', 'precio venta', 'precio_venta', 'valor', 'price', 'precio unitario', 'monto', 'costo venta'],
        precioComparacion: ['precio comparacion', 'precio anterior', 'precio tachado', 'precio regular', 'precio original', 'pvp anterior', 'compare_price'],
        stock: ['stock', 'cantidad', 'inventario', 'existencias', 'qty', 'quantity', 'unidades', 'disponible'],
        activo: ['activo', 'habilitado', 'publicado', 'estado', 'visible', 'active', 'status'],
        imagen: ['imagen', 'imagen principal', 'foto', 'foto principal', 'image', 'image_url', 'url imagen', 'foto 1', 'imagen 1', 'portada'],
        imagen2: ['imagen 2', 'foto 2', 'imagen2', 'foto2', 'image 2', 'image2'],
        imagen3: ['imagen 3', 'foto 3', 'imagen3', 'foto3', 'image 3', 'image3'],
        imagen4: ['imagen 4', 'foto 4', 'imagen4', 'foto4', 'image 4', 'image4'],
        marca: ['marca', 'fabricante', 'brand', 'brand_name'],
        codigoBarras: ['codigo de barras', 'código de barras', 'barcode', 'ean', 'upc', 'gtin'],
        peso: ['peso', 'weight', 'gramos', 'kilos', 'kg'],
        llevaEmpaque: ['empaque', 'lleva empaque', 'requiere empaque', 'takeaway'],
        precioEmpaque: ['precio empaque', 'costo empaque'],
        varianteNombre: ['variante', 'nombre variante', 'combinacion', 'opcion', 'variant'],
        varianteSku: ['sku variante', 'variante sku', 'variant_sku'],
        variantePrecio: ['precio variante', 'variante precio', 'variant_price'],
        varianteStock: ['stock variante', 'variante stock', 'variant_stock'],
        varianteImagen: ['imagen variante', 'foto variante', 'variant_image'],
        color: ['color', 'tono'],
        talla: ['talla', 'tamano', 'tamaño', 'size', 'medida'],
        dimensiones: ['dimensiones', 'medidas', 'alto ancho'],
        material: ['material', 'composicion', 'composición'],
        origen: ['origen', 'pais de origen', 'fabricacion']
    };

    /**
     * Limpia y normaliza una cabecera para comparación flexible
     */
    public static cleanHeader(header: string): string {
        return header
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Quitar acentos
            .replace(/[_-]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    /**
     * Detecta la mejor correspondencia para una columna
     */
    public static detectMapping(columnName: string): { field: CanonicalFieldKey | 'IGNORE'; confidence: number } {
        const clean = this.cleanHeader(columnName);

        for (const [field, synonyms] of Object.entries(this.SYNONYMS) as [CanonicalFieldKey, string[]][]) {
            for (const syn of synonyms) {
                const cleanSyn = this.cleanHeader(syn);
                if (clean === cleanSyn) {
                    return { field, confidence: 1.0 };
                }
                if (clean.includes(cleanSyn) || cleanSyn.includes(clean)) {
                    return { field, confidence: 0.8 };
                }
            }
        }

        return { field: 'IGNORE', confidence: 0 };
    }

    /**
     * Genera un mapeo sugerido completo a partir de una lista de columnas de archivo
     */
    public static generateSuggestedMapping(detectedColumns: string[]): Record<string, CanonicalFieldKey | 'IGNORE'> {
        const result: Record<string, CanonicalFieldKey | 'IGNORE'> = {};
        const assignedFields = new Set<string>();

        // 1. Asignaciones de alta confianza primero
        for (const col of detectedColumns) {
            const { field, confidence } = this.detectMapping(col);
            if (field !== 'IGNORE' && confidence >= 0.9 && !assignedFields.has(field)) {
                result[col] = field;
                assignedFields.add(field);
            }
        }

        // 2. Asignaciones secundarias
        for (const col of detectedColumns) {
            if (result[col]) continue;
            const { field, confidence } = this.detectMapping(col);
            if (field !== 'IGNORE' && confidence >= 0.7 && !assignedFields.has(field)) {
                result[col] = field;
                assignedFields.add(field);
            } else {
                result[col] = 'IGNORE';
            }
        }

        return result;
    }
}
