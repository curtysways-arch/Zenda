'use client';

// HMR trace: v8_course_rich_content
import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { X, Dribbble, Save, Loader2, AlertCircle, Info, Trash2, Plus, Clock, Calendar, CheckCircle2, ImageIcon, LayoutTemplate, FileText, ChevronRight, ChevronLeft, Users } from 'lucide-react';
import ImageUploader from '@/components/ui/ImageUploader';

// Editor dinámico para evitar errores de window is not defined
const ReactQuill = dynamic(() => import('react-quill-new'), { 
    ssr: false,
    loading: () => <div className="h-60 bg-gray-50 animate-pulse rounded-2xl border-2 border-dashed border-gray-100 flex items-center justify-center text-gray-400 font-bold">Cargando editor de contenido...</div>
});
import 'react-quill-new/dist/quill.snow.css';

interface CourseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    course?: any;
}

export default function CourseModal({ isOpen, onClose, onSuccess, course }: CourseModalProps) {
    const [step, setStep] = useState(1); // 1: Básicos, 2: Contenido, 3: Horarios
    const [savedCourse, setSavedCourse] = useState<any>(course || null);
    const isEdit = !!course || !!savedCourse;
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        imageUrl: '',
        imageMediaId: '',
        min_age: '',
        max_age: '',
        coach: '',
        price: '',
        payment_type: 'mensual',
        capacity: '20',
        status: 'active',
        start_date: '',
        end_date: '',
        content: '',
        instructor_id: ''
    });

    const [schedules, setSchedules] = useState<any[]>([]);
    const [canchas, setCanchas] = useState<any[]>([]);
    const [newSchedule, setNewSchedule] = useState({
        day_of_week: '1',
        start_time: '14:00',
        end_time: '15:00',
        title: '',
        courtId: ''
    });

    useEffect(() => {
        if (course) {
            setFormData({
                name: course.name,
                description: course.description || '',
                imageUrl: course.imageMedia?.url || course.imageUrl || '',
                imageMediaId: course.imageMediaId || '',
                min_age: course.min_age?.toString() || '',
                max_age: course.max_age?.toString() || '',
                coach: course.coach || '',
                price: course.price.toString(),
                payment_type: course.payment_type,
                capacity: course.capacity.toString(),
                status: course.status,
                start_date: course.start_date ? new Date(course.start_date).toISOString().split('T')[0] : '',
                end_date: course.end_date ? new Date(course.end_date).toISOString().split('T')[0] : '',
                content: course.content || '',
                instructor_id: course.instructor_id || ''
            });
            setSavedCourse(course);
            fetchSchedules(course.id);
        }
        fetchCanchas();
        fetchInstructors();
    }, [course]);

    const [instructors, setInstructors] = useState<any[]>([]);

    const fetchInstructors = async () => {
        try {
            const res = await fetch('/api/staff');
            if (res.ok) {
                const data = await res.json();
                setInstructors(data);
            }
        } catch (error) {
            console.error("Error fetching instructors", error);
        }
    };

    const fetchCanchas = async () => {
        try {
            const res = await fetch('/api/canchas');
            if (res.ok) {
                const data = await res.json();
                setCanchas(data);
                if (data.length > 0 && !newSchedule.courtId) {
                    setNewSchedule(prev => ({ ...prev, courtId: data[0].id }));
                }
            }
        } catch (error) {
            console.error("Error fetching canchas", error);
        }
    };

    const fetchSchedules = async (id: string) => {
        try {
            const res = await fetch(`/api/admin/cursos/${id}/horarios`);
            if (res.ok) {
                const data = await res.json();
                setSchedules(data);
            }
        } catch (error) {
            console.error("Error fetching schedules", error);
        }
    };

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const courseId = savedCourse?.id || course?.id;
            const res = await fetch(courseId ? `/api/admin/cursos/${courseId}` : '/api/admin/cursos', {
                method: courseId ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();
            if (res.ok) {
                onSuccess();
                setSavedCourse(data);
                return data;
            } else {
                setError(data.detail || data.error || 'Error al guardar');
                return null;
            }
        } catch (err: any) {
            setError('Error de conexión: ' + err.message);
            return null;
        } finally {
            setLoading(false);
        }
    };

    const handleNextStep = async () => {
        const saved = await handleSave();
        if (saved) {
            setStep(prev => prev + 1);
        }
    };

    const handleAddSchedule = async () => {
        const courseToUse = savedCourse || course;
        if (!courseToUse) return;
        
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/cursos/${courseToUse.id}/horarios`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSchedule),
            });

            if (res.ok) {
                setNewSchedule({
                    ...newSchedule,
                    title: ''
                });
                fetchSchedules(courseToUse.id);
            } else {
                const data = await res.json();
                const errorMsg = data.detail || data.error || 'Error al añadir horario';
                alert('Error: ' + errorMsg);
            }
        } catch (err: any) {
            alert('Error de red al añadir horario');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSchedule = async (id: string) => {
        const courseToUse = savedCourse || course;
        if (!courseToUse) return;

        if (!confirm('¿Seguro quieres eliminar esta sesión?')) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/cursos/${courseToUse.id}/horarios/${id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                fetchSchedules(courseToUse.id);
            }
        } catch (err) {
            alert('Error al eliminar');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const days = [
        { id: '1', label: 'Lunes' },
        { id: '2', label: 'Martes' },
        { id: '3', label: 'Miércoles' },
        { id: '4', label: 'Jueves' },
        { id: '5', label: 'Viernes' },
        { id: '6', label: 'Sábado' },
        { id: '0', label: 'Domingo' },
    ];

    const quillModules = {
        toolbar: [
            [{ 'header': [1, 2, 3, 4, false] }],
            [{ 'size': ['small', false, 'large', 'huge'] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'align': [] }],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            [{ 'indent': '-1' }, { 'indent': '+1' }],
            ['blockquote', 'code-block'],
            ['link', 'image', 'video'],
            ['clean']
        ],
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white w-full max-w-5xl max-h-[90vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 tracking-tight uppercase flex items-center gap-3">
                            {isEdit ? 'Editar Curso' : 'Crear Nuevo Curso'}
                        </h2>
                        <p className="text-gray-400 font-bold italic text-sm">Paso {step}: {step === 1 ? 'Información Básica' : step === 2 ? 'Contenido Detallado' : 'Configuración de Horarios'}</p>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-full transition-all relative z-10 group">
                        <X size={24} className="text-gray-400 group-hover:text-gray-900 transition-colors" />
                    </button>
                </div>

                {/* Tabs / Steps Optimizados */}
                <div className="px-6 md:px-8 pt-4 flex justify-between md:justify-start md:gap-12 border-b border-gray-50">
                    <button
                        onClick={() => setStep(1)}
                        className={`pb-4 px-2 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] transition-all relative flex items-center gap-2 ${step === 1 ? 'text-emerald-600' : 'text-gray-400'}`}
                    >
                        <Info size={14} /> <span className="hidden sm:inline">1.</span> General
                        {step === 1 && <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-600 rounded-full" />}
                    </button>
                    <button
                        disabled={!isEdit && step < 2}
                        onClick={() => setStep(2)}
                        className={`pb-4 px-2 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] transition-all relative flex items-center gap-2 ${step === 2 ? 'text-emerald-600' : 'text-gray-400'} disabled:opacity-30`}
                    >
                        <FileText size={14} /> <span className="hidden sm:inline">2.</span> Contenido
                        {step === 2 && <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-600 rounded-full" />}
                    </button>
                    <button
                        disabled={!isEdit && step < 3}
                        onClick={() => setStep(3)}
                        className={`pb-4 px-2 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] transition-all relative flex items-center gap-2 ${step === 3 ? 'text-emerald-600' : 'text-gray-400'} disabled:opacity-30`}
                    >
                        <Calendar size={14} /> <span className="hidden sm:inline">3.</span> Horario
                        {step === 3 && <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-600 rounded-full" />}
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 animate-in shake duration-500">
                            <AlertCircle size={20} />
                            <p className="text-sm font-bold leading-tight">{error}</p>
                        </div>
                    )}

                    {step === 1 ? (
                        <form id="course-form" className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                                        Nombre del Curso
                                    </label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all text-sm font-black text-gray-700 shadow-sm"
                                        placeholder="Ej: Taller de Masaje Relajante"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                                        Imagen del Curso
                                    </label>
                                    <ImageUploader
                                        category="course"
                                        currentUrl={formData.imageUrl}
                                        onUploadSuccess={(media) => setFormData({ ...formData, imageUrl: media.url, imageMediaId: media.id })}
                                        onRemove={() => setFormData({ ...formData, imageUrl: '', imageMediaId: '' })}
                                        label="Subir imagen del curso"
                                        aspect="landscape"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 ml-1"> Resumen Corto </label>
                                    <textarea
                                        rows={3}
                                        className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all text-sm font-medium text-gray-700 shadow-sm resize-none"
                                        placeholder="Una breve descripción para la tarjeta del curso..."
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Especialista</label>
                                        <select
                                            className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all text-sm font-black text-gray-700"
                                            value={formData.instructor_id}
                                            onChange={(e) => setFormData({ ...formData, instructor_id: e.target.value })}
                                        >
                                            <option value="">Seleccionar Especialista...</option>
                                            {instructors.map(prof => (
                                                <option key={prof.id} value={prof.id}>{prof.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Modalidad</label>
                                        <select
                                            className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all text-sm font-black text-gray-700 uppercase"
                                            value={formData.payment_type}
                                            onChange={(e) => setFormData({ ...formData, payment_type: e.target.value })}
                                        >
                                            <option value="mensual">Mensual (cobro cada mes)</option>
                                            <option value="semanal">Semanal (cobro cada semana)</option>
                                            <option value="total">Pago único por todo el curso</option>
                                            <option value="unico">Por sesión / Pase diario</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Inversión ({formData.payment_type})</label>
                                        <input
                                            type="number"
                                            className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all text-sm font-black text-gray-700"
                                            value={formData.price}
                                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Fecha Inicio</label>
                                        <input
                                            type="date"
                                            className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all text-[11px] font-black text-gray-700"
                                            value={formData.start_date}
                                            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Fecha Fin</label>
                                        <input
                                            type="date"
                                            className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all text-[11px] font-black text-gray-700"
                                            value={formData.end_date}
                                            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Cupo</label>
                                        <input
                                            type="number"
                                            className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all text-sm font-black text-gray-700"
                                            value={formData.capacity}
                                            onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Estado</label>
                                        <select
                                            className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all text-sm font-black text-gray-700"
                                            value={formData.status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        >
                                            <option value="active">Activo</option>
                                            <option value="inactive">Inactivo</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </form>
                    ) : step === 2 ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                    <FileText size={16} className="text-emerald-500" /> Constructor de Página del Curso
                                </label>
                                <span className="text-[10px] font-bold text-gray-400 italic">Este contenido se mostrará en la página de detalles del curso.</span>
                            </div>
                            <div className="rounded-[2rem] overflow-hidden border-2 border-slate-100 shadow-inner min-h-[400px] bg-white">
                                <ReactQuill 
                                    theme="snow"
                                    value={formData.content}
                                    onChange={(val) => setFormData({ ...formData, content: val })}
                                    modules={quillModules}
                                    className="h-[350px] text-slate-900"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
                             <div className="bg-emerald-50 p-8 rounded-[2.5rem] border border-emerald-100/50 space-y-6">
                                <h4 className="font-black text-emerald-800 text-sm uppercase tracking-tight flex items-center gap-2">
                                    <Plus size={18} /> Agregar Sesión
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-emerald-700/50 uppercase tracking-widest ml-1">Día</label>
                                        <select
                                            value={newSchedule.day_of_week}
                                            onChange={(e) => setNewSchedule({ ...newSchedule, day_of_week: e.target.value })}
                                            className="w-full p-4 bg-white border-transparent rounded-2xl text-xs font-black text-emerald-900 shadow-sm"
                                        >
                                            {days.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-emerald-700/50 uppercase tracking-widest ml-1">Inicio</label>
                                            <input type="time" value={newSchedule.start_time} onChange={(e) => setNewSchedule({ ...newSchedule, start_time: e.target.value })} className="w-full p-4 bg-white border-transparent rounded-2xl text-xs font-black text-emerald-900 shadow-sm" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-emerald-700/50 uppercase tracking-widest ml-1">Fin</label>
                                            <input type="time" value={newSchedule.end_time} onChange={(e) => setNewSchedule({ ...newSchedule, end_time: e.target.value })} className="w-full p-4 bg-white border-transparent rounded-2xl text-xs font-black text-emerald-900 shadow-sm" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-emerald-700/50 uppercase tracking-widest ml-1">Tema / Título de la Sesión</label>
                                        <input 
                                            type="text" 
                                            placeholder="Ej: Teoría de Masajes o Práctica 1" 
                                            value={newSchedule.title} 
                                            onChange={(e) => setNewSchedule({ ...newSchedule, title: e.target.value })} 
                                            className="w-full p-4 bg-white border-transparent rounded-2xl text-xs font-black text-emerald-900 shadow-sm placeholder:text-emerald-900/20" 
                                        />
                                    </div>
                                    <div className="flex justify-end pt-2">
                                        <button onClick={handleAddSchedule} disabled={loading} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100">
                                            {loading ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                                            Agregar Sesión al Programa
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h4 className="font-black text-gray-900 text-sm uppercase tracking-tight flex items-center gap-2 ml-1"> <Calendar size={18} className="text-emerald-500" /> Horarios Configurados </h4>
                                {schedules.length === 0 ? (
                                    <div className="p-12 text-center border-2 border-dashed border-gray-100 rounded-[2.5rem]">
                                        <Clock className="mx-auto text-gray-200 mb-2" size={32} />
                                        <p className="text-gray-400 font-bold text-sm">No has agendado sesiones para este curso.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {schedules.map((s) => (
                                            <div key={s.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between group">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 font-black text-xs"> {days.find(d => d.id === s.day_of_week.toString())?.label.substring(0, 3)} </div>
                                                    <div>
                                                        <p className="text-sm font-black text-gray-900 tracking-tight">{s.start_time} - {s.end_time}</p>
                                                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest truncate max-w-[150px]">
                                                            {s.title || 'Sesión de Formación'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button onClick={() => handleDeleteSchedule(s.id)} className="p-3 text-red-100 group-hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"> <Trash2 size={16} /> </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Optimizado para Mobile/App */}
                <div className="p-6 md:p-8 border-t border-gray-100 bg-white flex items-center justify-between gap-4">
                    <div className="flex items-center">
                        {step > 1 ? (
                            <button
                                onClick={() => setStep(prev => Math.max(1, prev - 1))}
                                className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-slate-900 transition-colors"
                            >
                                <ChevronLeft size={16} /> Volver
                            </button>
                        ) : (
                            <button 
                                onClick={onClose} 
                                className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-slate-900 transition-colors"
                            > 
                                Cancelar 
                            </button>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-3">
                        {step > 1 && (
                            <button 
                                onClick={onClose} 
                                className="hidden md:block px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-slate-900 transition-colors"
                            > 
                                Cancelar 
                            </button>
                        )}

                        {step < 3 ? (
                            <button
                                onClick={handleNextStep}
                                disabled={loading}
                                className="flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl active:scale-95"
                            >
                                {loading ? 'Guardando...' : step === 1 ? 'Continuar' : 'Siguiente'}
                                {!loading && <ChevronRight size={16} />}
                                {loading && <Loader2 className="animate-spin" size={16} />}
                            </button>
                        ) : (
                            <button
                                onClick={async () => {
                                    await handleSave();
                                    onClose();
                                }}
                                className="flex items-center gap-3 bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 active:scale-95"
                            >
                                <CheckCircle2 size={16} />
                                Finalizar
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
