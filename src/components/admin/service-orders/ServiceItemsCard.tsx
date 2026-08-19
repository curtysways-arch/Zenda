import React, { useState } from 'react';
import { Package, Plus, Trash2, Edit2, Check, DollarSign } from 'lucide-react';

export interface ServiceItemData {
  id?: string;
  nombreProducto: string;
  precioUnitario: number;
  cantidad: number;
  tipo?: string;
  variante?: string;
  extras?: string[];
  observaciones?: string;
  fotos?: string[];
}

interface ServiceItemsCardProps {
  items: ServiceItemData[];
  articulos?: any[];
  subtotal: number;
  descuento: number;
  costoEnvio: number;
  total: number;
  onChangeItems: (newItems: ServiceItemData[]) => void;
  onChangeDescuento?: (desc: number) => void;
}

export function ServiceItemsCard({
  items,
  articulos = [],
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
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

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

  const handleUpdatePrice = (index: number, newPriceStr: string) => {
    const newPrice = parseFloat(newPriceStr) || 0;
    const updated = [...items];
    updated[index] = { ...updated[index], precioUnitario: newPrice };
    onChangeItems(updated);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
      {/* Modal Zoom Foto */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-[999999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-2xl w-full bg-slate-900 rounded-3xl p-3 text-center">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 size-8 bg-slate-800 text-white rounded-full flex items-center justify-center font-bold"
            >
              ✕
            </button>
            <img src={selectedPhoto} alt="Foto zoom" className="w-full max-h-[80vh] object-contain rounded-2xl mx-auto" />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Package className="w-5 h-5 text-indigo-600" /> Artículos / Servicios Solicitados ({items.length})
        </h3>
        <button
          onClick={() => setAdding(!adding)}
          className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors"
        >
          <Plus className="w-4 h-4" /> Agregar Artículo
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
              placeholder="Ej: Mochila - Limpieza Básica"
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

      {/* Lista de Artículos / Servicios */}
      <div className="space-y-3">
        {items.map((it, idx) => {
          // Buscar si hay datos ricos en articulos de extraInfo
          const richArt = Array.isArray(articulos) && articulos[idx] ? articulos[idx] : null;
          const photos = richArt?.fotos || it.fotos || [];
          const extras = richArt?.extras || it.extras || [];

          return (
            <div key={it.id || idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-xs">
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-3">
                  <span className="text-[10px] font-black uppercase text-indigo-600 block">
                    {richArt?.tipo ? `${richArt.tipo} (${richArt.variante || 'Estándar'})` : `Artículo #${idx + 1}`}
                  </span>
                  <p className="font-bold text-slate-900 text-sm">{it.nombreProducto}</p>

                  {richArt?.observaciones && (
                    <p className="text-slate-500 font-medium mt-1 text-[11px] italic">
                      " {richArt.observaciones} "
                    </p>
                  )}

                  {extras.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {extras.map((ex: string, eIdx: number) => (
                        <span key={eIdx} className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-bold rounded-md">
                          + {ex}
                        </span>
                      ))}
                    </div>
                  )}
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

                  <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-xl px-2 py-1">
                    <span className="text-slate-400 font-mono">$</span>
                    <input
                      type="number"
                      value={it.precioUnitario}
                      onChange={e => handleUpdatePrice(idx, e.target.value)}
                      className="w-14 font-mono font-bold text-slate-900 text-right outline-none"
                    />
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

              {/* Muestra de fotos adjuntas del artículo */}
              {photos.length > 0 && (
                <div className="pt-2 border-t border-slate-200/60">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Fotos del Artículo ({photos.length})</span>
                  <div className="flex gap-2 overflow-x-auto py-1">
                    {photos.map((pUrl: string, pIdx: number) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => setSelectedPhoto(pUrl)}
                        className="relative size-14 shrink-0 rounded-xl overflow-hidden border border-slate-200 hover:scale-105 transition-transform"
                      >
                        <img src={pUrl} alt={`Foto ${pIdx}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
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
