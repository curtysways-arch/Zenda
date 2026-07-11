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
    Lock,
    Loader2,
    ChevronRight,
    Trophy,
    Gift,
    Target,
    Zap,
    Flame,
    ArrowRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Quest {
    id: string;
    nombre: string;
    descripcion: string;
    icono: string;
    color: string;
    campaignId: string;
    campañaNombre: string;
    validacionTipo: string;
    progresoActual: number;
    progresoRequerido: number;
    estado: 'EN_PROGRESO' | 'PENDIENTE_APROBACION' | 'COMPLETADA' | 'RECLAMADA';
    recompensas: string[];
}

interface QuestEstadoClientProps {
    slug: string;
    primaryColor: string;
    textColor: string;
    negocioNombre: string;
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
    Trophy: Trophy,
    Target: Target,
    Zap: Zap,
    Flame: Flame
};

export default function QuestEstadoClient({ slug, primaryColor, textColor, negocioNombre }: QuestEstadoClientProps) {
    const router = useRouter();
    const [quests, setQuests] = useState<Quest[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'enProgreso' | 'completados' | 'todos'>('enProgreso');
    const [celebrateQuest, setCelebrateQuest] = useState<string | null>(null);

    const fetchQuests = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/public/${slug}/misiones`);
            const data = await res.json();
            if (data.success) {
                setQuests(data.todas || []);
            }
        } catch (e) {
            console.error('Error fetching quests for state list:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuests();
    }, [slug]);

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

    const getFilteredQuests = () => {
        if (activeTab === 'enProgreso') {
            return quests.filter(q => q.estado === 'EN_PROGRESO' || q.estado === 'PENDIENTE_APROBACION');
        }
        if (activeTab === 'completados') {
            return quests.filter(q => q.estado === 'COMPLETADA' || q.estado === 'RECLAMADA');
        }
        return quests;
    };

    const getCount = (tab: 'enProgreso' | 'completados' | 'todos') => {
        if (tab === 'enProgreso') {
            return quests.filter(q => q.estado === 'EN_PROGRESO' || q.estado === 'PENDIENTE_APROBACION').length;
        }
        if (tab === 'completados') {
            return quests.filter(q => q.estado === 'COMPLETADA' || q.estado === 'RECLAMADA').length;
        }
        return quests.length;
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="animate-spin" size={24} style={{ color: primaryColor }} />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Cargando desafíos...</span>
            </div>
        );
    }

    const filtered = getFilteredQuests();

    return (
        <div className="space-y-5">
            {/* Tarjeta Informativa Superior */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${primaryColor}12`, color: primaryColor }}
                    >
                        <Award size={20} />
                    </div>
                    <div>
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight leading-snug">Completa desafíos y sube de nivel</h4>
                        <p className="text-[10px] text-slate-500 font-bold leading-normal">Acumula puntos y desbloquea recompensas exclusivas</p>
                    </div>
                </div>
                <ChevronRight size={18} className="text-slate-400" />
            </div>

            {/* Pestañas / Filtros */}
            <div className="bg-slate-100/60 p-1 rounded-2xl flex items-center justify-between gap-1">
                <button
                    onClick={() => setActiveTab('enProgreso')}
                    className={`flex-1 py-2 px-1 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer border-0 flex items-center justify-center gap-1.5 ${
                        activeTab === 'enProgreso' 
                            ? 'bg-white text-slate-850 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700 bg-transparent'
                    }`}
                >
                    <Clock size={12} style={{ color: activeTab === 'enProgreso' ? primaryColor : undefined }} />
                    En progreso
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-200/50 text-slate-700 font-bold">
                        {getCount('enProgreso')}
                    </span>
                </button>

                <button
                    onClick={() => setActiveTab('completados')}
                    className={`flex-1 py-2 px-1 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer border-0 flex items-center justify-center gap-1.5 ${
                        activeTab === 'completados' 
                            ? 'bg-white text-slate-850 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700 bg-transparent'
                    }`}
                >
                    <CheckCircle2 size={12} style={{ color: activeTab === 'completados' ? primaryColor : undefined }} />
                    Completados
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-200/50 text-slate-700 font-bold">
                        {getCount('completados')}
                    </span>
                </button>

                <button
                    onClick={() => setActiveTab('todos')}
                    className={`flex-1 py-2 px-1 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer border-0 flex items-center justify-center gap-1.5 ${
                        activeTab === 'todos' 
                            ? 'bg-white text-slate-850 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700 bg-transparent'
                    }`}
                >
                    Todos
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-200/50 text-slate-700 font-bold">
                        {getCount('todos')}
                    </span>
                </button>
            </div>

            {/* Listado de Tarjetas */}
            {filtered.length === 0 ? (
                <div className="bg-white border border-slate-100 rounded-3xl p-8 text-center shadow-sm">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">
                        No hay desafíos para mostrar en esta pestaña.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filtered.map(q => {
                        const IconComponent = IconMapper[q.icono] || Award;
                        const pct = Math.min(100, (q.progresoActual / q.progresoRequerido) * 100);
                        const isCelebrating = celebrateQuest === q.id;
                        const isComplete = q.estado === 'COMPLETADA' || q.estado === 'RECLAMADA';

                        return (
                            <div 
                                key={q.id}
                                onClick={() => router.push(`/${slug}/misiones/detalle/${q.id}`)}
                                className={`relative bg-white rounded-[2rem] border border-slate-100 p-5 shadow-[0_8px_24px_rgba(0,0,0,0.04)] space-y-4 overflow-hidden transition-all duration-300 cursor-pointer hover:scale-[1.01] active:scale-[0.99] ${
                                    isCelebrating ? 'shadow-[0_0_0_2px_#22c55e]' : ''
                                }`}
                            >
                                {isCelebrating && (
                                    <div className="absolute inset-0 bg-green-50/90 backdrop-blur-[1px] flex items-center justify-center z-20">
                                        <div className="text-center animate-bounce">
                                            <span className="text-3xl">🎉</span>
                                            <h5 className="font-black text-green-600 text-xs uppercase tracking-widest mt-1">¡Desafío Completado!</h5>
                                        </div>
                                    </div>
                                )}

                                {/* Contenido Superior: Icono, Título, Recompensas e Imagen Regalo */}
                                <div className="flex gap-4 items-start relative z-10">
                                    {/* Icono de Campaña */}
                                    <div 
                                        className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-slate-100"
                                        style={{ 
                                            background: `linear-gradient(135deg, ${q.color}15 0%, ${q.color}05 100%)`, 
                                            color: q.color 
                                        }}
                                    >
                                        <IconComponent size={24} />
                                    </div>

                                    {/* Títulos y Recompensas */}
                                    <div className="flex-1 min-w-0 space-y-1">
                                        {/* Recompensas (Chips arriba) */}
                                        {q.recompensas.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5">
                                                {q.recompensas.map((r, i) => (
                                                    <span 
                                                        key={i}
                                                        className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border text-white"
                                                        style={{ backgroundColor: primaryColor, borderColor: `${primaryColor}20` }}
                                                    >
                                                        {r.startsWith('+') ? r : `+${r}`}
                                                    </span>
                                                ))}
                                                <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-400">
                                                    RECOMPENSA ESPECIAL 🎁
                                                </span>
                                            </div>
                                        )}

                                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight leading-tight pt-1">
                                            Campaña: {q.nombre}
                                        </h3>
                                        <p className="text-[10px] text-slate-600 font-semibold leading-normal">
                                            {q.descripcion}
                                        </p>
                                    </div>

                                    {/* Imagen ilustrativa en el lado derecho */}
                                    <div className="w-14 h-14 shrink-0 relative flex items-center justify-center">
                                        {q.nombre.toLowerCase().includes('instagram') ? (
                                            <img src="/images/3d_instagram.png" alt="Instagram" className="w-12 h-12 object-contain" onError={(e) => { (e.target as any).src = "/images/3d_gift_box.png" }} />
                                        ) : q.nombre.toLowerCase().includes('fidelidad') || q.nombre.toLowerCase().includes('visita') ? (
                                            <img src="/images/3d_trophy.png" alt="Trofeo" className="w-12 h-12 object-contain" onError={(e) => { (e.target as any).src = "/images/3d_gift_box.png" }} />
                                        ) : (
                                            <img src="/images/3d_gift_box.png" alt="Regalo" className="w-12 h-12 object-contain" />
                                        )}
                                    </div>
                                </div>

                                {/* Barra de Progreso Actual */}
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center text-[8px] font-black text-slate-500 uppercase tracking-widest">
                                        <span>PROGRESO ACTUAL</span>
                                        <span className="text-[9px] font-black text-slate-700">{q.progresoActual} / {q.progresoRequerido}</span>
                                    </div>
                                    <div className="w-full h-3 bg-slate-50 rounded-full overflow-hidden p-0.5 border border-slate-100">
                                        <div 
                                            className="h-full rounded-full transition-all duration-750 relative overflow-hidden"
                                            style={{ width: `${pct}%`, backgroundColor: q.color }}
                                        >
                                            {pct > 15 && <div className="progress-shimmer absolute inset-0 rounded-full" />}
                                        </div>
                                    </div>
                                </div>

                                {/* Barra de Estado de Desafío */}
                                <div className="bg-slate-50/80 border border-slate-100 rounded-2xl px-3 py-2.5 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 text-slate-500">
                                        <Award size={13} style={{ color: q.color }} />
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Estado del desafío</span>
                                    </div>

                                    {isComplete ? (
                                        <span className="text-[8px] font-black uppercase tracking-widest px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg flex items-center gap-1 border border-emerald-100">
                                            ✓ COMPLETADA
                                        </span>
                                    ) : q.estado === 'PENDIENTE_APROBACION' ? (
                                        <span className="text-[8px] font-black uppercase tracking-widest px-3 py-1 bg-amber-50 text-amber-600 rounded-lg flex items-center gap-1 border border-amber-100">
                                            ⏳ EN REVISIÓN
                                        </span>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            {q.validacionTipo === 'USUARIO' ? (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleConfirmQuest(q.id);
                                                    }}
                                                    className="px-3 py-1 text-[8px] font-black uppercase tracking-widest text-white rounded-lg shadow-sm border-0 cursor-pointer active:scale-95 transition-transform"
                                                    style={{ backgroundColor: primaryColor }}
                                                >
                                                    ✓ Hacer Desafío
                                                </button>
                                            ) : (
                                                <span className="text-[8px] font-black uppercase tracking-widest px-3 py-1 bg-amber-50 text-amber-600 rounded-lg border border-amber-100">
                                                    ● EN PROGRESO
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Banner inferior decorativo */}
            <div 
                className="rounded-2xl p-4 text-white flex items-center justify-between shadow-sm relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, color-mix(in srgb, ${primaryColor}, #000 25%) 100%)` }}
            >
                <div className="space-y-1 relative z-10">
                    <h4 className="text-[11px] font-black uppercase tracking-wider">¡Tú puedes!</h4>
                    <p className="text-[9px] text-white/80 font-bold max-w-[80%] leading-tight">Completa más desafíos para ganar puntos y subir de nivel.</p>
                </div>
                <button
                    onClick={() => router.push(`/${slug}/misiones`)}
                    className="bg-white text-slate-800 text-[8px] font-black uppercase tracking-widest px-3 py-2.5 rounded-xl border-0 shadow-md active:scale-95 transition-transform cursor-pointer flex items-center gap-1"
                    style={{ color: primaryColor }}
                >
                    <Clock size={11} /> Ver mis puntos &rsaquo;
                </button>
            </div>
        </div>
    );
}
