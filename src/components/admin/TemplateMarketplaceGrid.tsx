'use client';

import React, { useState } from 'react';
import { BusinessTemplateManifest } from '@/core/templates/types';
import { 
  Sparkles, 
  Trophy, 
  Footprints, 
  Calendar, 
  CheckCircle2, 
  Zap, 
  Rocket, 
  ArrowRight,
  ShieldCheck,
  Star
} from 'lucide-react';

export interface TemplateMarketplaceGridProps {
  templates: BusinessTemplateManifest[];
  currentTemplateId?: string;
  onTemplateProvisioned?: (templateId: string) => void;
}

export default function TemplateMarketplaceGrid({
  templates,
  currentTemplateId,
  onTemplateProvisioned,
}: TemplateMarketplaceGridProps) {
  const [provisioningId, setProvisioningId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleInstall = async (template: BusinessTemplateManifest) => {
    setProvisioningId(template.id);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/admin/templates/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: template.id }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMessage(`¡Plantilla "${template.name}" instalada con éxito en 30 segundos! 🚀`);
        if (onTemplateProvisioned) {
          onTemplateProvisioned(template.id);
        }
      } else {
        setErrorMessage(data.error || 'Error al aprovisionar la plantilla');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error de conexión');
    } finally {
      setProvisioningId(null);
    }
  };

  const getTemplateIcon = (iconName: string) => {
    switch (iconName) {
      case 'Trophy':
        return <Trophy className="size-6 text-emerald-500" />;
      case 'Footprints':
        return <Footprints className="size-6 text-blue-500" />;
      default:
        return <Sparkles className="size-6 text-pink-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Alertas de Estado */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center gap-3">
          <CheckCircle2 className="size-5 text-emerald-500 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-900 dark:text-rose-200 text-xs font-bold flex items-center gap-3">
          <ShieldCheck className="size-5 text-rose-500 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Grid de Plantillas Comerciales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((tpl) => {
          const isCurrent = currentTemplateId === tpl.id;
          const isInstalling = provisioningId === tpl.id;

          return (
            <div
              key={tpl.id}
              className={`bg-white dark:bg-slate-900 border rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-6 transition-all duration-300 relative overflow-hidden group hover:shadow-2xl ${
                isCurrent
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700'
              }`}
            >
              {/* Badge Superior */}
              {tpl.badge && (
                <div className="absolute top-4 right-4">
                  <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm flex items-center gap-1">
                    <Star className="size-3 text-amber-400 fill-amber-400" />
                    {tpl.badge}
                  </span>
                </div>
              )}

              <div className="space-y-4">
                {/* Icono y Nombre */}
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                    {getTemplateIcon(tpl.icon)}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white leading-snug">
                      {tpl.name}
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400 uppercase">
                      v{tpl.templateVersion}
                    </span>
                  </div>
                </div>

                {/* Descripción Commercial */}
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {tpl.description}
                </p>

                {/* Lista Visual de Lo Que Incluye */}
                <div className="space-y-2 border-t border-slate-100 dark:border-slate-800/80 pt-4">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Incluye de serie:
                  </span>
                  <ul className="space-y-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                    {tpl.settings.bookingSettings && (
                      <li className="flex items-center gap-2">
                        <Calendar className="size-3.5 text-emerald-500" />
                        <span>Reservas de {tpl.settings.bookingSettings.slotGranularityMinutes} min</span>
                      </li>
                    )}
                    {tpl.settings.bookingSettings?.enableNightLightingFee && (
                      <li className="flex items-center gap-2">
                        <Zap className="size-3.5 text-amber-500 fill-amber-500" />
                        <span>Iluminación Nocturna Automática (💡)</span>
                      </li>
                    )}
                    {tpl.settings.serviceSettings && (
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-3.5 text-blue-500" />
                        <span>Diagnóstico con fotos & Tablero Kanban</span>
                      </li>
                    )}
                    <li className="flex items-center gap-2 text-slate-500">
                      <CheckCircle2 className="size-3.5 text-slate-400" />
                      <span>{tpl.initialResources.length} Recurso(s) y {tpl.initialServices.length} Servicio(s) precargados</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Botón de Acción 1-Click */}
              <button
                onClick={() => handleInstall(tpl)}
                disabled={isInstalling || isCurrent}
                className={`w-full py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-300 shadow-lg ${
                  isCurrent
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                    : 'bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white shadow-emerald-500/20'
                }`}
              >
                {isInstalling ? (
                  <>
                    <Rocket className="size-4 animate-bounce" />
                    <span>Instalando en 30s...</span>
                  </>
                ) : isCurrent ? (
                  <>
                    <CheckCircle2 className="size-4 text-emerald-500" />
                    <span>Plantilla Activa</span>
                  </>
                ) : (
                  <>
                    <Rocket className="size-4" />
                    <span>Instalar en 30 Segundos</span>
                    <ArrowRight className="size-4" />
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
