'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Crown, Target, Gift, Check, Loader2, AlertTriangle, Coins, Users, ChevronRight } from 'lucide-react';

type Preset = {
    key: string;
    nombre: string;
    resumen: string;
    puntosPorVisita: number;
    puntosReferido: number;
    puntosPorDolar: number;
    visita: string;
    puntosAutomaticos: boolean;
    aviso?: string;
    levels: { nombre: string; desde: number; multiplicador: number; color: string; beneficios: string[] }[];
    missions: { nombre: string; descripcion: string; cantidadMeta: number; puntos: number }[];
    rewards: { nombre: string; descripcion: string; costoPuntos: number }[];
};

type Status = {
    activo: boolean;
    preset: string | null;
    recommended: string;
    reglas: { puntosActivos: boolean; puntosReserva: number; puntosReferido: number; puntosPorDolar: number };
    conteo: { niveles: number; misiones: number; premios: number };
    niveles: { id: string; nombre: string; desde: number; multiplicador: number; color: string }[];
    presets: Preset[];
};

/**
 * Activa el Club de beneficios en un paso (plantilla por tipo de negocio)
 * y, una vez activo, muestra sus reglas en lenguaje simple.
 */
export default function ClubQuickStart({
    primaryColor = '#ec4899',
    onNavigate,
}: {
    primaryColor?: string;
    onNavigate?: (tab: string) => void;
}) {
    const [status, setStatus] = useState<Status | null>(null);
    const [selected, setSelected] = useState<string>('');
    const [activating, setActivating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState<{ niveles: number; misiones: number; premios: number } | null>(null);
    const [puntosReserva, setPuntosReserva] = useState('');
    const [puntosReferido, setPuntosReferido] = useState('');
    const [puntosPorDolar, setPuntosPorDolar] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const load = async () => {
        try {
            const res = await fetch('/api/admin/club/quick-start', { cache: 'no-store' });
            if (!res.ok) return;
            const data: Status = await res.json();
            setStatus(data);
            setSelected((prev) => prev || data.preset || data.recommended);
            setPuntosReserva(String(data.reglas.puntosReserva));
            setPuntosReferido(String(data.reglas.puntosReferido));
            setPuntosPorDolar(String(data.reglas.puntosPorDolar ?? 1));
        } catch { /* sin conexión */ }
    };

    useEffect(() => { load(); }, []);

    if (!status) return null;

    const preset = status.presets.find((p) => p.key === selected) || status.presets[0];

    const activate = async () => {
        setActivating(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/club/quick-start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ preset: selected }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'No se pudo activar el club');
            setDone(data.created);
            setTimeout(() => window.location.reload(), 1600);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setActivating(false);
        }
    };

    const saveRules = async () => {
        setSaving(true);
        setSaved(false);
        try {
            const res = await fetch('/api/admin/club/quick-start', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ puntosReserva: Number(puntosReserva), puntosReferido: Number(puntosReferido), puntosPorDolar: Number(puntosPorDolar) }),
            });
            if (res.ok) setSaved(true);
        } finally {
            setSaving(false);
        }
    };

    /* ───────── Club ya activo: reglas simples ───────── */
    if (status.activo && !done) {
        const activePreset = status.presets.find((p) => p.key === status.preset);
        return (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Así funciona tu club</h3>
                        <p className="text-sm text-slate-500">Una sola moneda: tus clientes ganan puntos, suben de nivel y los canjean por premios.</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-full px-2.5 py-1 w-fit">
                        <Check size={13} /> Club activo
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    {status.preset !== 'gimnasio' && (
                    <label className="flex items-center gap-3 border border-slate-200 rounded-xl px-4 py-3">
                        <Coins size={18} className="text-amber-500 shrink-0" />
                        <span className="flex-1 text-sm text-slate-700">Puntos por cada {activePreset?.visita || 'visita'} completada</span>
                        <input
                            type="number"
                            min={0}
                            value={puntosReserva}
                            onChange={(e) => { setPuntosReserva(e.target.value); setSaved(false); }}
                            className="w-20 !py-1.5 !px-2 text-right text-sm font-semibold"
                        />
                    </label>
                    )}
                    <label className="flex items-center gap-3 border border-slate-200 rounded-xl px-4 py-3">
                        <Coins size={18} className="text-emerald-600 shrink-0" />
                        <span className="flex-1 text-sm text-slate-700">Puntos por cada $1 en caja, pedidos y órdenes</span>
                        <input
                            type="number"
                            min={0}
                            step="0.5"
                            value={puntosPorDolar}
                            onChange={(e) => { setPuntosPorDolar(e.target.value); setSaved(false); }}
                            className="w-20 !py-1.5 !px-2 text-right text-sm font-semibold"
                        />
                    </label>
                    <label className="flex items-center gap-3 border border-slate-200 rounded-xl px-4 py-3">
                        <Users size={18} className="text-blue-500 shrink-0" />
                        <span className="flex-1 text-sm text-slate-700">Puntos por recomendar a un amigo</span>
                        <input
                            type="number"
                            min={0}
                            value={puntosReferido}
                            onChange={(e) => { setPuntosReferido(e.target.value); setSaved(false); }}
                            className="w-20 !py-1.5 !px-2 text-right text-sm font-semibold"
                        />
                    </label>
                </div>
                <div className="flex items-center gap-3 mb-5">
                    <button
                        onClick={saveRules}
                        disabled={saving}
                        className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                        style={{ backgroundColor: primaryColor }}
                    >
                        {saving ? 'Guardando…' : 'Guardar reglas'}
                    </button>
                    {saved && <span className="text-sm text-emerald-700 flex items-center gap-1"><Check size={14} /> Guardado</span>}
                </div>

                {activePreset?.aviso && (
                    <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
                        <AlertTriangle size={17} className="shrink-0 mt-0.5" />
                        {activePreset.aviso}
                    </div>
                )}

                {status.niveles.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-5">
                        {status.niveles.map((l) => (
                            <span key={l.id} className="inline-flex items-center gap-1.5 text-sm rounded-full border border-slate-200 px-3 py-1">
                                <span className="size-2.5 rounded-full" style={{ backgroundColor: l.color }} />
                                <span className="font-semibold text-slate-800">{l.nombre}</span>
                                <span className="text-slate-500">desde {l.desde} pts</span>
                                {l.multiplicador > 1 && <span className="text-emerald-700 font-medium">+{Math.round((l.multiplicador - 1) * 100)}%</span>}
                            </span>
                        ))}
                    </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                    {[
                        { label: 'Niveles', value: status.conteo.niveles, tab: 'levels', icon: Crown },
                        { label: 'Misiones activas', value: status.conteo.misiones, tab: 'campaigns', icon: Target },
                        { label: 'Premios', value: status.conteo.premios, tab: 'rewards', icon: Gift },
                    ].map((it) => (
                        <button
                            key={it.label}
                            onClick={() => onNavigate?.(it.tab)}
                            className="text-left rounded-xl bg-slate-50 hover:bg-slate-100 px-3 py-3 transition-colors"
                        >
                            <it.icon size={16} className="text-slate-500" />
                            <p className="mt-1.5 text-xl font-bold text-slate-900">{it.value}</p>
                            <p className="text-xs text-slate-500 flex items-center gap-0.5">{it.label} <ChevronRight size={12} /></p>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    /* ───────── Activación en 1 minuto ───────── */
    return (
        <div className="bg-white border-2 rounded-2xl overflow-hidden" style={{ borderColor: `${primaryColor}55` }}>
            <div className="p-5 sm:p-6 border-b border-slate-100" style={{ background: `linear-gradient(135deg, ${primaryColor}14, transparent)` }}>
                <p className="text-sm font-semibold flex items-center gap-1.5" style={{ color: primaryColor }}>
                    <Sparkles size={16} /> Activa tu club en 1 minuto
                </p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">Elige una plantilla y listo</h3>
                <p className="text-sm text-slate-600 mt-1">Creamos los niveles, las misiones y los premios por ti. Después puedes cambiar lo que quieras.</p>

                <div className="mt-4 flex flex-wrap gap-2">
                    {status.presets.map((p) => (
                        <button
                            key={p.key}
                            onClick={() => setSelected(p.key)}
                            className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${selected === p.key ? 'text-white border-transparent' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'}`}
                            style={selected === p.key ? { backgroundColor: primaryColor } : undefined}
                        >
                            {p.nombre}{p.key === status.recommended ? ' · recomendada' : ''}
                        </button>
                    ))}
                </div>
            </div>

            {preset && (
                <div className="p-5 sm:p-6 space-y-5">
                    <p className="text-[15px] text-slate-700">{preset.resumen}</p>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="rounded-xl bg-slate-50 p-4">
                            <p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5"><Crown size={15} className="text-amber-500" /> 3 niveles</p>
                            <ul className="mt-2.5 space-y-2">
                                {preset.levels.map((l) => (
                                    <li key={l.nombre} className="text-sm">
                                        <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
                                            <span className="size-2.5 rounded-full" style={{ backgroundColor: l.color }} />{l.nombre}
                                        </span>
                                        <span className="text-slate-500"> · desde {l.desde} pts</span>
                                        <p className="text-xs text-slate-500 mt-0.5">{l.beneficios.join(' · ')}</p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-4">
                            <p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5"><Target size={15} className="text-pink-500" /> Misiones</p>
                            <ul className="mt-2.5 space-y-2">
                                {preset.puntosPorVisita > 0 && (
                                    <li className="text-sm text-slate-700 flex justify-between gap-2"><span>Cada {preset.visita} completada</span><span className="font-semibold text-slate-900 shrink-0">+{preset.puntosPorVisita}</span></li>
                                )}
                                {preset.missions.map((m) => (
                                    <li key={m.nombre} className="text-sm text-slate-700 flex justify-between gap-2"><span>{m.nombre}</span><span className="font-semibold text-slate-900 shrink-0">+{m.puntos}</span></li>
                                ))}
                                <li className="text-sm text-slate-700 flex justify-between gap-2"><span>Cada $1 en caja o pedidos</span><span className="font-semibold text-slate-900 shrink-0">+{preset.puntosPorDolar}</span></li>
                                <li className="text-sm text-slate-700 flex justify-between gap-2"><span>Recomendar a un amigo</span><span className="font-semibold text-slate-900 shrink-0">+{preset.puntosReferido}</span></li>
                            </ul>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-4">
                            <p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5"><Gift size={15} className="text-emerald-600" /> Premios para canjear</p>
                            <ul className="mt-2.5 space-y-2">
                                {preset.rewards.map((r) => (
                                    <li key={r.nombre} className="text-sm text-slate-700 flex justify-between gap-2"><span>{r.nombre}</span><span className="font-semibold text-slate-900 shrink-0">{r.costoPuntos} pts</span></li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {preset.aviso && (
                        <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
                            <AlertTriangle size={17} className="shrink-0 mt-0.5" />
                            {preset.aviso}
                        </div>
                    )}

                    {error && <p className="text-sm text-rose-600">{error}</p>}

                    {done ? (
                        <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                            <Check size={18} /> ¡Club activado! Creamos {done.niveles} niveles, {done.misiones} misiones y {done.premios} premios.
                        </div>
                    ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <button
                                onClick={activate}
                                disabled={activating}
                                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-white font-semibold disabled:opacity-60"
                                style={{ backgroundColor: primaryColor }}
                            >
                                {activating ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />}
                                {activating ? 'Activando…' : 'Activar mi club'}
                            </button>
                            <p className="text-xs text-slate-500">No se borra nada de lo que ya tengas configurado.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
