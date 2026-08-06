"use client";

import React from 'react';
import { Box, Award, GraduationCap, MessageSquare, Tag, Image, Sparkles, Star, Package, ArrowRight, ArrowLeft } from 'lucide-react';

interface ModuleSelectorProps {
  activeModules: string[];
  onToggleModule: (moduleId: string) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function ModuleSelector({ activeModules, onToggleModule, onNext, onPrev }: ModuleSelectorProps) {
  const availableModules = [
    { id: 'CLUB_CITIOX', name: 'Club Citiox', desc: 'Programa de fidelización, puntos y niveles de clientes', icon: Award },
    { id: 'ACADEMY', name: 'Academia & Cursos', desc: 'Módulo de venta de clases y capacitación', icon: GraduationCap },
    { id: 'COMMUNICATIONS', name: 'Sistema de Comunicaciones', desc: 'Mensajería masiva por WhatsApp y campañas', icon: MessageSquare },
    { id: 'PROMOTIONS', name: 'Promociones & Cupones', desc: 'Descuentos automáticos y cupones promocionales', icon: Tag },
    { id: 'PORTFOLIO', name: 'Portafolio & Trabajos', desc: 'Galería de proyectos antes y después', icon: Image },
    { id: 'AI_ASSISTANT', name: 'Asistente de IA', desc: 'Respuesta automática de clientes con IA', icon: Sparkles },
    { id: 'REVIEWS', name: 'Reseñas & Encuestas', desc: 'Calificación de satisfacción del cliente', icon: Star },
    { id: 'INVENTORY', name: 'Control de Inventario', desc: 'Gestión de insumos y stock de productos', icon: Package }
  ];

  return (
    <div className="space-y-6 text-left">
      <div className="text-center space-y-2 max-w-xl mx-auto">
        <span className="text-[10px] font-black tracking-widest text-purple-500 uppercase px-3 py-1 bg-purple-500/10 rounded-full border border-purple-500/20">
          Paso 7 — Módulos Opcionales
        </span>
        <h2 className="text-2xl font-black text-white italic">Activar Módulos Opcionales</h2>
        <p className="text-xs text-slate-400">Selecciona los módulos adicionales que enriquecerán la experiencia de tu negocio.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {availableModules.map(m => {
          const Icon = m.icon;
          const isActive = activeModules.includes(m.id);

          return (
            <div
              key={m.id}
              onClick={() => onToggleModule(m.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                isActive
                  ? 'bg-slate-900 border-purple-500 shadow-md ring-1 ring-purple-500/30'
                  : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 opacity-70'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${isActive ? 'bg-purple-500 text-slate-950 font-black' : 'bg-slate-900 text-slate-500'}`}>
                  <Icon size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-white">{m.name}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">{m.desc}</p>
                </div>
              </div>

              <input
                type="checkbox"
                checked={isActive}
                onChange={() => {}}
                className="w-4 h-4 accent-purple-500 rounded cursor-pointer"
              />
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
