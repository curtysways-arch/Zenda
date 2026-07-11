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
                className="relative overflow-hidden text-white rounded-b-[3.5rem] px-6 pt-8 pb-20 shadow-[0_15px_30px_-5px_rgba(236,72,153,0.2)]"
                style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, color-mix(in srgb, ${primaryColor}, black 20%) 100%)` }}
            >
                {/* Botones de navegación de cabecera */}
                <div className="flex items-center justify-between mb-8">
                    <button 
                        onClick={() => router.push(`/${slug}`)}
                        className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white active:scale-95 transition-transform border-0 cursor-pointer"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <h2 className="text-sm font-black uppercase tracking-widest text-white/90">
                        Aventuras y Misiones
                    </h2>
                    <button 
                        onClick={() => alert(`Bienvenido a Aventuras y Misiones de ${negocioNombre}. Completa tareas diarias para subir de nivel y obtener fabulosos premios.`)}
                        className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white active:scale-95 transition-transform border-0 cursor-pointer"
                    >
                        <HelpCircle size={20} />
                    </button>
                </div>

                {/* Textos de la cabecera */}
                <div className="relative z-10 max-w-[65%]">
                    <span className="text-[9px] font-black tracking-widest uppercase bg-white/20 px-2.5 py-1 rounded-md inline-block mb-2">
                        GROWTH QUESTS
                    </span>
                    <h1 className="text-xl md:text-2xl font-black uppercase leading-tight tracking-tight">
                        Completa misiones y obtén recompensas exclusivas
                    </h1>
                    <p className="text-[10px] text-white/80 font-bold uppercase tracking-wider leading-relaxed mt-2">
                        Cada acción te acerca a nuevas experiencias en {negocioNombre}.
                    </p>
                </div>

                {/* Imagen 3D del regalo flotando en el lado derecho */}
                <img 
                    src="/images/3d_gift_box.png" 
                    alt="Regalo 3D" 
                    className="absolute right-0 bottom-4 w-44 h-44 object-contain pointer-events-none z-10 drop-shadow-2xl animate-[float_4s_ease-in-out_infinite]"
                    style={{
                        transform: 'translateY(10px)'
                    }}
                />

                {/* Animación flotante personalizada con CSS integrado */}
                <style dangerouslySetInnerHTML={{__html: `
                    @keyframes float {
                        0% { transform: translateY(0px) rotate(0deg); }
                        50% { transform: translateY(-10px) rotate(2deg); }
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
                                        
                                        {/* Insignia de Nivel */}
                                        <span className="text-[8px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full border border-amber-100 ml-1.5 flex items-center gap-0.5">
                                            <Crown size={8} /> Nivel {gamification?.level.nombre || 'Bronce'}
                                        </span>
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

                {/* ===== SECCIÓN 3: EXP / NIVEL ACTUAL ===== */}
                {gamification && (
                    <section className="bg-white rounded-[2rem] border border-slate-100 p-5 shadow-sm space-y-4">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div 
                                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    <Star size={18} fill="currentColor" />
                                </div>
                                <div>
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">Nivel Actual</span>
                                    <h4 className="text-base font-black text-slate-800 leading-tight mt-0.5">{gamification.level.nombre}</h4>
                                </div>
                            </div>

                            {/* Racha */}
                            {gamification.streak > 0 && (
                                <div className="flex items-center gap-1 px-3 py-1.5 bg-orange-50 border border-orange-100 rounded-full text-orange-600">
                                    <Flame size={12} fill="currentColor" />
                                    <span className="text-[9px] font-black uppercase tracking-wider">{gamification.streak} Días</span>
                                </div>
                            )}
                        </div>

                        {/* Barra de progreso */}
                        <div className="space-y-1.5">
                            <div className="w-full h-3 bg-slate-50 border border-slate-100/50 rounded-full overflow-hidden p-0.5">
                                <div 
                                    className="h-full rounded-full transition-all duration-1000"
                                    style={{ width: `${gamification.level.progresoXP}%`, backgroundColor: primaryColor }}
                                />
                            </div>
                            <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                <span>{gamification.level.xpTotal} XP</span>
                                <span>Llegar a Plata</span>
                            </div>
                        </div>

                        {/* Beneficios */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl">
                                <Percent size={14} className="text-pink-500" />
                                <span className="text-[9px] font-black uppercase tracking-wider text-slate-600">Descuentos</span>
                            </div>
                            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl">
                                <Gift size={14} className="text-pink-500" />
                                <span className="text-[9px] font-black uppercase tracking-wider text-slate-600">Regalos</span>
                            </div>
                        </div>
                    </section>
                )}

                {/* ===== SECCIÓN 4: PESTAÑAS, BUSCADOR Y LISTA DE MISIONES ===== */}
                <div className="space-y-4">
                    {/* Filtros Píldora */}
                    <div className="flex gap-1 bg-slate-100/80 border border-slate-200/20 p-1 rounded-full select-none">
                        {(['enProgreso', 'todas', 'completadas'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className="flex-1 py-3 rounded-full text-[9px] font-black uppercase tracking-widest transition-all duration-300 outline-none cursor-pointer border-0"
                                style={{
                                    backgroundColor: activeTab === tab ? '#ffffff' : 'transparent',
                                    color: activeTab === tab ? '#000000' : '#64748b',
                                    boxShadow: activeTab === tab ? '0 4px 10px rgba(0, 0, 0, 0.04)' : 'none'
                                }}
                            >
                                {tab === 'enProgreso' ? 'En progreso' : tab === 'todas' ? 'Todas' : 'Completadas'}
                            </button>
                        ))}
                    </div>

                    {/* Buscador */}
                    <div className="flex gap-2">
                        <div className="relative flex-1 bg-white rounded-2xl border border-slate-100 p-1 flex items-center shadow-sm">
                            <Search className="text-slate-400 ml-3" size={16} />
                            <input 
                                type="text" 
                                placeholder="Buscar misiones..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-transparent border-0 py-2 px-2 text-xs outline-none text-slate-800 placeholder-slate-400 font-bold"
                            />
                        </div>
                        {/* Enlace a listado completo de estados */}
                        <Link
                            href={`/${slug}/misiones/estado`}
                            className="px-4 rounded-2xl border border-slate-100 text-slate-500 bg-white hover:bg-slate-50 flex items-center justify-center gap-1 shadow-sm active:scale-95 transition-transform no-underline"
                        >
                            <span className="text-[10px] font-black uppercase tracking-widest">Estados</span>
                            <ArrowRight size={13} />
                        </Link>
                    </div>

                    {/* Listado de Tarjetas de Misiones */}
                    {loading ? (
                        <div className="py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">Cargando misiones...</div>
                    ) : filteredQuests.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 text-xs font-bold bg-white rounded-3xl border border-slate-100 shadow-sm uppercase tracking-wider">
                            No hay misiones en esta sección por ahora.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredQuests.map(q => {
                                const IconComponent = IconMapper[q.icono] || Award;
                                const isCelebrating = celebrateQuest === q.id;

                                return (
                                    <div 
                                        key={q.id}
                                        className={`bg-white rounded-3xl border p-4 shadow-sm flex items-center justify-between gap-4 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 relative overflow-hidden ${
                                            isCelebrating ? 'border-green-500 bg-green-50/10' : 'border-slate-100'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            {/* Icono de la misión */}
                                            <div 
                                                className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-inner"
                                                style={{ backgroundColor: `${q.color}15`, color: q.color }}
                                            >
                                                <IconComponent size={18} />
                                            </div>
                                            
                                            {/* Título y descripción */}
                                            <div className="min-w-0 space-y-0.5">
                                                <h5 className="font-black text-slate-800 text-[11px] truncate uppercase tracking-tight">
                                                    {q.nombre}
                                                </h5>
                                                <p className="text-[9px] text-slate-450 font-bold leading-normal line-clamp-1">
                                                    {q.descripcion}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Acciones y Recompensas a la derecha */}
                                        <div className="flex items-center gap-2 shrink-0">
                                            {/* Recompensa */}
                                            <span 
                                                className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-pink-50 text-pink-600 border border-pink-100"
                                                style={{ color: primaryColor, backgroundColor: `${primaryColor}08`, borderColor: `${primaryColor}15` }}
                                            >
                                                +{q.recompensas.join(' + ')}
                                            </span>

                                            {/* Estado / Botón */}
                                            {q.estado === 'COMPLETADA' && (
                                                <div className="text-green-500 p-1">
                                                    <CheckCircle2 size={16} fill="currentColor" className="text-white" />
                                                </div>
                                            )}
                                            {q.estado === 'PENDIENTE_APROBACION' && (
                                                <div className="text-amber-500 p-1">
                                                    <Clock size={16} />
                                                </div>
                                            )}
                                            {q.estado === 'EN_PROGRESO' && (
                                                <>
                                                    {q.validacionTipo === 'USUARIO' ? (
                                                        <button 
                                                            onClick={() => handleConfirmQuest(q.id)}
                                                            className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-pink-600 bg-white border border-pink-200 rounded-xl hover:bg-pink-50 active:scale-95 transition-transform cursor-pointer shrink-0"
                                                            style={{ color: primaryColor, borderColor: `${primaryColor}50` }}
                                                        >
                                                            Hacer
                                                        </button>
                                                    ) : (
                                                        <div className="text-slate-300 flex items-center gap-0.5 pl-1">
                                                            <span className="text-[9px] font-black uppercase tracking-widest">{q.progresoActual}/{q.progresoRequerido}</span>
                                                            <ChevronRight size={13} />
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
            </div>
        </div>
    );
}
