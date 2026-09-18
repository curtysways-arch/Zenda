'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { 
    UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, AlertTriangle, 
    ArrowRight, ArrowLeft, RefreshCw, Download, FileText, Database, ShieldAlert,
    Check, X, Eye, HelpCircle, Layers, Image as ImageIcon, ChevronRight, Play, ExternalLink
} from 'lucide-react';
import TemplateDownloadButton from '@/components/admin/TemplateDownloadButton';

type Step = 1 | 2 | 3 | 4;

const CANONICAL_FIELDS: { key: string; label: string; required?: boolean; description: string }[] = [
    { key: 'IGNORE', label: '— Ignorar esta columna —', description: 'No se importará este dato' },
    { key: 'nombre', label: 'Nombre del Producto *', required: true, description: 'Título visible del producto' },
    { key: 'precio', label: 'Precio de Venta *', required: true, description: 'Precio numérico (ej: 19.99)' },
    { key: 'sku', label: 'SKU / Código Referencia', description: 'Código único para identificar y actualizar' },
    { key: 'categoria', label: 'Categoría', description: 'Nombre de categoría (se crea si no existe)' },
    { key: 'stock', label: 'Stock / Inventario', description: 'Cantidad en existencias' },
    { key: 'precioComparacion', label: 'Precio Anterior / Tachado', description: 'Precio original de oferta' },
    { key: 'descripcion', label: 'Descripción', description: 'Detalle o características del producto' },
    { key: 'imagen', label: 'Imagen Principal (URL o archivo ZIP)', description: 'URL directa HTTPS o nombre de archivo' },
    { key: 'imagen2', label: 'Imagen 2 (Galería)', description: 'Segunda imagen' },
    { key: 'imagen3', label: 'Imagen 3 (Galería)', description: 'Tercera imagen' },
    { key: 'activo', label: 'Activo / Visible (SI / NO)', description: 'Estado visible en catálogo' },
    { key: 'llevaEmpaque', label: 'Lleva Empaque (SI / NO)', description: 'Si requiere empaque para delivery' },
    { key: 'precioEmpaque', label: 'Precio del Empaque', description: 'Costo del empaque' },
    { key: 'marca', label: 'Marca / Fabricante', description: 'Marca del artículo' },
    { key: 'codigoBarras', label: 'Código de Barras / EAN', description: 'Código de barras de fábrica' },
    { key: 'varianteNombre', label: 'Nombre de Variante (Talla, Color)', description: 'Ej: Talla M / Rojo' },
    { key: 'varianteSku', label: 'SKU de Variante', description: 'Código específico de la variante' },
    { key: 'variantePrecio', label: 'Precio de Variante', description: 'Precio específico de la variante' },
    { key: 'varianteStock', label: 'Stock de Variante', description: 'Inventario de la variante' },
    { key: 'color', label: 'Atributo Color', description: 'Ej: Negro, Azul' },
    { key: 'talla', label: 'Atributo Talla / Medida', description: 'Ej: S, M, L, XL, 42' },
];

export default function CatalogoImportarPage() {
    const [step, setStep] = useState<Step>(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Paso 1 State
    const [sourceType, setSourceType] = useState<'EXCEL' | 'CSV' | 'GOOGLE_SHEETS' | 'ZIP'>('EXCEL');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [zipFile, setZipFile] = useState<File | null>(null);
    const [googleSheetUrl, setGoogleSheetUrl] = useState('');
    const [sheetNames, setSheetNames] = useState<string[]>([]);
    const [selectedSheet, setSelectedSheet] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const zipInputRef = useRef<HTMLInputElement>(null);

    // Paso 2 State (Parsed data & mapping)
    const [columns, setColumns] = useState<string[]>([]);
    const [rawRows, setRawRows] = useState<any[]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [previewSampleRows, setPreviewSampleRows] = useState<any[]>([]);

    // Paso 3 State (Validation & Dry Run)
    const [previewResult, setPreviewResult] = useState<any>(null);
    const [importOptions, setImportOptions] = useState({
        productMode: 'UPDATE',
        imageMode: 'KEEP',
        stockMode: 'REPLACE',
        categoryMode: 'AUTO_CREATE'
    });
    const [previewFilter, setPreviewFilter] = useState<'ALL' | 'NEW' | 'UPDATE' | 'ERROR'>('ALL');

    // Paso 4 State (Execution Result)
    const [executionResult, setExecutionResult] = useState<any>(null);
    const [isExecuting, setIsExecuting] = useState(false);

    // ─────────────────────────────────────────────────────────
    // ACCIONES PASO 1: Subir y Parsear Archivo o Google Sheets
    // ─────────────────────────────────────────────────────────
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);
            setError(null);
            const name = file.name.toLowerCase();
            if (name.endsWith('.xlsx') || name.endsWith('.xls')) setSourceType('EXCEL');
            else if (name.endsWith('.csv') || name.endsWith('.txt')) setSourceType('CSV');
            else if (name.endsWith('.zip')) setSourceType('ZIP');
        }
    };

    const handleZipSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setZipFile(e.target.files[0]);
        }
    };

    const handleParseSource = async (sheetToRead?: string) => {
        setLoading(true);
        setError(null);
        try {
            let res: Response;
            if (sourceType === 'GOOGLE_SHEETS') {
                if (!googleSheetUrl.trim()) {
                    throw new Error('Por favor ingresa el enlace del documento de Google Sheets.');
                }
                res = await fetch('/api/admin/catalog/import/parse', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ googleSheetUrl })
                });
            } else {
                if (!selectedFile) {
                    throw new Error('Por favor selecciona un archivo (.xlsx, .csv o .zip).');
                }
                const formData = new FormData();
                formData.append('file', selectedFile);
                if (sheetToRead) {
                    formData.append('sheetName', sheetToRead);
                }
                res = await fetch('/api/admin/catalog/import/parse', {
                    method: 'POST',
                    body: formData
                });
            }

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Error al analizar el origen de datos.');
            }

            setColumns(data.columns || []);
            setRawRows(data.rows || []);
            setPreviewSampleRows(data.previewRows || []);
            setMapping(data.suggestedMapping || {});

            if (data.sheets && data.sheets.length > 1) {
                setSheetNames(data.sheets);
                setSelectedSheet(data.selectedSheet || data.sheets[0]);
            }

            setStep(2);
        } catch (err: any) {
            setError(err.message || 'Error inesperado.');
        } finally {
            setLoading(false);
        }
    };

    // ─────────────────────────────────────────────────────────
    // ACCIONES PASO 2: Validar Mapeo y Ejecutar Dry Run
    // ─────────────────────────────────────────────────────────
    const handleValidateDryRun = async () => {
        // Validar que al menos 'nombre' y 'precio' estén mapeados
        const mappedFields = Object.values(mapping);
        if (!mappedFields.includes('nombre')) {
            setError('Debes asignar al menos una columna al campo obligatorio "Nombre del Producto".');
            return;
        }
        if (!mappedFields.includes('precio')) {
            setError('Debes asignar al menos una columna al campo obligatorio "Precio de Venta".');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/catalog/import/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rows: rawRows,
                    mapping,
                    options: importOptions
                })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Error al validar las filas de datos.');
            }

            setPreviewResult(data.preview);
            setStep(3);
        } catch (err: any) {
            setError(err.message || 'Error al validar.');
        } finally {
            setLoading(false);
        }
    };

    // ─────────────────────────────────────────────────────────
    // ACCIONES PASO 3: Ejecutar Importación en Firme
    // ─────────────────────────────────────────────────────────
    const handleExecuteImport = async () => {
        if (!previewResult) return;
        setIsExecuting(true);
        setLoading(true);
        setError(null);

        try {
            let res: Response;

            // Si hay un archivo ZIP de imágenes adjunto, enviar como multipart FormData
            if (zipFile) {
                const formData = new FormData();
                formData.append('rows', JSON.stringify(previewResult.previewRows));
                formData.append('options', JSON.stringify(importOptions));
                formData.append('zipFile', zipFile);
                formData.append('sourceName', selectedFile?.name || 'Archivo con ZIP');

                res = await fetch('/api/admin/catalog/import/execute', {
                    method: 'POST',
                    body: formData
                });
            } else {
                res = await fetch('/api/admin/catalog/import/execute', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        rows: previewResult.previewRows,
                        options: importOptions,
                        sourceName: selectedFile ? selectedFile.name : (sourceType === 'GOOGLE_SHEETS' ? 'Google Sheets' : 'Importación Manual')
                    })
                });
            }

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Error al ejecutar la importación.');
            }

            setExecutionResult(data.result);
            setStep(4);
        } catch (err: any) {
            setError(err.message || 'Error al ejecutar la importación.');
        } finally {
            setLoading(false);
            setIsExecuting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 text-slate-800 dark:text-slate-100">
            {/* Header */}
            <div className="max-w-6xl mx-auto mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                            <Link href="/admin/productos" className="hover:text-primary-600 transition-colors">Productos</Link>
                            <ChevronRight size={14} />
                            <span>Importador Universal</span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                            <FileSpreadsheet className="text-primary-600 w-8 h-8" />
                            Importador de Catálogo
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Carga o actualiza tus productos masivamente desde Excel, CSV, Google Sheets o archivos comprimidos ZIP.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <TemplateDownloadButton />
                        <Link 
                            href="/admin/catalogo/importaciones" 
                            className="inline-flex items-center gap-2 px-3 py-2 bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-900 rounded-xl text-xs font-semibold hover:bg-primary-100 transition-all shadow-sm"
                        >
                            <Database size={14} />
                            Historial
                        </Link>
                    </div>
                </div>

                {/* Wizard Steps Progress Bar */}
                <div className="mt-8 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
                    <div className="grid grid-cols-4 gap-2 text-center text-xs font-medium">
                        <div className={`flex items-center justify-center gap-2 py-2 rounded-lg transition-all ${step === 1 ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300 font-bold' : step > 1 ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 1 ? 'bg-primary-600 text-white' : step > 1 ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600'}`}>
                                {step > 1 ? <Check size={12} /> : '1'}
                            </div>
                            <span>1. Origen de Datos</span>
                        </div>

                        <div className={`flex items-center justify-center gap-2 py-2 rounded-lg transition-all ${step === 2 ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300 font-bold' : step > 2 ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 2 ? 'bg-primary-600 text-white' : step > 2 ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600'}`}>
                                {step > 2 ? <Check size={12} /> : '2'}
                            </div>
                            <span>2. Mapear Columnas</span>
                        </div>

                        <div className={`flex items-center justify-center gap-2 py-2 rounded-lg transition-all ${step === 3 ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300 font-bold' : step > 3 ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 3 ? 'bg-primary-600 text-white' : step > 3 ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600'}`}>
                                {step > 3 ? <Check size={12} /> : '3'}
                            </div>
                            <span>3. Vista Previa (Dry Run)</span>
                        </div>

                        <div className={`flex items-center justify-center gap-2 py-2 rounded-lg transition-all ${step === 4 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold' : 'text-slate-400'}`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 4 ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600'}`}>
                                4
                            </div>
                            <span>4. Confirmación</span>
                        </div>
                    </div>
                </div>

                {/* Alerta de Error Global */}
                {error && (
                    <div className="mt-4 p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl flex items-start gap-3 text-rose-700 dark:text-rose-300 text-sm">
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <span className="font-semibold">Atención: </span>
                            {error}
                        </div>
                        <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
                            <X size={16} />
                        </button>
                    </div>
                )}
            </div>

            {/* Contenedor del Paso Actual */}
            <div className="max-w-6xl mx-auto">
                {/* ═════════════════════════════════════════════════════════
                    PASO 1: SELECCIÓN DE ORIGEN DE DATOS
                   ═════════════════════════════════════════════════════════ */}
                {step === 1 && (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-sm space-y-6">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Selecciona el tipo de origen</h2>
                            <p className="text-sm text-slate-500">¿Desde dónde deseas cargar tu catálogo?</p>
                        </div>

                        {/* Selector de tipo */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                            <button
                                type="button"
                                onClick={() => { setSourceType('EXCEL'); setError(null); }}
                                className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${sourceType === 'EXCEL' ? 'border-primary-500 ring-2 ring-primary-500/20 bg-primary-50/30 dark:bg-primary-950/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}`}
                            >
                                <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center mb-3">
                                    <FileSpreadsheet size={22} />
                                </div>
                                <div>
                                    <span className="font-semibold text-sm block text-slate-900 dark:text-white">Excel (.xlsx / .xls)</span>
                                    <span className="text-xs text-slate-500">Hojas de cálculo estándar</span>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => { setSourceType('CSV'); setError(null); }}
                                className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${sourceType === 'CSV' ? 'border-primary-500 ring-2 ring-primary-500/20 bg-primary-50/30 dark:bg-primary-950/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}`}
                            >
                                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center mb-3">
                                    <FileText size={22} />
                                </div>
                                <div>
                                    <span className="font-semibold text-sm block text-slate-900 dark:text-white">CSV (.csv)</span>
                                    <span className="text-xs text-slate-500">Separado por comas o punto y coma</span>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => { setSourceType('GOOGLE_SHEETS'); setError(null); }}
                                className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${sourceType === 'GOOGLE_SHEETS' ? 'border-primary-500 ring-2 ring-primary-500/20 bg-primary-50/30 dark:bg-primary-950/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}`}
                            >
                                <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center mb-3">
                                    <ExternalLink size={22} />
                                </div>
                                <div>
                                    <span className="font-semibold text-sm block text-slate-900 dark:text-white">Google Sheets</span>
                                    <span className="text-xs text-slate-500">Sincronización por enlace público</span>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => { setSourceType('ZIP'); setError(null); }}
                                className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${sourceType === 'ZIP' ? 'border-primary-500 ring-2 ring-primary-500/20 bg-primary-50/30 dark:bg-primary-950/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}`}
                            >
                                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center mb-3">
                                    <ImageIcon size={22} />
                                </div>
                                <div>
                                    <span className="font-semibold text-sm block text-slate-900 dark:text-white">Paquete ZIP</span>
                                    <span className="text-xs text-slate-500">Datos + Imágenes emparejadas</span>
                                </div>
                            </button>
                        </div>

                        {/* Input según tipo de origen */}
                        {sourceType === 'GOOGLE_SHEETS' ? (
                            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <div>
                                    <label className="block text-sm font-semibold mb-1 text-slate-700 dark:text-slate-200">
                                        URL del documento de Google Sheets
                                    </label>
                                    <input 
                                        type="url"
                                        placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                                        value={googleSheetUrl}
                                        onChange={(e) => setGoogleSheetUrl(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                    <p className="text-xs text-slate-500 mt-2">
                                        💡 El documento debe tener permisos de acceso: <span className="font-semibold">"Cualquier persona con el enlace puede leer"</span>.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-primary-500 dark:hover:border-primary-500 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-900/50"
                                >
                                    <UploadCloud className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                                    <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                                        {selectedFile ? selectedFile.name : 'Haz clic o arrastra tu archivo aquí'}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        {sourceType === 'ZIP' ? 'Archivos .zip con datos e imágenes' : 'Archivos .xlsx, .xls o .csv hasta 25MB'}
                                    </p>
                                    {selectedFile && (
                                        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-medium">
                                            <Check size={12} /> Archivo cargado ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                                        </div>
                                    )}
                                </div>
                                <input 
                                    ref={fileInputRef} 
                                    type="file" 
                                    accept={sourceType === 'ZIP' ? '.zip' : '.xlsx,.xls,.csv'} 
                                    onChange={handleFileSelect} 
                                    className="hidden" 
                                />

                                {/* Si subió Excel o CSV y además quiere asociar un ZIP de imágenes opcional */}
                                {sourceType !== 'ZIP' && (
                                    <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                                        <div>
                                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 block">
                                                ¿Tienes imágenes locales en tu computadora?
                                            </span>
                                            <span className="text-xs text-slate-500">
                                                Puedes adjuntar un archivo .ZIP con las fotos (nombradas con el SKU del producto, ej: CAM-001.jpg).
                                            </span>
                                        </div>
                                        <div>
                                            <button
                                                type="button"
                                                onClick={() => zipInputRef.current?.click()}
                                                className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-medium hover:bg-white dark:hover:bg-slate-800 transition-colors"
                                            >
                                                {zipFile ? zipFile.name : 'Adjuntar ZIP de fotos'}
                                            </button>
                                            <input 
                                                ref={zipInputRef} 
                                                type="file" 
                                                accept=".zip" 
                                                onChange={handleZipSelect} 
                                                className="hidden" 
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Botón Siguiente */}
                        <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                            <button
                                type="button"
                                disabled={loading || (sourceType === 'GOOGLE_SHEETS' ? !googleSheetUrl.trim() : !selectedFile)}
                                onClick={() => handleParseSource()}
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-semibold shadow-sm transition-all"
                            >
                                {loading ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Analizando estructura...
                                    </>
                                ) : (
                                    <>
                                        Continuar al mapeo de columnas
                                        <ArrowRight size={16} />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* ═════════════════════════════════════════════════════════
                    PASO 2: MAPEO CANÓNICO DE COLUMNAS
                   ═════════════════════════════════════════════════════════ */}
                {step === 2 && (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-sm space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Mapeo de Columnas</h2>
                                <p className="text-sm text-slate-500">
                                    Hemos detectado {columns.length} columnas en tu archivo ({rawRows.length} filas leídas). Verifica la correspondencia de cada campo:
                                </p>
                            </div>

                            {sheetNames.length > 1 && (
                                <div className="flex items-center gap-2">
                                    <label className="text-xs text-slate-500">Hoja activa:</label>
                                    <select 
                                        value={selectedSheet} 
                                        onChange={(e) => {
                                            setSelectedSheet(e.target.value);
                                            handleParseSource(e.target.value);
                                        }}
                                        className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                                    >
                                        {sheetNames.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Grid de correspondencias */}
                        <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                            <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-500 uppercase">
                                <div className="col-span-4">Columna en tu Archivo</div>
                                <div className="col-span-3">Ejemplo en fila 1</div>
                                <div className="col-span-5">Asignar a Campo en Citiox</div>
                            </div>

                            {columns.map((col) => {
                                const sampleVal = previewSampleRows[0]?.[col] ?? '—';
                                const currentMapped = mapping[col] || 'IGNORE';
                                const isRequiredField = currentMapped === 'nombre' || currentMapped === 'precio';

                                return (
                                    <div key={col} className="grid grid-cols-12 gap-4 px-4 py-3.5 items-center hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                        <div className="col-span-4">
                                            <span className="font-semibold text-sm text-slate-800 dark:text-slate-100 block">{col}</span>
                                        </div>

                                        <div className="col-span-3 text-xs text-slate-500 truncate" title={String(sampleVal)}>
                                            <code className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs">
                                                {String(sampleVal).substring(0, 30)}
                                            </code>
                                        </div>

                                        <div className="col-span-5">
                                            <select 
                                                value={currentMapped}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setMapping(prev => ({ ...prev, [col]: val }));
                                                }}
                                                className={`w-full text-xs font-medium px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 ${
                                                    isRequiredField 
                                                        ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200 focus:ring-emerald-500' 
                                                        : currentMapped !== 'IGNORE'
                                                            ? 'border-primary-300 dark:border-primary-700 bg-primary-50/30 dark:bg-primary-950/20 text-primary-900 dark:text-primary-200 focus:ring-primary-500'
                                                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                                }`}
                                            >
                                                {CANONICAL_FIELDS.map(f => (
                                                    <option key={f.key} value={f.key}>
                                                        {f.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Botones de navegación */}
                        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                            >
                                <ArrowLeft size={16} />
                                Volver
                            </button>

                            <button
                                type="button"
                                disabled={loading}
                                onClick={handleValidateDryRun}
                                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-semibold shadow-sm transition-all"
                            >
                                {loading ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Validando reglas y catálogo...
                                    </>
                                ) : (
                                    <>
                                        Validar y ver vista previa
                                        <ArrowRight size={16} />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* ═════════════════════════════════════════════════════════
                    PASO 3: VALIDACIÓN, VISTA PREVIA Y DRY RUN
                   ═════════════════════════════════════════════════════════ */}
                {step === 3 && previewResult && (
                    <div className="space-y-6">
                        {/* Métricas de Validación */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
                                <span className="text-xs text-slate-500 block">Total Filas</span>
                                <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
                                    {previewResult.stats.totalRows}
                                </span>
                            </div>

                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
                                <span className="text-xs text-emerald-600 font-semibold block">Productos Nuevos</span>
                                <span className="text-2xl font-black text-emerald-600 mt-1 block">
                                    +{previewResult.stats.newProductsCount}
                                </span>
                            </div>

                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
                                <span className="text-xs text-blue-600 font-semibold block">A Actualizar</span>
                                <span className="text-2xl font-black text-blue-600 mt-1 block">
                                    {previewResult.stats.updateProductsCount}
                                </span>
                            </div>

                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
                                <span className="text-xs text-amber-600 font-semibold block">Nuevas Categorías</span>
                                <span className="text-2xl font-black text-amber-600 mt-1 block">
                                    {previewResult.stats.categoriesToCreate.length}
                                </span>
                            </div>

                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
                                <span className="text-xs text-rose-600 font-semibold block">Errores</span>
                                <span className="text-2xl font-black text-rose-600 mt-1 block">
                                    {previewResult.stats.errorRowsCount}
                                </span>
                            </div>

                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
                                <span className="text-xs text-slate-500 block">Cupos Plan Restantes</span>
                                <span className="text-2xl font-black text-slate-700 dark:text-slate-300 mt-1 block">
                                    {previewResult.stats.allowedNewProducts}
                                </span>
                            </div>
                        </div>

                        {/* Banner de Límite de Plan si aplica */}
                        {previewResult.stats.planLimitReached && (
                            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-900 rounded-xl flex items-start gap-3 text-amber-800 dark:text-amber-200 text-sm">
                                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
                                <div>
                                    <span className="font-bold">Límite de productos alcanzado: </span>
                                    {previewResult.stats.planLimitMessage}
                                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                                        Te sugerimos actualizar tu plan en la sección de Suscripción o reducir la cantidad de productos nuevos.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Opciones de Configuración para la Importación */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-4">Reglas de Importación y Resolución de Conflictos</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                <div>
                                    <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                                        Si el producto ya existe (por SKU o Nombre):
                                    </label>
                                    <select 
                                        value={importOptions.productMode}
                                        onChange={(e) => setImportOptions({ ...importOptions, productMode: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                                    >
                                        <option value="UPDATE">Actualizar datos con los del archivo</option>
                                        <option value="SKIP">No tocar (Ignorar los ya existentes)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                                        Tratamiento de Inventario / Stock:
                                    </label>
                                    <select 
                                        value={importOptions.stockMode}
                                        onChange={(e) => setImportOptions({ ...importOptions, stockMode: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                                    >
                                        <option value="REPLACE">Reemplazar con el stock del archivo</option>
                                        <option value="INCREMENT">Sumar al stock existente actual</option>
                                        <option value="KEEP">Mantener el stock actual sin cambios</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                                        Tratamiento de Imágenes:
                                    </label>
                                    <select 
                                        value={importOptions.imageMode}
                                        onChange={(e) => setImportOptions({ ...importOptions, imageMode: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                                    >
                                        <option value="KEEP">Mantener imagen si el producto ya tiene</option>
                                        <option value="REPLACE">Reemplazar con la nueva imagen</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Tabla de Vista Previa (Dry Run) */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">Vista Previa de Productos</h3>
                                    <p className="text-xs text-slate-500">Mostrando primeras 50 filas normalizadas sin alterar la base de datos.</p>
                                </div>

                                <div className="flex items-center gap-1 text-xs">
                                    <button 
                                        onClick={() => setPreviewFilter('ALL')} 
                                        className={`px-2.5 py-1 rounded-md font-semibold ${previewFilter === 'ALL' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500 hover:bg-slate-100'}`}
                                    >
                                        Todas
                                    </button>
                                    <button 
                                        onClick={() => setPreviewFilter('NEW')} 
                                        className={`px-2.5 py-1 rounded-md font-semibold ${previewFilter === 'NEW' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                                    >
                                        Nuevos
                                    </button>
                                    <button 
                                        onClick={() => setPreviewFilter('UPDATE')} 
                                        className={`px-2.5 py-1 rounded-md font-semibold ${previewFilter === 'UPDATE' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                                    >
                                        Actualizaciones
                                    </button>
                                    <button 
                                        onClick={() => setPreviewFilter('ERROR')} 
                                        className={`px-2.5 py-1 rounded-md font-semibold ${previewFilter === 'ERROR' ? 'bg-rose-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                                    >
                                        Errores ({previewResult.sampleErrors.length})
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 font-semibold text-slate-500">
                                            <th className="p-3">Fila</th>
                                            <th className="p-3">Estado</th>
                                            <th className="p-3">SKU</th>
                                            <th className="p-3">Nombre</th>
                                            <th className="p-3">Categoría</th>
                                            <th className="p-3">Precio</th>
                                            <th className="p-3">Stock</th>
                                            <th className="p-3">Variante</th>
                                            <th className="p-3">Observaciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {previewResult.previewRows
                                            .filter((r: any) => {
                                                if (previewFilter === 'NEW') return !r.isExisting && r.isValid;
                                                if (previewFilter === 'UPDATE') return r.isExisting && r.isValid;
                                                if (previewFilter === 'ERROR') return !r.isValid;
                                                return true;
                                            })
                                            .map((r: any, idx: number) => (
                                                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                                                    <td className="p-3 font-mono text-slate-400">#{r.rowNumber}</td>
                                                    <td className="p-3">
                                                        {!r.isValid ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                                                                <X size={10} /> Error
                                                            </span>
                                                        ) : r.isExisting ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                                                                Actualización
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                                                                + Nuevo
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-3 font-mono font-medium">{r.sku || '—'}</td>
                                                    <td className="p-3 font-semibold text-slate-900 dark:text-white max-w-[200px] truncate">{r.nombre}</td>
                                                    <td className="p-3 text-slate-500">{r.categoria || 'Sin categoría'}</td>
                                                    <td className="p-3 font-mono font-bold text-slate-900 dark:text-slate-100">${r.precio?.toFixed(2)}</td>
                                                    <td className="p-3 font-mono">{r.stock !== undefined ? r.stock : '—'}</td>
                                                    <td className="p-3 text-slate-500">{r.variante?.nombre || '—'}</td>
                                                    <td className="p-3 text-xs">
                                                        {r.errors?.length > 0 ? (
                                                            <span className="text-rose-600 font-medium">{r.errors.join('; ')}</span>
                                                        ) : r.warnings?.length > 0 ? (
                                                            <span className="text-amber-600">{r.warnings.join('; ')}</span>
                                                        ) : (
                                                            <span className="text-slate-400">Válido</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Botones de navegación */}
                        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setStep(2)}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                            >
                                <ArrowLeft size={16} />
                                Modificar mapeo
                            </button>

                            <button
                                type="button"
                                disabled={isExecuting || (previewResult.stats.planLimitReached && previewResult.stats.newProductsCount > previewResult.stats.allowedNewProducts)}
                                onClick={handleExecuteImport}
                                className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold shadow-lg shadow-emerald-600/20 transition-all"
                            >
                                {isExecuting ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Importando catálogo a la base de datos...
                                    </>
                                ) : (
                                    <>
                                        <Play size={16} fill="white" />
                                        Confirmar e Iniciar Importación
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* ═════════════════════════════════════════════════════════
                    PASO 4: RESULTADOS DE LA IMPORTACIÓN
                   ═════════════════════════════════════════════════════════ */}
                {step === 4 && executionResult && (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm text-center max-w-2xl mx-auto space-y-6">
                        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto">
                            <CheckCircle2 size={36} />
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">¡Importación Finalizada!</h2>
                            <p className="text-sm text-slate-500 mt-1">Los datos han sido incorporados canónicamente a tu catálogo de productos.</p>
                        </div>

                        <div className="grid grid-cols-3 gap-3 text-left">
                            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60">
                                <span className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold block">Creados Nuevos</span>
                                <span className="text-2xl font-black text-emerald-700 dark:text-emerald-200 mt-1 block">
                                    +{executionResult.createdCount}
                                </span>
                            </div>

                            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60">
                                <span className="text-xs text-blue-700 dark:text-blue-300 font-semibold block">Actualizados</span>
                                <span className="text-2xl font-black text-blue-700 dark:text-blue-200 mt-1 block">
                                    {executionResult.updatedCount}
                                </span>
                            </div>

                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                <span className="text-xs text-slate-500 font-semibold block">Categorías Nuevas</span>
                                <span className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1 block">
                                    {executionResult.createdCategoriesCount || 0}
                                </span>
                            </div>
                        </div>

                        {executionResult.errors && executionResult.errors.length > 0 && (
                            <div className="text-left p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900">
                                <span className="text-xs font-bold text-rose-700 dark:text-rose-300 block mb-2">
                                    Hubo {executionResult.errors.length} filas que no pudieron guardarse:
                                </span>
                                <div className="max-h-40 overflow-y-auto text-xs space-y-1 text-rose-600">
                                    {executionResult.errors.map((e: any, i: number) => (
                                        <div key={i}>Fila #{e.row} (SKU: {e.sku || 'S/N'}): {e.error}</div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <Link 
                                href="/admin/productos" 
                                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold shadow-sm transition-all"
                            >
                                Ver Productos en el Catálogo
                            </Link>

                            <Link 
                                href="/admin/catalogo/importaciones" 
                                className="w-full sm:w-auto px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold transition-all"
                            >
                                Ver Historial de Importaciones
                            </Link>

                            <button
                                type="button"
                                onClick={() => {
                                    setStep(1);
                                    setSelectedFile(null);
                                    setZipFile(null);
                                    setPreviewResult(null);
                                    setExecutionResult(null);
                                }}
                                className="w-full sm:w-auto px-6 py-3 rounded-xl text-slate-500 hover:text-slate-800 text-sm font-semibold"
                            >
                                Importar otro archivo
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
