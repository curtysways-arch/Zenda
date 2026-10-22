'use client';

export const dynamic = 'force-dynamic';

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

    const [adminWhatsApp, setAdminWhatsApp] = useState<string>('593968118444');

    const getWaUrl = (titulo: string) => {
        let clean = (adminWhatsApp || '593968118444').replace(/\D/g, '');
        if (clean.startsWith('0') && clean.length === 10) {
            clean = '593' + clean.substring(1);
        }
        const msg = `¡Hola Citiox! He completado la misión "${titulo}". Quisiera coordinar el envío de mi Kit de Flyers impresos con código QR para mi negocio.`;
        return `https://api.whatsapp.com/send?phone=${clean}&text=${encodeURIComponent(msg)}`;
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/misiones-globales?t=${Date.now()}`);
            if (res.ok) {
                const data = await res.json();
                setMissions(data.missions || []);
                setProgress(data.progress || []);
                setHistory(data.history || []);
                if (data.adminWhatsApp) setAdminWhatsApp(data.adminWhatsApp);
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
        let rVal: any = m.recompensaValor || {};
        if (typeof rVal === 'string') {
            try { rVal = JSON.parse(rVal); } catch (e) {}
        }

        if (rVal?.texto) {
            rewardText = rVal.texto;
        } else if (rTipo === 'FREE_DAYS') {
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
            rewardText = 'Material Físico / Premio Especial';
        }

        const isFlyerStr = (s?: string) => {
            if (!s) return false;
            const str = String(s).toLowerCase();
            return str.includes('flyer') || str.includes('físico') || str.includes('fisico') || str.includes('impreso') || str.includes('kit');
        };

        const isFlyerMission = 
            isFlyerStr(m.titulo) ||
            isFlyerStr(m.descripcion) ||
            isFlyerStr(rewardText) ||
            rTipo === 'PROMOTION' ||
            JSON.stringify(m).toLowerCase().includes('flyer');

        const rewardDays = rTipo === 'FREE_DAYS' ? Number(rVal?.dias || 0) : 0;

        return {
            ...m,
            rewardDays,
            progresoActual,
            objetivo,
            completada,
            recompensaDada,
            fechaCompletada,
            porcentaje,
            rewardText,
            isFlyerMission
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
    const daysEarned = mappedMissions.filter((m) => m.completada).reduce((acc, m) => acc + (m.rewardDays || 0), 0);
    const daysAvailable = mappedMissions.filter((m) => !m.completada).reduce((acc, m) => acc + (m.rewardDays || 0), 0);
    const nextMission = [...mappedMissions]
        .filter((m) => !m.completada)
        .sort((a, b) => b.porcentaje - a.porcentaje || (b.rewardDays || 0) - (a.rewardDays || 0))[0];
    const remainingFor = (m: any) => Math.max(0, m.objetivo - m.progresoActual);

    return (
        <div className="space-y-6 pt-4 sm:pt-6 pb-28 md:pb-16 max-w-6xl mx-auto px-1 sm:px-2">
            {/* ENCABEZADO */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Gana días gratis</h1>
                    <p className="text-slate-500 mt-1 max-w-xl">
                        Cumple estos retos de Citiox mientras haces crecer tu negocio y ganas días de suscripción, módulos y material para promocionarte.
                    </p>
                </div>
                <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold disabled:opacity-50"
                >
                    <RefreshCw size={15} className={clsx(syncing && 'animate-spin')} />
                    {syncing ? 'Actualizando…' : 'Actualizar progreso'}
                </button>
            </div>

            {/* RESUMEN: días ganados + próxima misión */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-4">
                <div className="rounded-2xl p-6 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0066FF 0%, #0047B3 100%)' }}>
                    <div className="absolute -right-12 -top-12 size-44 rounded-full bg-white/10" />
                    <p className="relative text-sm text-blue-100">Días gratis que ya ganaste</p>
                    <p className="relative text-5xl font-bold tracking-tight mt-1">{daysEarned}</p>
                    <div className="relative mt-5 grid grid-cols-3 gap-2 text-center">
                        <div className="bg-white/10 rounded-xl py-2.5">
                            <p className="text-lg font-bold">{completedCount}</p>
                            <p className="text-xs text-blue-100">Completadas</p>
                        </div>
                        <div className="bg-white/10 rounded-xl py-2.5">
                            <p className="text-lg font-bold">{inProgressCount}</p>
                            <p className="text-xs text-blue-100">Pendientes</p>
                        </div>
                        <div className="bg-white/10 rounded-xl py-2.5">
                            <p className="text-lg font-bold">{daysAvailable}</p>
                            <p className="text-xs text-blue-100">Días por ganar</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between gap-4">
                    {loading ? (
                        <div className="flex items-center gap-3 text-slate-500 text-sm"><Loader2 className="animate-spin" size={18} /> Cargando tu progreso…</div>
                    ) : nextMission ? (
                        <>
                            <div>
                                <p className="text-sm font-semibold text-[#0066FF] flex items-center gap-1.5"><Target size={15} /> Tu próxima misión</p>
                                <h2 className="mt-1.5 text-xl font-bold text-slate-900 dark:text-white">{nextMission.titulo}</h2>
                                <p className="mt-1 text-[15px] text-slate-600 dark:text-slate-300 line-clamp-2">{nextMission.descripcion}</p>
                            </div>
                            <div>
                                <div className="flex items-center justify-between text-sm mb-1.5">
                                    <span className="text-slate-600 dark:text-slate-300">
                                        {remainingFor(nextMission) === 0 ? '¡Ya casi! Actualiza tu progreso' : `Te ${remainingFor(nextMission) === 1 ? 'falta' : 'faltan'} ${remainingFor(nextMission)}`}
                                    </span>
                                    <span className="font-semibold text-slate-900 dark:text-white">{Math.min(nextMission.objetivo, nextMission.progresoActual)} de {nextMission.objetivo}</span>
                                </div>
                                <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full bg-[#0066FF] transition-all duration-700" style={{ width: `${nextMission.porcentaje}%` }} />
                                </div>
                                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 bg-emerald-50 rounded-full px-3 py-1">
                                        <Gift size={14} /> {nextMission.rewardText}
                                    </span>
                                    <button onClick={() => handleOpenDetails(nextMission)} className="text-sm font-semibold text-[#0066FF] hover:underline">
                                        Ver cómo completarla
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : totalCount > 0 ? (
                        <div className="flex items-center gap-3">
                            <span className="size-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><CheckCircle2 size={22} /></span>
                            <div>
                                <p className="font-bold text-slate-900 dark:text-white">¡Completaste todas las misiones!</p>
                                <p className="text-sm text-slate-500">Pronto habrá nuevos retos. Te avisaremos.</p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-slate-500">Todavía no hay misiones disponibles. Vuelve pronto.</p>
                    )}
                </div>
            </div>

            {/* FILTROS Y BÚSQUEDA */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl gap-1 overflow-x-auto no-scrollbar">
                    {[
                        { id: 'in_progress', label: `Pendientes (${inProgressCount})` },
                        { id: 'completed', label: `Completadas (${completedCount})` },
                        { id: 'all', label: `Todas (${totalCount})` }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setFilter(tab.id as any)}
                            className={clsx(
                                'px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap',
                                filter === tab.id ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div className="relative w-full md:w-72">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar misión…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0066FF]/30"
                    />
                </div>
            </div>

            {/* LISTADO */}
            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-slate-400 animate-spin" /></div>
            ) : filteredMissions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredMissions.map((m) => {
                        const IconComp = getIcon(m.icono);
                        const themeColor = m.color || '#0066FF';
                        const isFlyer = m.isFlyerMission || m.recompensaTipo === 'PROMOTION';
                        return (
                            <div
                                key={m.id}
                                className={clsx(
                                    'bg-white dark:bg-slate-900 rounded-2xl border p-5 flex flex-col gap-4 transition-shadow hover:shadow-md',
                                    m.completada ? 'border-emerald-200' : 'border-slate-200 dark:border-slate-800'
                                )}
                            >
                                <div className="flex items-start gap-3">
                                    <div
                                        className="size-11 rounded-xl flex items-center justify-center shrink-0"
                                        style={{ backgroundColor: `color-mix(in srgb, ${themeColor}, transparent 88%)`, color: themeColor }}
                                    >
                                        <IconComp size={21} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">{m.titulo}</h3>
                                        <p className="text-sm text-slate-500 line-clamp-2 mt-0.5">{m.descripcion}</p>
                                    </div>
                                    {m.completada && (
                                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5 shrink-0">
                                            <Check size={12} /> Lista
                                        </span>
                                    )}
                                </div>

                                <div>
                                    <div className="flex justify-between text-sm mb-1.5">
                                        <span className="text-slate-500">Progreso</span>
                                        <span className="font-semibold text-slate-900 dark:text-white">{Math.min(m.objetivo, m.progresoActual)} de {m.objetivo}</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${m.porcentaje}%`, backgroundColor: m.completada ? '#10b981' : themeColor }} />
                                    </div>
                                </div>

                                <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100 min-w-0">
                                        <Gift size={15} className="text-emerald-600 shrink-0" />
                                        <span className="truncate">{m.rewardText}</span>
                                    </span>
                                    {m.recompensaDada && !isFlyer && (
                                        <span className="text-xs font-semibold text-emerald-700 shrink-0">Entregado</span>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    {isFlyer && (
                                        <a
                                            href={getWaUrl(m.titulo)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 text-center bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-semibold"
                                        >
                                            Pedir por WhatsApp
                                        </a>
                                    )}
                                    <button
                                        onClick={() => handleOpenDetails(m)}
                                        className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white py-2.5 rounded-xl text-sm font-semibold"
                                    >
                                        Ver detalles
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-10 text-center border border-slate-200 dark:border-slate-800">
                    <Trophy className="mx-auto text-slate-300 size-12" />
                    <p className="mt-3 font-semibold text-slate-800 dark:text-white">No hay misiones en esta lista</p>
                    <p className="text-sm text-slate-500">Prueba con otro filtro o búsqueda.</p>
                </div>
            )}

            {/* SECCIÓN DE HISTORIAL DE RECOMPENSAS ADJUDICADAS */}
            {history.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 space-y-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
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
                                        <p className="text-xs font-bold text-slate-900 dark:text-white uppercase">
                                            {h.Mission?.titulo || 'Misión Citiox'}
                                        </p>
                                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                            {h.detalles}
                                        </p>
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">
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
                                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold uppercase tracking-wide px-4 py-2.5 rounded-full transition-colors"
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
                                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 text-xs font-bold uppercase tracking-wide">
                                    <Target size={12} />
                                    Detalle de Misión
                                </span>
                                <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                                    {selectedMission.titulo}
                                </h2>
                            </div>
                        </div>

                        {/* DESCRIPCIÓN E INSTRUCCIONES EN CONTRASTE CLARO */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
                            <p className="text-xs font-bold uppercase tracking-wide text-cyan-600 dark:text-cyan-400">Instrucciones de la Misión</p>
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
                                        <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Progreso de la Misión</span>
                                        <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
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
                                    <p className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wide mb-1">Tu premio</p>
                                    <p className="text-sm sm:text-base font-bold text-emerald-700 dark:text-emerald-300">{selectedMission.rewardText}</p>
                                </div>
                                <Gift className="text-emerald-600 dark:text-emerald-400 size-8 shrink-0 ml-3" />
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Estado de Ejecución</p>
                                    <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                                        {selectedMission.completada ? 'Completada y Lista' : 'En progreso activo'}
                                    </p>
                                </div>
                                {selectedMission.completada ? (
                                    <CheckCircle2 className="text-emerald-500 size-8 shrink-0 ml-3" />
                                ) : (
                                    <Clock className="text-amber-500 size-8 shrink-0 ml-3" />
                                )}
                            </div>
                        </div>

                        {/* BOTÓN DESTACADO DE SOLICITUD POR WHATSAPP PARA MATERIAL FÍSICO / FLYERS */}
                        {(selectedMission.titulo?.toLowerCase().includes('flyer') || selectedMission.rewardText?.toLowerCase().includes('flyer') || selectedMission.rewardText?.toLowerCase().includes('físico')) && (
                            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-6 rounded-3xl text-white space-y-3 shadow-xl">
                                <div className="flex items-center gap-3">
                                    <div className="size-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shrink-0">
                                        📦
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-base uppercase tracking-tight text-white">¡Solicita tu Kit Físico con Código QR!</h4>
                                        <p className="text-xs text-emerald-100 font-medium">Haz clic para coordinar con soporte el envío o entrega de tus flyers impresos.</p>
                                    </div>
                                </div>
                                <a
                                    href={getWaUrl(selectedMission.titulo)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full bg-white hover:bg-emerald-50 text-emerald-950 py-4 px-5 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 text-center"
                                >
                                    📲 SOLICITAR MI KIT DE FLYERS POR WHATSAPP &rarr;
                                </a>
                            </div>
                        )}

                        {/* BOTÓN PRINCIPAL DE CERRAR */}
                        <button
                            onClick={handleCloseDetails}
                            className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white py-4 sm:py-5 rounded-2xl font-bold text-xs uppercase tracking-wide transition-all shadow-lg active:scale-95"
                        >
                            Entendido
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
