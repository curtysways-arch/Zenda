'use client';

import { ArrowRight, Crown, AlertTriangle, Lock, Zap } from 'lucide-react';
import Link from 'next/link';

interface UpgradeBannerProps {
    type: 'trial_expiring' | 'limit_reached' | 'feature_locked' | 'downgraded';
    daysLeft?: number;
    featureName?: string;
    currentUsage?: number;
    maxUsage?: number;
    isGracePeriod?: boolean;
}

export default function UpgradeBanner({ type, daysLeft, featureName, currentUsage, maxUsage, isGracePeriod }: UpgradeBannerProps) {
    if (type === 'trial_expiring') {
        return (
            <div className={`relative rounded-[3rem] p-10 md:p-14 border shadow-xl overflow-hidden group ${isGracePeriod ? 'bg-amber-50' : 'bg-slate-900 text-white'}`}>
                <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full blur-[80px] -mr-48 -mt-48 transition-transform duration-1000"
                     style={{ backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 80%)' }} />
                <div className="relative flex flex-col lg:flex-row items-center justify-between gap-12">
                    <div className="space-y-5 text-center lg:text-left">
                        <div className={`inline-flex px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-[0.3em] mb-2 italic ${isGracePeriod ? 'border-amber-200 text-amber-700 bg-amber-100' : 'border-white/20 text-white/80 bg-white/5'}`}>
                            {isGracePeriod ? 'Periodo de Gracia' : 'Modo Prueba Activo'}
                        </div>
                        <h2 className={`text-4xl md:text-6xl font-black tracking-tighter leading-[0.9] uppercase italic ${isGracePeriod ? 'text-slate-900' : ''}`}>
                            Asegura tu <br/><span style={{ color: 'var(--primary-color)' }}>Centro Pro</span>
                        </h2>
                        <p className={`font-bold max-w-lg text-lg uppercase italic leading-none ${isGracePeriod ? 'text-slate-600' : 'text-slate-400'}`}>
                            {isGracePeriod ? 'Tu plan ha expirado. Restaura tu acceso pronto.' : 'No pierdas acceso a tus funcionalidades premium.'}
                        </p>
                    </div>
                    <div className={`flex items-center gap-10 p-10 rounded-[2.5rem] border backdrop-blur-sm shadow-inner ${isGracePeriod ? 'bg-white/50 border-white shadow-xl' : 'bg-white/5 border-white/10'}`}>
                        <div className="text-center">
                            <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-2 ${isGracePeriod ? 'text-amber-600' : 'text-slate-400'}`}>
                                {isGracePeriod ? 'VENCE EN' : 'QUEDAN'}
                            </p>
                            <p className={`text-7xl font-black tracking-tighter italic leading-none ${isGracePeriod ? 'text-slate-900' : 'text-white'}`}>{daysLeft || 0}</p>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] mt-2" style={{ color: 'var(--primary-color)' }}>DÍAS</p>
                        </div>
                        <div className={`h-20 w-[1px] ${isGracePeriod ? 'bg-slate-200' : 'bg-white/10'}`} />
                        <Link
                            href="/admin/plan"
                            className={`px-10 py-6 rounded-[2rem] text-[11px] font-black tracking-[0.2em] uppercase hover:scale-105 active:scale-95 shadow-2xl transition-all flex items-center gap-2 ${isGracePeriod ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-white text-slate-900 hover:bg-slate-100'}`}
                        >
                            ACTUALIZAR AHORA <ArrowRight size={16} />
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (type === 'downgraded') {
        return (
            <div className="relative rounded-[3rem] p-10 md:p-14 border border-rose-100 bg-rose-50/50 shadow-xl overflow-hidden group">
                <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full blur-[80px] -mr-48 -mt-48 transition-transform duration-1000"
                     style={{ backgroundColor: 'rgba(244, 63, 94, 0.15)' }} />
                <div className="relative flex flex-col lg:flex-row items-center justify-between gap-12">
                    <div className="space-y-4 text-center lg:text-left">
                        <div className="inline-flex px-4 py-2 rounded-full border border-rose-200 text-[10px] font-black uppercase tracking-[0.3em] mb-2 italic text-rose-700 bg-rose-100/80 animate-pulse">
                            Prueba Finalizada ⏳
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tighter leading-[0.9] uppercase italic text-slate-900">
                            Tu cuenta pasó a <br/><span className="text-rose-600">Plan Gratuito (BEGIN)</span>
                        </h2>
                        <p className="font-medium max-w-xl text-sm leading-relaxed text-slate-600">
                            El periodo de prueba de 14 días ha concluido. Para evitar interrupciones en la experiencia de tus clientes, se han desactivado temporalmente las <strong className="text-rose-700">notificaciones de WhatsApp</strong>, los <strong className="text-rose-700">recordatorios automáticos</strong> y el <strong className="text-rose-700">branding de marca propio</strong>.
                        </p>
                    </div>
                    <div className="flex items-center gap-6">
                        <Link
                            href="/admin/plan"
                            className="px-10 py-6 rounded-[2rem] text-[11px] font-black tracking-[0.2em] uppercase hover:scale-105 active:scale-95 shadow-2xl transition-all flex items-center gap-2 bg-slate-900 text-white hover:bg-black"
                        >
                            RECUPERAR PRO <ArrowRight size={16} />
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (type === 'limit_reached') {
        const percent = Math.min(100, Math.round(((currentUsage || 0) / (maxUsage || 1)) * 100));
        return (
            <div className="bg-amber-50 border border-amber-200 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                        <AlertTriangle size={28} />
                    </div>
                    <div>
                        <h3 className="text-amber-900 font-black uppercase tracking-tight text-lg">Límite Alcanzado</h3>
                        <p className="text-amber-700/80 text-sm font-bold mt-1">Has llegado al máximo permitido por tu plan actual.</p>
                    </div>
                </div>
                <div className="flex-1 max-w-sm w-full">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-amber-800 mb-2">
                        <span>Uso actual</span>
                        <span>{currentUsage} / {maxUsage}</span>
                    </div>
                    <div className="h-3 bg-amber-200/50 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full transition-all duration-1000" style={{ width: `${percent}%` }} />
                    </div>
                </div>
                <Link href="/admin/plan" className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-amber-500/30 flex items-center gap-2">
                    Mejorar Plan <Zap size={14} />
                </Link>
            </div>
        );
    }

    if (type === 'feature_locked') {
        return (
            <div className="bg-slate-50 border border-slate-200 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm group hover:border-slate-300 transition-all">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-white shadow-sm border border-slate-100 rounded-full flex items-center justify-center text-slate-400 group-hover:text-amber-500 group-hover:bg-amber-50 transition-all">
                        <Lock size={28} />
                    </div>
                    <div>
                        <h3 className="text-slate-900 font-black uppercase tracking-tight text-lg flex items-center gap-2">
                            {featureName || 'Función Bloqueada'} <Crown size={16} className="text-amber-500" />
                        </h3>
                        <p className="text-slate-500 text-sm font-bold mt-1">Esta característica requiere un plan superior.</p>
                    </div>
                </div>
                <Link href="/admin/plan" className="px-6 py-3 bg-slate-900 hover:bg-black text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2">
                    Desbloquear <ArrowRight size={14} />
                </Link>
            </div>
        );
    }

    return null;
}
