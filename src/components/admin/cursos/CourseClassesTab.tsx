import { useState, useEffect } from 'react';
import { Calendar, Loader2, Plus, Users, Clock, Edit2, Trash2, X, Save } from 'lucide-react';
import Link from 'next/link';

export default function CourseClassesTab({ courseId }: { courseId: string }) {
    const [classes, setClasses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [formData, setFormData] = useState({ title: '', description: '', class_date: '' });
    const [editingClass, setEditingClass] = useState<any>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    const fetchClasses = async () => {
        try {
            const res = await fetch(`/api/admin/cursos/${courseId}/clases`);
            if (res.ok) {
                const data = await res.json();
                setClasses(data);
            }
        } catch (error) {
            console.error('Error fetching classes:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClasses();
    }, [courseId]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        try {
            const res = await fetch(`/api/admin/cursos/${courseId}/clases`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setFormData({ title: '', description: '', class_date: '' });
                fetchClasses();
            } else {
                alert('Error al crear la clase');
            }
        } catch {
            alert('Error de conexión');
        } finally {
            setIsCreating(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingClass) return;
        setIsUpdating(true);
        try {
            const res = await fetch(`/api/admin/cursos/${courseId}/clases/${editingClass.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: editingClass.title,
                    description: editingClass.description,
                    class_date: editingClass.class_date
                })
            });
            if (res.ok) {
                setEditingClass(null);
                fetchClasses();
            } else {
                alert('Error al actualizar la clase');
            }
        } catch {
            alert('Error de conexión');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDelete = async (classId: string) => {
        if (!confirm('¿Seguro que deseas eliminar esta clase? Todas las asistencias registradas a esta clase también serán eliminadas.')) return;
        setIsDeleting(classId);
        try {
            const res = await fetch(`/api/admin/cursos/${courseId}/clases/${classId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                fetchClasses();
            } else {
                alert('Error al eliminar la clase');
            }
        } catch {
            alert('Error de conexión');
        } finally {
            setIsDeleting(null);
        }
    };

    if (loading) return (
        <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-emerald-500" size={32} />
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Create Form */}
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                <h3 className="text-sm font-black text-gray-900 uppercase mb-4 flex items-center gap-2">
                    <Plus size={16} className="text-emerald-500" /> Nueva Clase
                </h3>
                <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-1">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Título</label>
                        <input
                            required
                            type="text"
                            placeholder="Ej: Control de balón"
                            className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-emerald-500"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Fecha y Hora</label>
                        <input
                            required
                            type="datetime-local"
                            className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-emerald-500"
                            value={formData.class_date}
                            onChange={(e) => setFormData({ ...formData, class_date: e.target.value })}
                        />
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Descripción (Opcional)</label>
                        <input
                            type="text"
                            placeholder="Tema de la clase..."
                            className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-emerald-500"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>
                    <div className="md:col-span-1">
                        <button
                            disabled={isCreating}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                        >
                            {isCreating ? <Loader2 size={16} className="animate-spin" /> : 'Añadir'}
                        </button>
                    </div>
                </form>
            </div>

            {/* List */}
            {classes.length === 0 ? (
                <div className="bg-white rounded-[2rem] border-2 border-dashed border-gray-100 p-16 text-center">
                    <Calendar size={40} className="text-gray-200 mx-auto mb-4" />
                    <p className="font-black text-gray-400 uppercase">Aún no hay clases registradas</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {classes.map(c => {
                        const isEditing = editingClass?.id === c.id;

                        if (isEditing) {
                            return (
                                <div key={c.id} className="bg-white p-5 rounded-[2rem] border-2 border-emerald-500 shadow-lg flex flex-col justify-between pt-6">
                                    <form onSubmit={handleUpdate} className="space-y-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="font-black text-emerald-600 uppercase text-sm">Editar Clase</h4>
                                            <button type="button" onClick={() => setEditingClass(null)} className="text-gray-400 hover:text-gray-600 bg-gray-50 p-1.5 rounded-full">
                                                <X size={16} />
                                            </button>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Título</label>
                                            <input
                                                required
                                                type="text"
                                                className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-emerald-500"
                                                value={editingClass.title}
                                                onChange={(e) => setEditingClass({ ...editingClass, title: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Fecha y Hora</label>
                                            <input
                                                required
                                                type="datetime-local"
                                                className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-emerald-500"
                                                // Convert datetime to format suitable for datetime-local input
                                                value={new Date(new Date(editingClass.class_date).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                                                onChange={(e) => setEditingClass({ ...editingClass, class_date: new Date(e.target.value).toISOString() })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Descripción</label>
                                            <input
                                                type="text"
                                                className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-emerald-500"
                                                value={editingClass.description || ''}
                                                onChange={(e) => setEditingClass({ ...editingClass, description: e.target.value })}
                                            />
                                        </div>
                                        <div className="pt-2">
                                            <button
                                                disabled={isUpdating}
                                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                                            >
                                                {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                                Guardar Cambios
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            );
                        }

                        return (
                            <div key={c.id} className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col justify-between pt-6 group transition-all hover:shadow-md">
                                <div>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-black text-gray-900 uppercase text-lg">{c.title}</h4>
                                            {c.description && <p className="text-sm font-medium text-gray-500 mt-1">{c.description}</p>}
                                        </div>
                                        <div className="flex bg-gray-50 rounded-lg p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => setEditingClass({ ...c })}
                                                className="p-1.5 text-emerald-600 hover:bg-white rounded-md transition-colors"
                                                title="Editar"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(c.id)}
                                                disabled={isDeleting === c.id}
                                                className="p-1.5 text-rose-500 hover:bg-white rounded-md transition-colors"
                                                title="Eliminar"
                                            >
                                                {isDeleting === c.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 mt-3">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
                                            <Clock size={12} className="text-slate-400" />
                                            {new Date(c.class_date).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">
                                            <Users size={12} />
                                            {c._count?.attendances || 0} asistencias
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-5 pt-4 border-t border-gray-50">
                                    <Link
                                        href={`/admin/cursos/${courseId}/clases/${c.id}`}
                                        className="block w-full text-center bg-white border border-gray-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 text-slate-700 px-4 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all"
                                    >
                                        Gestionar Asistencia & \rarr;
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
