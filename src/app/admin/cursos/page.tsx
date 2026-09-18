'use client';

import { useState, useEffect } from 'react';
import { Plus, GraduationCap, Search, Loader2, ChevronRight, Users, Clock, Calendar, Edit2, Trash2, Lock, Sparkles, ShieldCheck, ArrowRight, Zap } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import CourseModal from '@/components/admin/cursos/CourseModal';
import AddonCheckoutModal from '@/components/admin/AddonCheckoutModal';

export default function CoursesPage() {
    const { data: session } = useSession();
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState<any>(null);

    const [isLocked, setIsLocked] = useState(false);
    const [isServiceBiz, setIsServiceBiz] = useState(false);
    const [businessName, setBusinessName] = useState('');

    // Estado del Add-on de cursos
    const [coursesAddon, setCoursesAddon] = useState<any>(null);
    const [subscriptionDates, setSubscriptionDates] = useState<any>(null);
    const [isPendingApproval, setIsPendingApproval] = useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

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
        const checkAccess = async () => {
            try {
                const [resEnt, resNeg, resAddons] = await Promise.all([
                    fetch('/api/admin/entitlements'),
                    fetch('/api/negocio'),
                    fetch('/api/admin/addons')
                ]);

                let hasCourses = false;
                if (resEnt.ok) {
                    const entData = await resEnt.json();
                    if (entData.success && entData.entitlements) {
                        hasCourses = Boolean(entData.entitlements.capabilities?.courses || entData.entitlements.capabilities?.COURSES);
                    }
                }

                if (resNeg.ok) {
                    const negData = await resNeg.json();
                    if (negData.nombre) setBusinessName(negData.nombre);
                    const tUpper = (negData.tipoNegocio || '').toUpperCase();
                    const nameUpper = (negData.nombre || '').toUpperCase();
                    const isSpa = tUpper.includes('SPA') || tUpper.includes('PELUQUERIA') || tUpper.includes('ESTETICA') || tUpper.includes('BARBERIA') || tUpper.includes('BELLEZA') || tUpper.includes('RESERVA') || nameUpper.includes('SPA') || nameUpper.includes('PELUQUERIA') || nameUpper.includes('ESTETICA');
                    setIsServiceBiz(isSpa);
                }

                if (resAddons.ok) {
                    const addData = await resAddons.json();
                    if (addData.success) {
                        const found = (addData.availableAddons || []).find((a: any) =>
                            a.code === 'ADDON_COURSES' || a.targetKey === 'COURSES'
                        );
                        if (found) {
                            setCoursesAddon(found.addon || found);
                            if (found.isPendingPayment) setIsPendingApproval(true);
                        }
                        const pendingSub = (addData.activeSubscriptions || []).find((s: any) =>
                            s.addon?.code === 'ADDON_COURSES' || s.addonCode === 'ADDON_COURSES'
                        );
                        if (pendingSub && pendingSub.status === 'PENDING') {
                            setIsPendingApproval(true);
                        }
                        if (addData.pricingDetails) {
                            setSubscriptionDates({
                                startDate: addData.pricingDetails.startDate,
                                endDate: addData.pricingDetails.endDate
                            });
                        }
                    }
                }

                setIsLocked(!hasCourses);
                if (hasCourses) {
                    await fetchCourses();
                } else {
                    setLoading(false);
                }
            } catch (err) {
                console.error("Error comprobando acceso a cursos:", err);
                setLoading(false);
            }
        };

        checkAccess();
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

    if (loading) {
        return (
            <div className="min-h-[400px] flex items-center justify-center">
                <Loader2 className="animate-spin text-emerald-600" size={36} />
            </div>
        );
    }

    if (isLocked) {
        return (
            <div className="max-w-4xl mx-auto py-12 px-6 animate-in fade-in duration-500 text-slate-900">
                <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 rounded-[3rem] p-8 md:p-14 text-white shadow-2xl relative overflow-hidden border border-emerald-500/20 text-center space-y-8">
                    {/* Glow de fondo */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -mr-48 -mt-48 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl -ml-40 -mb-40 pointer-events-none" />

                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-black uppercase tracking-widest shadow-inner">
                        <Lock size={14} className="text-emerald-400" /> Módulo con Candado • Requiere Plan Superior o Add-on
                    </div>

                    <div className="space-y-4 max-w-2xl mx-auto">
                        <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight uppercase italic text-white">
                            <span className="text-white block">Academia & Talleres</span>
                            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 bg-clip-text text-transparent not-italic font-black block mt-1">
                                {isServiceBiz ? 'Cursos de Uñas, Cejas, Yoga & Belleza' : 'Escuelas & Entrenamientos'}
                            </span>
                        </h2>
                        <p className="text-slate-300 font-medium text-sm md:text-base leading-relaxed">
                            {isServiceBiz 
                                ? 'Monetiza tu experiencia profesional ofreciendo masterclasses, talleres de estética, diseño de cejas, pestañas, uñas acrílicas o clases de yoga. Administra cupos, inscripciones y el pase de asistencia de tus alumnos.'
                                : 'Organiza escuelas formativas, clases grupales y entrenamientos. Administra alumnos, profesores y sesiones por espacio.'}
                        </p>
                    </div>

                    {/* Tarjetas de Beneficios */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto text-left pt-2">
                        <div className="flex items-center gap-3.5 bg-white/5 p-4.5 rounded-2xl border border-white/10 hover:border-emerald-500/30 transition-colors">
                            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                                <Users size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-black text-white uppercase tracking-wider">Control de Alumnos e Inscripciones</p>
                                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Control de cupos, contactos y estados de pago.</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3.5 bg-white/5 p-4.5 rounded-2xl border border-white/10 hover:border-emerald-500/30 transition-colors">
                            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
                                <Sparkles size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-black text-white uppercase tracking-wider">{isServiceBiz ? 'Talleres & Masterclasses' : 'Cursos y Clínicas'}</p>
                                <p className="text-[11px] text-slate-400 font-medium mt-0.5">{isServiceBiz ? 'Cursos de uñas, cejas, automaquillaje y yoga.' : 'Entrenamientos formativos y torneos.'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3.5 bg-white/5 p-4.5 rounded-2xl border border-white/10 hover:border-emerald-500/30 transition-colors">
                            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 shrink-0">
                                <Calendar size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-black text-white uppercase tracking-wider">Sesiones & Pase de Asistencia</p>
                                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Define horarios semanales y pasa lista por clase.</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3.5 bg-white/5 p-4.5 rounded-2xl border border-white/10 hover:border-emerald-500/30 transition-colors">
                            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 shrink-0">
                                <ShieldCheck size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-black text-white uppercase tracking-wider">Nueva Fuente de Ingresos</p>
                                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Cobra por inscripción fija o mensualidad.</p>
                            </div>
                        </div>
                    </div>

                    {/* Botón de acción */}
                    <div className="pt-6 flex flex-col sm:flex-row justify-center items-center gap-4">
                        {isPendingApproval ? (
                            <div className="px-6 py-4 bg-amber-500/20 border border-amber-400/40 rounded-2xl flex items-center gap-3 text-amber-300">
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                                <div className="text-left">
                                    <span className="block text-xs font-black uppercase tracking-wider">Pago en Revisión</span>
                                    <span className="block text-[11px] text-amber-200/80">Se activará tras confirmar tu transferencia.</span>
                                </div>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setIsCheckoutOpen(true)}
                                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-black px-8 py-4 rounded-2xl text-xs uppercase tracking-widest transition-all shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                            >
                                <Zap size={16} />
                                Activar Add-on (${coursesAddon?.priceMonthly?.toFixed(2) || '14.00'}/mes)
                            </button>
                        )}
                        <Link
                            href="/admin/plan"
                            className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-slate-950 font-black px-8 py-4 rounded-2xl text-xs uppercase tracking-widest transition-all shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-2 active:scale-95"
                        >
                            <Sparkles size={16} />
                            Ver Planes Completos
                            <ArrowRight size={16} />
                        </Link>
                        <a
                            href="https://wa.me/593968118444?text=Hola%20CitiOx,%20quisiera%20habilitar%20el%20módulo%20de%20cursos%20para%20mi%20negocio"
                            target="_blank"
                            rel="noreferrer"
                            className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white border border-white/10 px-8 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                        >
                            Hablar con Asesor
                        </a>
                    </div>

                    <AddonCheckoutModal
                        isOpen={isCheckoutOpen}
                        onClose={() => setIsCheckoutOpen(false)}
                        addon={coursesAddon || {
                            code: 'ADDON_COURSES',
                            name: 'Academia, Cursos & Talleres',
                            description: 'Habilita la creación de cursos, academias, talleres y masterclasses con gestión de alumnos, cupos y asistencia.',
                            priceMonthly: 14.00,
                            type: 'CAPABILITY',
                            targetKey: 'COURSES'
                        }}
                        subscriptionDates={subscriptionDates}
                        onSuccess={async () => {
                            setIsCheckoutOpen(false);
                            setIsPendingApproval(true);
                        }}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 text-slate-900 font-sans">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6 text-left">
                <div>
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-1">
                        ACADEMIA Y MARKETING
                    </span>
                    <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tight flex items-center gap-3">
                        <GraduationCap className="text-emerald-600" size={32} />
                        Gestión de Cursos & Academia
                    </h1>
                    <p className="text-slate-500 font-bold text-xs">Administra talleres, capacitaciones, escuelas y academias.</p>
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
                    placeholder="Buscar por nombre o instructor..."
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
                        <GraduationCap size={40} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">No hay cursos registrados</h3>
                        <p className="text-gray-400 max-w-xs mx-auto">Comienza creando tu primer curso, taller o academia.</p>
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
                                        <GraduationCap size={48} className="text-white/10" />
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
                                    {course.coach && <p className="text-xs font-bold text-emerald-600 italic mt-0.5">{isServiceBiz ? 'Instructor / Especialista' : 'Entrenador'}: {course.coach}</p>}
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
