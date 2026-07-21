'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from 'next-auth/react';
import { 
    Briefcase, 
    Trophy, 
    CheckCircle2, 
    Clock, 
    Sparkles, 
    RefreshCw, 
    Search, 
    Gift, 
    Award, 
    Calendar, 
    UserCheck, 
    Users, 
    Zap, 
    Crown, 
    ChevronRight, 
    Info, 
    ShieldCheck, 
    ArrowUpRight, 
    X,
    Loader2,
    Check,
    Target,
    ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { clsx } from 'clsx';

// Iconos disponibles
const ICON_MAP: Record<string, any> = {
    Trophy,
    Briefcase,
    Zap,
    Calendar,
    Users,
    Crown,
    UserCheck,
    Award,
    Gift,
    Sparkles
};

function getIcon(iconName: string | null) {
    if (!iconName) return Trophy;
    return ICON_MAP[iconName] || Trophy;
}

export default function MisionesCitioxPage() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [missions, setMissions] = useState<any[]>([]);
    const [progress, setProgress] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [mounted, setMounted] = useState(false);
    
    // Filtro por defecto: "En Proceso"
    const [filter, setFilter] = useState<'in_progress' | 'all' | 'completed'>('in_progress');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Modal de Detalle Pantalla Completa y Posición de Scroll Guardada
    const [selectedMission, setSelectedMission] = useState<any | null>(null);
    const [savedScrollY, setSavedScrollY] = useState<number>(0);
    const modalRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        setMounted(true);
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, []);

    // Función de apertura con almacenamiento de la posición original y reset a 0
    const handleOpenDetails = (m: any) => {
        const currentY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
        setSavedScrollY(currentY);
        setSelectedMission(m);

        // Forzar scroll al origen absoluto (top = 0)
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
    };

    // Función de cierre con restauración exacta de la posición de scroll en la lista
    const handleCloseDetails = () => {
        setSelectedMission(null);
        const targetY = savedScrollY;
        setTimeout(() => {
            window.scrollTo({ top: targetY, behavior: 'instant' });
            document.documentElement.scrollTop = targetY;
            document.body.scrollTop = targetY;
        }, 15);
    };

    // Resetear el scroll del modal al abrir cualquier detalle y bloquear scroll del fondo
    useEffect(() => {
        if (selectedMission) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';

            const forceScrollTop = () => {
                window.scrollTo(0, 0);
                document.documentElement.scrollTop = 0;
                document.body.scrollTop = 0;
                if (modalRef.current) {
                    modalRef.current.scrollTop = 0;
                }
            };

            forceScrollTop();
            const frameId = requestAnimationFrame(forceScrollTop);
            const t1 = setTimeout(forceScrollTop, 15);
            const t2 = setTimeout(forceScrollTop, 60);

            return () => {
                cancelAnimationFrame(frameId);
                clearTimeout(t1);
                clearTimeout(t2);
                document.body.style.overflow = originalOverflow;
            };
        }
    }, [selectedMission]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/misiones-globales');
            if (res.ok) {
                const data = await res.json();
                setMissions(data.missions || []);
                setProgress(data.progress || []);
                setHistory(data.history || []);
            }
        } catch (err) {
            console.error('Error cargando misiones Citiox:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        try {
            await fetchData();
        } finally {
            setSyncing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Mapear cada misión con su progreso correspondiente
    const mappedMissions = missions.map((m) => {
        const p = progress.find((pr) => pr.missionId === m.id);
        
        // Cálculo seguro de números para evitar NaN%
        const rawProg = p?.progreso;
        const progresoActual = typeof rawProg === 'number' && !isNaN(rawProg) ? rawProg : (Number(rawProg) || 0);
        const objetivo = Math.max(1, Number(m.objetivo || 1));
        
        const completada = p ? Boolean(p.completada) : false;
        const recompensaDada = p ? Boolean(p.recompensaDada) : false;
        const fechaCompletada = p ? p.fechaCompletada : null;

        // Porcentaje seguro sin NaN
        const rawPct = Math.round((progresoActual / objetivo) * 100);
        const porcentaje = isNaN(rawPct) ? 0 : Math.min(100, Math.max(0, rawPct));

        // Formatear texto de recompensa
        let rewardText = '';
        const rTipo = m.recompensaTipo;
        const rVal = m.recompensaValor || {};

        if (rTipo === 'FREE_DAYS') {
            rewardText = `+${rVal.dias || 0} Días Gratis de Suscripción`;
        } else if (rTipo === 'UNLOCK_FEATURE') {
            rewardText = `Desbloquea: ${rVal.feature || 'Módulo Premium'}`;
        } else if (rTipo === 'DIAMONDS') {
            rewardText = `+${rVal.diamantes || 0} Diamantes Citiox`;
        } else if (rTipo === 'CREDITS') {
            rewardText = `+$${rVal.creditos || 0} Créditos de Saldo`;
        } else if (rTipo === 'BADGE') {
            rewardText = `Insignia: ${rVal.badge || 'Socio Destacado'}`;
        } else {
            rewardText = 'Recompensa Especial';
        }

        return {
            ...m,
            progresoActual,
            objetivo,
            completada,
            recompensaDada,
            fechaCompletada,
            porcentaje,
            rewardText
        };
    });

    // Filtrar misiones
    const filteredMissions = mappedMissions.filter((m) => {
        // Filtro por estado
        if (filter === 'in_progress' && m.completada) return false;
        if (filter === 'completed' && !m.completada) return false;

        // Búsqueda
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const titleMatch = m.titulo.toLowerCase().includes(q);
            const descMatch = m.descripcion?.toLowerCase().includes(q);
            if (!titleMatch && !descMatch) return false;
        }

        return true;
    });

    // Estadísticas
    const totalCount = mappedMissions.length;
    const completedCount = mappedMissions.filter((m) => m.completada).length;
    const inProgressCount = totalCount - completedCount;
    const rewardsCount = history.length;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pt-6 sm:pt-8 pb-28 md:pb-16 max-w-7xl mx-auto px-2 sm:px-4">
            {/* ENCABEZADO Y HEADER PRINCIPAL - TITULO ALTA VISIBILIDAD */}
            <div className="relative overflow-hidden bg-slate-900 rounded-[2.5rem] p-6 sm:p-8 md:p-12 text-white shadow-2xl border border-slate-800">
                <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
                
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-2">
                    <div className="space-y-3 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 text-[11px] font-black uppercase tracking-widest">
                            <Briefcase size={13} className="animate-pulse" />
                            Retos Exclusivos para Socios Citiox
                        </div>
                        
                        {/* TITULO CON VISIBILIDAD BLANCO Y CIAN 100% GARANTIZADA */}
                        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black italic tracking-tight uppercase leading-tight text-white drop-shadow-md">
                            <span className="text-white font-black">Misiones</span> <span className="text-cyan-400 font-black">Citiox</span>
                        </h1>

                        <p className="text-slate-200 text-xs sm:text-sm md:text-base leading-relaxed font-medium">
                            Completa estos retos diseñados exclusivamente para tu negocio. Obtén <strong className="text-white">días gratis de suscripción</strong>, desbloquea <strong className="text-cyan-300">módulos premium</strong> y acelera tu crecimiento.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                        <button
                            onClick={handleSync}
                            disabled={syncing}
                            className="flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-cyan-500/20 active:scale-95 disabled:opacity-50"
                        >
                            <RefreshCw size={15} className={clsx(syncing && "animate-spin")} />
                            {syncing ? 'Sincronizando...' : 'Actualizar Estado'}
                        </button>
                    </div>
                </div>
            </div>

            {/* TARJETAS DE ESTADÍSTICAS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
                <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3 sm:gap-4">
                    <div className="size-10 sm:size-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <Clock size={20} />
                    </div>
                    <div>
                        <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">En Proceso</p>
                        <p className="text-xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">{inProgressCount}</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3 sm:gap-4">
                    <div className="size-10 sm:size-12 rounded-2xl bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                        <Trophy size={20} />
                    </div>
                    <div>
                        <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Misiones</p>
                        <p className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white">{totalCount}</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3 sm:gap-4">
                    <div className="size-10 sm:size-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={20} />
                    </div>
                    <div>
                        <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Completadas</p>
                        <p className="text-xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">{completedCount}</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3 sm:gap-4">
                    <div className="size-10 sm:size-12 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                        <Gift size={20} />
                    </div>
                    <div>
                        <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Premios Entregados</p>
                        <p className="text-xl sm:text-3xl font-black text-purple-600 dark:text-purple-400">{rewardsCount}</p>
                    </div>
                </div>
            </div>

            {/* BARRA DE FILTROS Y BÚSQUEDA */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                {/* Selector de pestañas ordenado con "En Proceso" primero */}
                <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl gap-1 overflow-x-auto no-scrollbar w-full md:w-auto">
                    {[
                        { id: 'in_progress', label: `En Proceso (${inProgressCount})` },
                        { id: 'all', label: `Todas (${totalCount})` },
                        { id: 'completed', label: `Completadas (${completedCount})` }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setFilter(tab.id as any)}
                            className={clsx(
                                "px-4 sm:px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0 flex-1 md:flex-none text-center",
                                filter === tab.id
                                    ? "bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm border border-slate-200/60 dark:border-slate-800"
                                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Buscador */}
                <div className="relative w-full md:w-72">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar misión..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    />
                </div>
            </div>

            {/* LISTADO DE MISIONES DE NEGOCIO */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-28 space-y-4">
                    <Loader2 className="w-12 h-12 text-cyan-500 animate-spin" />
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Cargando Misiones Citiox...</p>
                </div>
            ) : filteredMissions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredMissions.map((m) => {
                        const IconComp = getIcon(m.icono);
                        const themeColor = m.color || '#0ea5e9';

                        return (
                            <div
                                key={m.id}
                                className={clsx(
                                    "bg-white dark:bg-slate-900 rounded-3xl border transition-all duration-300 relative overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-xl hover:-translate-y-1 group",
                                    m.completada
                                        ? "border-emerald-200 dark:border-emerald-900/50"
                                        : "border-slate-200/80 dark:border-slate-800"
                                )}
                            >
                                {/* Barra de acento temática */}
                                <div
                                    className="h-2 w-full"
                                    style={{ backgroundColor: themeColor }}
                                />

                                <div className="p-5 sm:p-6 space-y-5 flex-1">
                                    {/* Cabecera de la Tarjeta */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="size-12 rounded-2xl flex items-center justify-center shrink-0 border"
                                                style={{
                                                    backgroundColor: `color-mix(in srgb, ${themeColor}, transparent 90%)`,
                                                    borderColor: `color-mix(in srgb, ${themeColor}, transparent 75%)`,
                                                    color: themeColor
                                                }}
                                            >
                                                <IconComp size={22} />
                                            </div>
                                            <div>
                                                <h3 className="font-black text-base text-slate-900 dark:text-white uppercase italic tracking-tight line-clamp-1">
                                                    {m.titulo}
                                                </h3>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                    Meta: {m.objetivo} {m.objetivo === 1 ? 'acción' : 'acciones'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Insignia de Estado */}
                                        {m.completada ? (
                                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider shrink-0">
                                                <Check size={12} /> Completada
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider shrink-0">
                                                <Clock size={12} /> En Proceso
                                            </span>
                                        )}
                                    </div>

                                    {/* Descripción */}
                                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                                        {m.descripcion}
                                    </p>

                                    {/* Progreso */}
                                    <div className="space-y-2 pt-1">
                                        <div className="flex items-center justify-between text-xs font-bold">
                                            <span className="text-slate-400 text-[10px] uppercase tracking-wider">Progreso Actual</span>
                                            <span className="text-slate-900 dark:text-white font-black">
                                                {Math.min(m.objetivo, m.progresoActual)} de {m.objetivo} ({m.porcentaje}%)
                                            </span>
                                        </div>
                                        <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                                            <div
                                                className="h-full rounded-full transition-all duration-700"
                                                style={{
                                                    width: `${m.porcentaje}%`,
                                                    backgroundColor: m.completada ? '#10b981' : themeColor
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Recompensa */}
                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <Gift size={16} className="text-cyan-500 shrink-0" />
                                            <span className="text-xs font-black text-slate-800 dark:text-slate-200 truncate">
                                                {m.rewardText}
                                            </span>
                                        </div>
                                        {m.recompensaDada && (
                                            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-500 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-md shrink-0">
                                                Otorgado
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Botón de Acción */}
                                <div className="p-4 pt-0">
                                    <button
                                        onClick={() => handleOpenDetails(m)}
                                        className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white py-3.5 px-4 rounded-2xl text-xs font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-2 group-hover:bg-cyan-500 group-hover:text-slate-950"
                                    >
                                        <Info size={15} />
                                        Ver Detalles de la Misión
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200/80 dark:border-slate-800 space-y-4">
                    <Trophy className="mx-auto text-slate-300 dark:text-slate-700 size-16" />
                    <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase italic">No se encontraron misiones</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                        No hay misiones que coincidan con los filtros seleccionados en este momento.
                    </p>
                </div>
            )}

            {/* SECCIÓN DE HISTORIAL DE RECOMPENSAS ADJUDICADAS */}
            {history.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 space-y-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">
                                Historial de Recompensas Ganadas
                            </h2>
                            <p className="text-xs font-medium text-slate-400">
                                Registro de premios aplicados automáticamente a la cuenta de tu negocio.
                            </p>
                        </div>
                        <ShieldCheck className="text-emerald-500 size-8" />
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {history.map((h) => (
                            <div key={h.id} className="py-4 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                        <Gift size={18} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-900 dark:text-white uppercase">
                                            {h.Mission?.titulo || 'Misión Citiox'}
                                        </p>
                                        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                            {h.detalles}
                                        </p>
                                    </div>
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                                    {format(new Date(h.fecha), "d 'de' MMM, yyyy", { locale: es })}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* MODAL VIA REACT PORTAL MONTA DIRECTO EN BODY CON Z-INDEX ABSOLUTO */}
            {mounted && selectedMission && createPortal(
                <div 
                    ref={(node) => {
                        modalRef.current = node;
                        if (node) {
                            node.scrollTop = 0;
                        }
                    }}
                    className="fixed inset-0 z-[999999] bg-white dark:bg-slate-950 overflow-y-auto p-4 sm:p-6 md:p-8 animate-in fade-in duration-200"
                    style={{ top: 0, left: 0, right: 0, bottom: 0 }}
                >
                    <div className="max-w-3xl w-full mx-auto space-y-5 pt-1 pb-16">
                        
                        {/* BARRA SUPERIOR DE NAVEGACIÓN Y CIERRE */}
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                            <button
                                onClick={handleCloseDetails}
                                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-black uppercase tracking-widest px-4 py-2.5 rounded-full transition-colors"
                            >
                                <ArrowLeft size={16} />
                                Volver a Misiones
                            </button>

                            <button
                                onClick={handleCloseDetails}
                                className="size-10 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* CABECERA CON ICONO Y TITULO CLARO Y DESTACADO */}
                        <div className="bg-slate-50 dark:bg-slate-900/80 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-5">
                            <div
                                className="size-20 rounded-3xl flex items-center justify-center shrink-0 border-2 shadow-lg"
                                style={{
                                    backgroundColor: `color-mix(in srgb, ${selectedMission.color || '#0ea5e9'}, transparent 85%)`,
                                    borderColor: selectedMission.color || '#0ea5e9',
                                    color: selectedMission.color || '#0ea5e9'
                                }}
                            >
                                {(() => {
                                    const C = getIcon(selectedMission.icono);
                                    return <C size={36} />;
                                })()}
                            </div>
                            <div className="space-y-1">
                                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 text-[10px] font-black uppercase tracking-widest">
                                    <Target size={12} />
                                    Detalle de Misión
                                </span>
                                <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight leading-tight">
                                    {selectedMission.titulo}
                                </h2>
                            </div>
                        </div>

                        {/* DESCRIPCIÓN E INSTRUCCIONES EN CONTRASTE CLARO */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
                            <p className="text-xs font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400">Instrucciones de la Misión</p>
                            <p className="text-sm sm:text-base font-medium text-slate-700 dark:text-slate-200 leading-relaxed">
                                {selectedMission.descripcion}
                            </p>
                        </div>

                        {/* AVANCE DE LA MISIÓN - CÁLCULO SEGURO SIN NaN% */}
                        {(() => {
                            const actual = Number(selectedMission.progresoActual ?? 0);
                            const obj = Math.max(1, Number(selectedMission.objetivo || 1));
                            const pct = isNaN(selectedMission.porcentaje) ? 0 : Number(selectedMission.porcentaje || 0);

                            return (
                                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-black uppercase tracking-widest text-slate-400">Progreso de la Misión</span>
                                        <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                                            {Math.min(obj, actual)} de {obj} ({pct}%)
                                        </span>
                                    </div>
                                    <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-1">
                                        <div
                                            className="h-full rounded-full transition-all duration-700 bg-cyan-500"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })()}

                        {/* RECOMPENSA Y ESTADO */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-5 rounded-3xl border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-widest mb-1">Premio del Negocio</p>
                                    <p className="text-sm sm:text-base font-black text-emerald-700 dark:text-emerald-300">{selectedMission.rewardText}</p>
                                </div>
                                <Gift className="text-emerald-600 dark:text-emerald-400 size-8 shrink-0 ml-3" />
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Estado de Ejecución</p>
                                    <p className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                                        {selectedMission.completada ? 'Completada y Adjudicada' : 'En progreso activo'}
                                    </p>
                                </div>
                                {selectedMission.completada ? (
                                    <CheckCircle2 className="text-emerald-500 size-8 shrink-0 ml-3" />
                                ) : (
                                    <Clock className="text-amber-500 size-8 shrink-0 ml-3" />
                                )}
                            </div>
                        </div>

                        {/* BOTÓN PRINCIPAL DE CERRAR */}
                        <button
                            onClick={handleCloseDetails}
                            className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 py-4 sm:py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95"
                        >
                            Entendido, Volver a Misiones
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
