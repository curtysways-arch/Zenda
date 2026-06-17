'use client';

import React, { useState, useEffect } from 'react';
import { Smartphone, Monitor, Globe, Search, ExternalLink, RefreshCw, LayoutTemplate } from 'lucide-react';
import InstallAppButton from '@/components/InstallAppButton';

export default function PWAPreviewPage() {
  const [slug, setSlug] = useState('');
  const [manifest, setManifest] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchManifest = async () => {
    if (!slug) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/pwa/manifest?slug=${slug}`);
      if (!res.ok) throw new Error('Error al cargar el manifest');
      const data = await res.json();
      setManifest(data);
    } catch (err: any) {
      setError(err.message);
      setManifest(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div>
        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic flex items-center gap-3">
          <Smartphone className="text-emerald-500" size={32} />
          PWA Multi-Negocio
        </h2>
        <p className="text-slate-500 font-medium mt-1">
          Previsualiza y prueba cómo se verá la app instalada para cada negocio.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Selector de Negocio */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-xl border border-slate-200 dark:border-white/5 space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest italic mb-3">
                Slug del Negocio
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase())}
                  placeholder="ej: los-alpes"
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                />
                <button
                  onClick={fetchManifest}
                  disabled={loading || !slug}
                  className="absolute right-2 top-2 bottom-2 bg-emerald-600 text-white px-4 rounded-xl hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500 text-xs font-bold italic">
                {error}
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 dark:border-white/5 space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Acciones Rápidas</h4>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setSlug('los-alpes')}
                  className="p-3 bg-slate-100 dark:bg-white/5 rounded-xl text-[10px] font-bold text-center hover:bg-emerald-500/10 hover:text-emerald-500 transition-all"
                >
                  Los Alpes
                </button>
                <button 
                  onClick={() => setSlug('padel-pro')}
                  className="p-3 bg-slate-100 dark:bg-white/5 rounded-xl text-[10px] font-bold text-center hover:bg-emerald-500/10 hover:text-emerald-500 transition-all"
                >
                  Padel Pro
                </button>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/20 transition-all" />
            <div className="relative z-10 space-y-4">
              <h3 className="font-black italic uppercase tracking-tight flex items-center gap-2 text-lg">
                <LayoutTemplate className="text-emerald-400" size={20} />
                Instalación Real
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Al activar la PWA, los usuarios verán el botón de instalación nativo. Puedes probar el componente aquí:
              </p>
              <InstallAppButton variant="full" slug={slug} className="shadow-none border border-white/5" />
            </div>
          </div>
        </div>

        {/* Previsualización del Manifest */}
        <div className="lg:col-span-2">
          {manifest ? (
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-200 dark:border-white/5 overflow-hidden flex flex-col h-full">
              <div className="p-8 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black italic uppercase text-slate-900 dark:text-white">PWA Identity</h3>
                  <p className="text-xs text-slate-500 font-medium tracking-tight">Datos generados desde /api/pwa/manifest?slug={slug}</p>
                </div>
                <a 
                  href={`/api/pwa/manifest?slug=${slug}`} 
                  target="_blank" 
                  className="p-3 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 transition shadow-sm"
                >
                  <ExternalLink size={18} className="text-slate-400" />
                </a>
              </div>

              <div className="flex-1 p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <span className="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] italic mb-1">App Name</span>
                      <p className="font-black text-slate-900 dark:text-white truncate">{manifest.name}</p>
                    </div>
                    <div>
                      <span className="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] italic mb-1">Short Name</span>
                      <p className="font-black text-slate-900 dark:text-white truncate">{manifest.short_name}</p>
                    </div>
                  </div>

                  <div>
                    <span className="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] italic mb-1">Start URL</span>
                    <code className="block bg-slate-900 text-emerald-400 text-[10px] p-3 rounded-xl font-mono truncate">
                      {manifest.start_url}
                    </code>
                  </div>

                  <div>
                    <span className="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] italic mb-1">Theme Color</span>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl shadow-lg border border-white/20" style={{ backgroundColor: manifest.theme_color }}></div>
                      <span className="font-bold text-sm text-slate-700 dark:text-slate-300 uppercase">{manifest.theme_color}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center space-y-6">
                  <span className="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Icon Preview</span>
                  {manifest.icons && manifest.icons.length > 0 ? (
                    <div className="relative group">
                      <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full scale-110 group-hover:scale-125 transition-transform" />
                      <div className="relative bg-white dark:bg-slate-800 p-4 rounded-[2.5rem] shadow-2xl border border-white/10 ring-8 ring-slate-100 dark:ring-white/5 transform group-hover:-rotate-3 transition-transform">
                        <img 
                          src={manifest.icons[0].src} 
                          alt="App Icon" 
                          className="w-32 h-32 object-contain rounded-2xl"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/icons/icon-512x512.png';
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="w-32 h-32 bg-slate-100 dark:bg-white/5 rounded-3xl flex items-center justify-center border-4 border-dashed border-slate-200">
                      <Globe className="text-slate-300" size={32} />
                    </div>
                  )}
                  <p className="text-[10px] font-black text-slate-400 uppercase italic text-center">
                    Cancha SaaS Dynamic Manifest Engine
                  </p>
                </div>
              </div>

              <div className="p-6 bg-slate-50 dark:bg-white/[0.01] border-t border-slate-100 dark:border-white/5 flex items-center justify-center gap-6">
                <div className="flex items-center gap-2 opacity-50">
                  <Monitor size={14} />
                  <span className="text-[9px] font-bold uppercase tracking-widest">Standalone Mode</span>
                </div>
                <div className="w-1.5 h-1.5 bg-slate-300 dark:bg-white/10 rounded-full" />
                <div className="flex items-center gap-2 opacity-50 text-emerald-500">
                  <Globe size={14} />
                  <span className="text-[9px] font-bold uppercase tracking-widest">Multi-Tenant Ready</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-white/5 border-4 border-dashed border-slate-200 dark:border-white/5 rounded-[3rem] h-full flex flex-col items-center justify-center p-12 text-center opacity-50 group hover:opacity-100 transition-opacity">
              <div className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <LayoutTemplate size={40} className="text-slate-300" />
              </div>
              <h3 className="text-xl font-black text-slate-400 uppercase italic">Esperando Negocio</h3>
              <p className="text-sm font-medium text-slate-400 mt-2 max-w-xs">
                Ingresa el slug de un negocio para ver cómo se generará su manifest dinámico.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
