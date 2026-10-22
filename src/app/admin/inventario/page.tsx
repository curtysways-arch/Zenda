'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Box, Search, Filter, AlertTriangle, CheckCircle2, XCircle, 
  ArrowUpRight, ArrowDownRight, RefreshCw, Loader2, Save, X, Layers, ShieldCheck,
  Warehouse, Store, DollarSign, HelpCircle
} from 'lucide-react';
import { useBranchWarehouse } from '@/context/BranchWarehouseContext';

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
  physicalStock?: string;
  physicalStockNumero?: number;
  branchStock?: string;
  branchStockNumero?: number;
  costoPromedio?: string;
  costoPromedioNumero?: number;
  costoCorporativo?: string;
  costoCorporativoNumero?: number;
  costStatus?: string;
  totalValue?: string;
  totalValueNumero?: number;
  isVariant: boolean;
  activo: boolean;
  lastUpdated: string;
}

interface Summary {
  totalItems: number;
  outOfStock: number;
  lowStock: number;
  normalStock: number;
  totalInventoryValue?: string;
}

export default function AdminInventario() {
  const { currentBranchId, currentWarehouseId, currentBranch, currentWarehouse, isConsolidated, warehouses } = useBranchWarehouse();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [summary, setSummary] = useState<Summary>({ totalItems: 0, outOfStock: 0, lowStock: 0, normalStock: 0, totalInventoryValue: '0.00' });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  // Estado del Modal de Ajuste
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [adjustWarehouseId, setAdjustWarehouseId] = useState<string>('');
  const [tipoMovimiento, setTipoMovimiento] = useState<'ENTRADA' | 'SALIDA' | 'AJUSTE_ABSOLUTO'>('ENTRADA');
  const [cantidad, setCantidad] = useState('5');
  const [motivo, setMotivo] = useState('Compra de mercadería');
  const [saving, setSaving] = useState(false);

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter) params.append('filter', filter);
      if (search) params.append('search', search);
      if (currentBranchId && currentBranchId !== 'ALL') params.append('branchId', currentBranchId);
      if (currentWarehouseId) params.append('warehouseId', currentWarehouseId);

      const res = await fetch(`/api/admin/inventario?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setSummary(data.summary || { totalItems: 0, outOfStock: 0, lowStock: 0, normalStock: 0, totalInventoryValue: '0.00' });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filter, search, currentBranchId, currentWarehouseId]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleOpenAdjust = (item: InventoryItem) => {
    setSelectedItem(item);
    setAdjustWarehouseId(currentWarehouseId || (warehouses[0]?.id || ''));
    setTipoMovimiento('ENTRADA');
    setCantidad('5');
    setMotivo('Compra de mercadería');
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !cantidad || !motivo) return;
    if (!adjustWarehouseId) {
      alert('Debe seleccionar una bodega física para registrar el movimiento de inventario.');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/admin/inventario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedItem.productId,
          variantId: selectedItem.variantId,
          tipoMovimiento,
          cantidad: parseFloat(cantidad) || 0,
          motivo,
          branchId: currentBranchId !== 'ALL' ? currentBranchId : undefined,
          warehouseId: adjustWarehouseId
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

  // Cálculo visual de nuevo stock en el modal (soporta decimales fraccionarios y verdad física de bodega)
  const cantNum = parseFloat(cantidad) || 0;
  const stockFisicoActual = selectedItem?.physicalStockNumero ?? (parseFloat(String(selectedItem?.stock ?? 0)) || 0);
  let stockNuevo = stockFisicoActual;
  let deltaAjuste = 0;

  if (tipoMovimiento === 'ENTRADA') {
    stockNuevo = Math.round((stockFisicoActual + cantNum) * 10000) / 10000;
    deltaAjuste = cantNum;
  } else if (tipoMovimiento === 'SALIDA') {
    stockNuevo = Math.max(0, Math.round((stockFisicoActual - cantNum) * 10000) / 10000);
    deltaAjuste = -cantNum;
  } else if (tipoMovimiento === 'AJUSTE_ABSOLUTO') {
    stockNuevo = Math.max(0, cantNum);
    deltaAjuste = Math.round((stockNuevo - stockFisicoActual) * 10000) / 10000;
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-cyan-100 text-cyan-800">
              Inventario Multi-Sede
            </span>
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
              <ShieldCheck size={12} className="text-emerald-600" />
              Trazabilidad PMP Certificada
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Box className="w-8 h-8 text-cyan-600" />
            Control Físico y Costeo de Existencias
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
            <span className="font-semibold text-slate-700">Vista actual:</span>
            {isConsolidated ? (
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md font-bold">
                Consolidado Corporativo
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-sky-50 text-sky-800 rounded-md font-bold">
                Sucursal: {currentBranch?.name} {currentWarehouse ? `| Bodega: ${currentWarehouse.name}` : ''}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start">
          <Link
            href="/admin/transferencias"
            className="px-4 py-2.5 rounded-xl bg-sky-50 border border-sky-200 hover:bg-sky-100 text-sky-800 font-bold text-xs transition-all shadow-2xs flex items-center gap-2"
          >
            <Warehouse className="w-4 h-4 text-sky-600" />
            <span>Transferencias</span>
          </Link>
          <Link
            href="/admin/inventario/conciliacion"
            className="px-4 py-2.5 rounded-xl bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-all shadow-2xs flex items-center gap-2"
          >
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Auditoría & Conciliación</span>
          </Link>
          <button
            onClick={fetchInventory}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all shadow-2xs"
            title="Recargar inventario"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tarjetas Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-xs uppercase font-bold text-slate-400 block tracking-wider">Ítems Totales</span>
          <span className="text-xl font-bold text-slate-900 mt-1 block">{summary.totalItems}</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-xs uppercase font-bold text-emerald-600 block tracking-wider">Disponibles</span>
          <span className="text-xl font-bold text-emerald-700 mt-1 block">{summary.normalStock}</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-xs uppercase font-bold text-amber-600 block tracking-wider">Stock Bajo (≤3)</span>
          <span className="text-xl font-bold text-amber-700 mt-1 block">{summary.lowStock}</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-xs uppercase font-bold text-rose-600 block tracking-wider">Agotados (0)</span>
          <span className="text-xl font-bold text-rose-700 mt-1 block">{summary.outOfStock}</span>
        </div>
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-2xs col-span-2 lg:col-span-1">
          <span className="text-xs uppercase font-bold text-slate-300 block tracking-wider">Valorización Stock</span>
          <span className="text-xl font-bold text-cyan-300 mt-1 block">
            ${summary.totalInventoryValue || '0.00'}
          </span>
        </div>
      </div>

      {/* Filtros & Búsqueda */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre, SKU o categoría..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'low_stock', label: 'Stock Bajo' },
            { id: 'out_of_stock', label: 'Agotados' },
            { id: 'variants', label: 'Variantes' },
            { id: 'simple', label: 'Simples' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filter === t.id
                  ? 'bg-cyan-600 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de Inventario */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-cyan-600" />
            <p className="text-xs font-semibold">Cargando existencias...</p>
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
                <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 uppercase tracking-wider text-xs">
                  <th className="p-3.5">Producto & Variante</th>
                  <th className="p-3.5">SKU / Categoría</th>
                  <th className="p-3.5 text-center">Stock Bodega</th>
                  <th className="p-3.5 text-center">Stock Sede</th>
                  <th className="p-3.5 text-right">PMP Sede</th>
                  <th className="p-3.5 text-right">Valor Total</th>
                  <th className="p-3.5 text-center">Estado Costo</th>
                  <th className="p-3.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900 text-xs">{item.nombreProducto}</div>
                      {item.isVariant ? (
                        <div className="text-xs text-cyan-700 font-semibold flex items-center gap-1 mt-0.5">
                          <Layers className="w-3 h-3 text-cyan-600" />
                          <span>{item.nombreVariante}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 uppercase font-medium">Simple</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <div className="font-mono text-slate-700 font-semibold">{item.sku}</div>
                      <div className="text-xs text-slate-400">{item.categoria}</div>
                    </td>
                    <td className="p-3.5 text-center font-bold">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
 Number(item.physicalStockNumero ?? item.stock ?? 0) === 0
 ? 'bg-rose-100 text-rose-700'
 : Number(item.physicalStockNumero ?? item.stock ?? 0) <= 3
 ? 'bg-amber-100 text-amber-800'
 : 'bg-emerald-100 text-emerald-800'
 }`}
                      >
                        {item.physicalStockNumero ?? item.stock}
                      </span>
                    </td>
                    <td className="p-3.5 text-center font-semibold text-slate-600">
                      {item.branchStockNumero ?? item.stock}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-slate-800">
                      ${(item.costoPromedioNumero ?? 0).toFixed(4)}
                    </td>
                    <td className="p-3.5 text-right font-bold text-slate-900">
                      ${(item.totalValueNumero ?? 0).toFixed(2)}
                    </td>
                    <td className="p-3.5 text-center">
                      {item.costStatus === 'CERTIFIED' ? (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 rounded-md text-xs">
                          CERTIFICADO
                        </span>
                      ) : item.costStatus === 'PENDING_VALUATION' ? (
                        <span className="bg-amber-50 text-amber-700 border border-amber-200 font-bold px-2 py-0.5 rounded-md text-xs">
                          PENDIENTE
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">N/A</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => handleOpenAdjust(item)}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-cyan-600 text-white font-bold text-xs transition-all shadow-2xs"
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

      {/* Modal de Ajuste de Inventario con verdad física */}
      {selectedItem && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-md">
                  Ajuste Físico de Inventario
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">{selectedItem.nombreCompleto}</h3>
                <p className="text-xs text-slate-400 font-mono">SKU: {selectedItem.sku}</p>
              </div>
              <button onClick={() => setSelectedItem(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="space-y-4 text-xs">
              {/* Selección de Bodega Física */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1">
                  <Warehouse size={12} className="text-amber-600" />
                  Bodega Física para el Ajuste *
                </label>
                <select
                  value={adjustWarehouseId}
                  onChange={e => setAdjustWarehouseId(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg font-semibold text-slate-800"
                >
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name} {w.code ? `[${w.code}]` : ''}</option>
                  ))}
                </select>
              </div>

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
                    {tipoMovimiento === 'AJUSTE_ABSOLUTO' ? 'Stock Objetivo en Bodega' : 'Cantidad a Modificar'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={cantidad}
                    onChange={e => setCantidad(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-sm text-slate-900 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Motivo del Movimiento *</label>
                  <select
                    required
                    value={motivo}
                    onChange={e => setMotivo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:ring-2 focus:ring-cyan-500 focus:outline-none cursor-pointer"
                  >
                    <option value="Compra de mercadería">Compra de mercadería</option>
                    <option value="Corrección de inventario">Corrección de inventario</option>
                    <option value="Conteo físico">Conteo físico / Auditoría</option>
                    <option value="Daño">Daño / Deterioro</option>
                    <option value="Pérdida">Pérdida / Faltante</option>
                    <option value="Otro">Otro motivo</option>
                  </select>
                </div>
              </div>

              {/* Vista previa con Delta y Base Física */}
              <div className="p-3.5 rounded-xl bg-slate-900 text-white space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-sans text-xs uppercase">Stock Actual en Bodega:</span>
                  <span className="font-bold text-slate-200">{stockFisicoActual} uds</span>
                </div>
                {tipoMovimiento === 'AJUSTE_ABSOLUTO' && (
                  <div className="flex items-center justify-between text-amber-300">
                    <span className="font-sans text-xs uppercase">Delta a Registrar:</span>
                    <span className="font-bold">{deltaAjuste >= 0 ? `+${deltaAjuste}` : deltaAjuste} uds</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-slate-800 pt-1.5">
                  <span className="text-cyan-400 font-sans text-xs uppercase font-bold">Stock Resultante:</span>
                  <span className="font-bold text-white text-sm">{stockNuevo} uds</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !adjustWarehouseId}
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-all flex items-center gap-2 shadow-md shadow-cyan-600/20 disabled:opacity-50"
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
