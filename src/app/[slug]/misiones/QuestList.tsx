'use client';

import React, { useState, useEffect } from 'react';
import { 
    Award, 
    Sparkles, 
    CalendarRange, 
    Clock, 
    Instagram, 
    Users, 
    Cake, 
    Crown, 
    CheckCircle2, 
    Flame, 
    Lock,
    Search,
    Trophy,
    Copy,
    Share2,
    Gift,
    Coins,
    QrCode,
    ChevronRight,
    Star,
    ChevronLeft,
    HelpCircle,
    ArrowRight,
    Percent,
    Zap,
    Target
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Quest {
    id: string;
    nombre: string;
    descripcion: string;
    imagenUrl?: string;
    icono: string;
    color: string;
    campaignId: string;
    campañaNombre: string;
    fechaInicio?: string;
    fechaFin?: string;
    validacionTipo: string;
    progresoActual: number;
    progresoRequerido: number;
    estado: 'EN_PROGRESO' | 'PENDIENTE_APROBACION' | 'COMPLETADA' | 'RECLAMADA';
    fechaCompletada?: string;
    recompensas: string[];
}

interface GamificationData {
    level: {
        nombre: string;
        xpTotal: number;
        puntosTier: number;
        siguienteNivelXP: number;
        progresoXP: number;
    };
    badges: {
        id: string;
        nombre: string;
        descripcion: string;
        icono: string;
        color: string;
    }[];
    streak: number;
}

interface ReferralData {
    nombreCliente: string;
    nombre?: string;
    puntos: number;
    codigo: string;
    avatarUrl?: string;
    progresoCampañas: any[];
    recompensasGanadas: any[];
}

interface LoyaltyReward {
    id: string;
    nombre: string;
    descripcion?: string;
    costoPuntos: number;
    imagenUrl?: string;
}

interface QuestListProps {
    slug: string;
    primaryColor: string;
    textColor: string;
    negocioNombre?: string;
}

const IconMapper: Record<string, any> = {
    Sparkles: Sparkles,
    CalendarRange: CalendarRange,
    Clock: Clock,
    Instagram: Instagram,
    Users: Users,
    Cake: Cake,
    Crown: Crown,
    Award: Award,
    Gift: Gift,
    Star: Star,
    Target: Target,
    Zap: Zap,
    Flame: Flame,
    Trophy: Trophy,
    Calendar: CalendarRange,
};

export default function QuestList({ slug, primaryColor, textColor, negocioNombre = 'CitiOx' }: QuestListProps) {
    const router = useRouter();
    const [quests, setQuests] = useState<Quest[]>([]);
    const [gamification, setGamification] = useState<GamificationData | null>(null);
    const [activeTab, setActiveTab] = useState<'todas' | 'enProgreso' | 'completadas'>('todas');
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [celebrateQuest, setCelebrateQuest] = useState<string | null>(null);

    // Referidos y Premios
    const [referralData, setReferralData] = useState<any | null>(null);
    const [loyaltyRewards, setLoyaltyRewards] = useState<LoyaltyReward[]>([]);
    const [copied, setCopied] = useState(false);
    const [showQr, setShowQr] = useState(false);
    const [redeemLoading, setRedeemLoading] = useState<string | null>(null);
    const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
    const [manualReferralCode, setManualReferralCode] = useState('');
    const [manualReferralSubmitLoading, setManualReferralSubmitLoading] = useState(false);

    // Cargar misiones
    const fetchQuests = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/public/${slug}/misiones`);
            const data = await res.json();
            if (data.success) {
                setQuests(data.todas || []);
                setGamification(data.gamification || null);
            }
        } catch (e) {
            console.error('Error fetching quests:', e);
        } finally {
            setLoading(false);
        }
    };

    // Cargar datos de referidos
    const fetchReferralData = async () => {
        try {
            const res = await fetch(`/api/${slug}/referrals/me`);
            if (res.ok) {
                const data = await res.json();
                setReferralData(data);
            }
        } catch (e) {
            console.error('No referral session active.');
        }

        // Siempre intentar cargar los premios públicos disponibles
        try {
            const rRes = await fetch(`/api/public/${slug}/loyalty/rewards`);
            if (rRes.ok) {
                const rData = await rRes.json();
                setLoyaltyRewards(rData || []);
            }
        } catch (e) {
            console.error('Error fetching loyalty rewards:', e);
        }
    };

    useEffect(() => {
        fetchQuests();
        fetchReferralData();
    }, [slug]);

    // Confirmar misión del usuario
    const handleConfirmQuest = async (questId: string) => {
        try {
            const res = await fetch(`/api/public/${slug}/misiones/${questId}/confirmar`, {
                method: 'POST'
            });
            const data = await res.json();
            if (data.success) {
                setCelebrateQuest(questId);
                setTimeout(() => {
                    setCelebrateQuest(null);
                    fetchQuests();
                }, 3000);
            }
        } catch (e) {
            console.error('Error confirming quest:', e);
        }
    };

    const handleRedeemReward = async (reward: LoyaltyReward) => {
        if (!confirm(`¿Canjear "${reward.nombre}" por ${reward.costoPuntos} puntos?`)) return;
        setRedeemLoading(reward.id);
        try {
            const res = await fetch(`/api/public/${slug}/loyalty/rewards`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rewardId: reward.id })
            });
            const data = await res.json();
            if (res.ok) {
                alert('¡Canje exitoso! Preséntate en recepción para reclamar tu premio.');
                fetchReferralData();
            } else {
                alert(data.error || 'Error al canjear.');
            }
        } catch (e) {
            alert('Error de conexión.');
        } finally {
            setRedeemLoading(null);
        }
    };
    const handleRegisterReferralCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualReferralCode.trim()) return;
        setManualReferralSubmitLoading(true);
        try {
            const res = await fetch(`/api/${slug}/referrals/code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ codigoReferido: manualReferralCode })
            });
            const data = await res.json();
            if (res.ok) {
                alert(`¡Código registrado! Fuiste referido por ${data.referidoPor || 'tu amigo'}.`);
                setIsReferralModalOpen(false);
                setManualReferralCode('');
                fetchReferralData();
            } else {
                alert(data.error || 'Error al registrar código.');
            }
        } catch {
            alert('Error de conexión.');
        } finally {
            setManualReferralSubmitLoading(false);
        }
    };

    const getReferralUrl = () => {
        if (typeof window !== 'undefined' && referralData?.codigo) {
            return `${window.location.origin}/r/${referralData.codigo}`;
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
        if (url && navigator.share) {
            await navigator.share({ title: '¡Únete y gana!', url });
        } else {
            handleCopy();
        }
    };

    const getTabFilteredQuests = () => {
        if (activeTab === 'todas') return quests;
        if (activeTab === 'enProgreso') {
            return quests.filter(q => q.estado === 'EN_PROGRESO' || q.estado === 'PENDIENTE_APROBACION');
        }
        return quests.filter(q => q.estado === 'COMPLETADA' || q.estado === 'RECLAMADA');
    };

    const filteredQuests = getTabFilteredQuests().filter(q => 
        q.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
        q.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getInitials = (name: string) => {
        if (!name) return 'C';
        return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    };

    // Status badge color
    const getStatusStyle = (estado: string) => {
        if (estado === 'COMPLETADA' || estado === 'RECLAMADA') return { bg: '#dcfce7', text: '#16a34a', label: '✓ Completado' };
        if (estado === 'PENDIENTE_APROBACION') return { bg: '#fef9c3', text: '#ca8a04', label: '⏳ En revisión' };
        return { bg: `${primaryColor}15`, text: primaryColor, label: 'En progreso' };
    };

    return (
        <div className="w-full">
            {/* ===== HEADER CON DISEÑO PREMIUM ===== */}
            <div 
                className="relative overflow-hidden text-white rounded-b-[2.5rem] px-4 pt-5 pb-14 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.18)]"
                style={{ background: `linear-gradient(145deg, ${primaryColor} 0%, color-mix(in srgb, ${primaryColor}, #000 30%) 100%)` }}
            >
                {/* Círculos decorativos de fondo */}
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
                <div className="absolute top-16 -right-6 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />

                {/* Navegación */}
                <div className="flex items-center justify-between mb-5">
                    <button 
                        onClick={() => router.push(`/${slug}`)}
                        className="w-9 h-9 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center text-white active:scale-95 transition-transform border-0 cursor-pointer"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <h2 className="text-[10px] font-black uppercase tracking-widest text-white/90">
                        Club de Recompensas · {negocioNombre}
                    </h2>
                    <button 
                        onClick={() => alert(`Bienvenido al Club de Recompensas de ${negocioNombre}. Completa desafíos para ganar puntos y canjearlos por premios únicos.`)}
                        className="w-9 h-9 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center text-white active:scale-95 transition-transform border-0 cursor-pointer"
                    >
                        <HelpCircle size={18} />
                    </button>
                </div>

                {/* Texto principal */}
                <div className="relative z-10 max-w-[65%] space-y-1">
                    <h1 className="text-[22px] font-black uppercase leading-tight tracking-tight">
                        Club de<br/>Recompensas
                    </h1>
                    <p className="text-[9px] text-white/75 font-bold uppercase tracking-wider leading-snug">
                        Completa desafíos y obtén premios<br/>exclusivos al instante.
                    </p>
                </div>

                {/* Imagen 3D del regalo — PNG sin fondo */}
                <img 
                    src="/images/3d_gift_box.png" 
                    alt="Premio 3D" 
                    className="absolute right-0 bottom-0 w-36 h-36 object-contain pointer-events-none z-10 drop-shadow-2xl animate-[float_4s_ease-in-out_infinite]"
                    style={{ filter: 'drop-shadow(0 12px 20px rgba(0,0,0,0.25))' }}
                />

                <style dangerouslySetInnerHTML={{__html: `
                    @keyframes float {
                        0%   { transform: translateY(0px) rotate(0deg) scale(1); }
                        50%  { transform: translateY(-8px) rotate(2deg) scale(1.02); }
                        100% { transform: translateY(0px) rotate(0deg) scale(1); }
                    }
                    @keyframes shimmer {
                        0%   { background-position: -200% center; }
                        100% { background-position: 200% center; }
                    }
                    .progress-shimmer {
                        background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%);
                        background-size: 200% 100%;
                        animation: shimmer 2s infinite;
                    }
                `}} />
            </div>

            {/* ===== CONTENIDO PRINCIPAL — padding reducido ===== */}
            <div className="max-w-md mx-auto px-3 -mt-10 space-y-5 relative z-20">

                {/* ===== REQUERIR INICIO DE SESIÓN SI NO ESTÁ AUTENTICADO ===== */}
                {!referralData && (
                    <section className="bg-white rounded-[2rem] border border-slate-100/80 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.06)] text-center space-y-4">
                        <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center mx-auto" style={{ color: primaryColor }}>
                            <Lock size={28} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Inicio de Sesión Requerido</h3>
                            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                                Inicia sesión con tu número de teléfono para ver tus puntos acumulados, canjear premios y acceder a tus cupones de descuento.
                            </p>
                        </div>
                        <button
                            onClick={() => router.push(`/${slug}/perfil`)}
                            className="w-full py-3.5 text-[10px] font-black uppercase tracking-widest rounded-2xl text-white shadow-md active:scale-95 transition-transform cursor-pointer border-0"
                            style={{ backgroundColor: primaryColor }}
                        >
                            Acceder al Club de Recompensas
                        </button>
                    </section>
                )}
                {referralData && (
                    <div className="space-y-5">
                        {/* ===== TARJETA DE PERFIL ===== */}
                        <section className="bg-white rounded-[2rem] border border-slate-100/80 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.06)] space-y-3.5">
                            {/* Fila superior */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {/* Avatar con foto si existe, sino iniciales */}
                                    <div className="relative">
                                        {referralData.avatarUrl ? (
                                            <img
                                                src={referralData.avatarUrl}
                                                alt={referralData.nombreCliente || 'Cliente'}
                                                className="w-12 h-12 rounded-full object-cover border-2 shadow-md"
                                                style={{ borderColor: primaryColor }}
                                            />
                                        ) : (
                                            <div
                                                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-sm shadow-md border-2 border-white"
                                                style={{ background: `linear-gradient(135deg, ${primaryColor}, color-mix(in srgb, ${primaryColor}, #000 20%))` }}
                                            >
                                                {getInitials(referralData.nombreCliente || referralData.nombre || 'C')}
                                            </div>
                                        )}
                                        {/* Indicador online */}
                                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white" />
                                    </div>

                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 leading-none">
                                            Hola, {referralData.nombreCliente || referralData.nombre || 'Cliente'} 👋
                                        </p>
                                        <div className="flex items-baseline gap-1 mt-1">
                                            <span className="text-2xl font-black leading-none" style={{ color: primaryColor }}>{referralData.puntos}</span>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">pts</span>
                                        </div>
                                    </div>
                                </div>

                                {/* QR */}
                                <button
                                    onClick={() => setShowQr(v => !v)}
                                    className="w-10 h-10 rounded-2xl border border-slate-100 text-slate-500 active:scale-95 transition-transform cursor-pointer bg-slate-50 flex items-center justify-center hover:bg-slate-100"
                                >
                                    <QrCode size={18} />
                                </button>
                            </div>

                            {/* QR inline */}
                            {showQr && referralData.codigo && (
                                <div className="flex flex-col items-center gap-3 py-4 border-t border-slate-100/80">
                                    <QRCodeSVG value={getReferralUrl()} size={130} fgColor={primaryColor} />
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Código: {referralData.codigo}</span>
                                </div>
                            )}

                            {/* Indicador de referido o botón para registrar referido */}
                            <div className="border-t border-slate-100/60 pt-3">
                                {referralData.referidoPorNombre ? (
                                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                                        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">
                                            Te recomendó: <span className="font-extrabold text-slate-800">{referralData.referidoPorNombre}</span>
                                        </span>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setIsReferralModalOpen(true)}
                                        className="w-full py-3 bg-slate-50 border border-dashed border-slate-300 hover:bg-slate-100 text-slate-700 rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 text-[9px] font-black uppercase tracking-wider"
                                    >
                                        <Sparkles size={14} className="text-amber-500" />
                                        ¿Te recomendó un amigo? Ingresa su código
                                    </button>
                                )}
                            </div>

                            {/* Enlace de referidos */}
                            {referralData.codigo && (
                                <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-3 flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-1">Tu enlace de referidos</span>
                                        <span className="text-xs font-black text-slate-700 truncate block">r/{referralData.codigo}</span>
                                    </div>
                                    <div className="flex gap-1.5 shrink-0">
                                        <button
                                            onClick={handleCopy}
                                            className="px-2.5 py-2 rounded-xl border border-slate-200 text-slate-600 active:scale-95 transition-transform cursor-pointer bg-white flex items-center gap-1 text-[8px] font-black uppercase tracking-widest"
                                        >
                                            {copied ? <CheckCircle2 size={12} className="text-green-500" /> : <Copy size={12} />}
                                            Copiar
                                        </button>
                                        <button
                                            onClick={handleShare}
                                            className="px-2.5 py-2 rounded-xl text-white active:scale-95 transition-transform cursor-pointer shadow-sm flex items-center gap-1 text-[8px] font-black uppercase tracking-widest"
                                            style={{ backgroundColor: primaryColor }}
                                        >
                                            <Share2 size={12} />
                                            Compartir
                                        </button>
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* ===== SECCIÓN CUPONES ACTIVOS ===== */}
                        {referralData?.cupones && referralData.cupones.length > 0 && (
                            <section className="space-y-3">
                                <div className="flex justify-between items-center px-0.5">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                                        <Percent size={13} style={{ color: primaryColor }} /> Cupones y Descuentos
                                    </h3>
                                </div>
                                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory -mx-1 px-1">
                                    {referralData.cupones.map((coupon: any) => {
                                        const handleShareCoupon = async () => {
                                            const shareText = `¡Usa mi cupón descuento "${coupon.codigo}" en ${negocioNombre || 'CitiOx'} para obtener un beneficio increíble! 🎁✨`;
                                            if (navigator.share) {
                                                await navigator.share({
                                                    title: 'Cupón de Regalo',
                                                    text: shareText,
                                                    url: window.location.origin + `/${slug}`
                                                }).catch(() => {});
                                            } else {
                                                navigator.clipboard.writeText(`${shareText}\n${window.location.origin}/${slug}`);
                                                alert('¡Texto del cupón copiado al portapapeles!');
                                            }
                                        };
                                        return (
                                            <div
                                                key={coupon.id}
                                                className="w-[180px] shrink-0 bg-white border border-slate-100 rounded-3xl p-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between snap-start"
                                            >
                                                <div>
                                                    <span
                                                        className="text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg text-white shadow-sm inline-block mb-2"
                                                        style={{ backgroundColor: primaryColor }}
                                                    >
                                                        {coupon.tipo === 'PORCENTAJE' ? `${coupon.valor}% OFF` : `$${coupon.valor} OFF`}
                                                    </span>
                                                    <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-tight line-clamp-1">
                                                        {coupon.codigo}
                                                    </h5>
                                                    <p className="text-[8px] text-slate-400 font-semibold mt-1 leading-snug line-clamp-2">
                                                        {coupon.descripcion || `Obtén descuento ingresando este código en tu próxima reserva.`}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={handleShareCoupon}
                                                    className="w-full mt-3 py-2 text-[8px] font-black uppercase tracking-widest rounded-xl text-white shadow-sm border-0 cursor-pointer flex items-center justify-center gap-1"
                                                    style={{ backgroundColor: primaryColor }}
                                                >
                                                    <Share2 size={10} /> Compartir
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {/* ===== SECCIÓN PREMIOS CANJEABLES ===== */}
                        {loyaltyRewards.length > 0 && (
                            <section className="space-y-3">
                                {/* Header */}
                                <div className="flex justify-between items-center px-0.5">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                                        <Gift size={13} style={{ color: primaryColor }} /> Canjea tus puntos
                                    </h3>
                                    <Link
                                        href={`/${slug}/misiones/premios`}
                                        className="text-[10px] font-black uppercase tracking-widest hover:opacity-80 transition-opacity no-underline ml-auto"
                                        style={{ color: primaryColor }}
                                    >
                                        Ver catálogo completo &rsaquo;
                                    </Link>
                                </div>
                                {/* Carrusel horizontal de premios */}
                                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory -mx-1 px-1">
                                    {loyaltyRewards.map(reward => {
                                        const tienePuntos = (referralData?.puntos || 0) >= reward.costoPuntos;
                                        return (
                                            <div
                                                key={reward.id}
                                                className="w-[148px] shrink-0 bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.04)] flex flex-col snap-start"
                                            >
                                                {/* Imagen del premio */}
                                                <div className="relative w-full h-28 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center overflow-hidden">
                                                    {reward.imagenUrl ? (
                                                        <img
                                                            src={reward.imagenUrl}
                                                            alt={reward.nombre}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <Gift size={32} style={{ color: primaryColor, opacity: 0.4 }} />
                                                    )}
                                                    {/* Badge de puntos */}
                                                    <span
                                                        className="absolute top-2 left-2 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg text-white shadow-sm"
                                                        style={{ backgroundColor: primaryColor }}
                                                    >
                                                        {reward.costoPuntos} pts
                                                    </span>
                                                </div>
                                                <div className="p-3 flex flex-col gap-2 flex-1">
                                                    <h5 className="text-[10px] font-black text-slate-800 leading-tight line-clamp-2 uppercase tracking-tight">
                                                        {reward.nombre}
                                                    </h5>
                                                    <button
                                                        onClick={() => handleRedeemReward(reward)}
                                                        disabled={!tienePuntos || redeemLoading === reward.id}
                                                        className="w-full py-2 text-[8px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer disabled:opacity-40 text-white shadow-sm shrink-0 border-0 mt-auto"
                                                        style={{ backgroundColor: tienePuntos ? primaryColor : '#94a3b8' }}
                                                    >
                                                        {redeemLoading === reward.id ? '...' : 'Canjear'}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {/* ===== SECCIÓN DESAFÍOS DEL CLUB ===== */}
                        <section className="space-y-3 pb-4">
                            <div className="flex items-center px-0.5">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                                    <Trophy size={13} style={{ color: primaryColor }} /> Desafíos del Club
                                </h3>
                            </div>

                            {loading ? (
                                <div className="space-y-3">
                                    {[1,2].map(i => (
                                        <div key={i} className="bg-white rounded-[1.5rem] border border-slate-100 p-4 space-y-3 animate-pulse">
                                            <div className="flex gap-3">
                                                <div className="w-12 h-12 rounded-2xl bg-slate-100" />
                                                <div className="flex-1 space-y-2">
                                                    <div className="h-3 bg-slate-100 rounded-full w-3/4" />
                                                    <div className="h-2.5 bg-slate-100 rounded-full w-1/2" />
                                                </div>
                                            </div>
                                            <div className="h-2 bg-slate-100 rounded-full" />
                                        </div>
                                    ))}
                                </div>
                            ) : quests.length === 0 ? (
                                <div className="bg-white border border-slate-100 rounded-3xl p-8 text-center shadow-sm space-y-3">
                                    <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto" style={{ backgroundColor: `${primaryColor}12` }}>
                                        <Trophy size={24} style={{ color: primaryColor }} />
                                    </div>
                                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">
                                        No hay desafíos disponibles por ahora.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {quests.slice(0, 3).map(q => {
                                        const IconComponent = IconMapper[q.icono] || Award;
                                        const pct = Math.min(100, (q.progresoActual / q.progresoRequerido) * 100);
                                        const isCelebrating = celebrateQuest === q.id;
                                        const statusStyle = getStatusStyle(q.estado);
                                        const isComplete = q.estado === 'COMPLETADA' || q.estado === 'RECLAMADA';

                                        return (
                                            <div
                                                key={q.id}
                                                onClick={() => router.push(`/${slug}/misiones/detalle/${q.id}`)}
                                                className={`relative rounded-[1.75rem] overflow-hidden cursor-pointer transition-all duration-200 active:scale-[0.98] hover:shadow-xl ${
                                                    isCelebrating
                                                        ? 'shadow-[0_0_0_2px_#22c55e]'
                                                        : 'shadow-[0_4px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.1)]'
                                                }`}
                                            >
                                                {/* Fondo degradado sutil */}
                                                <div
                                                    className="absolute inset-0 opacity-[0.04]"
                                                    style={{ background: `linear-gradient(135deg, ${q.color} 0%, transparent 60%)` }}
                                                />

                                                <div className="relative bg-white p-4 space-y-3">
                                                    {/* Celebration overlay */}
                                                    {isCelebrating && (
                                                        <div className="absolute inset-0 bg-green-50/90 backdrop-blur-[1px] flex items-center justify-center z-20 rounded-[1.75rem]">
                                                            <div className="text-center animate-bounce">
                                                                <span className="text-3xl">🎉</span>
                                                                <p className="font-black text-green-600 text-[10px] uppercase tracking-widest mt-1">¡Desafío Completado!</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Row principal */}
                                                    <div className="flex items-start gap-3">
                                                        {/* Icono */}
                                                        <div
                                                            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
                                                            style={{
                                                                background: `linear-gradient(135deg, ${q.color}22 0%, ${q.color}10 100%)`,
                                                                color: q.color
                                                            }}
                                                        >
                                                            <IconComponent size={20} />
                                                        </div>

                                                        {/* Info */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-tight leading-tight line-clamp-1">
                                                                    {q.nombre}
                                                                </h4>
                                                                {/* Status badge */}
                                                                <span
                                                                    className="text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap border"
                                                                    style={{
                                                                        color: statusStyle.text,
                                                                        backgroundColor: statusStyle.bg,
                                                                        borderColor: `${statusStyle.text}20`
                                                                    }}
                                                                >
                                                                    {statusStyle.label}
                                                                </span>
                                                            </div>
                                                            <p className="text-[9px] text-slate-400 font-semibold leading-snug mt-0.5 line-clamp-2">
                                                                {q.descripcion}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Recompensas */}
                                                    {q.recompensas.length > 0 && (
                                                        <div className="flex flex-wrap gap-2 pt-1">
                                                            {q.recompensas.slice(0, 3).map((r, i) => (
                                                                <span
                                                                    key={i}
                                                                    className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-xl shadow-sm border"
                                                                    style={{
                                                                        backgroundColor: `${primaryColor}10`,
                                                                        color: primaryColor,
                                                                        borderColor: `${primaryColor}20`
                                                                    }}
                                                                >
                                                                    <Gift size={11} className="text-pink-500" style={{ color: primaryColor }} />
                                                                    Ganarás: {r}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Barra de progreso */}
                                                    <div className="space-y-1.5">
                                                        <div className="relative w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full rounded-full transition-all duration-700 relative overflow-hidden"
                                                                style={{ width: `${pct}%`, backgroundColor: q.color }}
                                                            >
                                                                {pct > 15 && <div className="progress-shimmer absolute inset-0 rounded-full" />}
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                                                {isComplete ? '¡Completado!' : 'Progreso'}
                                                            </span>
                                                            <span className="text-[8px] font-black" style={{ color: q.color }}>
                                                                {q.progresoActual} / {q.progresoRequerido}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Acción si es manual */}
                                                    {q.estado === 'EN_PROGRESO' && q.validacionTipo === 'USUARIO' && (
                                                        <div className="flex justify-end pt-0.5">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleConfirmQuest(q.id);
                                                                }}
                                                                className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-white rounded-xl shadow-sm border-0 cursor-pointer active:scale-95 transition-transform"
                                                                style={{ backgroundColor: primaryColor }}
                                                            >
                                                                ✓ Hacer Desafío
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Botón "Ver todos" */}
                                    <Link
                                        href={`/${slug}/misiones/estado`}
                                        className="w-full py-3.5 bg-white border border-slate-100 hover:bg-slate-50 active:scale-[0.98] transition-all rounded-[1.5rem] flex items-center justify-center gap-2 shadow-sm no-underline cursor-pointer"
                                    >
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Ver todos los desafíos</span>
                                        <ArrowRight size={13} style={{ color: primaryColor }} />
                                    </Link>
                                </div>
                            )}
                        </section>
                    </div>
                )}
            </div>

            {/* MODAL: REGISTRAR CÓDIGO DE REFERIDO MANUAL */}
            {isReferralModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <form onSubmit={handleRegisterReferralCode} className="bg-white border border-slate-150 rounded-[2rem] w-full max-w-sm shadow-2xl p-6 relative">
                        <button 
                            type="button" 
                            onClick={() => setIsReferralModalOpen(false)} 
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 font-bold cursor-pointer text-lg bg-transparent border-0"
                        >
                            ×
                        </button>
                        <div className="text-center space-y-2 mb-5">
                            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto text-amber-500">
                                <Sparkles size={24} />
                            </div>
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Ingresar Código de Referido</h3>
                            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                                Ingresa el código único del amigo que te recomendó {negocioNombre} para participar en las campañas de referidos.
                            </p>
                        </div>
                        <div className="space-y-4 mb-5">
                            <div>
                                <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Código de Referido</label>
                                <input
                                    type="text"
                                    value={manualReferralCode}
                                    onChange={e => setManualReferralCode(e.target.value)}
                                    className="w-full px-4 py-3 rounded-2xl border border-slate-150 text-xs font-black uppercase text-center text-slate-800 bg-slate-50 focus:outline-none focus:border-slate-300 placeholder:normal-case"
                                    placeholder="Ej. CARLO707"
                                    required
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                type="button" 
                                onClick={() => setIsReferralModalOpen(false)} 
                                className="flex-1 py-3 border border-slate-150 rounded-2xl text-[9px] font-black uppercase tracking-widest text-slate-500 cursor-pointer bg-white"
                                disabled={manualReferralSubmitLoading}
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit" 
                                className="flex-1 py-3 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest hover:opacity-90 cursor-pointer border-0"
                                style={{ backgroundColor: primaryColor }}
                                disabled={manualReferralSubmitLoading}
                            >
                                {manualReferralSubmitLoading ? 'Procesando...' : 'Validar Código'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
