'use client';
/**
 * PLANTILLAS — las páginas públicas reales de cada tipo de negocio.
 * Miniatura en vivo (la página de verdad, achicada), en qué negocios está en uso,
 * y "Ver demo" abre ESA plantilla a pantalla completa (celular o computadora).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Eye, LayoutTemplate, Layers, Store, Info, Search, Star, Sparkles, RotateCw } from 'lucide-react';
import DemoViewer from '@/components/landing/DemoViewer';
import type { VerticalItem } from '@/components/landing/BusinessVerticalsGrid';
import type { TemplateVariant, VerticalDef } from '@/lib/templateCatalog';

type Preview = { slug: string; nombre: string; isDemo: boolean; usaEsta: boolean };
export type CatalogVariant = TemplateVariant & { enUso: number; vistaPrevia: Preview[] };
export type CatalogVertical = VerticalDef & { negocios: number; demos: number; variants: CatalogVariant[] };

const urlFor = (slug: string, v: TemplateVariant) => `/${slug}${v.diseno ? `?diseno=${encodeURIComponent(v.diseno)}` : ''}`;
const DESKTOP_W = 1280;
const DESKTOP_H = 800;

/** La página real dentro de un iframe achicado. Solo se carga cuando la tarjeta se ve en pantalla. */
function LiveThumb({ src, title, onOpen }: { src: string | null; title: string; onOpen: () => void }) {
  const box = useRef<HTMLButtonElement>(null);
  const [w, setW] = useState(0);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [key, setKey] = useState(0);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); io.disconnect(); } }, { rootMargin: '300px' });
    io.observe(el);
    return () => { ro.disconnect(); io.disconnect(); };
  }, []);
  useEffect(() => { setLoaded(false); }, [src, key]);

  const scale = w ? w / DESKTOP_W : 0.25;
  return (
    <div className="group/thumb relative">
      <button ref={box} type="button" onClick={onOpen} disabled={!src} aria-label={`Ver ${title} en grande`}
        className="relative block w-full overflow-hidden rounded-t-2xl bg-slate-100 text-left disabled:cursor-default" style={{ aspectRatio: `${DESKTOP_W} / ${DESKTOP_H}` }}>
        {src && visible && (
          <iframe key={key} src={src} title={title} tabIndex={-1} loading="lazy" onLoad={() => setLoaded(true)}
            className="pointer-events-none absolute left-0 top-0 origin-top-left border-0 bg-white"
            style={{ width: DESKTOP_W, height: DESKTOP_H, transform: `scale(${scale})` }} />
        )}
        {(!src || !loaded) && (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-slate-400">
            {src ? <span className="size-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-500" /> : <LayoutTemplate size={24} />}
            {src ? 'Cargando vista previa…' : 'Sin negocio para mostrarla'}
          </span>
        )}
        {src && <span className="absolute inset-0 flex items-center justify-center bg-slate-900/0 opacity-0 transition group-hover/thumb:bg-slate-900/35 group-hover/thumb:opacity-100"><span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-sm font-semibold text-slate-900 shadow"><Eye size={15} /> Ver demo</span></span>}
      </button>
      {src && loaded && (
        <button type="button" onClick={() => setKey((k) => k + 1)} className="absolute right-2 top-2 rounded-lg bg-white/90 p-1.5 text-slate-500 opacity-0 shadow-sm transition hover:text-slate-900 group-hover/thumb:opacity-100" aria-label="Recargar vista previa" title="Recargar">
          <RotateCw size={14} />
        </button>
      )}
    </div>
  );
}

export default function TemplateCatalogClient({ verticals, totalNegocios }: { verticals: CatalogVertical[]; totalNegocios: number }) {
  const [filtro, setFiltro] = useState<string>('todos');
  const [q, setQ] = useState('');
  // Negocio elegido para previsualizar cada plantilla (por defecto el primero: un demo si hay).
  const [pick, setPick] = useState<Record<string, string>>({});
  const [viewing, setViewing] = useState<string | null>(null);

  const all = useMemo(() => verticals.flatMap((v) => v.variants.map((t) => ({ t, v }))), [verticals]);
  const totalPlantillas = all.length;
  const previewOf = (t: CatalogVariant) => t.vistaPrevia.find((p) => p.slug === pick[t.id]) || t.vistaPrevia[0] || null;

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return verticals
      .filter((v) => filtro === 'todos' || v.id === filtro)
      .map((v) => ({ ...v, variants: v.variants.filter((t) => !s || `${t.nombre} ${t.descripcion} ${t.componente} ${v.nombre}`.toLowerCase().includes(s)) }))
      .filter((v) => v.variants.length > 0);
  }, [verticals, filtro, q]);

  // Elementos para el visor a pantalla completa (solo plantillas que tienen un negocio para mostrarlas).
  const viewerItems: VerticalItem[] = useMemo(() => all.filter(({ t }) => previewOf(t)).map(({ t, v }) => {
    const p = previewOf(t)!;
    const url = urlFor(p.slug, t);
    return {
      id: t.id, title: t.nombre, subtitle: v.nombre, icon: LayoutTemplate, iconBg: '', accentColor: v.color,
      bullets: t.destacados, createLabel: 'Abrir en pestaña nueva', createHref: url, createTarget: '_blank', ctaText: 'Abrir en pestaña nueva', demoUrl: url,
      demoTitle: t.nombre, demoTag: v.nombre, demoDescription: `${t.descripcion} Vista previa con “${p.nombre}”.`, demoFeatures: t.destacados, image: '',
    };
  }), [all, pick]); // eslint-disable-line react-hooks/exhaustive-deps
  const current = viewerItems.find((i) => i.id === viewing) || null;

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 pb-16">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Plantillas</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Las páginas públicas reales de cada tipo de negocio. Las miniaturas son la página en vivo; “Ver demo” abre esa plantilla exacta.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-slate-600 ring-1 ring-slate-200"><Layers size={15} /> {verticals.length} tipos de negocio</span>
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-slate-600 ring-1 ring-slate-200"><LayoutTemplate size={15} /> {totalPlantillas} plantillas</span>
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-slate-600 ring-1 ring-slate-200"><Store size={15} /> {totalNegocios} negocios</span>
        </div>
      </div>

      {/* Filtro por tipo de negocio */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0" role="tablist" aria-label="Tipo de negocio" style={{ scrollbarWidth: 'none' }}>
          {[{ id: 'todos', nombre: 'Todos', color: '#0f172a', count: totalPlantillas }, ...verticals.map((v) => ({ id: v.id, nombre: v.nombre, color: v.color, count: v.variants.length }))].map((v) => (
            <button key={v.id} role="tab" aria-selected={filtro === v.id} onClick={() => setFiltro(v.id)}
              className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition ${filtro === v.id ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-slate-300'}`}>
              {v.id !== 'todos' && <span className="size-2 rounded-full" style={{ backgroundColor: v.color }} />}
              {v.nombre}
              <span className={filtro === v.id ? 'text-white/60' : 'text-slate-400'}>{v.count}</span>
            </button>
          ))}
        </div>
        <label className="relative lg:ml-auto lg:w-64">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar plantilla" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-slate-400" />
        </label>
      </div>

      {/* Secciones por tipo de negocio */}
      {shown.length === 0 && <p className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500 ring-1 ring-slate-200">Ninguna plantilla coincide con la búsqueda.</p>}
      {shown.map((v) => (
        <section key={v.id} aria-labelledby={`v-${v.id}`} className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2 border-b border-slate-200 pb-2">
            <div>
              <h2 id={`v-${v.id}`} className="flex items-center gap-2 text-lg font-bold text-slate-900"><span className="size-2.5 rounded-full" style={{ backgroundColor: v.color }} /> {v.nombre}</h2>
              <p className="text-sm text-slate-500">{v.descripcion}</p>
            </div>
            <p className="text-sm text-slate-500">{v.negocios} {v.negocios === 1 ? 'negocio' : 'negocios'} · {v.demos} {v.demos === 1 ? 'demo' : 'demos'}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {v.variants.map((t) => {
              const p = previewOf(t);
              const src = p ? urlFor(p.slug, t) : null;
              return (
                <article key={t.id} className="flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80">
                  <LiveThumb src={src} title={t.nombre} onOpen={() => src && setViewing(t.id)} />
                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="flex flex-wrap items-center gap-2 font-semibold text-slate-900">
                          {t.nombre}
                          {t.predeterminada && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800"><Star size={11} fill="currentColor" /> Predeterminada</span>}
                          {t.etiqueta && <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700"><Sparkles size={11} /> {t.etiqueta}</span>}
                        </h3>
                        <p className="mt-1 text-sm leading-snug text-slate-600">{t.descripcion}</p>
                      </div>
                      <span className={`shrink-0 rounded-lg px-2 py-1 text-xs font-semibold ${t.precio ? 'bg-slate-900 text-white' : 'bg-emerald-50 text-emerald-700'}`}>{t.precio ? `$${t.precio}` : 'Incluida'}</span>
                    </div>

                    <ul className="flex flex-wrap gap-1.5">
                      {t.destacados.map((d) => <li key={d} className="rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-600 ring-1 ring-slate-100">{d}</li>)}
                    </ul>

                    <div className="mt-auto space-y-3 border-t border-slate-100 pt-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                        <span>{t.enUso ? <><b className="font-semibold text-slate-800">{t.enUso}</b> {t.enUso === 1 ? 'negocio la usa' : 'negocios la usan'}</> : 'Ningún negocio la usa todavía'}</span>
                        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500" title="Componente que la dibuja">{t.componente}</code>
                      </div>

                      {t.vistaPrevia.length > 1 && (
                        <label className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="shrink-0">Vista previa con</span>
                          <select value={p?.slug || ''} onChange={(e) => setPick((s) => ({ ...s, [t.id]: e.target.value }))}
                            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700">
                            {t.vistaPrevia.map((x) => <option key={x.slug} value={x.slug}>{x.nombre}{x.isDemo ? ' (demo)' : ''}{x.usaEsta ? ' · la usa' : ''}</option>)}
                          </select>
                        </label>
                      )}
                      {t.vistaPrevia.length === 1 && p && <p className="text-xs text-slate-500">Vista previa con <b className="font-medium text-slate-700">{p.nombre}</b>{p.isDemo ? ' (demo)' : ''}</p>}
                      {!p && (
                        <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 p-2 text-xs text-amber-900"><Info size={13} className="mt-0.5 shrink-0" />
                          No hay negocios de este tipo{t.soloPinchos ? ' con módulo de pinchos' : ''}. <Link href="/superadmin/negocios" className="font-semibold underline">Crea un demo</Link> para verla.
                        </p>
                      )}

                      <div className="flex gap-2">
                        <button type="button" disabled={!src} onClick={() => setViewing(t.id)}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40">
                          <Eye size={15} /> Ver demo
                        </button>
                        {src && (
                          <a href={src} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50" aria-label="Abrir en pestaña nueva" title="Abrir en pestaña nueva">
                            <ExternalLink size={15} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}

      <p className="text-center text-xs text-slate-400">
        Los diseños con precio se venden a los negocios en “Mi página → Diseño”. Los negocios demo pueden usarlos gratis.{' '}
        <Link href="/superadmin/plantillas/registro" className="underline hover:text-slate-600">Registro técnico de plantillas</Link>
      </p>

      {current && (
        <DemoViewer items={viewerItems} current={current} onChange={(i) => setViewing(i.id)} onClose={() => setViewing(null)} />
      )}
    </div>
  );
}
