"use client";

import React from 'react';
import { SUBSCRIPTION_ADDONS } from '@/core/subscription/plans';
import { Plus, Check, ArrowRight, ArrowLeft } from 'lucide-react';

interface AddonSelectorProps {
  selectedAddons: string[];
  onToggleAddon: (addonId: string) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function AddonSelector({ selectedAddons, onToggleAddon, onNext, onPrev }: AddonSelectorProps) {
  const addonsList = Object.values(SUBSCRIPTION_ADDONS);

  return (
    <div className="space-y-6 text-left">
      <div className="text-center space-y-2 max-w-xl mx-auto">
        <span className="text-[10px] font-black tracking-widest text-cyan-500 uppercase px-3 py-1 bg-cyan-500/10 rounded-full border border-cyan-500/20">
          Paso 8 — Addons & Recursos Extra
        </span>
        <h2 className="text-2xl font-black text-white italic">Complementa tu Plan con Addons</h2>
        <p className="text-xs text-slate-400">Añade más sucursales, usuarios, créditos IA o mensajes de WhatsApp de forma independiente.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {addonsList.map(addon => {
          const isSelected = selectedAddons.includes(addon.id);

          return (
            <div
              key={addon.id}
              onClick={() => onToggleAddon(addon.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                isSelected
                  ? 'bg-slate-900 border-cyan-500 shadow-md ring-1 ring-cyan-500/30'
                  : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 opacity-70'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-xs text-white">{addon.name}</h4>
                  <span className="text-[10px] font-black text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                    +${addon.priceMonthly}/mes
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">{addon.description}</p>
              </div>

              <button
                type="button"
                className={`p-2 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                {isSelected ? <Check size={16} strokeWidth={3} /> : <Plus size={16} />}
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={onPrev}
          className="flex items-center gap-2 bg-slate-900 border border-slate-800 text-slate-400 font-bold text-xs uppercase tracking-widest px-6 py-3.5 rounded-2xl hover:text-white transition"
        >
          <ArrowLeft size={16} />
          Anterior
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-2 bg-emerald-500 text-slate-950 font-black text-xs uppercase tracking-widest px-8 py-3.5 rounded-2xl hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20"
        >
          Continuar
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
