'use client';
/**
 * Servicios (celular): lo que los clientes pueden reservar.
 * Agrupados por categoría, con duración, precio y quién lo atiende a la vista.
 * Tocar abre el editor; el interruptor muestra u oculta el servicio en la página.
 */
import { useMemo, useState } from 'react';
import { Plus, Search, Sparkles, Users, AlertTriangle, UploadCloud, X, ChevronRight, EyeOff } from 'lucide-react';
import { getImageUrl } from '@/lib/utils';

interface MobileServicesProps {
    services: any[];
    primaryColor: string;
    onNew: () => void;
    onEdit: (service: any) => void;
    onImport?: () => void;
    onToggle?: (service: any, activo: boolean) => Promise<boolean> | boolean;
    isLaundry?: boolean;
}

function inkOn(color: string) {
    if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color || '')) return '#ffffff';
    const h = color.slice(1);
    const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.179 ? '#1e1b2e' : '#ffffff';
}

const money = (n: any) => `$${(Number(n) || 0).toFixed(Number(n) % 1 ? 2 : 0)}`;

function duracionTexto(s: any, isLaundry?: boolean) {
    if (s.extraInfo?.tiempoEntrega) return s.extraInfo.tiempoEntrega;
    const d = Number(s.duracion) || 0;
    if (isLaundry) return d >= 1440 ? `${Math.round(d / 1440)} días` : `${d || 48} h`;
    if (d >= 60) return `${Math.floor(d / 60)} h${d % 60 ? ` ${d % 60} min` : ''}`;
    return `${d} min`;
}

const quitarAcentos = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function MobileServices({ services, primaryColor, onNew, onEdit, onImport, onToggle, isLaundry }: MobileServicesProps) {
    const [q, setQ] = useState('');
    const [cat, setCat] = useState<string>('todas');
    const [ocultosLocal, setOcultosLocal] = useState<Record<string, boolean>>({});
    const ink = inkOn(primaryColor);

    const activo = (s: any) => (s.id in ocultosLocal ? ocultosLocal[s.id] : s.estaActivo !== false);

    const categorias = useMemo(() => {
        const m = new Map<string, number>();
        services.forEach((s) => { const k = (s.tipo || '').trim() || 'Otros'; m.set(k, (m.get(k) || 0) + 1); });
        return Array.from(m.entries()).sort((a, b) => (a[0] === 'Otros' ? 1 : b[0] === 'Otros' ? -1 : a[0].localeCompare(b[0])));
    }, [services]);

    const visibles = useMemo(() => {
        const t = quitarAcentos(q.trim());
        return services.filter((s) => {
            if (cat !== 'todas' && ((s.tipo || '').trim() || 'Otros') !== cat) return false;
            if (!t) return true;
            return quitarAcentos(`${s.nombre} ${s.tipo || ''}`).includes(t);
        });
    }, [services, q, cat]);

    const grupos = useMemo(() => {
        const m = new Map<string, any[]>();
        visibles.forEach((s) => { const k = (s.tipo || '').trim() || 'Otros'; if (!m.has(k)) m.set(k, []); m.get(k)!.push(s); });
        return Array.from(m.entries()).sort((a, b) => (a[0] === 'Otros' ? 1 : b[0] === 'Otros' ? -1 : a[0].localeCompare(b[0])));
    }, [visibles]);

    const sinProfesional = !isLaundry ? services.filter((s) => activo(s) && !(s.Staff?.length)).length : 0;
    const ocultos = services.filter((s) => !activo(s)).length;

    const toggle = async (s: any) => {
        if (!onToggle) return;
        const nuevo = !activo(s);
        setOcultosLocal((p) => ({ ...p, [s.id]: nuevo }));
        const ok = await onToggle(s, nuevo);
        if (ok === false) setOcultosLocal((p) => ({ ...p, [s.id]: !nuevo }));
    };

    return (
        <div className="min-h-full bg-slate-50 pb-28">
            {/* Encabezado */}
            <div className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/95 px-4 pb-3 pt-4 backdrop-blur">
                <div className="flex items-end justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="text-[22px] font-bold leading-tight tracking-tight text-slate-900">Servicios</h1>
                        <p className="text-sm text-slate-500">
                            {services.length === 0 ? 'Lo que tus clientes pueden reservar' : `${services.length - ocultos} en tu página${ocultos ? ` · ${ocultos} oculto${ocultos === 1 ? '' : 's'}` : ''}`}
                        </p>
                    </div>
                    {onImport && (
                        <button type="button" onClick={onImport} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 active:bg-slate-50">
                            <UploadCloud size={16} /> Importar
                        </button>
                    )}
                </div>

                {services.length > 0 && (
                    <>
                        <div className="relative mt-3">
                            <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="search"
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="Buscar servicio"
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-300 focus:bg-white"
                            />
                            {q && (
                                <button type="button" onClick={() => setQ('')} aria-label="Borrar búsqueda" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-400">
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                        {categorias.length > 1 && (
                            <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4" style={{ scrollbarWidth: 'none' }}>
                                {[['todas', services.length] as [string, number], ...categorias].map(([k, n]) => {
                                    const sel = cat === k;
                                    return (
                                        <button key={k} type="button" onClick={() => setCat(k)} aria-pressed={sel}
                                            className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${sel ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>
                                            {k === 'todas' ? 'Todos' : k} <span className={sel ? 'text-white/60' : 'text-slate-400'}>{n}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>

            <div className="space-y-5 px-4 pt-4">
                {sinProfesional > 0 && !q && cat === 'todas' && (
                    <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-900">
                        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
                        <p>
                            <b>{sinProfesional} {sinProfesional === 1 ? 'servicio no tiene' : 'servicios no tienen'}</b> quién lo atienda. Ábrelo y asigna un profesional para que la agenda reparta bien los turnos.
                        </p>
                    </div>
                )}

                {services.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
                        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl" style={{ backgroundColor: `${primaryColor}1A`, color: primaryColor }}>
                            <Sparkles size={26} />
                        </span>
                        <p className="mt-4 text-lg font-bold text-slate-900">Agrega tu primer servicio</p>
                        <p className="mx-auto mt-1 max-w-[28ch] text-sm text-slate-500">Nombre, duración y precio. Con eso tus clientes ya pueden reservar.</p>
                        <button type="button" onClick={onNew} className="mt-5 inline-flex items-center gap-2 rounded-full px-5 py-3 text-[15px] font-bold" style={{ backgroundColor: primaryColor, color: ink }}>
                            <Plus size={18} /> Nuevo servicio
                        </button>
                        {onImport && (
                            <button type="button" onClick={onImport} className="mt-3 block w-full text-sm font-semibold text-slate-500">Tengo una lista en Excel</button>
                        )}
                    </div>
                ) : visibles.length === 0 ? (
                    <div className="py-14 text-center">
                        <p className="font-semibold text-slate-900">Nada con “{q}”</p>
                        <button type="button" onClick={() => { setQ(''); setCat('todas'); }} className="mt-2 text-sm font-semibold text-slate-900 underline underline-offset-4">Ver todos los servicios</button>
                    </div>
                ) : (
                    grupos.map(([nombre, lista]) => (
                        <section key={nombre}>
                            {(categorias.length > 1 && cat === 'todas') && (
                                <h2 className="mb-2 px-1 text-[13px] font-semibold text-slate-500">{nombre} <span className="font-normal text-slate-400">· {lista.length}</span></h2>
                            )}
                            <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80">
                                {lista.map((s) => {
                                    const on = activo(s);
                                    const img = s.imageMedia || s.imagenes?.[0]?.url;
                                    const staff: any[] = s.Staff || [];
                                    return (
                                        <li key={s.id} className="flex items-center">
                                            <button type="button" onClick={() => onEdit(s)} className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-3 pr-1 text-left active:bg-slate-50">
                                                <span className={`flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 ${on ? '' : 'opacity-50 grayscale'}`}>
                                                    {img ? <img src={getImageUrl(img, 'thumb')} alt="" className="size-full object-cover" loading="lazy" /> : <Sparkles size={20} className="text-slate-300" />}
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className={`block truncate text-[15px] font-semibold leading-tight ${on ? 'text-slate-900' : 'text-slate-500'}`}>{s.nombre}</span>
                                                    <span className="mt-0.5 block text-sm tabular-nums text-slate-500">
                                                        {duracionTexto(s, isLaundry)} · <b className={on ? 'font-semibold text-slate-900' : 'font-semibold text-slate-500'}>{money(s.precio)}</b>
                                                    </span>
                                                    {!on ? (
                                                        <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-slate-500"><EyeOff size={12} /> Oculto en tu página</span>
                                                    ) : !isLaundry && (
                                                        staff.length ? (
                                                            <span className="mt-1 flex items-center gap-1 truncate text-xs text-slate-500"><Users size={12} className="shrink-0" />{staff.length === 1 ? staff[0].name : `${staff[0].name.split(' ')[0]} y ${staff.length - 1} más`}</span>
                                                        ) : (
                                                            <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-amber-700"><AlertTriangle size={12} /> Sin profesional</span>
                                                        )
                                                    )}
                                                </span>
                                                {!onToggle && <ChevronRight size={18} className="shrink-0 text-slate-300" />}
                                            </button>
                                            {onToggle && (
                                                <button type="button" role="switch" aria-checked={on} aria-label={on ? `Ocultar ${s.nombre}` : `Mostrar ${s.nombre}`} onClick={() => toggle(s)}
                                                    className="flex h-full shrink-0 items-center px-3 py-5">
                                                    <span className="relative h-7 w-12 rounded-full transition-colors" style={{ backgroundColor: on ? primaryColor : '#cbd5e1' }}>
                                                        <span className="absolute top-0.5 size-6 rounded-full bg-white shadow transition-all" style={{ left: on ? 22 : 2 }} />
                                                    </span>
                                                </button>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>
                    ))
                )}
            </div>

            {services.length > 0 && (
                <button type="button" onClick={onNew} className="fixed bottom-[84px] right-4 z-[96] inline-flex items-center gap-2 rounded-full px-5 py-3.5 text-[15px] font-bold shadow-[0_12px_30px_-10px_rgba(15,23,42,0.5)] transition active:scale-95"
                    style={{ backgroundColor: primaryColor, color: ink }}>
                    <Plus size={20} strokeWidth={2.5} /> Nuevo servicio
                </button>
            )}
        </div>
    );
}
