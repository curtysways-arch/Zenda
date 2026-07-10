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
    ChevronRight,
    Trophy
} from 'lucide-react';

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

    // Cargar misiones
    const fetchQuests = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/public/${slug}/misiones`);
            const data = await res.json();
            if (data.success) {
                // Filtrar según la pestaña
                setQuests(data[activeTab] || []);
                setGamification(data.gamification || null);
            }
        } catch (e) {
            console.error('Error fetching quests:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuests();
    }, [slug, activeTab]);

    // Confirmar misión del usuario (Redes sociales/Social click)
    const handleConfirmQuest = async (questId: string) => {
        try {
            const res = await fetch(`/api/public/${slug}/misiones/${questId}/confirmar`, {
                method: 'POST'
            });
            const data = await res.json();
            if (data.success) {
                // Efecto de celebración temporal
                setCelebrateQuest(questId);
                setTimeout(() => {
                    setCelebrateQuest(null);
                    fetchQuests(); // Recargar datos
                }, 3000);
            }
        } catch (e) {
            console.error('Error confirming quest:', e);
        }
    };

    // Filtrar misiones localmente por buscador
    const filteredQuests = quests.filter(q => 
        q.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
        q.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* 1. SECCIÓN DE PERFIL DE GAMIFICACIÓN */}
            {gamification && (
                <section className="bg-white rounded-[2.5rem] border border-slate-100 p-6 shadow-sm space-y-5">
                    {/* Header: Nivel y Racha */}
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div 
                                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md relative overflow-hidden"
                                style={{ backgroundColor: primaryColor }}
                            >
                                <Trophy size={20} className="relative z-10" />
                                <div className="absolute inset-0 bg-gradient-to-tr from-black/10 to-transparent" />
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Nivel Actual</span>
                                <h4 className="text-xl font-black text-slate-800 leading-tight">{gamification.level.nombre}</h4>
                            </div>
                        </div>

                        {/* Racha (Streak) */}
                        {gamification.streak > 0 && (
                            <div className="flex items-center gap-1.5 px-4 py-2 bg-orange-50 border border-orange-100 rounded-full text-orange-600">
                                <Flame size={16} fill="currentColor" />
                                <span className="text-xs font-black uppercase tracking-wider">{gamification.streak} Días de Racha</span>
                            </div>
                        )}
                    </div>

                    {/* Barra de Progreso de XP */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-end text-xs">
                            <span className="font-bold text-slate-400 uppercase tracking-wider">Experiencia total (XP)</span>
                            <span className="font-black text-slate-800">{gamification.level.xpTotal} XP</span>
                        </div>
                        <div className="w-full h-3.5 bg-slate-50 border border-slate-100/50 rounded-full overflow-hidden p-0.5">
                            <div 
                                className="h-full rounded-full transition-all duration-1000 relative overflow-hidden"
                                style={{ 
                                    width: `${gamification.level.progresoXP}%`,
                                    backgroundColor: primaryColor
                                }}
                            >
                                <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[progress_1s_linear_infinite]" />
                            </div>
                        </div>
                    </div>

                    {/* Insignias Desbloqueadas */}
                    {gamification.badges.length > 0 && (
                        <div className="space-y-3 pt-2 border-t border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Insignias Desbloqueadas</span>
                            <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-none">
                                {gamification.badges.map(b => (
                                    <div 
                                        key={b.id} 
                                        className="flex flex-col items-center text-center shrink-0 min-w-[70px]"
                                        title={b.descripcion}
                                    >
                                        <div 
                                            className="w-11 h-11 rounded-full flex items-center justify-center shadow-inner relative"
                                            style={{ backgroundColor: `${b.color}1A`, color: b.color }}
                                        >
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

            {/* 2. PESTAÑAS Y BUSCADOR */}
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

                {/* Pestañas horizontales */}
                <div className="flex gap-1.5 bg-slate-50 border border-slate-100/50 p-1.5 rounded-full select-none">
                    {(['enProgreso', 'todas', 'completadas'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className="flex-1 py-3.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 outline-none cursor-pointer border-0"
                            style={{
                                backgroundColor: activeTab === tab ? '#white' : 'transparent',
                                color: activeTab === tab ? '#000000' : '#94a3b8',
                                boxShadow: activeTab === tab ? '0 1px 3px 0 rgba(0, 0, 0, 0.05)' : 'none'
                            }}
                        >
                            {tab === 'enProgreso' ? 'En progreso' : tab === 'todas' ? 'Todas' : 'Completadas'}
                        </button>
                    ))}
                </div>
            </div>

            {/* 3. LISTADO DE TARJETAS DE MISIONES */}
            {loading ? (
                <div className="py-12 text-center text-slate-400 text-xs font-bold">Cargando misiones...</div>
            ) : filteredQuests.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs font-bold bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
                    No tienes misiones en esta sección por ahora.
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
                                {/* Fondo decorativo de celebración */}
                                {isCelebrating && (
                                    <div className="absolute inset-0 bg-green-50/20 backdrop-blur-[0.5px] flex items-center justify-center z-20">
                                        <div className="text-center animate-bounce">
                                            <span className="text-3xl">🎉</span>
                                            <h5 className="font-black text-green-600 text-xs uppercase tracking-widest mt-1">¡Misión Completada!</h5>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-4">
                                    {/* Icono de la misión */}
                                    <div 
                                        className="w-12 h-12 rounded-[1.25rem] flex items-center justify-center shrink-0 shadow-inner"
                                        style={{ 
                                            backgroundColor: `${q.color}15`, 
                                            color: q.color 
                                        }}
                                    >
                                        <IconComponent size={20} />
                                    </div>

                                    {/* Texto y contenido */}
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex justify-between items-start gap-2">
                                            <h5 className="font-black text-slate-800 text-sm truncate pr-1">{q.nombre}</h5>
                                            {/* Insignia de Recompensa */}
                                            <span 
                                                className="text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shrink-0"
                                                style={{ 
                                                    backgroundColor: `${primaryColor}10`, 
                                                    color: primaryColor 
                                                }}
                                            >
                                                {q.recompensas.join(' + ')}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 leading-relaxed font-medium">{q.descripcion}</p>
                                    </div>
                                </div>

                                {/* Barra de Progreso (si está en progreso y requiere > 1) */}
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

                                {/* Footer con Botones de Reclamación / Hacer */}
                                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                        Campaña: {q.campañaNombre}
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
                                            <span className="text-[9px] font-black uppercase tracking-widest">En espera de aprobación</span>
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
