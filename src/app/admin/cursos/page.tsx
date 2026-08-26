'use client';

import { useState, useEffect } from 'react';
import { Plus, Dribbble, Search, Loader2, ChevronRight, Users, Clock, Calendar, Edit2, Trash2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import CourseModal from '@/components/admin/cursos/CourseModal';

export default function CoursesPage() {
    const { data: session } = useSession();
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState<any>(null);

    const fetchCourses = async () => {
        try {
            const res = await fetch('/api/admin/cursos');
            if (res.ok) {
                const data = await res.json();
                setCourses(data);
            }
        } catch (error) {
            console.error("Error fetching courses", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCourses();
    }, []);

    const filteredCourses = courses.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.coach && c.coach.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleEdit = (course: any) => {
        setSelectedCourse(course);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Seguro quieres eliminar este curso?')) return;
        try {
            const res = await fetch(`/api/admin/cursos/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchCourses();
            } else {
                const data = await res.json();
                alert(data.error || 'Error al eliminar');
            }
        } catch (error) {
            alert('Error al eliminar');
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 text-slate-900 font-sans">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6 text-left">
                <div>
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-1">
                        ACADEMIA Y MARKETING
                    </span>
                    <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tight flex items-center gap-3">
                        <Dribbble className="text-emerald-600" size={32} />
                        Gestión de Cursos
                    </h1>
                    <p className="text-slate-500 font-bold text-xs">Administra escuelas, academias y entrenamientos deportivos.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Link
                        href="/admin/cursos/inscripciones"
                        className="flex items-center gap-2 bg-amber-50 text-amber-700 border border-amber-200 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-amber-100 transition-all shadow-sm"
                    >
                        <Users size={18} />
                        INSCRIPCIONES
                    </Link>
                    <Link
                        href="/admin/cursos/alumnos"
                        className="flex items-center gap-2 bg-white text-slate-900 border border-gray-200 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm"
                    >
                        <Users size={18} />
                        BASE DE ALUMNOS
                    </Link>
                    <button
                        type="button"
                        onClick={() => { setSelectedCourse(null); setIsModalOpen(true); }}
                        className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
                    >
                        <Plus size={20} />
                        NUEVO CURSO
                    </button>
                </div>
            </div>

            <div className="bg-white p-4 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center gap-3">
                <Search className="text-gray-400 ml-2" size={20} />
                <input
                    type="text"
                    placeholder="Buscar por nombre o entrenador..."
                    className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-gray-700"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="animate-spin text-emerald-600" size={40} />
                    <p className="text-gray-400 font-bold animate-pulse">Cargando cursos...</p>
                </div>
            ) : filteredCourses.length === 0 ? (
                <div className="bg-white rounded-[3rem] border-2 border-dashed border-gray-100 p-20 text-center space-y-4">
                    <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center mx-auto text-gray-300">
                        <Dribbble size={40} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">No hay cursos registrados</h3>
                        <p className="text-gray-400 max-w-xs mx-auto">Comienza creando tu primer curso o academia deportiva.</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
                    {filteredCourses.map((course) => (
                        <div key={course.id} className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden flex flex-col justify-between">
                            {/* Header con imagen */}
                            <div className="relative h-44 overflow-hidden bg-slate-900">
                                {course.imageUrl ? (
                                    <>
                                        <img src={course.imageUrl} alt={course.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                    </>
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                                        <Dribbble size={48} className="text-white/10" />
                                    </div>
                                )}
                                <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
                                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${course.status === 'active' ? 'bg-emerald-500 text-white' : 'bg-black/40 text-white/70'}`}>
                                        {course.status === 'active' ? 'Activo' : 'Inactivo'}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {course.pendingCount > 0 && (
                                            <div className="bg-amber-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg border border-amber-400 animate-pulse flex items-center gap-1">
                                                <Users size={12} />
                                                PENDIENTES: {course.pendingCount}
                                            </div>
                                        )}
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button type="button" onClick={() => handleEdit(course)} className="p-2 bg-white/90 hover:bg-blue-50 text-blue-600 rounded-xl transition-colors shadow">
                                                <Edit2 size={14} />
                                            </button>
                                            <button type="button" onClick={() => handleDelete(course.id)} className="p-2 bg-white/90 hover:bg-red-50 text-red-600 rounded-xl transition-colors shadow">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 space-y-4 flex-1">
                                <div>
                                    <h3 className="text-xl font-black text-gray-900 group-hover:text-emerald-600 transition-colors uppercase tracking-tight leading-tight italic">
                                        {course.name}
                                    </h3>
                                    {course.coach && <p className="text-xs font-bold text-emerald-600 italic mt-0.5">Entrenador: {course.coach}</p>}
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100/50">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                            <Users size={12} /> Cupos
                                        </p>
                                        <p className="text-sm font-black text-gray-700">
                                            {course._count?.enrollments || 0} / {course.capacity}
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100/50">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                            <Users size={12} /> Edades
                                        </p>
                                        <p className="text-sm font-black text-gray-700">
                                            {course.min_age || 0} - {course.max_age || '∞'} años
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-2 text-xs font-medium text-gray-500">
                                    {course.start_date && (
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} className="text-emerald-500" />
                                            <span>Desde: {new Date(course.start_date).toLocaleDateString()}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <Clock size={14} className="text-gray-400" />
                                        <span>Pago {course.payment_type} • {course.schedules?.length || 0} ses/semana</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 bg-slate-900 flex items-center justify-between">
                                <div className="text-white">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Precio</p>
                                    <p className="text-xl font-black tracking-tight">${Number(course.price || 0).toLocaleString()}</p>
                                </div>
                                <Link
                                    href={`/admin/cursos/${course.id}`}
                                    className="bg-emerald-500 text-slate-950 px-5 py-3 rounded-xl hover:bg-emerald-400 transition-all font-black text-xs uppercase tracking-widest flex items-center gap-2"
                                >
                                    Ver Detalles
                                    <ChevronRight size={16} />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isModalOpen && (
                <CourseModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={fetchCourses}
                    course={selectedCourse}
                />
            )}
        </div>
    );
}
