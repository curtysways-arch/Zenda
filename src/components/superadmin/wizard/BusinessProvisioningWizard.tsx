"use client";

import React, { useState } from 'react';
import CreationModeSelector from './CreationModeSelector';
import ChannelSelector from './ChannelSelector';
import BlueprintCapabilities from './BlueprintCapabilities';
import InitialResourcesConfig from './InitialResourcesConfig';
import ModuleSelector from './ModuleSelector';
import AddonSelector from './AddonSelector';
import ProvisioningSummary from './ProvisioningSummary';
import { TEMPLATE_REGISTRY } from '@/core/templates/templatesRegistry';
import { SUBSCRIPTION_PLANS } from '@/core/subscription/plans';
import { PlanId } from '@/core/subscription/types';
import { Rocket, ShieldCheck, ArrowRight, ArrowLeft, Loader2, CheckCircle2, Copy, Sparkles, Building2, Mail, Lock, Phone, MapPin, Clock, Globe } from 'lucide-react';

interface BusinessProvisioningWizardProps {
  onClose: () => void;
  onSuccess: (negocioInfo: any) => void;
}

export default function BusinessProvisioningWizard({ onClose, onSuccess }: BusinessProvisioningWizardProps) {
  const [step, setStep] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Estado unificado del Wizard
  const [creationMode, setCreationMode] = useState<'blueprint' | 'duplicate' | 'template' | 'import'>('blueprint');
  const [blueprintId, setBlueprintId] = useState<string>('RESTAURANT_STANDARD');
  const [planId, setPlanId] = useState<PlanId>('GROWTH');
  
  // Datos Generales
  const [generalInfo, setGeneralInfo] = useState({
    nombre: '',
    slug: '',
    whatsapp: '',
    emailContacto: '',
    direccion: '',
    ciudad: '',
    logoUrl: '',
    colorPrimario: '#ea580c',
    colorSecundario: '#7c2d12',
    adminEmail: '',
    adminPassword: '',
    adminNombre: '',
    crearDemo: false
  });

  // Canales, Capacidades, Recursos Iniciales, Módulos y Addons
  const [channels, setChannels] = useState<string[]>(['TABLE', 'QR', 'WAITER', 'KITCHEN_KDS', 'DELIVERY', 'PICKUP', 'POS']);
  const [activeCapabilities, setActiveCapabilities] = useState<Record<string, boolean>>({
    orders: true, products: true, categories: true, tables: true, waiters: true, kitchen: true, delivery: true, pickup: true, qr_ordering: true
  });
  const [initialResources, setInitialResources] = useState<Array<{ name: string; category?: string; capacity?: number; quantity?: number }>>([
    { name: 'Mesa Estándar', category: 'TABLE', capacity: 4, quantity: 10 },
    { name: 'Mesa Terraza', category: 'TABLE', capacity: 6, quantity: 4 },
    { name: 'Estación Cocina KDS', category: 'KITCHEN', quantity: 2 },
    { name: 'Caja POS', category: 'POS', quantity: 1 }
  ]);
  const [activeModules, setActiveModules] = useState<string[]>(['PROMOTIONS', 'COMMUNICATIONS', 'AI_ASSISTANT', 'INVENTORY']);
  const [selectedAddons, setSelectedAddons] = useState<string[]>(['extra_transactions']);

  // Plantilla reutilizable
  const [saveAsTemplate, setSaveAsTemplate] = useState<boolean>(false);
  const [templateName, setTemplateName] = useState<string>('');

  // Handlers para selección
  const handleSelectBlueprint = (bId: string) => {
    setBlueprintId(bId);
    const manifest = TEMPLATE_REGISTRY[bId];
    if (manifest) {
      if (manifest.suggestedColors) {
        setGeneralInfo(prev => ({
          ...prev,
          colorPrimario: manifest.suggestedColors?.primaryColor || prev.colorPrimario,
          colorSecundario: manifest.suggestedColors?.secondaryColor || prev.colorSecundario
        }));
      }
      if (manifest.capabilities) {
        setActiveCapabilities(manifest.capabilities as any);
      }
    }
  };

  const handleToggleChannel = (channelId: string) => {
    setChannels(prev => 
      prev.includes(channelId) ? prev.filter(c => c !== channelId) : [...prev, channelId]
    );
  };

  const handleUpdateResourceQty = (index: number, newQty: number) => {
    setInitialResources(prev => {
      const next = [...prev];
      if (next[index]) next[index].quantity = newQty;
      return next;
    });
  };

  const handleToggleModule = (moduleId: string) => {
    setActiveModules(prev =>
      prev.includes(moduleId) ? prev.filter(m => m !== moduleId) : [...prev, moduleId]
    );
  };

  const handleToggleAddon = (addonId: string) => {
    setSelectedAddons(prev =>
      prev.includes(addonId) ? prev.filter(a => a !== addonId) : [...prev, addonId]
    );
  };

  // Creación Backend
  const handleConfirmCreation = async () => {
    try {
      setLoading(true);
      setError(null);

      const payload = {
        mode: creationMode,
        blueprintId,
        planId,
        generalInfo,
        channels,
        activeCapabilities,
        initialResources,
        activeModules,
        selectedAddons,
        saveAsTemplate,
        templateName
      };

      const res = await fetch('/api/superadmin/negocios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Error al aprovisionar el negocio');
      }

      onSuccess(data);
    } catch (err: any) {
      setError(err.message || 'Error en el aprovisionamiento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-[3rem] p-6 md:p-10 space-y-8 relative overflow-hidden shadow-2xl text-white font-sans">
      {/* Indicador de Pasos del 0 al 9 */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 overflow-x-auto gap-2">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((s) => (
          <div
            key={s}
            onClick={() => s <= step && setStep(s)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black cursor-pointer shrink-0 transition ${
              s === step
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : s < step
                ? 'bg-slate-800 text-emerald-400'
                : 'bg-slate-950 text-slate-600'
            }`}
          >
            <span>P{s}</span>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-2xl text-xs font-bold text-rose-400">
          ⚠️ {error}
        </div>
      )}

      {/* RENDER DE PASOS */}

      {/* PASO 0: Modo de Creación */}
      {step === 0 && (
        <CreationModeSelector
          selectedMode={creationMode}
          onSelectMode={setCreationMode}
          onNext={() => setStep(1)}
        />
      )}

      {/* PASO 1: Elegir Blueprint */}
      {step === 1 && (
        <div className="space-y-6 text-left">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <span className="text-[10px] font-black tracking-widest text-emerald-500 uppercase px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
              Paso 1 — Elegir Blueprint
            </span>
            <h2 className="text-2xl font-black text-white italic">Selecciona el Blueprint de Industria</h2>
            <p className="text-xs text-slate-400">Cada Blueprint define las capacidades nativas, perfiles de experiencia y modelos iniciales.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.values(TEMPLATE_REGISTRY).map(t => {
              const isSelected = blueprintId === t.id || blueprintId === t.module;

              return (
                <div
                  key={t.id}
                  onClick={() => handleSelectBlueprint(t.id)}
                  className={`p-6 rounded-3xl border transition-all cursor-pointer space-y-3 ${
                    isSelected
                      ? 'bg-slate-900 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xl'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base text-white">{t.name}</h3>
                    {t.badge && (
                      <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                        {t.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{t.description}</p>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="flex items-center gap-2 bg-slate-900 border border-slate-800 text-slate-400 font-bold text-xs uppercase tracking-widest px-6 py-3.5 rounded-2xl hover:text-white"
            >
              <ArrowLeft size={16} /> Anterior
            </button>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex items-center gap-2 bg-emerald-500 text-slate-950 font-black text-xs uppercase tracking-widest px-8 py-3.5 rounded-2xl hover:bg-emerald-400"
            >
              Continuar <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* PASO 2: Elegir Plan */}
      {step === 2 && (
        <div className="space-y-6 text-left">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <span className="text-[10px] font-black tracking-widest text-emerald-500 uppercase px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
              Paso 2 — Elegir Plan
            </span>
            <h2 className="text-2xl font-black text-white italic">Nivel de Suscripción (Subscription Engine)</h2>
            <p className="text-xs text-slate-400">Los planes gobiernan cuotas de uso y niveles de acceso (FeatureAccess) de forma 100% universal.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.values(SUBSCRIPTION_PLANS).map(p => {
              const isSelected = planId === p.id;

              return (
                <div
                  key={p.id}
                  onClick={() => setPlanId(p.id)}
                  className={`p-5 rounded-3xl border transition-all cursor-pointer space-y-3 ${
                    isSelected
                      ? 'bg-slate-900 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xl'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-white">{p.name}</h3>
                    <span className="text-xs font-black text-emerald-400">${p.priceMonthly}/mes</span>
                  </div>
                  <p className="text-[11px] text-slate-400">{p.description}</p>
                  <div className="text-[10px] text-slate-300 font-bold space-y-1 border-t border-slate-800/80 pt-2">
                    <div>• Transacciones: <span className="text-emerald-400">{p.limits.transactions >= 999999 ? 'Ilimitadas' : `${p.limits.transactions}/mes`}</span></div>
                    <div>• Sucursales: <span className="text-emerald-400">{p.limits.branches}</span></div>
                    <div>• Usuarios Admin: <span className="text-emerald-400">{p.limits.users}</span></div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-2 bg-slate-900 border border-slate-800 text-slate-400 font-bold text-xs uppercase tracking-widest px-6 py-3.5 rounded-2xl hover:text-white"
            >
              <ArrowLeft size={16} /> Anterior
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex items-center gap-2 bg-emerald-500 text-slate-950 font-black text-xs uppercase tracking-widest px-8 py-3.5 rounded-2xl hover:bg-emerald-400"
            >
              Continuar <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* PASO 3: Información del Negocio */}
      {step === 3 && (
        <div className="space-y-6 text-left">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <span className="text-[10px] font-black tracking-widest text-emerald-500 uppercase px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
              Paso 3 — Información General
            </span>
            <h2 className="text-2xl font-black text-white italic">Datos Básicos y Administrador</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase">Nombre del Negocio</label>
              <input
                type="text"
                placeholder="Ej: Resto Grill Central"
                value={generalInfo.nombre}
                onChange={(e) => {
                  const nombre = e.target.value;
                  const slug = nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                  setGeneralInfo(prev => ({ ...prev, nombre, slug }));
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase">Slug de Dominio</label>
              <input
                type="text"
                placeholder="resto-grill-central"
                value={generalInfo.slug}
                onChange={(e) => setGeneralInfo(prev => ({ ...prev, slug: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase">Email Administrador</label>
              <input
                type="email"
                placeholder="admin@resto.com"
                value={generalInfo.adminEmail}
                onChange={(e) => setGeneralInfo(prev => ({ ...prev, adminEmail: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase">Contraseña Administrador</label>
              <input
                type="password"
                placeholder="••••••••"
                value={generalInfo.adminPassword}
                onChange={(e) => setGeneralInfo(prev => ({ ...prev, adminPassword: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase">WhatsApp de Atención</label>
              <input
                type="text"
                placeholder="+593959997521"
                value={generalInfo.whatsapp}
                onChange={(e) => setGeneralInfo(prev => ({ ...prev, whatsapp: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase">Ciudad / Ubicación</label>
              <input
                type="text"
                placeholder="Guayaquil"
                value={generalInfo.ciudad}
                onChange={(e) => setGeneralInfo(prev => ({ ...prev, ciudad: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex items-center gap-2 bg-slate-900 border border-slate-800 text-slate-400 font-bold text-xs uppercase tracking-widest px-6 py-3.5 rounded-2xl hover:text-white"
            >
              <ArrowLeft size={16} /> Anterior
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="flex items-center gap-2 bg-emerald-500 text-slate-950 font-black text-xs uppercase tracking-widest px-8 py-3.5 rounded-2xl hover:bg-emerald-400"
            >
              Continuar <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* PASO 4: Canales de Operación */}
      {step === 4 && (
        <ChannelSelector
          blueprintId={blueprintId}
          selectedChannels={channels}
          onToggleChannel={handleToggleChannel}
          onNext={() => setStep(5)}
          onPrev={() => setStep(3)}
        />
      )}

      {/* PASO 5: Capacidades del Blueprint */}
      {step === 5 && (
        <BlueprintCapabilities
          blueprintId={blueprintId}
          capabilities={activeCapabilities}
          onNext={() => setStep(6)}
          onPrev={() => setStep(4)}
        />
      )}

      {/* PASO 6: Recursos Iniciales */}
      {step === 6 && (
        <InitialResourcesConfig
          blueprintId={blueprintId}
          initialResources={initialResources}
          onUpdateResourceQty={handleUpdateResourceQty}
          onNext={() => setStep(7)}
          onPrev={() => setStep(5)}
        />
      )}

      {/* PASO 7: Módulos Opcionales */}
      {step === 7 && (
        <ModuleSelector
          activeModules={activeModules}
          onToggleModule={handleToggleModule}
          onNext={() => setStep(8)}
          onPrev={() => setStep(6)}
        />
      )}

      {/* PASO 8: Addons */}
      {step === 8 && (
        <AddonSelector
          selectedAddons={selectedAddons}
          onToggleAddon={handleToggleAddon}
          onNext={() => setStep(9)}
          onPrev={() => setStep(7)}
        />
      )}

      {/* PASO 9: Resumen & Creación */}
      {step === 9 && (
        <ProvisioningSummary
          payload={{
            mode: creationMode,
            blueprintId,
            planId,
            generalInfo,
            channels,
            activeCapabilities,
            initialResources,
            activeModules,
            selectedAddons
          }}
          saveAsTemplate={saveAsTemplate}
          templateName={templateName}
          onToggleSaveTemplate={setSaveAsTemplate}
          onChangeTemplateName={setTemplateName}
          onConfirmCreation={handleConfirmCreation}
          onPrev={() => setStep(8)}
          loading={loading}
        />
      )}
    </div>
  );
}
