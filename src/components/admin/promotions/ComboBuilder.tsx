'use client';

import React, { useState } from 'react';
import { Utensils, Plus, Trash2, Check, DollarSign, Sparkles, Store, Truck, Globe } from 'lucide-react';

interface ComboBuilderProps {
  products: any[];
  categories: any[];
  onSaveCombo: (comboData: any) => void;
}

export default function ComboBuilder({
  products,
  categories,
  onSaveCombo,
}: ComboBuilderProps) {
  const [comboName, setComboName] = useState('🍔 Combo Dúo Especial');
  const [comboDescription, setComboDescription] = useState('Plato Principal + Acompañante + Bebida a precio especial.');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [comboPrice, setComboPrice] = useState<number>(10.99);

  // Calcular precio normal sumando items seleccionados
  const selectedProducts = products.filter(p => selectedProductIds.includes(p.id));
  const normalTotalPrice = selectedProducts.reduce((sum, p) => sum + (Number(p.precio) || 0), 0);
  const savings = Math.max(0, normalTotalPrice - comboPrice);

  const toggleSelectProduct = (id: string) => {
    setSelectedProductIds(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    if (selectedProductIds.length === 0) {
      alert('Por favor selecciona al menos 1 producto para armar el combo.');
      return;
    }

    onSaveCombo({
      titulo: comboName,
      descripcion: comboDescription,
      tipoPromo: 'COMBO',
      precioPromo: comboPrice,
      precioAnterior: normalTotalPrice > 0 ? normalTotalPrice : undefined,
      productosRelacionados: selectedProductIds,
      canales: ['POS', 'MESEROS', 'DELIVERY', 'PICKUP', 'LANDING'],
      estado: 'ACTIVA'
    });
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Utensils className="size-5 text-amber-500" />
            <h2 className="text-xl font-black text-slate-900 uppercase italic">Constructor Visual de Combos</h2>
          </div>
          <p className="text-slate-500 text-xs font-medium max-w-lg">
            Agrupa tus productos existentes (ej. Hamburguesa + Papas + Bebida) en un paquete atractivo sin duplicar elementos en el catálogo.
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-right">
          <span className="text-[10px] text-amber-800 font-extrabold uppercase block">Precio Combo Sugerido</span>
          <span className="text-xl font-black text-amber-600">${comboPrice.toFixed(2)}</span>
          {normalTotalPrice > 0 && (
            <span className="text-[10px] text-slate-400 line-through block font-bold">Antes: ${normalTotalPrice.toFixed(2)}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Columna 1 & 2: Configuración & Selector de Productos */}
        <div className="md:col-span-2 space-y-5">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1.5">Nombre del Combo</label>
              <input
                type="text"
                value={comboName}
                onChange={e => setComboName(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1.5">Descripción Promocional</label>
              <input
                type="text"
                value={comboDescription}
                onChange={e => setComboDescription(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
              Selecciona los Productos Incluidos ({selectedProductIds.length} seleccionados)
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
              {products.map(p => {
                const isSelected = selectedProductIds.includes(p.id);
                return (
                  <div
                    key={p.id}
                    onClick={() => toggleSelectProduct(p.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                      isSelected ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/30' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <span className="font-extrabold text-slate-900 block">{p.nombre}</span>
                      <span className="text-[10px] text-slate-400 font-semibold">${(Number(p.precio) || 0).toFixed(2)}</span>
                    </div>
                    <span className={`size-6 rounded-xl flex items-center justify-center text-xs font-black ${
                      isSelected ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-400'
                    }`}>
                      {isSelected ? '✓' : '+'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Columna 3: Previsualización & Guardar */}
        <div className="bg-slate-900 text-white p-5 rounded-3xl space-y-4 flex flex-col justify-between shadow-xl">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-amber-400">
              <Sparkles className="size-4" />
              <span className="text-xs font-black uppercase tracking-wider">Previsualización del Combo</span>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-white leading-tight">{comboName || 'Combo Nombre'}</h3>
              <p className="text-slate-300 text-xs leading-relaxed font-medium">{comboDescription}</p>
            </div>

            <div className="bg-white/10 p-3.5 rounded-2xl border border-white/15 space-y-2 text-xs">
              <span className="text-[10px] font-black uppercase text-amber-300 block">Productos Incluidos:</span>
              {selectedProducts.length === 0 ? (
                <p className="text-slate-400 text-xs italic">Ningún producto seleccionado</p>
              ) : (
                selectedProducts.map(p => (
                  <div key={p.id} className="flex justify-between items-center text-slate-200 font-bold text-[11px]">
                    <span>• {p.nombre}</span>
                    <span className="text-slate-400 font-mono">${(Number(p.precio) || 0).toFixed(2)}</span>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-1 text-right">
              <span className="text-xs text-slate-400 font-bold block">Precio Oferta Combo:</span>
              <input
                type="number"
                step="0.5"
                value={comboPrice}
                onChange={e => setComboPrice(parseFloat(e.target.value) || 0)}
                className="w-full p-2.5 bg-black/40 border border-amber-500/50 rounded-xl text-right text-xl font-black text-amber-400 focus:outline-none"
              />
              {savings > 0 && (
                <span className="text-[10px] text-emerald-400 font-extrabold block">
                  🎉 ¡El cliente ahorra ${savings.toFixed(2)}!
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs uppercase rounded-2xl shadow-xl cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Check className="size-4" />
            <span>Guardar & Activar Combo</span>
          </button>
        </div>
      </div>
    </div>
  );
}
