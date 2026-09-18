'use client';

import { useState, useRef } from 'react';
import { 
    X, UploadCloud, FileSpreadsheet, Download, CheckCircle2, 
    AlertCircle, Loader2, Sparkles, Clock, DollarSign, Tag, 
    ArrowRight, RefreshCw, ExternalLink
} from 'lucide-react';

interface ServiceImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    primaryColor?: string;
}

interface PreviewRow {
    rowIndex: number;
    nombre: string;
    duracion: number;
    precio: number;
    categoria: string;
    descripcion: string;
    imagen: string;
    activo: boolean;
    isValid: boolean;
    errors: string[];
}

export default function ServiceImportModal({
    isOpen,
    onClose,
    onSuccess,
    primaryColor = '#0ea5e9'
}: ServiceImportModalProps) {
    const [activeTab, setActiveTab] = useState<'file' | 'sheets'>('file');
    const [file, setFile] = useState<File | null>(null);
    const [googleSheetUrl, setGoogleSheetUrl] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    
    // Estados del flujo
    const [step, setStep] = useState<'upload' | 'preview' | 'success'>('upload');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Datos de previsualización
    const [previewData, setPreviewData] = useState<{
        totalRows: number;
        validCount: number;
        invalidCount: number;
        preview: PreviewRow[];
    } | null>(null);

    // Resultado final
    const [importResult, setImportResult] = useState<{
        createdCount: number;
        updatedCount: number;
        totalProcessed: number;
        failedCount: number;
    } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileSelect = (selectedFile: File) => {
        const name = selectedFile.name.toLowerCase();
        if (!name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.csv')) {
            setError('Formato no soportado. Por favor sube un archivo Excel (.xlsx, .xls) o CSV (.csv).');
            return;
        }
        setFile(selectedFile);
        setError(null);
        handlePreviewFile(selectedFile);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handlePreviewFile = async (f: File) => {
        setLoading(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append('file', f);
            formData.append('action', 'preview');

            const res = await fetch('/api/admin/services/import', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Error al analizar el archivo');
            }

            setPreviewData({
                totalRows: data.totalRows,
                validCount: data.validCount,
                invalidCount: data.invalidCount,
                preview: data.preview || []
            });
            setStep('preview');
        } catch (err: any) {
            setError(err.message || 'Error al procesar el archivo');
        } finally {
            setLoading(false);
        }
    };

    const handlePreviewGoogleSheets = async () => {
        if (!googleSheetUrl.trim()) {
            setError('Ingresa la URL del documento de Google Sheets');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/services/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'preview',
                    googleSheetUrl: googleSheetUrl.trim()
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Error al conectar con Google Sheets');
            }

            setPreviewData({
                totalRows: data.totalRows,
                validCount: data.validCount,
                invalidCount: data.invalidCount,
                preview: data.preview || []
            });
            setStep('preview');
        } catch (err: any) {
            setError(err.message || 'Error al procesar Google Sheets');
        } finally {
            setLoading(false);
        }
    };

    const handleExecuteImport = async () => {
        setLoading(true);
        setError(null);
        try {
            let res: Response;
            if (activeTab === 'file' && file) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('action', 'execute');

                res = await fetch('/api/admin/services/import', {
                    method: 'POST',
                    body: formData
                });
            } else if (activeTab === 'sheets' && googleSheetUrl) {
                res = await fetch('/api/admin/services/import', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'execute',
                        googleSheetUrl: googleSheetUrl.trim()
                    })
                });
            } else {
                throw new Error('No hay origen de datos seleccionado');
            }

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Error durante la importación');
            }

            setImportResult({
                createdCount: data.createdCount || 0,
                updatedCount: data.updatedCount || 0,
                totalProcessed: data.totalProcessed || 0,
                failedCount: data.failedCount || 0
            });
            setStep('success');
        } catch (err: any) {
            setError(err.message || 'Error al importar servicios');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadTemplate = (format: 'xlsx' | 'csv' = 'xlsx') => {
        window.open(`/api/admin/services/template?format=${format}`, '_blank');
    };

    const handleFinish = () => {
        onSuccess();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[2.5rem] w-full max-w-3xl overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-6 sm:p-8 border-b border-gray-100 flex items-center justify-between shrink-0 bg-slate-50/50">
                    <div className="flex items-center gap-3.5">
                        <div 
                            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md shadow-sky-100 shrink-0"
                            style={{ backgroundColor: primaryColor }}
                        >
                            <FileSpreadsheet size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                                Importar Servicios Masivamente
                            </h2>
                            <p className="text-xs sm:text-sm font-medium text-gray-500">
                                Sube tu archivo Excel o CSV para agregar o actualizar tus servicios en segundos.
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body scrollable */}
                <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1">
                    
                    {error && (
                        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-800 text-xs font-bold flex items-center gap-3 animate-in shake">
                            <AlertCircle size={18} className="text-rose-600 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* ── PASO 1: SUBIR ARCHIVO O GOOGLE SHEETS ── */}
                    {step === 'upload' && (
                        <div className="space-y-6">
                            
                            {/* Banner descarga plantilla */}
                            <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-300/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                                        <Sparkles size={20} />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider">
                                            ¿No tienes el formato listo?
                                        </h4>
                                        <p className="text-[11px] font-medium text-amber-800/90">
                                            Descarga la plantilla con ejemplos reales de servicios, tiempos y precios.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <button
                                        type="button"
                                        onClick={() => handleDownloadTemplate('xlsx')}
                                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-xs"
                                    >
                                        <Download size={15} />
                                        Plantilla Excel (.xlsx)
                                    </button>
                                </div>
                            </div>

                            {/* Pestañas de origen */}
                            <div className="flex border-b border-gray-100 gap-6">
                                <button
                                    type="button"
                                    onClick={() => { setActiveTab('file'); setError(null); }}
                                    className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 transition flex items-center gap-2 ${
                                        activeTab === 'file' 
                                            ? 'text-gray-900 border-gray-900' 
                                            : 'text-gray-400 border-transparent hover:text-gray-600'
                                    }`}
                                >
                                    <UploadCloud size={16} />
                                    Subir Archivo Excel o CSV
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setActiveTab('sheets'); setError(null); }}
                                    className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 transition flex items-center gap-2 ${
                                        activeTab === 'sheets' 
                                            ? 'text-gray-900 border-gray-900' 
                                            : 'text-gray-400 border-transparent hover:text-gray-600'
                                    }`}
                                >
                                    <ExternalLink size={16} />
                                    Vincular Google Sheets
                                </button>
                            </div>

                            {/* Pestaña: Archivo */}
                            {activeTab === 'file' && (
                                <div
                                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`border-2 border-dashed rounded-[2rem] p-8 sm:p-12 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
                                        isDragging 
                                            ? 'border-sky-500 bg-sky-50/50 scale-[0.99]' 
                                            : 'border-gray-200 hover:border-gray-300 bg-gray-50/50 hover:bg-gray-50'
                                    }`}
                                >
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                                        accept=".xlsx,.xls,.csv" 
                                        className="hidden" 
                                    />
                                    
                                    <div 
                                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg transition"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        <UploadCloud size={32} />
                                    </div>

                                    <div>
                                        <h3 className="text-base font-black text-gray-900">
                                            Arrastra tu archivo aquí o haz clic para examinar
                                        </h3>
                                        <p className="text-xs text-gray-400 font-medium mt-1">
                                            Formatos compatibles: Microsoft Excel (.xlsx, .xls) o CSV (.csv)
                                        </p>
                                    </div>

                                    {loading && (
                                        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 mt-2">
                                            <Loader2 size={16} className="animate-spin text-sky-600" />
                                            Analizando archivo de servicios...
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Pestaña: Google Sheets */}
                            {activeTab === 'sheets' && (
                                <div className="space-y-4 bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-black text-gray-600 uppercase tracking-wider">
                                            Enlace público de Google Sheets
                                        </label>
                                        <p className="text-xs text-gray-400">
                                            Asegúrate de que el documento tenga acceso como "Cualquier persona con el enlace puede ver".
                                        </p>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <input
                                            type="url"
                                            placeholder="https://docs.google.com/spreadsheets/d/..."
                                            value={googleSheetUrl}
                                            onChange={(e) => setGoogleSheetUrl(e.target.value)}
                                            className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-gray-900 outline-none focus:border-sky-500 transition"
                                        />
                                        <button
                                            type="button"
                                            onClick={handlePreviewGoogleSheets}
                                            disabled={loading || !googleSheetUrl.trim()}
                                            style={{ backgroundColor: primaryColor }}
                                            className="px-6 py-3 rounded-2xl text-white font-black text-xs uppercase tracking-wider hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2 shrink-0 shadow-md"
                                        >
                                            {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                                            Analizar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── PASO 2: PREVISUALIZACIÓN Y CONFIRMACIÓN ── */}
                    {step === 'preview' && previewData && (
                        <div className="space-y-6">
                            
                            {/* Estadísticas de análisis */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Servicios Detectados</span>
                                    <div className="text-2xl font-black text-slate-900 mt-0.5">{previewData.totalRows}</div>
                                </div>
                                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                                    <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">Listos para Importar</span>
                                    <div className="text-2xl font-black text-emerald-700 mt-0.5">{previewData.validCount}</div>
                                </div>
                                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                                    <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider">Con Observaciones</span>
                                    <div className="text-2xl font-black text-amber-700 mt-0.5">{previewData.invalidCount}</div>
                                </div>
                            </div>

                            {/* Tabla de previsualización */}
                            <div className="border border-gray-200/80 rounded-2xl overflow-hidden">
                                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200/80 flex items-center justify-between">
                                    <span className="text-xs font-black uppercase text-gray-700 tracking-wider">
                                        Vista Previa de Servicios (Primeros {previewData.preview.length})
                                    </span>
                                    <span className="text-[11px] text-gray-400 font-medium">
                                        Actualiza por nombre si el servicio ya existe
                                    </span>
                                </div>
                                <div className="overflow-x-auto max-h-72">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-white text-gray-500 font-black uppercase tracking-wider text-[10px] border-b border-gray-100">
                                            <tr>
                                                <th className="px-4 py-2.5">#</th>
                                                <th className="px-4 py-2.5">Servicio</th>
                                                <th className="px-4 py-2.5">Duración</th>
                                                <th className="px-4 py-2.5">Precio</th>
                                                <th className="px-4 py-2.5">Categoría</th>
                                                <th className="px-4 py-2.5 text-right">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {previewData.preview.map((row) => (
                                                <tr key={row.rowIndex} className="hover:bg-gray-50/80 transition">
                                                    <td className="px-4 py-3 text-gray-400 font-bold">{row.rowIndex}</td>
                                                    <td className="px-4 py-3 font-bold text-gray-900 max-w-[200px] truncate">
                                                        {row.nombre || <span className="text-rose-500 italic">Sin nombre</span>}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-600 font-medium">
                                                        <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-full text-[10px] font-bold text-slate-700">
                                                            <Clock size={11} /> {row.duracion} min
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 font-black text-gray-900">
                                                        ${row.precio.toFixed(2)}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-500">
                                                        {row.categoria ? (
                                                            <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                                                <Tag size={10} /> {row.categoria}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-300">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        {row.isValid ? (
                                                            <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-[11px]">
                                                                <CheckCircle2 size={13} /> Válido
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-rose-500 font-bold text-[11px]">
                                                                <AlertCircle size={13} /> Error
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Botones de acción del paso 2 */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setStep('upload'); setPreviewData(null); }}
                                    className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-gray-200 text-gray-600 font-black text-xs uppercase tracking-wider hover:bg-gray-50 transition"
                                >
                                    ← Elegir otro archivo
                                </button>
                                <button
                                    type="button"
                                    onClick={handleExecuteImport}
                                    disabled={loading || previewData.validCount === 0}
                                    style={{ backgroundColor: primaryColor }}
                                    className="w-full sm:w-auto px-7 py-3.5 rounded-2xl text-white font-black text-xs uppercase tracking-wider hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            Importando servicios...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 size={16} />
                                            Confirmar e Importar ({previewData.validCount} Servicios)
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── PASO 3: RESULTADO EXITOSO ── */}
                    {step === 'success' && importResult && (
                        <div className="text-center py-6 space-y-6">
                            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-lg shadow-emerald-100">
                                <CheckCircle2 size={44} />
                            </div>

                            <div className="space-y-1.5">
                                <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                                    ¡Importación Finalizada con Éxito!
                                </h3>
                                <p className="text-xs sm:text-sm text-gray-500 font-medium max-w-md mx-auto">
                                    Tus servicios han sido procesados y guardados correctamente en la base de datos de tu negocio.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg mx-auto text-left">
                                <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-100">
                                    <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">Nuevos Creados</span>
                                    <div className="text-2xl font-black text-emerald-800 mt-0.5">+{importResult.createdCount}</div>
                                </div>
                                <div className="bg-sky-50/70 p-4 rounded-2xl border border-sky-100">
                                    <span className="text-[10px] font-black uppercase text-sky-600 tracking-wider">Actualizados</span>
                                    <div className="text-2xl font-black text-sky-800 mt-0.5">{importResult.updatedCount}</div>
                                </div>
                                <div className="col-span-2 sm:col-span-1 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Total Procesados</span>
                                    <div className="text-2xl font-black text-slate-900 mt-0.5">{importResult.totalProcessed}</div>
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="button"
                                    onClick={handleFinish}
                                    style={{ backgroundColor: primaryColor }}
                                    className="px-8 py-3.5 rounded-2xl text-white font-black text-xs uppercase tracking-wider hover:opacity-90 transition shadow-xl shadow-sky-100"
                                >
                                    Ver mis Servicios Actualizados
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
