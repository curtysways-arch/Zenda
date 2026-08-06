"use client";

import React from 'react';
import { ShieldCheck, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';

interface BlueprintCapabilitiesProps {
  blueprintId: string;
  capabilities: Record<string, boolean>;
  onNext: () => void;
  onPrev: () => void;
}

export default function BlueprintCapabilities({ blueprintId, capabilities, onNext, onPrev }: BlueprintCapabilitiesProps) {
  const capList = Object.entries(capabilities).filter(([_, active]) => active);

  return (
    <div className="space-y-6 text-left">
      <div className="text-center space-y-2 max-w-xl mx-auto">
        <span className="text-[10px] font-black tracking-widest text-emerald-500 uppercase px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
          Paso 5 — Capacidades del Blueprint
        </span>
        <h2 className="text-2xl font-black text-white italic">Capacidades Declaradas del Blueprint</h2>
        <p className="text-xs text-slate-400">Estas capacidades se habilitan nativamente según el modelo de industria seleccionado ({blueprintId}).</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold text-sm text-white">Capabilities Activas ({capList.length})</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {capList.map(([key]) => (
            <div key={key} className="bg-slate-950 border border-slate-800/80 px-3.5 py-2.5 rounded-xl flex items-center gap-2 text-xs font-bold text-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="capitalize">{key.replace(/_/g, ' ')}</span>
            </div>
          ))}
        </div>
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
