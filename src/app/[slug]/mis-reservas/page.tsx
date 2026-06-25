"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
    Calendar,
    ChevronLeft,
    Phone,
    Key,
    Loader2,
    Clock,
    CheckCircle2,
    XCircle,
    ArrowRight,
    Trophy,
    MessageCircle,
    Users,
    Settings,
    X,
    Search,
    Plus,
    MapPin,
    Hash,
    ExternalLink,
    AlertCircle,
    Copy,
    Navigation,
    Share2,
    Zap,
    Sparkles
} from "lucide-react";
import Link from "next/link";
import PhoneInput from "@/components/ui/PhoneInput";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import CheckInCard from "@/components/client/CheckInCard";
import RatingModal from "@/components/RatingModal";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

type TabType = 'reservas' | 'cursos';
type FilterType = 'proximas' | 'pasadas';

export default function MisReservasPage() {
    const params = useParams();
    const slug = params.slug as string;
    const router = useRouter();
    const searchParams = useSearchParams();

    const [step, setStep] = useState<'phone' | 'otp' | 'history'>('phone');
    const [verifyingSession, setVerifyingSession] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('reservas');
    const [filter, setFilter] = useState<FilterType>('proximas');
    
    // Efecto para manejar el cambio de pestaña vía URL
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab === 'academia' || tab === 'cursos') {
            setActiveTab('cursos');
        } else {
            setActiveTab('reservas');
        }
    }, [searchParams]);
    
    const [telefono, setTelefono] = useState("");
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [countdown, setCountdown] = useState(0);
    const [reservas, setReservas] = useState<any[]>([]);
    const [cliente, setCliente] = useState<any>(null);
    const [negocio, setNegocio] = useState<any>(null);
    const [pendingModal, setPendingModal] = useState<any>(null);
    
    const otpInputRef = useRef<HTMLInputElement>(null);

    const { proximas, pasadas, resMasCercana, otrasProximas } = useMemo(() => {
        const now = new Date();
        // Fecha de hoy en formato local YYYY-MM-DD
        const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

        const prox: any[] = [];
        const past: any[] = [];

        reservas.forEach(res => {
            const isInvalidStatus = ['cancelled', 'rejected', 'expired', 'cancelada', 'rechazada', 'expirada', 'rechazado', 'cancelado', 'completed', 'finalizada', 'finalizado'].includes(res.estado?.toLowerCase() || '');
            if (isInvalidStatus) { past.push(res); return; }

            // Extraer solo la parte YYYY-MM-DD de forma robusta
            let dateStr = '';
            if (typeof res.fecha === 'string') {
                // Puede venir como "2026-04-28T..." o "2026-04-28 ..." o "1745827200000" (timestamp)
                if (res.fecha.includes('-')) {
                    dateStr = res.fecha.substring(0, 10); // Tomar YYYY-MM-DD
                } else if (!isNaN(Number(res.fecha))) {
                    dateStr = new Date(Number(res.fecha)).toLocaleDateString('sv'); // sv = formato ISO local
                }
            } else if (typeof res.fecha === 'number') {
                dateStr = new Date(res.fecha).toLocaleDateString('sv');
            } else if (res.fecha instanceof Date) {
                dateStr = res.fecha.toLocaleDateString('sv');
            }

            if (!dateStr) { past.push(res); return; }

            const horaFin = res.horaFin || res.horaInicio || '23:59';

            // Construir fecha/hora de fin como tiempo local
            const endTime = new Date(`${dateStr}T${horaFin}:00`);

            // Si la fecha es claramente anterior a hoy → pasada
            if (dateStr < todayStr) {
                past.push(res);
            } else if (dateStr > todayStr) {
                // Fecha futura → próxima
                prox.push(res);
            } else {
                // Mismo día: comparar hora de fin con ahora (+15 min de gracia)
                const isFuture = endTime.getTime() > (now.getTime() - 15 * 60 * 1000);
                isFuture ? prox.push(res) : past.push(res);
            }
        });

        const sortedProx = [...prox].sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
        const sortedPast = [...past].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));

        return {
            proximas: sortedProx,
            pasadas: sortedPast,
            resMasCercana: sortedProx[0] || null,
            otrasProximas: sortedProx.slice(1)
        };
    }, [reservas]);
    
    // Efecto para abrir automáticamente el detalle de una reserva vía URL
    useEffect(() => {
        const reservaId = searchParams.get('reservaId');
        if (reservaId && reservas.length > 0) {
            const res = reservas.find(r => r.id === reservaId);
            if (res) handleManageReserva(res);
        }
    }, [searchParams, reservas]);

    useEffect(() => {
        const checkSession = async () => {
            try {
              const res = await fetch(`/api/${slug}/reservas-cliente`);
              if (res.ok) {
                  const data = await res.json();
                  setReservas(data);
                  const resPerfil = await fetch(`/api/${slug}/perfil`);
                  if (resPerfil.ok) {
                      const dataPerfil = await resPerfil.json();
                      if (dataPerfil) setCliente(dataPerfil);
                  }
                  setStep('history');
              }
            } catch (err) {
            } finally {
              setVerifyingSession(false);
            }
        };

        const fetchBusiness = async () => {
            try {
                const res = await fetch(`/api/public/negocio/${slug}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data) {
                        // Fallback desesperado: si no hay whatsapp pero sabemos que es demo-spa
                        if (!data.whatsapp && slug === 'demo-spa') {
                            data.whatsapp = '0983173408';
                        }
                        setNegocio(data);
                    }
                } else if (slug === 'demo-spa') {
                    // Si la API falla pero es demo-spa, ponemos el dato manual
                    setNegocio({ nombre: 'Spa', whatsapp: '0983173408' } as any);
                }
            } catch (e) {
                console.error("Error fetching business info:", e);
            }
        };

        checkSession();
        fetchBusiness();
    }, [slug]);

    const primaryColor = negocio?.colorPrimario || 'var(--primary)';
    const secondaryColor = negocio?.colorSecundario || '#112117';
    const neutralColor = negocio?.colorNeutral || '#f8fafc';
    const textColor = negocio?.colorTexto || '#0f172a';
    const tertiaryColor = negocio?.colorTerciario || '#f0fdf4';

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
                await fetchHistory();
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

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const resReservas = await fetch(`/api/${slug}/reservas-cliente`);

            // Si no autorizado, volver al login
            if (resReservas.status === 401) {
                setStep('phone');
                setLoading(false);
                return;
            }

            // Para cualquier otro caso (incluso errores 500), intentar continuar
            let dataReservas: any[] = [];
            try {
                const parsed = await resReservas.json();
                dataReservas = Array.isArray(parsed) ? parsed : [];
            } catch (_) {
                dataReservas = [];
            }

            // Cargar perfil del cliente
            let dataPerfil = null;
            try {
                const resPerfil = await fetch(`/api/${slug}/perfil`);
                if (resPerfil.ok) dataPerfil = await resPerfil.json();
            } catch (_) {}

            setReservas(dataReservas);
            if (dataPerfil) setCliente(dataPerfil);
            setStep('history');

            // Auto-trigger calificación si hay una cita reciente completada sin calificar
            const recentUnrated = dataReservas.find(r => 
                (r.estado === 'completed' || r.estado === 'finalizada') && 
                !r.ratings?.some((rt: any) => rt.raterRole === 'client')
            );
            
            if (recentUnrated) {
                // Pequeño delay para no interrumpir la transición de carga
                setTimeout(() => {
                    handleOpenRating(recentUnrated);
                }, 1000);
            }

        } catch (err) {
            // Error de red — igual intentar mostrar historial vacío
            setReservas([]);
            setStep('history');
        } finally {
            setLoading(false);
        }
    };

    const [viewingReserva, setViewingReserva] = useState<any>(null);
    const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
    const [ratingTarget, setRatingTarget] = useState<any>(null);

    const handleManageReserva = (res: any) => {
        const lowerEstado = res.estado?.toLowerCase();
        
        // Si está pendiente, mostramos el modal de pago
        if (lowerEstado === 'pendiente' || lowerEstado === 'pending') {
            setPendingModal(res);
            return;
        }

        // Si está confirmada o en otro estado, mostramos el detalle de la cita
        setViewingReserva(res);
    };

    const handleOpenRating = (res: any) => {
        setRatingTarget(res);
        setIsRatingModalOpen(true);
    };

    const getStatusStyles = (estado: string) => {
        const lowerEstado = estado?.toLowerCase();
        switch (lowerEstado) {
            case 'confirmed':
            case 'confirmada':
            case 'completed':
            case 'finalizada':
            case 'finalizado':
                return 'bg-emerald-500 text-white border-emerald-400';
            case 'pending':
            case 'pendiente':
                return 'bg-amber-500 text-white border-amber-400';
            case 'cancelled':
            case 'cancelada':
                return 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
            default:
                return 'bg-white/10 text-white border border-white/10';
        }
    };

    const pendingUrgentReserva = useMemo(() => {
        const pending = reservas.filter(r => (r.estado === 'pending' || r.estado === 'PENDIENTE') && r.expiresAt && new Date(r.expiresAt).getTime() > Date.now());
        if (pending.length === 0) return null;
        return pending.sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime())[0];
    }, [reservas]);

    const showPrices = negocio?.mostrarPrecios !== false;

    if (verifyingSession) {
        return (
            <div className="min-h-screen bg-gray-50/50 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="animate-spin text-emerald-500 size-10" style={{ color: primaryColor }} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 animate-pulse">Verificando sesión...</span>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/50 text-slate-900 font-sans selection:bg-pink-500/30 overflow-x-hidden">
            {/* Cabecera Estilo App */}
            {step !== 'history' && (
                <div className="sticky top-0 z-[100] px-6 py-5 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between">
                    <button onClick={() => router.push(`/${slug}`)} className="p-2 -ml-2">
                        <ChevronLeft size={24} style={{ color: primaryColor }} />
                    </button>
                    <div className="flex items-center gap-2">
                        {negocio?.logoUrl && <img src={negocio.logoUrl} className="size-8 rounded-full border border-gray-100 object-cover" />}
                        <span className="font-black text-sm uppercase tracking-widest leading-none mt-1" style={{ color: primaryColor }}>{negocio?.nombre}</span>
                    </div>
                    <div className="w-8" />
                </div>
            )}



            {/* 🛡️ APP NATIVE HEADER */}
            {step === 'history' && (
                <header className="fixed top-0 left-0 right-0 z-[100] backdrop-blur-xl border-b h-16 flex items-center px-6" style={{ backgroundColor: `${neutralColor}CC`, borderColor: `${textColor}10` }}>
                    <div className="max-w-xl mx-auto w-full flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button onClick={() => router.push(`/${slug}`)} className="size-10 rounded-2xl flex items-center justify-center border active:scale-95 transition-all" style={{ backgroundColor: `${textColor}05`, borderColor: `${textColor}10` }}>
                                <ChevronLeft size={20} style={{ color: textColor }} />
                            </button>
                            <h1 className="text-[10px] font-black uppercase italic tracking-[0.2em] leading-none" style={{ color: textColor }}>Mis Reservas</h1>
                        </div>
                        <Link href={`/${slug}/perfil`} className="size-10 rounded-full bg-white flex items-center justify-center border text-[11px] font-black shadow-sm" style={{ color: primaryColor, borderColor: `${primaryColor}20` }}>
                            {cliente?.nombre?.charAt(0).toUpperCase() || 'U'}
                        </Link>
                    </div>
                </header>
            )}

            <main className={cn(
                "max-w-xl mx-auto px-6 w-full",
                step === 'history' ? "pt-24 pb-28" : "pt-2 pb-12 overflow-x-hidden"
            )}>
                {step === 'phone' && (
                    <section className="flex flex-col items-center text-center space-y-6 pt-10">
                        <h2 className="text-5xl font-black italic uppercase tracking-tighter leading-none" style={{ color: textColor }}>Hola,</h2>
                        <p className="font-black italic tracking-widest text-[11px] uppercase opacity-60" style={{ color: textColor }}>Identifícate para gestionar tus citas</p>

                        <div className="w-full bg-white rounded-[2.5rem] p-8 shadow-2xl border border-slate-100">
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
                    <div className="relative z-10 flex flex-col items-center py-6 animate-in fade-in slide-in-from-right-4 duration-700">
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

                                <div className="space-y-6">
                                    <button 
                                        type="submit" 
                                        disabled={loading || code.length < 6} 
                                        className="w-full h-18 text-white rounded-[2rem] font-black text-[13px] uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all disabled:grayscale disabled:opacity-30"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        {loading ? <Loader2 className="animate-spin mx-auto" /> : "VALIDAR ACCESO"}
                                    </button>
                                    
                                    <div className="flex justify-between items-center px-4">
                                        <button type="button" onClick={() => setStep('phone')} className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-900 transition-colors">VOLVER</button>
                                        <div className="flex items-baseline gap-1.5 grayscale">
                                            <span className="text-[10px] font-black uppercase italic" style={{ color: primaryColor }}>
                                                {countdown > 0 ? `${Math.floor(countdown/60)}:${(countdown%60).toString().padStart(2, '0')}` : "AHORA"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {step === 'history' && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="flex gap-1 p-1 bg-white rounded-2xl shadow-sm border border-slate-100 mb-8" style={{ backgroundColor: neutralColor }}>
                            {(['reservas', 'cursos'] as any[]).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={cn(
                                        "flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest italic transition-all",
                                        activeTab === tab 
                                            ? "text-white shadow-lg" 
                                            : "text-slate-400 hover:text-slate-600"
                                    )}
                                    style={activeTab === tab ? { backgroundColor: primaryColor, boxShadow: `0 10px 15px -3px ${primaryColor}40` } : {}}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {activeTab === 'reservas' && (
                            <div className="space-y-8">
                                <div className="flex gap-6 mb-8 justify-center">
                                    {(['proximas', 'pasadas'] as any[]).map((f) => (
                                        <button
                                            key={f}
                                            onClick={() => setFilter(f)}
                                            className={cn(
                                                "text-[10px] font-black uppercase tracking-widest italic transition-all relative pb-2",
                                                filter === f ? "text-[var(--primary-color)]" : "text-slate-400"
                                            )}
                                            style={filter === f ? { color: primaryColor } : {}}
                                        >
                                            {f}
                                            {filter === f && (
                                                <div className="absolute bottom-0 left-0 right-0 h-1 rounded-full" style={{ backgroundColor: primaryColor }} />
                                            )}
                                        </button>
                                    ))}
                                </div>

                                {filter === 'proximas' ? (
                                    <div className="space-y-8">
                                        {resMasCercana ? (
                                            <>
                                                <div className="space-y-4 mb-10 animate-in slide-in-from-top-4 duration-700">
                                                    <div className="flex items-center gap-2 pl-1">
                                                        <div className="size-2 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ backgroundColor: primaryColor }} />
                                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] italic" style={{ color: primaryColor }}>Cita Próxima</h3>
                                                    </div>
                                                    <CheckInCard appointment={{
                                                        ...resMasCercana,
                                                        servicio: resMasCercana.service?.nombre,
                                                        especialista: resMasCercana.staff?.name,
                                                        primaryColor: primaryColor,
                                                        whatsapp: negocio?.whatsapp
                                                    }} />
                                                </div>
                                            </>
                                        ) : (
                                            <div className="py-20 text-center bg-[#11141d]/50 rounded-[2.5rem] border border-dashed border-white/10 opacity-70">
                                                <Trophy size={36} className="mx-auto mb-4 text-slate-800" />
                                                <p className="text-[10px] font-black text-slate-500 uppercase italic tracking-widest">Sin compromisos programados</p>
                                            </div>
                                        )}

                                        <div className="space-y-3">
                                            {otrasProximas.map(res => (
                                                <div key={res.id} onClick={() => handleManageReserva(res)} className="bg-white border border-slate-100 rounded-[1.5rem] p-4 flex items-center gap-4 group active:bg-slate-50 transition-colors shadow-sm cursor-pointer">
                                                    <div className="size-12 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center shrink-0">
                                                        {(() => {
                                                            const d = res.fecha.split('T')[0].split('-');
                                                            const dObj = new Date(Number(d[0]), Number(d[1]) - 1, Number(d[2]));
                                                            return (
                                                                <>
                                                                    <span className="text-[7px] font-black text-slate-400 uppercase italic leading-none mb-0.5" style={{ color: primaryColor }}>{dObj.toLocaleDateString('es', { month: 'short' }).toUpperCase()}</span>
                                                                    <span className="text-lg font-black text-slate-900 italic leading-none">{dObj.getDate()}</span>
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                    <div className="flex-1 min-w-0 space-y-1.5">
                                                        <div className="flex justify-between items-center">
                                                            <h5 className="font-black text-slate-900 uppercase italic text-[15px] leading-none truncate pr-2">{res.service?.nombre || res.servicio?.nombre || 'Mi cita'}</h5>
                                                            <div className={cn("px-1.5 py-0.5 rounded text-[7px] font-black uppercase italic tracking-widest text-center min-w-[50px]", getStatusStyles(res.estado))}>
                                                                {res.estado === 'confirmada' || res.estado === 'confirmed' ? '✓ CONF.' : 
                                                                 res.estado === 'completed' || res.estado === 'finalizada' ? '✓ FIN.' :
                                                                 res.estado?.substring(0,6).toUpperCase()}
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-between items-end">
                                                            <div className="flex items-center gap-3 text-slate-400 font-bold text-[9px] uppercase italic leading-none">
                                                                <span className="flex items-center gap-1.5"><Clock size={11} /> {res.horaInicio}</span>
                                                                <span className="opacity-30">#{res.id.slice(-4).toUpperCase()}</span>
                                                            </div>
                                                                 {showPrices && <span className="text-[13px] font-black italic leading-none" style={{ color: primaryColor }}>${res.total}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3.5 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                        {pasadas.map(res => (
                                            <div key={res.id} onClick={() => handleManageReserva(res)} className="bg-white border border-slate-100 rounded-[1.2rem] p-4 flex items-center gap-4.5 hover:bg-slate-50 transition-all active:scale-[0.98] cursor-pointer shadow-sm opacity-90">
                                                <div className="size-12 rounded-xl bg-slate-50 flex flex-col items-center justify-center shrink-0 border border-slate-100">
                                                    {(() => {
                                                        const d = res.fecha.split('T')[0].split('-');
                                                        const dObj = new Date(Number(d[0]), Number(d[1]) - 1, Number(d[2]));
                                                        return (
                                                            <>
                                                                <span className="text-[7px] font-black text-slate-400 uppercase italic" style={{ color: primaryColor }}>{dObj.toLocaleDateString('es', { month: 'short' }).toUpperCase()}</span>
                                                                <span className="text-lg font-black text-slate-900 italic leading-none">{dObj.getDate()}</span>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h5 className="font-black text-slate-900 uppercase italic text-[14px] leading-tight truncate">{res.service?.nombre || res.servicio?.nombre || 'Mi cita'}</h5>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest mt-1">
                                                        {res.horaInicio} {showPrices && <>• <span className="text-slate-500">${res.total}</span></>}
                                                    </p>
                                                </div>
                                                <ArrowRight size={14} className="text-slate-600" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'cursos' && (
                            <div className="space-y-8 animate-in fade-in duration-500">
                                <h3 className="text-[8px] font-black uppercase tracking-[0.3em] italic pl-1" style={{ color: primaryColor }}>ACADEMIA ACTIVA</h3>
                                {cliente?.enrollments?.length > 0 ? cliente.enrollments.map((en: any) => (
                                    <div key={en.id} className="bg-white border rounded-[2.5rem] p-7 space-y-6 shadow-sm relative group overflow-hidden active:scale-[0.99] transition-all" style={{ borderColor: `${primaryColor}20` }}>
                                        <div className="absolute top-0 right-0 size-32 blur-[50px] rounded-full pointer-events-none" style={{ backgroundColor: `${primaryColor}10` }} />
                                        
                                        <div className="flex items-center justify-between relative z-10">
                                            <div className="flex items-center gap-4">
                                                <div className="size-12 rounded-xl flex items-center justify-center border" style={{ backgroundColor: `${primaryColor}10`, color: primaryColor, borderColor: `${primaryColor}20` }}>
                                                    <Trophy size={20} />
                                                </div>
                                                <div className="space-y-1">
                                                     <span className="text-[10px] font-black uppercase tracking-widest italic" style={{ color: primaryColor }}>{en.student_name}</span>
                                                    <h4 className="text-xl font-black text-slate-900 uppercase italic leading-none">{en.Course?.name || 'Curso'}</h4>
                                                </div>
                                            </div>
                                            <div className="px-3 py-1 text-white rounded-lg text-[8px] font-black uppercase tracking-widest italic shadow-lg" style={{ backgroundColor: primaryColor, boxShadow: `0 10px 15px -3px ${primaryColor}40` }}>
                                                {String(en.status).toUpperCase()}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 relative z-10">
                                            <div className="space-y-1">
                                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                                    <Calendar size={10} style={{ color: primaryColor }} /> Inicia
                                                </p>
                                                <p className="text-[11px] font-bold text-slate-700">
                                                    {en.Course?.start_date ? new Date(en.Course.start_date).toLocaleDateString('es', { day: 'numeric', month: 'short' }) : 'Pronto'}
                                                </p>
                                            </div>
                                            <div className="space-y-1 text-right">
                                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1 justify-end">
                                                    <Clock size={10} style={{ color: primaryColor }} /> Horario
                                                </p>
                                                <p className="text-[11px] font-bold text-slate-700">
                                                    {en.Course?.CourseSchedule?.[0]?.start_time || 'Ver detalles'}
                                                </p>
                                            </div>
                                        </div>

                                        <Link 
                                            href={`/${slug}/cursos/inscripcion/${en.id}`} 
                                            className="w-full h-12 bg-slate-50 hover:bg-slate-100 text-slate-900 rounded-xl flex items-center justify-center font-black text-[9px] uppercase tracking-widest border border-slate-200 italic transition-all relative z-10"
                                        >
                                            VER DETALLES DE MI CURSO <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
                                        </Link>
                                    </div>
                                )) : (
                                    <div className="py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200 opacity-70">
                                        <Trophy size={36} className="mx-auto mb-4 text-slate-300" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest">Sin cursos activos</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* FAB - NATIVE STYLE COMPACTO */}
            {step === 'history' && (
                <div className="fixed bottom-0 left-0 right-0 h-24 pointer-events-none bg-gradient-to-t from-[#07090f] to-transparent z-[140]">
                    <div className="max-w-xl mx-auto w-full h-full px-7 pb-7 flex justify-end items-center relative">
                        <Link href={`/${slug}`} className="pointer-events-auto size-14 bg-gradient-to-tr from-emerald-600 to-emerald-400 text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-emerald-500/20 active:scale-95 transition-all border-4 border-[#07090f]">
                            <Plus size={28} strokeWidth={4} />
                        </Link>
                    </div>
                </div>
            )}

            <style jsx global>{`
                input::placeholder { color: #334155 !important; font-style: italic; font-weight: 800; text-transform: uppercase; font-size: 10px; letter-spacing: 0.1em; }
                .PhoneInputInput { background: transparent !important; color: white !important; font-weight: 900 !important; font-size: 1rem !important; letter-spacing: 0.05em !important; padding: 0.75rem !important; border: none !important; outline: none !important; }
            `}</style>

            {/* 🛡 Pending Payment Modal */}
            {pendingModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setPendingModal(null)} />
                    <div className="relative w-full max-w-sm bg-[#11141d] border border-amber-500/20 rounded-[2.5rem] p-8 shadow-2xl shadow-amber-500/10 overflow-hidden">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                        
                        <div className="flex flex-col items-center text-center space-y-6 relative z-10">
                            <div className="size-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl p-1 shadow-lg shadow-amber-500/20 animate-in zoom-in duration-500">
                                <div className="w-full h-full bg-[#11141d] rounded-[1.3rem] flex items-center justify-center">
                                    <Clock size={36} className="text-amber-500 animate-pulse" />
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <h3 className="text-2xl font-black text-white italic tracking-tight leading-none">RESERVA<br/><span className="text-amber-500">PENDIENTE</span></h3>
                                <p className="text-[13px] text-slate-400 font-medium leading-relaxed">
                                    Tu espacio ha sido reservado. Por favor confírmalo realizando el pago para evitar que el sistema lo libere.
                                </p>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 w-full">
                                {pendingModal.expiresAt ? (
                                    <div className="space-y-1 text-center">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Tiempo de Espera</p>
                                        <div className="text-xl font-black text-white italic tabular-nums flex items-center justify-center gap-2">
                                            {(() => {
                                                const diff = new Date(pendingModal.expiresAt).getTime() - Date.now();
                                                if (diff <= 0) return "A punto de expirar";
                                                const m = Math.floor(diff / 60000);
                                                const s = Math.floor((diff % 60000) / 1000);
                                                return `${m}m ${s}s`;
                                            })()}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-1 text-center">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Estado</p>
                                        <div className="text-[14px] font-black text-amber-500 italic uppercase">Esperando pago</div>
                                    </div>
                                )}
                            </div>

                            <div className="w-full space-y-3 pt-2">
                                <button 
                                    onClick={() => {
                                        const d = pendingModal.fecha.split('T')[0].split('-');
                                        const dateObj = new Date(Number(d[0]), Number(d[1]) - 1, Number(d[2]));
                                        const fechaLegible = dateObj.toLocaleDateString('es', { day: 'numeric', month: 'short' });
                                        const phone = negocio?.whatsapp ? negocio.whatsapp.replace(/\+/g, '') : '';
                                        const message = `👋 Hola, quiero pagar y confirmar mi reserva:\n\n📅 Fecha: ${fechaLegible}\n⏰ Hora: ${pendingModal.horaInicio}\n💆 Servicio: ${pendingModal.service?.nombre || ''}`;
                                        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
                                        setPendingModal(null);
                                    }}
                                    className="w-full h-14 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 active:scale-95 rounded-2xl text-white font-black text-[13px] uppercase tracking-widest shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3 transition-all"
                                >
                                    <svg viewBox="0 0 24 24" fill="currentColor" className="size-5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                                    PAGAR RESERVA
                                </button>
                                <button 
                                    onClick={() => setPendingModal(null)}
                                    className="w-full h-14 bg-transparent border border-white/10 rounded-2xl text-slate-400 hover:text-white font-black text-[13px] uppercase tracking-widest transition-all"
                                >
                                    VOLVER
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 💆 Confirmed Appointment Modern Detail Modal */}
            {viewingReserva && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setViewingReserva(null)} />
                    <div className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl overflow-hidden border border-gray-100">
                        {/* Decorative Top */}
                        <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-emerald-400 to-emerald-600" />
                        <div className="absolute top-0 right-0 size-32 bg-emerald-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                        
                        <div className="flex flex-col items-center text-center space-y-6 relative z-10">
                            <div className="size-20 bg-emerald-50 rounded-3xl p-1 shadow-sm border border-emerald-100 flex items-center justify-center">
                                <CheckCircle2 size={36} className="text-emerald-500" />
                            </div>
                            
                            <div className="space-y-1">
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none uppercase italic">
                                    {viewingReserva.estado === 'confirmed' || viewingReserva.estado === 'confirmada' ? 'Cita Confirmada' : 
                                     viewingReserva.estado === 'completed' || viewingReserva.estado === 'finalizada' ? 'Cita Finalizada' :
                                     viewingReserva.estado === 'cancelled' || viewingReserva.estado === 'cancelada' ? 'Cita Cancelada' :
                                     viewingReserva.estado === 'expired' ? 'Cita Expirada' : 'Detalle de Cita'}
                                </h3>
                                <p className={cn(
                                    "text-[10px] font-black uppercase tracking-[0.2em]",
                                    (viewingReserva.estado === 'confirmed' || viewingReserva.estado === 'confirmada' || viewingReserva.estado === 'completed' || viewingReserva.estado === 'finalizada') ? "text-emerald-500" : "text-rose-400"
                                )}>
                                    {(viewingReserva.estado === 'confirmed' || viewingReserva.estado === 'confirmada') ? '¡Te esperamos pronto!' : 
                                     (viewingReserva.estado === 'completed' || viewingReserva.estado === 'finalizada') ? 'Servicio completado' :
                                     'Cita no procesada'}
                                </p>
                            </div>

                            <div className="w-full space-y-4 py-4 border-y border-dashed border-gray-200">
                                <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest text-slate-400 px-2">
                                    <span>Servicio</span>
                                    <span className="text-slate-900">{viewingReserva.service?.nombre || viewingReserva.servicio?.nombre || 'Tratamiento'}</span>
                                </div>
                                <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest text-slate-400 px-2">
                                    <span>Fecha</span>
                                    <span className="text-slate-900">
                                        {(() => {
                                            const d = viewingReserva.fecha.split('T')[0].split('-');
                                            const dateObj = new Date(Number(d[0]), Number(d[1]) - 1, Number(d[2]));
                                            return format(dateObj, "EEE d 'de' MMMM", { locale: es }).replace(/^\w/, c => c.toUpperCase());
                                        })()}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest text-slate-400 px-2">
                                    <span>Horario</span>
                                    <span className="text-slate-900 italic">{viewingReserva.horaInicio} - {viewingReserva.horaFin}</span>
                                </div>
                                 <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest text-slate-400 px-2">
                                    <span>Estatus</span>
                                    <span className={cn(
                                        "px-2 py-0.5 rounded text-[8px] font-black",
                                        (viewingReserva.estado === 'confirmed' || viewingReserva.estado === 'confirmada' || viewingReserva.estado === 'completed' || viewingReserva.estado === 'finalizada') ? "bg-emerald-500 text-white" : 
                                        viewingReserva.estado === 'expired' ? "bg-gray-200 text-gray-500" : "bg-rose-500 text-white"
                                    )}>
                                        {viewingReserva.estado === 'confirmed' || viewingReserva.estado === 'confirmada' ? '✓ CONFIRMADO' : 
                                         viewingReserva.estado === 'completed' || viewingReserva.estado === 'finalizada' ? '✓ FINALIZADA' :
                                         viewingReserva.estado === 'cancelled' || viewingReserva.estado === 'cancelada' ? '✘ CANCELADA' :
                                         viewingReserva.estado === 'expired' ? '⌛ EXPIRADA' : 
                                         viewingReserva.estado?.toUpperCase()}
                                    </span>
                                </div>
                            </div>

                            {/* Botón de Calificación si aplica */}
                            {(viewingReserva.estado === 'completed' || viewingReserva.estado === 'finalizada') && 
                             !viewingReserva.ratings?.some((r: any) => r.raterRole === 'client') && (
                                <button 
                                    onClick={() => handleOpenRating(viewingReserva)}
                                    className="w-full py-4 mb-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center gap-2 text-amber-600 font-black text-[10px] uppercase tracking-widest animate-pulse"
                                >
                                    <Sparkles size={16} /> CALIFICAR SERVICIO ⭐
                                </button>
                            )}

                            <div className="w-full space-y-3 pt-2">
                                <button 
                                    onClick={() => {
                                        let bizNumber = negocio?.whatsapp || "";
                                        let cleanNumber = bizNumber.replace(/\D/g, '');
                                        if (cleanNumber.startsWith('0') && cleanNumber.length === 10) {
                                            cleanNumber = '593' + cleanNumber.substring(1);
                                        } else if (cleanNumber.length === 9) {
                                            cleanNumber = '593' + cleanNumber;
                                        }
                                        if (!cleanNumber || cleanNumber.length < 7) {
                                            alert("El servicio de consulta por WhatsApp no está disponible en este momento. Por favor, intenta más tarde o contacta directamente con el local.");
                                            return;
                                        }

                                        const d = viewingReserva.fecha.split('T')[0].split('-');
                                        const dateObj = new Date(Number(d[0]), Number(d[1]) - 1, Number(d[2]));
                                        const fechaMsg = dateObj.toLocaleDateString('es', { day: 'numeric', month: 'long' });
                                        const serviceName = viewingReserva.service?.nombre || viewingReserva.servicio?.nombre || 'mi cita';

                                        const message = `👋 Hola! Tengo una cita confirmada de *${serviceName}* para el día *${fechaMsg}* a las *${viewingReserva.horaInicio}*. Quisiera realizar una consulta.`;
                                        
                                        window.open(`https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`, '_blank');
                                    }}
                                    className="w-full h-15 bg-[#11141d] hover:bg-black active:scale-95 rounded-2xl text-white font-black text-[12px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all border border-white/5"
                                >
                                    <MessageCircle size={20} className="text-emerald-400" /> CONSULTAR INFO
                                </button>
                                <button 
                                    onClick={() => setViewingReserva(null)}
                                    className="w-full h-14 bg-gray-50 text-slate-400 hover:text-slate-900 font-black text-[11px] uppercase tracking-widest rounded-2xl transition-all"
                                >
                                    CERRAR
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <RatingModal 
                isOpen={isRatingModalOpen}
                onClose={() => setIsRatingModalOpen(false)}
                appointmentId={ratingTarget?.id}
                raterRole="client"
                targetName={ratingTarget?.staff?.name || 'el profesional'}
                onSuccess={() => {
                    fetchHistory();
                    setViewingReserva(null);
                }}
            />
        </div>
    );
}
