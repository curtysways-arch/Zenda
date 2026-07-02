'use client';

import { useState, useEffect } from 'react';
import { Gift, Users, Award, ShieldAlert, Check, Loader2, Building, Eye, ChevronRight, BarChart3 } from 'lucide-react';
import Link from 'next/link';

export default function SuperAdminReferidosPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/superadmin/referrals')
            .then(res => res.json())
            .then(d => {
                setData(d);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error loading superadmin stats:", err);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
                <Loader2 className="animate-spin mb-4 text-emerald-500" size={36} />
                <span className="text-[10px] font-black uppercase tracking-widest">Cargando métricas de red...</span>
            </div>
        );
    }

    const stats = data?.stats || { totalValidos: 0, totalPendientes: 0, totalCampaigns: 0, totalRewards: 0 };
    const negocios = data?.negocios || [];

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            {/* Title */}
            <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic flex items-center gap-2">
                    <Gift className="text-emerald-500" size={24} />
                    Métricas de Referidos
                </h1>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-1">
                    Vista global del rendimiento del sistema de referidos en toda la plataforma
                </p>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-sm flex flex-col justify-between min-h-[120px]">
                    <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[9px] font-black uppercase tracking-widest">Total Referidos Válidos</span>
                        <Check size={18} className="text-emerald-500" />
                    </div>
                    <span className="text-3xl font-black text-slate-900 dark:text-white mt-2">{stats.totalValidos}</span>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-sm flex flex-col justify-between min-h-[120px]">
                    <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[9px] font-black uppercase tracking-widest">Invitaciones en Progreso</span>
                        <Users size={18} className="text-cyan-500" />
                    </div>
                    <span className="text-3xl font-black text-slate-900 dark:text-white mt-2">{stats.totalPendientes}</span>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-sm flex flex-col justify-between min-h-[120px]">
                    <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[9px] font-black uppercase tracking-widest">Campañas Activas</span>
                        <Gift size={18} className="text-amber-500" />
                    </div>
                    <span className="text-3xl font-black text-slate-900 dark:text-white mt-2">{stats.totalCampaigns}</span>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-sm flex flex-col justify-between min-h-[120px]">
                    <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[9px] font-black uppercase tracking-widest">Total Premios Reclamados</span>
                        <Award size={18} className="text-purple-500" />
                    </div>
                    <span className="text-3xl font-black text-slate-900 dark:text-white mt-2">{stats.totalRewards}</span>
                </div>
            </div>

            {/* Ranking Negocios */}
            <div className="grid grid-cols-1 gap-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-6 lg:p-8 shadow-sm">
                    <h3 className="text-base font-black text-slate-900 dark:text-white uppercase italic tracking-tight mb-6 flex items-center gap-2">
                        <BarChart3 className="text-emerald-500" size={20} />
                        Ranking de Negocios más recomendados
                    </h3>

                    {negocios.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <Building className="mx-auto mb-4 opacity-30" size={32} />
                            <p className="text-xs font-bold uppercase tracking-wider">Aún no hay actividad de referidos en ningún negocio</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-white/5 text-[9px] font-black uppercase tracking-widest text-slate-400 pb-3">
                                        <th className="pb-3 w-16">Puesto</th>
                                        <th className="pb-3">Negocio</th>
                                        <th className="pb-3">Slug</th>
                                        <th className="pb-3">Referidos Efectivos</th>
                                        <th className="pb-3 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs font-semibold text-slate-700 dark:text-slate-350">
                                    {negocios.map((neg: any, idx: number) => (
                                        <tr key={neg.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                                            <td className="py-4">
                                                <span className={`size-7 rounded-full flex items-center justify-center font-black text-[11px] ${
                                                    idx === 0 ? 'bg-amber-100 text-amber-800' :
                                                    idx === 1 ? 'bg-slate-200 text-slate-800' :
                                                    idx === 2 ? 'bg-orange-100 text-orange-800' : 'bg-slate-100 dark:bg-white/5 text-slate-500'
                                                }`}>
                                                    {idx + 1}
                                                </span>
                                            </td>
                                            <td className="py-4 font-bold text-slate-900 dark:text-white">
                                                {neg.nombre}
                                            </td>
                                            <td className="py-4 font-medium text-slate-400 font-mono">
                                                /{neg.slug}
                                            </td>
                                            <td className="py-4 font-black text-slate-900 dark:text-white text-sm">
                                                {neg.referidosValidos}
                                            </td>
                                            <td className="py-4 text-right">
                                                <a
                                                    href={`/${neg.slug}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 rounded-xl transition-all"
                                                >
                                                    <Eye size={12} />
                                                    Ver Landing
                                                </a>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
