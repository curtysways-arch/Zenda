'use client';

import React, { useState, useEffect } from 'react';
import { ChefHat, Plus, Loader2, Play, CheckCircle2, Clock, AlertTriangle, Layers, Store, Warehouse } from 'lucide-react';
import { useBranchWarehouse } from '@/context/BranchWarehouseContext';

export default function AdminProduccionPage() {
  const { currentBranchId, currentWarehouseId, branches, warehouses } = useBranchWarehouse();

  const [orders, setOrders] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [recipeId, setRecipeId] = useState('');
  const [targetQuantity, setTargetQuantity] = useState('50');
  const [prodBranchId, setProdBranchId] = useState(currentBranchId !== 'ALL' ? currentBranchId : '');
  const [prodSourceWhId, setProdSourceWhId] = useState(currentWarehouseId || '');
  const [prodTargetWhId, setProdTargetWhId] = useState(currentWarehouseId || '');

  // Modal completar
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [actualQuantity, setActualQuantity] = useState('');
  const [wasteQuantity, setWasteQuantity] = useState('0');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resO, resR] = await Promise.all([
        fetch('/api/admin/produccion'),
        fetch('/api/admin/recetas')
      ]);

      if (resO.ok) {
        const d = await resO.json();
        setOrders(d.orders || []);
      }
      if (resR.ok) {
        const d = await resR.json();
        setRecipes(d.recipes || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStartOrder = async (orderId: string) => {
    try {
      const res = await fetch(`/api/admin/produccion/${orderId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'START' })
      });
      if (res.ok) {
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al iniciar orden');
      }
    } catch (e) {
      alert('Error de conexión');
    }
  };

  const handleCompleteOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !actualQuantity) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/produccion/${selectedOrder.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'COMPLETE',
          actualQuantity: parseFloat(actualQuantity),
          wasteQuantity: parseFloat(wasteQuantity) || 0
        })
      });

      if (res.ok) {
        setShowCompleteModal(false);
        setSelectedOrder(null);
        setActualQuantity('');
        setWasteQuantity('0');
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al finalizar producción');
      }
    } catch (e) {
      alert('Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipeId || !targetQuantity) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/produccion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipeId,
          targetQuantity: parseFloat(targetQuantity),
          branchId: prodBranchId || undefined,
          sourceWarehouseId: prodSourceWhId || undefined,
          targetWarehouseId: prodTargetWhId || undefined
        })
      });

      if (res.ok) {
        setShowCreateModal(false);
        setRecipeId('');
        setTargetQuantity('50');
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al crear orden');
      }
    } catch (e) {
      alert('Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ChefHat className="h-6 w-6 text-emerald-400" /> Órdenes de Producción
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Tablero operativo de panadería, repostería y cocina: control de lotes, consumo de materias primas e ingreso de producto terminado.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400"
        >
          <Plus className="h-4 w-4" /> Nueva Orden de Elaboración
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
          {orders.map(o => (
            <div
              key={o.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 hover:border-slate-700 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-mono font-bold text-slate-400">{o.code}</span>
                    <h3 className="text-base font-bold text-white mt-0.5">{o.recipe?.name}</h3>
                    <p className="text-xs text-emerald-400 font-semibold">
                      Producto: {o.recipe?.producto?.nombre}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
 o.status === 'COMPLETED'
 ? 'bg-emerald-500/20 text-emerald-400'
 : o.status === 'IN_PROGRESS'
 ? 'bg-amber-500/20 text-amber-400 animate-pulse'
 : 'bg-slate-800 text-slate-300'
 }`}>
                    {o.status === 'COMPLETED' ? 'Completada' : o.status === 'IN_PROGRESS' ? 'En Proceso' : 'Planificada'}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-300 bg-slate-800/40 p-3 rounded-xl">
                  <div>
                    <span className="text-xs uppercase text-slate-500 block">Planificado:</span>
                    <span className="font-bold text-white">{o.targetQuantity} uds</span>
                  </div>
                  <div>
                    <span className="text-xs uppercase text-slate-500 block">Producido Real:</span>
                    <span className="font-bold text-emerald-400">{o.actualQuantity !== null ? `${o.actualQuantity} uds` : '—'}</span>
                  </div>
                </div>

                <div className="mt-3 text-xs text-slate-400 flex justify-between">
                  <span>Costo estimado: <strong>${o.estimatedCost?.toFixed(2)}</strong></span>
                  {o.unitCostReal && (
                    <span>Costo Unit: <strong className="text-white">${o.unitCostReal?.toFixed(3)}</strong></span>
                  )}
                </div>
              </div>

              {/* Botones Operativos Rápidos */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex gap-2">
                {o.status === 'PLANNED' && (
                  <button
                    onClick={() => handleStartOrder(o.id)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-amber-500 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400"
                  >
                    <Play className="h-3.5 w-3.5" /> Iniciar Elaboración
                  </button>
                )}

                {o.status === 'IN_PROGRESS' && (
                  <button
                    onClick={() => {
                      setSelectedOrder(o);
                      setActualQuantity(String(o.targetQuantity));
                      setShowCompleteModal(true);
                    }}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Finalizar & Ingresar a Stock
                  </button>
                )}

                {o.status === 'COMPLETED' && (
                  <div className="w-full text-center py-1 text-xs text-emerald-400 font-semibold flex items-center justify-center gap-1">
                    <CheckCircle2 className="h-4 w-4" /> Ingresada al inventario
                  </div>
                )}
              </div>
            </div>
          ))}

          {orders.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-500">
              No hay órdenes de producción activas. Crea una orden para comenzar la elaboración del lote.
            </div>
          )}
        </div>
      )}

      {/* MODAL CREAR ORDEN */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="text-lg font-bold text-white mb-4">Nueva Orden de Producción</h3>
            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div className="space-y-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/80">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center gap-1">
                    <Store size={12} className="text-sky-400" /> Sucursal de Producción
                  </label>
                  <select
                    value={prodBranchId}
                    onChange={e => setProdBranchId(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white"
                  >
                    <option value="">Selecciona sucursal...</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center gap-1">
                      <Warehouse size={11} className="text-amber-400" /> Bodega Materias Primas
                    </label>
                    <select
                      value={prodSourceWhId}
                      onChange={e => setProdSourceWhId(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-white"
                    >
                      <option value="">Bodega por defecto...</option>
                      {warehouses.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center gap-1">
                      <Warehouse size={11} className="text-emerald-400" /> Bodega Producto Final
                    </label>
                    <select
                      value={prodTargetWhId}
                      onChange={e => setProdTargetWhId(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-white"
                    >
                      <option value="">Bodega por defecto...</option>
                      {warehouses.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Receta / Fórmula *</label>
                <select
                  required
                  value={recipeId}
                  onChange={e => setRecipeId(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white"
                >
                  <option value="">Selecciona receta...</option>
                  {recipes.map(r => (
                    <option key={r.id} value={r.id}>{r.name} (Rinde: {r.yieldQuantity} {r.yieldUnit})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Cantidad a Producir (Unidades) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  value={targetQuantity}
                  onChange={e => setTargetQuantity(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                >
                  {submitting ? 'Creando...' : 'Crear Orden'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL COMPLETAR PRODUCCIÓN */}
      {showCompleteModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="text-lg font-bold text-white mb-2">Finalizar Producción</h3>
            <p className="text-xs text-slate-400 mb-4">
              Orden: <strong>{selectedOrder.code}</strong> — {selectedOrder.recipe?.name}
            </p>

            <form onSubmit={handleCompleteOrder} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Cantidad Real Obtenida (Unidades) *
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0.01"
                  value={actualQuantity}
                  onChange={e => setActualQuantity(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-base font-bold text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Merma / Unidades Dañadas
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={wasteQuantity}
                  onChange={e => setWasteQuantity(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                Al confirmar, se descontarán automáticamente los ingredientes del inventario y se registrarán las unidades terminadas listas para venta.
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                >
                  {submitting ? 'Procesando...' : 'Confirmar & Cargar Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
