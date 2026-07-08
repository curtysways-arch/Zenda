'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Gift, ChevronLeft, ChevronRight, Star, Phone, Key, Loader2, Copy, Share2, Award, CheckCircle2, QrCode, Sparkles, X, Globe, Trophy, Users, Heart, Coins } from 'lucide-react';
import Link from 'next/link';
import PhoneInput from "@/components/ui/PhoneInput";
import { QRCodeSVG } from 'qrcode.react';

export default function MisRecompensasPage() {
    const params = useParams();
    const slug = params.slug as string;
    const router = useRouter();

    const [step, setStep] = useState<'phone' | 'otp' | 'rewards'>('phone');
    const [verifyingSession, setVerifyingSession] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [countdown, setCountdown] = useState(0);

    const [telefono, setTelefono] = useState("");
    const [code, setCode] = useState("");
    const [negocio, setNegocio] = useState<any>(null);
    const [meData, setMeData] = useState<any>(null);
    const [copied, setCopied] = useState(false);
    const [showQrModal, setShowQrModal] = useState(false);

    // Estados de catálogo de premios por puntos
    const [loyaltyRewards, setLoyaltyRewards] = useState<any[]>([]);
    const [redeemLoading, setRedeemLoading] = useState<string | null>(null);

    const otpInputRef = useRef<HTMLInputElement>(null);

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

        const checkSession = async () => {
            try {
                const res = await fetch(`/api/${slug}/referrals/me`);
                if (res.ok) {
                    const data = await res.json();
                    setMeData(data);
                    setStep('rewards');
                    fetchLoyaltyRewards();
                }
            } catch (err) {
                console.error("Error al validar sesión:", err);
            } finally {
                setVerifyingSession(false);
            }
        };

        fetchBusiness();
        checkSession();
    }, [slug]);

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

    const fetchLoyaltyRewards = async () => {
        try {
            const res = await fetch(`/api/public/${slug}/loyalty/rewards`);
            if (res.ok) {
                const data = await res.json();
                setLoyaltyRewards(data || []);
            }
        } catch (e) {
            console.error("Error fetching loyalty rewards:", e);
        }
    };

    const primaryColor = negocio?.colorPrimario || '#1dc95c';
    const secondaryColor = negocio?.colorSecundario || '#112117';
    const neutralColor = negocio?.colorNeutral || '#ffffff';
    const textColor = negocio?.colorTexto || '#0f172a';

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
                // Obtener datos del cliente
                const meRes = await fetch(`/api/${slug}/referrals/me`);
                if (meRes.ok) {
                    const data = await meRes.json();
                    setMeData(data);
                    setStep('rewards');
                    fetchLoyaltyRewards();
                } else {
                    setError("Error al cargar perfil de referidos.");
                }
            } else {
                const data = await res.json();
                setError(data.error || "Código incorrecto");
            }
        } catch (err) {
            setError("Error de conexión al verificar el código.");
        } finally {
            setLoading(false);
        }
    };

    const handleRedeemReward = async (reward: any) => {
        if (!confirm(`¿Estás seguro de que deseas canjear "${reward.nombre}" por ${reward.costoPuntos} puntos?`)) return;
        setRedeemLoading(reward.id);
        try {
            const res = await fetch(`/api/public/${slug}/loyalty/rewards`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rewardId: reward.id })
            });
            const data = await res.json();
            if (res.ok) {
                alert(`¡Canje exitoso! Se han descontado ${reward.costoPuntos} puntos. Presenta tu premio en recepción.`);
                // Actualizar balance
                const meRes = await fetch(`/api/${slug}/referrals/me`);
                if (meRes.ok) {
                    const updatedMe = await meRes.json();
                    setMeData(updatedMe);
                }
            } else {
                alert(data.error || "Error al procesar el canje.");
            }
        } catch (err) {
            console.error("Error al canjear:", err);
            alert("Ocurrió un error inesperado al canjear.");
        } finally {
            setRedeemLoading(null);
        }
    };

    const getReferralUrl = () => {
        if (typeof window !== 'undefined' && meData?.codigo) {
            return `${window.location.origin}/r/${meData.codigo}`;
        }
        return '';
    };

    const handleCopy = () => {
        const url = getReferralUrl();
        if (url) {
            navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleShare = async () => {
        const url = getReferralUrl();
        if (!url) return;

        const shareData = {
            title: `Invitación de ${meData?.nombreCliente || 'tu amigo'} a ${negocio?.nombre}`,
            text: `¡Hola! Te recomiendo visitar *${negocio?.nombre}*. Reserva tu cita usando este enlace y obtén un regalo especial de bienvenida:`,
            url: url
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.log("Error al compartir:", err);
            }
        } else {
            // Fallback a WhatsApp
            const msg = `${shareData.text}\n${url}`;
            window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
        }
    };

    if (verifyingSession) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-400 p-4">
                <Loader2 className="animate-spin mb-4" size={32} style={{ color: primaryColor }} />
                <span className="text-[10px] font-black uppercase tracking-widest">Validando sesión...</span>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col pb-12">
            {/* Header público del negocio */}
            <header className="bg-white border-b border-slate-100/80 px-4 py-3 sticky top-0 z-30 flex items-center justify-between">
                <Link
                    href={`/${slug}`}
                    className="flex items-center justify-center size-9 rounded-full bg-white border border-slate-100 shadow-sm text-slate-600 hover:text-slate-900 transition-all active:scale-90"
                    style={{ color: primaryColor }}
                >
                    <ChevronLeft size={18} strokeWidth={3} />
                </Link>
                <div className="text-center flex-1 pr-9">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: primaryColor }}>CLUB CITIOX</span>
                    <h1 className="text-sm font-black text-slate-950 uppercase tracking-tight leading-none mt-0.5">{negocio?.nombre}</h1>
                </div>
            </header>

            <main className="flex-1 max-w-md mx-auto w-full px-2.5 pt-4">
                
                {/* ── PASO 1: PEDIR TELÉFONO ── */}
                {step === 'phone' && (
                    <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-xl flex flex-col animate-in slide-in-from-bottom-8 duration-300">
                        <div className="relative size-16 bg-gradient-to-tr from-emerald-500 to-teal-600 rounded-[1.8rem] flex items-center justify-center text-white shadow-lg mx-auto mb-6">
                            <Gift size={28} className="animate-bounce" />
                        </div>

                        <h2 className="text-xl font-black text-slate-950 uppercase italic tracking-tighter text-center mb-2">
                            Mis Recompensas
                        </h2>
                        <p className="text-xs text-slate-400 font-medium text-center mb-6 leading-relaxed">
                            Ingresa tu número de teléfono para ver tu progreso, ganar premios gratis y compartir tu enlace único con amigos.
                        </p>

                        <form onSubmit={handleSendOtp} className="space-y-4">
                            <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Número de WhatsApp</label>
                                <PhoneInput
                                    value={telefono}
                                    onChange={setTelefono}
                                    placeholder="099 999 9999"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-800 outline-none"
                                />
                            </div>

                            {error && (
                                <p className="text-xs font-bold text-rose-500 text-center bg-rose-50 p-3 rounded-2xl">
                                    {error}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={loading || !telefono}
                                className="w-full flex items-center justify-center gap-2 py-4 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-transform active:scale-95 disabled:opacity-50 cursor-pointer shadow-lg"
                                style={{
                                    backgroundColor: primaryColor,
                                    boxShadow: `0 10px 15px -3px ${primaryColor}33`
                                }}
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin" size={14} />
                                ) : (
                                    <Phone size={14} />
                                )}
                                Enviar código de acceso
                            </button>
                        </form>
                    </div>
                )}

                {/* ── PASO 2: VERIFICAR OTP ── */}
                {step === 'otp' && (
                    <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-xl flex flex-col animate-in slide-in-from-bottom-8 duration-300">
                        <div className="relative size-16 bg-gradient-to-tr from-amber-500 to-orange-600 rounded-[1.8rem] flex items-center justify-center text-white shadow-lg mx-auto mb-6">
                            <Key size={28} />
                        </div>

                        <h2 className="text-xl font-black text-slate-950 uppercase italic tracking-tighter text-center mb-2">
                            Ingresa el código
                        </h2>
                        <p className="text-xs text-slate-400 font-medium text-center mb-6 leading-relaxed">
                            Te enviamos un código de acceso a tu WhatsApp *{telefono}*. Por favor escríbelo abajo.
                        </p>

                        <form onSubmit={handleVerifyOtp} className="space-y-4">
                            <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Código de Verificación</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    required
                                    ref={otpInputRef}
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                                    placeholder="123456"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center text-lg font-black tracking-[0.3em] text-slate-800 outline-none focus:border-[var(--primary-color)]"
                                    style={{ borderColor: primaryColor, color: '#0f172a' } as any}
                                />
                            </div>

                            {error && (
                                <p className="text-xs font-bold text-rose-500 text-center bg-rose-50 p-3 rounded-2xl">
                                    {error}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={loading || code.length < 4}
                                className="w-full flex items-center justify-center gap-2 py-4 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-transform active:scale-95 disabled:opacity-50 cursor-pointer shadow-lg"
                                style={{
                                    backgroundColor: primaryColor,
                                    boxShadow: `0 10px 15px -3px ${primaryColor}33`
                                }}
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin" size={14} />
                                ) : (
                                    <CheckCircle2 size={14} />
                                )}
                                Verificar código
                            </button>
 
                            <button
                                type="button"
                                onClick={handleSendOtp}
                                disabled={countdown > 540}
                                className="w-full text-center text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest pt-2 disabled:opacity-50"
                            >
                                {countdown > 540
                                    ? `Reenviar código en ${countdown - 540}s`
                                    : 'Reenviar código por WhatsApp'}
                            </button>
                        </form>
                    </div>
                )}

                {/* ── PASO 3: TABLERO DE RECOMPENSAS ── */}
                {step === 'rewards' && meData && (
                    <div className="space-y-5 animate-in fade-in duration-500 pb-8">
                        
                        {/* Tarjeta de Puntos si están activos */}
                        {meData.puntosActivos && (
                            <div className="bg-white border border-slate-100 rounded-[1.8rem] p-4 shadow-[0_4px_25px_rgba(0,0,0,0.02)] flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="size-12 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 shrink-0 shadow-sm">
                                        <Trophy size={20} className="animate-pulse" />
                                    </div>
                                    <div>
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-1">Tu Balance</span>
                                        <h3 className="text-xl font-black text-slate-900 leading-none">{meData.puntos} <span className="text-[10px] font-black uppercase text-amber-500 tracking-wider">Puntos</span></h3>
                                    </div>
                                </div>
                                <Link 
                                    href={`/${slug}/servicios`} 
                                    className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl text-[8px] font-black uppercase tracking-widest text-slate-700 transition-colors"
                                >
                                    Ganar Más
                                </Link>
                            </div>
                        )}

                        {/* Tarjeta de Invitación Premium */}
                        <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-[2.2rem] p-4 shadow-xl relative overflow-hidden border border-white/5">
                            {/* Decorativos de fondo */}
                            <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 -mr-16 -mt-16" style={{ backgroundColor: primaryColor }} />
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500 rounded-full blur-3xl opacity-15 -ml-12 -mb-12" />

                            <div className="relative z-10 flex items-center justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <span className="text-[8px] font-black uppercase tracking-[0.25em] flex items-center gap-1.5 mb-2" style={{ color: primaryColor }}>
                                        <Sparkles size={11} fill={primaryColor} className="animate-spin-slow" />
                                        Tu Enlace Embajador
                                    </span>
                                    
                                    <h3 className="text-[17px] font-black uppercase italic tracking-tighter leading-tight mb-4">
                                        ¡Invita a tus amigos<br /><span style={{ color: primaryColor }}>y gana premios!</span>
                                    </h3>

                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center justify-between gap-3 mb-1">
                                        <div className="overflow-hidden">
                                            <span className="text-[8px] font-black text-white/40 uppercase tracking-widest block leading-none mb-1">Tu Código Único</span>
                                            <span className="text-sm font-black tracking-widest uppercase" style={{ color: primaryColor }}>{meData.codigo}</span>
                                        </div>
                                        <div className="flex gap-2.5 shrink-0">
                                            {/* Botón QR */}
                                            <button
                                                onClick={() => setShowQrModal(true)}
                                                className="flex flex-col items-center gap-1 text-white/50 hover:text-white transition-colors"
                                                title="Ver Código QR"
                                            >
                                                <div className="size-10 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl flex items-center justify-center">
                                                    <QrCode size={16} />
                                                </div>
                                                <span className="text-[7px] font-black tracking-wider uppercase">QR</span>
                                            </button>
                                            {/* Botón Copiar */}
                                            <button
                                                onClick={handleCopy}
                                                className="flex flex-col items-center gap-1 text-white/50 hover:text-white transition-colors"
                                            >
                                                <div className={`size-10 rounded-xl flex items-center justify-center border transition-all ${
                                                    copied ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'
                                                }`}>
                                                    <Copy size={16} />
                                                </div>
                                                <span className="text-[7px] font-black tracking-wider uppercase">
                                                    {copied ? 'Copiado' : 'Copiar'}
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Imagen de regalo a la derecha */}
                                <div className="w-[32%] aspect-[4/5] relative shrink-0 rounded-2xl overflow-hidden shadow-lg border border-white/10 bg-slate-800">
                                    <img 
                                        src="https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=250&auto=format&fit=crop" 
                                        className="w-full h-full object-cover" 
                                        alt="Regalos" 
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent" />
                                </div>
                            </div>

                            {/* Botón de Compartir Enlace */}
                            <button
                                onClick={handleShare}
                                className="w-full mt-4 py-3.5 text-white font-black text-[10px] uppercase tracking-widest rounded-full transition-transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-md select-none"
                                style={{
                                    background: `linear-gradient(90deg, ${primaryColor}, ${primaryColor}dd)`,
                                    boxShadow: `0 10px 20px -5px ${primaryColor}40`
                                }}
                            >
                                <Share2 size={12} strokeWidth={3} />
                                Compartir mi Enlace
                            </button>
                        </div>

                        {/* Catálogo de Premios por Puntos */}
                        {meData.puntosActivos && loyaltyRewards.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 pl-2">
                                    <Coins size={14} className="text-amber-500" />
                                    Canje de Premios del Club
                                </h3>
                                <div className="grid grid-cols-1 gap-3">
                                    {loyaltyRewards.map((reward) => {
                                        const tienePuntos = meData.puntos >= reward.costoPuntos;
                                        return (
                                            <div key={reward.id} className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm flex items-center justify-between gap-4">
                                                <div className="min-w-0">
                                                    <span className="text-[8px] font-black text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md inline-block mb-1.5">
                                                        CUESTA: {reward.costoPuntos} PUNTOS
                                                    </span>
                                                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight truncate">
                                                        {reward.nombre}
                                                    </h4>
                                                    {reward.descripcion && (
                                                        <p className="text-[9px] text-slate-450 font-semibold mt-1">
                                                            {reward.descripcion}
                                                        </p>
                                                    )}
                                                </div>

                                                <button
                                                    onClick={() => handleRedeemReward(reward)}
                                                    disabled={!tienePuntos || redeemLoading === reward.id}
                                                    className="px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-sm shrink-0"
                                                    style={{
                                                        backgroundColor: tienePuntos ? primaryColor : '#94a3b8',
                                                        boxShadow: tienePuntos ? `0 4px 6px -1px ${primaryColor}33` : 'none'
                                                    }}
                                                >
                                                    {redeemLoading === reward.id ? (
                                                        <Loader2 className="animate-spin" size={12} />
                                                    ) : (
                                                        'Canjear'
                                                    )}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Progreso de Campañas */}
                        <div className="space-y-3">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 pl-2">
                                <Trophy size={14} className="text-amber-500" />
                                Campañas Activas
                            </h3>

                            {meData.progresoCampañas.length === 0 ? (
                                <div className="bg-white border border-slate-100 rounded-3xl p-6 text-center shadow-sm">
                                    <p className="text-slate-400 text-xs font-semibold">
                                        No hay campañas de referidos activas en este momento.
                                    </p>
                                </div>
                            ) : (
                                meData.progresoCampañas.map((p: any, idx: number) => {
                                    const pct = Math.min(100, (p.progreso / p.referidosRequeridos) * 100);
                                    return (
                                        <Link 
                                            key={idx} 
                                            href={`/${slug}/campana/${p.campaignId}`}
                                            className="relative block bg-white border border-slate-100 rounded-3xl p-4 shadow-[0_4px_25px_rgba(0,0,0,0.02)] space-y-4 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 group"
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    {p.imagenUrl ? (
                                                        <div className="size-11 rounded-2xl overflow-hidden shrink-0 bg-slate-50 border border-slate-100/40">
                                                            <img src={p.imagenUrl} alt={p.nombre} className="w-full h-full object-cover" />
                                                        </div>
                                                    ) : (
                                                        <div className="size-11 rounded-2xl bg-pink-100 flex items-center justify-center text-pink-500 shrink-0">
                                                            <Users size={18} />
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <h4 className="text-xs font-black uppercase tracking-tight text-slate-900 leading-tight group-hover:text-pink-500 transition-colors" style={{ '--hover-color': primaryColor } as any}>
                                                            {p.nombre}
                                                        </h4>
                                                        <p className="text-[10px] text-slate-400 font-semibold leading-none mt-1 truncate">
                                                            {p.descripcion || `Recomienda a tu negocio y gana.`}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="size-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-pink-500 group-hover:bg-pink-50 transition-all shrink-0">
                                                    <ChevronRight size={14} strokeWidth={2.5} />
                                                </div>
                                            </div>

                                            {/* Barra de progreso */}
                                            <div className="space-y-1.5 pt-1">
                                                <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider">
                                                    <span className="text-slate-400">Progreso</span>
                                                    <span className="text-pink-500" style={{ color: primaryColor }}>
                                                        {p.progreso} / {p.referidosRequeridos} {
                                                            p.tipoCampana === 'COMPLETAR_RESERVAS' || p.tipoCampana === 'CUALQUIER_RESERVA' || p.tipoCampana === 'PRIMERA_RESERVA_MES'
                                                                ? 'Reservas' 
                                                                : p.tipoCampana === 'GASTAR_DOLARES'
                                                                ? 'Dólares'
                                                                : 'Referidos'
                                                        }
                                                    </span>
                                                </div>
                                                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-500"
                                                        style={{
                                                            width: `${pct}%`,
                                                            backgroundColor: primaryColor
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Premios detalles (Ganas tú / Gana tu amigo) */}
                                            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                                                <div className="bg-[#FFF2F6] rounded-2xl p-3 border border-pink-100/30 flex items-center gap-2">
                                                    <div className="size-8 rounded-full bg-white flex items-center justify-center text-pink-500 shrink-0">
                                                        <Gift size={16} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className="text-[7.5px] font-black text-pink-500 uppercase tracking-widest block leading-none mb-1">Ganas Tú:</span>
                                                        <span className="text-[9.5px] font-black text-slate-800 leading-tight uppercase block truncate">{p.valorRecompensa}</span>
                                                    </div>
                                                </div>
                                                
                                                <div className="bg-[#FFF9F2] rounded-2xl p-3 border border-amber-100/30 flex items-center gap-2">
                                                    <div className="size-8 rounded-full bg-white flex items-center justify-center text-amber-500 shrink-0">
                                                        <Award size={16} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className="text-[7.5px] font-black text-amber-500 uppercase tracking-widest block leading-none mb-1">Gana tu Amigo:</span>
                                                        <span className="text-[9.5px] font-black text-slate-800 leading-tight uppercase block truncate">{p.valorIncentivo || '10% DTO'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })
                            )}
                        </div>

                        {/* Recompensas Ganadas */}
                        <div className="space-y-3">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 pl-2">
                                <Award size={14} style={{ color: primaryColor }} />
                                Recompensas Ganadas
                            </h3>

                            {meData.premios.length === 0 ? (
                                <div className="bg-white border border-slate-100 rounded-[2rem] p-6 text-center shadow-sm flex flex-col items-center justify-center gap-3">
                                    {/* Pink Gift Box */}
                                    <div className="relative size-16 bg-[#FFF2F6] rounded-2xl flex items-center justify-center text-pink-500 shrink-0 border border-pink-100/20">
                                        <Gift size={28} />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black text-slate-900 mb-1">¿Aún no tienes premios?</h4>
                                        <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                                            ¡Comparte tu código para empezar a ganar!
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {meData.premios.map((rew: any) => (
                                        <div key={rew.id} className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm flex items-center justify-between gap-4">
                                            <div className="overflow-hidden">
                                                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md inline-block mb-1.5 ${
                                                    rew.estado === 'DISPONIBLE' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                    {rew.estado}
                                                </span>
                                                <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight truncate leading-none">
                                                    {rew.Campaign?.valorRecompensa}
                                                </h4>
                                                <span className="text-[9px] text-slate-400 font-semibold block mt-1.5">
                                                    Ganado: {new Date(rew.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                                </span>
                                            </div>
                                            
                                            {rew.estado === 'DISPONIBLE' ? (
                                                <div className="bg-emerald-500/10 text-emerald-500 p-3 rounded-2xl flex flex-col items-center text-center justify-center shrink-0 border border-emerald-500/15">
                                                    <span className="text-[8px] font-black uppercase tracking-widest leading-none mb-1">Mostrar</span>
                                                    <span className="text-[10px] font-black uppercase tracking-widest leading-none">en local</span>
                                                </div>
                                            ) : (
                                                <div className="bg-slate-100 text-slate-400 p-3 rounded-2xl flex items-center justify-center shrink-0">
                                                    <CheckCircle2 size={16} />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Cupones de Descuento */}
                        {meData.cupones && meData.cupones.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 pl-2">
                                    <Gift size={14} className="text-purple-500" />
                                    Cupones de Descuento
                                </h3>
                                <div className="grid grid-cols-1 gap-2.5">
                                    {meData.cupones.map((coupon: any) => (
                                        <div key={coupon.id} className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm flex items-center justify-between gap-4 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl" />
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-purple-600 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-md" style={{ color: primaryColor, backgroundColor: `${primaryColor}10`, borderColor: `${primaryColor}20` }}>
                                                        {coupon.tipo === 'PORCENTAJE' ? `${coupon.valor}% DTO` : `$${coupon.valor} DTO`}
                                                    </span>
                                                </div>
                                                <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">
                                                    Código: <span style={{ color: primaryColor }}>{coupon.codigo}</span>
                                                </h4>
                                                <p className="text-[9px] text-slate-400 font-semibold mt-1">
                                                    {coupon.descripcion || "Cupón de descuento para tu reserva."}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(coupon.codigo);
                                                    alert("¡Código de cupón copiado!");
                                                }}
                                                className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl text-[8px] font-black uppercase tracking-widest text-slate-700 transition-colors"
                                            >
                                                Copiar
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Ranking de Embajadores */}
                        {meData.ranking && meData.ranking.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 pl-2">
                                    <Trophy size={14} className="text-yellow-500" />
                                    Ranking Mensual
                                </h3>
                                <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm space-y-3">
                                    {meData.ranking.map((rank: any, index: number) => (
                                        <div key={rank.id} className="flex items-center justify-between gap-3 text-xs">
                                            <div className="flex items-center gap-3">
                                                <span className={`size-6 rounded-full flex items-center justify-center font-black text-[10px] ${
                                                    index === 0 ? 'bg-amber-100 text-amber-700' : index === 1 ? 'bg-slate-100 text-slate-700' : index === 2 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-500'
                                                }`}>
                                                    {index + 1}
                                                </span>
                                                <span className="font-semibold text-slate-750">
                                                    {rank.Usuario?.nombre || "Embajador"}
                                                </span>
                                            </div>
                                            <span className="font-black text-slate-900">
                                                {rank.puntos} pts
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Tarjeta inferior tip (Entre más amigos invites...) */}
                        <div className="bg-white border border-slate-100 rounded-[2rem] p-4 shadow-sm flex items-center justify-between gap-3 hover:scale-[1.01] transition-transform cursor-pointer">
                            <div className="flex items-center gap-3">
                                <div className="size-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-500 shrink-0">
                                    <Star size={18} fill="currentColor" />
                                </div>
                                <p className="text-[11px] text-slate-600 font-black leading-snug">
                                    Entre más amigos invites,<br /><span className="text-pink-500" style={{ color: primaryColor }}>más premios puedes ganar.</span>
                                </p>
                            </div>
                            <ChevronRight size={16} className="text-pink-500 shrink-0" style={{ color: primaryColor }} />
                        </div>
                    </div>
                )}
            </main>

            {/* MODAL DEL CÓDIGO QR */}
            {showQrModal && meData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="relative w-[300px] bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col items-center text-center">
                        <button
                            onClick={() => setShowQrModal(false)}
                            className="absolute top-6 right-6 size-8 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center transition-colors cursor-pointer"
                        >
                            <X size={14} />
                        </button>

                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 mt-4">Escanea para registrarte</span>
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight leading-none mb-6">Invitación de {meData.nombreCliente}</h4>

                        <div className="bg-slate-50 p-4 rounded-[2rem] border border-slate-100 mb-6 shadow-inner">
                            <QRCodeSVG
                                value={getReferralUrl()}
                                size={160}
                                level="M"
                                includeMargin={true}
                            />
                        </div>

                        <div
                            className="py-3.5 px-4 rounded-2xl flex items-center gap-3 text-left w-full"
                            style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)` }}
                        >
                            <div className="size-8 rounded-full bg-white/20 flex items-center justify-center text-white shrink-0">
                                <Globe size={14} />
                            </div>
                            <div className="overflow-hidden">
                                <div className="text-[8px] font-black text-white/70 uppercase tracking-widest leading-none">Enlace de reserva:</div>
                                <div className="text-[9px] font-bold text-white truncate leading-normal mt-0.5">
                                    {getReferralUrl().replace(/^https?:\/\//, "")}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
