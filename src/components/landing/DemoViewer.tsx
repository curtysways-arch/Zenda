'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  X, ArrowRight, ArrowLeft, ExternalLink, Smartphone, Monitor, CheckCircle2, Loader2, ChevronDown, Info, RotateCw,
} from 'lucide-react';
import type { VerticalItem } from './BusinessVerticalsGrid';

type Device = 'phone' | 'desktop';

const PHONE_W = 390;
const PHONE_H = 844;
const BEZEL = 12; // borde del teléfono en px (sin escalar)

/**
 * Vista de ejemplos a pantalla completa.
 * - Computadora: panel con la info a la izquierda y el ejemplo en un celular o en una ventana de navegador.
 * - Celular: el ejemplo ocupa toda la pantalla, con barra superior y botón fijo para crear la app.
 * Se cierra con Esc, con la X o con el botón "atrás" del navegador. ← → cambian de ejemplo.
 */
export default function DemoViewer({
  items,
  current,
  onChange,
  onClose,
}: {
  items: VerticalItem[];
  current: VerticalItem;
  onChange: (v: VerticalItem) => void;
  onClose: () => void;
}) {
  const [device, setDevice] = useState<Device>('phone');
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState({ w: 0, h: 0 });
  // En pantallas chicas el ejemplo ocupa toda la pantalla (sin marco de celular).
  const [isSmall, setIsSmall] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsSmall(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  const idx = items.findIndex((v) => v.id === current.id);
  const accent = current.accentColor;

  const go = useCallback((dir: 1 | -1) => {
    onChange(items[(idx + dir + items.length) % items.length]);
  }, [idx, items, onChange]);

  // Bloquear el scroll de la página detrás y cerrar con Esc / flechas para cambiar.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [onClose, go]);

  useEffect(() => { setLoading(true); setShowPicker(false); }, [current.id, device, reloadKey, isSmall]);

  // Medir el espacio disponible para que el celular quepa completo sin scroll.
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setStage({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const frameW = PHONE_W + BEZEL * 2;
  const frameH = PHONE_H + BEZEL * 2;
  const scale = stage.h ? Math.min(1, (stage.h - 24) / frameH, (stage.w - 24) / frameW) : 0.7;

  const iframe = (cls: string, style?: React.CSSProperties) => (
    <iframe
      key={`${current.demoUrl}-${device}-${reloadKey}`}
      src={current.demoUrl}
      title={`Ejemplo: ${current.demoTitle}`}
      onLoad={() => setLoading(false)}
      className={cls}
      style={style}
    />
  );

  const spinner = loading && (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white">
      <Loader2 className="animate-spin" size={28} style={{ color: accent }} />
      <span className="text-sm font-medium text-slate-500">Cargando {current.demoTitle}…</span>
    </div>
  );

  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col bg-slate-950 text-white" role="dialog" aria-modal="true" aria-label={`Ejemplo de app: ${current.demoTitle}`}>
      {/* ── Barra superior ───────────────────────────────────────── */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-white/10 px-2 sm:h-16 sm:px-4">
        <button type="button" onClick={onClose} className="flex size-10 shrink-0 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/10 hover:text-white" aria-label="Cerrar ejemplos">
          <X size={20} />
        </button>

        {/* Selector de tipo (celular: menú desplegable) */}
        <div className="relative min-w-0 flex-1 lg:hidden">
          <button type="button" onClick={() => setShowPicker((s) => !s)} className="flex max-w-full items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 transition hover:bg-white/10" aria-expanded={showPicker}>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${accent}33`, color: accent }}><Icon size={16} /></span>
            <span className="min-w-0 text-left leading-tight">
              <span className="block truncate text-sm font-semibold">{current.title}</span>
              <span className="block truncate text-xs text-slate-400">{current.demoTitle}</span>
            </span>
            <ChevronDown size={16} className={`shrink-0 text-slate-400 transition ${showPicker ? 'rotate-180' : ''}`} />
          </button>
          {showPicker && (
            <div className="absolute left-0 top-full z-30 mt-2 w-72 overflow-hidden rounded-2xl border border-white/10 bg-slate-900 p-1.5 shadow-2xl">
              {items.map((v) => {
                const VI = v.icon;
                return (
                  <button key={v.id} type="button" onClick={() => onChange(v)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${v.id === current.id ? 'bg-white/10' : 'hover:bg-white/5'}`}>
                    <span className="flex size-8 items-center justify-center rounded-lg" style={{ backgroundColor: `${v.accentColor}33`, color: v.accentColor }}><VI size={16} /></span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{v.title}</span>
                      <span className="block truncate text-xs text-slate-400">{v.demoTitle}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selector de tipo (computadora: pestañas) */}
        <nav className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto lg:flex [scrollbar-width:none]" aria-label="Tipos de negocio">
          {items.map((v) => {
            const VI = v.icon;
            const on = v.id === current.id;
            return (
              <button key={v.id} type="button" onClick={() => onChange(v)} aria-current={on}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition ${on ? 'bg-white text-slate-950' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}>
                <VI size={15} /> {v.title.replace(' y odontología', '')}
              </button>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5">
          <div className="hidden rounded-full bg-white/10 p-1 md:flex" role="radiogroup" aria-label="Ver como">
            {([['phone', Smartphone, 'Celular'], ['desktop', Monitor, 'Computadora']] as const).map(([d, DI, label]) => (
              <button key={d} type="button" role="radio" aria-checked={device === d} onClick={() => setDevice(d)} title={label}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${device === d ? 'bg-white text-slate-950' : 'text-slate-300 hover:text-white'}`}>
                <DI size={15} /> <span className="hidden xl:inline">{label}</span>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setShowInfo((s) => !s)} className="flex size-10 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/10 hover:text-white lg:hidden" aria-label="Qué incluye">
            <Info size={19} />
          </button>
          <a href={current.demoUrl} target="_blank" rel="noopener noreferrer" className="hidden size-10 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/10 hover:text-white sm:flex" title="Abrir en una pestaña nueva" aria-label="Abrir en una pestaña nueva">
            <ExternalLink size={18} />
          </a>
          <Link href={current.createHref} target={current.createTarget} className="hidden items-center gap-1.5 whitespace-nowrap rounded-full bg-[#0066FF] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0052cc] sm:inline-flex">
            {current.ctaText || 'Crear mi app gratis'} <ArrowRight size={15} />
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ── Panel de información (computadora) ───────────────────── */}
        <aside className="hidden w-[360px] shrink-0 flex-col overflow-y-auto border-r border-white/10 p-8 lg:flex xl:w-[400px]">
          <span className="inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider" style={{ backgroundColor: `${accent}26`, color: accent }}>
            <Icon size={14} /> {current.demoTag}
          </span>
          <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-white">{current.demoTitle}</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-300">{current.demoDescription}</p>

          <h3 className="mt-8 text-sm font-semibold text-white">Qué incluye</h3>
          <ul className="mt-3 space-y-3">
            {current.demoFeatures.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-[15px] leading-snug text-slate-300">
                <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-400" /> {f}
              </li>
            ))}
          </ul>

          <div className="mt-auto space-y-3 pt-8">
            <Link href={current.createHref} target={current.createTarget} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0066FF] py-3.5 text-[15px] font-semibold text-white transition hover:bg-[#0052cc]">
              {current.ctaText || `${current.createLabel} gratis`} <ArrowRight size={16} />
            </Link>
            <p className="text-center text-xs text-slate-500">Toca y navega el ejemplo: así lo verían tus clientes.</p>
            <div className="flex items-center justify-between border-t border-white/10 pt-4 text-sm">
              <button type="button" onClick={() => go(-1)} className="inline-flex items-center gap-1.5 text-slate-400 transition hover:text-white">
                <ArrowLeft size={15} /> {items[(idx - 1 + items.length) % items.length].title}
              </button>
              <button type="button" onClick={() => go(1)} className="inline-flex items-center gap-1.5 text-slate-400 transition hover:text-white">
                {items[(idx + 1) % items.length].title} <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </aside>

        {/* ── Escenario del ejemplo ─────────────────────────────────── */}
        <main ref={stageRef} className="relative flex min-w-0 flex-1 items-center justify-center overflow-hidden"
          style={{ background: `radial-gradient(1200px 600px at 50% 40%, ${accent}2e, transparent 60%), #020617` }}>

          {isSmall ? (
            /* Celular de verdad: el ejemplo ocupa toda la pantalla */
            <div className="absolute inset-0">
              {spinner}
              {iframe('h-full w-full border-0 bg-white')}
            </div>
          ) : (
          <div className="flex h-full w-full items-center justify-center">
            {device === 'phone' ? (
              <div style={{ width: frameW * scale, height: frameH * scale }} className="relative shrink-0">
                <div
                  className="absolute left-0 top-0 origin-top-left rounded-[56px] bg-slate-900 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.8)] ring-1 ring-white/15"
                  style={{ width: frameW, height: frameH, padding: BEZEL, transform: `scale(${scale})` }}
                >
                  <div className="relative h-full w-full overflow-hidden rounded-[44px] bg-white">
                    <div className="pointer-events-none absolute left-1/2 top-2.5 z-20 h-[30px] w-[118px] -translate-x-1/2 rounded-full bg-black" aria-hidden />
                    {spinner}
                    {iframe('h-full w-full border-0')}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-[calc(100%-48px)] w-[calc(100%-48px)] max-w-[1400px] flex-col overflow-hidden rounded-2xl bg-slate-800 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.8)] ring-1 ring-white/15">
                <div className="flex h-10 shrink-0 items-center gap-3 px-4">
                  <span className="flex gap-1.5" aria-hidden><i className="size-3 rounded-full bg-[#ff5f57]" /><i className="size-3 rounded-full bg-[#febc2e]" /><i className="size-3 rounded-full bg-[#28c840]" /></span>
                  <span className="mx-auto flex h-7 w-full max-w-md items-center justify-center truncate rounded-lg bg-slate-900/70 px-3 text-xs text-slate-400">citiox.com{current.demoUrl}</span>
                  <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="text-slate-400 hover:text-white" aria-label="Recargar ejemplo"><RotateCw size={14} /></button>
                </div>
                <div className="relative min-h-0 flex-1 bg-white">
                  {spinner}
                  {iframe('h-full w-full border-0')}
                </div>
              </div>
            )}
          </div>
          )}

          {/* Flechas para cambiar de ejemplo (computadora) */}
          <button type="button" onClick={() => go(-1)} aria-label="Ejemplo anterior" className="absolute left-4 top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 md:flex lg:left-6">
            <ArrowLeft size={20} />
          </button>
          <button type="button" onClick={() => go(1)} aria-label="Ejemplo siguiente" className="absolute right-4 top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 md:flex lg:right-6">
            <ArrowRight size={20} />
          </button>
        </main>
      </div>

      {/* ── Botón fijo en celular ─────────────────────────────────────── */}
      <div className="flex shrink-0 gap-2 border-t border-white/10 bg-slate-950 p-3 sm:hidden">
        <Link href={current.createHref} target={current.createTarget} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#0066FF] py-3 text-[15px] font-semibold text-white">
          {current.ctaText || 'Crear mi app como esta'} <ArrowRight size={16} />
        </Link>
      </div>

      {/* ── Hoja "Qué incluye" (celular y tablet) ─────────────────────── */}
      {showInfo && (
        <div className="absolute inset-0 z-40 flex items-end bg-black/60 lg:hidden" onClick={() => setShowInfo(false)}>
          <div className="max-h-[80vh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 text-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-200" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: accent }}>{current.demoTag}</span>
            <h2 className="mt-1 text-2xl font-bold tracking-tight">{current.demoTitle}</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{current.demoDescription}</p>
            <ul className="mt-5 space-y-3">
              {current.demoFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[15px] leading-snug text-slate-700">
                  <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-600" /> {f}
                </li>
              ))}
            </ul>
            <Link href={current.createHref} target={current.createTarget} className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#0066FF] py-3.5 font-semibold text-white">
              {current.ctaText || `${current.createLabel} gratis`} <ArrowRight size={16} />
            </Link>
            <button type="button" onClick={() => setShowInfo(false)} className="mt-2 w-full py-3 text-sm font-medium text-slate-500">Seguir viendo el ejemplo</button>
          </div>
        </div>
      )}
    </div>
  );
}
