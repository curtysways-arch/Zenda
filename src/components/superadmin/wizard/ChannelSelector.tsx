"use client";

import React from 'react';
import { Layers, Utensils, QrCode, UserCheck, Monitor, Truck, ShoppingBag, Calendar, CreditCard, ArrowRight, ArrowLeft } from 'lucide-react';

interface ChannelSelectorProps {
  blueprintId: string;
  selectedChannels: string[];
  onToggleChannel: (channelId: string) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function ChannelSelector({ blueprintId, selectedChannels, onToggleChannel, onNext, onPrev }: ChannelSelectorProps) {
  // Canales sugeridos según Blueprint
  const isRestaurant = blueprintId.toLowerCase().includes('restaurant');
  const isSports = blueprintId.toLowerCase().includes('padel') || blueprintId.toLowerCase().includes('cancha');

  const channelOptions = [
    { id: 'TABLE', name: 'Atención en Mesas / Canchas', desc: 'Atención presencial en mesa o recurso operable', icon: Utensils },
    { id: 'QR', name: 'Menú & Pedidos QR', desc: 'Escaneo de QR para catálogo y autopedido', icon: QrCode },
    { id: 'WAITER', name: 'Consola de Meseros', desc: 'Comanda móvil asignada a meseros o personal', icon: UserCheck },
    { id: 'KITCHEN_KDS', name: 'Pantalla KDS (Cocina / Taller)', desc: 'Tablero de preparación en tiempo real para personal', icon: Monitor },
    { id: 'DELIVERY', name: 'Entregas a Domicilio', desc: 'Logística de despacho e integración de repartidores', icon: Truck },
    { id: 'PICKUP', name: 'Retiro en Local (Takeaway)', desc: 'Pedidos preparados para pasar a retirar', icon: ShoppingBag },
    { id: 'RESERVATIONS', name: 'Reservas & Agendamiento', desc: 'Agendamiento web de turnos, salas o mesas', icon: Calendar },
    { id: 'POS', name: 'Caja & Cobro Rápido (POS)', desc: 'Consola de cobro rápido para caja presencial', icon: CreditCard }
  ];

  return (
    <div className="space-y-6 text-left">
      <div className="text-center space-y-2 max-w-xl mx-auto">
        <span className="text-[10px] font-black tracking-widest text-amber-500 uppercase px-3 py-1 bg-amber-500/10 rounded-full border border-amber-500/20">
          Paso 4 — Canales de Operación
        </span>
        <h2 className="text-2xl font-black text-white italic">¿Qué canales utilizará este negocio?</h2>
        <p className="text-xs text-slate-400">Activa únicamente los canales necesarios. El Runtime generará automáticamente las políticas requeridas.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {channelOptions.map(c => {
          const Icon = c.icon;
          const isActive = selectedChannels.includes(c.id);

          return (
            <div
              key={c.id}
              onClick={() => onToggleChannel(c.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                isActive
                  ? 'bg-slate-900 border-amber-500/80 shadow-md ring-1 ring-amber-500/30'
                  : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 opacity-70'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${isActive ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-900 text-slate-500'}`}>
                  <Icon size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-white">{c.name}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">{c.desc}</p>
                </div>
              </div>

              <input
                type="checkbox"
                checked={isActive}
                onChange={() => {}}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
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
