'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
    FileSpreadsheet, ArrowLeft, RefreshCw, Plus, CheckCircle2, AlertCircle, 
    Calendar, Layers, FileText, ChevronRight, Check, X, Clock
} from 'lucide-react';

interface CatalogImportItem {
    id: string;
    createdAt: string;
    sourceType: string;
    sourceName: string;
    status: string;
    totalRows: number;
    processedRows: number;
    createdCount: number;
    updatedCount: number;
    errorCount: number;
    skippedCount: number;
    errorSummary?: any;
}

export default function CatalogoImportacionesHistorialPage() {
    const [imports, setImports] = useState<CatalogImportItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedImport, setSelectedImport] = useState<CatalogImportItem | null>(null);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/catalog/import/history');
            if (res.ok) {
                const data = await res.json();
                setImports(data.imports || []);
            }
        } catch (e) {
            console.error('Error fetching import history:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 size={12} /> Completado
                    </span>
                );
            case 'COMPLETED_WITH_ERRORS':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                        <AlertCircle size={12} /> Con errores
                    </span>
                );
            case 'FAILED':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                        <X size={12} /> Fallido
                    </span>
                );
            case 'PROCESSING':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                        <Clock size={12} className="animate-spin" /> Procesando
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {status}
                    </span>
                );
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 text-slate-800 dark:text-slate-100">
            <div className="max-w-6xl mx-auto mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                            <Link href="/admin/productos" className="hover:text-primary-600 transition-colors">Productos</Link>
                            <ChevronRight size={14} />
                            <Link href="/admin/catalogo/importar" className="hover:text-primary-600 transition-colors">Importador</Link>
                            <ChevronRight size={14} />
                            <span>Historial</span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                            <Layers className="text-primary-600 w-8 h-8" />
                            Historial de Importaciones
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Registro de auditoría de todas las cargas y actualizaciones masivas de catálogo realizadas en tu negocio.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchHistory}
                            disabled={loading}
                            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 shadow-sm"
                            title="Actualizar lista"
                        >
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <Link
                            href="/admin/catalogo/importar"
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
                        >
                            <Plus size={14} />
                            Nueva Importación
                        </Link>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto">
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    {loading && imports.length === 0 ? (
                        <div className="p-12 text-center text-slate-400">
                            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-primary-600" />
                            <p className="text-sm">Cargando registros de auditoría...</p>
                        </div>
                    ) : imports.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">
                            <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <h3 className="font-semibold text-slate-700 dark:text-slate-300">No hay importaciones registradas</h3>
                            <p className="text-xs text-slate-400 mt-1">Aún no has realizado ninguna carga masiva en este negocio.</p>
                            <Link
                                href="/admin/catalogo/importar"
                                className="inline-flex items-center gap-2 px-4 py-2 mt-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold"
                            >
                                Iniciar primera importación
                            </Link>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 font-semibold text-slate-500">
                                        <th className="p-3">Fecha</th>
                                        <th className="p-3">Origen / Archivo</th>
                                        <th className="p-3">Estado</th>
                                        <th className="p-3">Filas</th>
                                        <th className="p-3">Nuevos</th>
                                        <th className="p-3">Actualizados</th>
                                        <th className="p-3">Errores</th>
                                        <th className="p-3 text-right">Detalle</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {imports.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                                            <td className="p-3 text-slate-500 font-mono">
                                                {new Date(item.createdAt).toLocaleString('es-ES', { 
                                                    day: '2-digit', month: '2-digit', year: 'numeric', 
                                                    hour: '2-digit', minute: '2-digit' 
                                                })}
                                            </td>
                                            <td className="p-3">
                                                <span className="font-semibold text-slate-900 dark:text-white block">
                                                    {item.sourceName || 'Sin nombre'}
                                                </span>
                                                <span className="text-[10px] text-slate-400 uppercase font-mono">
                                                    {item.sourceType}
                                                </span>
                                            </td>
                                            <td className="p-3">
                                                {getStatusBadge(item.status)}
                                            </td>
                                            <td className="p-3 font-mono">{item.totalRows}</td>
                                            <td className="p-3 font-mono font-semibold text-emerald-600">+{item.createdCount}</td>
                                            <td className="p-3 font-mono font-semibold text-blue-600">{item.updatedCount}</td>
                                            <td className="p-3 font-mono font-semibold text-rose-600">{item.errorCount}</td>
                                            <td className="p-3 text-right">
                                                <button
                                                    onClick={() => setSelectedImport(item)}
                                                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium"
                                                >
                                                    Ver
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Detalle de Importación */}
            {selectedImport && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-xl w-full p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <FileSpreadsheet className="text-primary-600 w-5 h-5" />
                                Detalle de la Importación
                            </h3>
                            <button onClick={() => setSelectedImport(null)} className="text-slate-400 hover:text-slate-600">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                                <span className="text-slate-400 block">Archivo / Origen</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-100">{selectedImport.sourceName}</span>
                            </div>
                            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                                <span className="text-slate-400 block">Estado</span>
                                {getStatusBadge(selectedImport.status)}
                            </div>
                            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                                <span className="text-slate-400 block">Productos Creados</span>
                                <span className="font-bold text-emerald-600">+{selectedImport.createdCount}</span>
                            </div>
                            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                                <span className="text-slate-400 block">Productos Actualizados</span>
                                <span className="font-bold text-blue-600">{selectedImport.updatedCount}</span>
                            </div>
                        </div>

                        {selectedImport.errorSummary && Array.isArray(selectedImport.errorSummary) && selectedImport.errorSummary.length > 0 && (
                            <div>
                                <span className="text-xs font-bold text-rose-600 block mb-1">
                                    Resumen de errores ({selectedImport.errorSummary.length}):
                                </span>
                                <div className="max-h-48 overflow-y-auto rounded-lg bg-rose-50 dark:bg-rose-950/30 p-3 text-xs space-y-1 text-rose-700 dark:text-rose-300">
                                    {selectedImport.errorSummary.map((err: any, i: number) => (
                                        <div key={i}>
                                            <span className="font-mono font-bold">Fila #{err.row}:</span> {err.error}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                            <button
                                onClick={() => setSelectedImport(null)}
                                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
