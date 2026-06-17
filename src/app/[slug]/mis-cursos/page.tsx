"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
    GraduationCap, 
    ChevronLeft, 
    Calendar, 
    Clock, 
    User, 
    ArrowRight, 
    Trophy,
    Search,
    Loader2,
    MessageCircle,
    Phone,
    Key,
    XCircle,
    Info,
    CalendarPlus
} from "lucide-react";
import Link from "next/link";
import PhoneInput from "@/components/ui/PhoneInput";

export default function MisCursosPage() {
    const params = useParams();
    const slug = params.slug as string;
    const router = useRouter();

    const [step, setStep] = useState<'phone' | 'otp' | 'listing'>('phone');
    const [telefono, setTelefono] = useState("");
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [countdown, setCountdown] = useState(0);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [negocio, setNegocio] = useState<any>(null);

    useEffect(() => {
        // Intentar autologin si ya hay sesión
        const checkSession = async () => {
            try {
                const res = await fetch(`/api/${slug}/perfil`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.enrollments) {
                        setEnrollments(data.enrollments);
                        setTelefono(data.telefono || "");
                        setStep('listing');
                    }
                }
            } catch (e) {
                console.error("Session check error:", e);
            }
        };

        const fetchBusiness = async () => {
            try {
                const res = await fetch(`/api/public/negocio/${slug}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data) {
                        setNegocio(data);
                    }
                }
            } catch (e) {
                console.error("Error fetching business info:", e);
            }
        };

        checkSession();
        fetchBusiness();
    }, [slug]);

    useEffect(() => {
        let timer: any;
        if (countdown > 0) {
            timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
        }
        return () => clearInterval(timer);
    }, [countdown]);

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await fetch(`/api/${slug}/otp/send`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ telefono }),
            });
            const data = await res.json();
            if (res.ok) {
                setStep('otp');
                setCountdown(300);
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError("Error de conexión.");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await fetch(`/api/${slug}/otp/verify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ telefono, code }),
            });
            const data = await res.json();
            if (res.ok) {
                if (data.redirectTo) {
                    router.push(data.redirectTo);
                } else {
                    fetchCursos();
                }
            } else {
                setError(data.error);
                setLoading(false);
            }
        } catch (err) {
            setError("Error de conexión.");
            setLoading(false);
        }
    };

    const fetchCursos = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/${slug}/perfil`);
            const data = await res.json();
            if (res.ok && data.enrollments) {
                setEnrollments(data.enrollments);
                setStep('listing');
            } else {
                setStep('phone');
                setError("No se pudieron cargar tus cursos.");
            }
        } catch (err) {
            setError("Error al cargar historial.");
        } finally {
            setLoading(false);
        }
    };

    const getStatusStyle = (s: string) => {
        switch (s.toLowerCase()) {
            case 'approved': return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30';
            case 'pending': return 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border-amber-200 dark:border-amber-500/30';
            case 'rejected': return 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border-rose-200 dark:border-rose-500/30';
            default: return 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200 dark:border-blue-500/30';
        }
    };

    const getStatusLabel = (s: string) => {
        switch (s.toLowerCase()) {
            case 'approved': return 'Confirmado';
            case 'pending': return 'Pendiente';
            case 'rejected': return 'Cancelado';
            default: return 'Lista de espera';
        }
    };

    // Ordenar cursos: Confirmados, Pendientes, otros
    const sortedEnrollments = [...enrollments].sort((a, b) => {
        const order: any = { approved: 0, pending: 1, waiting: 2, rejected: 3 };
        return order[a.status] - order[b.status];
    });

    return (
        <div className="min-h-screen bg-[#f8faf9] dark:bg-[#0c140f] text-slate-900 dark:text-slate-100">
            {/* Header navigation - ULTRA GLASS */}
            <header className="fixed top-0 left-0 right-0 z-[100] backdrop-blur-2xl border-b border-white/5 h-20 flex items-center bg-slate-950/80">
                <div className="max-w-4xl mx-auto w-full px-6 flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <Link
                            href={`/${slug}`}
                            className="size-12 rounded-2xl bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-all border border-white/10 hover:border-white/20 active:scale-90"
                        >
                            <ChevronLeft size={24} strokeWidth={2.5} />
                        </Link>
                        <div className="space-y-0.5">
                            <p className="text-white/40 text-[9px] font-black uppercase tracking-[0.3em] leading-none">{negocio?.nombre || 'Complex'}</p>
                            <h1 className="text-white font-black text-xl tracking-tighter uppercase leading-none truncate max-w-[180px] md:max-w-xs">Mis Cursos</h1>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        {negocio?.logoUrl ? (
                            <img src={negocio.logoUrl} alt={negocio.nombre} className="h-10 w-10 rounded-xl object-contain border border-white/10 shadow-lg" />
                        ) : (
                            <Trophy size={20} className="text-emerald-500" />
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 pt-32 pb-12">
                {step === 'phone' && (
                    <div className="max-w-md mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="text-center space-y-3">
                            <div className="inline-flex p-4 rounded-3xl bg-blue-50 text-blue-500 dark:bg-blue-500/10 mb-2">
                                <GraduationCap size={32} />
                            </div>
                            <h1 className="text-3xl font-black tracking-tight leading-none uppercase">Mis Cursos</h1>
                            <p className="text-slate-500 font-medium italic">Ingresa tu número para ver tus inscripciones activas.</p>
                        </div>

                        <form onSubmit={handleSendOtp} className="space-y-4">
                            <PhoneInput
                                value={telefono}
                                onChange={(val) => setTelefono(val)}
                                placeholder="Número de teléfono"
                                className="w-full text-lg"
                            />

                            {error && (
                                <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl text-sm font-bold flex items-center gap-2 border border-rose-100 animate-shake">
                                    <XCircle size={16} />
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-blue-500/20 uppercase tracking-widest text-sm flex items-center justify-center gap-3 active:scale-95"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <><MessageCircle size={18} /> Continuar por WhatsApp</>}
                            </button>
                        </form>
                    </div>
                )}

                {step === 'otp' && (
                    <div className="max-w-md mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="text-center space-y-3">
                            <div className="inline-flex p-4 rounded-3xl bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10 mb-2">
                                <Key size={32} />
                            </div>
                            <h1 className="text-3xl font-black tracking-tight leading-none uppercase">Verificar Código</h1>
                            <p className="text-slate-500 font-medium">Te enviamos el código al <span className="text-blue-600">+{telefono}</span></p>
                        </div>

                        <form onSubmit={handleVerifyOtp} className="space-y-6">
                            <input
                                type="text"
                                required
                                maxLength={6}
                                placeholder="000000"
                                className="w-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-5 font-black text-3xl tracking-[0.5em] text-center focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                            />

                            {countdown > 0 ? (
                                <p className="text-center text-slate-400 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                                    <Clock size={14} /> El código expira en {Math.floor(countdown/60)}:{(countdown%60).toString().padStart(2, '0')}
                                </p>
                            ) : (
                                <button type="button" onClick={handleSendOtp} className="w-full text-indigo-500 font-black text-xs uppercase tracking-widest">Reenviar código</button>
                            )}

                            {error && <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl text-sm font-bold border border-rose-100">{error}</div>}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-slate-900 dark:bg-blue-600 text-white font-black py-5 rounded-2xl uppercase tracking-widest text-sm flex items-center justify-center gap-3 active:scale-95"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : "Ver mis cursos"}
                            </button>
                        </form>
                        <button onClick={() => setStep('phone')} className="w-full text-slate-400 font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                            <ChevronLeft size={14} /> Cambiar teléfono
                        </button>
                    </div>
                )}

                {step === 'listing' && (
                    <div className="space-y-10 animate-in fade-in duration-700">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div>
                                <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">Mi Panel de Alumno</h1>
                                <p className="text-slate-500 font-medium mt-2">Aquí puedes ver y gestionar tus inscripciones académicas.</p>
                            </div>
                            <div className="flex flex-col items-start md:items-end">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sesión: +{telefono}</span>
                                <button 
                                    onClick={async () => {
                                        await fetch(`/api/${slug}/auth/logout`, { method: "POST" });
                                        router.replace(`/${slug}`);
                                    }}
                                    className="text-[10px] font-black text-rose-400 hover:text-rose-600 uppercase tracking-widest mt-1"
                                >
                                    Cerrar Sesión
                                </button>
                            </div>
                        </div>

                        {sortedEnrollments.length > 0 ? (
                            <div className="grid gap-6">
                                {sortedEnrollments.map((enrollment: any) => (
                                    <Link 
                                        key={enrollment.id}
                                        href={`/${slug}/mi-curso/${enrollment.id}`}
                                        className="group bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:scale-[1.01] hover:border-blue-500/20 transition-all duration-300 overflow-hidden block"
                                    >
                                        <div className="p-8">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                                <div className="flex items-center gap-6">
                                                    <div className="size-20 rounded-3xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 border border-blue-100 dark:border-blue-500/20 group-hover:scale-110 transition-transform">
                                                        <Trophy size={36} />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-3">
                                                            <h3 className="font-black text-xl text-slate-900 dark:text-white uppercase leading-none">{enrollment.course.name}</h3>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-4 mt-2">
                                                            <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold uppercase tracking-tight">
                                                                <User size={14} className="text-blue-500" /> Alumno: <span className="text-slate-600 dark:text-slate-300">{enrollment.student_name}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold uppercase tracking-tight">
                                                                <Calendar size={14} className="text-blue-500" /> Inicio: <span className="text-slate-600 dark:text-slate-300">{enrollment.course.start_date ? new Date(enrollment.course.start_date).toLocaleDateString() : 'A confirmar'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between md:justify-end gap-6 pt-4 md:pt-0 border-t md:border-none border-slate-50">
                                                    <div className="text-right flex flex-col items-end gap-2">
                                                        <span className={`px-4 py-2 rounded-xl text-[10px] font-black border uppercase tracking-widest shadow-sm ${getStatusStyle(enrollment.status)}`}>
                                                            {getStatusLabel(enrollment.status)}
                                                        </span>
                                                        <div className="flex items-center gap-1 text-[10px] font-black text-blue-600 uppercase tracking-widest">
                                                            Ver Detalles <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Detalles rápidos inferiores */}
                                            <div className="mt-6 pt-6 border-t border-slate-50 dark:border-white/5 grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Horario</p>
                                                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                                                        <Clock size={12} /> {enrollment.course.schedules?.[0] ? `${enrollment.course.schedules[0].start_time} - ${enrollment.course.schedules[0].end_time}` : 'A definir'}
                                                    </p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Instructor</p>
                                                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300">{enrollment.course.coach || 'Por asignar'}</p>
                                                </div>
                                                <div className="space-y-1 hidden md:block">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID Registro</p>
                                                    <p className="text-xs font-bold text-slate-500">#{enrollment.id.slice(-6).toUpperCase()}</p>
                                                </div>
                                                <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                     <a 
                                                        href={`https://wa.me/${enrollment.businessPhone || ''}?text=${encodeURIComponent(`Hola, tengo una pregunta sobre mi inscripción al curso *${enrollment.course.name}*.\nID: INS-${enrollment.id.slice(-6).toUpperCase()}`)}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="size-10 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 hover:text-emerald-500 transition-colors border border-slate-100 dark:border-white/5"
                                                     >
                                                        <MessageCircle size={20} />
                                                     </a>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-20 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-500">
                                <div className="inline-flex p-6 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-300 mb-6">
                                    <Search size={64} />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase leading-none">Todavía no estás inscrito</h3>
                                <p className="text-slate-400 font-medium max-w-xs mx-auto mt-4 italic">Explora nuestra oferta académica y comienza tu formación hoy mismo.</p>
                                <Link href={`/${slug}`} className="inline-flex items-center gap-3 mt-10 bg-blue-600 text-white font-black py-5 px-10 rounded-2xl uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95">
                                    Explorar Cursos <ArrowRight size={18} />
                                </Link>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
