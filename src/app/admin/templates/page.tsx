'use client';

import React, { useState, useEffect } from 'react';
import TemplateMarketplaceGrid from '@/components/admin/TemplateMarketplaceGrid';
import { BusinessTemplateManifest } from '@/core/templates/types';
import { Sparkles, Store, RefreshCw, Rocket } from 'lucide-react';

export default function TemplatesMarketplacePage() {
  const [templates, setTemplates] = useState<BusinessTemplateManifest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch (e) {
      console.error('Error al cargar plantillas:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 rounded-3xl shadow-sm">
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-2xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center font-bold">
            <Store className="size-7" />
          </div>
          <div>
            <span className="text-[10px] font-black text-pink-600 dark:text-pink-400 uppercase tracking-widest bg-pink-500/10 px-2.5 py-0.5 rounded-full">
              Citiox Marketplace 1-Click
            </span>
            <h1 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white italic tracking-tight mt-1">
              Marketplace de Templates Comerciales
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Selecciona e instala la plantilla preconfigurada para tu industria en 30 segundos.
            </p>
          </div>
        </div>

        <button
          onClick={fetchTemplates}
          className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all shadow-sm"
          title="Recargar Marketplace"
        >
          <RefreshCw className={`size-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tarjeta de Garantía SaaS */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Rocket className="size-6 text-emerald-400 flex-shrink-0" />
          <p className="text-xs font-semibold leading-relaxed">
            Al instalar un Template, Citiox aprovisiona automáticamente tu Business Module, tus Business Capabilities, tu Sidebar personalizada y tus servicios iniciales sin alterar tus datos existentes.
          </p>
        </div>
      </div>

      {/* Grid de Plantillas */}
      {loading ? (
        <div className="p-12 text-center text-xs font-bold text-slate-400">
          Cargando Marketplace de Templates...
        </div>
      ) : (
        <TemplateMarketplaceGrid templates={templates} />
      )}
    </div>
  );
}
