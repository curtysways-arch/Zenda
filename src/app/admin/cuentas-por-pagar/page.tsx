'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Receipt,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  DollarSign,
  Search,
  Filter,
  CreditCard,
  Building2,
  Store,
  History,
  X,
  AlertTriangle
} from 'lucide-react';
import { useBranchWarehouse } from '@/context/BranchWarehouseContext';

type PayableStatus = 'ALL' | 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';

export default function AdminCuentasPorPagarPage() {
  const { currentBranchId, branches } = useBranchWarehouse();

  const [payables, setPayables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<PayableStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal de Pago
  const [selectedPayable, setSelectedPayable] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('TRANSFERENCIA');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toLocaleDateString('en-CA'));
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [processingPayment, setProcessingPayment] = useState(false);

  // Modal de Historial
  const [historyPayable, setHistoryPayable] = useState<any | null>(null);

  const fetchPayables = async () => {
    setLoading(true);
    try {
      const branchParam = currentBranchId !== 'ALL' ? `?branchId=${currentBranchId}` : '';
      const res = await fetch(`/api/admin/cuentas-por-pagar${branchParam}`);
      if (res.ok) {
        const data = await res.json();
        setPayables(data.payables || []);
      }
    } catch (e) {
      console.error('Error fetching payables:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayables();
  }, [currentBranchId]);

  // KPIs
  const kpis = useMemo(() => {
    const today = new Date().toLocaleDateString('en-CA');
    let totalDebt = 0;
    let totalOverdue = 0;
    let totalPaid = 0;
    let openCount = 0;

    for (const p of payables) {
      const bal = Number(p.balance || 0);
      const paid = Number(p.paidAmount || 0);
      totalDebt += bal;
      totalPaid += paid;

      const isDue = p.dueDate && p.dueDate < today && bal > 0.0001;
      if (isDue) {
        totalOverdue += bal;
      }
      if (bal > 0.0001) {
        openCount++;
      }
    }

    return {
      totalDebt,
      totalOverdue,
      totalPaid,
      openCount
    };
  }, [payables]);

  // Filtrado
  const filteredPayables = useMemo(() => {
    const today = new Date().toLocaleDateString('en-CA');

    return payables.filter((p) => {
      // Filtro de estado
      if (statusFilter === 'PENDING' && p.status !== 'PENDING') return false;
      if (statusFilter === 'PARTIAL' && p.status !== 'PARTIAL') return false;
      if (statusFilter === 'PAID' && p.status !== 'PAID') return false;
      if (statusFilter === 'OVERDUE') {
        const isOverdue = p.dueDate && p.dueDate < today && Number(p.balance || 0) > 0.0001;
        if (!isOverdue) return false;
      }

      // Filtro de búsqueda
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const supName = p.supplier?.name?.toLowerCase() || '';
        const supRuc = p.supplier?.identification?.toLowerCase() || '';
        const invNum = p.invoiceNumber?.toLowerCase() || p.purchase?.invoiceNumber?.toLowerCase() || '';
        const ordNum = p.purchase?.orderNumber?.toLowerCase() || '';

        if (!supName.includes(q) && !supRuc.includes(q) && !invNum.includes(q) && !ordNum.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [payables, statusFilter, searchQuery]);

  const openPaymentModal = (payable: any) => {
    setSelectedPayable(payable);
    setPaymentAmount(Number(payable.balance || 0));
    setPaymentMethod('TRANSFERENCIA');
    setPaymentReference('');
    setPaymentDate(new Date().toLocaleDateString('en-CA'));
    setPaymentNotes('');
  };

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayable) return;

    if (paymentAmount <= 0) {
      alert('El monto del abono debe ser mayor a 0');
      return;
    }

    if (paymentAmount > Number(selectedPayable.balance) + 0.0001) {
      alert(`El monto no puede superar el saldo pendiente ($${Number(selectedPayable.balance).toFixed(2)})`);
      return;
    }

    setProcessingPayment(true);
    try {
      const res = await fetch(`/api/admin/cuentas-por-pagar/${selectedPayable.id}/pagar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: paymentAmount,
          paymentMethod,
          reference: paymentReference,
          notes: paymentNotes,
          paymentDate: new Date(paymentDate).toISOString()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al procesar pago');
      }

      setSelectedPayable(null);
      fetchPayables();
    } catch (err: any) {
      alert(err.message || 'Error registrando el pago');
    } finally {
      setProcessingPayment(false);
    }
  };

  const getStatusBadge = (payable: any) => {
    const today = new Date().toLocaleDateString('en-CA');
    const isOverdue = payable.dueDate && payable.dueDate < today && Number(payable.balance || 0) > 0.0001;

    if (isOverdue) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <AlertTriangle className="w-3 h-3" /> VENCIDA
        </span>
      );
    }

    switch (payable.status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" /> PENDIENTE
          </span>
        );
      case 'PARTIAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3" /> ABONO PARCIAL
          </span>
        );
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> PAGADA
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200">
            {payable.status}
          </span>
        );
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Receipt className="w-7 h-7 text-indigo-600" />
            Cuentas por Pagar (Proveedores)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Control de obligaciones a crédito, abonos y saldos pendientes por sucursal
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Deuda Total</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">${kpis.totalDebt.toFixed(2)}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Saldo Vencido</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">${kpis.totalOverdue.toFixed(2)}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Total Liquidado</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">${kpis.totalPaid.toFixed(2)}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Obligaciones Abiertas</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{kpis.openCount}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <Receipt className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Pestañas de Estado */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {(['ALL', 'PENDING', 'PARTIAL', 'OVERDUE', 'PAID'] as PayableStatus[]).map((tab) => {
            const labels: Record<PayableStatus, string> = {
              ALL: 'Todas',
              PENDING: 'Pendientes',
              PARTIAL: 'Con Abono',
              OVERDUE: 'Vencidas',
              PAID: 'Pagadas'
            };
            const active = statusFilter === tab;
            return (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  active
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>

        {/* Búsqueda */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por proveedor, RUC, factura..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Tabla de Obligaciones */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-sm">Cargando cuentas por pagar...</p>
          </div>
        ) : filteredPayables.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Receipt className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-base font-medium text-slate-700">No se encontraron cuentas por pagar</p>
            <p className="text-sm text-slate-400 mt-1">
              Las cuentas por pagar se generan automáticamente al recepcionar compras registradas a crédito.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-xs">
                <tr>
                  <th className="py-3 px-4">Proveedor</th>
                  <th className="py-3 px-4">Sucursal</th>
                  <th className="py-3 px-4">Doc / Factura</th>
                  <th className="py-3 px-4">Emisión / Vencimiento</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-right">Pagado</th>
                  <th className="py-3 px-4 text-right">Saldo Pendiente</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredPayables.map((p) => {
                  const balance = Number(p.balance || 0);
                  const total = Number(p.totalAmount || 0);
                  const paid = Number(p.paidAmount || 0);
                  const isPending = balance > 0.0001;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-900">
                        <div>{p.supplier?.name || 'Proveedor Desconocido'}</div>
                        <div className="text-xs text-slate-400">{p.supplier?.identification || 'Sin RUC'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-slate-600">
                          <Store className="w-3.5 h-3.5 text-slate-400" />
                          {p.branch?.nombre || 'General'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">
                          {p.invoiceNumber || p.purchase?.invoiceNumber || 'S/N'}
                        </div>
                        {p.purchase?.orderNumber && (
                          <div className="text-xs text-slate-400">OC: {p.purchase.orderNumber}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-700">
                          Em: {p.issueDate ? new Date(p.issueDate).toLocaleDateString() : 'N/A'}
                        </div>
                        <div className="text-xs font-medium text-slate-500">
                          Vence: {p.dueDate ? new Date(p.dueDate).toLocaleDateString() : 'N/A'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-800">
                        ${total.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-600 font-medium">
                        ${paid.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        ${balance.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {getStatusBadge(p)}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {p.payments && p.payments.length > 0 && (
                          <button
                            onClick={() => setHistoryPayable(p)}
                            title="Ver pagos registrados"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                          >
                            <History className="w-3.5 h-3.5" />
                            Historial
                          </button>
                        )}
                        {isPending && (
                          <button
                            onClick={() => openPaymentModal(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm transition-colors"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            Abonar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Registro de Pago / Abono */}
      {selectedPayable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Registrar Pago a Proveedor</h3>
                  <p className="text-xs text-slate-500">{selectedPayable.supplier?.name}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPayable(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterPayment} className="p-5 space-y-4">
              {/* Resumen Deuda */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-xs uppercase font-semibold text-slate-500">Monto Total</span>
                  <p className="text-sm font-bold text-slate-900">
                    ${Number(selectedPayable.totalAmount || 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <span className="text-xs uppercase font-semibold text-slate-500">Abonado</span>
                  <p className="text-sm font-bold text-emerald-600">
                    ${Number(selectedPayable.paidAmount || 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <span className="text-xs uppercase font-semibold text-slate-500">Saldo Pendiente</span>
                  <p className="text-sm font-bold text-rose-600">
                    ${Number(selectedPayable.balance || 0).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Monto de Pago */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">Monto del Abono / Pago *</label>
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(Number(selectedPayable.balance || 0))}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800 underline"
                  >
                    Liquidar Total (${Number(selectedPayable.balance || 0).toFixed(2)})
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={Number(selectedPayable.balance || 0)}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full pl-8 pr-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Método de Pago y Fecha */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Método de Pago *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="TARJETA">Tarjeta de Débito/Crédito</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Fecha de Pago *</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Referencia */}
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">
                  Comprobante / Referencia Bancaria
                </label>
                <input
                  type="text"
                  placeholder="Ej: Transf. #948271 o Cheque #004"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Notas */}
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Notas / Observaciones</label>
                <textarea
                  rows={2}
                  placeholder="Opcional: detalles del pago o acuerdo..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Botones */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPayable(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={processingPayment}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {processingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Confirmar Pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Historial de Pagos */}
      {historyPayable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Historial de Pagos</h3>
                  <p className="text-xs text-slate-500">
                    {historyPayable.supplier?.name} — Factura {historyPayable.invoiceNumber || 'S/N'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setHistoryPayable(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 max-h-96 overflow-y-auto space-y-3">
              {historyPayable.payments && historyPayable.payments.length > 0 ? (
                historyPayable.payments.map((p: any) => (
                  <div key={p.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">${Number(p.amount).toFixed(2)}</span>
                      <span className="text-slate-500">
                        {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600 text-xs">
                      <span>Método: {p.paymentMethod}</span>
                      {p.reference && <span>Ref: {p.reference}</span>}
                    </div>
                    {p.registeredByName && (
                      <div className="text-xs text-slate-400">Registrado por: {p.registeredByName}</div>
                    )}
                    {p.notes && <div className="text-xs text-slate-500 mt-1">{p.notes}</div>}
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">No hay pagos registrados para esta cuenta.</p>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setHistoryPayable(null)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors"
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
