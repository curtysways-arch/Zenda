'use client';

import React, { useState, useEffect } from 'react';
import { Warehouse, Plus, Loader2, RefreshCw, CheckCircle2, Store } from 'lucide-react';
import { useBranchWarehouse } from '@/context/BranchWarehouseContext';

export default function AdminBodegasPage() {
  const { branches, currentBranchId } = useBranchWarehouse();

  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [branchId, setBranchId] = useState(currentBranchId !== 'ALL' ? currentBranchId : '');
  const [isDefault, setIsDefault] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchWarehouses = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/bodegas');
      if (res.ok) {
        const d = await res.json();
        setWarehouses(d.warehouses || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/bodegas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, code, isDefault, branchId: branchId || undefined })
      });
      if (res.ok) {
        setName('');
        setCode('');
        setIsDefault(false);
        setShowModal(false);
        fetchWarehouses();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al crear bodega');
      }
    } catch (e) {
      alert('Error de red');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Warehouse className="h-6 w-6 text-emerald-400" /> Bodegas & Almacenes
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Gestión de ubicaciones físicas de almacenamiento para materias primas y productos terminados.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400"
        >
          <Plus className="h-4 w-4" /> Nueva Bodega
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {warehouses.map(wh => (
            <div
              key={wh.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 hover:border-slate-700"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">{wh.name}</h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">Código: {wh.code || 'BOD'}</p>
                </div>
                {wh.isDefault && (
                  <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-400">
                    Principal
                  </span>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>Estado: <strong className="text-emerald-400">Activa</strong></span>
                <span>Registros: {wh.stocks?.length || 0}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="text-lg font-bold text-white mb-4">Nueva Bodega</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center gap-1">
                  <Store size={12} className="text-sky-400" /> Sucursal Asignada
                </label>
                <select
                  value={branchId}
                  onChange={e => setBranchId(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white"
                >
                  <option value="">Sin sucursal (general)...</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Nombre *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Bodega Panadería o Cámara Fría"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Código</label>
                <input
                  type="text"
                  placeholder="Ej: BOD-PAN-01"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={e => setIsDefault(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500"
                />
                <span>Definir como bodega principal</span>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                >
                  {submitting ? 'Guardando...' : 'Crear Bodega'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
