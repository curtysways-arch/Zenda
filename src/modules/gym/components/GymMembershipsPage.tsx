'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CreditCard, Search, CheckCircle, AlertTriangle, Snowflake,
  RotateCw, X, Clock, DollarSign, MessageCircle, ShieldCheck, Ban,
  Loader2, Eye, Calendar, User, ArrowLeft, Receipt, ExternalLink
} from 'lucide-react';

const fmtDate = (d: any) =>
  new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

const fmtDateTime = (d: any) =>
  new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: 'Activa', cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  EXPIRED: { label: 'Vencida', cls: 'bg-red-500/10 text-red-600 border-red-500/20' },
  FROZEN: { label: 'Congelada', cls: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  CANCELLED: { label: 'Cancelada', cls: 'bg-slate-500/10 text-slate-500 border-slate-500/20' },
  PENDING_PAYMENT: { label: 'Pendiente activación', cls: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
};

const PAY_LABELS: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  PAID: { label: 'Pagado', cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', icon: <CheckCircle size={12} /> },
  PENDING: { label: 'Sin pagar', cls: 'bg-red-500/10 text-red-600 border-red-500/20', icon: <AlertTriangle size={12} /> },
  PENDING_ON_SITE: { label: 'Pago en recepción', cls: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20', icon: <Clock size={12} /> },
  PAID_REPORTED: { label: 'Transferencia reportada', cls: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: <DollarSign size={12} /> },
  FAILED: { label: 'Fallido', cls: 'bg-red-500/10 text-red-600 border-red-500/20', icon: <Ban size={12} /> },
};

export default function GymMembershipsPage() {
  const searchParams = useSearchParams();
  const [memberships, setMemberships] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [detailMembership, setDetailMembership] = useState<any | null>(null);

  // Modales
  const [freezeModalOpen, setFreezeModalOpen] = useState(false);
  const [freezeReason, setFreezeReason] = useState('');
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [selectedRenewPlanId, setSelectedRenewPlanId] = useState('');
  const [confirmPayModalOpen, setConfirmPayModalOpen] = useState(false);
  const [confirmPayMethod, setConfirmPayMethod] = useState('EFECTIVO');
  const [confirmPayRef, setConfirmPayRef] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(''), 4000);
  };

  const fetchMemberships = useCallback(async () => {
    setLoading(true);
    try {
      const url = `/api/admin/gym/memberships?status=${statusFilter}&payment=${paymentFilter}&q=${encodeURIComponent(searchQuery)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMemberships(data.memberships || []);
          if (detailMembership) {
            const updated = (data.memberships || []).find((m: any) => m.id === detailMembership.id);
            if (updated) setDetailMembership(updated);
          }
        }
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [statusFilter, paymentFilter, searchQuery]);

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/admin/gym/plans');
      if (res.ok) { const data = await res.json(); if (data.success) setPlans(data.plans || []); }
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchMemberships(); fetchPlans(); }, [statusFilter, paymentFilter]);

  // Auto-abrir detalle si viene ?membresiaId=xxx en la URL
  useEffect(() => {
    const membresiaId = searchParams.get('membresiaId');
    if (membresiaId && memberships.length > 0 && !detailMembership) {
      const found = memberships.find((m: any) => m.id === membresiaId);
      if (found) setDetailMembership(found);
    }
  }, [memberships, searchParams]);

  const doAction = async (id: string, body: object, successMsg: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/admin/gym/memberships/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        showFeedback(successMsg);
        fetchMemberships();
        if (detailMembership?.id === id && data.membership) {
          setDetailMembership(data.membership);
        }
      } else { alert(data.error || 'Error al procesar la acción'); }
    } catch (err) { console.error(err); }
    finally { setIsProcessing(false); }
  };

  const pendingPayCount = memberships.filter(m =>
    m.paymentStatus === 'PENDING' || m.paymentStatus === 'PENDING_ON_SITE' || m.paymentStatus === 'PAID_REPORTED'
  ).length;

  const STATUS_FILTERS = [
    { key: 'ALL', label: 'Todos' },
    { key: 'ACTIVE', label: 'Activos' },
    { key: 'EXPIRED', label: 'Vencidos' },
    { key: 'FROZEN', label: 'Congelados' },
  ];

  const PAY_FILTERS = [
    { key: 'ALL', label: 'Todos los pagos' },
    { key: 'PAID', label: '✅ Pagados' },
    { key: 'PAID_REPORTED', label: '🔵 Transferencia reportada' },
    { key: 'PENDING_ON_SITE', label: '⏳ En recepción' },
    { key: 'PENDING', label: '🔴 Sin pagar' },
  ];

  return (
    <div className="w-full space-y-4 sm:space-y-5 pb-16">
      {/* ── CABECERA ────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
          Membresías &amp; Pagos
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Control de vigencias, auditoría de pagos y contratos
        </p>
      </div>

      {/* ── BANNER DE PENDIENTES ───────────────────────────── */}
      {pendingPayCount > 0 && (
        <button
          onClick={() => setPaymentFilter(paymentFilter === 'PENDING_ON_SITE' ? 'ALL' : 'PENDING_ON_SITE')}
          className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-700 dark:text-yellow-400 text-xs sm:text-sm font-semibold hover:bg-yellow-500/20 transition-colors text-left"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertTriangle size={17} className="shrink-0 text-yellow-600 dark:text-yellow-400" />
            <span className="truncate">
              <strong>{pendingPayCount}</strong> {pendingPayCount > 1 ? 'membresías requieren' : 'membresía requiere'} confirmación de pago
            </span>
          </div>
          <span className="shrink-0 text-xs font-bold underline ml-2">Ver pendientes</span>
        </button>
      )}

      {/* ── MENSAJE DE FEEDBACK ────────────────────────────── */}
      {feedbackMessage && (
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <span>{feedbackMessage}</span>
          <button onClick={() => setFeedbackMessage('')}><X size={14} /></button>
        </div>
      )}

      {/* ── BÚSQUEDA ───────────────────────────────────────── */}
      <form onSubmit={(e) => { e.preventDefault(); fetchMemberships(); }} className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          type="text"
          placeholder="Buscar por socio, teléfono o correo..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-orange-500 shadow-sm"
        />
      </form>

      {/* ── FILTROS (SCROLL HORIZONTAL COMPACTO) ──────────── */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase shrink-0 transition-all ${
                statusFilter === f.key
                  ? 'bg-orange-500 text-white shadow-sm scale-105'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {PAY_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setPaymentFilter(f.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                paymentFilter === f.key
                  ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm scale-105'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENIDO PRINCIPAL ────────────────────────────── */}
      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2" />
          Cargando membresías...
        </div>
      ) : memberships.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8">
          <CreditCard size={38} className="mx-auto text-slate-400 mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Sin membresías encontradas</h3>
          <p className="text-xs text-slate-500 mt-1">Ajusta los filtros de búsqueda para ver más resultados.</p>
        </div>
      ) : (
        <>
          {/* 📱 VISTA MÓVIL: CARDS (Visible en < md) */}
          <div className="block md:hidden space-y-3">
            {memberships.map((m) => {
              const now = new Date();
              const endAt = new Date(m.endAt);
              const isExpired = endAt < now || m.status === 'EXPIRED';
              const daysRemaining = Math.max(0, Math.ceil((endAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
              const payInfo = PAY_LABELS[m.paymentStatus] || PAY_LABELS['PENDING'];
              const statusInfo = STATUS_LABELS[m.status] || { label: m.status, cls: 'bg-slate-500/10 text-slate-500 border-slate-500/20' };
              const needsPayConfirm = m.paymentStatus !== 'PAID';

              return (
                <div
                  key={m.id}
                  onClick={() => setDetailMembership(m)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm active:scale-[0.99] transition-all cursor-pointer space-y-3"
                >
                  {/* Encabezado socio + badges */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center font-black text-sm text-orange-600 shrink-0">
                        {m.cliente?.nombre?.charAt(0) || 'S'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white text-sm truncate leading-tight">
                          {m.cliente?.nombre || 'Socio'}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">{m.cliente?.telefono || 'Sin teléfono'}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusInfo.cls}`}>
                        {statusInfo.label}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${payInfo.cls}`}>
                        {payInfo.label}
                      </span>
                    </div>
                  </div>

                  {/* Resumen Plan y Vencimiento */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-950/60 rounded-xl p-2.5 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Plan Contratado</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                        {m.membershipPlan?.name || 'Personalizado'}
                      </span>
                      <span className="text-orange-600 font-bold">${m.price} {m.currency || 'USD'}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Vence</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                        {fmtDate(m.endAt)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {!isExpired ? `${daysRemaining}d restantes` : 'Vencida'}
                      </span>
                    </div>
                  </div>

                  {/* Botones de acción rápida móvil */}
                  <div className="flex items-center justify-between pt-1 gap-2" onClick={e => e.stopPropagation()}>
                    {needsPayConfirm ? (
                      <button
                        onClick={() => {
                          setDetailMembership(m);
                          setConfirmPayMethod(m.paymentMethod || 'EFECTIVO');
                          setConfirmPayRef('');
                          setConfirmPayModalOpen(true);
                        }}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm active:bg-emerald-700"
                      >
                        <ShieldCheck size={14} />
                        Confirmar Pago
                      </button>
                    ) : (
                      <button
                        onClick={() => setDetailMembership(m)}
                        className="flex-1 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold uppercase flex items-center justify-center gap-1.5"
                      >
                        <Eye size={14} />
                        Ver Detalles
                      </button>
                    )}
                    {m.status === 'ACTIVE' && !isExpired && (
                      <button
                        onClick={() => {
                          setDetailMembership(m);
                          setFreezeReason('');
                          setFreezeModalOpen(true);
                        }}
                        className="py-2 px-3 rounded-xl bg-blue-500/10 text-blue-600 text-xs font-semibold"
                      >
                        Congelar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 💻 VISTA ESCRITORIO: TABLA (Visible en >= md) */}
          <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-3.5 px-6">Socio</th>
                    <th className="py-3.5 px-4">Plan</th>
                    <th className="py-3.5 px-4">Estado</th>
                    <th className="py-3.5 px-4">Pago</th>
                    <th className="py-3.5 px-4">Vence</th>
                    <th className="py-3.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {memberships.map((m) => {
                    const now = new Date();
                    const endAt = new Date(m.endAt);
                    const isExpired = endAt < now || m.status === 'EXPIRED';
                    const daysRemaining = Math.max(0, Math.ceil((endAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
                    const payInfo = PAY_LABELS[m.paymentStatus] || PAY_LABELS['PENDING'];
                    const statusInfo = STATUS_LABELS[m.status] || { label: m.status, cls: 'bg-slate-500/10 text-slate-500 border-slate-500/20' };
                    const isSelected = detailMembership?.id === m.id;
                    const needsPayConfirm = m.paymentStatus !== 'PAID';

                    return (
                      <tr
                        key={m.id}
                        className={`transition-colors cursor-pointer ${
                          isSelected ? 'bg-orange-50/60 dark:bg-orange-900/10' : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/30'
                        }`}
                        onClick={() => setDetailMembership(m)}
                      >
                        <td className="py-3.5 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-black text-xs text-slate-700 dark:text-slate-300 shrink-0">
                              {m.cliente?.nombre?.charAt(0) || 'S'}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white leading-tight">{m.cliente?.nombre || 'Socio'}</p>
                              <p className="text-[11px] text-slate-400">{m.cliente?.telefono}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-200">
                          {m.membershipPlan?.name || 'Plan personalizado'}
                          <span className="block text-[11px] text-slate-400 font-normal">${m.price} {m.currency || 'USD'}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusInfo.cls}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${payInfo.cls}`}>
                            {payInfo.icon}
                            {payInfo.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-medium text-slate-900 dark:text-slate-200 text-xs">{fmtDate(m.endAt)}</span>
                          {!isExpired && <span className="block text-[11px] text-slate-400">{daysRemaining}d restantes</span>}
                        </td>
                        <td className="py-3.5 px-4 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {needsPayConfirm && (
                              <button
                                onClick={() => {
                                  setDetailMembership(m);
                                  setConfirmPayMethod(m.paymentMethod || 'EFECTIVO');
                                  setConfirmPayRef('');
                                  setConfirmPayModalOpen(true);
                                }}
                                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors whitespace-nowrap"
                              >
                                Confirmar pago
                              </button>
                            )}
                            {m.status === 'ACTIVE' && !isExpired && (
                              <button
                                onClick={() => {
                                  setDetailMembership(m);
                                  setFreezeReason('');
                                  setFreezeModalOpen(true);
                                }}
                                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors"
                              >
                                Congelar
                              </button>
                            )}
                            {m.status === 'FROZEN' && (
                              <button
                                onClick={() => doAction(m.id, { action: 'unfreeze' }, 'Membresía reactivada con éxito')}
                                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors"
                              >
                                Reactivar
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setDetailMembership(m);
                                setSelectedRenewPlanId(m.membershipPlanId);
                                setRenewModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 transition-colors"
                            >
                              Renovar
                            </button>
                            <button
                              onClick={() => setDetailMembership(m)}
                              className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Ver detalles completos"
                            >
                              <Eye size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── 📱 MODAL PANTALLA COMPLETA DE DETALLES DE MEMBRESÍA ──── */}
      {detailMembership && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-0 md:p-4 animate-in fade-in duration-200">
          <div className="w-full h-full md:h-auto md:max-h-[92vh] md:max-w-2xl bg-white dark:bg-slate-900 md:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            
            {/* Header del Modal */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setDetailMembership(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 md:hidden"
                >
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <h3 className="font-black text-base uppercase text-slate-900 dark:text-white flex items-center gap-2">
                    <Receipt className="text-orange-500" size={18} />
                    Detalle de Membresía
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    ID: #{detailMembership.id.slice(-8).toUpperCase()}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setDetailMembership(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 hidden md:block"
              >
                <X size={18} />
              </button>
            </div>

            {/* Contenido scrolleable */}
            <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-5">
              
              {/* 1. Tarjeta del Socio */}
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-full bg-orange-500/10 border-2 border-orange-500/30 flex items-center justify-center font-black text-xl text-orange-600 shrink-0">
                    {detailMembership.cliente?.nombre?.charAt(0) || 'S'}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-white text-base">
                      {detailMembership.cliente?.nombre || 'Socio'}
                    </h4>
                    <p className="text-xs text-slate-400">{detailMembership.cliente?.telefono || 'Sin teléfono'}</p>
                    {detailMembership.cliente?.email && (
                      <p className="text-xs text-slate-400">{detailMembership.cliente.email}</p>
                    )}
                  </div>
                </div>

                {detailMembership.cliente?.telefono && (
                  <a
                    href={`https://wa.me/${detailMembership.cliente.telefono.replace(/\D/g, '')}?text=Hola%20${encodeURIComponent(detailMembership.cliente.nombre || '')}%2C%20te%20contactamos%20desde%20el%20gimnasio%20sobre%20tu%20membresía`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-sm transition-colors"
                  >
                    <MessageCircle size={15} />
                    WhatsApp
                  </a>
                )}
              </div>

              {/* 2. Resumen del Plan */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Plan &amp; Vigencia</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-3 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Plan</span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm truncate block mt-0.5">
                      {detailMembership.membershipPlan?.name || 'Personalizado'}
                    </span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-3 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Importe</span>
                    <span className="font-black text-orange-600 text-base block mt-0.5">
                      ${detailMembership.price} {detailMembership.currency || 'USD'}
                    </span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-3 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Inicio</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs block mt-1">
                      {fmtDate(detailMembership.startAt)}
                    </span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-3 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Vencimiento</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs block mt-1">
                      {fmtDate(detailMembership.endAt)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl text-xs">
                  <span className="text-slate-500 font-medium">Estado del Contrato:</span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold border text-xs ${STATUS_LABELS[detailMembership.status]?.cls}`}>
                    {STATUS_LABELS[detailMembership.status]?.label}
                  </span>
                </div>

                {detailMembership.freezeReason && (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-xs text-blue-600 dark:text-blue-400">
                    <strong>Membresía Congelada:</strong> Motivo: {detailMembership.freezeReason}
                  </div>
                )}
              </div>

              {/* 3. HISTORIAL DE PAGOS & AUDITORÍA COMPLETA */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                    <DollarSign size={14} className="text-emerald-500" />
                    Historial de Pago &amp; Transacción
                  </h4>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold border text-[11px] ${PAY_LABELS[detailMembership.paymentStatus]?.cls}`}>
                    {PAY_LABELS[detailMembership.paymentStatus]?.icon}
                    {PAY_LABELS[detailMembership.paymentStatus]?.label}
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-200/60 dark:border-slate-800">
                    <span className="text-slate-500">Monto total registrado</span>
                    <span className="font-black text-slate-900 dark:text-white text-sm">
                      ${detailMembership.price} {detailMembership.currency || 'USD'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-slate-200/60 dark:border-slate-800">
                    <span className="text-slate-500">Método de pago</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">
                      {detailMembership.paymentMethod || 'No especificado'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-slate-200/60 dark:border-slate-800">
                    <span className="text-slate-500">Referencia / Comprobante</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300 font-bold truncate max-w-[200px]" title={detailMembership.paymentReference || 'N/A'}>
                      {detailMembership.paymentReference || 'Sin referencia'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-slate-200/60 dark:border-slate-800">
                    <span className="text-slate-500">Fecha de Adquisición</span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {fmtDateTime(detailMembership.createdAt || detailMembership.startAt)}
                    </span>
                  </div>

                  {detailMembership.updatedAt && (
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-slate-500">Última actualización</span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {fmtDateTime(detailMembership.updatedAt)}
                      </span>
                    </div>
                  )}

                  {/* Banner si está pendiente */}
                  {detailMembership.paymentStatus !== 'PAID' && (
                    <div className="mt-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl space-y-2">
                      <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400 font-bold text-xs">
                        <AlertTriangle size={15} />
                        <span>Pago pendiente de confirmación</span>
                      </div>
                      <p className="text-[11px] text-yellow-600/90 dark:text-yellow-500">
                        Verifica el cobro o transferencia antes de marcar esta membresía como pagada.
                      </p>
                      <button
                        onClick={() => {
                          setConfirmPayMethod(detailMembership.paymentMethod || 'EFECTIVO');
                          setConfirmPayRef(detailMembership.paymentReference || '');
                          setConfirmPayModalOpen(true);
                        }}
                        className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase text-xs tracking-wider shadow-sm transition-colors flex items-center justify-center gap-2"
                      >
                        <ShieldCheck size={15} />
                        Confirmar y Aprobar Pago Ahora
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. ACCIONES OPERATIVAS */}
              <div className="space-y-2.5 pt-2">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Acciones sobre la Membresía</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {detailMembership.status === 'ACTIVE' && new Date(detailMembership.endAt) > new Date() && (
                    <button
                      onClick={() => { setFreezeReason(''); setFreezeModalOpen(true); }}
                      className="py-2.5 px-4 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase border border-blue-500/20 transition-colors flex items-center justify-center gap-2"
                    >
                      <Snowflake size={15} />
                      Congelar Membresía
                    </button>
                  )}

                  {detailMembership.status === 'FROZEN' && (
                    <button
                      onClick={() => doAction(detailMembership.id, { action: 'unfreeze' }, 'Membresía reactivada con éxito')}
                      disabled={isProcessing}
                      className="py-2.5 px-4 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 text-xs font-bold uppercase border border-emerald-500/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={15} />
                      Reactivar Membresía
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setSelectedRenewPlanId(detailMembership.membershipPlanId);
                      setRenewModalOpen(true);
                    }}
                    className="py-2.5 px-4 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-bold uppercase border border-orange-500/20 transition-colors flex items-center justify-center gap-2"
                  >
                    <RotateCw size={15} />
                    Renovar Membresía
                  </button>

                  {detailMembership.status !== 'CANCELLED' && (
                    <button
                      onClick={async () => {
                        if (!confirm(`¿Cancelar definitivamente la membresía de ${detailMembership.cliente?.nombre}? Esta acción no se puede deshacer.`)) return;
                        await doAction(detailMembership.id, { action: 'cancel' }, 'Membresía cancelada correctamente');
                        setDetailMembership(null);
                      }}
                      className="py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 text-xs font-bold uppercase border border-red-500/20 transition-colors flex items-center justify-center gap-2"
                    >
                      <Ban size={15} />
                      Cancelar Membresía
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Footer del Modal */}
            <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex justify-end">
              <button
                onClick={() => setDetailMembership(null)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 font-bold uppercase text-xs tracking-wider"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CONFIRMAR PAGO ──────────────────────────────── */}
      {confirmPayModalOpen && detailMembership && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="text-emerald-500" size={20} />
                Confirmar Pago
              </h3>
              <button onClick={() => setConfirmPayModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Socio: <strong className="text-slate-900 dark:text-white">{detailMembership.cliente?.nombre}</strong>
              {' '}— Plan: <strong className="text-slate-900 dark:text-white">{detailMembership.membershipPlan?.name}</strong>
              {' '}— <strong className="text-emerald-600">${detailMembership.price} {detailMembership.currency}</strong>
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">Método de pago recibido *</label>
                <select
                  value={confirmPayMethod}
                  onChange={e => setConfirmPayMethod(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-emerald-500 font-semibold"
                >
                  {['EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'QR', 'OTRO'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">Referencia o Comprobante</label>
                <input
                  type="text"
                  placeholder="Ej. Recibo #00124, Nro transferencia bancaria"
                  value={confirmPayRef}
                  onChange={e => setConfirmPayRef(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  onClick={() => setConfirmPayModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  disabled={isProcessing}
                  onClick={async () => {
                    await doAction(detailMembership.id, {
                      action: 'confirm_payment',
                      paymentMethod: confirmPayMethod,
                      paymentReference: confirmPayRef
                    }, '✅ Pago confirmado con éxito');
                    setConfirmPayModalOpen(false);
                  }}
                  className="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 flex items-center gap-2"
                >
                  {isProcessing ? <><Loader2 size={13} className="animate-spin" />Procesando...</> : 'Aprobar Pago'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CONGELAR ──────────────────────────────────── */}
      {freezeModalOpen && detailMembership && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                <Snowflake className="text-blue-500" size={20} />
                Congelar Membresía
              </h3>
              <button onClick={() => setFreezeModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Socio: <strong className="text-slate-900 dark:text-white">{detailMembership.cliente?.nombre}</strong>.
              El acceso quedará pausado y los días se sumarán a la vigencia al reactivar.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">Motivo del congelamiento *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Vacaciones, viaje de trabajo, prescripción médica"
                  value={freezeReason}
                  onChange={e => setFreezeReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  onClick={() => setFreezeModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  disabled={isProcessing || !freezeReason.trim()}
                  onClick={async () => {
                    await doAction(detailMembership.id, { action: 'freeze', reason: freezeReason }, 'Membresía congelada');
                    setFreezeModalOpen(false);
                  }}
                  className="px-5 py-2 rounded-xl text-xs font-bold uppercase bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 flex items-center gap-2"
                >
                  {isProcessing ? <><Loader2 size={13} className="animate-spin" />...</> : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL RENOVAR ──────────────────────────────────── */}
      {renewModalOpen && detailMembership && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                <RotateCw className="text-orange-500" size={20} />
                Renovar Membresía
              </h3>
              <button onClick={() => setRenewModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Socio: <strong className="text-slate-900 dark:text-white">{detailMembership.cliente?.nombre}</strong>.
              Se generará una nueva membresía conservando el historial previo.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">Plan a contratar *</label>
                <select
                  value={selectedRenewPlanId}
                  onChange={e => setSelectedRenewPlanId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-orange-500 font-semibold"
                >
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} — ${p.price} ({p.durationDays} días)
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  onClick={() => setRenewModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  disabled={isProcessing}
                  onClick={async () => {
                    await doAction(detailMembership.id, { action: 'renew', planId: selectedRenewPlanId }, 'Membresía renovada con éxito');
                    setRenewModalOpen(false);
                  }}
                  className="px-5 py-2 rounded-xl text-xs font-bold uppercase bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50 flex items-center gap-2"
                >
                  {isProcessing ? <><Loader2 size={13} className="animate-spin" />...</> : 'Confirmar Renovación'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
