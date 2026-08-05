'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Layers, 
  Sliders, 
  Palette, 
  Cog, 
  Bot, 
  Plus, 
  ArrowRight, 
  CheckCircle2, 
  Loader2, 
  ShieldCheck, 
  Zap, 
  Sparkles, 
  Briefcase, 
  Package, 
  Cpu, 
  Wrench,
  Search,
  BookOpen
} from 'lucide-react';

export default function CitioxStudioMainPage() {
  const [blueprints, setBlueprints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeArea, setActiveArea] = useState<'blueprints' | 'definition' | 'experience' | 'operations' | 'intelligence'>('blueprints');

  useEffect(() => {
    fetch('/api/superadmin/tipos-negocio')
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        setBlueprints(data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 space-y-8">
      {/* Header Studio */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900/90 border border-slate-800 p-8 rounded-3xl backdrop-blur-xl">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-2xl">
              <Layers size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">Citiox Studio</h1>
              <p className="text-xs text-slate-400 font-semibold tracking-wide">
                Centro de Gobierno de la Citiox Runtime Platform (Composición 100% Declarativa)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2">
            <ShieldCheck size={16} />
            <span>Núcleo Congelado (v1.0.0)</span>
          </div>
        </div>
      </div>

      {/* 5 Grandes Áreas de Gobernanza */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-slate-900/60 p-2 rounded-2xl border border-slate-800">
        {[
          { id: 'blueprints', label: '📋 Blueprints', desc: 'Composición Maestra' },
          { id: 'definition', label: '🛠️ Definition', desc: 'Módulos & Capabilities' },
          { id: 'experience', label: '🎨 Experience', desc: 'Landings & Admin UI' },
          { id: 'operations', label: '⚙️ Operations', desc: 'Políticas & Conectores' },
          { id: 'intelligence', label: '🤖 Intelligence', desc: 'AI Skills & Asistentes' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveArea(tab.id as any)}
            className={`p-3.5 rounded-xl font-bold text-xs transition-all text-left flex flex-col gap-1 ${activeArea === tab.id ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'}`}
          >
            <span className="font-black text-sm">{tab.label}</span>
            <span className="text-[10px] opacity-80 font-normal">{tab.desc}</span>
          </button>
        ))}
      </div>

      {/* Área Activa */}
      {loading ? (
        <div className="flex items-center justify-center p-24">
          <Loader2 className="animate-spin text-purple-500" size={36} />
        </div>
      ) : (
        <div className="space-y-6">
          {activeArea === 'blueprints' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-black text-white">Catálogo de Business Blueprints ({blueprints.length})</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {blueprints.map((bp) => (
                  <div key={bp.id} className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 hover:border-purple-500/50 transition-all flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase px-3 py-1 bg-purple-950/80 border border-purple-800 text-purple-300 rounded-full">
                          {bp.slug}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">v1.0.0</span>
                      </div>
                      <h3 className="text-lg font-black text-white">{bp.name}</h3>
                      <p className="text-xs text-slate-400 line-clamp-2">{bp.description || 'Blueprint operativo configurado para ejecuciones universales.'}</p>
                    </div>

                    <Link
                      href={`/superadmin/tipos-negocio/${bp.id}`}
                      className="w-full py-2.5 px-4 bg-slate-800 hover:bg-purple-600 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all mt-4"
                    >
                      <span>Diseñar Blueprint</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeArea === 'definition' && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 space-y-6">
              <h2 className="text-xl font-black text-white">🛠️ Gobernanza de Definition (Capacidades y Módulos)</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['BOOKING', 'SERVICE', 'ORDERS', 'DELIVERY', 'INVENTORY', 'ACADEMY', 'MEMBERSHIPS', 'GIFTCARDS'].map((m) => (
                  <div key={m} className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-center gap-3">
                    <Package className="text-purple-400" size={20} />
                    <div>
                      <h4 className="text-xs font-black text-white">{m}</h4>
                      <p className="text-[10px] text-slate-500">Módulo Maestra Transversal</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeArea === 'experience' && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 space-y-6">
              <h2 className="text-xl font-black text-white">🎨 Gobernanza de Experience (Apariencia & Layouts)</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { name: 'ShoeCareLanding', type: 'Public Landing' },
                  { name: 'CanchaPublicLanding', type: 'Sports Landing' },
                  { name: 'ProductsStoreClient', type: 'E-commerce Landing' },
                  { name: 'AdminSidebarLayout', type: 'Backoffice Layout' },
                  { name: 'KDS Kitchen Monitor', type: 'Restaurant Dashboard' },
                  { name: 'Service Kanban Board', type: 'Service Dashboard' }
                ].map((exp) => (
                  <div key={exp.name} className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1">
                    <h4 className="text-xs font-black text-white">{exp.name}</h4>
                    <p className="text-[10px] text-purple-400 font-semibold">{exp.type}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeArea === 'operations' && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 space-y-6">
              <h2 className="text-xl font-black text-white">⚙️ Gobernanza de Operations (Políticas e Integraciones)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-2">
                  <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wide">Políticas Operativas</h4>
                  <p className="text-xs text-slate-300">Cobro anticipado, cancelaciones, franjas de retiro de delivery.</p>
                </div>
                <div className="p-5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-2">
                  <h4 className="text-xs font-black text-purple-400 uppercase tracking-wide">Integraciones</h4>
                  <p className="text-xs text-slate-300">Stripe, MercadoPago, WhatsApp Cloud API, OpenStreetMap.</p>
                </div>
              </div>
            </div>
          )}

          {activeArea === 'intelligence' && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 space-y-6">
              <h2 className="text-xl font-black text-white">🤖 Gobernanza de Intelligence (AI Skills & Asistentes)</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { name: 'WhatsApp Auto-Responder', desc: 'Respuesta automática de estado de órdenes' },
                  { name: 'Recomendador de Servicios', desc: 'Upselling inteligente según historial' },
                  { name: 'Predicción de Demanda', desc: 'Sugerencia de horarios de mayor afluencia' }
                ].map((ai) => (
                  <div key={ai.name} className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1">
                    <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                      <Sparkles size={14} className="text-purple-400" />
                      <span>{ai.name}</span>
                    </h4>
                    <p className="text-[10px] text-slate-400">{ai.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
