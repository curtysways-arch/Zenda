"use client";

import React from 'react';
import { Rocket, Copy, Star, FileJson, ArrowRight } from 'lucide-react';

interface CreationModeSelectorProps {
  selectedMode: 'blueprint' | 'duplicate' | 'template' | 'import';
  onSelectMode: (mode: 'blueprint' | 'duplicate' | 'template' | 'import') => void;
  onNext: () => void;
}

export default function CreationModeSelector({ selectedMode, onSelectMode, onNext }: CreationModeSelectorProps) {
  const modes = [
    {
      id: 'blueprint' as const,
      title: 'Crear desde Blueprint',
      badge: 'Recomendado',
      description: 'Aprovisionamiento limpio paso a paso guiado por modelo de industria.',
      icon: Rocket,
      color: 'emerald'
    },
    {
      id: 'duplicate' as const,
      title: 'Duplicar Negocio Existente',
      badge: 'Franquicias & Sucursales',
      description: 'Clona la configuración, catálogo y canales de un negocio existente en 30 segundos.',
      icon: Copy,
      color: 'blue'
    },
    {
      id: 'template' as const,
      title: 'Usar Plantilla Favorita',
      badge: 'Presets de la Organización',
      description: 'Utiliza una plantilla corporativa guardada anteriormente por tu equipo.',
      icon: Star,
      color: 'amber'
    },
    {
      id: 'import' as const,
      title: 'Importar Blueprint / Manifiesto',
      badge: 'JSON Declarativo',
      description: 'Carga un archivo Business Manifest (.json) exportado previamente.',
      icon: FileJson,
      color: 'purple'
    }
  ];

  return (
    <div className="space-y-6 text-left">
      <div className="text-center space-y-2 max-w-xl mx-auto">
        <span className="text-[10px] font-black tracking-widest text-emerald-500 uppercase px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
          Paso 0 — Modo de Creación
        </span>
        <h2 className="text-2xl font-black text-white italic">¿Cómo deseas crear el nuevo negocio?</h2>
        <p className="text-xs text-slate-400">Selecciona el método de aprovisionamiento universal en Citiox Studio.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {modes.map(mode => {
          const Icon = mode.icon;
          const isSelected = selectedMode === mode.id;

          return (
            <div
              key={mode.id}
              onClick={() => onSelectMode(mode.id)}
              className={`p-6 rounded-3xl border transition-all cursor-pointer space-y-4 relative group ${
                isSelected
                  ? 'bg-slate-900 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xl'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-2xl ${isSelected ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-900 text-slate-400'}`}>
                  <Icon size={24} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-xl">
                  {mode.badge}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-base text-white">{mode.title}</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{mode.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-2 bg-emerald-500 text-slate-950 font-black text-xs uppercase tracking-widest px-8 py-4 rounded-2xl hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20"
        >
          Continuar
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
