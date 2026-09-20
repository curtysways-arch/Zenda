'use client';

import React, { useState } from 'react';
import { ExternalLink, Shirt, Dumbbell, UtensilsCrossed, ShoppingBag, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';

const ToothIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M7 3C4.24 3 2 5.24 2 8c0 3.5 2 6 3 9.5C6 21 8 21 9 18c.5-1.5 1-3 3-3s2.5 1.5 3 3c1 3 3 3 4-0.5 1-3.5 3-6 3-9.5 0-2.76-2.24-5-5-5-1.5 0-2.8.7-3.8 1.8-.2.2-.4.4-.6.6a1 1 0 0 1-1.2 0c-.2-.2-.4-.4-.6-.6C10.8 3.7 9.5 3 7 3z" />
  </svg>
);

export interface DemoItem {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  url: string;
  title: string;
  icon: any;
}

export const HERO_DEMOS: DemoItem[] = [
  {
    id: 'lavanderia',
    name: 'Lavandería',
    badge: 'Lavandería & Calzado',
    badgeColor: 'bg-cyan-600',
    url: '/lavado',
    title: 'LavaYa Demo',
    icon: Shirt
  },
  {
    id: 'dentista',
    name: 'Dentista',
    badge: 'Clínica Dental',
    badgeColor: 'bg-sky-600',
    url: '/dental-chip',
    title: 'Dental Chip Demo',
    icon: ToothIcon
  },
  {
    id: 'gimnasio',
    name: 'Gimnasio',
    badge: 'Gimnasio & Fitness',
    badgeColor: 'bg-blue-600',
    url: '/vortex-fitness',
    title: 'Vortex Fitness Demo',
    icon: Dumbbell
  },
  {
    id: 'restaurante',
    name: 'Restaurante',
    badge: 'Restaurante',
    badgeColor: 'bg-orange-600',
    url: '/parrilla-citiox-demo',
    title: 'La Parrilla Demo',
    icon: UtensilsCrossed
  },
  {
    id: 'tienda',
    name: 'Tienda',
    badge: 'Tienda & Retail',
    badgeColor: 'bg-purple-600',
    url: '/tienda',
    title: 'Citiox Store Demo',
    icon: ShoppingBag
  }
];

export default function HeroMobileDemoViewer() {
  // Inicializa por defecto en 'lavanderia' según requerimiento
  const [activeId, setActiveId] = useState<string>('lavanderia');

  const currentIndex = HERO_DEMOS.findIndex(d => d.id === activeId);
  const activeDemo = HERO_DEMOS[currentIndex] || HERO_DEMOS[0];

  const handlePrev = () => {
    const nextIdx = (currentIndex - 1 + HERO_DEMOS.length) % HERO_DEMOS.length;
    setActiveId(HERO_DEMOS[nextIdx].id);
  };

  const handleNext = () => {
    const nextIdx = (currentIndex + 1) % HERO_DEMOS.length;
    setActiveId(HERO_DEMOS[nextIdx].id);
  };

  return (
    <div className="w-full flex flex-col items-center pt-2 pb-6">
      {/* ── 1. SELECTOR DE TABS / PILLS HORIZONTALES ── */}
      <div className="w-full max-w-[340px] mb-4">
        <div className="flex items-center justify-start gap-1.5 overflow-x-auto pb-2 px-1 scrollbar-none snap-x">
          {HERO_DEMOS.map((demo) => {
            const Icon = demo.icon;
            const isSelected = demo.id === activeId;
            return (
              <button
                key={demo.id}
                type="button"
                onClick={() => setActiveId(demo.id)}
                className={`snap-center shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#0066FF] text-white shadow-md shadow-blue-500/25 scale-105'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{demo.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 2. TELÉFONO PROTAGONISTA CENTRADO (SIN CORTES NI DESBORDAMIENTOS) ── */}
      <div className="relative flex items-center justify-center">
        {/* Botón Flecha Izquierda */}
        <button
          type="button"
          onClick={handlePrev}
          aria-label="Demo anterior"
          className="absolute -left-3.5 z-30 size-8 rounded-full bg-white/90 backdrop-blur-md shadow-lg border border-slate-200 text-slate-700 flex items-center justify-center active:scale-95 transition-all"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Mockup Smartphone Móvil */}
        <div className="w-[260px] xs:w-[280px] h-[520px] xs:h-[550px] bg-white rounded-[2.8rem] p-2 shadow-2xl shadow-blue-500/15 border-[6px] border-slate-950 relative overflow-hidden shrink-0">
          
          {/* Isla Dinámica & Botón Pantalla Completa */}
          <div className="relative flex items-center justify-between px-2 mb-1.5 pt-0.5">
            <div className="w-20 h-3.5 bg-slate-950 rounded-full mx-auto flex items-center justify-center">
              <div className="size-1.5 rounded-full bg-slate-800 ml-auto mr-1.5" />
            </div>
            <a
              href={activeDemo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute right-1 top-0 size-6 rounded-full bg-slate-950 text-white flex items-center justify-center text-[9px] hover:bg-[#0066FF] active:scale-90 transition-all shadow-xs"
              title="Abrir app en pantalla completa"
            >
              <ExternalLink size={12} />
            </a>
          </div>

          {/* Pantalla con Iframe Dinámico */}
          <div className="h-[calc(100%-28px)] bg-slate-950 rounded-[2.1rem] overflow-hidden relative border border-slate-900 shadow-inner">
            {/* Badge flotante de vertical */}
            <div className={`absolute top-1.5 left-2.5 z-20 pointer-events-none flex items-center gap-1 ${activeDemo.badgeColor} text-white px-2 py-0.5 rounded-full text-[8px] font-black shadow-md backdrop-blur-xs`}>
              <span className="size-1.5 rounded-full bg-emerald-300 animate-pulse" />
              <span>{activeDemo.badge}</span>
            </div>

            <iframe
              key={activeDemo.id}
              src={activeDemo.url}
              title={activeDemo.title}
              className="w-[375px] h-[780px] origin-top-left scale-[0.66] border-0 select-none pointer-events-auto"
              loading="eager"
            />
          </div>
        </div>

        {/* Botón Flecha Derecha */}
        <button
          type="button"
          onClick={handleNext}
          aria-label="Siguiente demo"
          className="absolute -right-3.5 z-30 size-8 rounded-full bg-white/90 backdrop-blur-md shadow-lg border border-slate-200 text-slate-700 flex items-center justify-center active:scale-95 transition-all"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* ── 3. ENLACE DIRECTO INFERIOR ── */}
      <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-slate-500">
        <span>Probando app:</span>
        <a
          href={activeDemo.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#0066FF] hover:underline font-extrabold flex items-center gap-1"
        >
          <span>{activeDemo.name}</span>
          <ExternalLink size={11} />
        </a>
      </div>
    </div>
  );
}
