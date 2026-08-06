"use client";

import React from 'react';
import { Layers, Plus, Minus, ArrowRight, ArrowLeft } from 'lucide-react';

interface InitialResourcesConfigProps {
  blueprintId: string;
  initialResources: Array<{ name: string; category?: string; capacity?: number; quantity?: number }>;
  onUpdateResourceQty: (index: number, newQty: number) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function InitialResourcesConfig({ blueprintId, initialResources, onUpdateResourceQty, onNext, onPrev }: InitialResourcesConfigProps) {
  return (
    <div className="space-y-6 text-left">
      <div className="text-center space-y-2 max-w-xl mx-auto">
        <span className="text-[10px] font-black tracking-widest text-emerald-500 uppercase px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
          Paso 6 — Recursos Iniciales
        </span>
        <h2 className="text-2xl font-black text-white italic">¿Qué recursos deseas crear inicialmente?</h2>
        <p className="text-xs text-slate-400">El Provisioning Engine instanciará automáticamente estas cantidades en la base de datos.</p>
      </div>

      <div className="space-y-3">
        {initialResources.map((res, idx) => (
          <div key={idx} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                <Layers size={18} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">{res.name}</h4>
                <span className="text-[10px] text-slate-400 font-bold uppercase">{res.category || 'Recurso'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 p-1.5 rounded-xl">
              <button
                type="button"
                onClick={() => onUpdateResourceQty(idx, Math.max(1, (res.quantity || 1) - 1))}
                className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 flex items-center justify-center font-bold"
              >
                <Minus size={14} />
              </button>
              <span className="w-8 text-center font-black text-sm text-emerald-400">{res.quantity || 1}</span>
              <button
                type="button"
                onClick={() => onUpdateResourceQty(idx, (res.quantity || 1) + 1)}
                className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 flex items-center justify-center font-bold"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        ))}
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
