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

    Gift,
    Coins,
    QrCode,
    ChevronRight,
    Star,
    ChevronLeft,
    Ticket,
    HelpCircle,
    ArrowRight,
    Percent,
    Zap,
    Target,
    Gem,
    Shield,
    X,
    Check,
    RefreshCw
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
    tipo?: string;
    serviceId?: string;
    Service?: any;
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
    Gem: Gem,
    Shield: Shield
};

export default function QuestList({ slug, primaryColor, textColor, negocioNombre = 'CitiOx' }: QuestListProps) {
    const router = useRouter();
    const [quests, setQuests] = useState<Quest[]>([]);
    const [gamification, setGamification] = useState<GamificationData | null>(null);
    const [activeTab, setActiveTab] = useState<'todas' | 'enProgreso' | 'completadas'>('todas');
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [celebrateQuest, setCelebrateQuest] = useState<string | null>(null);

    // Modales y Animaciones del Club de Beneficios (Niveles y Temporadas)
    const [showMapModal, setShowMapModal] = useState(false);
    const [showLevelAnimation, setShowLevelAnimation] = useState(false);
    const [showSeasonModal, setShowSeasonModal] = useState(false);
    const [levelAnimData, setLevelAnimData] = useState<any>(null);
    const [seasonModalData, setSeasonModalData] = useState<any>(null);

    // Referidos y Premios
    const [referralData, setReferralData] = useState<any | null>(null);
    const [loyaltyRewards, setLoyaltyRewards] = useState<LoyaltyReward[]>([]);
    const [copied, setCopied] = useState(false);
    const [showQr, setShowQr] = useState(false);
    const [showQrModal, setShowQrModal] = useState(false);
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
            const res = await fetch(`/api/${slug}/referrals/me?t=${Date.now()}`);
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

    const handleCloseLevelAnimation = async () => {
        setShowLevelAnimation(false);
        try {
            await fetch(`/api/public/${slug}/loyalty/ver-nivel`, { method: 'POST' });
            fetchQuests();
        } catch (e) {
            console.error('Error marking level as seen:', e);
        }
    };

    const handleCloseSeasonModal = async () => {
        setShowSeasonModal(false);
        try {
            await fetch(`/api/public/${slug}/loyalty/ver-temporada`, { method: 'POST' });
            fetchQuests();
        } catch (e) {
            console.error('Error marking season as seen:', e);
        }
    };

    useEffect(() => {
        fetchQuests();
        fetchReferralData();
    }, [slug]);

    useEffect(() => {
        if (!gamification || !referralData) return;

        const loyalty = (gamification as any).loyaltyStatus;
        if (loyalty) {
            if (loyalty.mostrarAnimacionNivel) {
                setLevelAnimData(loyalty.nivelActual);
                setShowLevelAnimation(true);
            } else if (loyalty.mostrarModalTemporada) {
                setSeasonModalData(loyalty.temporadaActiva);
                setShowSeasonModal(true);
            }
        }
    }, [gamification, referralData]);

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
        if (!confirm(`¿Canjear "${reward.nombre}" por ${reward.costoPuntos} diamantes?`)) return;
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

    const loyalty = (gamification as any)?.loyaltyStatus;
    const lvl = loyalty?.nivelActual;
    const IconComp = lvl && IconMapper[lvl.icono] ? IconMapper[lvl.icono] : Award;

    return (
        <div className="w-full min-h-screen bg-[#f8fafc] pb-16 font-sans">
            {/* ===== HEADER CON DISEÑO PREMIUM ===== */}
            <div className="bg-[#f8fafc] px-[5px] pt-4 pb-3 flex items-center justify-between">
                <button 
                    onClick={() => router.push(`/${slug}`)}
                    className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-slate-700 active:scale-95 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-slate-100 cursor-pointer"
                >
                    <ChevronLeft size={18} className="stroke-[2.5]" />
                </button>
                <div className="flex items-center gap-1.5 justify-center">
                    <div className="size-6 bg-indigo-500 rounded-lg flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: primaryColor }}>
                        <Gem size={14} className="text-white" />
                    </div>
                    <h2 className="text-[12px] font-black uppercase tracking-widest text-slate-800">
                        Club de Fidelización
                    </h2>
                </div>
                <button 
                    onClick={() => alert(`Bienvenido al Club de Fidelización de ${negocioNombre}. Completa desafíos para ganar diamantes y canjearlos por premios únicos.`)}
                    className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-slate-700 active:scale-95 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-slate-100 cursor-pointer relative"
                >
                    <Clock size={16} />
                    {referralData?.cupones && referralData.cupones.length > 0 && (
                        <span className="absolute -top-1 -right-1 size-4 bg-rose-500 border border-white text-white rounded-full text-[8px] font-black flex items-center justify-center">
                            {referralData.cupones.length}
                        </span>
                    )}
                </button>
            </div>

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

            {/* ===== BIENVENIDA Y CONTENIDO PRINCIPAL ===== */}
            <div className="max-w-md mx-auto px-[5px] mt-2 space-y-4">
                {referralData && (
                    <div className="flex items-center justify-between gap-2 bg-[#f8fafc]">
                        {/* Izquierda: Avatar e Info */}
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="relative shrink-0">
                                {referralData.avatarUrl ? (
                                    <img
                                        src={referralData.avatarUrl}
                                        alt={referralData.nombreCliente || 'Cliente'}
                                        className="w-13 h-13 rounded-full object-cover border-[3px] shadow-md animate-[float_4s_ease-in-out_infinite]"
                                        style={{ borderColor: primaryColor }}
                                    />
                                ) : (
                                    <div
                                        className="w-13 h-13 rounded-full flex items-center justify-center text-white font-black text-sm shadow-md border-[3px] animate-[float_4s_ease-in-out_infinite]"
                                        style={{ 
                                            background: `linear-gradient(135deg, ${primaryColor}, color-mix(in srgb, ${primaryColor}, #000 20%))`,
                                            borderColor: primaryColor 
                                        }}
                                    >
                                        {getInitials(referralData.nombreCliente || referralData.nombre || 'C')}
                                    </div>
                                )}
                                <div 
                                    className="absolute -bottom-1.5 -right-1.5 size-6 rounded-full flex items-center justify-center text-white shadow-[0_2px_8px_rgba(0,0,0,0.15)] border-2 border-white" 
                                    style={{ backgroundColor: lvl ? lvl.color : primaryColor }}
                                    title={lvl ? `Rango: ${lvl.nombre}` : 'Rango'}
                                >
                                    <IconComp size={10} className="text-white fill-white/10 stroke-[2.5]" />
                                </div>
                            </div>

                            <div className="text-left space-y-0.5 min-w-0">
                                <h3 className="text-sm font-black text-slate-800 tracking-tight leading-none">
                                    ¡Hola, {referralData.nombreCliente || referralData.nombre || 'Cliente'}! 👋
                                </h3>
                                <p className="text-[9px] text-slate-400 font-semibold leading-tight line-clamp-2">
                                    Gana diamantes, completa misiones y obtén increíbles recompensas. ✨
                                </p>
                            </div>
                        </div>

                        {/* Derecha: Mini QR Card para Referir */}
                        {referralData.codigo && (
                            <div 
                                onClick={() => setShowQrModal(true)}
                                className="bg-white border border-slate-100/80 rounded-2xl p-2 flex flex-col items-center justify-center shrink-0 shadow-sm cursor-pointer hover:shadow-md active:scale-95 transition-all text-center max-w-[96px]"
                            >
                                <div className="p-1 bg-slate-50 rounded-xl relative">
                                    <QRCodeSVG value={getReferralUrl()} size={44} fgColor={primaryColor} />
                                    <div className="absolute inset-0 m-auto size-3 bg-white rounded-full flex items-center justify-center shadow-sm">
                                        <Gem size={8} className="fill-current" style={{ color: primaryColor }} />
                                    </div>
                                </div>
                                <span className="text-[6px] font-black text-white px-1.5 py-0.5 rounded-md mt-1 whitespace-nowrap" style={{ backgroundColor: primaryColor }}>
                                    REFERIR AMIGOS
                                </span>
                                <span className="text-[5px] text-slate-400 font-bold block leading-none mt-0.5 tracking-tight">
                                    Escanea y comparte tu código
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* ===== REQUERIR INICIO DE SESIÓN SI NO ESTÁ AUTENTICADO ===== */}
                {!referralData && (
                    <section className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.04)] text-center space-y-4">
                        <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center mx-auto" style={{ color: primaryColor }}>
                            <Lock size={28} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Inicio de Sesión Requerido</h3>
                            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                                Inicia sesión con tu número de teléfono para ver tus diamantes acumulados, canjear premios y acceder a tus cupones de descuento.
                            </p>
                        </div>
                        <button
                            onClick={() => router.push(`/${slug}/perfil`)}
                            className="w-full py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl text-white shadow-md active:scale-95 transition-transform cursor-pointer border-0"
                            style={{ backgroundColor: primaryColor }}
                        >
                            Acceder al Club de Recompensas
                        </button>
                    </section>
                )}
                {referralData && (
                    <div className="space-y-4">
                        {/* ===== 1. TARJETA DE BALANCE PRINCIPAL (DIAMANTES DISPONIBLES) ===== */}
                        <div className="relative overflow-hidden rounded-[2rem] p-4 text-white shadow-[0_16px_36px_rgba(79,70,229,0.12)] flex flex-col justify-between min-h-[118px]"
                            style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, color-mix(in srgb, ${primaryColor}, #000 45%) 100%)` }}
                        >
                            {/* Círculos decorativos de fondo */}
                            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
                            <div className="absolute top-16 -right-6 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />
                            
                            {/* Estrellas decorativas del fondo */}
                            <div className="absolute top-4 right-1/3 opacity-20"><Sparkles size={14} className="text-purple-300 animate-pulse" /></div>
                            <div className="absolute bottom-6 left-1/4 opacity-15"><Sparkles size={10} className="text-indigo-200 animate-bounce" /></div>

                            {(() => {
                                const hasCashback = referralData.cashback && referralData.cashback > 0;
                                return (
                                    <div className={hasCashback ? "grid grid-cols-2 gap-4" : "grid grid-cols-1"}>
                                        {/* Diamantes */}
                                        <div className="flex gap-3 items-center">
                                            <div className="size-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white shadow-sm shrink-0">
                                                <Gem size={18} className="text-white" />
                                            </div>
                                            <div className="text-left space-y-0.5">
                                                <span className="text-[7.5px] font-black text-white/70 uppercase tracking-widest block leading-none">
                                                    DIAMANTES
                                                </span>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-4xl font-black leading-none">{referralData.puntos.toLocaleString()}</span>
                                                    <span className="text-3xl block leading-none select-none">💎</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Cashback */}
                                        {hasCashback && (
                                            <div className="flex gap-3 items-center border-l border-white/15 pl-4">
                                                <div className="size-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white shadow-sm shrink-0">
                                                    <Coins size={18} className="text-white" />
                                                </div>
                                                <div className="text-left space-y-0.5">
                                                    <span className="text-[7.5px] font-black text-white/70 uppercase tracking-widest block leading-none">
                                                        SALDO CASHBACK
                                                    </span>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-4xl font-black leading-none">${(referralData.cashback || 0).toFixed(2)}</span>
                                                    </div>
                                                    <span className="text-[7px] text-white/70 font-semibold block mt-0.5">
                                                        Dinero acumulado
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            <div className="border-t border-white/10 pt-3 flex items-center justify-between text-[9px] font-bold text-white/80 uppercase tracking-wider">
                                <div className="flex items-center gap-1 text-[9px] font-black text-white/70">
                                    <HelpCircle size={10} className="stroke-[2.5]" />
                                    <span>Beneficios de lealtad activos</span>
                                </div>
                                <button
                                    onClick={() => router.push(`/${slug}/historial`)}
                                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border-0 cursor-pointer active:scale-95 transition-all text-[8px] font-black uppercase tracking-widest flex items-center gap-1"
                                >
                                    <Clock size={10} />
                                    Ver Historial
                                </button>
                            </div>
                        </div>

                        {/* ===== 2. TARJETA DE NIVEL DEL CLUB DE BENEFICIOS ===== */}
                        {gamification && (gamification as any).loyaltyStatus && (
                            (() => {
                                const loyalty = (gamification as any).loyaltyStatus;
                                const lvl = loyalty.nivelActual;
                                const nextLvl = loyalty.siguienteNivel;
                                const IconComp = lvl && IconMapper[lvl.icono] ? IconMapper[lvl.icono] : Award;
                                
                                return (
                                    <div className="bg-white rounded-[2rem] border border-slate-100/85 p-3.5 shadow-[0_10px_30px_rgba(0,0,0,0.03)] space-y-3.5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <div 
                                                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm animate-pulse"
                                                    style={{ backgroundColor: lvl ? lvl.color : primaryColor, boxShadow: `0 4px 12px ${lvl ? lvl.color : primaryColor}33` }}
                                                >
                                                    <IconComp size={18} className="stroke-[2.5]" />
                                                </div>
                                                <div className="text-left">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-1">TU RANGO ACTUAL</span>
                                                    <h4 className="text-[12px] font-black text-slate-800 uppercase tracking-wider leading-none">
                                                        NIVEL {lvl ? lvl.nombre.toUpperCase() : 'INICIAL'}
                                                    </h4>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setShowMapModal(true)}
                                                className="px-4 py-2.5 rounded-2xl border border-slate-100 text-indigo-650 active:scale-95 transition-all flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest cursor-pointer hover:bg-slate-50 border-0"
                                                style={{ color: primaryColor, backgroundColor: `${primaryColor}0c` }}
                                            >
                                                <Gift size={12} />
                                                Ver beneficios
                                            </button>
                                        </div>

                                        {/* Barra de progreso */}
                                        <div className="space-y-2 text-left">
                                            {/* Barra física */}
                                            <div className="h-3.5 bg-slate-100 rounded-full overflow-hidden relative border border-slate-200/20 p-0.5">
                                                <div 
                                                    className="h-full rounded-full transition-all duration-500 relative"
                                                    style={{ 
                                                        width: `${nextLvl ? nextLvl.progressPercent : 100}%`,
                                                        backgroundColor: lvl ? lvl.color : primaryColor,
                                                        boxShadow: `0 0 10px ${lvl ? lvl.color : primaryColor}66`
                                                    }}
                                                >
                                                    <div className="absolute inset-0 progress-shimmer rounded-full" />
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-baseline text-[8px] font-black uppercase tracking-wider text-slate-400">
                                                <span>{loyalty.experiencia || 0} diamantes acumulados</span>
                                                {nextLvl ? (
                                                    <span>Te faltan {nextLvl.diamondsNeeded} diamantes para {nextLvl.level.nombre.toUpperCase()}</span>
                                                ) : (
                                                    <span>¡Nivel Máximo alcanzado!</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()
                        )}

                        {/* ===== 3. EXPLORA TU CLUB (ACCESOS RÁPIDOS A 3 COLUMNAS) ===== */}
                        <div className="grid grid-cols-3 gap-2">
                            {/* Misiones */}
                            <div 
                                onClick={() => router.push(`/${slug}/misiones/estado`)}
                                className="bg-white border border-slate-100 rounded-[2rem] p-3 text-center flex flex-col items-center justify-between min-h-[110px] cursor-pointer hover:shadow-md transition-all active:scale-95 shadow-[0_4px_20px_rgba(0,0,0,0.02)]"
                            >
                                <div className="size-8.5 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
                                    <Target size={16} />
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-[9px] font-black text-slate-800 block">Misiones</span>
                                    <span className="text-[7px] text-slate-400 font-semibold block leading-tight">Completa y gana diamantes</span>
                                </div>
                                <span className="text-[7px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    IR AHORA &rsaquo;
                                </span>
                            </div>

                            {/* Premios */}
                            <div 
                                onClick={() => router.push(`/${slug}/misiones/premios`)}
                                className="bg-white border border-slate-100 rounded-[2rem] p-3 text-center flex flex-col items-center justify-between min-h-[110px] cursor-pointer hover:shadow-md transition-all active:scale-95 shadow-[0_4px_20px_rgba(0,0,0,0.02)]"
                            >
                                <div className="size-8.5 rounded-full bg-pink-50 flex items-center justify-center text-pink-500 shrink-0">
                                    <Gift size={16} />
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-[9px] font-black text-slate-800 block">Premios</span>
                                    <span className="text-[7px] text-slate-400 font-semibold block leading-tight">Catálogo de recompensas</span>
                                </div>
                                <span className="text-[7px] font-black text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    IR AHORA &rsaquo;
                                </span>
                            </div>

                            {/* Mis Recompensas */}
                            <Link 
                                href={`/${slug}/mis-premios`}
                                className="bg-white border border-slate-100 rounded-[2rem] p-3 text-center flex flex-col items-center justify-between min-h-[110px] cursor-pointer hover:shadow-md transition-all active:scale-95 no-underline block shadow-[0_4px_20px_rgba(0,0,0,0.02)]"
                            >
                                <div className="size-8.5 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0">
                                    <Shield size={16} />
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-[9px] font-black text-slate-800 block">Mis Premios</span>
                                    <span className="text-[7px] text-slate-400 font-semibold block leading-tight">Ya ganados</span>
                                </div>
                                <span className="text-[7px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    VER PREMIOS &rsaquo;
                                </span>
                            </Link>
                        </div>

                        {/* ===== 4. BANDA DE MIS PREMIOS DISPONIBLES ===== */}
                        {referralData && referralData.cupones && referralData.cupones.length > 0 && (
                            <Link 
                                href={`/${slug}/mis-premios`}
                                className="block bg-rose-50/50 hover:bg-rose-50 border border-rose-100 rounded-[2rem] p-3 flex items-center justify-between shadow-[0_4px_16px_rgba(244,63,94,0.03)] no-underline"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="size-11 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-500 shrink-0 shadow-inner">
                                        <Gift size={20} className="stroke-[2]" />
                                    </div>
                                    <div className="text-left space-y-0.5">
                                        <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wider leading-none">
                                            MIS PREMIOS DISPONIBLES
                                        </h4>
                                        <p className="text-[9px] text-slate-400 font-medium leading-none">
                                            Tienes <span className="text-rose-600 font-black">{referralData.cupones.length} cupones</span> listos para usar en tus citas.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[8px] bg-rose-500 hover:bg-rose-600 text-white font-black uppercase tracking-widest px-3 py-2 rounded-xl">
                                        VER MIS PREMIOS
                                    </span>
                                    <span className="size-7 rounded-full bg-white flex items-center justify-center text-rose-500 text-[11px] font-black border border-rose-100 shadow-sm shrink-0">
                                        {referralData.cupones.length}
                                    </span>
                                </div>
                            </Link>
                        )}

                        {/* ===== SECCIÓN PREMIOS CANJEABLES ===== */}
                        {loyaltyRewards.length > 0 && (
                            <section id="canje-puntos" className="space-y-3 scroll-mt-4">
                                {/* Header */}
                                <div className="flex justify-between items-center px-0.5">
                                    <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-800 flex items-center gap-1.5">
                                        🎁 CANJEA TUS DIAMANTES
                                    </h3>
                                    <Link
                                        href={`/${slug}/misiones/premios`}
                                        className="text-[9px] font-black uppercase tracking-widest hover:opacity-80 transition-opacity no-underline ml-auto text-pink-600"
                                        style={{ color: primaryColor }}
                                    >
                                        VER CATÁLOGO COMPLETO &rsaquo;
                                    </Link>
                                </div>
                                {/* Carrusel horizontal de premios */}
                                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory -mx-1 px-1">
                                    {loyaltyRewards.map(reward => {
                                        const tienePuntos = (referralData?.puntos || 0) >= reward.costoPuntos;
                                        const isCupon = reward.tipo === 'CUPON' || reward.nombre.toLowerCase().includes('cupon') || reward.nombre.toLowerCase().includes('cupón');
                                        const isCashback = reward.tipo === 'CASHBACK' || reward.nombre.toLowerCase().includes('cash') || reward.nombre.toLowerCase().includes('saldo') || reward.nombre.toLowerCase().includes('monedero');
                                        
                                        // Extraer monto de Cashback
                                        let cashVal = '$10';
                                        const cashMatch = reward.nombre.match(/\$\s*(\d+(\.\d+)?)/) || reward.nombre.match(/\b(\d+(\.\d+)?)\b/);
                                        if (cashMatch) {
                                            cashVal = `$${cashMatch[1]}`;
                                        }
                                        
                                        // Resolver imagen del servicio
                                        let serviceImgUrl = null;
                                        if (reward.Service) {
                                            const s = reward.Service;
                                            if (s.imageMedia?.key) {
                                                serviceImgUrl = `/api/media/${s.imageMedia.key}`;
                                            } else if (s.imageMedia?.url) {
                                                serviceImgUrl = s.imageMedia.url;
                                            } else if (s.Imagen && s.Imagen.length > 0) {
                                                serviceImgUrl = s.Imagen[0].url;
                                            }
                                        }

                                        // Extraer descuento
                                        let descVal = 'DTO';
                                        const numMatch = reward.nombre.match(/(\d+)\s*%/);
                                        if (numMatch) {
                                            descVal = `${numMatch[1]}%`;
                                        } else {
                                            const moneyMatch = reward.nombre.match(/\$\s*(\d+)/);
                                            if (moneyMatch) {
                                                descVal = `$${moneyMatch[1]}`;
                                            } else {
                                                const justNumMatch = reward.nombre.match(/\b(\d+)\b/);
                                                if (justNumMatch) {
                                                    descVal = `${justNumMatch[1]}%`;
                                                }
                                            }
                                        }

                                        return (
                                            <div
                                                key={reward.id}
                                                className="w-[148px] shrink-0 bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.04)] flex flex-col snap-start"
                                            >
                                                {/* Imagen del premio */}
                                                <div className="relative w-full h-28 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center overflow-hidden">
                                                    {(reward.imagenUrl || serviceImgUrl) ? (
                                                        <img
                                                            src={reward.imagenUrl || serviceImgUrl}
                                                            alt={reward.nombre}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : isCupon ? (
                                                        <div className="w-full h-full p-2 flex items-center justify-center bg-slate-50">
                                                            <div 
                                                                className="w-full h-full rounded-2xl relative overflow-hidden flex items-center shadow-xs border border-white/20"
                                                                style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, color-mix(in srgb, ${primaryColor}, #000 15%) 100%)` }}
                                                            >
                                                                {/* Círculos de troquelado */}
                                                                <div className="absolute -top-1.5 right-6 w-3 h-3 rounded-full bg-slate-50" />
                                                                <div className="absolute -bottom-1.5 right-6 w-3 h-3 rounded-full bg-slate-50" />
                                                                {/* Línea divisoria punteada */}
                                                                <div className="absolute top-1 bottom-1 right-[31px] w-0 border-r border-dashed border-white/40" />
                                                                
                                                                {/* Contenido Izquierdo */}
                                                                <div className="flex-1 flex flex-col justify-center items-center text-white px-1">
                                                                    <span className="text-[15px] font-black tracking-tighter leading-none">{descVal}</span>
                                                                    <span className="text-[6px] font-black uppercase tracking-widest opacity-80 mt-1">CUPÓN</span>
                                                                </div>
                                                                
                                                                {/* Contenido Derecho */}
                                                                <div className="w-7 shrink-0 flex items-center justify-center text-white">
                                                                    <Ticket size={12} className="rotate-90 opacity-70" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : isCashback ? (
                                                        <div className="w-full h-full p-2 flex items-center justify-center bg-slate-50">
                                                            <div 
                                                                className="w-full h-full rounded-2xl relative overflow-hidden flex flex-col justify-center items-center text-white shadow-xs border border-white/20"
                                                                style={{ background: `linear-gradient(135deg, #eab308 0%, #ca8a04 100%)` }}
                                                            >
                                                                {/* Círculos decorativos */}
                                                                <div className="absolute -top-6 -right-6 w-12 h-12 rounded-full bg-white/10 pointer-events-none" />
                                                                <div className="absolute -bottom-6 -left-6 w-10 h-10 rounded-full bg-white/10 pointer-events-none" />
                                                                
                                                                <div className="flex items-center gap-0.5">
                                                                    <Coins size={14} className="text-white/95 animate-bounce" />
                                                                    <span className="text-[17px] font-black tracking-tight leading-none">{cashVal}</span>
                                                                </div>
                                                                <span className="text-[6.5px] font-black uppercase tracking-widest opacity-90 mt-1">CASHBACK</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <img
                                                            src="/gift-icon.png"
                                                            alt="Premio"
                                                            className="w-16 h-16 object-contain drop-shadow-md"
                                                        />
                                                    )}
                                                    {/* Badge de diamantes */}
                                                    <span
                                                        className="absolute top-2 left-2 text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg text-white shadow-sm"
                                                        style={{ backgroundColor: primaryColor }}
                                                    >
                                                        {reward.costoPuntos} diamantes
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
                                                        {redeemLoading === reward.id ? '...' : 'CANJEAR'}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {/* ===== SECCIÓN DESAFÍOS DEL CLUB ===== */}
                        <section id="desafios-club" className="space-y-3 pb-4 scroll-mt-4">
                            <div className="flex items-center justify-between px-0.5">
                                <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-800 flex items-center gap-1.5">
                                    Misiones destacadas
                                </h3>
                                <Link
                                    href={`/${slug}/misiones/estado`}
                                    className="text-[9px] font-black text-indigo-600 hover:opacity-80 transition-opacity no-underline flex items-center gap-0.5"
                                    style={{ color: primaryColor }}
                                >
                                    Ver todas &rsaquo;
                                </Link>
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
                                <>
                                    <div className="space-y-3">
                                    {quests.filter(q => q.estado !== 'COMPLETADA' && q.estado !== 'RECLAMADA').slice(0, 3).map(q => {
                                        const IconComponent = IconMapper[q.icono] || Award;
                                        const pct = Math.min(100, (q.progresoActual / q.progresoRequerido) * 100);
                                        const isCelebrating = celebrateQuest === q.id;
                                        const recompensaRaw = q.recompensas[0] || '';
                                        const esCupon = recompensaRaw.toLowerCase().includes('cupón') || recompensaRaw.toLowerCase().includes('cupon') || recompensaRaw.toLowerCase().includes('descuento') || recompensaRaw.toLowerCase().includes('%') || recompensaRaw.toLowerCase().includes('dto');
                                        const valorRecompensa = recompensaRaw.replace(' diamantes', '').replace(' pts', '').replace(' puntos', '').replace(' Puntos', '').trim() || '100';
                                        const valorLimpio = valorRecompensa.replace(/^\++/, '').trim();

                                        return (
                                            <div
                                                key={q.id}
                                                onClick={() => router.push(`/${slug}/misiones/detalle/${q.id}`)}
                                                className={`relative bg-white border border-slate-100 rounded-[1.8rem] overflow-hidden cursor-pointer select-none active:scale-[0.98] transition-all duration-200 shadow-sm hover:shadow-md hover:border-slate-200 ${
                                                    isCelebrating ? 'ring-2 ring-green-300/50' : ''
                                                }`}
                                            >
                                                {/* Celebration overlay */}
                                                {isCelebrating && (
                                                    <div className="absolute inset-0 bg-green-50/90 backdrop-blur-[1px] flex items-center justify-center z-20">
                                                        <div className="text-center animate-bounce">
                                                            <span className="text-2xl">🎉</span>
                                                            <p className="font-black text-green-600 text-[9px] uppercase tracking-widest mt-1">¡Completado!</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Barra de color decorativa lateral */}
                                                <div
                                                    className="absolute left-0 top-0 bottom-0 w-1 rounded-l-full"
                                                    style={{ backgroundColor: q.color }}
                                                />

                                                {/* Contenido superior: Ícono + Nombre + Descripción + Progreso */}
                                                <div className="flex items-start gap-3.5 p-4 pl-5 pb-3">
                                                    {/* Ícono */}
                                                    <div
                                                        className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border"
                                                        style={{
                                                            backgroundColor: `${q.color}15`,
                                                            borderColor: `${q.color}25`,
                                                            color: q.color
                                                        }}
                                                    >
                                                        <IconComponent size={19} className="stroke-[2.2]" />
                                                    </div>

                                                    <div className="flex-1 min-w-0 space-y-1.5">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <h4 className="text-[12px] font-black text-slate-800 uppercase tracking-tight leading-tight line-clamp-1 flex-1">
                                                                {q.nombre}
                                                            </h4>
                                                            <ChevronRight size={14} className="text-slate-300 shrink-0 mt-0.5" />
                                                        </div>
                                                        <p className="text-[9.5px] text-slate-400 font-semibold leading-snug line-clamp-2">
                                                            {q.descripcion}
                                                        </p>

                                                        {/* Barra de progreso */}
                                                        <div className="flex items-center gap-2 pt-0.5">
                                                            <div className="relative flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full rounded-full transition-all duration-700 relative overflow-hidden"
                                                                    style={{ width: `${pct}%`, backgroundColor: q.color }}
                                                                >
                                                                    {pct > 15 && <div className="progress-shimmer absolute inset-0 rounded-full" />}
                                                                </div>
                                                            </div>
                                                            <span className="text-[8.5px] font-black text-slate-400 shrink-0 tabular-nums">
                                                                {q.progresoActual}/{q.progresoRequerido}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Premio en la parte inferior */}
                                                <div
                                                    className="mx-3 mb-3 px-3.5 py-2.5 rounded-2xl flex items-center justify-between gap-2"
                                                    style={{
                                                        backgroundColor: esCupon ? `${primaryColor}0d` : `${q.color}0d`,
                                                        borderWidth: 1,
                                                        borderStyle: 'dashed',
                                                        borderColor: esCupon ? `${primaryColor}30` : `${q.color}30`,
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {esCupon ? (
                                                            <span className="text-sm">🎟️</span>
                                                        ) : (
                                                            <Gem size={13} style={{ color: q.color }} className="fill-current shrink-0" />
                                                        )}
                                                        <span
                                                            className="text-[10px] font-black uppercase tracking-wide leading-none"
                                                            style={{ color: esCupon ? primaryColor : q.color }}
                                                        >
                                                            {recompensaRaw || `+${valorLimpio} pts`}
                                                        </span>
                                                    </div>
                                                    <span
                                                        className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg"
                                                        style={{
                                                            backgroundColor: esCupon ? `${primaryColor}18` : `${q.color}18`,
                                                            color: esCupon ? primaryColor : q.color
                                                        }}
                                                    >
                                                        Premio
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                    {/* Botón "Ver todos" */}
                                    <Link
                                        href={`/${slug}/misiones/estado`}
                                        className="w-full py-3.5 bg-white border border-slate-100 hover:bg-slate-50 active:scale-[0.98] transition-all rounded-[1.5rem] flex items-center justify-center gap-2 shadow-sm no-underline cursor-pointer"
                                    >
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Ver todos los desafíos</span>
                                        <ArrowRight size={13} style={{ color: primaryColor }} />
                                    </Link>

                                    {/* Banner Lavanda final */}
                                    <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-100/50 p-5 border border-indigo-100/40 flex items-center justify-between gap-4 mt-2">
                                        <div className="absolute top-2 right-1/4 opacity-10"><Sparkles size={16} className="text-indigo-500" /></div>
                                        <div className="absolute bottom-2 left-1/3 opacity-10"><Sparkles size={12} className="text-indigo-400" /></div>
                                        
                                        <div className="flex items-center gap-3">
                                            <div className="size-11 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-650 shrink-0 shadow-inner" style={{ color: primaryColor, backgroundColor: `${primaryColor}15` }}>
                                                <Trophy size={20} className="stroke-[2.5]" />
                                            </div>
                                            <div className="text-left space-y-0.5">
                                                <h4 className="text-[12px] font-black text-slate-800 uppercase tracking-tight leading-tight">
                                                    ¡Sigue así!
                                                </h4>
                                                <p className="text-[9px] text-slate-500 font-semibold leading-snug">
                                                    Cada punto te acerca a más<br/>recompensas increíbles.
                                                </p>
                                            </div>
                                        </div>

                                        <Link
                                            href={`/${slug}/misiones/premios`}
                                            className="px-4 py-2.5 rounded-2xl text-white font-black uppercase tracking-widest text-[8px] no-underline flex items-center justify-center active:scale-95 shadow-md shrink-0 whitespace-nowrap"
                                            style={{ backgroundColor: primaryColor }}
                                        >
                                            Ver catálogo
                                        </Link>
                                    </div>
                                </>
                            )}
                        </section>
                    </div>
                )}
            </div>
            {/* MODAL: QR DE REFERIDOS Y COMPARTIR */}
            {showQrModal && referralData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4 animate-[fadeIn_0.2s_ease-out]">
                    <div className="bg-white border border-slate-100 rounded-[2.5rem] w-full max-w-sm shadow-2xl p-6 relative flex flex-col items-center gap-4 text-center">
                        {/* Botón Cerrar */}
                        <button 
                            type="button" 
                            onClick={() => setShowQrModal(false)} 
                            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-650 cursor-pointer border-0"
                        >
                            ×
                        </button>

                        <div className="space-y-1">
                            <div className="size-11 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 mx-auto" style={{ backgroundColor: `${primaryColor}0c`, color: primaryColor }}>
                                <Gem size={20} />
                            </div>
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mt-2">Mi Código QR</h3>
                            <p className="text-[9px] text-slate-400 font-semibold max-w-[240px] mx-auto leading-normal">
                                Comparte tu enlace para que tus amigos ganen y tú acumules diamantes en sus citas.
                            </p>
                        </div>

                        {/* Código QR grande */}
                        <div className="p-3 bg-slate-50 rounded-[2rem] border border-slate-100 relative shadow-sm shrink-0">
                            <QRCodeSVG value={getReferralUrl()} size={140} fgColor={primaryColor} />
                            <div className="absolute inset-0 m-auto size-5 bg-white rounded-full flex items-center justify-center shadow-md">
                                <Gem size={10} className="fill-current" style={{ color: primaryColor }} />
                            </div>
                        </div>

                        {/* Código del usuario */}
                        <div className="space-y-1 w-full">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Código Único</span>
                            <div 
                                onClick={handleCopy}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-150 rounded-2xl cursor-pointer active:scale-95 transition-all text-slate-800"
                            >
                                <span className="text-base font-black tracking-widest">{referralData.codigo}</span>
                                <Copy size={14} className="text-slate-400" />
                            </div>
                            <span className="text-[6px] text-slate-400 font-bold block">
                                {copied ? '¡Copiado al portapapeles!' : 'Presiona para copiar código'}
                            </span>
                        </div>


                        {/* Separador */}
                        <div className="w-full border-t border-slate-100 my-1" />

                        {/* Sección de Quién te recomendó */}
                        <div className="w-full text-left space-y-2">
                            <h4 className="text-[8px] font-black text-slate-400 uppercase tracking-widest">¿Quién te recomendó?</h4>
                            {referralData.referidoPorNombre ? (
                                <div className="flex items-center gap-2 p-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl text-emerald-700">
                                    <CheckCircle2 size={14} className="shrink-0" />
                                    <span className="text-[9.5px] font-bold">
                                        Recomendado por: <span className="font-black uppercase">{referralData.referidoPorNombre}</span>
                                    </span>
                                </div>
                            ) : (
                                <form 
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        handleRegisterReferralCode(e);
                                    }}
                                    className="flex gap-2"
                                >
                                    <input
                                        type="text"
                                        value={manualReferralCode}
                                        onChange={e => setManualReferralCode(e.target.value)}
                                        className="flex-1 px-3 py-2 rounded-xl border border-slate-150 text-[10px] font-black uppercase text-slate-800 bg-slate-50 focus:outline-none focus:border-slate-300 placeholder:normal-case placeholder:font-semibold"
                                        placeholder="Código de tu amigo (Ej. CARLO707)"
                                        required
                                    />
                                    <button
                                        type="submit"
                                        disabled={manualReferralSubmitLoading}
                                        className="px-4 rounded-xl text-white font-black uppercase tracking-widest text-[8px] cursor-pointer border-0 active:scale-95 transition-all shrink-0"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        {manualReferralSubmitLoading ? '...' : 'Registrar'}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}

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

            {/* MODAL 1: MAPA VERTICAL DE NIVELES (TIPO VIDEOJUEGO) */}
            {showMapModal && gamification && (gamification as any).loyaltyStatus &&
                (() => {
                    const loyalty = (gamification as any).loyaltyStatus;
                    const allLevels = loyalty.todosLosNiveles || [];
                    const currentLvl = loyalty.nivelActual;
                    const season = loyalty.temporadaActiva;

                    return (
                        <div 
                            style={{
                                position: 'fixed',
                                inset: 0,
                                zIndex: 99999,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '1.25rem',
                                backgroundColor: 'rgba(2, 6, 23, 0.65)',
                                backdropFilter: 'blur(6px)'
                            }}
                        >
                            <div 
                                style={{
                                    position: 'relative',
                                    width: '100%',
                                    maxWidth: '430px',
                                    backgroundColor: '#ffffff',
                                    borderRadius: '2.5rem',
                                    padding: '1.75rem',
                                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                                    border: '1px solid #f1f5f9',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '1.25rem',
                                    maxHeight: '90vh',
                                    overflowY: 'auto'
                                }}
                                className="scrollbar-none"
                            >
                                <button
                                    type="button"
                                    onClick={() => setShowMapModal(false)}
                                    className="absolute top-5 right-5 size-8 bg-slate-50 border border-slate-150 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer"
                                >
                                    <X size={14} strokeWidth={2.5} />
                                </button>

                                <div className="text-center space-y-1">
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center justify-center gap-1">
                                        <Trophy size={16} className="text-amber-500" />
                                        Mapa de Niveles
                                    </h3>
                                    <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                                        Camino de lealtad. Acumula diamantes y asciende de rango.
                                    </p>
                                </div>

                                {/* MAPA VERTICAL */}
                                <div className="relative py-4 flex flex-col items-center">
                                    {/* Línea central de conexión */}
                                    <div className="absolute top-0 bottom-0 w-1.5 bg-slate-100 rounded-full" />

                                    <div className="w-full space-y-8 relative z-10">
                                        {allLevels.map((lvl: any, index: number) => {
                                            const IconComp = IconMapper[lvl.icono] || Award;
                                            const isCurrent = currentLvl && currentLvl.id === lvl.id;
                                            const isPast = currentLvl && currentLvl.orden > lvl.orden;
                                            const isLocked = currentLvl && currentLvl.orden < lvl.orden;

                                            return (
                                                <div 
                                                    key={lvl.id}
                                                    className="flex items-center w-full"
                                                >
                                                    {/* Lado Izquierdo: Requerimientos */}
                                                    <div className="w-[42%] text-right pr-4">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Requisito</span>
                                                        <span className="text-xs font-black text-slate-800">💎 {lvl.diamantesRequeridos}</span>
                                                    </div>

                                                    {/* Centro: Círculo del Nivel */}
                                                    <div className="w-[16%] flex justify-center">
                                                        <div 
                                                            className={`size-12 rounded-full flex items-center justify-center text-white relative transition-all duration-300 ${
                                                                isCurrent ? 'scale-110 shadow-lg animate-pulse' : 'shadow'
                                                            }`}
                                                            style={{ 
                                                                backgroundColor: isLocked ? '#94a3b8' : lvl.color,
                                                                boxShadow: isCurrent ? `0 0 20px ${lvl.color}ee` : 'none'
                                                            }}
                                                        >
                                                            {isLocked ? (
                                                                <Lock size={16} className="text-white/80" />
                                                            ) : isPast ? (
                                                                <Check size={18} strokeWidth={3} className="text-white" />
                                                            ) : (
                                                                <IconComp size={18} />
                                                            )}
                                                            
                                                            {isCurrent && (
                                                                <span 
                                                                    className="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center"
                                                                    title="Estás aquí"
                                                                >
                                                                    <div className="size-1 bg-white rounded-full animate-ping" />
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Lado Derecho: Info del Nivel */}
                                                    <div className="w-[42%] pl-4 text-left space-y-0.5">
                                                        <span 
                                                            className={`text-[9px] font-black uppercase tracking-wider ${
                                                                isCurrent ? 'text-slate-800' : isLocked ? 'text-slate-400' : 'text-slate-500'
                                                            }`}
                                                        >
                                                            {lvl.nombre}
                                                        </span>
                                                        {lvl.beneficios && (lvl.beneficios as string[]).length > 0 && (
                                                            <div className="text-[8px] text-slate-400 font-semibold leading-tight">
                                                                {(lvl.beneficios as string[]).slice(0, 2).join(' · ')}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Detalles de la Temporada */}
                                {season && (
                                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-1.5 text-center">
                                        <h5 className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center justify-center gap-1">
                                            <Clock size={12} /> Temporada del Club
                                        </h5>
                                        <p className="text-[10px] text-slate-600 font-bold uppercase leading-relaxed">
                                            🏁 Vence el: {new Date(season.fechaFin).toLocaleDateString()}
                                        </p>
                                        <p className="text-[8px] text-slate-400 font-semibold leading-relaxed">
                                            Al finalizar se descontarán {season.descuentoDiamantes} diamantes y se recalculará tu nivel inicial. ¡No dejes de ganar!
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })()
            }

            {/* MODAL 2: CELEBRACIÓN COMPLETA DE SUBIDA DE NIVEL */}
            {showLevelAnimation && levelAnimData &&
                (() => {
                    const IconComp = IconMapper[levelAnimData.icono] || Award;
                    return (
                        <div 
                            style={{
                                position: 'fixed',
                                inset: 0,
                                zIndex: 999999,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: 'rgba(2, 6, 23, 0.85)',
                                backdropFilter: 'blur(8px)',
                                padding: '2rem',
                                color: '#ffffff',
                                textAlign: 'center'
                            }}
                            className="animate-in fade-in zoom-in duration-300"
                        >
                            {/* Confetti Dinámico */}
                            <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
                                {[...Array(15)].map((_, i) => (
                                    <div 
                                        key={i}
                                        style={{
                                            position: 'absolute',
                                            top: `-10%`,
                                            left: `${Math.random() * 100}%`,
                                            width: `${Math.random() * 10 + 5}px`,
                                            height: `${Math.random() * 15 + 10}px`,
                                            backgroundColor: levelAnimData.color,
                                            opacity: Math.random() * 0.7 + 0.3,
                                            borderRadius: '2px',
                                            transform: `rotate(${Math.random() * 360}deg)`,
                                            animation: `fall ${Math.random() * 3 + 2}s linear infinite`,
                                            pointerEvents: 'none'
                                        }}
                                    />
                                ))}
                            </div>

                            <style dangerouslySetInnerHTML={{__html: `
                                @keyframes fall {
                                    0% { transform: translateY(0px) rotate(0deg); }
                                    100% { transform: translateY(110vh) rotate(360deg); }
                                }
                                @keyframes pulseGlow {
                                    0%, 100% { transform: scale(1); box-shadow: 0 0 30px ${levelAnimData.color}88; }
                                    50% { transform: scale(1.05); box-shadow: 0 0 50px ${levelAnimData.color}ee; }
                                }
                                .glowing-shield {
                                    animation: pulseGlow 2.5s ease-in-out infinite;
                                }
                            `}} />

                            <div className="space-y-8 max-w-sm">
                                {/* Escudo/Icono con efecto Glow y animación */}
                                <div 
                                    className="size-28 rounded-[2.5rem] glowing-shield mx-auto flex items-center justify-center text-white relative"
                                    style={{ backgroundColor: levelAnimData.color }}
                                >
                                    <IconComp size={52} className="stroke-[2.5]" />
                                    <Sparkles className="absolute -top-3 -right-3 text-amber-300 animate-bounce" size={24} />
                                </div>

                                <div className="space-y-3">
                                    <span className="text-[10px] bg-white/15 text-amber-200 border border-white/10 font-black uppercase tracking-widest px-4 py-1 rounded-full">
                                        ✨ ASCENSO DE RANGO
                                    </span>
                                    <h2 className="text-2xl font-black uppercase tracking-tight leading-none text-white">
                                        ¡Subiste de Nivel!
                                    </h2>
                                    <p className="text-base font-extrabold uppercase tracking-wider" style={{ color: levelAnimData.color }}>
                                        Nivel {levelAnimData.nombre}
                                    </p>
                                    <p className="text-xs text-slate-350 font-medium leading-relaxed max-w-[280px] mx-auto">
                                        Felicidades. Tu constancia te ha llevado al siguiente rango. Desbloqueaste nuevos privilegios y una recompensa de bienvenida.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleCloseLevelAnimation}
                                    className="w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-xl transition-all cursor-pointer border-0 active:scale-95"
                                    style={{ backgroundColor: levelAnimData.color }}
                                >
                                    ¡Genial, Gracias!
                                </button>
                            </div>
                        </div>
                    );
                })()
            }

            {/* MODAL 3: NOTIFICACIÓN DE TEMPORADA NUEVA / RECALCULO DE NIVEL */}
            {showSeasonModal && seasonModalData && (
                <div 
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 999999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1.5rem',
                        backgroundColor: 'rgba(2, 6, 23, 0.7)',
                        backdropFilter: 'blur(5px)'
                    }}
                >
                    <div 
                        style={{
                            position: 'relative',
                            width: '100%',
                            maxWidth: '380px',
                            backgroundColor: '#ffffff',
                            borderRadius: '2.5rem',
                            padding: '2rem',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                            border: '1px solid #f1f5f9',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1.25rem',
                            textAlign: 'center'
                        }}
                    >
                        <div className="size-14 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-sm">
                            <RefreshCw size={24} className="stroke-[2.5]" />
                        </div>

                        <div className="space-y-2">
                            <span className="text-[9px] bg-indigo-50 text-indigo-700 font-black uppercase tracking-widest px-3 py-1 rounded-full">
                                📣 NUEVA TEMPORADA INICIADA
                            </span>
                            <h3 className="text-base font-black text-slate-800 uppercase tracking-wider">
                                ¡Nueva Temporada!
                            </h3>
                            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                                Se ha realizado el cierre de la temporada anterior.
                            </p>
                        </div>

                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left space-y-2 text-[10px] text-slate-500 font-semibold uppercase leading-relaxed">
                            <p>📉 Descuento Aplicado: -{seasonModalData.descuentoDiamantes} diamantes</p>
                            <p>🏁 Fin de Nueva Temporada: {new Date(seasonModalData.fechaFin).toLocaleDateString()}</p>
                            <p className="text-[8px] text-slate-400 normal-case font-medium mt-1 leading-snug">
                                Tus diamantes sobrantes determinan tu rango de inicio para esta nueva temporada. ¡Vuelve a acumular para alcanzar la cima!
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={handleCloseSeasonModal}
                            className="w-full py-4 bg-indigo-650 hover:bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all cursor-pointer border-0 active:scale-95"
                            style={{ backgroundColor: primaryColor }}
                        >
                            Comenzar Nueva Temporada
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
