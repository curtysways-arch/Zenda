"use client";

import React from 'react';
import { Utensils, Truck, ShoppingBag, User, Check, X } from 'lucide-react';

interface KitchenCardsProps {
  producto: any;
  onEdit?: (prod: any) => void;
}

export default function KitchenCards({ producto, onEdit }: KitchenCardsProps) {
  const extra = typeof producto.extraInfo === 'string' ? JSON.parse(producto.extraInfo || '{}') : (producto.extraInfo || {});

  const channels = [
    { key: 'availableInTable', label: 'Mesa', icon: Utensils, active: extra.availableInTable !== false },
    { key: 'availableInDelivery', label: 'Delivery', icon: Truck, active: extra.availableInDelivery !== false },
    { key: 'availableInPickup', label: 'Pickup', icon: ShoppingBag, active: extra.availableInPickup !== false },
    { key: 'availableInWaiter', label: 'Mesero', icon: User, active: extra.availableInWaiter !== false },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 space-y-3 shadow-lg transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {producto.imagenUrl ? (
            <img src={producto.imagenUrl} alt={producto.nombre} className="w-12 h-12 rounded-xl object-cover border border-slate-800" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Utensils className="w-6 h-6" />
            </div>
          )}
          <div>
            <h4 className="font-bold text-white text-sm leading-tight">{producto.nombre}</h4>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">${(producto.precio || 0).toFixed(2)}</p>
          </div>
        </div>

        {onEdit && (
          <button
            onClick={() => onEdit(producto)}
            className="text-xs font-bold text-amber-400 hover:underline"
          >
            Editar
          </button>
        )}
      </div>

      {producto.descripcion && (
        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{producto.descripcion}</p>
      )}

      {/* Matriz de Disponibilidad de Canales */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center gap-1.5 flex-wrap">
        {channels.map(ch => {
          const Icon = ch.icon;
          return (
            <span
              key={ch.key}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                ch.active
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-slate-950 text-slate-600 border-slate-800 line-through opacity-60'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{ch.label}</span>
              {ch.active ? <Check className="w-2.5 h-2.5 ml-0.5" /> : <X className="w-2.5 h-2.5 ml-0.5" />}
            </span>
          );
        })}
      </div>
    </div>
  );
}
