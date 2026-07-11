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
    ChevronRight
} from 'lucide-react';

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
    Award: Award
};

export default function QuestEstadoClient({ slug, primaryColor, textColor, negocioNombre }: QuestEstadoClientProps) {
    const [quests, setQuests] = useState<Quest[]>([]);
    const [loading, setLoading] = useState(true);
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

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="animate-spin text-pink-600" size={24} style={{ color: primaryColor }} />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cargando misiones...</span>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {quests.length === 0 ? (
                <div className="bg-white border border-slate-100 rounded-3xl p-8 text-center shadow-sm">
                    <p className="text-slate-450 text-xs font-bold uppercase tracking-wider">
                        No hay misiones activas en este negocio.
                    </p>
                </div>
            ) : (
                quests.map(q => {
                    const IconComponent = IconMapper[q.icono] || Award;
                    const pct = Math.min(100, (q.progresoActual / q.progresoRequerido) * 100);
                    const isCelebrating = celebrateQuest === q.id;

                    return (
                        <div 
                            key={q.id}
                            className={`bg-white rounded-[2rem] border p-5 shadow-[0_4px_25px_rgba(0,0,0,0.015)] space-y-4 relative overflow-hidden transition-all duration-300 ${
                                isCelebrating ? 'border-green-500 bg-green-50/10' : 'border-slate-100/80'
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

                            {/* Header de la tarjeta */}
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div 
                                        className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner"
                                        style={{ backgroundColor: `${q.color}15`, color: q.color }}
                                    >
                                        <IconComponent size={20} />
                                    </div>
                                    <div className="min-w-0 space-y-0.5">
                                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight truncate">
                                            {q.nombre}
                                        </h4>
                                        <p className="text-[10px] text-slate-400 font-semibold leading-none">
                                            Campaña: {q.campañaNombre}
                                        </p>
                                    </div>
                                </div>

                                <span 
                                    className="text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shrink-0"
                                    style={{ color: primaryColor, backgroundColor: `${primaryColor}08`, borderColor: `${primaryColor}15` }}
                                >
                                    +{q.recompensas.join(' + ')}
                                </span>
                            </div>

                            {/* Descripción de la misión */}
                            <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                {q.descripcion}
                            </p>

                            {/* Barra de progreso de la misión */}
                            <div className="space-y-1.5 pt-1">
                                <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                    <span>Progreso actual</span>
                                    <span>
                                        {q.progresoActual} / {q.progresoRequerido}
                                    </span>
                                </div>
                                <div className="w-full h-2.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100/50">
                                    <div 
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{ 
                                            width: `${pct}%`, 
                                            backgroundColor: q.color 
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Estado y botón de acción */}
                            <div className="pt-2 border-t border-slate-50 flex items-center justify-between">
                                <span className="text-[9px] font-black text-slate-450 uppercase tracking-widest">
                                    Estado de misión
                                </span>

                                {q.estado === 'COMPLETADA' && (
                                    <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 bg-green-50 text-green-600 rounded-full flex items-center gap-1 border border-green-100">
                                        <CheckCircle2 size={10} fill="currentColor" className="text-white" /> Completada
                                    </span>
                                )}

                                {q.estado === 'PENDIENTE_APROBACION' && (
                                    <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 bg-amber-50 text-amber-600 rounded-full flex items-center gap-1 border border-amber-100">
                                        <Clock size={10} /> En revisión
                                    </span>
                                )}

                                {q.estado === 'EN_PROGRESO' && (
                                    <div className="flex items-center gap-2">
                                        {q.validacionTipo === 'USUARIO' ? (
                                            <button 
                                                onClick={() => handleConfirmQuest(q.id)}
                                                className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-white rounded-xl shadow-md border-0 active:scale-95 transition-transform cursor-pointer"
                                                style={{ backgroundColor: primaryColor }}
                                            >
                                                Hacer Misión
                                            </button>
                                        ) : (
                                            <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 bg-slate-100 text-slate-500 rounded-full border border-slate-200">
                                                Automática
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
}
