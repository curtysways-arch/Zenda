'use client';

import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  PackageCheck,
  Calendar,
  Warehouse,
  Store,
  Clock,
  Ban,
  Check,
  CreditCard,
  Search,
  Filter
} from 'lucide-react';
import { useBranchWarehouse } from '@/context/BranchWarehouseContext';

type PurchaseStatus = 'ALL' | 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';

export default function AdminComprasPage() {
  const { currentBranchId, currentWarehouseId, branches, warehouses } = useBranchWarehouse();

  const [purchases, setPurchases] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<PurchaseStatus>('ALL');

  // Modal de Creación
  const [showModal, setShowModal] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [discount, setDiscount] = useState(0);
  const [shippingCost, setShippingCost] = useState(0);
  const [otherCosts, setOtherCosts] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('TRANSFERENCIA');
  const [requireApproval, setRequireApproval] = useState(false);
  const [autoReceive, setAutoReceive] = useState(false);
  const [purchaseBranchId, setPurchaseBranchId] = useState(currentBranchId !== 'ALL' ? currentBranchId : '');
  const [purchaseWarehouseId, setPurchaseWarehouseId] = useState(currentWarehouseId || '');

  // Items de compra
  const [items, setItems] = useState<Array<{ productId: string; quantity: number; unitCost: number; discount: number }>>([
    { productId: '', quantity: 1, unitCost: 0, discount: 0 }
  ]);
  const [submitting, setSubmitting] = useState(false);

  // Modal de Recepción Parcial / Total
  const [receivingPurchase, setReceivingPurchase] = useState<any | null>(null);
  const [receptionInputs, setReceptionInputs] = useState<Record<string, number>>({});
  const [receptionNotes, setReceptionNotes] = useState('');
  const [processingReception, setProcessingReception] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const branchParam = currentBranchId !== 'ALL' ? `?branchId=${currentBranchId}` : '';
      const [resP, resS, resProds] = await Promise.all([
        fetch(`/api/admin/compras${branchParam}`),
        fetch('/api/admin/proveedores'),
        fetch('/api/admin/productos')
      ]);

      if (resP.ok) {
        const d = await resP.json();
        setPurchases(d.purchases || []);
      }
      if (resS.ok) {
        const d = await resS.json();
        setSuppliers(d.suppliers || []);
      }
      if (resProds.ok) {
        const d = await resProds.json();
        setProducts(d.productos || d.items || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentBranchId]);

  const handleAddItem = () => {
    setItems([...items, { productId: '', quantity: 1, unitCost: 0, discount: 0 }]);
  };

  const handleRemoveItem = (idx: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== idx));
    }
  };

  // Abrir modal de recepción
  const handleOpenReceiveModal = (purchase: any) => {
    setReceivingPurchase(purchase);
    const initialInputs: Record<string, number> = {};
    purchase.items.forEach((it: any) => {
      const pending = Math.max(0, it.quantity - (it.receivedQuantity || 0));
      initialInputs[it.productId] = pending; // Por defecto sugiere todo lo pendiente
    });
    setReceptionInputs(initialInputs);
    setReceptionNotes('');
  };

  // Confirmar recepción parcial/total
  const handleConfirmReceive = async () => {
    if (!receivingPurchase) return;

    const payloadItems = Object.entries(receptionInputs)
      .filter(([_, qty]) => Number(qty) > 0)
      .map(([productId, receivedQuantity]) => ({
        productId,
        receivedQuantity: Number(receivedQuantity)
      }));

    if (payloadItems.length === 0) {
      alert('Debes ingresar al menos una cantidad a recibir mayor a 0');
      return;
    }

    setProcessingReception(true);
    try {
      const res = await fetch(`/api/admin/compras/${receivingPurchase.id}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receivedItems: payloadItems,
          notes: receptionNotes
        })
      });

      if (res.ok) {
        setReceivingPurchase(null);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al procesar la recepción');
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setProcessingReception(false);
    }
  };

  // Acciones de Aprobación y Cancelación
  const handleAction = async (purchaseId: string, action: 'APPROVE' | 'CANCEL') => {
    const actionLabel = action === 'APPROVE' ? 'aprobar' : 'cancelar';
    if (!confirm(`¿Estás seguro de que deseas ${actionLabel} esta orden de compra?`)) return;

    try {
      const res = await fetch(`/api/admin/compras/${purchaseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || `Error al ${actionLabel} la compra`);
      }
    } catch {
      alert('Error de conexión');
    }
  };

  // Crear orden de compra
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      alert('Selecciona un proveedor');
      return;
    }

    const validItems = items
      .filter(it => it.productId && it.quantity > 0)
      .map(it => {
        const found = products.find(p => p.id === it.productId);
        return {
          productId: it.productId,
          productName: found?.nombre || 'Producto',
          quantity: Number(it.quantity),
          unitCost: Number(it.unitCost),
          discount: Number(it.discount) || 0
        };
      });

    if (validItems.length === 0) {
      alert('Agrega al menos un producto válido');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/compras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: purchaseBranchId || undefined,
          warehouseId: purchaseWarehouseId || undefined,
          supplierId,
          invoiceNumber,
          expectedDate: expectedDate || undefined,
          discount: Number(discount) || 0,
          shippingCost: Number(shippingCost) || 0,
          otherCosts: Number(otherCosts) || 0,
          paymentMethod,
          requireApproval,
          autoReceive,
          items: validItems
        })
      });

      if (res.ok) {
        setShowModal(false);
        setSupplierId('');
        setInvoiceNumber('');
        setExpectedDate('');
        setDiscount(0);
        setShippingCost(0);
        setOtherCosts(0);
        setItems([{ productId: '', quantity: 1, unitCost: 0, discount: 0 }]);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al registrar orden de compra');
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtrado por pestaña de estado
  const filteredPurchases = purchases.filter(p => {
    if (statusFilter === 'ALL') return true;
    return p.status === statusFilter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2 py-0.5 text-xs font-bold text-slate-400 border border-slate-700/50"><Clock className="h-3 w-3" /> Borrador</span>;
      case 'PENDING_APPROVAL':
        return <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-400 border border-amber-500/30"><Clock className="h-3 w-3" /> Por Aprobar</span>;
      case 'APPROVED':
        return <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-xs font-bold text-sky-400 border border-sky-500/30"><Check className="h-3 w-3" /> Aprobada</span>;
      case 'PARTIALLY_RECEIVED':
        return <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2 py-0.5 text-xs font-bold text-purple-400 border border-purple-500/30"><PackageCheck className="h-3 w-3" /> Parcial</span>;
      case 'RECEIVED':
        return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/30"><CheckCircle2 className="h-3 w-3" /> Recibida</span>;
      case 'CANCELLED':
        return <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-bold text-rose-400 border border-rose-500/30"><Ban className="h-3 w-3" /> Cancelada</span>;
      default:
        return <span className="text-xs text-slate-400">{status}</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Truck className="h-6 w-6 text-emerald-400" /> Órdenes de Compra y Recepciones
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Gestión de abastecimiento, landed cost (flete prorrateado), recepciones físicas y cuentas por pagar.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition"
        >
          <Plus className="h-4 w-4" /> Nueva Orden de Compra
        </button>
      </div>

      {/* Pestañas de Filtro por Estado */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        {[
          { key: 'ALL', label: 'Todas' },
          { key: 'DRAFT', label: 'Borradores' },
          { key: 'PENDING_APPROVAL', label: 'Por Aprobar' },
          { key: 'APPROVED', label: 'Aprobadas' },
          { key: 'PARTIALLY_RECEIVED', label: 'Parciales' },
          { key: 'RECEIVED', label: 'Recibidas' },
          { key: 'CANCELLED', label: 'Canceladas' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key as PurchaseStatus)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              statusFilter === tab.key
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tabla de Compras */}
      {loading ? (
        <div className="flex justify-center py-20 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Código / Factura</th>
                <th className="px-4 py-3">Proveedor</th>
                <th className="px-4 py-3">Sucursal</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Ítems / Recepción</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredPurchases.map(p => {
                const totalItems = p.items?.length || 0;
                const totalQtyOrdered = p.items?.reduce((acc: number, it: any) => acc + (it.quantity || 0), 0) || 0;
                const totalQtyRecv = p.items?.reduce((acc: number, it: any) => acc + (it.receivedQuantity || 0), 0) || 0;

                return (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3 font-mono">
                      <div className="font-bold text-white">{p.orderNumber || `#${p.id.slice(0, 8)}`}</div>
                      {p.invoiceNumber && <div className="text-xs text-slate-500">Fac: {p.invoiceNumber}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-white">{p.supplier?.name || 'Desconocido'}</div>
                      <div className="text-xs text-slate-400">{p.supplier?.taxId}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {p.branch?.name || 'Matriz'}
                    </td>
                    <td className="px-4 py-3">
                      <div>{new Date(p.issueDate || p.createdAt).toLocaleDateString()}</div>
                      {p.expectedDate && (
                        <div className="text-xs text-sky-400">Entrega: {new Date(p.expectedDate).toLocaleDateString()}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div>{totalItems} producto(s)</div>
                      <div className="text-xs text-slate-400">
                        {totalQtyRecv} de {totalQtyOrdered} uds recibidas
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold text-emerald-400">
                      ${Number(p.total).toFixed(2)}
                      {p.accountPayable && (
                        <div className="text-xs text-amber-400 font-normal">
                          Saldo: ${Number(p.accountPayable.balance).toFixed(2)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(p.status)}
                    </td>
                    <td className="px-4 py-3 text-right space-x-1.5">
                      {/* Botón Aprobar si está PENDING_APPROVAL */}
                      {p.status === 'PENDING_APPROVAL' && (
                        <button
                          onClick={() => handleAction(p.id, 'APPROVE')}
                          className="rounded-lg bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 px-2.5 py-1 text-xs font-bold"
                        >
                          Aprobar
                        </button>
                      )}

                      {/* Botón Recibir si está APPROVED o PARTIALLY_RECEIVED */}
                      {(p.status === 'APPROVED' || p.status === 'PARTIALLY_RECEIVED' || p.status === 'DRAFT') && (
                        <button
                          onClick={() => handleOpenReceiveModal(p)}
                          className="rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 px-2.5 py-1 text-xs font-bold"
                        >
                          Recibir
                        </button>
                      )}

                      {/* Botón Cancelar si está en DRAFT o APPROVED */}
                      {(p.status === 'DRAFT' || p.status === 'PENDING_APPROVAL' || p.status === 'APPROVED') && (
                        <button
                          onClick={() => handleAction(p.id, 'CANCEL')}
                          className="rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 px-2 py-1 text-xs font-bold"
                        >
                          Cancelar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredPurchases.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No se encontraron órdenes de compra con el filtro seleccionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Creación de Orden */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl my-8">
            <h3 className="text-lg font-bold text-white mb-4">Nueva Orden de Compra</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Proveedor *</label>
                  <select
                    required
                    value={supplierId}
                    onChange={e => {
                      setSupplierId(e.target.value);
                      const s = suppliers.find(sup => sup.id === e.target.value);
                      if (s && s.paymentTerms) setPaymentMethod(s.paymentTerms);
                    }}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Selecciona un proveedor...</option>
                    {suppliers.filter(s => s.active).map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.taxId})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Número de Factura / Doc</label>
                  <input
                    type="text"
                    placeholder="FAC-001-001-000123"
                    value={invoiceNumber}
                    onChange={e => setInvoiceNumber(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Sucursal y Bodega Receptora */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center gap-1.5">
                    <Store className="h-3.5 w-3.5 text-emerald-400" /> Sucursal Receptora
                  </label>
                  <select
                    value={purchaseBranchId}
                    onChange={e => {
                      setPurchaseBranchId(e.target.value);
                      const whs = warehouses.filter(w => w.branchId === e.target.value && !w.isVirtual);
                      setPurchaseWarehouseId(whs[0]?.id || '');
                    }}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white"
                  >
                    <option value="">(Seleccionar sucursal)</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center gap-1.5">
                    <Warehouse className="h-3.5 w-3.5 text-sky-400" /> Bodega Física de Entrada
                  </label>
                  <select
                    value={purchaseWarehouseId}
                    onChange={e => setPurchaseWarehouseId(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white"
                  >
                    <option value="">(Seleccionar bodega física)</option>
                    {warehouses
                      .filter(w => (!purchaseBranchId || w.branchId === purchaseBranchId) && !w.isVirtual)
                      .map(w => (
                        <option key={w.id} value={w.id}>{w.name} {w.isDefault ? '(Principal)' : ''}</option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Condiciones y Costos Adicionales */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Método de Pago</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-white"
                  >
                    <option value="TRANSFERENCIA">Transferencia</option>
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="CREDITO">Crédito</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Flete ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={shippingCost}
                    onChange={e => setShippingCost(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Descuento Global ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={discount}
                    onChange={e => setDiscount(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Fecha Esperada</label>
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={e => setExpectedDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              {/* Lista de Productos */}
              <div className="space-y-2 border-t border-slate-800 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Productos a Comprar</span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300"
                  >
                    + Agregar Fila
                  </button>
                </div>

                {items.map((it, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <select
                      value={it.productId}
                      onChange={e => {
                        const newItems = [...items];
                        newItems[idx].productId = e.target.value;
                        const prod = products.find(p => p.id === e.target.value);
                        if (prod && prod.costoUnitario) newItems[idx].unitCost = prod.costoUnitario;
                        setItems(newItems);
                      }}
                      className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white"
                    >
                      <option value="">Selecciona producto...</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.nombre} ({p.sku || 'Sin SKU'})</option>
                      ))}
                    </select>

                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="Cant"
                      value={it.quantity}
                      onChange={e => {
                        const newItems = [...items];
                        newItems[idx].quantity = Number(e.target.value);
                        setItems(newItems);
                      }}
                      className="w-20 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white"
                    />

                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Costo"
                      value={it.unitCost}
                      onChange={e => {
                        const newItems = [...items];
                        newItems[idx].unitCost = Number(e.target.value);
                        setItems(newItems);
                      }}
                      className="w-24 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white"
                    />

                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-rose-400 hover:text-rose-300 text-sm px-2 font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Opciones adicionales */}
              <div className="flex flex-col sm:flex-row gap-4 border-t border-slate-800 pt-3">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireApproval}
                    onChange={e => setRequireApproval(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-0"
                  />
                  Requiere Aprobación Formal (PENDING_APPROVAL)
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoReceive}
                    onChange={e => setAutoReceive(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-0"
                  />
                  Recepción Inmediata (Ingreso automático en inventario)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
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
                  className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition"
                >
                  {submitting ? 'Creando Orden...' : 'Crear Orden'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Recepción Estructurado (Parcial o Total) */}
      {receivingPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">
              Recepción de Mercadería: {receivingPurchase.orderNumber || `#${receivingPurchase.id.slice(0, 8)}`}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Proveedor: <strong className="text-white">{receivingPurchase.supplier?.name}</strong> | Bodega: <strong className="text-white">{receivingPurchase.warehouseId ? 'Asignada' : 'Principal'}</strong>
            </p>

            <div className="space-y-3 mb-4">
              <div className="text-xs font-bold text-slate-300 border-b border-slate-800 pb-2 flex justify-between">
                <span>Producto</span>
                <span>Pedido / Pendiente / Recibir Ahora</span>
              </div>

              {receivingPurchase.items.map((it: any) => {
                const pending = Math.max(0, it.quantity - (it.receivedQuantity || 0));
                return (
                  <div key={it.id} className="flex items-center justify-between text-xs py-1">
                    <div>
                      <div className="font-bold text-white">{it.productName}</div>
                      <div className="text-xs text-slate-400">Costo: ${Number(it.unitCost).toFixed(2)}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400">{it.quantity} ord / <strong className="text-amber-400">{pending} pend</strong></span>
                      <input
                        type="number"
                        min="0"
                        max={pending}
                        step="0.01"
                        value={receptionInputs[it.productId] ?? pending}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setReceptionInputs({ ...receptionInputs, [it.productId]: val });
                        }}
                        className="w-20 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-white text-right focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-300 block mb-1">Observaciones de Entrega</label>
              <input
                type="text"
                placeholder="Guía de remisión, lote del proveedor, etc."
                value={receptionNotes}
                onChange={e => setReceptionNotes(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => setReceivingPurchase(null)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmReceive}
                disabled={processingReception}
                className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition"
              >
                {processingReception ? 'Procesando Ingreso...' : 'Confirmar Recepción'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
