"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ChevronLeft,
    Phone,
    Loader2,
    CheckCircle2,
    XCircle,
    User,
    Mail,
    Save,
    LogOut,
    Building2,
    CalendarCheck,
    AlertTriangle,
    Info,
    Trophy,
    Activity,
    Award,
    Star,
    Settings,
    ShieldCheck,
    Bell,
    CreditCard,
    ChevronRight,
    MessageCircle,
    Sparkles,
    UserCircle2,
    ArrowRight,
    AlertCircle,
    Key
} from "lucide-react";
import Link from "next/link";
import PhoneInput from "@/components/ui/PhoneInput";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import RatingModal from "@/components/RatingModal";
import { format } from "date-fns";
import { es } from "date-fns/locale";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export default function MiPerfilPage() {
    const params = useParams();
    const slug = params.slug as string;
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [cliente, setCliente] = useState<any>(null);
    const [negocio, setNegocio] = useState<any>(null);

    const [step, setStep] = useState<'phone' | 'otp' | 'profile'>('phone');
    const [telefono, setTelefono] = useState("");
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const [countdown, setCountdown] = useState(0);
    const otpInputRef = useRef<HTMLInputElement>(null);

    const [reservas, setReservas] = useState<any[]>([]);
    const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
    const [ratingTarget, setRatingTarget] = useState<any>(null);

    const [editNombre, setEditNombre] = useState("");
    const [editEmail, setEditEmail] = useState("");
    const [editFechaNacimiento, setEditFechaNacimiento] = useState("");
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const uploadRes = await fetch(`/api/${slug}/perfil/upload`, {
                method: 'POST',
                body: formData
            });

            if (!uploadRes.ok) throw new Error('Error al subir imagen');
            const { url } = await uploadRes.json();

            const updateRes = await fetch(`/api/${slug}/perfil`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imagenUrl: url })
            });

            if (updateRes.ok) {
                setCliente({ ...cliente, imagenUrl: `${url}?v=${Date.now()}` });
            }
        } catch (error) {
            console.error("Error upload:", error);
            alert("No se pudo actualizar la foto");
        } finally {
            setUploading(false);
        }
    };

    useEffect(() => {
        let timer: any;
        if (countdown > 0) {
            timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
        }
        return () => clearInterval(timer);
    }, [countdown]);

    useEffect(() => {
        if (step === 'otp') {
            otpInputRef.current?.focus();
        }
    }, [step]);

    const fetchReservas = async () => {
        try {
            const res = await fetch(`/api/${slug}/reservas-cliente`);
            if (res.ok) {
                const data = await res.json();
                setReservas(data || []);
            }
        } catch (e) {
            console.error("Error fetching client appointments:", e);
        }
    };

    const fetchProfile = async () => {
        try {
            const res = await fetch(`/api/${slug}/perfil`);
            if (res.ok) {
                const data = await res.json();
                
                // Forzar refresco de caché de la imagen al cargar el perfil
                if (data.imagenUrl) {
                    data.imagenUrl = `${data.imagenUrl.split('?')[0]}?v=${Date.now()}`;
                }
                
                setCliente(data);
                setEditNombre(data.nombre || "");
                setEditEmail(data.email || "");
                if (data.fechaNacimiento) {
                    setEditFechaNacimiento(new Date(data.fechaNacimiento).toISOString().split('T')[0]);
                } else {
                    setEditFechaNacimiento("");
                }
                setStep('profile');
                fetchReservas();
            } else {
                setCliente(null);
                setStep('phone');
            }
        } catch (error) {
            console.error("Error al cargar perfil:", error);
            setCliente(null);
            setStep('phone');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editNombre.trim()) {
            setError("El nombre es requerido");
            return;
        }
        setSaving(true);
        setError("");
        try {
            const res = await fetch(`/api/${slug}/perfil`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre: editNombre,
                    email: editEmail || null,
                    fechaNacimiento: editFechaNacimiento ? new Date(editFechaNacimiento).toISOString() : null
                })
            });
            if (res.ok) {
                const data = await res.json();
                setCliente(data.cliente || data);
                setIsEditing(false);
            } else {
                const data = await res.json();
                setError(data.error || "No se pudo actualizar el perfil");
            }
        } catch (e) {
            setError("Error al conectar con el servidor");
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        const fetchBusiness = async () => {
            try {
                const res = await fetch(`/api/public/negocio/${slug}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data) setNegocio(data);
                }
            } catch (e) {
                console.error("Error fetching business info:", e);
            }
        };

        fetchProfile();
        fetchBusiness();
    }, [slug]);

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
                setCountdown(600);
            } else {
                setError(data.error || "No se pudo enviar el código. Verifica tu número.");
            }
        } catch (err) {
            setError("Error de conexión. Intenta de nuevo.");
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
            if (res.ok) {
                await fetchProfile();
            } else {
                const data = await res.json();
                setError(data.error || "Código incorrecto");
                setLoading(false);
            }
        } catch (err) {
            setError("Error de conexión al verificar el código.");
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        if (!confirm("¿Seguro que deseas cerrar tu sesión?")) return;
        try {
            await fetch(`/api/${slug}/auth/logout`, { method: "POST" });
            setCliente(null);
            setReservas([]);
            setStep('phone');
            router.push(`/${slug}`);
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#07090f] flex items-center justify-center">
                <Loader2 className="animate-spin text-emerald-500" size={48} />
            </div>
        );
    }

    const primaryColor = negocio?.colorPrimario || '#ec4899';
    const secondaryColor = negocio?.colorSecundario || '#be185d';
    const neutralColor = negocio?.colorNeutral || '#f8fafc';
    const textColor = negocio?.colorTexto || '#0f172a';

    return (
        <div className="min-h-screen bg-slate-50 font-sans overflow-x-hidden pb-32">

            {/* ── HEADER ── */}
            <header className="sticky top-0 z-[100] bg-white border-b border-slate-100 px-5 py-4">
                <div className="max-w-xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.back()} className="size-9 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center">
                            <ChevronLeft size={18} className="text-slate-600" />
                        </button>
                        <div>
                            <h1 className="text-[16px] font-black text-slate-900 leading-none">Mi Perfil</h1>
                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Gestiona tu cuenta y preferencias</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-xl mx-auto w-full">

                {/* ── LOGIN / OTP ── */}
                {step === 'phone' && (
                    <section className="flex flex-col items-center text-center space-y-6 pt-10 px-6">
                        <h2 className="text-5xl font-black italic uppercase tracking-tighter leading-none" style={{ color: textColor }}>Hola,</h2>
                        <p className="font-black italic tracking-widest text-[11px] uppercase opacity-60" style={{ color: textColor }}>Identifícate para ver tu perfil</p>
                        <div className="w-full bg-white rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 text-left">
                            <div className="flex items-center gap-3 mb-10 justify-center">
                                <div className="size-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${primaryColor}10`, color: primaryColor }}>
                                    <Sparkles size={20} />
                                </div>
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] italic" style={{ color: primaryColor }}>Verificación Segura</span>
                            </div>
                            <form onSubmit={handleSendOtp} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] ml-2 opacity-50" style={{ color: textColor }}>Número Móvil</label>
                                    <PhoneInput value={telefono} onChange={setTelefono} className="w-full" />
                                </div>
                                {error && (
                                    <div className="p-4 bg-rose-50 text-rose-500 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 border border-rose-100">
                                        <AlertCircle size={16} /> {error}
                                    </div>
                                )}
                                <button type="submit" disabled={loading || telefono.length < 8}
                                    className="w-full h-16 text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                    style={{ backgroundColor: primaryColor }}>
                                    {loading ? <Loader2 className="animate-spin" size={24} /> : (<>Continuar <ArrowRight size={20} /></>)}
                                </button>
                            </form>
                        </div>
                    </section>
                )}

                {step === 'otp' && (
                    <div className="relative z-10 flex flex-col items-center py-6 px-6 animate-in fade-in slide-in-from-right-4 duration-700">
                        <div className="w-full max-w-[340px] space-y-10 text-center">
                            <div className="space-y-4">
                                <div className="mx-auto w-16 h-16 rounded-2xl bg-white border border-gray-100 flex items-center justify-center shadow-xl">
                                    <Key size={30} style={{ color: primaryColor }} />
                                </div>
                                <div className="space-y-1">
                                    <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">CÓDIGO</h1>
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Revisa tu WhatsApp</p>
                                </div>
                            </div>
                            <form onSubmit={handleVerifyOtp} className="space-y-10">
                                <div className="relative">
                                    <div className="flex justify-between items-center gap-2">
                                        {[0,1,2,3,4,5].map(idx => {
                                            const char = code[idx] || "";
                                            const isActive = code.length === idx;
                                            return (
                                                <div key={idx}
                                                    className={cn("flex-1 h-16 bg-white border-2 rounded-[1.2rem] flex items-center justify-center text-3xl font-black transition-all duration-300",
                                                        char ? "text-slate-900 shadow-lg" : "bg-gray-50 border-gray-100 text-slate-300", isActive && "border-2")}
                                                    style={{ borderColor: (isActive || char) ? primaryColor : 'transparent' }}>
                                                    {char}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <input ref={otpInputRef} type="text" inputMode="numeric" pattern="[0-9]*" autoFocus maxLength={6}
                                        className="absolute inset-0 opacity-0 cursor-default" value={code}
                                        onChange={e => setCode(e.target.value.replace(/\D/g, ""))} />
                                </div>
                                {error && (
                                    <div className="p-4 bg-rose-50 text-rose-500 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 border border-rose-100">
                                        <AlertCircle size={16} /> {error}
                                    </div>
                                )}
                                <div className="space-y-4">
                                    <button type="submit" disabled={loading || code.length !== 6}
                                        className="w-full h-16 text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                        style={{ backgroundColor: primaryColor }}>
                                        {loading ? <Loader2 className="animate-spin" size={24} /> : (<>Verificar Código <ArrowRight size={20} /></>)}
                                    </button>
                                    <button type="button" onClick={() => setStep('phone')}
                                        className="text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
                                        style={{ color: textColor }}>Atrás</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* ── PROFILE VIEW ── */}
                {step === 'profile' && cliente && (
                    <div className="animate-in fade-in duration-500">

                        {/* Avatar + Info */}
                        <div className="px-5 pt-6 flex items-center gap-4">
                            {/* Avatar circular con gradiente */}
                            <div className="relative shrink-0" onClick={() => document.getElementById('avatar-upload')?.click()}>
                                <div className="size-24 rounded-full p-[3px] cursor-pointer"
                                    style={{ background: `linear-gradient(135deg, ${primaryColor}, #f472b6, ${secondaryColor})` }}>
                                    <div className="size-full rounded-full overflow-hidden bg-white flex items-center justify-center">
                                        {uploading ? (
                                            <Loader2 className="animate-spin" style={{ color: primaryColor }} size={24} />
                                        ) : cliente.imagenUrl ? (
                                            <img src={cliente.imagenUrl} alt={cliente.nombre} className="size-full object-cover" />
                                        ) : (
                                            <span className="text-4xl font-black" style={{ color: primaryColor }}>
                                                {(cliente.nombre || 'U').charAt(0).toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {/* Botón cámara */}
                                <button className="absolute bottom-0 right-0 size-7 rounded-full flex items-center justify-center border-2 border-white shadow-md"
                                    style={{ backgroundColor: primaryColor }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                                </button>
                                <input type="file" id="avatar-upload" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                            </div>

                            {/* Nombre + teléfono + rating */}
                            <div className="flex-1 min-w-0">
                                {/* Badge */}
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-1.5"
                                    style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m2 4 3 12h14l3-12-6 5-4-7-4 7-6-5Z"/></svg>
                                    <span className="text-[9px] font-black uppercase tracking-widest">USUARIO ELITE</span>
                                </div>
                                <h2 className="text-[22px] font-black text-slate-900 leading-tight">{cliente.nombre || 'Usuario'}</h2>
                                <p className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-500 mt-0.5">
                                    <Phone size={12} style={{ color: primaryColor }} />
                                    {cliente.telefono?.startsWith('+') ? cliente.telefono : `+${cliente.telefono || '—'}`}
                                </p>
                                {/* Rating */}
                                {(cliente.ratingPromedio !== undefined && cliente.totalReviews > 0) && (
                                    <div className="flex items-center gap-1 mt-1">
                                        {[1,2,3,4,5].map(s => (
                                            <svg key={s} xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                                                fill={s <= Math.round(cliente.ratingPromedio) ? '#f59e0b' : 'none'}
                                                stroke="#f59e0b" strokeWidth="2">
                                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                                            </svg>
                                        ))}
                                        <span className="text-[11px] font-bold text-slate-500 ml-0.5">
                                            {cliente.ratingPromedio.toFixed(1)} ({cliente.totalReviews} {cliente.totalReviews === 1 ? 'valoración' : 'valoraciones'})
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Stats Card */}
                        <div className="px-5 mt-5">
                            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                                <div className="grid grid-cols-3 divide-x divide-slate-100">
                                    {[
                                        { label: 'Sesiones', sublabel: 'Completadas', value: cliente.stats?.reservasTotales || 0, icon: <Sparkles size={20} /> },
                                        { label: 'Cursos', sublabel: 'Inscritos', value: cliente.enrollments?.length || 0, icon: <Trophy size={20} /> },
                                        { label: 'Nivel', sublabel: 'Cliente Elite', value: 'A+', icon: <Award size={20} /> },
                                    ].map((stat, i) => (
                                        <div key={i} className="flex flex-col items-center py-1 px-2">
                                            <div className="size-10 rounded-2xl flex items-center justify-center mb-2" style={{ backgroundColor: `${primaryColor}12`, color: primaryColor }}>
                                                {stat.icon}
                                            </div>
                                            <span className="text-[26px] font-black text-slate-900 leading-none">{stat.value}</span>
                                            <span className="text-[11px] font-bold text-slate-700 mt-0.5">{stat.label}</span>
                                            <span className="text-[9px] text-slate-400 font-medium">{stat.sublabel}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Banner motivacional */}
                                <div className="mt-4 rounded-2xl px-4 py-3 flex items-center justify-between overflow-hidden relative"
                                    style={{ background: `linear-gradient(135deg, ${primaryColor}15, ${primaryColor}08)` }}>
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="none"><path d="M2.5 3.5a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-11zm2-2a.5.5 0 0 1 0-1h7a.5.5 0 0 1 0 1h-7zM0 13a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 16 13V6a1.5 1.5 0 0 0-1.5-1.5h-13A1.5 1.5 0 0 0 0 6v7zm6.258-9.007a.25.25 0 0 1 .372.274L5.808 8h2.46a.25.25 0 0 1 .184.415l-4.5 4.5a.25.25 0 0 1-.395-.296l1.298-3.573H2.25a.25.25 0 0 1-.184-.415l4.192-4.638z"/></svg>
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-800 text-[13px] leading-tight">
                                                Sigue así, {(cliente.nombre || '').split(' ')[0]}
                                            </p>
                                            <p className="text-[10px] text-slate-500 font-medium">Estás en el nivel más alto</p>
                                            <button className="text-[10px] font-black mt-0.5 flex items-center gap-1" style={{ color: primaryColor }}>
                                                Ver beneficios Elite <ChevronRight size={11} />
                                            </button>
                                        </div>
                                    </div>
                                    {/* Corona decorativa */}
                                    <div className="text-5xl opacity-80 shrink-0">👑</div>
                                </div>
                            </div>
                        </div>

                        {/* Citas por calificar */}
                        {(() => {
                            const citasPorCalificar = reservas.filter((r: any) => {
                                const isCompleted = ['completed','finalizada','finalizado'].includes(r.estado?.toLowerCase());
                                return isCompleted && !r.ratings?.some((rt: any) => rt.raterRole === 'client');
                            });
                            if (!citasPorCalificar.length) return null;
                            return (
                                <div className="px-5 mt-5 space-y-3">
                                    <p className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: primaryColor }}>
                                        <Sparkles size={12} /> Califica tu experiencia
                                    </p>
                                    {citasPorCalificar.map((r: any) => (
                                        <div key={r.id} className="bg-white rounded-2xl p-4 border border-amber-100 flex items-center justify-between shadow-sm">
                                            <div>
                                                <span className="text-[9px] font-black px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full border border-amber-100 uppercase tracking-wider">Pendiente</span>
                                                <p className="font-black text-slate-800 text-[13px] mt-1">{r.service?.nombre || 'Servicio'}</p>
                                                <p className="text-[10px] text-slate-400 font-medium">{r.horaInicio} · con {r.staff?.name || 'especialista'}</p>
                                            </div>
                                            <button onClick={() => { setRatingTarget(r); setIsRatingModalOpen(true); }}
                                                className="px-4 py-2.5 rounded-xl text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition-all"
                                                style={{ backgroundColor: primaryColor }}>
                                                Calificar <Star size={11} fill="white" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}

                        {/* Sección de Información Personal */}
                        <div className="px-5 mt-5">
                            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-[14px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                        <User size={18} style={{ color: primaryColor }} />
                                        Información Personal
                                    </h3>
                                    {!isEditing && (
                                        <button
                                            onClick={() => { setIsEditing(true); setError(''); }}
                                            className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border active:scale-95 transition-all"
                                            style={{ borderColor: primaryColor, color: primaryColor }}
                                        >
                                            Editar
                                        </button>
                                    )}
                                </div>

                                {/* Vista de solo lectura */}
                                {!isEditing && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 py-2.5 border-b border-slate-100">
                                            <div className="size-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${primaryColor}12` }}>
                                                <User size={14} style={{ color: primaryColor }} />
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nombre</p>
                                                <p className="text-[13px] font-black text-slate-800">{cliente.nombre || '—'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 py-2.5 border-b border-slate-100">
                                            <div className="size-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${primaryColor}12` }}>
                                                <Mail size={14} style={{ color: primaryColor }} />
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Correo</p>
                                                <p className="text-[13px] font-black text-slate-800">{cliente.email || '—'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 py-2.5 border-b border-slate-100">
                                            <div className="size-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${primaryColor}12` }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha de Nacimiento</p>
                                                <p className="text-[13px] font-black text-slate-800">
                                                    {cliente.fechaNacimiento
                                                        ? format(new Date(cliente.fechaNacimiento), "d 'de' MMMM, yyyy", { locale: es })
                                                        : '—'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 py-2.5">
                                            <div className="size-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${primaryColor}12` }}>
                                                <Phone size={14} style={{ color: primaryColor }} />
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Teléfono</p>
                                                <p className="text-[13px] font-black text-slate-800">{cliente.telefono?.startsWith('+') ? cliente.telefono : `+${cliente.telefono || '—'}`}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Formulario de edición */}
                                {isEditing && (
                                    <form onSubmit={handleSaveProfile} className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                        {/* Campo Nombre */}
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Nombre Completo</label>
                                            <input
                                                type="text"
                                                value={editNombre}
                                                onChange={(e) => setEditNombre(e.target.value)}
                                                placeholder="Ingresa tu nombre"
                                                className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-200"
                                                required
                                            />
                                        </div>

                                        {/* Campo Correo */}
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Correo Electrónico</label>
                                            <input
                                                type="email"
                                                value={editEmail}
                                                onChange={(e) => setEditEmail(e.target.value)}
                                                placeholder="correo@ejemplo.com"
                                                className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-200"
                                            />
                                        </div>

                                        {/* Campo Fecha de Nacimiento */}
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Fecha de Nacimiento</label>
                                            <input
                                                type="date"
                                                value={editFechaNacimiento}
                                                onChange={(e) => setEditFechaNacimiento(e.target.value)}
                                                className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-xs font-bold text-slate-800 focus:outline-none focus:border-slate-200"
                                            />
                                        </div>

                                        {/* Campo Teléfono (No editable) */}
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between ml-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Teléfono Móvil</label>
                                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                                    No editable
                                                </span>
                                            </div>
                                            <input
                                                type="text"
                                                value={cliente.telefono?.startsWith('+') ? cliente.telefono : `+${cliente.telefono || '—'}`}
                                                disabled
                                                className="w-full h-12 bg-slate-100/80 border border-slate-100 rounded-xl px-4 text-xs font-bold text-slate-400 cursor-not-allowed select-none"
                                            />
                                        </div>

                                        {error && (
                                            <div className="p-3.5 bg-rose-50 text-rose-500 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2.5 border border-rose-100">
                                                <AlertCircle size={14} /> {error}
                                            </div>
                                        )}

                                        <div className="flex gap-3 mt-2">
                                            <button
                                                type="button"
                                                onClick={() => { setIsEditing(false); setError(''); }}
                                                className="flex-1 h-12 font-black text-[11px] uppercase tracking-widest rounded-xl border border-slate-200 text-slate-500 active:scale-95 transition-all"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={saving}
                                                className="flex-1 h-12 text-white font-black text-[11px] uppercase tracking-widest rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                                                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
                                            >
                                                {saving ? <Loader2 className="animate-spin" size={16} /> : <>Guardar</>}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>

                        {/* Panel Instructor (si aplica) */}
                        {cliente.roles?.includes('PROFESOR') && (
                            <div className="px-5 mt-3">
                                <Link href="/profesor"
                                    className="flex items-center justify-between px-5 py-4 bg-white rounded-2xl border border-slate-100 shadow-sm active:scale-[0.99] transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${primaryColor}10`, color: primaryColor }}>
                                            <Building2 size={20} />
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-800 text-[13px]">Panel Instructor</p>
                                            <p className="text-[10px] text-slate-400 font-medium">Gestión de academia</p>
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        )}

                        {/* Cerrar Sesión */}
                        <div className="px-5 mt-3 mb-8">
                            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                                <button onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-5 py-4 hover:bg-rose-50 active:bg-rose-100 transition-colors">
                                    <div className="size-10 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 border border-rose-100">
                                        <LogOut size={20} />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-black text-rose-500 text-[13px]">Cerrar sesión</p>
                                        <p className="text-[10px] text-slate-400 font-medium">Desconectar cuenta</p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </main>

            {/* Modal de Calificación */}
            <RatingModal
                isOpen={isRatingModalOpen}
                onClose={() => setIsRatingModalOpen(false)}
                appointmentId={ratingTarget?.id}
                raterRole="client"
                targetName={ratingTarget?.staff?.name || ratingTarget?.Staff?.name || 'el especialista'}
                onSuccess={() => { fetchReservas(); }}
            />

            <style jsx global>{`
                .scroll-hide::-webkit-scrollbar { display: none; }
                .scroll-hide { -ms-overflow-style: none; scrollbar-width: none; }
                input::placeholder { color: #334155 !important; font-style: italic; font-weight: 800; text-transform: uppercase; font-size: 10px; letter-spacing: 0.1em; }
            `}</style>
        </div>
    );
}
