import React, { useState } from 'react';
import { Package, Plus, Trash2, Edit2, Check, DollarSign } from 'lucide-react';

export interface ServiceItemData {
  id?: string;
  nombreProducto: string;
  precioUnitario: number;
  cantidad: number;
}

interface ServiceItemsCardProps {
  items: ServiceItemData[];
  subtotal: number;
  descuento: number;
  costoEnvio: number;
  total: number;
  onChangeItems: (newItems: ServiceItemData[]) => void;
  onChangeDescuento?: (desc: number) => void;
}

export function ServiceItemsCard({
  items,
  subtotal,
  descuento,
  costoEnvio,
  total,
  onChangeItems,
  onChangeDescuento,
}: ServiceItemsCardProps) {
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAddItem = () => {
    if (!newItemName.trim() || !newItemPrice) return;
    const price = parseFloat(newItemPrice);
    if (isNaN(price)) return;

    const updated = [
      ...items,
      {
        id: `item_${Date.now()}`,
        nombreProducto: newItemName.trim(),
        precioUnitario: price,
        cantidad: 1,
      },
    ];
    onChangeItems(updated);
    setNewItemName('');
    setNewItemPrice('');
    setAdding(false);
  };

  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    onChangeItems(updated);
  };

  const handleUpdateQuantity = (index: number, delta: number) => {
    const updated = [...items];
    const newQty = Math.max(1, updated[index].cantidad + delta);
    updated[index] = { ...updated[index], cantidad: newQty };
    onChangeItems(updated);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Package className="w-5 h-5 text-indigo-600" /> Servicios Solicitados ({items.length})
        </h3>
        <button
          onClick={() => setAdding(!adding)}
          className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors"
        >
          <Plus className="w-4 h-4" /> Agregar Servicio
        </button>
      </div>

      {/* Formulario rápido para agregar ítem */}
      {adding && (
        <div className="p-3 bg-slate-50 border border-indigo-200 rounded-2xl space-y-2 text-xs">
          <p className="font-bold text-indigo-900">Nuevo servicio / adicional</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={newItemName}
              onChange={e => setNewItemName(e.target.value)}
              placeholder="Ej: Pintado de suela"
              className="flex-1 px-3 py-2 border border-slate-300 rounded-xl bg-white text-sm focus:outline-none"
            />
            <input
              type="number"
              value={newItemPrice}
              onChange={e => setNewItemPrice(e.target.value)}
              placeholder="Precio ($)"
              className="w-24 px-3 py-2 border border-slate-300 rounded-xl bg-white text-sm focus:outline-none"
            />
            <button
              onClick={handleAddItem}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700"
            >
              ✓
            </button>
          </div>
        </div>
      )}

      {/* Lista de Servicios */}
      <div className="space-y-2">
        {items.map((it, idx) => (
          <div key={it.id || idx} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs">
            <div className="flex-1 pr-3">
              <p className="font-bold text-slate-900 text-sm">{it.nombreProducto}</p>
              <p className="text-slate-400 font-mono">${it.precioUnitario.toFixed(2)} c/u</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-2 py-1">
                <button
                  onClick={() => handleUpdateQuantity(idx, -1)}
                  className="text-slate-400 hover:text-slate-700 font-bold px-1"
                >
                  -
                </button>
                <span className="font-mono font-bold text-slate-900">{it.cantidad}</span>
                <button
                  onClick={() => handleUpdateQuantity(idx, 1)}
                  className="text-slate-400 hover:text-slate-700 font-bold px-1"
                >
                  +
                </button>
              </div>

              <span className="font-mono font-black text-slate-900 text-sm w-16 text-right">
                ${(it.precioUnitario * it.cantidad).toFixed(2)}
              </span>

              <button
                onClick={() => handleRemoveItem(idx)}
                className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Totales */}
      <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
        <div className="flex justify-between">
          <span>Subtotal servicios:</span>
          <span className="font-mono font-semibold">${subtotal.toFixed(2)}</span>
        </div>
        {descuento > 0 && (
          <div className="flex justify-between text-emerald-600 font-semibold">
            <span>Descuento aplicado:</span>
            <span className="font-mono">-${descuento.toFixed(2)}</span>
          </div>
        )}
        {costoEnvio > 0 && (
          <div className="flex justify-between">
            <span>Envío / Logística:</span>
            <span className="font-mono">${costoEnvio.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between pt-2 border-t text-sm font-black text-slate-900">
          <span>Monto Total:</span>
          <span className="font-mono text-emerald-600 text-lg">${total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
