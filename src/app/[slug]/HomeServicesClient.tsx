'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock, Heart, ChevronRight, CalendarCheck } from 'lucide-react';
import { getServicePrimaryImage } from '@/lib/serviceImageHelper';

interface HomeServicesClientProps {
    filteredCanchas: any[];
    slug: string;
    primaryColor: string;
    textColor: string;
    tipoNegocio?: string;
    showPrices?: boolean;
}

/**
 * Servicios de la landing clásica: carrusel en celular, cuadrícula en computadora.
 * Cada tarjeta lleva al detalle del servicio, donde se reserva.
 */
export default function HomeServicesClient({
    filteredCanchas,
    slug,
    primaryColor,
    tipoNegocio,
    showPrices = true,
}: HomeServicesClientProps) {
    const [favorites, setFavorites] = useState<string[]>([]);

    useEffect(() => {
        try {
            const stored = localStorage.getItem(`fav_services_${slug}`);
            if (stored) setFavorites(JSON.parse(stored));
        } catch { /* sin almacenamiento */ }
    }, [slug]);

    const toggleFavorite = (serviceId: string, event: React.MouseEvent) => {
        event.stopPropagation();
        event.preventDefault();
        const updated = favorites.includes(serviceId) ? favorites.filter((id) => id !== serviceId) : [...favorites, serviceId];
        setFavorites(updated);
        try { localStorage.setItem(`fav_services_${slug}`, JSON.stringify(updated)); } catch { /* sin almacenamiento */ }
    };

    // Texto legible sobre el color de la marca.
    const ink = (() => {
        if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(primaryColor)) return '#ffffff';
        const h = primaryColor.slice(1);
        const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
        const [r, g, b] = [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
        return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.179 ? '#1e1b2e' : '#ffffff';
    })();
    const list = filteredCanchas.slice(0, 8);
    const precios = filteredCanchas.map((s: any) => Number(s.precio) || 0).filter((n: number) => n > 0);
    const desde = precios.length ? Math.min(...precios) : 0;
    const money = (n: any) => `$${(Number(n) || 0).toFixed(Number(n) % 1 ? 2 : 0)}`;

    return (
        <div id="servicios">
            <style>{`
                .hs-row{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:4px;scrollbar-width:none}
                .hs-row::-webkit-scrollbar{display:none}
                .hs-row > *{scroll-snap-align:start;flex-shrink:0;width:70%}
                @media (min-width:640px){.hs-row > *{width:46%}}
                @media (min-width:768px){.hs-row{gap:16px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));overflow:visible}.hs-row > *{width:auto}}
            `}</style>

            <div className="mb-3.5 flex flex-wrap items-end justify-between gap-2 md:mb-7 md:gap-3">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] md:text-xs" style={{ color: primaryColor }}>
                        {showPrices && desde > 0 ? `Servicios desde ${money(desde)}` : 'Servicios'}
                    </p>
                    <h2 className="mt-1 text-[22px] font-bold leading-tight tracking-tight text-slate-900 md:mt-1.5 md:text-[2rem]">Elige tu servicio</h2>
                </div>
                {filteredCanchas.length > 0 && (
                    <Link href={`/${slug}/servicios`} className="inline-flex items-center gap-1 text-sm font-semibold" style={{ color: primaryColor }}>
                        Ver los {filteredCanchas.length} <ChevronRight size={16} />
                    </Link>
                )}
            </div>

            {list.length === 0 ? (
                <p className="rounded-3xl bg-white p-6 text-center text-sm text-slate-500 ring-1 ring-slate-900/5">Pronto publicaremos nuestros servicios.</p>
            ) : (
                <div className="hs-row">
                    {list.map((service: any) => {
                        const isFavorite = favorites.includes(service.id);
                        const duracion = service.duracion || service.duracionMinutos;
                        const precio = Number(service.precio) || 0;
                        return (
                            <div key={service.id}
                                className="group relative flex flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-slate-900/5 transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-20px_rgba(15,23,42,0.35)]">
                                <Link href={`/${slug}/servicio/${service.id}`} className="absolute inset-0 z-10 rounded-3xl" aria-label={`Ver y reservar ${service.nombre}`} />
                                <span className="relative block aspect-[4/3] overflow-hidden bg-slate-100">
                                    <img src={getServicePrimaryImage(service, 'medium', tipoNegocio)} alt={service.nombre} loading="lazy"
                                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                                    <button type="button" onClick={(e) => toggleFavorite(service.id, e)} aria-pressed={isFavorite}
                                        aria-label={isFavorite ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                                        className="absolute right-3 top-3 z-20 flex size-9 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm transition active:scale-95"
                                        style={{ color: isFavorite ? primaryColor : '#94a3b8' }}>
                                        <Heart size={16} fill={isFavorite ? primaryColor : 'none'} strokeWidth={2.4} />
                                    </button>
                                </span>
                                <span className="flex flex-1 flex-col p-3.5 md:p-4">
                                    <span className="line-clamp-2 text-[16px] font-bold leading-snug text-slate-900">{service.nombre}</span>
                                    {duracion ? (
                                        <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-slate-500"><Clock size={12} /> {duracion} min</span>
                                    ) : null}
                                    <span className="mt-auto flex items-center justify-between gap-2 pt-3 md:pt-4">
                                        {showPrices ? (
                                            <span className="text-xl font-bold tabular-nums text-slate-900">{precio > 0 ? money(precio) : 'Consultar'}</span>
                                        ) : <span />}
                                        <span className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition group-hover:brightness-110" style={{ backgroundColor: primaryColor, color: ink }}>
                                            <CalendarCheck size={14} /> Reservar
                                        </span>
                                    </span>
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
