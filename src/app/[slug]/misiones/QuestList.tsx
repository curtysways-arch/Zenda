'use client';

import { useState, useEffect } from 'react';
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
    ArrowRight,
    Search,
    Trophy,
    Copy,
    Share2,
    Gift,
    Coins,
    QrCode,
    ChevronRight,
    Star
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

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
    nombre: string;
    puntos: number;
    codigo: string;
    progresoCampañas: any[];
    recompensasGanadas: any[];
}

interface LoyaltyReward {
    id: string;
    nombre: string;
    descripcion?: string;
    costoPuntos: number;
}

interface QuestListProps {
    slug: string;
    primaryColor: string;
    textColor: string;
}

const IconMapper: Record<string, any> = {
    Sparkles: Sparkles,
    CalendarRange: CalendarRange,
    Clock: Clock,
    Instagram: Instagram,
    Users: Users,
    Cake: Cake,
    Crown: Crown,
    Award: Award
};

export default function QuestList({ slug, primaryColor, textColor }: QuestListProps) {
    const [quests, setQuests] = useState<Quest[]>([]);
    const [gamification, setGamification] = useState<GamificationData | null>(null);
    const [activeTab, setActiveTab] = useState<'todas' | 'enProgreso' | 'completadas'>('todas');
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [celebrateQuest, setCelebrateQuest] = useState<string | null>(null);

    // Referidos
    const [referralData, setReferralData] = useState<ReferralData | null>(null);
    const [loyaltyRewards, setLoyaltyRewards] = useState<LoyaltyReward[]>([]);
    const [copied, setCopied] = useState(false);
    const [showQr, setShowQr] = useState(false);
    const [redeemLoading, setRedeemLoading] = useState<string | null>(null);

    // Cargar misiones
    const fetchQuests = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/public/${slug}/misiones`);
            const data = await res.json();
            if (data.success) {
                setQuests(data[activeTab] || []);
                setGamification(data.gamification || null);
            }
        } catch (e) {
            console.error('Error fetching quests:', e);
        } finally {
            setLoading(false);
        }
    };

    // Cargar datos de referidos (sesión opcional)
    const fetchReferralData = async () => {
        try {
            const res = await fetch(`/api/${slug}/referrals/me`);
            if (res.ok) {
                const data = await res.json();
                setReferralData(data);
                // Cargar premios canjeables por puntos
                const rRes = await fetch(`/api/public/${slug}/loyalty/rewards`);
                if (rRes.ok) {
                    const rData = await rRes.json();
                    setLoyaltyRewards(rData || []);
                }
            }
        } catch (e) {
            // No hay sesión de referidos, continúa sin datos
        }
    };

    useEffect(() => {
        fetchQuests();
    }, [slug, activeTab]);

    useEffect(() => {
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

    // Filtrar misiones localmente por buscador
    const filteredQuests = quests.filter(q => 
        q.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
        q.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* ===== SECCIÓN 1: PERFIL DE PUNTOS Y REFERIDOS ===== */}
            {referralData && (
                <section className="bg-white rounded-[2.5rem] border border-slate-100 p-5 shadow-sm space-y-4">
                    {/* Header Puntos */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div
                                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md"
                                style={{ backgroundColor: primaryColor }}
                            >
                                <Trophy size={20} />
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none block">Hola, {referralData.nombre.split(' ')[0]}</span>
                                <h4 className="text-xl font-black text-slate-800 leading-tight flex items-center gap-1.5">
                                    <Coins size={16} style={{ color: primaryColor }} />
                                    {referralData.puntos} <span className="text-base text-slate-500 font-bold">pts</span>
                                </h4>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowQr(v => !v)}
                            className="p-2.5 rounded-2xl border border-slate-100 text-slate-400 active:scale-95 transition-transform cursor-pointer bg-slate-50"
                        >
                            <QrCode size={18} />
                        </button>
                    </div>

                    {/* QR Modal inline */}
                    {showQr && referralData.codigo && (
                        <div className="flex flex-col items-center gap-3 py-4 border-t border-slate-100">
                            <QRCodeSVG value={getReferralUrl()} size={150} fgColor={primaryColor} />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tu código: {referralData.codigo}</span>
                        </div>
                    )}

                    {/* Código de referido */}
                    {referralData.codigo && (
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex items-center justify-between gap-2">
                            <div>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Tu enlace de referidos</span>
                                <span className="text-xs font-black text-slate-700 truncate block max-w-[160px]">/r/{referralData.codigo}</span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCopy}
                                    className="p-2 rounded-xl border border-slate-200 text-slate-500 active:scale-95 transition-transform cursor-pointer bg-white"
                                >
                                    {copied ? <CheckCircle2 size={16} className="text-green-500" /> : <Copy size={16} />}
                                </button>
                                <button
                                    onClick={handleShare}
                                    className="p-2 rounded-xl text-white active:scale-95 transition-transform cursor-pointer shadow-sm"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    <Share2 size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Premios por puntos */}
                    {loyaltyRewards.length > 0 && (
                        <div className="border-t border-slate-100 pt-3 space-y-2">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Gift size={12} /> Canjea tus puntos
                            </span>
                            <div className="space-y-2">
                                {loyaltyRewards.map(reward => {
                                    const tienePuntos = referralData.puntos >= reward.costoPuntos;
                                    return (
                                        <div key={reward.id} className="flex items-center justify-between gap-3 bg-slate-50 rounded-2xl p-3">
                                            <div className="min-w-0">
                                                <span className="text-[8px] font-black text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md inline-block mb-1">
                                                    {reward.costoPuntos} pts
                                                </span>
                                                <h5 className="text-xs font-black text-slate-800 truncate">{reward.nombre}</h5>
                                            </div>
                                            <button
                                                onClick={() => handleRedeemReward(reward)}
                                                disabled={!tienePuntos || redeemLoading === reward.id}
                                                className="px-3 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer disabled:opacity-40 text-white shrink-0"
                                                style={{ backgroundColor: tienePuntos ? primaryColor : '#94a3b8' }}
                                            >
                                                {redeemLoading === reward.id ? '...' : 'Canjear'}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </section>
            )}

            {/* ===== SECCIÓN 2: GAMIFICACIÓN (XP / NIVEL / INSIGNIAS) ===== */}
            {gamification && (
                <section className="bg-white rounded-[2.5rem] border border-slate-100 p-6 shadow-sm space-y-5">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div 
                                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md relative overflow-hidden"
                                style={{ backgroundColor: primaryColor }}
                            >
                                <Star size={20} className="relative z-10" />
                                <div className="absolute inset-0 bg-gradient-to-tr from-black/10 to-transparent" />
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Nivel Actual</span>
                                <h4 className="text-xl font-black text-slate-800 leading-tight">{gamification.level.nombre}</h4>
                            </div>
                        </div>
                        {gamification.streak > 0 && (
                            <div className="flex items-center gap-1.5 px-4 py-2 bg-orange-50 border border-orange-100 rounded-full text-orange-600">
                                <Flame size={16} fill="currentColor" />
                                <span className="text-xs font-black uppercase tracking-wider">{gamification.streak} Días</span>
                            </div>
                        )}
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-end text-xs">
                            <span className="font-bold text-slate-400 uppercase tracking-wider">XP Total</span>
                            <span className="font-black text-slate-800">{gamification.level.xpTotal} XP</span>
                        </div>
                        <div className="w-full h-3.5 bg-slate-50 border border-slate-100/50 rounded-full overflow-hidden p-0.5">
                            <div 
                                className="h-full rounded-full transition-all duration-1000"
                                style={{ width: `${gamification.level.progresoXP}%`, backgroundColor: primaryColor }}
                            />
                        </div>
                    </div>
                    {gamification.badges.length > 0 && (
                        <div className="space-y-3 pt-2 border-t border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Insignias</span>
                            <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-none">
                                {gamification.badges.map(b => (
                                    <div key={b.id} className="flex flex-col items-center text-center shrink-0 min-w-[70px]" title={b.descripcion}>
                                        <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ backgroundColor: `${b.color}1A`, color: b.color }}>
                                            <Award size={18} />
                                        </div>
                                        <span className="text-[9px] font-black text-slate-700 mt-1.5 truncate max-w-[70px]">{b.nombre}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </section>
            )}

            {/* ===== SECCIÓN 3: MISIONES ===== */}
            <div className="space-y-3">
                {/* Buscador */}
                <div className="relative bg-white rounded-full border border-slate-100 p-1 flex items-center shadow-sm">
                    <Search className="text-slate-400 ml-3" size={16} />
                    <input 
                        type="text" 
                        placeholder="Buscar misiones..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-transparent border-0 py-2.5 px-3 text-xs outline-none text-slate-800 placeholder-slate-400 font-bold"
                    />
                </div>

                {/* Pestañas */}
                <div className="flex gap-1.5 bg-slate-50 border border-slate-100/50 p-1.5 rounded-full select-none">
                    {(['enProgreso', 'todas', 'completadas'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className="flex-1 py-3.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 outline-none cursor-pointer border-0"
                            style={{
                                backgroundColor: activeTab === tab ? '#ffffff' : 'transparent',
                                color: activeTab === tab ? '#000000' : '#94a3b8',
                                boxShadow: activeTab === tab ? '0 1px 3px 0 rgba(0, 0, 0, 0.05)' : 'none'
                            }}
                        >
                            {tab === 'enProgreso' ? 'En progreso' : tab === 'todas' ? 'Todas' : 'Completadas'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Listado de Misiones */}
            {loading ? (
                <div className="py-12 text-center text-slate-400 text-xs font-bold">Cargando misiones...</div>
            ) : filteredQuests.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs font-bold bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
                    No hay misiones en esta sección por ahora.
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredQuests.map(q => {
                        const IconComponent = IconMapper[q.icono] || Award;
                        const isCelebrating = celebrateQuest === q.id;

                        return (
                            <div 
                                key={q.id}
                                className={`bg-white rounded-[2.5rem] border p-5 shadow-sm flex flex-col justify-between hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 relative overflow-hidden ${
                                    isCelebrating ? 'border-green-500 bg-green-50/10' : 'border-slate-100'
                                }`}
                            >
                                {isCelebrating && (
                                    <div className="absolute inset-0 bg-green-50/20 backdrop-blur-[0.5px] flex items-center justify-center z-20">
                                        <div className="text-center animate-bounce">
                                            <span className="text-3xl">🎉</span>
                                            <h5 className="font-black text-green-600 text-xs uppercase tracking-widest mt-1">¡Misión Completada!</h5>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-4">
                                    <div 
                                        className="w-12 h-12 rounded-[1.25rem] flex items-center justify-center shrink-0 shadow-inner"
                                        style={{ backgroundColor: `${q.color}15`, color: q.color }}
                                    >
                                        <IconComponent size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex justify-between items-start gap-2">
                                            <h5 className="font-black text-slate-800 text-sm truncate pr-1">{q.nombre}</h5>
                                            <span 
                                                className="text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shrink-0"
                                                style={{ backgroundColor: `${primaryColor}10`, color: primaryColor }}
                                            >
                                                {q.recompensas.join(' + ')}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 leading-relaxed font-medium">{q.descripcion}</p>
                                    </div>
                                </div>

                                {q.estado === 'EN_PROGRESO' && q.progresoRequerido > 1 && (
                                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                                            <span>Progreso</span>
                                            <span className="font-black text-slate-700">{q.progresoActual} / {q.progresoRequerido}</span>
                                        </div>
                                        <div className="w-full h-2.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100/50">
                                            <div 
                                                className="h-full rounded-full transition-all duration-500"
                                                style={{ 
                                                    width: `${Math.min(100, (q.progresoActual / q.progresoRequerido) * 100)}%`,
                                                    backgroundColor: q.color
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                        {q.campañaNombre}
                                    </span>
                                    {q.estado === 'COMPLETADA' && (
                                        <div className="flex items-center gap-1 text-green-500">
                                            <CheckCircle2 size={16} fill="currentColor" className="text-white" />
                                            <span className="text-[9px] font-black uppercase tracking-widest">Completada</span>
                                        </div>
                                    )}
                                    {q.estado === 'PENDIENTE_APROBACION' && (
                                        <div className="flex items-center gap-1 text-amber-500">
                                            <Lock size={12} />
                                            <span className="text-[9px] font-black uppercase tracking-widest">Pendiente aprobación</span>
                                        </div>
                                    )}
                                    {q.estado === 'EN_PROGRESO' && (
                                        <>
                                            {q.validacionTipo === 'USUARIO' ? (
                                                <button 
                                                    onClick={() => handleConfirmQuest(q.id)}
                                                    className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-white rounded-xl shadow-md border-0 active:scale-95 transition-transform cursor-pointer"
                                                    style={{ backgroundColor: primaryColor }}
                                                >
                                                    Hacer Misión
                                                </button>
                                            ) : (
                                                <div className="flex items-center gap-0.5 text-slate-400">
                                                    <span className="text-[9px] font-black uppercase tracking-widest">Automática</span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
