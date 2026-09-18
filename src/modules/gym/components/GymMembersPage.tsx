'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Plus, Filter, CheckCircle, AlertTriangle, Snowflake, 
  RotateCw, CreditCard, Calendar, Eye, MoreVertical, X, Phone, Mail, Clock
} from 'lucide-react';

export default function GymMembersPage() {
  const [memberships, setMemberships] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modales de acciones
  const [selectedMembership, setSelectedMembership] = useState<any | null>(null);
  const [freezeModalOpen, setFreezeModalOpen] = useState(false);
  const [freezeReason, setFreezeReason] = useState('');
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [selectedRenewPlanId, setSelectedRenewPlanId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const fetchMemberships = async () => {
    try {
      const url = `/api/admin/gym/memberships?status=${statusFilter}&q=${encodeURIComponent(searchQuery)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMemberships(data.memberships || []);
        }
      }
    } catch (err) {
      console.error('Error fetching memberships:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/admin/gym/plans');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setPlans(data.plans || []);
        }
      }
    } catch (err) {
      console.error('Error fetching plans:', err);
    }
  };

  useEffect(() => {
    fetchMemberships();
    fetchPlans();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMemberships();
  };

  // Acción de congelar
  const handleFreezeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMembership) return;
    setIsProcessing(true);

    try {
      const res = await fetch(`/api/admin/gym/memberships/${selectedMembership.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'freeze', reason: freezeReason })
      });
      const data = await res.json();
      if (data.success) {
        setFreezeModalOpen(false);
        setFeedbackMessage('Membresía congelada con éxito');
        fetchMemberships();
      } else {
        alert(data.error || 'Error al congelar');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Acción de reactivar (unfreeze)
  const handleUnfreeze = async (membership: any) => {
    if (!confirm(`¿Reactivar la membresía de ${membership.cliente?.nombre}? Los días que estuvo congelada se extenderán automáticamente.`)) return;

    try {
      const res = await fetch(`/api/admin/gym/memberships/${membership.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unfreeze' })
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackMessage('Membresía reactivada con éxito');
        fetchMemberships();
      } else {
        alert(data.error || 'Error al reactivar');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Acción de renovar
  const handleRenewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMembership) return;
    setIsProcessing(true);

    try {
      const res = await fetch(`/api/admin/gym/memberships/${selectedMembership.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'renew', planId: selectedRenewPlanId || undefined })
      });
      const data = await res.json();
      if (data.success) {
        setRenewModalOpen(false);
        setFeedbackMessage('Membresía renovada con éxito');
        fetchMemberships();
      } else {
        alert(data.error || 'Error al renovar');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
            Socios del Gimnasio
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Control de membresías activas, vencimientos y estado de acceso de los socios
          </p>
        </div>
      </div>

      {feedbackMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center justify-between">
          <span>{feedbackMessage}</span>
          <button onClick={() => setFeedbackMessage('')}><X size={14} /></button>
        </div>
      )}

      {/* Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Buscar por socio, teléfono o correo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-orange-500"
          />
        </form>

        <div className="flex gap-2">
          {['ALL', 'ACTIVE', 'EXPIRED', 'FROZEN'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase transition-colors ${
                statusFilter === st
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {st === 'ALL' ? 'Todos' : st === 'ACTIVE' ? 'Activos' : st === 'EXPIRED' ? 'Vencidos' : 'Congelados'}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de Socios */}
      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
          Cargando socios...
        </div>
      ) : memberships.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8">
          <Users size={36} className="mx-auto text-slate-400 mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No se encontraron socios</h3>
          <p className="text-xs text-slate-500 mt-1">Intenta con otros términos de búsqueda o filtros.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Socio</th>
                  <th className="py-3.5 px-4">Plan Actual</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-4">Vencimiento</th>
                  <th className="py-3.5 px-4 text-center">Asistencias</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {memberships.map((m) => {
                  const now = new Date();
                  const endAt = new Date(m.endAt);
                  const isExpired = endAt < now || m.status === 'EXPIRED';
                  const daysRemaining = Math.max(0, Math.ceil((endAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                      {/* Socio */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-black text-xs text-slate-700 dark:text-slate-300">
                            {m.cliente?.nombre?.charAt(0) || 'S'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">
                              {m.cliente?.nombre || 'Socio'}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                              <span>{m.cliente?.telefono}</span>
                              {m.cliente?.email && <span>· {m.cliente?.email}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Plan */}
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-200">
                        {m.membershipPlan?.name || 'Plan Personalizado'}
                        <span className="block text-[11px] text-slate-400 font-normal">
                          ${m.price} {m.currency || 'USD'}
                        </span>
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-4">
                        {m.status === 'ACTIVE' && !isExpired && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle size={12} />
                            Activa
                          </span>
                        )}
                        {isExpired && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                            <AlertTriangle size={12} />
                            Vencida
                          </span>
                        )}
                        {m.status === 'FROZEN' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            <Snowflake size={12} />
                            Congelada
                          </span>
                        )}
                      </td>

                      {/* Vencimiento */}
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-900 dark:text-slate-200">
                          {endAt.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        {!isExpired && (
                          <span className="block text-[11px] text-slate-400">
                            {daysRemaining} días restantes
                          </span>
                        )}
                      </td>

                      {/* Asistencias */}
                      <td className="py-3.5 px-4 text-center font-bold text-slate-700 dark:text-slate-300">
                        {m._count?.attendances || 0}
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {m.status === 'ACTIVE' && !isExpired && (
                            <button
                              onClick={() => {
                                setSelectedMembership(m);
                                setFreezeReason('');
                                setFreezeModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors"
                              title="Congelar membresía"
                            >
                              Congelar
                            </button>
                          )}

                          {m.status === 'FROZEN' && (
                            <button
                              onClick={() => handleUnfreeze(m)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors"
                              title="Reactivar membresía"
                            >
                              Reactivar
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setSelectedMembership(m);
                              setSelectedRenewPlanId(m.membershipPlanId);
                              setRenewModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 transition-colors"
                            title="Renovar membresía"
                          >
                            Renovar
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
      )}

      {/* ── MODAL DE CONGELAMIENTO ────────────────────────────────────────── */}
      {freezeModalOpen && selectedMembership && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                <Snowflake className="text-blue-500" size={20} />
                Congelar Membresía
              </h3>
              <button onClick={() => setFreezeModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Socio: <strong className="text-slate-900 dark:text-white">{selectedMembership.cliente?.nombre}</strong>.
              El acceso se bloqueará temporalmente y los días congelados se añadirán a la vigencia al reactivar.
            </p>

            <form onSubmit={handleFreezeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Motivo de congelamiento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Vacaciones, viaje de trabajo, lesión médica"
                  value={freezeReason}
                  onChange={(e) => setFreezeReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFreezeModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                >
                  {isProcessing ? 'Procesando...' : 'Confirmar Congelamiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL DE RENOVACIÓN ──────────────────────────────────────────── */}
      {renewModalOpen && selectedMembership && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                <RotateCw className="text-orange-500" size={20} />
                Renovar Membresía
              </h3>
              <button onClick={() => setRenewModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Socio: <strong className="text-slate-900 dark:text-white">{selectedMembership.cliente?.nombre}</strong>.
              Se creará una nueva membresía activa conservando el historial anterior (Regla 29).
            </p>

            <form onSubmit={handleRenewSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Plan de Renovación *
                </label>
                <select
                  value={selectedRenewPlanId}
                  onChange={(e) => setSelectedRenewPlanId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-orange-500"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — ${p.price} ({p.durationDays} días)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRenewModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50"
                >
                  {isProcessing ? 'Procesando...' : 'Confirmar Renovación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
