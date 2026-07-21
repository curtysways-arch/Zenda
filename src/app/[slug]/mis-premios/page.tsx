'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { 
    ArrowLeft, 
    Gift, 
    Clock, 
    CheckCircle, 
    AlertTriangle, 
    QrCode, 
    Percent, 
    Scissors, 
    Coins, 
    ChevronRight, 
    Sparkles, 
    HelpCircle, 
    Clipboard 
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface UnifiedReward {
    id: string;
    tipoOrigen: 'REFERIDO' | 'PUNTOS' | 'CUPON';
    rewardType: string;
    nombre: string;
    descripcion: string;
    claimCode?: string;
    claimToken?: string;
    claimTokenExpiresAt?: string;
    claimSignature?: string;
    recompensaImagenUrl?: string;
    fechaAsignacion: string;
    fechaEntrega?: string;
    observaciones?: string;
    estado: string;
    isManual?: boolean;
    descuento?: number;
    tipoDescuento?: string;
    codigo?: string;
    serviceId?: string;
    questId?: string | null;
}

interface HistoryItem {
    id: string;
    puntos: number;
    concepto: string;
    label: string;
    color: string;
    notas: string;
    fecha: string;
}

export default function MisPremiosPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;

    const [rewards, setRewards] = useState<{
        disponibles: UnifiedReward[];
        pendientesEntrega: UnifiedReward[];
        entregados: UnifiedReward[];
        vencidos: UnifiedReward[];
    }>({ disponibles: [], pendientesEntrega: [], entregados: [], vencidos: [] });

    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    
    // Categorías de la maqueta
    const [activeTab, setActiveTab] = useState<'todos' | 'cupones' | 'servicios' | 'fisicos' | 'cashback'>('todos');
    const [negocio, setNegocio] = useState<any>(null);
    const [hasSession, setHasSession] = useState<boolean | null>(null);
    const [selectedQR, setSelectedQR] = useState<UnifiedReward | null>(null);

    const searchParams = useSearchParams();
    const questIdParam = searchParams.get('questId');
    const [focusedRewardId, setFocusedRewardId] = useState<string | null>(null);

    const primaryColor = negocio?.colorPrimario || '#db2777';
    const textColor = negocio?.colorTexto || '#ffffff';

    const checkSession = async () => {
        try {
            const res = await fetch(`/api/${slug}/auth/session`, { credentials: 'include' });
            const data = await res.json();
            setHasSession(data.active === true);
            if (!data.active) {
                router.push(`/${slug}/perfil`);
            }
        } catch {
            setHasSession(false);
            router.push(`/${slug}/perfil`);
        }
    };

    const fetchRewards = async () => {
        try {
            setLoading(true);
            const [rewardsRes, historyRes, profileRes] = await Promise.all([
                fetch(`/api/public/${slug}/loyalty/my-rewards`),
                fetch(`/api/public/${slug}/loyalty/history`),
                fetch(`/api/${slug}/referrals/me?t=${Date.now()}`)
            ]);

            if (rewardsRes.ok) {
                const data = await rewardsRes.json();
                setRewards(data);
            }
            if (historyRes.ok) {
                const data = await historyRes.json();
                setHistory(data.history || []);
            }
            if (profileRes.ok) {
                const data = await profileRes.json();
                setUserProfile(data);
            }
        } catch (e) {
            console.error("Error cargando mis premios:", e);
        } finally {
            setLoading(false);
        }
    };

    const fetchBusiness = async () => {
        try {
            const res = await fetch(`/api/public/negocio/${slug}`);
            if (res.ok) {
                const data = await res.json();
                setNegocio(data);
            }
        } catch (e) {
            console.error("Error cargando negocio:", e);
        }
    };

    useEffect(() => {
        if (slug) {
            checkSession();
            fetchBusiness();
        }
    }, [slug]);

    useEffect(() => {
        if (hasSession === true) {
            fetchRewards();
        }
    }, [hasSession]);

    // Enfocar premio por questId de URL
    useEffect(() => {
        if (questIdParam && rewards) {
            let foundId: string | null = null;
            const inDisponibles = rewards.disponibles.find((r: any) => r.questId === questIdParam);
            if (inDisponibles) {
                foundId = inDisponibles.id;
                setActiveTab('todos');
            } else {
                const inPendientes = rewards.pendientesEntrega.find((r: any) => r.questId === questIdParam);
                if (inPendientes) {
                    foundId = inPendientes.id;
                    setActiveTab('todos');
                }
            }

            if (foundId) {
                setFocusedRewardId(foundId);
                setTimeout(() => {
                    const el = document.getElementById(`reward-card-${foundId}`);
                    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 400);
            }
        }
    }, [questIdParam, rewards]);

    const handleSolicitarPremio = async (redemptionId: string) => {
        try {
            setLoading(true);
            const res = await fetch(`/api/public/${slug}/loyalty/solicitar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ redemptionId })
            });
            const data = await res.json();
            if (res.ok) {
                alert("¡Premio solicitado con éxito! El negocio preparará tu premio y te notificará por WhatsApp.");
                await fetchRewards();
            } else {
                alert("Error: " + (data.error || "No se pudo solicitar el premio."));
            }
        } catch (e) {
            console.error("Error solicitando premio:", e);
            alert("Error de conexión. Inténtalo de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    const handleRegenerarQR = async (redemptionId: string, tipoOrigen: string) => {
        try {
            setLoading(true);
            const res = await fetch(`/api/public/${slug}/loyalty/regenerar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ redemptionId, tipoOrigen })
            });
            const data = await res.json();
            if (res.ok) {
                alert("¡Código QR regenerado con éxito! Tienes 30 días adicionales para retirar tu premio.");
                await fetchRewards();
            } else {
                alert("Error: " + (data.error || "No se pudo regenerar el código QR."));
            }
        } catch (e) {
            console.error("Error regenerando QR:", e);
            alert("Error de conexión. Inténtalo de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    const handleCopyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        alert(`¡Código "${code}" copiado al portapapeles!`);
    };

    // --- FILTRADO DE RECOMPENSAS SEGÚN CATEGORÍA ---
    const filteredRewards = useMemo(() => {
        const disponibles = rewards.disponibles || [];
        const pendientes = rewards.pendientesEntrega || [];
        
        switch (activeTab) {
            case 'cupones':
                return disponibles.filter(r => r.rewardType === 'CUPON' || r.tipoOrigen === 'CUPON');
            case 'servicios':
                return disponibles.filter(r => r.rewardType === 'SERVICIO_GRATIS' || r.rewardType === 'SERVICIO');
            case 'fisicos':
                return [
                    ...pendientes,
                    ...disponibles.filter(r => r.rewardType !== 'CUPON' && r.rewardType !== 'SERVICIO_GRATIS' && r.rewardType !== 'SERVICIO')
                ];
            case 'todos':
            default:
                return [...disponibles, ...pendientes];
        }
    }, [activeTab, rewards]);

    if (hasSession === null || loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <div className="animate-pulse flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-indigo-600 animate-spin" style={{ borderTopColor: primaryColor }} />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cargando tus beneficios...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50/50 pb-28">
            {/* CABECERA (Mis Beneficios) */}
            <header className="bg-white border-b border-slate-100 px-4 pt-7 pb-5 sticky top-0 z-30 shadow-xs">
                <div className="max-w-md mx-auto flex items-center justify-between">
                    <button 
                        onClick={() => {
                            if (window.history.length > 1) {
                                router.back();
                            } else {
                                router.push(`/${slug}/perfil`);
                            }
                        }} 
                        className="w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-700 active:scale-95 transition-all border-0 cursor-pointer shadow-xs"
                    >
                        <ArrowLeft size={16} />
                    </button>
                    
                    <div className="text-center flex-1">
                        <h1 className="text-lg font-black text-slate-800 tracking-tight leading-none">Mis Beneficios</h1>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Tus recompensas y beneficios exclusivos</p>
                    </div>

                    <div className="w-10 h-10" />
                </div>
            </header>

            <div className="max-w-md mx-auto px-2.5 mt-4 space-y-5">
                
                {/* 1. SECTOR DE PESTAÑAS (Filtros de Iconos Estilo Maqueta) */}
                <div className="bg-white rounded-3xl p-3 shadow-xs border border-slate-100/60 overflow-x-auto scrollbar-none flex items-center justify-between gap-1.5 snap-x">
                    {[
                        { id: 'todos', label: 'Todos', color: '#6366f1', icon: Gift },
                        { id: 'cupones', label: 'Cupones', color: '#10b981', icon: Percent },
                        { id: 'servicios', label: 'Servicios', color: '#0ea5e9', icon: Scissors },
                        { id: 'fisicos', label: 'Físicos', color: '#f43f5e', icon: Gift },
                        { id: 'cashback', label: 'Cashback', color: '#eab308', icon: Coins }
                    ].map((tab) => {
                        const IconComp = tab.icon;
                        const isSelected = activeTab === tab.id;
                        
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className="flex-1 min-w-[62px] flex flex-col items-center gap-1.5 border-0 bg-transparent cursor-pointer active:scale-95 transition-all outline-none"
                            >
                                <div 
                                    className="size-11 rounded-2xl flex items-center justify-center transition-all duration-300 relative"
                                    style={{ 
                                        backgroundColor: isSelected ? tab.color : `${tab.color}12`,
                                        color: isSelected ? '#ffffff' : tab.color
                                    }}
                                >
                                    <IconComp size={18} className="stroke-[2.2]" />
                                    {isSelected && (
                                        <div 
                                            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full" 
                                            style={{ backgroundColor: tab.color }} 
                                        />
                                    )}
                                </div>
                                <span 
                                    className={`text-[9px] font-black uppercase tracking-wider ${
                                        isSelected ? 'text-slate-800 font-extrabold' : 'text-slate-400'
                                    }`}
                                >
                                    {tab.label}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* 2. CONTENIDO PRINCIPAL: ACTIVOS */}
                {activeTab !== 'cashback' && (
                    <section className="space-y-3">
                        <div className="flex justify-between items-end px-1">
                            <h2 className="text-[13px] font-black text-slate-800 uppercase tracking-widest">Activos</h2>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                {filteredRewards.length} en total
                            </span>
                        </div>

                        {filteredRewards.length === 0 ? (
                            <div className="bg-white border border-slate-100 rounded-[2.5rem] p-10 text-center shadow-xs">
                                <Gift className="mx-auto text-slate-300 mb-3" size={32} />
                                <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-tight">Sin beneficios disponibles</h3>
                                <p className="text-slate-400 text-[8.5px] font-bold uppercase tracking-wider mt-1.5 max-w-[200px] mx-auto leading-normal">
                                    Completa desafíos en el club o acumula diamantes para desbloquear recompensas exclusivas.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredRewards.map((reward) => {
                                    const isCupón = reward.rewardType === 'CUPON' || reward.tipoOrigen === 'CUPON';
                                    const isServicio = reward.rewardType === 'SERVICIO_GRATIS' || reward.rewardType === 'SERVICIO';
                                    const isPendienteReclamo = reward.estado === 'PENDIENTE_ENTREGA' || reward.estado === 'LISTO_PARA_RETIRAR' || reward.estado === 'SOLICITADO';
                                    const isCashback = (reward.rewardType as any) === 'CASHBACK' || (reward.tipoOrigen as any) === 'CASHBACK' || reward.nombre.toLowerCase().includes('cash') || reward.nombre.toLowerCase().includes('saldo') || reward.nombre.toLowerCase().includes('monedero');
                                    
                                    // Extraer monto de Cashback
                                    let cashVal = '$10';
                                    const cashMatch = reward.nombre.match(/\$\s*(\d+(\.\d+)?)/) || reward.nombre.match(/\b(\d+(\.\d+)?)\b/) || reward.descripcion?.match(/\$\s*(\d+(\.\d+)?)/);
                                    if (cashMatch) {
                                        cashVal = `$${cashMatch[1]}`;
                                    }

                                    // 1. Renderizado de tarjeta de Cupón destacado
                                    if (isCupón) {
                                        // Extraer etiqueta de descuento inteligente (ej. 10%, 15%, $20, etc.)
                                        let descLabel = 'DTO';
                                        if (reward.descuento && reward.descuento > 0) {
                                            descLabel = reward.tipoDescuento === 'FIJO' ? `$${reward.descuento}` : `${reward.descuento}%`;
                                        } else if (reward.codigo) {
                                            const codeDigits = reward.codigo.match(/\d+/);
                                            if (codeDigits) {
                                                descLabel = `${codeDigits[0]}%`;
                                            }
                                        }
                                        
                                        if (descLabel === 'DTO') {
                                            const combinedText = `${reward.nombre} ${reward.descripcion}`.toLowerCase();
                                            const pctMatch = combinedText.match(/(\d+)\s*%/);
                                            if (pctMatch) {
                                                descLabel = `${pctMatch[1]}%`;
                                            } else {
                                                const valMatch = combinedText.match(/\$\s*(\d+)/);
                                                if (valMatch) descLabel = `$${valMatch[1]}`;
                                            }
                                        }

                                        return (
                                            <div
                                                key={reward.id}
                                                id={`reward-card-${reward.id}`}
                                                className={`relative overflow-hidden rounded-[2.5rem] border border-slate-100/60 shadow-xs flex items-center p-3.5 bg-white ${
                                                    focusedRewardId === reward.id ? 'ring-2 ring-indigo-500 scale-[1.01]' : ''
                                                }`}
                                            >
                                                {/* Gradiente de fondo estilizado */}
                                                <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
                                                    backgroundImage: `radial-gradient(circle at 100% 150%, ${primaryColor} 24%, transparent 24%), radial-gradient(circle at 0% -50%, ${primaryColor} 24%, transparent 24%)`,
                                                    backgroundSize: '24px 24px'
                                                }} />

                                                {/* Badge izquierdo estilo cupón físico troquelado */}
                                                <div 
                                                    className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center text-white shrink-0 shadow-xs font-black relative border-r border-dashed border-white/30 overflow-hidden pr-1"
                                                    style={{ 
                                                        background: `linear-gradient(135deg, ${primaryColor} 0%, color-mix(in srgb, ${primaryColor}, #000 15%) 100%)` 
                                                    }}
                                                >
                                                    {/* Semicírculos de troquelado en la divisoria */}
                                                    <div className="absolute -top-1 right-[-4px] w-2 h-2 rounded-full bg-slate-50/50" />
                                                    <div className="absolute -bottom-1 right-[-4px] w-2 h-2 rounded-full bg-slate-50/50" />

                                                    <span className="text-[13px] leading-none tracking-tight font-extrabold">{descLabel}</span>
                                                    <span className="text-[7px] tracking-widest font-black uppercase mt-0.5 opacity-95 px-1 bg-white/20 rounded">DCTO.</span>
                                                </div>

                                                {/* Contenido derecho */}
                                                <div className="flex-1 pl-4 text-left">
                                                    <h3 className="text-[12.5px] font-black text-slate-800 leading-snug uppercase tracking-tight">
                                                        {reward.nombre}
                                                    </h3>
                                                    <p className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1">
                                                        <Clock size={11} className="stroke-[2.5]" />
                                                        <span>Vence: 15/06/2026</span>
                                                    </p>

                                                    {reward.codigo && (
                                                         <div className="mt-2 flex flex-col items-start gap-1">
                                                             <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-100 rounded-xl">
                                                                 <span className="text-[9px] font-black text-slate-500 font-mono tracking-wider">{reward.codigo}</span>
                                                                 <button
                                                                     type="button"
                                                                     onClick={(e) => { e.preventDefault(); handleCopyCode(reward.codigo!); }}
                                                                     className="p-1 rounded bg-transparent border-0 text-slate-400 hover:text-slate-650 cursor-pointer flex items-center"
                                                                 >
                                                                     <Clipboard size={10} />
                                                                 </button>
                                                             </div>
                                                             <span className="text-[8px] font-black text-slate-400 leading-none mt-1 uppercase tracking-wider">
                                                                 🎟️ Úsalo en la casilla de cupones al reservar tu cita.
                                                             </span>
                                                         </div>
                                                     )}
                                                </div>
                                            </div>
                                        );
                                    }

                                    // 2. Renderizado de tarjeta de Servicio Gratis
                                    if (isServicio) {
                                        return (
                                            <div
                                                key={reward.id}
                                                id={`reward-card-${reward.id}`}
                                                className="bg-white border border-slate-100 rounded-[2rem] p-4 flex items-center shadow-xs"
                                            >
                                                {reward.recompensaImagenUrl ? (
                                                    <img
                                                        src={reward.recompensaImagenUrl}
                                                        alt={reward.nombre}
                                                        className="size-14 rounded-2xl object-cover shrink-0 shadow-xs border border-slate-100"
                                                    />
                                                ) : (
                                                    <div className="size-14 rounded-2xl bg-sky-50 text-sky-500 flex items-center justify-center shrink-0 border border-sky-100/50">
                                                        <Scissors size={20} className="stroke-[2.2]" />
                                                    </div>
                                                )}
                                                <div className="flex-1 pl-4 text-left">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">{reward.nombre}</h3>
                                                        <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 uppercase tracking-widest font-mono shrink-0">
                                                            GRATIS
                                                        </span>
                                                    </div>
                                                    <p className="text-[9.5px] font-bold text-sky-600 mt-0.5 flex items-center gap-1">
                                                        ✂️ Gratis al reservar cita
                                                    </p>
                                                    <p className="text-[9px] text-slate-400 font-bold mt-1">
                                                        Vence: 30/06/2026
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    }

                                    // 3. Renderizado de Premios Físicos
                                    return (
                                        <div
                                            key={reward.id}
                                            id={`reward-card-${reward.id}`}
                                            className="bg-white border border-slate-100 rounded-[2rem] p-4 flex flex-col gap-3 shadow-xs"
                                        >
                                            <div className="flex items-center">
                                                {isCashback ? (
                                                    <div 
                                                        className="size-14 rounded-2xl flex flex-col items-center justify-center text-white shrink-0 shadow-xs font-black relative overflow-hidden"
                                                        style={{ background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)' }}
                                                    >
                                                        <Coins size={18} className="text-white animate-pulse" />
                                                        <span className="text-[7.5px] font-black uppercase mt-0.5 tracking-wider">{cashVal}</span>
                                                    </div>
                                                ) : (
                                                    <div className="size-14 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0 border border-rose-100/50">
                                                        <Gift size={20} className="stroke-[2.2]" />
                                                    </div>
                                                )}
                                                <div className="flex-1 pl-4 text-left">
                                                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">{reward.nombre}</h3>
                                                    
                                                    {/* Badge de Estado del Premio */}
                                                    {reward.estado === 'LISTO_PARA_RETIRAR' ? (
                                                        <span className="inline-block px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-md text-[7.5px] font-black uppercase tracking-wider mt-1">
                                                            Listo para retirar
                                                        </span>
                                                    ) : reward.estado === 'SOLICITADO' ? (
                                                        <span className="inline-block px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 rounded-md text-[7.5px] font-black uppercase tracking-wider mt-1">
                                                            Solicitado / Preparando
                                                        </span>
                                                    ) : (
                                                        <span className="inline-block px-2 py-0.5 bg-slate-50 text-slate-500 border border-slate-150 rounded-md text-[7.5px] font-black uppercase tracking-wider mt-1">
                                                            Disponible
                                                        </span>
                                                    )}

                                                    <p className="text-[8.5px] text-slate-400 font-semibold mt-1">
                                                        Solicitado: {new Date(reward.fechaAsignacion).toLocaleDateString('es-ES')}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Controles de reclamo de premios físicos */}
                                            {isPendienteReclamo && (
                                                <div className="pt-2 border-t border-slate-50 flex items-center justify-between">
                                                    {reward.estado === 'PENDIENTE_ENTREGA' && (
                                                        <button
                                                            onClick={() => handleSolicitarPremio(reward.id)}
                                                            className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all border-0 shadow-xs cursor-pointer"
                                                        >
                                                            Solicitar Retiro
                                                        </button>
                                                    )}
                                                    {reward.estado === 'SOLICITADO' && reward.claimCode && (
                                                        <div className="w-full flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                                                            <div className="text-left">
                                                                <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest block leading-none">Código</span>
                                                                <span className="text-sm font-black text-slate-800 font-mono tracking-wider">{reward.claimCode}</span>
                                                            </div>
                                                            <button
                                                                onClick={() => setSelectedQR(reward)}
                                                                className="px-3.5 py-2 bg-slate-900 text-white rounded-lg text-[8.5px] font-black uppercase tracking-widest flex items-center gap-1 hover:bg-slate-800 cursor-pointer border-0 shadow-xs"
                                                            >
                                                                <QrCode size={11} />
                                                                Ver QR
                                                            </button>
                                                        </div>
                                                    )}
                                                    {reward.estado === 'LISTO_PARA_RETIRAR' && reward.claimCode && (
                                                        <div className="w-full flex items-center justify-between bg-emerald-50/20 border border-emerald-100 rounded-xl p-2.5">
                                                            <div className="text-left">
                                                                <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest block leading-none">CÓDIGO DE ENTREGA</span>
                                                                <span className="text-sm font-black text-emerald-700 font-mono tracking-wider">{reward.claimCode}</span>
                                                            </div>
                                                            <button
                                                                onClick={() => setSelectedQR(reward)}
                                                                className="px-3.5 py-2 bg-emerald-600 text-white rounded-lg text-[8.5px] font-black uppercase tracking-widest flex items-center gap-1 hover:bg-emerald-700 cursor-pointer border-0 shadow-xs"
                                                            >
                                                                <QrCode size={11} />
                                                                Ver QR
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                )}

                {/* 3. SECCIÓN DE CASHBACK COMPLETA */}
                {activeTab === 'cashback' && (
                    <section className="space-y-4 animate-[fadeIn_0.2s_ease-out]">
                        <div className="flex justify-between items-end px-1">
                            <h2 className="text-[13px] font-black text-slate-800 uppercase tracking-widest">Monedero Cashback</h2>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Activo</span>
                        </div>

                        {/* Tarjeta Monedero Cashback Premium */}
                        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-[2.5rem] p-6 text-white shadow-lg relative overflow-hidden text-center">
                            {/* Círculos translúcidos decorativos */}
                            <div className="absolute -right-8 -top-8 size-28 rounded-full bg-white/10" />
                            <div className="absolute -left-12 -bottom-12 size-36 rounded-full bg-white/5" />

                            <div className="size-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center mx-auto text-white shadow-xs">
                                <Coins size={24} className="text-white" />
                            </div>

                            <div className="space-y-1.5 mt-4">
                                <span className="text-[9px] font-black text-white/80 uppercase tracking-widest block leading-none">Mi Saldo Disponible</span>
                                <h3 className="text-4xl font-black tracking-tight leading-none">
                                    ${(userProfile?.cashback || 0.0).toFixed(2)}
                                </h3>
                                <p className="text-[8px] font-black text-white/60 uppercase tracking-widest leading-none pt-0.5">DÓLARES EN EFECTIVO</p>
                            </div>

                            <div className="border-t border-white/10 mt-6 pt-4 text-[9px] font-bold text-white/80 leading-normal">
                                Usa tu saldo de cashback acumulado como descuento directo al pagar tus citas y servicios favoritos.
                            </div>
                        </div>

                        {/* Misiones de Cashback */}
                        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-5 shadow-xs text-left space-y-3">
                            <div className="flex items-center gap-2 text-[10.5px] font-black text-slate-800 uppercase tracking-wider">
                                <Sparkles size={14} className="text-amber-500" />
                                <span>¿Cómo acumular cashback?</span>
                            </div>
                            <ul className="space-y-2 text-[9.5px] font-semibold text-slate-400 uppercase tracking-wide leading-relaxed list-none p-0 m-0">
                                <li className="flex items-start gap-1.5">
                                    <span className="text-amber-500">💰</span>
                                    <span>Recibe un porcentaje de cashback por cada cita pagada.</span>
                                </li>
                                <li className="flex items-start gap-1.5">
                                    <span className="text-amber-500">👥</span>
                                    <span>Gana cashback en tu monedero cuando tus recomendados se atiendan.</span>
                                </li>
                            </ul>
                        </div>
                    </section>
                )}

                {/* 4. HISTORIAL RECIENTE */}
                <section className="space-y-3">
                    <div className="flex justify-between items-end px-1 pt-2">
                        <h2 className="text-[13px] font-black text-slate-800 uppercase tracking-widest">Historial reciente</h2>
                        <button 
                            onClick={() => router.push(`/${slug}/historial`)}
                            className="text-[9px] font-black uppercase tracking-widest text-indigo-655 bg-transparent border-0 cursor-pointer outline-none font-bold"
                            style={{ color: primaryColor }}
                        >
                            Ver todo
                        </button>
                    </div>

                    {history.length === 0 ? (
                        <div className="bg-white border border-slate-100 rounded-[2rem] p-8 text-center shadow-xs">
                            <Clock className="mx-auto text-slate-300 mb-2" size={24} />
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                No se registran movimientos aún.
                            </p>
                        </div>
                    ) : (
                        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-1.5 shadow-xs divide-y divide-slate-100/60 overflow-hidden">
                            {history.slice(0, 4).map((item) => {
                                const isPositive = item.puntos > 0;
                                const isCashback = item.concepto === 'CASHBACK' || item.concepto === 'REFERIDO_CASHBACK' || item.label.toLowerCase().includes('cashback');
                                
                                return (
                                    <div 
                                        key={item.id}
                                        onClick={() => router.push(`/${slug}/historial`)}
                                        className="flex items-center justify-between p-4.5 hover:bg-slate-50/50 transition-colors cursor-pointer select-none active:bg-slate-100/30"
                                    >
                                        <div className="flex items-center gap-3.5">
                                            {/* Icono de color */}
                                            <div 
                                                className={`size-10 rounded-2xl flex items-center justify-center shrink-0 border`}
                                                style={{ 
                                                    backgroundColor: isCashback ? '#fef9c3' : '#f0fdf4',
                                                    borderColor: isCashback ? '#fef08a' : '#bbf7d0',
                                                    color: isCashback ? '#ca8a04' : '#16a34a'
                                                }}
                                            >
                                                {isCashback ? (
                                                    <Coins size={16} className="stroke-[2.2]" />
                                                ) : (
                                                    <Percent size={16} className="stroke-[2.2]" />
                                                )}
                                            </div>

                                            <div className="text-left space-y-0.5">
                                                <h4 className="text-[11.5px] font-black text-slate-800 uppercase tracking-tight">
                                                    {item.label}
                                                </h4>
                                                <p className="text-[8.5px] font-bold text-slate-400 uppercase tracking-widest">
                                                    {new Date(item.fecha).toLocaleDateString('es-ES')}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {/* Badge de Estado */}
                                            <span 
                                                className={`px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-wider border`}
                                                style={{ 
                                                    backgroundColor: isCashback ? '#fef9c3' : '#f0fdf4',
                                                    borderColor: isCashback ? '#fef08a' : '#bbf7d0',
                                                    color: isCashback ? '#ca8a04' : '#16a34a'
                                                }}
                                            >
                                                {isCashback ? 'Acreditado' : 'Canjeado'}
                                            </span>
                                            
                                            <ChevronRight size={14} className="text-slate-300" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>

            {/* MODAL DE CÓDIGO QR PARA RECLAMAR */}
            {selectedQR && (() => {
                const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
                const qrUrl = `${appUrl}/reward/${selectedQR.claimToken}?sig=${selectedQR.claimSignature}`;
                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="relative w-full max-w-[320px] bg-white rounded-[2.5rem] p-6 shadow-2xl space-y-4 border border-slate-100 text-center animate-in zoom-in-95 duration-300">
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">
                                Código de Reclamo
                            </h3>
                            <p className="text-[10px] font-black uppercase tracking-wider text-pink-655 bg-pink-50 border border-pink-100 px-3 py-1.5 rounded-xl inline-block font-mono font-bold">
                                {selectedQR.claimCode}
                            </p>
                            
                            {/* Código QR */}
                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-center justify-center mx-auto w-fit">
                                <QRCodeSVG 
                                    value={qrUrl} 
                                    size={170}
                                    fgColor="#0f172a"
                                    level="H"
                                />
                            </div>

                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-relaxed">
                                Presenta este código QR al personal del negocio para confirmar tu entrega.
                            </p>

                            <button
                                onClick={() => setSelectedQR(null)}
                                className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-colors cursor-pointer border-0"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
