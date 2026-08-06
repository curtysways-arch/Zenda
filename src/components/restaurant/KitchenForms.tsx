"use client";

import React, { useState } from 'react';
import { Utensils, Check, Plus } from 'lucide-react';

interface KitchenFormsProps {
  onSaveProduct?: (productData: any) => void;
  categorias?: any[];
}

export default function KitchenForms({ onSaveProduct, categorias = [] }: KitchenFormsProps) {
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [availableInTable, setAvailableInTable] = useState(true);
  const [availableInDelivery, setAvailableInDelivery] = useState(true);
  const [availableInPickup, setAvailableInPickup] = useState(true);
  const [availableInWaiter, setAvailableInWaiter] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !precio) return;
    if (onSaveProduct) {
      onSaveProduct({
        nombre,
        precio: parseFloat(precio),
        descripcion,
        categoriaId: categoriaId || null,
        extraInfo: {
          availableInTable,
          availableInDelivery,
          availableInPickup,
          availableInWaiter
        }
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 max-w-lg w-full">
      <h4 className="font-bold text-white text-base flex items-center gap-2">
        <Utensils className="w-5 h-5 text-amber-500" />
        Agregar Platillo / Producto
      </h4>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-bold text-slate-400 block mb-1">Nombre del Platillo</label>
          <input
            type="text"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Ej: Hamburguesa Gourmet Trufada"
            required
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1">Precio ($)</label>
            <input
              type="number"
              step="0.01"
              value={precio}
              onChange={e => setPrecio(e.target.value)}
              placeholder="12.50"
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1">Categoría</label>
            <select
              value={categoriaId}
              onChange={e => setCategoriaId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="">General</option>
              {categorias.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-400 block mb-1">Descripción / Ingredientes</label>
          <textarea
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            rows={2}
            placeholder="Carne angus 200g, queso cheddar fundido, tocineta ahumada..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Matriz de Canales */}
        <div>
          <label className="text-xs font-bold text-slate-400 block mb-2">Disponibilidad por Canal</label>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-2.5 rounded-xl cursor-pointer">
              <input type="checkbox" checked={availableInTable} onChange={e => setAvailableInTable(e.target.checked)} className="rounded accent-amber-500" />
              <span className="text-xs text-slate-200 font-medium">Disponible en Mesa</span>
            </label>
            <label className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-2.5 rounded-xl cursor-pointer">
              <input type="checkbox" checked={availableInDelivery} onChange={e => setAvailableInDelivery(e.target.checked)} className="rounded accent-amber-500" />
              <span className="text-xs text-slate-200 font-medium">Disponible en Delivery</span>
            </label>
            <label className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-2.5 rounded-xl cursor-pointer">
              <input type="checkbox" checked={availableInPickup} onChange={e => setAvailableInPickup(e.target.checked)} className="rounded accent-amber-500" />
              <span className="text-xs text-slate-200 font-medium">Disponible en Pickup</span>
            </label>
            <label className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-2.5 rounded-xl cursor-pointer">
              <input type="checkbox" checked={availableInWaiter} onChange={e => setAvailableInWaiter(e.target.checked)} className="rounded accent-amber-500" />
              <span className="text-xs text-slate-200 font-medium">Disponible para Mesero</span>
            </label>
          </div>
        </div>
      </div>

      <button
        type="submit"
        className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Guardar Platillo
      </button>
    </form>
  );
}
