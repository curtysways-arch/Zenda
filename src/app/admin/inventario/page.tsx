'use client';

import { useState, useEffect } from 'react';
import { 
  Box, Search, Filter, AlertTriangle, CheckCircle2, XCircle, 
  ArrowUpRight, ArrowDownRight, RefreshCw, Loader2, Save, X, Layers, ShieldCheck
} from 'lucide-react';

interface InventoryItem {
  id: string;
  productId: string;
  variantId: string | null;
  nombreProducto: string;
  nombreVariante: string;
  nombreCompleto: string;
  sku: string;
  categoria: string;
  precio: number;
  stock: number;
  isVariant: boolean;
  activo: boolean;
  lastUpdated: string;
}

interface Summary {
  totalItems: number;
  outOfStock: number;
  lowStock: number;
  normalStock: number;
}

export default function AdminInventario() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [summary, setSummary] = useState<Summary>({ totalItems: 0, outOfStock: 0, lowStock: 0, normalStock: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  // Estado del Modal de Ajuste
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [tipoMovimiento, setTipoMovimiento] = useState<'ENTRADA' | 'SALIDA' | 'AJUSTE_ABSOLUTO'>('ENTRADA');
  const [cantidad, setCantidad] = useState('5');
  const [motivo, setMotivo] = useState('Compra de mercadería');
  const [saving, setSaving] = useState(false);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/inventario?filter=${filter}&search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setSummary(data.summary || { totalItems: 0, outOfStock: 0, lowStock: 0, normalStock: 0 });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [filter, search]);

  const handleOpenAdjust = (item: InventoryItem) => {
    setSelectedItem(item);
    setTipoMovimiento('ENTRADA');
    setCantidad('5');
    setMotivo('Compra de mercadería');
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !cantidad || !motivo) return;

    try {
      setSaving(true);
      const res = await fetch('/api/admin/inventario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedItem.productId,
          variantId: selectedItem.variantId,
          tipoMovimiento,
          cantidad: parseInt(cantidad) || 0,
          motivo
        })
      });

      if (res.ok) {
        setSelectedItem(null);
        fetchInventory();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al guardar el ajuste');
      }
    } catch (e) {
      console.error(e);
      alert('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  // Cálculo visual de nuevo stock en el modal
  const cantNum = parseInt(cantidad) || 0;
  const stockPrev = selectedItem?.stock || 0;
  let stockNuevo = stockPrev;
  if (tipoMovimiento === 'ENTRADA') stockNuevo = stockPrev + cantNum;
  else if (tipoMovimiento === 'SALIDA') stockNuevo = Math.max(0, stockPrev - cantNum);
  else if (tipoMovimiento === 'AJUSTE_ABSOLUTO') stockNuevo = Math.max(0, cantNum);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-cyan-100 text-cyan-800">
              E-Commerce Admin
            </span>
            <span className="text-xs text-slate-400 font-medium">Control Trazable de Existencias</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Box className="w-8 h-8 text-cyan-600" />
            Gestión de Inventario & Stock
          </h1>
        </div>

        <button
          onClick={fetchInventory}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all shadow-sm flex items-center gap-2 self-start"
        >
          <RefreshCw className={`w-4 h-4 text-cyan-600 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Total Ítems</div>
          <div className="text-3xl font-black text-slate-900">{summary.totalItems}</div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">Productos simples y variantes</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" /> Stock Normal
          </div>
          <div className="text-3xl font-black text-slate-900">{summary.normalStock}</div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">&gt; 3 unidades disponibles</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" /> Stock Bajo
          </div>
          <div className="text-3xl font-black text-slate-900">{summary.lowStock}</div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">Entre 1 y 3 unidades</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-2 flex items-center gap-1">
            <XCircle className="w-4 h-4" /> Agotados
          </div>
          <div className="text-3xl font-black text-slate-900">{summary.outOfStock}</div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">0 unidades (Agotado)</p>
        </div>
      </div>

      {/* Controles de Búsqueda y Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        {/* Input Búsqueda */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por producto, SKU o categoría..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-cyan-500 focus:outline-none"
          />
        </div>

        {/* Tabs de Filtro */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'low_stock', label: 'Stock Bajo (<=3)' },
            { id: 'out_of_stock', label: 'Agotados (0)' },
            { id: 'variants', label: 'Solo Variantes' },
            { id: 'simple', label: 'Productos Simples' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === t.id
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de Inventario Consolidado */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-cyan-600" />
            <p className="text-xs font-semibold">Cargando inventario consolidado...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Box className="w-12 h-12 stroke-1 mx-auto mb-3 text-slate-300" />
            <p className="font-bold text-slate-700 text-sm">No se encontraron ítems en el inventario</p>
            <p className="text-xs text-slate-400 mt-1">Prueba cambiando el término de búsqueda o el filtro seleccionado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 font-bold text-slate-500 uppercase tracking-wider">
                  <th className="p-4">Producto & Variante</th>
                  <th className="p-4">SKU</th>
                  <th className="p-4">Categoría</th>
                  <th className="p-4 text-right">Precio</th>
                  <th className="p-4 text-center">Stock Actual</th>
                  <th className="p-4 text-center">Estado</th>
                  <th className="p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 text-sm">{item.nombreProducto}</div>
                      {item.isVariant ? (
                        <div className="text-xs text-cyan-700 font-semibold flex items-center gap-1 mt-0.5">
                          <Layers className="w-3 h-3 text-cyan-600" />
                          <span>Variante: {item.nombreVariante}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 uppercase font-medium">Producto Simple</span>
                      )}
                    </td>
                    <td className="p-4 font-mono text-slate-700 font-semibold">{item.sku}</td>
                    <td className="p-4 font-medium text-slate-600">{item.categoria}</td>
                    <td className="p-4 text-right font-black text-slate-900">${item.precio.toFixed(2)}</td>
                    <td className="p-4 text-center font-bold">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-black ${
                          item.stock === 0
                            ? 'bg-rose-100 text-rose-700 border border-rose-200'
                            : item.stock <= 3
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {item.stock}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {item.stock === 0 ? (
                        <span className="bg-rose-50 text-rose-700 border border-rose-200 font-extrabold px-2.5 py-0.5 rounded-full text-[10px] uppercase">
                          AGOTADO
                        </span>
                      ) : item.stock <= 3 ? (
                        <span className="bg-amber-50 text-amber-700 border border-amber-200 font-extrabold px-2.5 py-0.5 rounded-full text-[10px] uppercase">
                          STOCK BAJO
                        </span>
                      ) : (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold px-2.5 py-0.5 rounded-full text-[10px] uppercase">
                          DISPONIBLE
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleOpenAdjust(item)}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-cyan-600 text-white font-bold text-xs transition-all shadow-sm"
                      >
                        Ajustar Stock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Ajuste de Inventario (FASE 5 & 6) */}
      {selectedItem && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-md">
                  Ajuste de Stock
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">{selectedItem.nombreCompleto}</h3>
                <p className="text-xs text-slate-400 font-mono">SKU: {selectedItem.sku}</p>
              </div>
              <button onClick={() => setSelectedItem(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="space-y-4 text-xs">
              {/* Tipo de Movimiento */}
              <div>
                <label className="block text-slate-600 font-bold mb-1.5">Tipo de Operación</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTipoMovimiento('ENTRADA')}
                    className={`py-2 rounded-xl font-bold border transition-all flex items-center justify-center gap-1 ${
                      tipoMovimiento === 'ENTRADA'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" /> Entrada (+)
                  </button>

                  <button
                    type="button"
                    onClick={() => setTipoMovimiento('SALIDA')}
                    className={`py-2 rounded-xl font-bold border transition-all flex items-center justify-center gap-1 ${
                      tipoMovimiento === 'SALIDA'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <ArrowDownRight className="w-4 h-4" /> Salida (-)
                  </button>

                  <button
                    type="button"
                    onClick={() => setTipoMovimiento('AJUSTE_ABSOLUTO')}
                    className={`py-2 rounded-xl font-bold border transition-all flex items-center justify-center gap-1 ${
                      tipoMovimiento === 'AJUSTE_ABSOLUTO'
                        ? 'bg-cyan-600 text-white border-cyan-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Fijar Stock (=)
                  </button>
                </div>
              </div>

              {/* Cantidad & Motivo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    {tipoMovimiento === 'AJUSTE_ABSOLUTO' ? 'Nuevo Stock Total' : 'Cantidad a Modificar'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={cantidad}
                    onChange={e => setCantidad(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-black text-sm text-slate-900 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Motivo del Movimiento *</label>
                  <select
                    required
                    value={motivo}
                    onChange={e => setMotivo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-semibold text-slate-800 focus:ring-2 focus:ring-cyan-500 focus:outline-none cursor-pointer"
                  >
                    <option value="Compra de mercadería">Compra de mercadería</option>
                    <option value="Corrección">Corrección de inventario</option>
                    <option value="Devolución">Devolución de cliente</option>
                    <option value="Daño">Daño / Deterioro</option>
                    <option value="Pérdida">Pérdida / Faltante</option>
                    <option value="Conteo físico">Conteo físico / Auditoría</option>
                    <option value="Otro">Otro motivo</option>
                  </select>
                </div>
              </div>

              {/* Preview de Resultado */}
              <div className="p-3.5 rounded-xl bg-slate-900 text-white flex items-center justify-between font-mono text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-sans">Stock Anterior</span>
                  <span className="font-bold text-slate-200">{stockPrev} unidades</span>
                </div>
                <div className="text-right">
                  <span className="text-cyan-400 block text-[10px] uppercase font-sans font-bold">Stock Resultante</span>
                  <span className="font-black text-white text-sm">{stockNuevo} unidades</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-all flex items-center gap-2 shadow-lg shadow-cyan-600/20"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Confirmar Ajuste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
