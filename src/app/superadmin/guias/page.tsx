'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Plus, Save, Trash2, Edit3, Loader2, CheckCircle2, AlertCircle, ExternalLink, Sparkles, HelpCircle } from 'lucide-react';
import Link from 'next/link';

interface Guia {
    id: string;
    slug: string;
    title: string;
    category: string;
    icon?: string;
    summary: string;
    content: string;
    updatedAt?: string;
}

export default function SuperAdminGuiasPage() {
    const [guias, setGuias] = useState<Guia[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedGuia, setSelectedGuia] = useState<Guia | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        fetchGuias();
    }, []);

    const fetchGuias = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/superadmin/guias');
            if (res.ok) {
                const data = await res.json();
                setGuias(data.guias || []);
                if (data.guias?.length > 0 && !selectedGuia) {
                    setSelectedGuia(data.guias[0]);
                }
            }
        } catch (err) {
            console.error('Error fetching guias:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveGuia = async (guiaToSave: Guia) => {
        try {
            setSaving(true);
            setStatusMsg(null);

            const exists = guias.some(g => g.id === guiaToSave.id);
            const updatedList = exists
                ? guias.map(g => (g.id === guiaToSave.id ? { ...guiaToSave, updatedAt: new Date().toISOString() } : g))
                : [{ ...guiaToSave, updatedAt: new Date().toISOString() }, ...guias];

            const res = await fetch('/api/superadmin/guias', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ guias: updatedList })
            });

            if (res.ok) {
                setGuias(updatedList);
                setSelectedGuia(guiaToSave);
                setIsEditing(false);
                setStatusMsg({ type: 'success', text: 'Guía guardada y publicada exitosamente.' });
            } else {
                const errData = await res.json();
                setStatusMsg({ type: 'error', text: errData.error || 'Error al guardar la guía' });
            }
        } catch (err: any) {
            setStatusMsg({ type: 'error', text: err.message || 'Error de conexión' });
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteGuia = async (id: string) => {
        if (!confirm('¿Estás seguro de que deseas eliminar esta guía de la plataforma?')) return;
        try {
            setSaving(true);
            const updatedList = guias.filter(g => g.id !== id);
            const res = await fetch('/api/superadmin/guias', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ guias: updatedList })
            });

            if (res.ok) {
                setGuias(updatedList);
                setSelectedGuia(updatedList[0] || null);
                setIsEditing(false);
                setStatusMsg({ type: 'success', text: 'Guía eliminada correctamente.' });
            }
        } catch (err: any) {
            setStatusMsg({ type: 'error', text: 'Error al eliminar la guía.' });
        } finally {
            setSaving(false);
        }
    };

    const handleCreateNew = () => {
        const newGuia: Guia = {
            id: `guia-${Date.now()}`,
            slug: `nueva-guia-${Date.now().toString().slice(-4)}`,
            title: 'Nueva Guía de Soporte',
            category: 'General',
            summary: 'Resumen introductorio de lo que aprenderá el administrador en esta guía.',
            content: `### 1. Introducción\nEscribe aquí los pasos y recomendaciones...\n\n### 2. Pasos a Seguir\n1. Paso uno.\n2. Paso dos.`,
            updatedAt: new Date().toISOString()
        };
        setSelectedGuia(newGuia);
        setIsEditing(true);
    };

    return (
        <div className="space-y-8 text-slate-900 font-sans pb-16">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
                <div>
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest block mb-1">
                        SOPORTE Y DOCUMENTACIÓN
                    </span>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight flex items-center gap-3">
                        <BookOpen className="text-emerald-500" size={32} />
                        Gestor de Guías de la Plataforma
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium text-xs">
                        Crea, edita y organiza las guías paso a paso que ven los negocios en el botón "¿Necesitas ayuda? / Ver guía".
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Link
                        href="/admin/ayuda"
                        target="_blank"
                        className="flex items-center gap-2 px-5 py-3 rounded-2xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-black uppercase tracking-wider transition-colors"
                    >
                        <ExternalLink size={16} />
                        Ver Vista Negocio
                    </Link>
                    <button
                        onClick={handleCreateNew}
                        className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-950/20 active:scale-95 transition-all cursor-pointer"
                    >
                        <Plus size={16} />
                        Nueva Guía
                    </button>
                </div>
            </div>

            {statusMsg && (
                <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-bold ${
                    statusMsg.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}>
                    {statusMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    <span>{statusMsg.text}</span>
                </div>
            )}

            {loading ? (
                <div className="min-h-[400px] flex items-center justify-center">
                    <Loader2 className="animate-spin text-emerald-500" size={36} />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Lista Izquierda de Guías */}
                    <div className="lg:col-span-4 space-y-3">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block px-1">
                            Guías Activas ({guias.length})
                        </span>
                        <div className="space-y-2.5">
                            {guias.map(g => (
                                <button
                                    key={g.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedGuia(g);
                                        setIsEditing(false);
                                    }}
                                    className={`w-full p-4 rounded-2xl text-left transition-all border cursor-pointer ${
                                        selectedGuia?.id === g.id
                                            ? 'bg-white dark:bg-slate-900 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                                            : 'bg-white/60 dark:bg-slate-900/60 border-slate-200/80 dark:border-white/5 hover:border-slate-300'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60">
                                            {g.category || 'General'}
                                        </span>
                                        <span className="text-[9px] font-mono text-slate-400">/{g.slug}</span>
                                    </div>
                                    <h3 className="text-xs font-black text-slate-900 dark:text-white line-clamp-1">{g.title}</h3>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 font-medium">{g.summary}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Vista / Edición Derecha */}
                    <div className="lg:col-span-8">
                        {selectedGuia ? (
                            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-white/10 shadow-sm space-y-6">
                                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="size-5 text-emerald-500" />
                                        <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                            {isEditing ? 'Editor de Contenido' : 'Visualización de la Guía'}
                                        </h2>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isEditing ? (
                                            <button
                                                type="button"
                                                onClick={() => setIsEditing(false)}
                                                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                                            >
                                                Cancelar
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => setIsEditing(true)}
                                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <Edit3 size={14} /> Editar
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteGuia(selectedGuia.id)}
                                            className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                                            title="Eliminar guía"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                {isEditing ? (
                                    <form
                                        onSubmit={e => {
                                            e.preventDefault();
                                            handleSaveGuia(selectedGuia);
                                        }}
                                        className="space-y-4"
                                    >
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                                                    Título de la Guía
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={selectedGuia.title}
                                                    onChange={e => setSelectedGuia({ ...selectedGuia, title: e.target.value })}
                                                    className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                                                    Slug de URL (ej: variantes-e-inventario)
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={selectedGuia.slug}
                                                    onChange={e => setSelectedGuia({ ...selectedGuia, slug: e.target.value })}
                                                    className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                                                Categoría / Módulo
                                            </label>
                                            <input
                                                type="text"
                                                value={selectedGuia.category}
                                                onChange={e => setSelectedGuia({ ...selectedGuia, category: e.target.value })}
                                                placeholder="ej: Productos & Catálogo"
                                                className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                                                Resumen Breve
                                            </label>
                                            <textarea
                                                rows={2}
                                                value={selectedGuia.summary}
                                                onChange={e => setSelectedGuia({ ...selectedGuia, summary: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-900 dark:text-white resize-none focus:outline-none focus:border-emerald-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                                                Contenido Detallado (Soporta Markdown y Viñetas)
                                            </label>
                                            <textarea
                                                rows={12}
                                                required
                                                value={selectedGuia.content}
                                                onChange={e => setSelectedGuia({ ...selectedGuia, content: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-900 dark:text-white leading-relaxed focus:outline-none focus:border-emerald-500"
                                            />
                                        </div>

                                        <div className="pt-3 flex justify-end">
                                            <button
                                                type="submit"
                                                disabled={saving}
                                                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                                            >
                                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                                Guardar Guía
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <div className="space-y-4">
                                        <div>
                                            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60">
                                                {selectedGuia.category}
                                            </span>
                                            <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-2 leading-snug">
                                                {selectedGuia.title}
                                            </h1>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                                                {selectedGuia.summary}
                                            </p>
                                        </div>

                                        <div className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-white/5 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                                            {selectedGuia.content}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-white/10 space-y-3">
                                <HelpCircle className="size-10 text-slate-300 mx-auto" />
                                <p className="text-xs font-bold text-slate-500">Selecciona o crea una guía para editarla.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
