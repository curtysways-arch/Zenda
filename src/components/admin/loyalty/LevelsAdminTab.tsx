'use client';

import { useState, useEffect } from 'react';
import { 
    Award, 
    Crown, 
    Trophy, 
    Star, 
    Shield, 
    Zap, 
    Loader2, 
    Clock, 
    Calendar,
    ChevronRight,
    AlertCircle
} from 'lucide-react';

interface LevelsAdminTabProps {
    primaryColor: string;
}

export default function LevelsAdminTab({ primaryColor }: LevelsAdminTabProps) {
    const [levels, setLevels] = useState<any[]>([]);
    const [season, setSeason] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch('/api/admin/club');
            if (res.ok) {
                const data = await res.json();
                setLevels(data.levels || []);
                setSeason(data.season || null);
            } else {
                throw new Error("No se pudo cargar la información del Club.");
            }
        } catch (e: any) {
            console.error("Error loading club details:", e);
            setError(e.message || "Error al conectar con el servidor.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    function formatDate(d: string) {
        if (!d) return '';
        return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Loader2 size={32} className="animate-spin text-indigo-500 mb-3" />
                <p className="text-xs font-black uppercase tracking-widest">Cargando Niveles y Temporada...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-rose-50 border border-rose-100 rounded-3xl flex items-center gap-3 text-rose-600">
                <AlertCircle size={20} />
                <span className="text-xs font-bold">{error}</span>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* COLUMNA NIVELES OFICIALES (ANCHO 2) */}
            <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-0">
                        <Crown className="text-amber-500" size={18} /> Niveles de Fidelidad Oficiales
                    </h3>
                    <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 uppercase tracking-widest px-2.5 py-1 rounded-lg">
                        Escala Global Citiox
                    </span>
                </div>

                <div className="space-y-4">
                    {levels.map((level: any, idx: number) => {
                        const d = level.data || {};
                        const color = d.color || '#6366f1';

                        return (
                            <div
                                key={level.resourceId || idx}
                                className="bg-white border border-slate-150 hover:border-slate-300 rounded-[2rem] p-6 shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-6"
                            >
                                <div className="flex items-center gap-4">
                                    <div 
                                        className="size-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md"
                                        style={{ backgroundColor: `${color}15` }}
                                    >
                                        <Crown size={20} style={{ color }} />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                                            {d.titulo || d.nombre || `Nivel ${idx + 1}`}
                                        </h4>
                                        <p className="text-[10px] text-slate-400 font-semibold mt-1">
                                            {d.descripcion || 'Sin descripción oficial.'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-3">
                                    {d.xpRequerida !== undefined && (
                                        <div className="px-3.5 py-1.5 bg-slate-50 border border-slate-100 rounded-xl flex flex-col items-center">
                                            <span className="text-[8px] font-black text-slate-400 uppercase">XP Requerida</span>
                                            <span className="text-xs font-black text-slate-800 mt-0.5">{d.xpRequerida.toLocaleString()} XP</span>
                                        </div>
                                    )}
                                    {d.diamantesRequeridos !== undefined && (
                                        <div className="px-3.5 py-1.5 bg-slate-50 border border-slate-100 rounded-xl flex flex-col items-center">
                                            <span className="text-[8px] font-black text-slate-400 uppercase">Gemas / Diamantes</span>
                                            <span className="text-xs font-black text-slate-800 mt-0.5">{d.diamantesRequeridos.toLocaleString()}</span>
                                        </div>
                                    )}
                                    {d.multiplicador !== undefined && (
                                        <div className="px-3.5 py-1.5 bg-indigo-50 border border-indigo-100 rounded-xl flex flex-col items-center">
                                            <span className="text-[8px] font-black text-indigo-400 uppercase">Multiplicador</span>
                                            <span className="text-xs font-black text-indigo-600 mt-0.5">{d.multiplicador}x</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {levels.length === 0 && (
                        <p className="text-slate-400 text-xs font-medium py-12 text-center">No hay niveles globales configurados por Citiox.</p>
                    )}
                </div>
            </div>

            {/* COLUMNA TEMPORADA OFICIAL (ANCHO 1) */}
            <div className="space-y-6">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-0">
                    <Calendar className="text-indigo-500" size={18} /> Temporada Activa
                </h3>

                <div className="bg-slate-900 text-white rounded-[2rem] p-6 shadow-xl relative overflow-hidden flex flex-col gap-5">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full blur-[90px] opacity-30" />
                    
                    {season ? (
                        <>
                            <div className="relative z-10 space-y-1">
                                <span className="text-[8px] font-black text-indigo-300 bg-indigo-500/20 border border-indigo-500/30 uppercase tracking-widest px-2.5 py-0.5 rounded-md">
                                    Oficial Citiox
                                </span>
                                <h4 className="text-sm font-black uppercase tracking-wider pt-2">
                                    {season.data?.nombre || season.data?.codigo || 'Temporada Activa'}
                                </h4>
                                <p className="text-slate-400 text-[10px] font-semibold leading-relaxed pt-1">
                                    {season.data?.descripcion || 'Esta temporada competitiva corre a nivel nacional. Los clientes acumulan XP por sus reservas y compiten en el Club de Fidelización.'}
                                </p>
                            </div>

                            <div className="relative z-10 border-t border-white/10 pt-4 space-y-3">
                                {season.data?.fechaInicio && (
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-wider">
                                        <span className="text-slate-500">Fecha Inicio:</span>
                                        <span className="text-slate-200">{formatDate(season.data.fechaInicio)}</span>
                                    </div>
                                )}
                                {season.data?.fechaFin && (
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-wider">
                                        <span className="text-slate-500">Fecha Término:</span>
                                        <span className="text-slate-200">{formatDate(season.data.fechaFin)}</span>
                                    </div>
                                )}
                                {season.data?.duracionMeses && (
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-wider">
                                        <span className="text-slate-500">Duración:</span>
                                        <span className="text-slate-200">{season.data.duracionMeses} meses</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-wider">
                                    <span className="text-slate-500">Estado:</span>
                                    <span className="text-emerald-400">Activo</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-6">
                            <AlertCircle className="mx-auto text-slate-500 mb-2" size={32} />
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">No hay temporada global activa</p>
                        </div>
                    )}

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-[9px] text-slate-400 font-semibold leading-relaxed relative z-10">
                        ℹ️ Las temporadas, niveles y sus reglas se gestionan de manera centralizada por Citiox para garantizar consistencia nacional. Si requieres ajustes por favor contacta a soporte.
                    </div>
                </div>
            </div>
        </div>
    );
}
