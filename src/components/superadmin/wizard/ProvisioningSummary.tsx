"use client";

import React, { useState } from 'react';
import { SUBSCRIPTION_PLANS, SUBSCRIPTION_ADDONS } from '@/core/subscription/plans';
import { CheckCircle2, ShieldCheck, Layers, Box, Sparkles, Download, ArrowLeft, Loader2, Save } from 'lucide-react';

interface ProvisioningSummaryProps {
  payload: any;
  saveAsTemplate: boolean;
  templateName: string;
  onToggleSaveTemplate: (val: boolean) => void;
  onChangeTemplateName: (val: string) => void;
  onConfirmCreation: () => void;
  onPrev: () => void;
  loading: boolean;
}

export default function ProvisioningSummary({
  payload,
  saveAsTemplate,
  templateName,
  onToggleSaveTemplate,
  onChangeTemplateName,
  onConfirmCreation,
  onPrev,
  loading
}: ProvisioningSummaryProps) {
  const plan = SUBSCRIPTION_PLANS[payload.planId as keyof typeof SUBSCRIPTION_PLANS] || SUBSCRIPTION_PLANS.FREE;
  
  // Calcular precio total
  let basePrice = plan.priceMonthly;
  let addonsPrice = 0;
  for (const addonId of payload.selectedAddons || []) {
    const addon = SUBSCRIPTION_ADDONS[addonId];
    if (addon) addonsPrice += addon.priceMonthly;
  }

  const totalPriceMonthly = basePrice + addonsPrice;
  const totalPriceYearly = Math.round(totalPriceMonthly * 12 * 0.85); // 15% descuento

  const exportManifestJson = () => {
    const manifest = {
      schemaVersion: '3.0.0',
      exportedAt: new Date().toISOString(),
      payload
    };
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `manifest_${payload.generalInfo?.slug || 'citiox_business'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 text-left">
      <div className="text-center space-y-2 max-w-xl mx-auto">
        <span className="text-[10px] font-black tracking-widest text-emerald-500 uppercase px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
          Paso 9 — Resumen de Aprovisionamiento
        </span>
        <h2 className="text-2xl font-black text-white italic">Confirmación de Aprovisionamiento Universal</h2>
        <p className="text-xs text-slate-400">Revisa la configuración declarativa antes de instanciar el negocio en el Runtime.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Columna 1: Negocio & Plan */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Negocio & Plan</span>
            <h3 className="font-black text-lg text-white mt-1">{payload.generalInfo?.nombre}</h3>
            <span className="text-xs text-emerald-400 font-bold">{payload.generalInfo?.slug}.citiox.app</span>
          </div>

          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Blueprint:</span>
              <span className="font-bold text-white uppercase">{payload.blueprintId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Plan Seleccionado:</span>
              <span className="font-black text-emerald-400">{plan.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Admin Email:</span>
              <span className="font-bold text-slate-300 truncate max-w-[140px]">{payload.generalInfo?.adminEmail}</span>
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Inversión Estimada</span>
            <div className="text-2xl font-black text-white">${totalPriceMonthly} <span className="text-xs font-normal text-slate-400">/ mes</span></div>
            <div className="text-[10px] text-emerald-400 font-bold">${totalPriceYearly} / año (ahorra 15%)</div>
          </div>
        </div>

        {/* Columna 2: Canales, Capacidades & Recursos */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Canales & Recursos</span>
            <h4 className="font-bold text-xs text-amber-400 mt-1">{payload.channels?.length || 0} Canales Operativos</h4>
          </div>

          <div className="space-y-1.5 text-xs text-slate-300 max-h-48 overflow-y-auto pr-1">
            <div className="font-bold text-[10px] text-slate-400 uppercase tracking-wider mb-1">Recursos Iniciales:</div>
            {payload.initialResources?.map((res: any, idx: number) => (
              <div key={idx} className="flex justify-between bg-slate-950 p-2 rounded-xl text-[11px]">
                <span className="text-slate-300">{res.name}</span>
                <span className="font-black text-amber-400">x{res.quantity || 1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Columna 3: Módulos & Addons */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Módulos & Addons</span>
            <h4 className="font-bold text-xs text-purple-400 mt-1">{(payload.activeModules?.length || 0) + (payload.selectedAddons?.length || 0)} Complementos</h4>
          </div>

          <div className="space-y-1 text-xs text-slate-300 max-h-48 overflow-y-auto pr-1">
            {payload.activeModules?.map((mod: string) => (
              <div key={mod} className="flex items-center gap-1.5 text-[11px] text-purple-300 bg-purple-500/10 p-1.5 rounded-lg border border-purple-500/20">
                <Sparkles size={12} />
                <span>{mod}</span>
              </div>
            ))}
            {payload.selectedAddons?.map((add: string) => (
              <div key={add} className="flex items-center gap-1.5 text-[11px] text-cyan-300 bg-cyan-500/10 p-1.5 rounded-lg border border-cyan-500/20">
                <Box size={12} />
                <span>{add}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Opción para guardar como Plantilla & Exportar JSON */}
      <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <input
            type="checkbox"
            id="saveTemplateCheck"
            checked={saveAsTemplate}
            onChange={(e) => onToggleSaveTemplate(e.target.checked)}
            className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
          />
          <label htmlFor="saveTemplateCheck" className="text-xs font-bold text-white cursor-pointer">
            ☑ Guardar esta configuración como plantilla reutilizable
          </label>
        </div>

        {saveAsTemplate && (
          <input
            type="text"
            placeholder="Nombre de la plantilla (ej: Franquicia Restaurante)"
            value={templateName}
            onChange={(e) => onChangeTemplateName(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none w-full md:w-64"
          />
        )}

        <button
          type="button"
          onClick={exportManifestJson}
          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0"
        >
          <Download size={14} />
          Exportar Blueprint (JSON)
        </button>
      </div>

      {/* Botones de Acción */}
      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={onPrev}
          className="flex items-center gap-2 bg-slate-900 border border-slate-800 text-slate-400 font-bold text-xs uppercase tracking-widest px-6 py-4 rounded-2xl hover:text-white transition"
        >
          <ArrowLeft size={16} />
          Anterior
        </button>
        <button
          type="button"
          onClick={onConfirmCreation}
          disabled={loading}
          className="flex items-center gap-3 bg-emerald-500 text-slate-950 font-black text-xs uppercase tracking-widest px-10 py-4 rounded-2xl hover:bg-emerald-400 transition shadow-xl shadow-emerald-500/20 disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
          Crear Negocio en 1-Click
        </button>
      </div>
    </div>
  );
}
