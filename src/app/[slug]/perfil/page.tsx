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
                setCliente({ ...cliente, imagenUrl: url });
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

    const fetchProfile = async () => {
        try {
            const res = await fetch(`/api/${slug}/perfil`);
            if (res.ok) {
                const data = await res.json();
                setCliente(data);
                setStep('profile');
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

    const primaryColor = negocio?.colorPrimario || '#10b981';
    const secondaryColor = negocio?.colorSecundario || '#112117';
    const neutralColor = negocio?.colorNeutral || '#f8fafc';
    const textColor = negocio?.colorTexto || '#0f172a';
    const tertiaryColor = negocio?.colorTerciario || '#f0fdf4';

    return (
        <div 
            className="min-h-screen font-sans selection:bg-emerald-500/30 overflow-x-hidden pb-40 text-left transition-colors duration-500"
            style={{ backgroundColor: neutralColor, color: textColor }}
        >
            {/* Header when not logged in */}
            {step !== 'profile' && (
                <header 
                    className="fixed top-0 left-0 right-0 z-[100] backdrop-blur-xl border-b h-16 flex items-center px-6 transition-all"
                    style={{ 
                        backgroundColor: `${neutralColor}CC`, 
                        borderColor: `${textColor}10` 
                    }}
                >
                    <div className="max-w-xl mx-auto w-full flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => router.push(`/${slug}`)} 
                                className="size-10 rounded-2xl flex items-center justify-center border active:scale-95 transition-all"
                                style={{ backgroundColor: `${textColor}05`, borderColor: `${textColor}10` }}
                            >
                                <ChevronLeft size={20} style={{ color: textColor }} className="opacity-60" />
                            </button>
                            <h1 
                                className="text-[10px] font-black uppercase italic tracking-[0.2em] leading-none"
                                style={{ color: textColor }}
                            >
                                Iniciar Sesión
                            </h1>
                        </div>
                    </div>
                </header>
            )}

            {/* Header when logged in */}
            {step === 'profile' && (
                <header 
                    className="fixed top-0 left-0 right-0 z-[100] backdrop-blur-xl border-b h-16 flex items-center px-6 transition-all"
                    style={{ 
                        backgroundColor: `${neutralColor}CC`, 
                        borderColor: `${textColor}10` 
                    }}
                >
                    <div className="max-w-xl mx-auto w-full flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => router.back()} 
                                className="size-10 rounded-2xl flex items-center justify-center border active:scale-95 transition-all"
                                style={{ backgroundColor: `${textColor}05`, borderColor: `${textColor}10` }}
                            >
                                <ChevronLeft size={20} style={{ color: textColor }} className="opacity-60" />
                            </button>
                            <h1 
                                className="text-[10px] font-black uppercase italic tracking-[0.2em] leading-none"
                                style={{ color: textColor }}
                            >
                                Mi Perfil
                            </h1>
                        </div>
                    </div>
                </header>
            )}

            <main className="max-w-xl mx-auto px-6 pt-24 space-y-12 animate-in fade-in duration-700 text-left">
                {step === 'phone' && (
                    <section className="flex flex-col items-center text-center space-y-6 pt-10">
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
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <PhoneInput 
                                                value={telefono} 
                                                onChange={setTelefono}
                                                className="w-full"
                                            />
                                        </div>
                                    </div>
                                </div>

                                 {error && (
                                    <div className="p-4 bg-rose-50 text-rose-500 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 border border-rose-100 animate-in fade-in slide-in-from-top-2">
                                        <AlertCircle size={16} /> {error}
                                    </div>
                                )}

                                <button 
                                    type="submit"
                                    disabled={loading || telefono.length < 8}
                                    className="w-full h-16 text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    {loading ? <Loader2 className="animate-spin" size={24} /> : (
                                        <>Continuar <ArrowRight size={20} /></>
                                    )}
                                </button>
                            </form>
                        </div>
                    </section>
                )}

                {step === 'otp' && (
                    <div className="relative z-10 flex flex-col items-center py-6 animate-in fade-in slide-in-from-right-4 duration-700 w-full">
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

                            <form onSubmit={handleVerifyOtp} className="space-y-16">
                                <div className="relative">
                                    <div className="flex justify-between items-center gap-2">
                                        {[0, 1, 2, 3, 4, 5].map((idx) => {
                                            const char = code[idx] || "";
                                            const isActive = code.length === idx;
                                            return (
                                                <div 
                                                    key={idx} 
                                                    className={cn(
                                                        "flex-1 h-16 bg-white border-2 rounded-[1.2rem] flex items-center justify-center text-3xl font-black transition-all duration-300", 
                                                        char ? "text-slate-900 shadow-lg shadow-gray-200" : "bg-gray-50 border-gray-100 text-slate-300", 
                                                        isActive && "border-2"
                                                    )}
                                                    style={{ 
                                                        borderColor: (isActive || char) ? primaryColor : 'transparent'
                                                    }}
                                                >
                                                    {char}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <input 
                                        ref={otpInputRef} 
                                        type="text" 
                                        inputMode="numeric" 
                                        pattern="[0-9]*" 
                                        autoFocus 
                                        maxLength={6} 
                                        className="absolute inset-0 opacity-0 cursor-default" 
                                        value={code} 
                                        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} 
                                    />
                                </div>

                                {error && (
                                    <div className="p-4 bg-rose-50 text-rose-500 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 border border-rose-100">
                                        <AlertCircle size={16} /> {error}
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <button 
                                        type="submit"
                                        disabled={loading || code.length !== 6}
                                        className="w-full h-16 text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        {loading ? <Loader2 className="animate-spin" size={24} /> : (
                                            <>Verificar Código <ArrowRight size={20} /></>
                                        )}
                                    </button>
                                    
                                    <button 
                                        type="button"
                                        onClick={() => setStep('phone')}
                                        className="text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
                                        style={{ color: textColor }}
                                    >
                                        Atrás
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {step === 'profile' && cliente && (
                    <>
                        {/* 👑 VIP PROFILE SECTION */}
                        <section className="flex flex-col items-center text-center space-y-6 pt-4">
                            <div className="relative group cursor-pointer" onClick={() => document.getElementById('avatar-upload')?.click()}>
                                <div 
                                    className={cn(
                                        "size-36 rounded-[3.2rem] p-[3px] shadow-2xl rotate-3 group-hover:rotate-0 transition-all duration-500",
                                        uploading && "animate-pulse"
                                    )}
                                    style={{ 
                                        background: `linear-gradient(to top right, ${primaryColor}, ${secondaryColor})`,
                                        boxShadow: `0 20px 40px ${primaryColor}20`
                                    }}
                                >
                                    <div 
                                        className="size-full rounded-[3rem] flex items-center justify-center overflow-hidden relative"
                                        style={{ backgroundColor: neutralColor }}
                                    >
                                        {uploading ? (
                                            <Loader2 className="animate-spin" style={{ color: primaryColor }} size={32} />
                                        ) : cliente.imagenUrl ? (
                                            <img 
                                                src={cliente.imagenUrl} 
                                                alt={cliente.nombre} 
                                                className="size-full object-cover transition-transform group-hover:scale-110 duration-500" 
                                            />
                                        ) : cliente.nombre ? (
                                            <span 
                                                className="text-5xl font-black italic tracking-tighter"
                                                style={{ color: primaryColor }}
                                            >
                                                {cliente.nombre.charAt(0).toUpperCase()}
                                            </span>
                                        ) : (
                                            <UserCircle2 size={72} className="opacity-10" style={{ color: textColor }} />
                                        )}
                                        
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Cambiar</span>
                                        </div>
                                    </div>
                                </div>
                                <div 
                                    className="absolute -bottom-2 -right-2 p-2.5 rounded-2xl shadow-xl border-4 animate-bounce"
                                    style={{ backgroundColor: primaryColor, color: neutralColor, borderColor: neutralColor }}
                                >
                                    <Award size={22} strokeWidth={3} />
                                </div>
                                <input 
                                    type="file" 
                                    id="avatar-upload" 
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    disabled={uploading}
                                />
                            </div>

                            <div className="space-y-1 flex flex-col items-center">
                                <div 
                                    className="flex items-center gap-2 px-5 py-2 rounded-full border mb-3 shadow-sm"
                                    style={{ 
                                        backgroundColor: `${primaryColor}10`, 
                                        borderColor: `${primaryColor}20` 
                                    }}
                                >
                                    <Star size={14} style={{ color: primaryColor, fill: primaryColor }} />
                                    <span 
                                        className="text-[11px] font-black uppercase tracking-widest italic"
                                        style={{ color: primaryColor }}
                                    >
                                        USUARIO ELITE
                                    </span>
                                </div>
                                <h2 className="text-5xl font-black italic uppercase tracking-tighter leading-none" style={{ color: textColor }}>{cliente.nombre || 'Usuario'}</h2>
                                <p className="font-black italic tracking-widest text-[12px] flex items-center gap-3 mt-2 opacity-50" style={{ color: textColor }}>
                                    <Phone size={14} style={{ color: primaryColor }} /> 
                                    <span>{cliente.telefono?.startsWith('+') ? cliente.telefono : `+${cliente.telefono || '—'}`}</span>
                                </p>
                            </div>
                        </section>

                        {/* 📊 VIP SPA STATS */}
                        <section className="grid grid-cols-3 gap-4">
                            {[
                                { label: 'Sesiones', value: cliente.stats?.reservasTotales || 0, icon: Sparkles, color: primaryColor },
                                { label: 'Cursos', value: cliente.enrollments?.length || 0, icon: Trophy, color: secondaryColor },
                                { label: 'Nivel', value: 'A+', icon: Award, color: '#f59e0b' }
                            ].map((stat, i) => (
                                <div 
                                    key={i}
                                    className="border p-6 rounded-[2.2rem] flex flex-col items-center justify-center gap-3 shadow-xl hover:scale-105 transition-transform group overflow-hidden relative"
                                    style={{ backgroundColor: `${textColor}05`, borderColor: `${textColor}10` }}
                                >
                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: `${stat.color}05` }} />
                                    <div 
                                        className="size-11 rounded-2xl flex items-center justify-center mb-1 border"
                                        style={{ backgroundColor: `${stat.color}10`, color: stat.color, borderColor: `${stat.color}10` }}
                                    >
                                        <stat.icon size={20} />
                                    </div>
                                    <span className="text-3xl font-black italic tracking-tighter leading-none" style={{ color: textColor }}>{stat.value}</span>
                                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-center leading-none italic opacity-30" style={{ color: textColor }}>{stat.label}</span>
                                </div>
                            ))}
                        </section>

                        {/* 🚀 MINIMAL TOOLS SECTION */}
                        <section className="space-y-4 pt-4 uppercase">
                            <div 
                                className="border rounded-[2.5rem] overflow-hidden p-3 shadow-2xl"
                                style={{ backgroundColor: `${textColor}03`, borderColor: `${textColor}08` }}
                            >
                                {cliente.roles?.includes('PROFESOR') && (
                                    <Link href="/profesor" className="flex items-center justify-between p-7 hover:bg-white/5 rounded-[2.2rem] transition-all group border border-transparent hover:border-white/5 mb-2 uppercase">
                                        <div className="flex items-center gap-5 uppercase">
                                            <div 
                                                className="size-14 rounded-2xl flex items-center justify-center border group-hover:text-white transition-all duration-300 shadow-lg uppercase"
                                                style={{ backgroundColor: `${primaryColor}10`, color: primaryColor, borderColor: `${primaryColor}10` }}
                                            >
                                                <Building2 size={24} />
                                            </div>
                                            <div className="text-left leading-none uppercase">
                                                <span className="block text-base font-black italic tracking-tight uppercase" style={{ color: textColor }}>PANEL INSTRUCTOR</span>
                                                <span className="text-[9px] font-black uppercase tracking-[0.1em] mt-1 block italic leading-none opacity-20" style={{ color: textColor }}>Gestión de academia</span>
                                            </div>
                                        </div>
                                        <ChevronRight size={22} className="opacity-20 group-hover:opacity-100 group-hover:translate-x-1.5 transition-all" style={{ color: primaryColor }} />
                                    </Link>
                                )}
                                <button onClick={handleLogout} className="w-full flex items-center justify-between p-7 hover:bg-rose-500/5 rounded-[2.2rem] transition-all group border border-transparent hover:border-rose-500/5 uppercase">
                                    <div className="flex items-center gap-5 uppercase">
                                        <div className="size-14 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/10 group-hover:bg-rose-500 group-hover:text-white transition-all duration-300 shadow-lg shadow-rose-500/10 uppercase"><LogOut size={24} /></div>
                                        <div className="text-left leading-none uppercase">
                                            <span className="block text-base font-black text-rose-500 italic tracking-tight uppercase">CERRAR SESIÓN</span>
                                            <span className="text-[9px] font-black uppercase tracking-[0.1em] mt-1 block italic leading-none opacity-20" style={{ color: textColor }}>Desconectar cuenta</span>
                                        </div>
                                    </div>
                                    <ChevronRight size={22} className="opacity-20 group-hover:text-rose-500 group-hover:translate-x-1.5 transition-all" />
                                </button>
                            </div>
                        </section>

                        <div className="pt-10 flex flex-col items-center opacity-10">
                            <span className="text-[9px] font-black tracking-[1.5em] italic uppercase whitespace-nowrap" style={{ color: textColor }}>SPA BIENESTAR</span>
                            <span className="text-[8px] font-black uppercase mt-1 italic leading-none" style={{ color: textColor }}>PLATFORM v3.0</span>
                        </div>
                    </>
                )}
            </main>

            <style jsx global>{`
                .scroll-hide::-webkit-scrollbar { display: none; }
                .scroll-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
