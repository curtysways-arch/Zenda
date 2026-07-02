'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Gift, ChevronLeft, Phone, Key, Loader2, Copy, Share2, Award, CheckCircle2, QrCode, Sparkles, X, Globe, Trophy, Users, Heart } from 'lucide-react';
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

    const handleLogout = async () => {
        if (!confirm("¿Deseas cerrar sesión?")) return;
        try {
            await fetch(`/api/${slug}/auth/logout`, { method: "POST" });
            setMeData(null);
            setStep('phone');
        } catch (err) {
            console.error("Error logging out:", err);
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
            <header className="bg-white border-b border-slate-100 px-4 py-4 sticky top-0 z-30 flex items-center justify-between">
                <Link
                    href={`/${slug}`}
                    className="flex items-center gap-1.5 text-xs font-black text-slate-500 hover:text-slate-800 uppercase tracking-widest"
                >
                    <ChevronLeft size={16} />
                    Volver
                </Link>
                <div className="text-center">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-400">Club CitiOx</span>
                    <h1 className="text-sm font-black text-slate-900 uppercase tracking-tight leading-none mt-0.5">{negocio?.nombre}</h1>
                </div>
                {step === 'rewards' ? (
                    <button
                        onClick={handleLogout}
                        className="text-[9px] font-black text-rose-500 hover:text-rose-600 uppercase tracking-widest cursor-pointer"
                    >
                        Salir
                    </button>
                ) : (
                    <div className="w-10" />
                )}
            </header>

            <main className="flex-1 max-w-md mx-auto w-full px-4 pt-6">
                
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
                                    required
                                    ref={otpInputRef}
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                                    placeholder="123456"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center text-lg font-black tracking-[0.3em] text-slate-800 outline-none focus:border-[var(--primary-color)]"
                                    style={{ borderColor: primaryColor } as any}
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
                    <div className="space-y-6 animate-in fade-in duration-500">
                        
                        {/* Tarjeta de Invitación Premium */}
                        <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-[2.5rem] p-6 shadow-xl relative overflow-hidden border border-white/5">
                            {/* Decorativos de fondo */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary-color)] rounded-full blur-3xl opacity-20 -mr-16 -mt-16" style={{ backgroundColor: primaryColor }} />
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500 rounded-full blur-3xl opacity-20 -ml-12 -mb-12" />

                            <div className="relative z-10">
                                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/50 flex items-center gap-1.5 mb-2">
                                    <Sparkles size={12} className="text-amber-400 animate-spin-slow" />
                                    Tu Enlace Embajador
                                </span>
                                
                                <h3 className="text-lg font-black uppercase italic tracking-tighter leading-tight mb-4">
                                    ¡Invita a tus amigos y gana premios!
                                </h3>

                                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-4 mb-5">
                                    <div className="overflow-hidden">
                                        <span className="text-[8px] font-black text-white/40 uppercase tracking-widest block leading-none mb-1">Tu Código Único</span>
                                        <span className="text-base font-black tracking-widest text-[var(--primary-color)]" style={{ color: primaryColor }}>{meData.codigo}</span>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <button
                                            onClick={() => setShowQrModal(true)}
                                            className="size-11 bg-white/10 hover:bg-white/20 text-white rounded-xl flex items-center justify-center transition-all cursor-pointer"
                                            title="Ver Código QR"
                                        >
                                            <QrCode size={16} />
                                        </button>
                                        <button
                                            onClick={handleCopy}
                                            className={`size-11 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                                                copied ? 'bg-emerald-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
                                            }`}
                                        >
                                            <Copy size={16} />
                                        </button>
                                    </div>
                                </div>

                                <button
                                    onClick={handleShare}
                                    className="w-full py-4 text-slate-900 bg-white hover:bg-slate-50 font-black text-[10px] uppercase tracking-widest rounded-2xl transition-transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-md"
                                >
                                    <Share2 size={14} />
                                    Compartir mi Enlace
                                </button>
                            </div>
                        </div>

                        {/* Progreso de Campañas */}
                        <div className="space-y-4">
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
                                        <div key={idx} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
                                            <div>
                                                <h4 className="text-xs font-black uppercase tracking-tight text-slate-900 leading-tight">
                                                    {p.nombre}
                                                </h4>
                                                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed mt-1">
                                                    {p.descripcion || `Recomienda a tu negocio y gana.`}
                                                </p>
                                            </div>

                                            {/* Barra de progreso */}
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider">
                                                    <span className="text-slate-400">Progreso</span>
                                                    <span style={{ color: primaryColor }}>{p.progreso} / {p.referidosRequeridos} Referidos</span>
                                                </div>
                                                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-500"
                                                        style={{
                                                            width: `${pct}%`,
                                                            backgroundColor: primaryColor
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Premios detalles */}
                                            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                                                <div className="bg-rose-50/50 rounded-2xl p-3 border border-rose-100/50">
                                                    <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest block leading-none mb-1">Ganas Tú:</span>
                                                    <span className="text-[11px] font-black text-rose-600 leading-tight uppercase block">{p.valorRecompensa}</span>
                                                </div>
                                                {p.tipoIncentivo ? (
                                                    <div className="bg-amber-50/50 rounded-2xl p-3 border border-amber-100/50">
                                                        <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest block leading-none mb-1">Gana tu Amigo:</span>
                                                        <span className="text-[11px] font-black text-amber-600 leading-tight uppercase block">{p.valorIncentivo}</span>
                                                    </div>
                                                ) : (
                                                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 flex items-center justify-center">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Doble Premio</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Mis Premios Ganados */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 pl-2">
                                <Award size={14} style={{ color: primaryColor }} />
                                Recompensas Ganadas
                            </h3>

                            {meData.premios.length === 0 ? (
                                <div className="bg-white border border-slate-100 rounded-3xl p-6 text-center shadow-sm">
                                    <p className="text-slate-400 text-xs font-semibold leading-relaxed">
                                        ¿Aún no tienes premios? ¡Comparte tu código para empezar a ganar!
                                    </p>
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

                        {/* Top Rankings de Embajadores (Ranking del Negocio) */}
                        {meData.progresoCampañas.some((c: any) => c.rankingActivo) && (
                            <div className="bg-white border border-slate-100 rounded-[2.5rem] p-5 shadow-sm space-y-4">
                                <div className="flex items-center gap-2 border-b border-slate-150 pb-3">
                                    <Users size={16} className="text-purple-500" />
                                    <h4 className="text-xs font-black uppercase tracking-tight text-slate-900">Historial del Club</h4>
                                </div>
                                <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                                    <span className="flex items-center gap-1.5">
                                        <Heart size={12} className="text-rose-500" />
                                        Total referidos completados:
                                    </span>
                                    <span className="font-black text-slate-900">{meData.totalReferidosValidos} personas</span>
                                </div>
                            </div>
                        )}

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
