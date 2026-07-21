'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Clock, Gem, Plus, Minus, Calendar, ShoppingBag, Award, Gift, Target, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface HistoryItem {
    id: string;
    puntos: number;
    concepto: string;
    label: string;
    color: string;
    notas: string;
    fecha: string;
}

export default function HistorialPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;

    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [saldo, setSaldo] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [negocio, setNegocio] = useState<any>(null);
    const [hasSession, setHasSession] = useState<boolean | null>(null);

    // Leer colores de marca del negocio
    const primaryColor = negocio?.colorPrimario || '#db2777';

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

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/public/${slug}/loyalty/history`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setHistory(data.history || []);
            }
        } catch (e) {
            console.error("Error cargando historial:", e);
        } finally {
            setLoading(false);
        }
    };

    const fetchSaldo = async () => {
        try {
            const res = await fetch(`/api/${slug}/referrals/me`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setSaldo(data.puntos || 0);
            }
        } catch (e) {
            console.error("Error cargando saldo:", e);
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
            fetchHistory();
            fetchSaldo();
        }
    }, [hasSession]);

    const getIcon = (concepto: string) => {
        switch (concepto) {
            case 'RESERVA':
                return <Calendar size={14} />;
            case 'CANJE':
                return <ShoppingBag size={14} />;
            case 'REFERIDO':
                return <Sparkles size={14} />;
            case 'QUEST_COMPLETED':
                return <Target size={14} />;
            default:
                return <Award size={14} />;
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans pb-10">
            {/* Header Fijo */}
            <div className="sticky top-0 z-40 bg-[#f8fafc]/90 backdrop-blur-md px-2.5 pt-4 pb-3 flex items-center justify-between border-b border-slate-100">
                <button 
                    onClick={() => router.back()}
                    className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-slate-700 active:scale-95 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-slate-100 cursor-pointer"
                >
                    <ArrowLeft size={16} />
                </button>
                <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: primaryColor }}>
                        <Clock size={12} className="text-white" />
                    </div>
                    <h2 className="text-[12px] font-black uppercase tracking-widest text-slate-800">
                        Historial de Diamantes
                    </h2>
                </div>
                <div className="w-9" /> {/* Spacer */}
            </div>

            {/* Contenido Principal */}
            <div className="max-w-md mx-auto px-2.5 mt-4 space-y-4">
                {/* Resumen de Saldo */}
                <div className="relative overflow-hidden rounded-[2.5rem] p-5 text-white shadow-[0_20px_40px_rgba(0,0,0,0.06)] flex items-center justify-between min-h-[96px]"
                    style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, color-mix(in srgb, ${primaryColor}, #000 35%) 100%)` }}
                >
                    <div className="flex gap-3 items-center">
                        <div className="size-11 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-white shadow-sm">
                            <Gem size={20} className="text-white" />
                        </div>
                        <div className="text-left space-y-0.5">
                            <span className="text-[8px] font-black text-white/70 uppercase tracking-widest block leading-none">
                                Saldo Actual
                            </span>
                            <div className="flex items-center gap-1.5">
                                <span className="text-2xl font-black leading-none">{saldo.toLocaleString()}</span>
                                <Gem size={16} className="text-white/85 fill-white/10 stroke-[2.5]" />
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-[7px] font-black text-white/80 bg-white/15 px-2.5 py-1 rounded-full uppercase tracking-wider">
                            {history.length} Transacciones
                        </span>
                    </div>
                </div>

                {/* Lista de Transacciones */}
                <div className="space-y-2.5">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-left px-1">
                        Movimientos recientes
                    </h3>

                    {loading ? (
                        <div className="space-y-2">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="bg-white rounded-3xl p-4 flex justify-between items-center animate-pulse border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="size-8.5 rounded-2xl bg-slate-100" />
                                        <div className="space-y-1.5">
                                            <div className="h-3 bg-slate-100 rounded-full w-24" />
                                            <div className="h-2 bg-slate-100 rounded-full w-16" />
                                        </div>
                                    </div>
                                    <div className="h-3 bg-slate-100 rounded-full w-8" />
                                </div>
                            ))}
                        </div>
                    ) : history.length === 0 ? (
                        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 text-center space-y-3">
                            <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center mx-auto text-slate-400">
                                <Clock size={24} />
                            </div>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                                Aún no tienes transacciones de diamantes.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {history.map((item) => {
                                const isPositive = item.puntos > 0;
                                return (
                                    <div 
                                        key={item.id}
                                        className="bg-white rounded-3xl p-3.5 border border-slate-100/80 shadow-[0_4px_16px_rgba(0,0,0,0.015)] flex justify-between items-center hover:border-slate-200 transition-all"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            {/* Icono de Concepto */}
                                            <div className="size-8.5 rounded-2xl flex items-center justify-center shrink-0"
                                                style={{
                                                    backgroundColor: isPositive ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.08)',
                                                    color: isPositive ? '#10b981' : '#f43f5e'
                                                }}
                                            >
                                                {getIcon(item.concepto)}
                                            </div>

                                            {/* Info */}
                                            <div className="text-left min-w-0">
                                                <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-tight leading-tight line-clamp-1">
                                                    {item.label}
                                                </h4>
                                                <span className="text-[8px] text-slate-400 font-semibold block mt-0.5 leading-none">
                                                    {format(new Date(item.fecha), "d 'de' MMMM, yyyy - h:mm a", { locale: es })}
                                                </span>
                                                {item.notas && (
                                                    <p className="text-[8.5px] text-slate-400 font-medium leading-tight mt-1 line-clamp-2 italic">
                                                        {item.notas}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Monto de Diamantes */}
                                        <div className="flex items-center gap-0.5 shrink-0 ml-3">
                                            <span className={`text-[12px] font-black ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                {isPositive ? '+' : ''}{item.puntos}
                                            </span>
                                            <Gem size={10} className={isPositive ? 'text-emerald-500/85 fill-emerald-500/10' : 'text-rose-500/85 fill-rose-500/10'} />
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
