'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Gift, Target, X, ChevronRight } from 'lucide-react';

type NextMission = {
    id: string;
    titulo: string;
    progreso: number;
    objetivo: number;
    porcentaje: number;
    reward: string;
};

function rewardLabel(m: any): string {
    let v: any = m.recompensaValor || {};
    if (typeof v === 'string') {
        try { v = JSON.parse(v); } catch { v = {}; }
    }
    if (v?.texto) return v.texto;
    switch (m.recompensaTipo) {
        case 'FREE_DAYS': return `${v.dias || 0} días gratis`;
        case 'UNLOCK_FEATURE': return `Desbloquea ${v.feature || 'un módulo'}`;
        case 'DIAMONDS': return `${v.diamantes || 0} diamantes`;
        case 'CREDITS': return `$${v.creditos || 0} de saldo`;
        case 'BADGE': return `Insignia ${v.badge || ''}`.trim();
        default: return 'Premio especial';
    }
}

const DISMISS_KEY = 'citiox-mission-widget-dismissed';

/**
 * Muestra la misión de Citiox más cercana a completarse para que el dueño
 * vuelva cada día a avanzar (y gane días de suscripción).
 */
export default function CitioxMissionWidget({ variant = 'card', className = '' }: { variant?: 'card' | 'strip'; className?: string }) {
    const [mission, setMission] = useState<NextMission | null>(null);
    const [pendingCount, setPendingCount] = useState(0);
    const [hidden, setHidden] = useState(false);

    useEffect(() => {
        try {
            if (variant === 'strip' && localStorage.getItem(DISMISS_KEY) === new Date().toDateString()) {
                setHidden(true);
                return;
            }
        } catch { /* sin almacenamiento */ }

        let alive = true;
        fetch('/api/admin/misiones-globales')
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (!alive || !data) return;
                const progress: any[] = data.progress || [];
                const pending = (data.missions || [])
                    .map((m: any) => {
                        const p = progress.find((x) => x.missionId === m.id);
                        const objetivo = Math.max(1, Number(m.objetivo || 1));
                        const prog = Number(p?.progreso || 0);
                        return {
                            id: m.id,
                            titulo: m.titulo,
                            progreso: Math.min(objetivo, prog),
                            objetivo,
                            porcentaje: Math.min(100, Math.round((prog / objetivo) * 100)),
                            reward: rewardLabel(m),
                            completada: Boolean(p?.completada),
                        };
                    })
                    .filter((m: any) => !m.completada);
                pending.sort((a: any, b: any) => b.porcentaje - a.porcentaje);
                setPendingCount(pending.length);
                setMission(pending[0] || null);
            })
            .catch(() => {});
        return () => { alive = false; };
    }, [variant]);

    if (hidden || !mission) return null;

    const remaining = mission.objetivo - mission.progreso;

    if (variant === 'strip') {
        return (
            <div className={`flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-3 ${className}`}>
                <span className="size-9 rounded-xl bg-blue-50 text-[#0066FF] flex items-center justify-center shrink-0">
                    <Target size={18} />
                </span>
                <Link href="/admin/misiones-citiox" className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                        {remaining <= 0 ? 'Misión lista: ' : `Te ${remaining === 1 ? 'falta 1' : `faltan ${remaining}`} para: `}{mission.titulo}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="h-1.5 flex-1 max-w-48 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-[#0066FF] rounded-full" style={{ width: `${mission.porcentaje}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-emerald-700 truncate">Ganas: {mission.reward}</span>
                    </div>
                </Link>
                <button
                    type="button"
                    aria-label="Ocultar por hoy"
                    onClick={() => {
                        setHidden(true);
                        try { localStorage.setItem(DISMISS_KEY, new Date().toDateString()); } catch { /* sin almacenamiento */ }
                    }}
                    className="size-8 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 flex items-center justify-center shrink-0"
                >
                    <X size={16} />
                </button>
            </div>
        );
    }

    return (
        <Link href="/admin/misiones-citiox" className={`block bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-300 hover:shadow-sm transition-all ${className}`}>
            <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[#0066FF] flex items-center gap-1.5"><Target size={15} /> Gana días gratis</p>
                {pendingCount > 1 && <span className="text-xs text-slate-500">{pendingCount} misiones</span>}
            </div>
            <p className="mt-2 font-semibold text-slate-900 leading-snug">{mission.titulo}</p>
            <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-slate-500">{remaining <= 0 ? '¡Lista para reclamar!' : `Te ${remaining === 1 ? 'falta 1' : `faltan ${remaining}`}`}</span>
                <span className="font-semibold text-slate-900">{mission.progreso} de {mission.objetivo}</span>
            </div>
            <div className="mt-1.5 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#0066FF] rounded-full" style={{ width: `${mission.porcentaje}%` }} />
            </div>
            <div className="mt-3 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                    <Gift size={14} /> {mission.reward}
                </span>
                <ChevronRight size={16} className="text-slate-400" />
            </div>
        </Link>
    );
}
