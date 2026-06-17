"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
    CheckCircle2, 
    Calendar, 
    Clock, 
    User, 
    MapPin, 
    ChevronLeft, 
    MessageCircle, 
    ArrowLeft,
    CalendarPlus,
    XCircle,
    Loader2,
    Timer,
    Trophy,
    UserCircle2,
    Settings,
    LayoutDashboard,
    Briefcase,
    Download,
    Zap,
    Users,
    BookOpen,
    ClipboardList,
    GraduationCap,
    RotateCcw,
    Printer,
    FileText,
    Activity,
    CreditCard
} from "lucide-react";
import Link from "next/link";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

type TabType = 'curso' | 'alumno' | 'horario' | 'gestion';

export default function DetalleInscripcionPage() {
    const params = useParams();
    const slug = params.slug as string;
    const id = params.id as string;
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [enrollment, setEnrollment] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('alumno');

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const res = await fetch(`/api/${slug}/cursos/inscripciones/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    setEnrollment(data);
                } else {
                    const data = await res.json();
                    setError(data.error || "No se pudo cargar la información");
                }
            } catch (err) {
                setError("Ocurrió un error al conectar con el servidor.");
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchDetail();
    }, [id, slug]);

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-slate-300" size={48} />
                    <p className="font-black uppercase tracking-widest text-[10px] text-slate-400 italic animate-pulse">Cargando Academias...</p>
                </div>
            </div>
        );
    }

    if (error || !enrollment) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-6 text-center">
                <div className="max-w-md w-full text-center space-y-6 flex flex-col items-center">
                    <div className="inline-flex p-6 rounded-[2.5rem] bg-rose-500/10 text-rose-500 mb-2 border border-rose-500/20 shadow-2xl shadow-rose-500/10">
                        <XCircle size={64} />
                    </div>
                    <h1 className="text-3xl font-black tracking-tighter uppercase italic leading-none text-slate-900">¡Ups! Algo salió mal</h1>
                    <p className="text-slate-400 font-medium italic uppercase">{error || "No encontramos esta inscripción."}</p>
                    <Link href={`/${slug}`} className="w-full h-16 bg-slate-900 text-white rounded-2xl font-black text-[12px] uppercase tracking-widest italic flex items-center justify-center gap-3 active:scale-95 transition-all">
                        <ArrowLeft size={16} /> Volver al Inicio
                    </Link>
                </div>
            </div>
        );
    }

    const { course, status, enrollment_date, siblings } = enrollment;
    const instructorName = course?.instructor?.nombre || course?.instructor_name || 'Profesor por asignar';
    const primaryColor = enrollment?.negocio?.colorPrimario || '#10b981';
    const textColor = enrollment?.negocio?.colorTexto || '#0f172a';
    const neutralColor = enrollment?.negocio?.colorNeutral || '#f8fafc';

    const getStatusStyle = (s: string) => {
        switch (s.toLowerCase()) {
            case 'approved': 
            case 'confirmed':
            case 'confirmado':
                return { backgroundColor: `${primaryColor}10`, color: primaryColor, borderColor: `${primaryColor}20` };
            case 'pending': 
            case 'pendiente':
                return { backgroundColor: '#fff7ed', color: '#f59e0b', borderColor: '#ffedd5' };
            case 'rejected': 
            case 'cancelado':
                return { backgroundColor: '#fef2f2', color: '#ef4444', borderColor: '#fee2e2' };
            default: 
                return { backgroundColor: '#f8fafc', color: '#64748b', borderColor: '#e2e8f0' };
        }
    };

    const getStatusLabel = (s: string) => {
        switch (s.toLowerCase()) {
            case 'approved': 
            case 'confirmed':
            case 'confirmado':
                return 'Confirmado';
            case 'pending': 
            case 'pendiente':
                return 'Pendiente';
            case 'rejected': 
            case 'cancelado':
                return 'Cancelado';
            default: return s;
        }
    };

    const getWhatsAppUrl = () => {
        if (!enrollment?.businessPhone) return "#";
        const message = encodeURIComponent(`Hola, tengo una pregunta sobre la inscripción de *${enrollment.student_name}* al curso *${course.name}*.\n\n*Inscripción ID:* INS-${id.slice(-6).toUpperCase()}`);
        return `https://wa.me/${enrollment.businessPhone.replace(/\+/g, '')}?text=${message}`;
    };

    return (
        <div className="min-h-screen bg-gray-50/50 text-slate-900 font-sans selection:bg-emerald-500/30 overflow-x-hidden pb-40 text-left">
            
            {/* 🛡️ SECCIÓN DE IMPRESIÓN */}
            <div className="hidden print:block fixed inset-0 bg-white text-black p-10 z-[500] font-sans" id="printable-area">
                <style dangerouslySetInnerHTML={{ __html: `
                    @media print {
                        body { background: white !important; color: black !important; }
                        #printable-area { display: block !important; position: absolute; left: 0; top: 0; width: 100%; height: 100%; }
                        .app-content { display: none !important; }
                    }
                `}} />
                <div className="max-w-3xl mx-auto space-y-12">
                    <div className="flex justify-between items-start border-b-2 border-slate-200 pb-8">
                        <div className="space-y-2">
                            <h1 className="text-4xl font-black italic uppercase tracking-tighter">{enrollment?.businessName?.toUpperCase() || 'COMPLEJO DEPORTIVO'}</h1>
                            <p className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                                <MapPin size={14} className="text-slate-400" /> {course.location || 'Sede Principal'}
                            </p>
                        </div>
                        <div className="text-right space-y-1">
                            <p className="text-[10px] font-black uppercase text-slate-400 italic">Recibo de Inscripción</p>
                            <p className="text-2xl font-black italic">INS-{id.slice(-6).toUpperCase()}</p>
                            <p className="text-sm font-bold">{new Date(enrollment_date).toLocaleDateString()}</p>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="grid grid-cols-2 gap-10">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase text-slate-400 italic">Representante / Tutor</p>
                                <p className="text-xl font-black uppercase">{enrollment.guardian_name}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase text-slate-400 italic">Teléfono Contacto</p>
                                <p className="text-xl font-black">{enrollment.guardian_phone}</p>
                            </div>
                        </div>

                        <div className="space-y-1 border-l-4 pl-6 py-2" style={{ borderColor: primaryColor }}>
                            <p className="text-[10px] font-black uppercase text-slate-400 italic">Alumno Registrado</p>
                            <p className="text-3xl font-black italic uppercase tracking-tighter">{enrollment.student_name}</p>
                        </div>

                        <div className="bg-slate-50 p-10 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase text-slate-400 italic">Curso / Disciplina</p>
                                <p className="text-2xl font-black italic uppercase tracking-tighter">{course.name}</p>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{course.discipline || 'ACADEMIA'}</p>
                            </div>
                            <div className="pt-6 mt-6 border-t border-slate-200 flex justify-between items-center">
                                <div className="flex flex-col">
                                    <span className="font-black italic uppercase tracking-[0.2em] text-sm text-slate-600">Total Suscripción</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest italic" style={{ color: primaryColor }}>PAGO {String(course.payment_type).toUpperCase() === 'TOTAL' ? 'UNICO' : (course.payment_type?.toUpperCase() || 'MENSUAL')}</span>
                                </div>
                                <span className="text-3xl font-black italic">${(course.price || 0).toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="pt-20 text-center space-y-4">
                            <div className="w-48 h-[1px] bg-slate-200 mx-auto" />
                            <p className="text-[10px] font-black uppercase tracking-widest italic text-slate-400">Sello Digital de la Academia</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 📱 CONTENIDO DE LA APP */}
            <div className="app-content print:hidden">
                <header className="fixed top-0 left-0 right-0 z-[100] bg-white/80 backdrop-blur-xl border-b border-gray-100 h-14 flex items-center px-4">
                    <div className="max-w-xl mx-auto w-full flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <button onClick={() => router.back()} className="size-8 rounded-full p-0.5 active:scale-95 transition-all outline-none" style={{ backgroundColor: `${primaryColor}10` }}>
                                <div className="size-full rounded-full bg-white flex items-center justify-center overflow-hidden border" style={{ borderColor: `${primaryColor}20` }}>
                                    <ChevronLeft size={16} strokeWidth={3} className="relative right-[1px]" style={{ color: primaryColor }} />
                                </div>
                            </button>
                            <h1 className="text-xs font-black uppercase italic tracking-widest leading-none" style={{ color: textColor }}>Mi Academia</h1>
                        </div>
                    </div>
                </header>

                <main className="max-w-xl mx-auto px-6 pt-24 space-y-8 animate-in fade-in duration-500 text-left">
                    {siblings && siblings.length > 1 && (
                        <div className="space-y-3 text-left flex flex-col items-start leading-none uppercase">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1 italic">Gestionar Alumno</p>
                            <div className="flex gap-2 overflow-x-auto pb-2 scroll-hide w-full">
                                {siblings.map((sibling: any) => (
                                    <button
                                        key={sibling.id}
                                        onClick={() => router.push(`/${slug}/cursos/inscripcion/${sibling.id}`)}
                                        className={cn(
                                            "px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest italic transition-all whitespace-nowrap active:scale-95",
                                            id === sibling.id ? "text-white shadow-lg shadow-gray-200" : "bg-white border border-gray-200 text-slate-400"
                                        )}
                                        style={id === sibling.id ? { backgroundColor: primaryColor } : {}}
                                    >
                                        {sibling.student_name.split(' ')[0]}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'alumno' && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 text-left">
                            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 space-y-8 relative overflow-hidden shadow-sm text-left">
                                <div className="absolute top-0 right-0 p-8 opacity-5 text-slate-900 pointer-events-none -rotate-12"><UserCircle2 size={128} /></div>
                                <div className="space-y-8 relative z-10 text-left flex flex-col w-full uppercase">
                                    <div className="space-y-2 text-left flex flex-col items-start leading-none uppercase">
                                        <h3 className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">DATOS DEL ALUMNO</h3>
                                        <p className="text-[10px] font-black uppercase tracking-widest italic" style={{ color: primaryColor }}>FICHA DE INSCRIPCIÓN</p>
                                    </div>
                                    <div className="space-y-5 text-left flex flex-col w-full">
                                        <div className="p-6 bg-gray-50/50 rounded-[2rem] border border-gray-100 space-y-1 block text-left">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 italic">Nombre Completo</span>
                                            <p className="text-2xl font-black text-slate-900 italic uppercase leading-none tracking-tighter">{enrollment.student_name}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-5 bg-white rounded-2xl border border-gray-100 space-y-1 text-left flex flex-col items-start leading-none">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1 italic">REGISTRO</span>
                                                <p className="text-[14px] font-black text-slate-900 italic uppercase leading-none">
                                                    {new Date(enrollment_date).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </p>
                                            </div>
                                            <div className="p-5 bg-white rounded-2xl border border-gray-100 space-y-1 text-left flex flex-col items-start leading-none">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1 italic">ESTADO</span>
                                                <div className="inline-flex px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest italic shadow-sm border" style={getStatusStyle(status)}>
                                                    {getStatusLabel(status)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-6 bg-blue-50/30 rounded-[2rem] border border-blue-100 space-y-3 block text-left relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><User size={60} /></div>
                                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-1 italic">INSTRUCTOR ENCARGADO</span>
                                            <div className="flex items-center gap-4">
                                                <div className="size-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 font-black text-xl italic shadow-inner border border-blue-500/10">
                                                    {instructorName.charAt(0)}
                                                </div>
                                                <p className="text-xl font-black text-slate-900 italic uppercase leading-none tracking-tighter">{instructorName}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'curso' && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 text-left uppercase">
                            <div className="relative overflow-hidden rounded-[2.5rem] bg-white border border-gray-100 shadow-sm p-8 space-y-8 text-left w-full">
                                <div className="space-y-2 text-left flex flex-col items-start leading-none italic">
                                    <div className="flex items-center gap-2">
                                        <div className="size-2 rounded-full animate-pulse" style={{ backgroundColor: primaryColor }} />
                                        <span className="text-[10px] font-black uppercase tracking-widest italic" style={{ color: primaryColor }}>{course?.discipline || 'DIRECCIÓN ACADÉMICA'}</span>
                                    </div>
                                    <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">{course.name}</h2>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-left w-full">
                                    <div className="bg-gray-50/80 rounded-[1.8rem] p-5 flex flex-col items-start gap-2 border border-gray-100 shadow-inner">
                                        <div className="flex items-center gap-2 text-slate-400 font-black italic text-[9px] uppercase tracking-widest leading-none">
                                            <Calendar size={12} style={{ color: primaryColor }} /> INICIA
                                        </div>
                                        <p className="text-xl font-black text-slate-900 italic leading-none">{course.start_date ? new Date(course.start_date).toLocaleDateString('es', { day: 'numeric', month: 'short' }) : 'Pronto'}</p>
                                    </div>
                                    <div className="bg-gray-50/80 rounded-[1.8rem] p-5 flex flex-col items-start gap-2 border border-gray-100 shadow-inner">
                                        <div className="flex items-center gap-2 text-slate-400 font-black italic text-[9px] uppercase tracking-widest leading-none">
                                            <Briefcase size={12} style={{ color: primaryColor }} /> NIVEL
                                        </div>
                                        <p className="text-xl font-black text-slate-900 italic leading-none">{course?.level || 'ACTIVO'}</p>
                                    </div>
                                    <div className="col-span-2 bg-white rounded-[1.8rem] p-5 flex items-center justify-between border border-gray-200 shadow-inner">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-slate-400 font-black italic text-[9px] uppercase tracking-widest leading-none">
                                                <CreditCard size={12} style={{ color: primaryColor }} /> MODALIDAD DE PAGO
                                            </div>
                                            <p className="text-xl font-black text-slate-900 italic leading-none">{String(course.payment_type).toUpperCase() === 'TOTAL' ? 'UNICO' : (course.payment_type?.toUpperCase() || 'MENSUAL')}</p>
                                        </div>
                                        <span className="text-3xl font-black text-slate-900 tracking-tighter italic">${(course.price || 0).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'horario' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 text-left uppercase">
                            <div className="grid grid-cols-1 gap-4">
                                {course.course_classes?.map((cls: any, idx: number) => {
                                    const classDate = new Date(cls.class_date);
                                    const dayOfWeek = classDate.getDay();
                                    const scheduleForDay = course.schedules?.find((s: any) => s.day_of_week === dayOfWeek);
                                    const serviceName = scheduleForDay?.service?.nombre || 'Sede Principal';
                                    const classTime = classDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
                                    
                                    return (
                                        <div key={idx} className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm relative text-left">
                                            <h4 className="text-xl font-black text-slate-900 italic uppercase mb-4">{cls.title}</h4>
                                            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-50">
                                                <p className="text-[12px] font-black text-slate-500 uppercase tracking-tighter leading-none"><Clock size={12} className="inline mr-1" style={{ color: primaryColor }} /> {classDate.toLocaleDateString('es', { day: 'numeric', month: 'short' })} • {classTime}</p>
                                                <p className="text-[12px] font-black text-slate-500 uppercase tracking-tighter leading-none"><MapPin size={12} className="inline mr-1" style={{ color: primaryColor }} /> {serviceName}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {activeTab === 'gestion' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 text-left pb-20 uppercase">
                            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 space-y-6 shadow-sm relative overflow-hidden text-left flex flex-col w-full">
                                <a 
                                    href={getWhatsAppUrl()}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full h-18 py-6 text-white rounded-2xl flex items-center justify-between px-7 active:scale-95 transition-all shadow-xl group text-left border-none"
                                    style={{ backgroundColor: primaryColor, boxShadow: `0 20px 30px -10px ${primaryColor}40` }}
                                >
                                    <div className="flex flex-col items-start font-black text-left leading-none">
                                        <span className="text-[8px] uppercase italic tracking-[0.3em] leading-none mb-1 opacity-60 font-black">HABLAR CON SECRETARÍA</span>
                                        <span className="text-[16px] uppercase leading-none font-black italic tracking-tighter">SOPORTE ACADEMIA</span>
                                    </div>
                                    <MessageCircle size={24} className="group-hover:rotate-12 transition-transform fill-current" />
                                </a>

                                <button 
                                    className="w-full h-18 py-6 bg-gray-50 border border-gray-100 text-slate-900 rounded-2xl flex items-center justify-between px-7 active:scale-95 transition-all group text-left"
                                    onClick={() => window.print()}
                                >
                                    <div className="flex flex-col items-start font-black text-left leading-none">
                                        <span className="text-[8px] uppercase italic tracking-[0.3em] leading-none mb-1 opacity-60 font-black">DESCARGAR FORMATO</span>
                                        <span className="text-[16px] uppercase leading-none font-black italic tracking-tighter">RECIBO DE PAGO</span>
                                    </div>
                                    <Printer size={22} className="group-hover:translate-y-0.5 transition-transform" />
                                </button>
                            </div>
                        </div>
                    )}
                </main>

                <nav className="fixed bottom-0 left-0 right-0 z-[200] px-6 pb-8 bg-gradient-to-t from-gray-50 via-gray-50/90 to-transparent pointer-events-none uppercase">
                    <div className="max-w-xl mx-auto flex items-center justify-between bg-white/95 backdrop-blur-3xl border border-gray-200 p-2 rounded-[2.8rem] shadow-2xl pointer-events-auto w-full">
                        <button onClick={() => setActiveTab('alumno')} className={cn("flex-1 h-14 rounded-[2rem] flex flex-col items-center justify-center gap-0.5 transition-all relative", activeTab === 'alumno' ? "text-white shadow-lg shadow-gray-200" : "text-slate-400")} style={activeTab === 'alumno' ? { backgroundColor: primaryColor } : {}}>
                            <UserCircle2 size={18} />
                            <span className="font-black italic text-[7px] uppercase tracking-widest text-center">ALUMNO</span>
                        </button>
                        <button onClick={() => setActiveTab('curso')} className={cn("flex-1 h-14 rounded-[2rem] flex flex-col items-center justify-center gap-0.5 transition-all relative", activeTab === 'curso' ? "text-white shadow-lg shadow-gray-200" : "text-slate-400")} style={activeTab === 'curso' ? { backgroundColor: primaryColor } : {}}>
                            <LayoutDashboard size={18} />
                            <span className="font-black italic text-[7px] uppercase tracking-widest text-center">CURSO</span>
                        </button>
                        <button onClick={() => setActiveTab('horario')} className={cn("flex-1 h-14 rounded-[2rem] flex flex-col items-center justify-center gap-0.5 transition-all relative", activeTab === 'horario' ? "text-white shadow-lg shadow-gray-200" : "text-slate-400")} style={activeTab === 'horario' ? { backgroundColor: primaryColor } : {}}>
                            <Zap size={18} />
                            <span className="font-black italic text-[7px] uppercase tracking-widest text-center">CLASES</span>
                        </button>
                        <button onClick={() => setActiveTab('gestion')} className={cn("flex-1 h-14 rounded-[2rem] flex flex-col items-center justify-center gap-0.5 transition-all relative", activeTab === 'gestion' ? "text-white shadow-lg shadow-gray-200" : "text-slate-400")} style={activeTab === 'gestion' ? { backgroundColor: primaryColor } : {}}>
                            <Settings size={18} />
                            <span className="font-black italic text-[7px] uppercase tracking-widest text-center">AJUSTES</span>
                        </button>
                    </div>
                </nav>
            </div>

            <style jsx global>{`
                .scroll-hide::-webkit-scrollbar { display: none; }
                .scroll-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
