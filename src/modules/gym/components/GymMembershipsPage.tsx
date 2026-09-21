'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard, Search, CheckCircle, AlertTriangle, Snowflake,
  RotateCw, X, Clock, DollarSign, MessageCircle, ShieldCheck, Ban, Loader2, Eye
} from 'lucide-react';

const fmtDate = (d: any) =>
  new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: 'Activa', cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  EXPIRED: { label: 'Vencida', cls: 'bg-red-500/10 text-red-600 border-red-500/20' },
  FROZEN: { label: 'Congelada', cls: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  CANCELLED: { label: 'Cancelada', cls: 'bg-slate-500/10 text-slate-500 border-slate-500/20' },
  PENDING_PAYMENT: { label: 'Pendiente activación', cls: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
};

const PAY_LABELS: Record<string, { label: string; cls: string }> = {
  PAID: { label: 'Pagado', cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  PENDING: { label: 'Sin pagar', cls: 'bg-red-500/10 text-red-600 border-red-500/20' },
  PENDING_ON_SITE: { label: 'Pago en recepción', cls: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20' },
  PAID_REPORTED: { label: 'Transferencia reportada', cls: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  FAILED: { label: 'Fallido', cls: 'bg-red-500/10 text-red-600 border-red-500/20' },
};

export default function GymMembershipsPage() {
  const [memberships, setMemberships] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [detailMembership, setDetailMembership] = useState<any | null>(null);
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
        if (data.success) setMemberships(data.memberships || []);
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
        if (detailMembership?.id === id && data.membership) setDetailMembership(data.membership);
      } else { alert(data.error || 'Error'); }
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
    { key: 'PENDING_ON_SITE', label: '⏳ Pago en recepción' },
    { key: 'PENDING', label: '🔴 Sin pagar' },
  ];

  return (
    <div className="flex gap-4 min-h-0">
      {/* ── LISTADO PRINCIPAL ─────────────────────────────────── */}
      <div className="flex-1 space-y-5 pb-12 min-w-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
            Membresías &amp; Pagos
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Gestión de contratos, estados de membresía y control de pagos pendientes
          </p>
        </div>

        {pendingPayCount > 0 && (
          <button
            onClick={() => setPaymentFilter(paymentFilter !== 'ALL' ? 'ALL' : 'PENDING_ON_SITE')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-700 dark:text-yellow-400 text-sm font-semibold hover:bg-yellow-500/20 transition-colors"
          >
            <AlertTriangle size={16} className="shrink-0" />
            <span>{pendingPayCount} membresía{pendingPayCount > 1 ? 's' : ''} con pago pendiente de verificación</span>
            <span className="ml-auto text-xs underline">Ver pendientes</span>
          </button>
        )}

        {feedbackMessage && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center justify-between">
            <span>{feedbackMessage}</span>
            <button onClick={() => setFeedbackMessage('')}><X size={14} /></button>
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); fetchMemberships(); }} className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Buscar por socio, teléfono o correo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-orange-500"
          />
        </form>

        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map(f => (
            <button key={f.key} onClick={() => setStatusFilter(f.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase transition-colors ${
                statusFilter === f.key ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}>{f.label}</button>
          ))}
          <div className="w-px bg-slate-200 dark:bg-slate-700 mx-1" />
          {PAY_FILTERS.map(f => (
            <button key={f.key} onClick={() => setPaymentFilter(f.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                paymentFilter === f.key ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}>{f.label}</button>
          ))}
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2" />
            Cargando membresías...
          </div>
        ) : memberships.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8">
            <CreditCard size={36} className="mx-auto text-slate-400 mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Sin membresías</h3>
            <p className="text-xs text-slate-500 mt-1">Ajusta los filtros o crea una nueva membresía.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-3.5 px-4 sm:px-6">Socio</th>
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
                        onClick={() => setDetailMembership(isSelected ? null : m)}
                      >
                        <td className="py-3.5 px-4 sm:px-6">
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
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-bold border ${statusInfo.cls}`}>
                            {m.status === 'ACTIVE' && !isExpired && <CheckCircle size={11} />}
                            {(isExpired || m.status === 'EXPIRED') && <AlertTriangle size={11} />}
                            {m.status === 'FROZEN' && <Snowflake size={11} />}
                            {m.status === 'CANCELLED' && <Ban size={11} />}
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold border ${payInfo.cls}`}>
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
                                onClick={() => { setDetailMembership(m); setConfirmPayMethod(m.paymentMethod || 'EFECTIVO'); setConfirmPayRef(''); setConfirmPayModalOpen(true); }}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 transition-colors whitespace-nowrap"
                              >Confirmar pago</button>
                            )}
                            {m.status === 'ACTIVE' && !isExpired && (
                              <button
                                onClick={() => { setDetailMembership(m); setFreezeReason(''); setFreezeModalOpen(true); }}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors"
                              >Congelar</button>
                            )}
                            {m.status === 'FROZEN' && (
                              <button
                                onClick={() => doAction(m.id, { action: 'unfreeze' }, 'Membresía reactivada')}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors"
                              >Reactivar</button>
                            )}
                            <button
                              onClick={() => { setDetailMembership(m); setSelectedRenewPlanId(m.membershipPlanId); setRenewModalOpen(true); }}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 transition-colors"
                            >Renovar</button>
                            <button onClick={() => setDetailMembership(isSelected ? null : m)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" title="Ver detalles"><Eye size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── PANEL LATERAL ─────────────────────────────────────── */}
      {detailMembership && (
        <div className="w-80 shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col self-start sticky top-4">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-black text-sm uppercase text-slate-800 dark:text-white">Detalle Membresía</h3>
            <button onClick={() => setDetailMembership(null)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
          </div>
          <div className="p-5 space-y-4 overflow-y-auto max-h-[80vh]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-orange-500/10 border-2 border-orange-500/30 flex items-center justify-center font-black text-lg text-orange-600">
                {detailMembership.cliente?.nombre?.charAt(0) || 'S'}
              </div>
              <div>
                <p className="font-black text-slate-900 dark:text-white">{detailMembership.cliente?.nombre || 'Socio'}</p>
                <p className="text-xs text-slate-400">{detailMembership.cliente?.telefono || '—'}</p>
                {detailMembership.cliente?.email && <p className="text-xs text-slate-400">{detailMembership.cliente.email}</p>}
              </div>
            </div>

            {detailMembership.cliente?.telefono && (
              <a
                href={`https://wa.me/${detailMembership.cliente.telefono.replace(/\D/g, '')}?text=Hola%20${encodeURIComponent(detailMembership.cliente.nombre || '')}%2C%20te%20contactamos%20sobre%20tu%20membresía`}
                target="_blank" rel="noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 text-xs font-semibold hover:bg-green-500/20 transition-colors"
              >
                <MessageCircle size={14} />Contactar por WhatsApp
              </a>
            )}

            <div className="space-y-1.5 text-xs">
              {[
                ['Plan', detailMembership.membershipPlan?.name],
                ['Precio', `$${detailMembership.price} ${detailMembership.currency || 'USD'}`],
                ['Inicio', fmtDate(detailMembership.startAt)],
                ['Vence', fmtDate(detailMembership.endAt)],
                ['Asistencias', detailMembership._count?.attendances ?? 0],
                detailMembership.paymentMethod ? ['Método pago', detailMembership.paymentMethod] : null,
                detailMembership.paymentReference ? ['Referencia', detailMembership.paymentReference] : null,
                detailMembership.freezeReason ? ['Motivo congelamiento', detailMembership.freezeReason] : null,
              ].filter(Boolean).map(([label, value]) => (
                <div key={label as string} className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <span className="text-slate-500">{label as string}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-right max-w-[160px] truncate">{String(value)}</span>
                </div>
              ))}
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Estado</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold border text-[11px] ${STATUS_LABELS[detailMembership.status]?.cls || ''}`}>
                  {STATUS_LABELS[detailMembership.status]?.label || detailMembership.status}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Pago</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold border text-[11px] ${PAY_LABELS[detailMembership.paymentStatus]?.cls || ''}`}>
                  {PAY_LABELS[detailMembership.paymentStatus]?.label || detailMembership.paymentStatus}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              {detailMembership.paymentStatus !== 'PAID' && (
                <button
                  onClick={() => { setConfirmPayMethod(detailMembership.paymentMethod || 'EFECTIVO'); setConfirmPayRef(''); setConfirmPayModalOpen(true); }}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase transition-colors"
                ><ShieldCheck size={14} />Confirmar pago</button>
              )}
              {detailMembership.status === 'ACTIVE' && new Date(detailMembership.endAt) > new Date() && (
                <button
                  onClick={() => { setFreezeReason(''); setFreezeModalOpen(true); }}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 text-xs font-bold uppercase border border-blue-500/20 transition-colors"
                ><Snowflake size={14} />Congelar</button>
              )}
              {detailMembership.status === 'FROZEN' && (
                <button
                  onClick={() => doAction(detailMembership.id, { action: 'unfreeze' }, 'Membresía reactivada')}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 text-xs font-bold uppercase border border-emerald-500/20 transition-colors disabled:opacity-50"
                ><CheckCircle size={14} />Reactivar</button>
              )}
              <button
                onClick={() => { setSelectedRenewPlanId(detailMembership.membershipPlanId); setRenewModalOpen(true); }}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-700 dark:text-orange-400 text-xs font-bold uppercase border border-orange-500/20 transition-colors"
              ><RotateCw size={14} />Renovar</button>
              {detailMembership.status !== 'CANCELLED' && (
                <button
                  onClick={async () => {
                    if (!confirm(`¿Cancelar definitivamente la membresía de ${detailMembership.cliente?.nombre}?`)) return;
                    await doAction(detailMembership.id, { action: 'cancel' }, 'Membresía cancelada');
                    setDetailMembership(null);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 text-xs font-bold uppercase border border-red-500/20 transition-colors"
                ><Ban size={14} />Cancelar membresía</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CONFIRMAR PAGO ──────────────────────────────── */}
      {confirmPayModalOpen && detailMembership && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="text-emerald-500" size={20} />Confirmar Pago
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
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">Método de pago *</label>
                <select value={confirmPayMethod} onChange={e => setConfirmPayMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-emerald-500">
                  {['EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'QR', 'OTRO'].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">Referencia / comprobante</label>
                <input type="text" placeholder="Ej. Nro. transferencia, recibo" value={confirmPayRef} onChange={e => setConfirmPayRef(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-emerald-500" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setConfirmPayModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Cancelar</button>
                <button disabled={isProcessing}
                  onClick={async () => { await doAction(detailMembership.id, { action: 'confirm_payment', paymentMethod: confirmPayMethod, paymentReference: confirmPayRef }, '✅ Pago confirmado'); setConfirmPayModalOpen(false); }}
                  className="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 flex items-center gap-2">
                  {isProcessing ? <><Loader2 size={13} className="animate-spin" />Procesando...</> : '✅ Confirmar pago'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CONGELAR ──────────────────────────────────── */}
      {freezeModalOpen && detailMembership && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                <Snowflake className="text-blue-500" size={20} />Congelar Membresía
              </h3>
              <button onClick={() => setFreezeModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Socio: <strong className="text-slate-900 dark:text-white">{detailMembership.cliente?.nombre}</strong>. Los días congelados se extenderán al reactivar.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">Motivo *</label>
                <input type="text" required placeholder="Ej. Vacaciones, lesión médica, viaje" value={freezeReason} onChange={e => setFreezeReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setFreezeModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Cancelar</button>
                <button disabled={isProcessing || !freezeReason.trim()}
                  onClick={async () => { await doAction(detailMembership.id, { action: 'freeze', reason: freezeReason }, 'Membresía congelada'); setFreezeModalOpen(false); }}
                  className="px-5 py-2 rounded-xl text-xs font-bold uppercase bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 flex items-center gap-2">
                  {isProcessing ? <><Loader2 size={13} className="animate-spin" />...</> : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL RENOVAR ──────────────────────────────────── */}
      {renewModalOpen && detailMembership && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                <RotateCw className="text-orange-500" size={20} />Renovar Membresía
              </h3>
              <button onClick={() => setRenewModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Socio: <strong className="text-slate-900 dark:text-white">{detailMembership.cliente?.nombre}</strong>. Se creará una nueva membresía conservando el historial.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">Plan de renovación *</label>
                <select value={selectedRenewPlanId} onChange={e => setSelectedRenewPlanId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-orange-500">
                  {plans.map(p => <option key={p.id} value={p.id}>{p.name} — ${p.price} ({p.durationDays} días)</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setRenewModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Cancelar</button>
                <button disabled={isProcessing}
                  onClick={async () => { await doAction(detailMembership.id, { action: 'renew', planId: selectedRenewPlanId }, 'Membresía renovada'); setRenewModalOpen(false); }}
                  className="px-5 py-2 rounded-xl text-xs font-bold uppercase bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50 flex items-center gap-2">
                  {isProcessing ? <><Loader2 size={13} className="animate-spin" />...</> : 'Confirmar renovación'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

