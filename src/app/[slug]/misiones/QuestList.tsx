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
    Percent
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
    Award: Award
};

export default function QuestList({ slug, primaryColor, textColor, negocioNombre = 'CitiOx' }: QuestListProps) {
    const router = useRouter();
    const [quests, setQuests] = useState<Quest[]>([]);
    const [gamification, setGamification] = useState<GamificationData | null>(null);
    const [activeTab, setActiveTab] = useState<'todas' | 'enProgreso' | 'completadas'>('todas');
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [celebrateQuest, setCelebrateQuest] = useState<string | null>(null);
    const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);

    // Referidos y Premios
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
                // Tomamos todas las misiones y luego filtramos
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
                
                // Cargar premios canjeables
                const rRes = await fetch(`/api/public/${slug}/loyalty/rewards`);
                if (rRes.ok) {
                    const rData = await rRes.json();
                    setLoyaltyRewards(rData || []);
                }
            }
        } catch (e) {
            console.error('No referral session active.');
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

    // Filtrar por tab localmente
    const getTabFilteredQuests = () => {
        if (activeTab === 'todas') return quests;
        if (activeTab === 'enProgreso') {
            return quests.filter(q => q.estado === 'EN_PROGRESO' || q.estado === 'PENDIENTE_APROBACION');
        }
        return quests.filter(q => q.estado === 'COMPLETADA' || q.estado === 'RECLAMADA');
    };

    // Filtrar por buscador
    const filteredQuests = getTabFilteredQuests().filter(q => 
        q.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
        q.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getInitials = (name: string) => {
        if (!name) return 'C';
        return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    };

    return (
        <div className="w-full">
            {/* ===== HEADER DEGRADADO CON DISEÑO PREMIUM ===== */}
            <div 
                className="relative overflow-hidden text-white rounded-b-[2.5rem] px-6 pt-5 pb-12 shadow-[0_10px_20px_-5px_rgba(0,0,0,0.1)]"
                style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, color-mix(in srgb, ${primaryColor}, black 20%) 100%)` }}
            >
                {/* Botones de navegación de cabecera */}
                <div className="flex items-center justify-between mb-5">
                    <button 
                        onClick={() => router.push(`/${slug}`)}
                        className="w-9 h-9 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center text-white active:scale-95 transition-transform border-0 cursor-pointer"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <h2 className="text-xs font-black uppercase tracking-widest text-white/90">
                        Club de Recompensas de {negocioNombre}
                    </h2>
                    <button 
                        onClick={() => alert(`Bienvenido al Club de Recompensas de {negocioNombre}. Completa desafíos creados para ganar puntos y canjearlos por premios únicos.`)}
                        className="w-9 h-9 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center text-white active:scale-95 transition-transform border-0 cursor-pointer"
                    >
                        <HelpCircle size={18} />
                    </button>
                </div>

                {/* Textos de la cabecera */}
                <div className="relative z-10 max-w-[70%] space-y-1">
                    <h1 className="text-xl font-black uppercase leading-tight tracking-tight">
                        Club de Recompensas
                    </h1>
                    <p className="text-[10px] text-white/80 font-bold uppercase tracking-wider leading-snug">
                        Completa desafíos y obtén premios exclusivos al instante.
                    </p>
                </div>

                {/* Imagen 3D del regalo flotando en el lado derecho */}
                <img 
                    src="/images/3d_gift_box.png" 
                    alt="Regalo 3D" 
                    className="absolute right-2 bottom-2 w-28 h-28 object-contain pointer-events-none z-10 drop-shadow-lg animate-[float_4s_ease-in-out_infinite]"
                />

                {/* Animación flotante personalizada con CSS integrado */}
                <style dangerouslySetInnerHTML={{__html: `
                    @keyframes float {
                        0% { transform: translateY(0px) rotate(0deg); }
                        50% { transform: translateY(-6px) rotate(1.5deg); }
                        100% { transform: translateY(0px) rotate(0deg); }
                    }
                `}} />
            </div>

            <div className="max-w-md mx-auto px-6 -mt-10 space-y-6 relative z-20">
                {/* ===== TARJETA DE PERFIL (Hola, Carlos) ===== */}
                {referralData && (
                    <section className="bg-white rounded-[2rem] border border-slate-100/80 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.03)] space-y-4">
                        {/* Fila superior de perfil */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {/* Avatar */}
                                <div 
                                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-sm shadow-md border-2 border-white"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    {getInitials(referralData.nombreCliente || referralData.nombre || 'C')}
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 leading-none">Hola, {referralData.nombreCliente || referralData.nombre || 'Cliente'} 👋</h4>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <span className="text-lg font-black text-slate-800 leading-none">{referralData.puntos}</span>
                                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">pts</span>
                                    </div>
                                </div>
                            </div>

                            {/* Botón QR */}
                            <button
                                onClick={() => setShowQr(v => !v)}
                                className="w-10 h-10 rounded-2xl border border-slate-100 text-slate-500 active:scale-95 transition-transform cursor-pointer bg-slate-50 flex items-center justify-center hover:bg-slate-100"
                            >
                                <QrCode size={18} />
                            </button>
                        </div>

                        {/* Modal Inline QR */}
                        {showQr && referralData.codigo && (
                            <div className="flex flex-col items-center gap-3 py-4 border-t border-slate-100/80">
                                <QRCodeSVG value={getReferralUrl()} size={140} fgColor={primaryColor} />
                                <span className="text-[9px] font-black text-slate-450 uppercase tracking-widest">Código de Cliente: {referralData.codigo}</span>
                            </div>
                        )}

                        {/* Caja del Enlace de Referidos */}
                        {referralData.codigo && (
                            <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-3 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-1">Tu enlace de referidos</span>
                                    <span className="text-xs font-black text-slate-700 truncate block">r/{referralData.codigo}</span>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <button
                                        onClick={handleCopy}
                                        className="px-3 py-2.5 rounded-xl border border-slate-200 text-slate-600 active:scale-95 transition-transform cursor-pointer bg-white flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-widest"
                                    >
                                        {copied ? <CheckCircle2 size={13} className="text-green-500" /> : <Copy size={13} />}
                                        Copiar
                                    </button>
                                    <button
                                        onClick={handleShare}
                                        className="px-3 py-2.5 rounded-xl text-white active:scale-95 transition-transform cursor-pointer shadow-sm flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-widest"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        <Share2 size={13} />
                                        Compartir
                                    </button>
                                </div>
                            </div>
                        )}
                    </section>
                )}

                {/* ===== SECCIÓN 2: CANJEA TUS PUNTOS (CARRUSEL HORIZONTAL) ===== */}
                {loyaltyRewards.length > 0 && (
                    <section className="space-y-3">
                        <div className="flex justify-between items-center px-1">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                <Gift size={14} className="text-pink-500" /> Canjea tus puntos
                            </h3>
                            <Link 
                                href={`/${slug}/misiones/premios`}
                                className="text-[10px] font-black uppercase tracking-widest text-pink-600 hover:opacity-80 transition-opacity no-underline"
                                style={{ color: primaryColor }}
                            >
                                Ver catálogo completo &gt;
                            </Link>
                        </div>

                        {/* Listado Horizontal */}
                        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
                            {loyaltyRewards.map(reward => {
                                const tienePuntos = (referralData?.puntos || 0) >= reward.costoPuntos;
                                return (
                                    <div 
                                        key={reward.id} 
                                        className="w-[150px] shrink-0 bg-white border border-slate-100 rounded-3xl p-3 shadow-sm flex flex-col justify-between gap-3 snap-start"
                                    >
                                        <div className="space-y-2 relative">
                                            {/* Imagen del Premio */}
                                            <div className="w-full h-24 rounded-2xl overflow-hidden bg-slate-50 flex items-center justify-center border border-slate-100">
                                                {reward.imagenUrl ? (
                                                    <img src={reward.imagenUrl} alt={reward.nombre} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Gift size={28} className="text-pink-300" />
                                                )}
                                            </div>
                                            {/* Badge costo */}
                                            <span 
                                                className="absolute top-1 left-1 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md text-white shadow-sm"
                                                style={{ backgroundColor: primaryColor }}
                                            >
                                                {reward.costoPuntos} pts
                                            </span>
                                            <h5 className="text-[11px] font-black text-slate-800 leading-tight line-clamp-2 uppercase tracking-tight">
                                                {reward.nombre}
                                            </h5>
                                        </div>

                                        <button
                                            onClick={() => handleRedeemReward(reward)}
                                            disabled={!tienePuntos || redeemLoading === reward.id}
                                            className="w-full py-2.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer disabled:opacity-40 text-white shadow-sm shrink-0 border-0"
                                            style={{ backgroundColor: tienePuntos ? primaryColor : '#94a3b8' }}
                                        >
                                            {redeemLoading === reward.id ? '...' : 'Canjear'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* ===== SECCIÓN 3: DESAFÍOS ACTUALES (Bajo Premios Canjeables) ===== */}
                <section className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                            <Trophy size={14} className="text-pink-500" style={{ color: primaryColor }} /> Desafíos del Club
                        </h3>
                    </div>

                    {loading ? (
                        <div className="py-8 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">Cargando desafíos...</div>
                    ) : quests.length === 0 ? (
                        <div className="bg-white border border-slate-100 rounded-3xl p-6 text-center shadow-sm">
                            <p className="text-slate-450 text-xs font-bold uppercase tracking-wider">
                                No hay desafíos disponibles por ahora.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3.5">
                            {/* Mostrar solo los primeros 3 desafíos destacados */}
                            {quests.slice(0, 3).map(q => {
                                const IconComponent = IconMapper[q.icono] || Award;
                                const pct = Math.min(100, (q.progresoActual / q.progresoRequerido) * 100);
                                const isCelebrating = celebrateQuest === q.id;

                                return (
                                    <div 
                                        key={q.id}
                                        onClick={() => setSelectedQuest(q)}
                                        className={`bg-white rounded-[2rem] border p-5 shadow-[0_4px_25px_rgba(0,0,0,0.015)] space-y-3 relative overflow-hidden transition-all duration-300 cursor-pointer hover:scale-[1.01] active:scale-[0.99] ${
                                            isCelebrating ? 'border-green-500 bg-green-50/10' : 'border-slate-100/80'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div 
                                                    className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-inner"
                                                    style={{ backgroundColor: `${q.color}15`, color: q.color }}
                                                >
                                                    <IconComponent size={18} />
                                                </div>
                                                <div className="min-w-0 space-y-0.5">
                                                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight truncate">
                                                        {q.nombre}
                                                    </h4>
                                                    <p className="text-[9px] text-slate-400 font-bold leading-normal truncate">
                                                        {q.descripcion}
                                                    </p>
                                                </div>
                                            </div>

                                            <span 
                                                className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0"
                                                style={{ color: primaryColor, backgroundColor: `${primaryColor}08`, borderColor: `${primaryColor}15` }}
                                            >
                                                +{q.recompensas.join(' + ')}
                                            </span>
                                        </div>

                                        {/* Barra de progreso con estilo único */}
                                        <div className="space-y-1">
                                            <div className="w-full h-2 bg-slate-50 border border-slate-100/50 rounded-full overflow-hidden p-0.5">
                                                <div 
                                                    className="h-full rounded-full transition-all duration-500"
                                                    style={{ 
                                                        width: `${pct}%`, 
                                                        backgroundColor: q.color 
                                                    }}
                                                />
                                            </div>
                                            <div className="flex justify-between items-center text-[8px] font-black text-slate-400 uppercase tracking-wider">
                                                <span>Progreso</span>
                                                <span>{q.progresoActual} / {q.progresoRequerido}</span>
                                            </div>
                                        </div>

                                        {/* Acción rápida si es manual */}
                                        {q.estado === 'EN_PROGRESO' && q.validacionTipo === 'USUARIO' && (
                                            <div className="pt-1 flex justify-end">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleConfirmQuest(q.id);
                                                    }}
                                                    className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-white rounded-xl shadow-sm border-0 cursor-pointer"
                                                    style={{ backgroundColor: primaryColor }}
                                                >
                                                    Hacer Desafío
                                                </button>
                                            </div>
                                        )}
                                        {q.estado === 'COMPLETADA' && (
                                            <div className="text-green-500 text-[8px] font-black uppercase tracking-wider flex items-center justify-end gap-1">
                                                <CheckCircle2 size={10} fill="currentColor" className="text-white" /> Completado
                                            </div>
                                        )}
                                        {q.estado === 'PENDIENTE_APROBACION' && (
                                            <div className="text-amber-500 text-[8px] font-black uppercase tracking-wider flex items-center justify-end gap-1">
                                                <Clock size={10} /> En revisión
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Botón Ver Todos */}
                            <Link
                                href={`/${slug}/misiones/estado`}
                                className="w-full py-4 bg-white border border-slate-100 hover:bg-slate-50 text-slate-700 active:scale-95 transition-transform rounded-[1.5rem] flex items-center justify-center gap-1.5 shadow-sm no-underline cursor-pointer"
                            >
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-650">Ver todos los desafíos</span>
                                <ArrowRight size={13} style={{ color: primaryColor }} />
                            </Link>
                        </div>
                    )}
                </section>
            </div>

            {/* Modal de Detalles del Desafío */}
            {selectedQuest && (
                <div 
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end justify-center z-50 p-4"
                    onClick={() => setSelectedQuest(null)}
                >
                    <div 
                        className="bg-white rounded-t-[2.5rem] rounded-b-[1.5rem] w-full max-w-md p-6 space-y-6 shadow-2xl relative translate-y-0 transition-transform duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Cabecera del modal */}
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div 
                                    className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner"
                                    style={{ backgroundColor: `${selectedQuest.color}15`, color: selectedQuest.color }}
                                >
                                    {(() => {
                                        const IconComponent = IconMapper[selectedQuest.icono] || Award;
                                        return <IconComponent size={22} />;
                                    })()}
                                </div>
                                <div>
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Desafío</span>
                                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight leading-none mt-1">
                                        {selectedQuest.nombre}
                                    </h3>
                                </div>
                            </div>
                            <span 
                                className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full text-pink-650 bg-pink-50"
                                style={{ color: primaryColor, backgroundColor: `${primaryColor}08` }}
                            >
                                +{selectedQuest.recompensas.join(' + ')}
                            </span>
                        </div>

                        {/* Descripción completa */}
                        <div className="space-y-2">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Instrucciones</span>
                            <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                                {selectedQuest.descripcion}
                            </p>
                        </div>

                        {/* Progreso del desafío */}
                        <div className="space-y-2 pt-2 border-t border-slate-100/80">
                            <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                <span>Progreso del desafío</span>
                                <span>{selectedQuest.progresoActual} / {selectedQuest.progresoRequerido}</span>
                            </div>
                            <div className="w-full h-3 bg-slate-50 border border-slate-100/50 rounded-full overflow-hidden p-0.5">
                                <div 
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{ 
                                        width: `${Math.min(100, (selectedQuest.progresoActual / selectedQuest.progresoRequerido) * 100)}%`, 
                                        backgroundColor: selectedQuest.color 
                                    }}
                                />
                            </div>
                        </div>

                        {/* Información adicional */}
                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100/80 text-[9px] font-black text-slate-450 uppercase tracking-wider">
                            <div className="bg-slate-50 p-2.5 rounded-xl space-y-0.5">
                                <span className="text-[7px] text-slate-400 block">Tipo Validación</span>
                                <span>{selectedQuest.validacionTipo === 'USUARIO' ? 'Acción de Usuario' : 'Validación Automática'}</span>
                            </div>
                            <div className="bg-slate-50 p-2.5 rounded-xl space-y-0.5">
                                <span className="text-[7px] text-slate-400 block">Campaña</span>
                                <span className="truncate block">{selectedQuest.campañaNombre}</span>
                            </div>
                        </div>

                        {/* Botones de acción */}
                        <div className="pt-2 flex gap-3">
                            <button
                                onClick={() => setSelectedQuest(null)}
                                className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest bg-slate-100 hover:bg-slate-150 text-slate-600 rounded-2xl cursor-pointer border-0 active:scale-95 transition-transform"
                            >
                                Cerrar
                            </button>
                            {selectedQuest.estado === 'EN_PROGRESO' && selectedQuest.validacionTipo === 'USUARIO' && (
                                <button
                                    onClick={() => {
                                        handleConfirmQuest(selectedQuest.id);
                                        setSelectedQuest(null);
                                    }}
                                    className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-white rounded-2xl cursor-pointer border-0 active:scale-95 transition-transform"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    Hacer Desafío
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
