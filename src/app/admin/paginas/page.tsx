'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search, FileText, Trash2, Edit2, ExternalLink, MoreVertical, Globe, EyeOff, Layout } from 'lucide-react';

interface Page {
    id: string;
    title: string;
    slug: string;
    status: 'draft' | 'published';
    updatedAt: string;
}

export default function PaginasAdmin() {
    const [pages, setPages] = useState<Page[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');

    const fetchPages = async () => {
        try {
            const res = await fetch('/api/admin/pages');
            if (res.ok) {
                const data = await res.json();
                setPages(data);
            }
        } catch (error) {
            console.error("Error fetching pages", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPages();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm('¿Seguro que deseas eliminar esta página permanentemente?')) return;

        try {
            const res = await fetch(`/api/admin/pages/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setPages(pages.filter(p => p.id !== id));
            }
        } catch (error) {
            console.error("Error deleting page", error);
        }
    };

    const filteredPages = pages.filter(p =>
        p.title.toLowerCase().includes(query.toLowerCase())
    );

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Páginas Personalizadas</h1>
                    <p className="text-gray-500 font-medium">Crea y gestiona contenido propio para tu sitio web.</p>
                </div>
                <Link
                    href="/admin/paginas/nueva"
                    className="flex items-center gap-2 px-6 py-2.5 text-white rounded-xl font-bold text-sm transition-all shadow-lg active:scale-95 text-center"
                    style={{ backgroundColor: 'var(--primary-color)' }}
                >
                    <Plus size={18} />
                    Nueva Página
                </Link>
            </div>

            {/* List Table */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="relative flex-1 w-full max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar páginas..."
                            className="w-full bg-gray-50 border-none rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold outline-none transition-all placeholder:text-gray-400"
                            style={ { '--tw-ring-color': 'var(--primary-color)' } as any }
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-50">
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Página</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Estado</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Slug</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                Array(3).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-8 py-6"><div className="h-4 bg-gray-100 rounded w-48" /></td>
                                        <td className="px-8 py-6"><div className="h-4 bg-gray-100 rounded w-24" /></td>
                                        <td className="px-8 py-6"><div className="h-4 bg-gray-100 rounded w-32" /></td>
                                        <td className="px-8 py-6 flex justify-end gap-2"><div className="h-8 bg-gray-100 rounded w-20" /></td>
                                    </tr>
                                ))
                            ) : filteredPages.length > 0 ? (
                                filteredPages.map((page) => (
                                    <tr key={page.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="size-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center border border-slate-100 overflow-hidden shrink-0 shadow-sm transition-transform group-hover:scale-105">
                                                    {(page as any).featuredImage ? (
                                                        <img src={(page as any).featuredImage} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <FileText size={20} />
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-900 line-clamp-1">{page.title}</span>
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Act. {new Date(page.updatedAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${page.status === 'published'
                                                ? 'bg-opacity-10'
                                                : 'bg-orange-50 text-orange-600 bg-opacity-70'
                                                }`} style={page.status === 'published' ? { backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 90%)', color: 'var(--primary-color)' } : {}}>
                                                {page.status === 'published' ? <Globe size={10} /> : <EyeOff size={10} />}
                                                {page.status === 'published' ? 'Publicada' : 'Borrador'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 font-mono text-xs text-slate-400">/{page.slug}</td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    href={`/admin/paginas/${page.id}`}
                                                    className="p-2 text-gray-400 rounded-xl transition-all"
                                                    style={ { '--hover-color': 'var(--primary-color)' } as any }
                                                    title="Editar"
                                                >
                                                    <style jsx>{`
                                                        a:hover { color: var(--primary-color); background-color: color-mix(in srgb, var(--primary-color), transparent 90%); }
                                                    `}</style>
                                                    <Edit2 size={18} />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(page.id)}
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-8 py-20 text-center text-gray-400 font-bold uppercase text-xs">
                                        No hay páginas creadas aún.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Design Tips Panel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-10">
                <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:scale-110 transition-transform duration-700">
                        <Layout size={100} />
                    </div>
                    <h4 className="text-xl font-black italic uppercase tracking-tighter mb-4">¿Qué páginas crear?</h4>
                    <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-xs">
                        Usa esta herramienta para crear secciones de "Quiénes Somos", "Términos y Condiciones", "Escuela de Formación" o simplemente blogs de novedades.
                    </p>
                </div>
                <div className="rounded-[2.5rem] p-10 text-white relative overflow-hidden group" style={{ backgroundColor: 'var(--primary-color)' }}>
                    <h4 className="text-xl font-black italic uppercase tracking-tighter mb-4">Consejo Pro</h4>
                    <p className="text-white text-sm font-medium leading-relaxed max-w-xs opacity-90">
                        Incluye imágenes atractivas y listas de beneficios para captar la atención de tus clientes y mejorar el SEO de tu sitio.
                    </p>
                </div>
            </div>

        </div>
    );
}
