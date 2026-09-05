'use client';

import { useState } from 'react';
import { SlidersHorizontal, Save, Trash2, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface FamilyConfigTabProps {
    family: any;
    onFamilyUpdated?: () => void;
    onFamilyDeleted?: () => void;
}

export default function FamilyConfigTab({
    family,
    onFamilyUpdated,
    onFamilyDeleted
}: FamilyConfigTabProps) {
    const router = useRouter();
    const [form, setForm] = useState({
        name: family.name || '',
        code: family.code || '',
        slug: family.slug || '',
        description: family.description || '',
        icon: family.icon || 'Briefcase',
        displayOrder: family.displayOrder ?? 10,
        active: family.active ?? true
    });

    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setFeedback(null);

        try {
            const res = await fetch(`/api/superadmin/familias/${family.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al actualizar la familia');

            setFeedback({ type: 'success', text: 'Familia actualizada correctamente' });
            if (onFamilyUpdated) onFamilyUpdated();
        } catch (err: any) {
            setFeedback({ type: 'error', text: err.message });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        const confirmDelete = window.confirm(
            `¿Estás seguro de que deseas eliminar la familia "${family.name}"?\nEsta acción no se puede deshacer.`
        );
        if (!confirmDelete) return;

        setDeleting(true);
        setFeedback(null);

        try {
            const res = await fetch(`/api/superadmin/familias/${family.id}`, {
                method: 'DELETE'
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'No se pudo eliminar la familia');
            }

            alert('Familia eliminada correctamente');
            if (onFamilyDeleted) {
                onFamilyDeleted();
            } else {
                router.refresh();
            }
        } catch (err: any) {
            setFeedback({ type: 'error', text: err.message });
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6 shadow-xs">
            <div className="border-b border-slate-100 pb-4">
                <h4 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <SlidersHorizontal size={18} className="text-indigo-600" />
                    Configuración General de la Familia
                </h4>
                <p className="text-xs text-slate-500">
                    Modifica los metadatos comerciales, visibilidad y orden de visualización de esta vertical.
                </p>
            </div>

            {feedback && (
                <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-bold ${
                    feedback.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                    {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                    {feedback.text}
                </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Comercial</label>
                        <input
                            type="text"
                            required
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold !text-slate-900 outline-none focus:bg-white focus:border-indigo-600"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Código Único (UPPERCASE)</label>
                        <input
                            type="text"
                            required
                            value={form.code}
                            onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold !text-slate-900 outline-none focus:bg-white focus:border-indigo-600"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Slug URL</label>
                        <input
                            type="text"
                            required
                            value={form.slug}
                            onChange={e => setForm({ ...form, slug: e.target.value })}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold !text-slate-900 outline-none focus:bg-white focus:border-indigo-600"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Icono Lucide</label>
                        <select
                            value={form.icon}
                            onChange={e => setForm({ ...form, icon: e.target.value })}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold !text-slate-900 outline-none focus:bg-white focus:border-indigo-600"
                        >
                            <option value="UtensilsCrossed">UtensilsCrossed (Restaurantes)</option>
                            <option value="Scissors">Scissors (Servicios & Barberías)</option>
                            <option value="Trophy">Trophy (Canchas & Deportes)</option>
                            <option value="Shirt">Shirt (Lavandería)</option>
                            <option value="ShoppingBag">ShoppingBag (Tienda & Retail)</option>
                            <option value="Briefcase">Briefcase (General)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Orden de Presentación</label>
                        <input
                            type="number"
                            value={form.displayOrder}
                            onChange={e => setForm({ ...form, displayOrder: parseInt(e.target.value) || 0 })}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold !text-slate-900 outline-none focus:bg-white focus:border-indigo-600"
                        />
                    </div>

                    <div className="flex items-center gap-3 pt-6">
                        <label className="relative inline-flex items-center cursor-pointer gap-2">
                            <input
                                type="checkbox"
                                checked={form.active}
                                onChange={e => setForm({ ...form, active: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                            <span className="text-xs font-black text-slate-800">
                                {form.active ? 'Familia Activa' : 'Familia Inactiva'}
                            </span>
                        </label>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Descripción</label>
                    <textarea
                        rows={2}
                        value={form.description}
                        onChange={e => setForm({ ...form, description: e.target.value })}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold !text-slate-900 outline-none focus:bg-white focus:border-indigo-600"
                    />
                </div>

                <div className="flex justify-end pt-2">
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
                    >
                        {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </form>

            {/* Zona de peligro / Eliminación */}
            <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <span className="text-xs font-black text-rose-700 block">Eliminar Familia</span>
                    <span className="text-[11px] text-slate-500 font-medium">
                        Solo se permite eliminar familias sin planes o tipos de negocios asociados. De lo contrario, desactívela.
                    </span>
                </div>

                <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 self-start sm:self-auto"
                >
                    <Trash2 size={14} />
                    {deleting ? 'Comprobando...' : 'Eliminar Familia'}
                </button>
            </div>
        </div>
    );
}
