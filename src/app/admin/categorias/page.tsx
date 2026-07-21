'use client';

import { useState, useEffect } from 'react';
import { 
    Plus, Edit, Trash2, Loader2, Save, X, ToggleLeft, ToggleRight, 
    ArrowUp, ArrowDown, FolderPlus
} from 'lucide-react';

interface Category {
    id: string;
    nombre: string;
    activo: boolean;
    orden: number;
}

export default function AdminCategorias() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Modal states
    const [isOpen, setIsOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [name, setName] = useState('');
    const [active, setActive] = useState(true);
    const [order, setOrder] = useState(0);
    const [saving, setSaving] = useState(false);

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/admin/categorias');
            if (res.ok) {
                const data = await res.json();
                setCategories(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleOpenCreate = () => {
        setEditingCategory(null);
        setName('');
        setActive(true);
        setOrder(categories.length);
        setIsOpen(true);
    };

    const handleOpenEdit = (cat: Category) => {
        setEditingCategory(cat);
        setName(cat.nombre);
        setActive(cat.activo);
        setOrder(cat.orden);
        setIsOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        try {
            setSaving(true);
            const isEdit = !!editingCategory;
            const method = isEdit ? 'PUT' : 'POST';
            const payload = isEdit 
                ? { id: editingCategory.id, nombre: name, activo: active, orden: order }
                : { nombre: name, activo: active, orden: order };

            const res = await fetch('/api/admin/categorias', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                fetchCategories();
                setIsOpen(false);
            } else {
                alert("Ocurrió un error al guardar la categoría.");
            }
        } catch (e) {
            console.error(e);
            alert("Error de conexión.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Seguro quieres eliminar esta categoría? Los productos asociados quedarán sin categoría.")) return;

        try {
            const res = await fetch(`/api/admin/categorias?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchCategories();
            } else {
                alert("No se pudo eliminar la categoría.");
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleToggleActive = async (cat: Category) => {
        try {
            const res = await fetch('/api/admin/categorias', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...cat, activo: !cat.activo })
            });
            if (res.ok) {
                fetchCategories();
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="space-y-6 text-left">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none italic uppercase">
                        Categorías
                    </h1>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1.5">
                        Administra las secciones de tu catálogo de productos
                    </p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-md"
                >
                    <FolderPlus className="size-4" />
                    Nueva Categoría
                </button>
            </div>

            {/* Listado */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="size-8 text-slate-300 animate-spin mb-3" />
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Cargando categorías...</span>
                    </div>
                ) : categories.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50">
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Orden</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Estado</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {categories.map((cat, idx) => (
                                    <tr key={cat.id} className="hover:bg-slate-50/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-black text-slate-500">#{cat.orden}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-black text-slate-800 uppercase italic">{cat.nombre}</span>
                                        </td>
                                        <td className="px-6 py-4 flex justify-center">
                                            <button 
                                                onClick={() => handleToggleActive(cat)}
                                                className="focus:outline-none"
                                            >
                                                {cat.activo ? (
                                                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-wider">Activo</span>
                                                ) : (
                                                    <span className="px-3 py-1 bg-slate-200 text-slate-500 rounded-full text-[9px] font-black uppercase tracking-wider">Inactivo</span>
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleOpenEdit(cat)}
                                                    className="size-8 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl flex items-center justify-center transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit className="size-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(cat.id)}
                                                    className="size-8 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-xl flex items-center justify-center transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="size-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <FolderPlus className="size-12 text-slate-200 mx-auto mb-3" />
                        <h3 className="text-xs font-black text-slate-700 mb-1">Sin categorías</h3>
                        <p className="text-[11px] text-slate-400 font-medium">Crea una categoría para empezar a organizar tu menú.</p>
                    </div>
                )}
            </div>

            {/* Modal Creación / Edición */}
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-white rounded-[2rem] p-6 shadow-2xl border border-slate-100 animate-fade-in text-left">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
                            <h3 className="text-sm font-black text-slate-950 uppercase tracking-widest">
                                {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
                            </h3>
                            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="size-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Nombre de la Categoría</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ej: Carnes, Bebidas, Acompañantes"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-slate-300"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Orden de Visualización</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        value={order}
                                        onChange={e => setOrder(parseInt(e.target.value))}
                                        className="w-full bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-slate-300"
                                    />
                                </div>
                                <div className="flex flex-col justify-end pb-1.5">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 block">Estado</span>
                                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={active}
                                            onChange={e => setActive(e.target.checked)}
                                            className="hidden"
                                        />
                                        {active ? (
                                            <ToggleRight className="size-9 text-emerald-500 stroke-[1.5]" />
                                        ) : (
                                            <ToggleLeft className="size-9 text-slate-300 stroke-[1.5]" />
                                        )}
                                        <span className="text-xs font-bold text-slate-700">{active ? 'Activo' : 'Inactivo'}</span>
                                    </label>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full mt-6 py-4 bg-slate-900 hover:bg-slate-950 text-white rounded-2xl text-xs font-black uppercase tracking-widest active:scale-95 transition-transform flex items-center justify-center gap-2"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="size-4 animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="size-4" />
                                        Guardar Categoría
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
