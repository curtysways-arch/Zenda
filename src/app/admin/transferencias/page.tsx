'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useBranchWarehouse } from '@/context/BranchWarehouseContext';
import {
  Truck, ArrowRight, Plus, CheckCircle2, Clock, XCircle, AlertTriangle,
  RefreshCw, Search, ChevronRight, Layers, Box, Info, ShieldCheck, X, FileText
} from 'lucide-react';

interface TransferItem {
  id: string;
  productId: string;
  variantId?: string | null;
  dispatchedQty: number;
  receivedQty: number;
  lossQty: number;
  lossReason?: string | null;
  unitCost: number;
  totalCost: number;
}

interface Transfer {
  id: string;
  businessId: string;
  sourceId: string;
  targetId: string;
  sourceBranchId?: string | null;
  sourceWarehouseId?: string | null;
  targetBranchId?: string | null;
  targetWarehouseId?: string | null;
  status: 'DRAFT' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';
  notes?: string | null;
  dispatchedAt?: string | null;
  dispatchedByName?: string | null;
  receivedAt?: string | null;
  receivedByName?: string | null;
  createdByName?: string | null;
  createdAt: string;
  source?: { name: string; code?: string };
  target?: { name: string; code?: string };
  items?: TransferItem[];
}

interface ProductItem {
  id: string;
  nombre: string;
  sku?: string;
  tieneVariantes?: boolean;
  variantes?: Array<{ id: string; nombre: string; sku?: string }>;
}

export default function TransferenciasPage() {
  const { branches, warehouses: globalWarehouses, currentBranchId } = useBranchWarehouse();

  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);

  // Estado para creación de transferencia
  const [srcBranch, setSrcBranch] = useState('');
  const [srcWarehouse, setSrcWarehouse] = useState('');
  const [tgtBranch, setTgtBranch] = useState('');
  const [tgtWarehouse, setTgtWarehouse] = useState('');
  const [srcWarehousesList, setSrcWarehousesList] = useState<any[]>([]);
  const [tgtWarehousesList, setTgtWarehousesList] = useState<any[]>([]);
  const [productsList, setProductsList] = useState<ProductItem[]>([]);
  const [createItems, setCreateItems] = useState<Array<{ productId: string; variantId?: string; quantity: number }>>([]);
  const [createNotes, setCreateNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Estado para recepción con control estricto de mermas
  const [receiveInputs, setReceiveInputs] = useState<Record<string, { receivedQty: number; lossQty: number; lossReason: string }>>({});

  // Cargar transferencias
  const fetchTransfers = useCallback(async () => {
    try {
      setLoading(true);
      let url = '/api/admin/transferencias';
      const params = new URLSearchParams();
      if (filterStatus !== 'ALL') params.append('status', filterStatus);
      if (currentBranchId && currentBranchId !== 'ALL') params.append('sourceBranchId', currentBranchId);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTransfers(data.transfers || []);
      }
    } catch (e) {
      console.error('Error fetching transfers:', e);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, currentBranchId]);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  // Cargar catálogo de productos para el modal de creación
  useEffect(() => {
    async function loadCatalog() {
      try {
        const res = await fetch('/api/admin/inventario');
        if (res.ok) {
          const data = await res.json();
          // Extraer productos únicos
          const pList: ProductItem[] = (data.items || []).map((it: any) => ({
            id: it.productId,
            nombre: it.nombreProducto,
            sku: it.sku,
            variantes: it.isVariant ? [{ id: it.variantId, nombre: it.nombreVariante, sku: it.sku }] : []
          }));
          setProductsList(pList);
        }
      } catch (e) {
        console.error('Error loading products for transfer modal:', e);
      }
    }
    loadCatalog();
  }, []);

  // Cargar bodegas físicas de origen al cambiar sucursal de origen
  useEffect(() => {
    if (!srcBranch) {
      setSrcWarehousesList([]);
      setSrcWarehouse('');
      return;
    }
    fetch(`/api/admin/bodegas?branchId=${srcBranch}&excludeVirtual=true`)
      .then(res => res.json())
      .then(data => {
        const whs = data.warehouses || [];
        setSrcWarehousesList(whs);
        const def = whs.find((w: any) => w.isDefault) || whs[0];
        setSrcWarehouse(def ? def.id : '');
      })
      .catch(console.error);
  }, [srcBranch]);

  // Cargar bodegas físicas de destino al cambiar sucursal de destino
  useEffect(() => {
    if (!tgtBranch) {
      setTgtWarehousesList([]);
      setTgtWarehouse('');
      return;
    }
    fetch(`/api/admin/bodegas?branchId=${tgtBranch}&excludeVirtual=true`)
      .then(res => res.json())
      .then(data => {
        const whs = data.warehouses || [];
        setTgtWarehousesList(whs);
        const def = whs.find((w: any) => w.isDefault) || whs[0];
        setTgtWarehouse(def ? def.id : '');
      })
      .catch(console.error);
  }, [tgtBranch]);

  // Abrir modal de creación
  const handleOpenCreateModal = () => {
    const initialSrcBranch = currentBranchId && currentBranchId !== 'ALL' ? currentBranchId : (branches[0]?.id || '');
    const initialTgtBranch = branches.length > 1 ? branches.find(b => b.id !== initialSrcBranch)?.id || initialSrcBranch : initialSrcBranch;
    setSrcBranch(initialSrcBranch);
    setTgtBranch(initialTgtBranch);
    setCreateItems([{ productId: productsList[0]?.id || '', quantity: 1 }]);
    setCreateNotes('');
    setIsCreateModalOpen(true);
  };

  const handleAddItemRow = () => {
    if (productsList.length > 0) {
      setCreateItems([...createItems, { productId: productsList[0].id, quantity: 1 }]);
    }
  };

  const handleRemoveItemRow = (idx: number) => {
    setCreateItems(createItems.filter((_, i) => i !== idx));
  };

  const handleUpdateItemRow = (idx: number, field: string, val: any) => {
    const updated = [...createItems];
    updated[idx] = { ...updated[idx], [field]: val };
    setCreateItems(updated);
  };

  const handleSubmitCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!srcWarehouse || !tgtWarehouse) {
      alert('Debe seleccionar bodega física de origen y destino.');
      return;
    }
    if (srcWarehouse === tgtWarehouse) {
      alert('La bodega de origen y la bodega de destino no pueden ser la misma.');
      return;
    }
    if (createItems.length === 0 || createItems.some(i => !i.productId || i.quantity <= 0)) {
      alert('Debe especificar productos válidos y cantidades mayores a 0.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/admin/transferencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceBranchId: srcBranch,
          sourceWarehouseId: srcWarehouse,
          targetBranchId: tgtBranch,
          targetWarehouseId: tgtWarehouse,
          notes: createNotes || undefined,
          items: createItems.map(it => ({
            productId: it.productId,
            variantId: it.variantId || undefined,
            quantity: Number(it.quantity)
          }))
        })
      });

      if (res.ok) {
        setIsCreateModalOpen(false);
        fetchTransfers();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al crear transferencia');
      }
    } catch (e: any) {
      alert(e.message || 'Error al conectar');
    } finally {
      setSubmitting(false);
    }
  };

  // Despachar transferencia
  const handleDispatch = async (t: Transfer) => {
    if (!confirm(`¿Confirmas despachar la transferencia hacia la bodega de tránsito? El stock saldrá de ${t.source?.name || 'origen'}.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/transferencias/${t.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DISPATCH' })
      });
      if (res.ok) {
        fetchTransfers();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al despachar');
      }
    } catch (e: any) {
      alert(e.message || 'Error al despachar');
    }
  };

  // Cancelar borrador
  const handleCancel = async (t: Transfer) => {
    if (!confirm('¿Deseas cancelar esta transferencia en borrador?')) return;
    try {
      const res = await fetch(`/api/admin/transferencias/${t.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CANCEL' })
      });
      if (res.ok) {
        fetchTransfers();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al cancelar');
      }
    } catch (e: any) {
      alert(e.message || 'Error al cancelar');
    }
  };

  // Abrir modal de recepción
  const handleOpenReceiveModal = (t: Transfer) => {
    setSelectedTransfer(t);
    const initialInputs: Record<string, { receivedQty: number; lossQty: number; lossReason: string }> = {};
    for (const it of t.items || []) {
      const dQty = Number(it.dispatchedQty);
      initialInputs[it.id] = {
        receivedQty: dQty,
        lossQty: 0,
        lossReason: ''
      };
    }
    setReceiveInputs(initialInputs);
    setIsReceiveModalOpen(true);
  };

  const handleSubmitReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransfer) return;

    // Validación estricta: despachado = recibido + merma, y motivo obligatorio si merma > 0
    for (const it of selectedTransfer.items || []) {
      const inp = receiveInputs[it.id];
      if (!inp) continue;
      const dQty = Number(it.dispatchedQty);
      const rQty = Number(inp.receivedQty);
      const lQty = Number(inp.lossQty);

      if (rQty < 0 || lQty < 0) {
        alert('Las cantidades recibidas o mermas no pueden ser negativas.');
        return;
      }

      if (Math.abs(rQty + lQty - dQty) > 0.0001) {
        alert(`Error en el balance del ítem: Recibido (${rQty}) + Merma (${lQty}) debe ser exactamente igual a lo despachado (${dQty}).`);
        return;
      }

      if (lQty > 0 && !inp.lossReason?.trim()) {
        alert(`Debe ingresar el motivo de pérdida/merma para las ${lQty} unidades no recibidas.`);
        return;
      }
    }

    try {
      setSubmitting(true);
      const payloadItems = (selectedTransfer.items || []).map(it => {
        const inp = receiveInputs[it.id];
        return {
          productId: it.productId,
          variantId: it.variantId || undefined,
          receivedQty: Number(inp.receivedQty),
          lossQty: Number(inp.lossQty),
          lossReason: inp.lossReason || undefined
        };
      });

      const res = await fetch(`/api/admin/transferencias/${selectedTransfer.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RECEIVE',
          receivedItems: payloadItems
        })
      });

      if (res.ok) {
        setIsReceiveModalOpen(false);
        setSelectedTransfer(null);
        fetchTransfers();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al procesar la recepción');
      }
    } catch (e: any) {
      alert(e.message || 'Error en la recepción');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTransfers = transfers.filter(t => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      t.id.toLowerCase().includes(term) ||
      (t.source?.name || '').toLowerCase().includes(term) ||
      (t.target?.name || '').toLowerCase().includes(term) ||
      (t.createdByName || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* ── CABECERA ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Transferencias de Inventario
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
              <ShieldCheck size={12} />
              Custodia en Tránsito Activa
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Gestione traslados físicos entre bodegas y sucursales con trazabilidad PMP y control de mermas.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchTransfers}
            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors shadow-2xs"
            title="Refrescar"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm shadow-sm transition-colors"
          >
            <Plus size={16} />
            <span>Nueva Transferencia</span>
          </button>
        </div>
      </div>

      {/* ── TABS DE ESTADO & BÚSQUEDA ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-xl overflow-x-auto">
          {[
            { key: 'ALL', label: 'Todas' },
            { key: 'DRAFT', label: 'Borradores' },
            { key: 'IN_TRANSIT', label: 'En Tránsito' },
            { key: 'COMPLETED', label: 'Recibidas' },
            { key: 'CANCELLED', label: 'Canceladas' }
          ].map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilterStatus(tab.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                filterStatus === tab.key
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por ID, bodega u operador..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
          />
        </div>
      </div>

      {/* ── LISTADO DE TRANSFERENCIAS ── */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">
          <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-sky-500" />
          Cargando registros de transferencias...
        </div>
      ) : filteredTransfers.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80">
          <Truck size={36} className="mx-auto text-slate-300 mb-3" />
          <h3 className="text-sm font-bold text-slate-700">No hay transferencias registradas</h3>
          <p className="text-xs text-slate-400 mt-1">
            Inicie un traslado de inventario pulsando en "Nueva Transferencia".
          </p>
        </div>
      ) : (
        <div className="overflow-hidden bg-white border border-slate-200/80 rounded-2xl shadow-2xs">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Código / ID</th>
                <th className="px-4 py-3">Ruta de Traslado</th>
                <th className="px-4 py-3">Artículos</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Operador / Fecha</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransfers.map((t) => {
                const totalUnits = (t.items || []).reduce((acc, it) => acc + Number(it.dispatchedQty), 0);
                return (
                  <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-slate-900">
                      #{t.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                        <span>{t.source?.name || 'Bodega Origen'}</span>
                        <ArrowRight size={13} className="text-slate-400 shrink-0" />
                        <span>{t.target?.name || 'Bodega Destino'}</span>
                      </div>
                      {t.notes && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs ">
                          "{t.notes}"
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700">
                      {t.items?.length || 0} productos ({totalUnits} uds)
                    </td>
                    <td className="px-4 py-3">
                      {t.status === 'DRAFT' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock size={11} /> Borrador
                        </span>
                      )}
                      {t.status === 'IN_TRANSIT' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
                          <Truck size={11} /> En Tránsito
                        </span>
                      )}
                      {t.status === 'COMPLETED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 size={11} /> Recibida
                        </span>
                      )}
                      {t.status === 'CANCELLED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle size={11} /> Cancelada
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      <div>{t.createdByName || 'Admin'}</div>
                      <div className="text-xs text-slate-400">
                        {new Date(t.createdAt).toLocaleDateString()} {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1.5">
                      {t.status === 'DRAFT' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleDispatch(t)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-700 text-white shadow-2xs transition-colors"
                          >
                            Despachar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCancel(t)}
                            className="px-2 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 transition-colors"
                          >
                            Cancelar
                          </button>
                        </>
                      )}

                      {t.status === 'IN_TRANSIT' && (
                        <button
                          type="button"
                          onClick={() => handleOpenReceiveModal(t)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors"
                        >
                          Recibir en Destino
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTransfer(t);
                          setIsDetailModalOpen(true);
                        }}
                        className="px-2 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                      >
                        Ver Detalle
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MODAL: NUEVA TRANSFERENCIA (DRAFT) ── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Truck className="text-sky-600" size={20} />
                <h3 className="text-base font-bold text-slate-900">Crear Transferencia de Inventario</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitCreateTransfer} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Origen */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Punto de Origen</span>
                  <div>
                    <label className="text-xs font-semibold text-slate-500">Sucursal Origen</label>
                    <select
                      value={srcBranch}
                      onChange={e => setSrcBranch(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg bg-white border border-slate-200"
                    >
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500">Bodega Física Origen</label>
                    <select
                      value={srcWarehouse}
                      onChange={e => setSrcWarehouse(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg bg-white border border-slate-200 font-semibold"
                    >
                      {srcWarehousesList.map(w => (
                        <option key={w.id} value={w.id}>{w.name} {w.code ? `[${w.code}]` : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Destino */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Punto de Destino</span>
                  <div>
                    <label className="text-xs font-semibold text-slate-500">Sucursal Destino</label>
                    <select
                      value={tgtBranch}
                      onChange={e => setTgtBranch(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg bg-white border border-slate-200"
                    >
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500">Bodega Física Destino</label>
                    <select
                      value={tgtWarehouse}
                      onChange={e => setTgtWarehouse(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg bg-white border border-slate-200 font-semibold"
                    >
                      {tgtWarehousesList.map(w => (
                        <option key={w.id} value={w.id}>{w.name} {w.code ? `[${w.code}]` : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {srcWarehouse && tgtWarehouse && srcWarehouse === tgtWarehouse && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertTriangle size={15} className="shrink-0" />
                  <span>La bodega física de origen y destino no pueden ser la misma.</span>
                </div>
              )}

              {/* Lista de productos a transferir */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Artículos a Trasladar</span>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs text-sky-600 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Plus size={13} /> Agregar Producto
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {createItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <select
                        value={item.productId}
                        onChange={e => handleUpdateItemRow(idx, 'productId', e.target.value)}
                        className="flex-1 text-xs p-1.5 bg-white border border-slate-200 rounded-lg"
                      >
                        {productsList.map(p => (
                          <option key={p.id} value={p.id}>{p.nombre} {p.sku ? `(${p.sku})` : ''}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="0.0001"
                        step="any"
                        placeholder="Cant."
                        value={item.quantity}
                        onChange={e => handleUpdateItemRow(idx, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-24 text-xs p-1.5 bg-white border border-slate-200 rounded-lg font-bold"
                      />
                      {createItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="text-xs font-semibold text-slate-500">Notas / Motivo del Traslado</label>
                <input
                  type="text"
                  placeholder="Ej. Reabastecimiento de mostrador sucursal norte"
                  value={createNotes}
                  onChange={e => setCreateNotes(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || srcWarehouse === tgtWarehouse}
                  className="px-4 py-2 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-xl disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : 'Crear Transferencia'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: RECEPCIÓN CON CONTROL ESTRICTO DE MERMAS ── */}
      {isReceiveModalOpen && selectedTransfer && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Recepción de Transferencia</h3>
                <p className="text-xs text-slate-500">
                  Verifique las cantidades recibidas físicamente en {selectedTransfer.target?.name}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsReceiveModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitReceive} className="space-y-4">
              <div className="space-y-3">
                {(selectedTransfer.items || []).map((it) => {
                  const inp = receiveInputs[it.id] || { receivedQty: Number(it.dispatchedQty), lossQty: 0, lossReason: '' };
                  const dQty = Number(it.dispatchedQty);
                  const isBalanced = Math.abs(inp.receivedQty + inp.lossQty - dQty) < 0.0001;

                  return (
                    <div key={it.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800 text-xs">
                          Producto ID: {it.productId.slice(0, 10)}...
                        </span>
                        <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                          Despachado: {dQty} uds
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-slate-500">Cantidad Recibida Conforme</label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={inp.receivedQty}
                            onChange={e => {
                              const r = parseFloat(e.target.value) || 0;
                              setReceiveInputs({
                                ...receiveInputs,
                                [it.id]: { ...inp, receivedQty: r }
                              });
                            }}
                            className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-lg font-bold text-emerald-700"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-slate-500">Pérdida / Merma en Tránsito</label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={inp.lossQty}
                            onChange={e => {
                              const l = parseFloat(e.target.value) || 0;
                              setReceiveInputs({
                                ...receiveInputs,
                                [it.id]: { ...inp, lossQty: l }
                              });
                            }}
                            className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-lg font-bold text-rose-700"
                          />
                        </div>
                      </div>

                      {inp.lossQty > 0 && (
                        <div>
                          <label className="text-xs font-semibold text-rose-600">
                            Motivo de Merma (Obligatorio por Ley/Auditoría) *
                          </label>
                          <input
                            type="text"
                            placeholder="Ej. Envase roto durante transporte terrestre"
                            value={inp.lossReason}
                            onChange={e => {
                              setReceiveInputs({
                                ...receiveInputs,
                                [it.id]: { ...inp, lossReason: e.target.value }
                              });
                            }}
                            required
                            className="w-full text-xs p-1.5 bg-white border border-rose-300 rounded-lg text-rose-800"
                          />
                        </div>
                      )}

                      {!isBalanced && (
                        <div className="text-xs font-bold text-rose-600 flex items-center gap-1">
                          <AlertTriangle size={12} />
                          Balance descuadrado: Recibido ({inp.receivedQty}) + Merma ({inp.lossQty}) ≠ Despachado ({dQty})
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsReceiveModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-2xs disabled:opacity-50"
                >
                  {submitting ? 'Confirmando...' : 'Confirmar Recepción'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: VER DETALLE ── */}
      {isDetailModalOpen && selectedTransfer && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="text-slate-600" size={18} />
                <h3 className="text-base font-bold text-slate-900">
                  Transferencia #{selectedTransfer.id.slice(0, 8)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl">
                <div>
                  <span className="text-slate-400 font-semibold">Origen:</span>
                  <p className="font-bold text-slate-800">{selectedTransfer.source?.name}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold">Destino:</span>
                  <p className="font-bold text-slate-800">{selectedTransfer.target?.name}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold">Estado:</span>
                  <p className="font-bold">{selectedTransfer.status}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold">Fecha:</span>
                  <p className="font-bold text-slate-800">{new Date(selectedTransfer.createdAt).toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-bold text-slate-700">Artículos transferidos:</span>
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                  {(selectedTransfer.items || []).map((it) => (
                    <div key={it.id} className="p-2.5 flex items-center justify-between bg-white text-xs">
                      <div>
                        <div className="font-semibold text-slate-800">Producto: {it.productId.slice(0, 8)}...</div>
                        {it.lossReason && (
                          <div className="text-rose-600 text-xs">Merma: {it.lossReason} ({Number(it.lossQty)} uds)</div>
                        )}
                      </div>
                      <div className="text-right">
                        <div>Despachado: <span className="font-bold">{Number(it.dispatchedQty)}</span></div>
                        <div className="text-emerald-700">Recibido: <span className="font-bold">{Number(it.receivedQty)}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
