'use client';

import { useState, useEffect } from 'react';
import { Gift, Coins, Trophy, Loader2, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface LoyaltyReward {
    id: string;
    nombre: string;
    descripcion?: string;
    costoPuntos: number;
    imagenUrl?: string;
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

    return (
        <div className="space-y-6">
            {/* Balance de puntos del usuario */}
            <div 
                className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm flex items-center justify-between"
            >
                <div className="flex items-center gap-3">
                    <div 
                        className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm"
                        style={{ backgroundColor: primaryColor }}
                    >
                        <Trophy size={18} />
                    </div>
                    <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block leading-none">Mi balance actual</span>
                        <h3 className="text-xl font-black text-slate-800 leading-tight mt-1 flex items-center gap-1.5">
                            <Coins size={16} style={{ color: primaryColor }} />
                            {puntosActuales} <span className="text-xs text-slate-500 font-bold">puntos</span>
                        </h3>
                    </div>
                </div>

                {!userData && (
                    <button
                        onClick={() => router.push(`/${slug}/perfil`)}
                        className="px-3.5 py-2 text-[9px] font-black uppercase tracking-widest text-white rounded-xl shadow-sm border-0 cursor-pointer"
                        style={{ backgroundColor: primaryColor }}
                    >
                        Iniciar Sesión
                    </button>
                )}
            </div>

            {/* Listado de premios detallado */}
            <div className="space-y-4">
                {rewards.length === 0 ? (
                    <div className="bg-white border border-slate-100 rounded-3xl p-8 text-center shadow-sm">
                        <p className="text-slate-450 text-xs font-bold uppercase tracking-wider">
                            No hay premios configurados por el momento.
                        </p>
                    </div>
                ) : (
                    rewards.map(reward => {
                        const pct = Math.min(100, (puntosActuales / reward.costoPuntos) * 100);
                        const tienePuntos = puntosActuales >= reward.costoPuntos;

                        return (
                            <div 
                                key={reward.id}
                                className="bg-white border border-slate-100/80 rounded-[2rem] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.015)] space-y-4"
                            >
                                <div className="flex items-start gap-4">
                                    {/* Imagen/Contenedor del premio */}
                                    <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 shrink-0 overflow-hidden">
                                        {reward.imagenUrl ? (
                                            <img src={reward.imagenUrl} alt={reward.nombre} className="w-full h-full object-cover" />
                                        ) : (
                                            <Gift size={24} className="text-pink-400" style={{ color: primaryColor }} />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1 space-y-1">
                                        <span 
                                            className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-pink-50 text-pink-600 border border-pink-100 inline-block"
                                            style={{ color: primaryColor, backgroundColor: `${primaryColor}08`, borderColor: `${primaryColor}15` }}
                                        >
                                            Cuesta: {reward.costoPuntos} pts
                                        </span>
                                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight truncate">
                                            {reward.nombre}
                                        </h4>
                                        {reward.descripcion && (
                                            <p className="text-[10px] text-slate-450 font-bold leading-normal">
                                                {reward.descripcion}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Barra de Progreso de Puntos */}
                                <div className="space-y-1.5 pt-1">
                                    <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                        <span>Progreso para canjear</span>
                                        <span style={{ color: tienePuntos ? primaryColor : '#64748b' }}>
                                            {puntosActuales} / {reward.costoPuntos} pts
                                        </span>
                                    </div>
                                    <div className="w-full h-2.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100/50">
                                        <div 
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{ 
                                                width: `${pct}%`, 
                                                backgroundColor: tienePuntos ? primaryColor : '#cbd5e1' 
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Botón de canje */}
                                <div className="pt-1">
                                    <button
                                        onClick={() => handleRedeem(reward)}
                                        disabled={!tienePuntos || redeemLoading === reward.id}
                                        className="w-full py-3.5 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all cursor-pointer disabled:opacity-40 text-white shadow-sm border-0"
                                        style={{ backgroundColor: tienePuntos ? primaryColor : '#94a3b8' }}
                                    >
                                        {redeemLoading === reward.id ? (
                                            <Loader2 className="animate-spin mx-auto" size={14} />
                                        ) : tienePuntos ? (
                                            'Canjear Premio'
                                        ) : (
                                            `Faltan ${reward.costoPuntos - puntosActuales} puntos`
                                        )}
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
