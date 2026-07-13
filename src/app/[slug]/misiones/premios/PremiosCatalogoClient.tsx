'use client';

import { useState, useEffect } from 'react';
import { Gift, Coins, Trophy, Loader2, Sparkles, ChevronRight, Lock, Clock, Info, Ticket } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface LoyaltyReward {
    id: string;
    nombre: string;
    descripcion?: string;
    costoPuntos: number;
    imagenUrl?: string;
    tipo: string;
}

interface UserData {
    nombreCliente: string;
    puntos: number;
}

interface PremiosCatalogoClientProps {
    slug: string;
    primaryColor: string;
    textColor: string;
    negocioNombre: string;
}

export default function PremiosCatalogoClient({ slug, primaryColor, textColor, negocioNombre }: PremiosCatalogoClientProps) {
    const router = useRouter();
    const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [redeemLoading, setRedeemLoading] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState<string>('ALL');

    const fetchData = async () => {
        try {
            setLoading(true);
            
            // Intentar cargar la sesión del cliente
            const userRes = await fetch(`/api/${slug}/referrals/me`);
            if (userRes.ok) {
                const uData = await userRes.json();
                setUserData({
                    nombreCliente: uData.nombreCliente || uData.nombre,
                    puntos: uData.puntos || 0
                });
            }

            // Cargar premios canjeables
            const rewardsRes = await fetch(`/api/public/${slug}/loyalty/rewards`);
            if (rewardsRes.ok) {
                const rData = await rewardsRes.json();
                setRewards(rData || []);
            }
        } catch (e) {
            console.error('Error fetching catalog data:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [slug]);

    const handleRedeem = async (reward: LoyaltyReward) => {
        if (!confirm(`¿Confirmas que deseas canjear "${reward.nombre}" por ${reward.costoPuntos} puntos?`)) return;
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
                fetchData(); // Recargar datos para actualizar balance
            } else {
                alert(data.error || 'Error al procesar el canje.');
            }
        } catch (e) {
            alert('Error de conexión.');
        } finally {
            setRedeemLoading(null);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="animate-spin text-pink-600" size={24} style={{ color: primaryColor }} />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cargando catálogo...</span>
            </div>
        );
    }

    const puntosActuales = userData?.puntos || 0;
    const valorMonetario = (puntosActuales * 0.01).toFixed(2);

    // Lógica de niveles de lealtad
    const getLealtadNivel = (pts: number) => {
        if (pts >= 1500) return { nombre: 'Nivel Oro', desc: '¡Miembro VIP de nivel máximo!' };
        if (pts >= 500) return { nombre: 'Nivel Plata', desc: 'Sigue sumando para Nivel Oro' };
        return { nombre: 'Nivel Bronce', desc: 'Sigue acumulando para subir de nivel' };
    };
    const nivel = getLealtadNivel(puntosActuales);

    // Categorías de filtro
    const categories = [
        { id: 'ALL', label: 'Todos', type: 'grid' },
        { id: 'CUPON', label: 'Descuentos', type: 'ticket' },
        { id: 'SERVICIO_GRATIS', label: 'Servicios', type: 'sparkles' },
        { id: 'PRODUCTO', label: 'Productos', type: 'gift' }
    ];

    const filteredRewards = activeCategory === 'ALL'
        ? rewards
        : rewards.filter(r => {
            if (activeCategory === 'CUPON') return r.tipo === 'CUPON';
            if (activeCategory === 'SERVICIO_GRATIS') return r.tipo === 'SERVICIO_GRATIS';
            if (activeCategory === 'PRODUCTO') return r.tipo === 'PRODUCTO' || r.tipo === 'REGALO';
            return true;
        });

    return (
        <main className="min-h-screen bg-slate-50/60 pb-24 select-none">
            {/* Header de navegación - Diseño Premium */}
            <header 
                className="relative px-6 pt-7 pb-8 text-center text-white"
                style={{ backgroundColor: primaryColor }}
            >
                <div className="flex justify-between items-center max-w-md mx-auto relative z-10">
                    <button 
                        onClick={() => router.push(`/${slug}/misiones`)}
                        className="w-9 h-9 rounded-full bg-white flex items-center justify-center active:scale-95 transition-all shadow-sm border-0 cursor-pointer shrink-0"
                        style={{ color: primaryColor }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                    </button>
                    <div className="flex-1 px-4">
                        <h2 className="text-[17px] font-black tracking-tight leading-none">
                            Catálogo de Premios
                        </h2>
                        <p className="text-[10px] text-white/80 font-medium mt-1 leading-none">
                            Canjea tus puntos por beneficios increíbles
                        </p>
                    </div>
                    {/* Botón de Ayuda "?" */}
                    <button 
                        onClick={() => alert('¡Consigue puntos reservando servicios y cumpliendo misiones en el club! Luego, canjéalos por fabulosos cupones y regalos.')}
                        className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white active:scale-95 transition-all border border-white/10 cursor-pointer shrink-0"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    </button>
                </div>
                
                {/* Efecto de curva decorativa en el fondo */}
                <div className="absolute inset-x-0 bottom-0 h-4 bg-slate-50/60 rounded-t-[1.5rem]" />
            </header>

            {/* Contenido interactivo */}
            <div className="max-w-md mx-auto px-4 -mt-4 relative z-20 space-y-5">
                {/* 1. Tarjeta Blanca de Balance y Nivel (Flotante) */}
                <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-lg space-y-4">
                    <div className="flex items-center justify-between gap-3">
                        {/* Sección Puntos */}
                        <div className="flex items-center gap-3">
                            <div 
                                className="w-12 h-12 rounded-full flex items-center justify-center text-white relative shrink-0 shadow-sm"
                                style={{ backgroundColor: `${primaryColor}15` }}
                            >
                                <Trophy size={20} style={{ color: primaryColor }} />
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-400 border border-white rounded-full flex items-center justify-center shadow-xs">
                                    <span className="text-[10px] text-white">&#9733;</span>
                                </div>
                            </div>
                            <div>
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">Mi balance actual</span>
                                <div className="flex items-baseline gap-1 mt-1">
                                    <span className="text-3xl font-black text-slate-900 leading-none">{puntosActuales}</span>
                                    <span className="text-xs font-black text-slate-500 uppercase tracking-wide">puntos</span>
                                </div>
                                <span className="text-[9px] font-black text-slate-400 flex items-center gap-1 mt-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                    Equivalen a ${valorMonetario} en beneficios
                                </span>
                            </div>
                        </div>

                        {/* Sección Nivel de Lealtad */}
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-2.5 flex items-center gap-2 max-w-[155px] cursor-pointer hover:bg-slate-100/50 transition-all shrink-0">
                            <div className="w-7 h-7 rounded-full bg-pink-100 flex items-center justify-center shrink-0" style={{ backgroundColor: `${primaryColor}15` }}>
                                <Trophy size={13} style={{ color: primaryColor }} />
                            </div>
                            <div className="min-w-0">
                                <h4 className="text-[10px] font-black text-slate-900 leading-none">{nivel.nombre}</h4>
                                <p className="text-[7.5px] font-semibold text-slate-400 mt-0.5 leading-tight line-clamp-2">{nivel.desc}</p>
                            </div>
                            <ChevronRight size={10} className="text-slate-400 shrink-0" />
                        </div>
                    </div>

                    {/* Sub-barra de navegación interactiva */}
                    <div className="border-t border-slate-100 pt-3 flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-wider px-2">
                        <button 
                            onClick={() => alert('¡Canjea tus puntos acumulados por fabulosos cupones y servicios gratis! Presenta el código QR de tu cupón en recepción.')}
                            className="flex items-center gap-1.5 hover:text-slate-900 transition-colors bg-transparent border-0 cursor-pointer p-0 font-black"
                        >
                            <Info size={13} style={{ color: primaryColor }} />
                            Cómo funciona
                        </button>
                        <div className="w-px h-3 bg-slate-200" />
                        <button 
                            onClick={() => router.push(`/${slug}/mis-premios`)}
                            className="flex items-center gap-1.5 hover:text-slate-900 transition-colors bg-transparent border-0 cursor-pointer p-0 font-black"
                        >
                            <Gift size={13} style={{ color: primaryColor }} />
                            Mis canjes
                        </button>
                        <div className="w-px h-3 bg-slate-200" />
                        <button 
                            onClick={() => router.push(`/${slug}/mis-premios`)}
                            className="flex items-center gap-1.5 hover:text-slate-900 transition-colors bg-transparent border-0 cursor-pointer p-0 font-black"
                        >
                            <Clock size={13} style={{ color: primaryColor }} />
                            Historial
                        </button>
                    </div>
                </div>

                {/* 2. Pestañas Horizontales de Categorías */}
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none shrink-0 -mx-1 px-1">
                    {categories.map(cat => {
                        const active = activeCategory === cat.id;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className="px-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shrink-0 cursor-pointer border-0 shadow-sm"
                                style={{
                                    backgroundColor: active ? primaryColor : '#ffffff',
                                    color: active ? '#ffffff' : '#64748b'
                                }}
                            >
                                {cat.type === 'grid' && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>}
                                {cat.type === 'ticket' && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/></svg>}
                                {cat.type === 'sparkles' && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z"/></svg>}
                                {cat.type === 'gift' && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M12 2a3 3 0 0 0-3 3c0 2 3 6 3 6s3-4 3-6a3 3 0 0 0-3-3Z"/><path d="M3 11h18"/></svg>}
                                {cat.label}
                            </button>
                        );
                    })}
                </div>

                {/* 3. Listado de Premios Detallado */}
                <div className="space-y-4">
                    {filteredRewards.length === 0 ? (
                        <div className="bg-white border border-slate-100 rounded-3xl p-8 text-center shadow-sm">
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                                No hay premios en esta categoría por el momento.
                            </p>
                        </div>
                    ) : (
                        filteredRewards.map(reward => {
                            const pct = Math.min(100, (puntosActuales / reward.costoPuntos) * 100);
                            const tienePuntos = puntosActuales >= reward.costoPuntos;
                            const esGratis = reward.costoPuntos === 0;

                            // Tipo de premio legible
                            const getTipoTexto = (t: string) => {
                                if (t === 'CUPON') return 'Descuento';
                                if (t === 'SERVICIO_GRATIS') return 'Servicio Gratis';
                                if (t === 'PRODUCTO' || t === 'REGALO') return 'Producto';
                                return 'Recompensa';
                            };

                            return (
                                <div 
                                    key={reward.id}
                                    className="bg-white border border-slate-100 rounded-3xl p-4.5 shadow-sm space-y-3.5 relative overflow-hidden flex flex-col"
                                >
                                    {/* Cinta Gratis en la esquina superior derecha */}
                                    {esGratis && (
                                        <div className="absolute top-0 right-0 overflow-hidden w-16 h-16 pointer-events-none z-10">
                                            <div className="absolute top-2.5 right-[-24px] w-20 bg-pink-500 text-white text-[7px] font-black uppercase text-center py-0.5 rotate-45 tracking-widest shadow-xs" style={{ backgroundColor: primaryColor }}>
                                                ¡GRATIS!
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                            {/* Imagen o Icono de Premio */}
                                            <div 
                                                className="w-14 h-14 rounded-2xl flex items-center justify-center border border-slate-100/80 shrink-0 overflow-hidden"
                                                style={{ backgroundColor: `${primaryColor}08` }}
                                            >
                                                {reward.imagenUrl ? (
                                                    <img src={reward.imagenUrl} alt={reward.nombre} className="w-full h-full object-cover" />
                                                ) : reward.tipo === 'CUPON' ? (
                                                    <Ticket size={22} style={{ color: primaryColor }} />
                                                ) : reward.tipo === 'SERVICIO_GRATIS' ? (
                                                    <Sparkles size={22} style={{ color: primaryColor }} />
                                                ) : (
                                                    <Gift size={22} style={{ color: primaryColor }} />
                                                )}
                                            </div>

                                            {/* Detalles */}
                                            <div className="min-w-0 flex-1 space-y-0.5">
                                                <span 
                                                    className="text-[7.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border leading-none inline-block"
                                                    style={{ 
                                                        color: primaryColor, 
                                                        backgroundColor: `${primaryColor}08`, 
                                                        borderColor: `${primaryColor}15` 
                                                    }}
                                                >
                                                    {getTipoTexto(reward.tipo)}
                                                </span>
                                                <h4 className="text-[13px] font-black text-slate-900 tracking-tight leading-tight truncate">
                                                    {reward.nombre}
                                                </h4>
                                                {reward.descripcion && (
                                                    <p className="text-[9.5px] text-slate-400 font-bold leading-tight line-clamp-2">
                                                        {reward.descripcion}
                                                    </p>
                                                )}
                                                <span className="text-[9px] font-black block mt-0.5" style={{ color: primaryColor }}>
                                                    Cuesta: {reward.costoPuntos} pts
                                                </span>
                                            </div>
                                        </div>

                                        {/* Botón de canje a la derecha */}
                                        <div className="shrink-0 pl-1 z-10">
                                            {tienePuntos ? (
                                                <button
                                                    onClick={() => handleRedeem(reward)}
                                                    disabled={redeemLoading === reward.id}
                                                    className="py-2.5 px-4 bg-pink-600 text-white rounded-2xl font-black text-[9.5px] uppercase tracking-wider flex items-center justify-center gap-1 hover:brightness-110 active:scale-95 transition-all border-0 cursor-pointer shadow-sm"
                                                    style={{ backgroundColor: primaryColor }}
                                                >
                                                    {redeemLoading === reward.id ? (
                                                        <Loader2 className="animate-spin" size={12} />
                                                    ) : (
                                                        <>
                                                            CANJEAR
                                                            <ChevronRight size={11} strokeWidth={3} />
                                                        </>
                                                    )}
                                                </button>
                                            ) : (
                                                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-2 flex flex-col items-center justify-center text-center w-[98px] h-[52px] shrink-0">
                                                    <Lock size={12} className="text-slate-400" />
                                                    <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-tight mt-0.5 leading-none">FALTAN</span>
                                                    <span className="text-[9.5px] font-black text-slate-500 mt-0.5 leading-none">{reward.costoPuntos - puntosActuales} PTS</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Barra de Progreso de Puntos */}
                                    <div className="space-y-1.5 border-t border-slate-50 pt-2.5">
                                        <div className="flex justify-between items-center text-[8.5px] font-black text-slate-400 uppercase tracking-wider leading-none">
                                            <span>Progreso para canjear</span>
                                            <span style={{ color: tienePuntos ? primaryColor : '#64748b' }}>
                                                {puntosActuales} / {reward.costoPuntos} pts
                                            </span>
                                        </div>
                                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/20">
                                            <div 
                                                className="h-full rounded-full transition-all duration-500"
                                                style={{ 
                                                    width: `${pct}%`, 
                                                    backgroundColor: tienePuntos ? primaryColor : '#cbd5e1' 
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* 4. Banner Inferior de Novedades */}
                <div className="bg-pink-50/50 border border-pink-100/50 rounded-3xl p-4 flex items-center justify-between gap-3 shadow-xs" style={{ backgroundColor: `${primaryColor}08`, borderColor: `${primaryColor}15` }}>
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${primaryColor}15` }}>
                            <Trophy size={16} style={{ color: primaryColor }} />
                        </div>
                        <div className="min-w-0">
                            <h4 className="text-[11px] font-black text-slate-900 leading-none">Nuevos premios cada semana</h4>
                            <p className="text-[9px] font-semibold text-slate-400 mt-0.5 leading-tight">Vuelve pronto y descubre beneficios exclusivos.</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => alert('¡Estaremos publicando nuevos e increíbles beneficios de canje muy pronto!')}
                        className="px-3.5 py-2 text-[8px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer bg-white border shrink-0 flex items-center gap-1"
                        style={{ color: primaryColor, borderColor: `${primaryColor}40` }}
                    >
                        Ver novedades
                        <Sparkles size={8} />
                    </button>
                </div>
            </div>
        </main>
    );
}
