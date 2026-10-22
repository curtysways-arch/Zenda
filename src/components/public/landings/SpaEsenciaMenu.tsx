'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, Clock, ArrowRight } from 'lucide-react';

export interface EsenciaService {
    id: string;
    nombre: string;
    descripcion?: string;
    categoria?: string;
    duracion?: number;
    precio?: number | null;
    imagen: string;
}

function formatDuration(min?: number) {
    if (!min) return '';
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h} h ${m} min` : `${h} h`;
}

/**
 * Menú de servicios del diseño Esencia: categorías, buscador y lista editorial.
 */
export default function SpaEsenciaMenu({
    services,
    slug,
    accent,
    showPrices,
}: {
    services: EsenciaService[];
    slug: string;
    accent: string;
    showPrices: boolean;
}) {
    const categories = useMemo(() => {
        const set = new Set<string>();
        services.forEach((s) => s.categoria && set.add(s.categoria));
        return ['Todos', ...Array.from(set)];
    }, [services]);

    const [cat, setCat] = useState('Todos');
    const [q, setQ] = useState('');
    const [showAll, setShowAll] = useState(false);

    const filtered = services.filter((s) => {
        if (cat !== 'Todos' && s.categoria !== cat) return false;
        if (q.trim()) {
            const t = q.trim().toLowerCase();
            return s.nombre.toLowerCase().includes(t) || (s.descripcion || '').toLowerCase().includes(t);
        }
        return true;
    });
    const visible = showAll ? filtered : filtered.slice(0, 6);

    return (
        <div>
            <div className="flex flex-col md:flex-row md:items-center gap-3 mb-8">
                {categories.length > 2 && (
                    <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] -mx-5 px-5 md:mx-0 md:px-0 md:flex-wrap flex-1">
                        {categories.map((c) => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => { setCat(c); setShowAll(false); }}
                                className="shrink-0 px-4 py-2 rounded-full text-sm transition-colors border"
                                style={cat === c
                                    ? { backgroundColor: 'var(--es-ink)', color: 'var(--es-bg)', borderColor: 'var(--es-ink)' }
                                    : { backgroundColor: 'transparent', color: 'var(--es-ink)', borderColor: 'var(--es-line)' }}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                )}
                {services.length > 5 && (
                    <label className="relative md:w-72 md:ml-auto">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50" />
                        <input
                            type="search"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Buscar un servicio"
                            className="w-full !rounded-full !border !bg-white/60 !pl-11 !pr-4 !py-2.5 text-sm outline-none"
                            style={{ borderColor: 'var(--es-line)', color: 'var(--es-ink)' }}
                        />
                    </label>
                )}
            </div>

            {visible.length === 0 ? (
                <p className="text-center py-10" style={{ color: 'var(--es-muted)' }}>No encontramos servicios con esa búsqueda.</p>
            ) : (
                <ul className="grid md:grid-cols-2 gap-x-10">
                    {visible.map((s) => (
                        <li key={s.id} className="border-t" style={{ borderColor: 'var(--es-line)' }}>
                            <Link href={`/${slug}/servicio/${s.id}`} className="group flex gap-4 py-5 items-center">
                                <span className="relative size-20 sm:size-24 shrink-0 overflow-hidden rounded-t-full rounded-b-2xl bg-black/5">
                                    <img src={s.imagen} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                </span>
                                <span className="flex-1 min-w-0">
                                    <span className="flex items-baseline gap-3">
                                        <span className="es-display text-xl sm:text-[22px] leading-snug" style={{ color: 'var(--es-ink)' }}>{s.nombre}</span>
                                        <span className="flex-1 border-b border-dotted translate-y-[-4px] hidden sm:block" style={{ borderColor: 'var(--es-line)' }} />
                                        {showPrices && s.precio ? (
                                            <span className="text-base font-medium shrink-0" style={{ color: 'var(--es-ink)' }}>${Number(s.precio).toFixed(Number(s.precio) % 1 ? 2 : 0)}</span>
                                        ) : null}
                                    </span>
                                    {s.descripcion && (
                                        <span className="block text-sm mt-1 line-clamp-2" style={{ color: 'var(--es-muted)' }}>{s.descripcion}</span>
                                    )}
                                    <span className="mt-2 flex items-center gap-4 text-sm">
                                        {s.duracion ? (
                                            <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--es-muted)' }}><Clock size={14} /> {formatDuration(s.duracion)}</span>
                                        ) : null}
                                        <span className="inline-flex items-center gap-1 font-medium group-hover:gap-2 transition-all" style={{ color: accent }}>
                                            Reservar <ArrowRight size={14} />
                                        </span>
                                    </span>
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}

            {filtered.length > 6 && !showAll && (
                <div className="text-center mt-8">
                    <button
                        type="button"
                        onClick={() => setShowAll(true)}
                        className="px-6 py-3 rounded-full border text-sm font-medium"
                        style={{ borderColor: 'var(--es-ink)', color: 'var(--es-ink)' }}
                    >
                        Ver los {filtered.length} servicios
                    </button>
                </div>
            )}
        </div>
    );
}
