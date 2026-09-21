'use client';

import React, { useState, useEffect } from 'react';
import {
  Users, Search, CheckCircle, AlertTriangle, Snowflake, RotateCw,
  X, MessageCircle, CreditCard, Ban, Plus, Phone, Mail, Calendar,
  ArrowLeft
} from 'lucide-react';

const fmtDate = (d: any) =>
  new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: 'Activa', cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  EXPIRED: { label: 'Vencida', cls: 'bg-red-500/10 text-red-600 border-red-500/20' },
  FROZEN: { label: 'Congelada', cls: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  CANCELLED: { label: 'Cancelada', cls: 'bg-slate-500/10 text-slate-500 border-slate-500/20' },
  PENDING_PAYMENT: { label: 'Pendiente', cls: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
};

interface Membership {
  id: string;
  status: string;
  startAt: string;
  endAt: string;
  price: number;
  currency: string;
  paymentStatus: string;
  paymentMethod?: string;
  membershipPlan?: { name: string };
  _count?: { attendances: number };
}

interface Member {
  customerId: string;
  nombre: string;
  telefono?: string;
  email?: string;
  memberships: Membership[];
  activeMembership: Membership | null;
  totalAttendances: number;
  status: 'active' | 'expired' | 'no_membership';
}

function groupByClient(memberships: any[]): Member[] {
  const map = new Map<string, Member>();
  for (const m of memberships) {
    const cid = m.customerId;
    if (!map.has(cid)) {
      map.set(cid, {
        customerId: cid,
        nombre: m.cliente?.nombre || 'Socio',
        telefono: m.cliente?.telefono,
        email: m.cliente?.email,
        memberships: [],
        activeMembership: null,
        totalAttendances: 0,
        status: 'no_membership',
      });
    }
    const entry = map.get(cid)!;
    entry.memberships.push(m);
    entry.totalAttendances += m._count?.attendances || 0;
    if (m.status === 'ACTIVE') {
      entry.activeMembership = m;
      entry.status = 'active';
    } else if (m.status === 'FROZEN' && entry.status !== 'active') {
      entry.activeMembership = m;
      entry.status = 'active';
    } else if (entry.status === 'no_membership') {
      entry.status = 'expired';
      entry.activeMembership = m;
    }
  }
  return Array.from(map.values());
}

export default function GymMembersPage() {
  const [memberships, setMemberships] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [newMemberModal, setNewMemberModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  
  // new membership form
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPlanId, setNewPlanId] = useState('');
  const [newPayMethod, setNewPayMethod] = useState('EFECTIVO');

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(''), 4000);
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const url = `/api/admin/gym/memberships?status=${statusFilter}&q=${encodeURIComponent(searchQuery)}`;
      const res = await fetch(url);
      if (res.ok) { const d = await res.json(); if (d.success) setMemberships(d.memberships || []); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/admin/gym/plans');
      if (res.ok) { const d = await res.json(); if (d.success) setPlans(d.plans || []); }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchAll(); fetchPlans(); }, [statusFilter]);

  const members = groupByClient(memberships);

  const filtered = members.filter(m => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return m.nombre.toLowerCase().includes(q) || (m.telefono || '').includes(q) || (m.email || '').toLowerCase().includes(q);
  });

  const handleCreateMembership = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanId) return;
    setIsProcessing(true);
    try {
      const clientRes = await fetch('/api/admin/gym/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: newName, telefono: newPhone, email: newEmail })
      });
      if (!clientRes.ok) { const e = await clientRes.json(); alert(e.error || 'Error al crear socio'); setIsProcessing(false); return; }
      const { cliente } = await clientRes.json();
      
      const memRes = await fetch('/api/admin/gym/memberships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: cliente.id, membershipPlanId: newPlanId, paymentMethod: newPayMethod })
      });
      if (!memRes.ok) { const e = await memRes.json(); alert(e.error || 'Error al crear membresía'); setIsProcessing(false); return; }
      showFeedback('✅ Socio creado correctamente');
      setNewMemberModal(false);
      setNewName(''); setNewPhone(''); setNewEmail(''); setNewPlanId(''); setNewPayMethod('EFECTIVO');
      fetchAll();
    } catch (e) { console.error(e); }
    finally { setIsProcessing(false); }
  };

  const STATUS_FILTERS = [
    { key: 'ALL', label: 'Todos' },
    { key: 'ACTIVE', label: 'Activos' },
    { key: 'EXPIRED', label: 'Vencidos' },
    { key: 'FROZEN', label: 'Congelados' },
  ];

  return (
    <div className="w-full space-y-4 sm:space-y-5 pb-16">
      {/* ── CABECERA ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
            Socios del Gimnasio
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Directorio de clientes y su historial acumulado
          </p>
        </div>
        <button
          onClick={() => setNewMemberModal(true)}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold uppercase shadow-sm transition-colors"
        >
          <Plus size={15} />
          Nuevo Socio
        </button>
      </div>

      {feedbackMessage && (
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center justify-between">
          <span>{feedbackMessage}</span>
          <button onClick={() => setFeedbackMessage('')}><X size={14} /></button>
        </div>
      )}

      {/* ── BÚSQUEDA ───────────────────────────────────────── */}
      <form onSubmit={e => { e.preventDefault(); fetchAll(); }} className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          type="text"
          placeholder="Buscar por nombre, teléfono o correo..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-orange-500 shadow-sm"
        />
      </form>

      {/* ── FILTROS HORIZONTALES ───────────────────────────── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase shrink-0 transition-all ${
              statusFilter === f.key
                ? 'bg-orange-500 text-white shadow-sm scale-105'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── LISTADO DE SOCIOS (GRID RESPONSIVE) ─────────────── */}
      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2" />
          Cargando socios...
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8">
          <Users size={38} className="mx-auto text-slate-400 mb-3" />
          <h3 className="text-base font-bold">No se encontraron socios</h3>
          <p className="text-xs text-slate-500 mt-1">Intenta con otros filtros o crea un nuevo socio.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filtered.map(member => {
            const am = member.activeMembership;
            const isActive = am && (am.status === 'ACTIVE' || am.status === 'FROZEN');
            const statusInfo = am ? (STATUS_LABELS[am.status] || STATUS_LABELS['EXPIRED']) : { label: 'Sin membresía', cls: 'bg-slate-200 text-slate-500 border-slate-300' };

            return (
              <div
                key={member.customerId}
                onClick={() => setSelectedMember(member)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 cursor-pointer hover:border-orange-500/60 hover:shadow-md transition-all active:scale-[0.99] space-y-3"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg shrink-0 ${
                    isActive ? 'bg-orange-500/10 border-2 border-orange-500/30 text-orange-600'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600'
                  }`}>
                    {member.nombre.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white text-sm truncate">{member.nombre}</p>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{member.telefono || 'Sin teléfono'}</p>
                    {member.email && <p className="text-xs text-slate-400 truncate">{member.email}</p>}
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${statusInfo.cls}`}>
                    {statusInfo.label}
                  </span>
                </div>

                {am && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Plan</p>
                      <p className="font-semibold text-slate-700 dark:text-slate-300 truncate mt-0.5">{am.membershipPlan?.name || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Vence</p>
                      <p className="font-semibold text-slate-700 dark:text-slate-300 mt-0.5">{fmtDate(am.endAt)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Asistencias</p>
                      <p className="font-bold text-orange-600 mt-0.5">{member.totalAttendances}</p>
                    </div>
                  </div>
                )}

                {member.memberships.length > 1 && (
                  <p className="text-[10px] text-slate-400 text-center pt-1 font-medium">
                    {member.memberships.length} contratos en su historial
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL PANTALLA COMPLETA PERFIL DEL SOCIO ────────── */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-0 md:p-4 animate-in fade-in duration-200">
          <div className="w-full h-full md:h-auto md:max-h-[92vh] md:max-w-2xl bg-white dark:bg-slate-900 md:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedMember(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 md:hidden"
                >
                  <ArrowLeft size={18} />
                </button>
                <h3 className="font-black text-base uppercase text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="text-orange-500" size={18} />
                  Perfil del Socio
                </h3>
              </div>
              <button
                onClick={() => setSelectedMember(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 hidden md:block"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-orange-500/10 border-2 border-orange-500/30 flex items-center justify-center font-black text-2xl text-orange-600 shrink-0">
                  {selectedMember.nombre.charAt(0)}
                </div>
                <div className="min-w-0">
                  <h4 className="font-black text-slate-900 dark:text-white text-lg truncate">{selectedMember.nombre}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{selectedMember.telefono || 'Sin teléfono'}</p>
                  {selectedMember.email && <p className="text-xs text-slate-400">{selectedMember.email}</p>}
                </div>
              </div>

              {selectedMember.telefono && (
                <a
                  href={`https://wa.me/${selectedMember.telefono.replace(/\D/g, '')}?text=Hola%20${encodeURIComponent(selectedMember.nombre)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-sm transition-colors"
                >
                  <MessageCircle size={16} />
                  Contactar por WhatsApp
                </a>
              )}

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-3.5">
                  <p className="text-2xl font-black text-orange-600">{selectedMember.totalAttendances}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold mt-0.5">Asistencias Totales</p>
                </div>
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-3.5">
                  <p className="text-2xl font-black text-slate-800 dark:text-white">{selectedMember.memberships.length}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold mt-0.5">Membresías Contratadas</p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2.5">
                  Historial de Membresías
                </h4>
                <div className="space-y-2">
                  {selectedMember.memberships.map(m => {
                    const si = STATUS_LABELS[m.status] || { label: m.status, cls: 'bg-slate-200 text-slate-500 border-slate-300' };
                    return (
                      <div key={m.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-1.5 bg-slate-50/50 dark:bg-slate-950/40">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-slate-800 dark:text-white">{m.membershipPlan?.name || 'Plan personalizado'}</p>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${si.cls}`}>{si.label}</span>
                        </div>
                        <p className="text-xs text-slate-400">{fmtDate(m.startAt)} → {fmtDate(m.endAt)}</p>
                        <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300 pt-1 border-t border-slate-200/50 dark:border-slate-800/60">
                          <span className="text-orange-600">${m.price} {m.currency}</span>
                          <span className="text-slate-400 text-[11px] font-normal">{m._count?.attendances ?? 0} asistencias registradas</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex gap-2">
              <a
                href={selectedMember.activeMembership
                  ? `/admin/membresias?membresiaId=${selectedMember.activeMembership.id}`
                  : (selectedMember.memberships[0]
                    ? `/admin/membresias?membresiaId=${selectedMember.memberships[0].id}`
                    : '/admin/membresias')}
                className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold uppercase text-xs text-center flex items-center justify-center gap-2 shadow-sm"
              >
                <CreditCard size={15} />
                Ir a Membresías &amp; Pagos
              </a>
              <button
                onClick={() => setSelectedMember(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase text-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL NUEVO SOCIO ───────────────────────────────── */}
      {newMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="text-orange-500" size={20} />
                Nuevo Socio
              </h3>
              <button onClick={() => setNewMemberModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateMembership} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">Nombre completo *</label>
                <input required type="text" placeholder="Juan Pérez" value={newName} onChange={e => setNewName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">Teléfono</label>
                <input type="text" placeholder="+593999999999" value={newPhone} onChange={e => setNewPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">Email</label>
                <input type="email" placeholder="correo@ejemplo.com" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">Plan de membresía inicial *</label>
                <select required value={newPlanId} onChange={e => setNewPlanId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-orange-500 font-semibold">
                  <option value="">Seleccionar plan...</option>
                  {plans.map(p => <option key={p.id} value={p.id}>{p.name} — ${p.price} ({p.durationDays} días)</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">Método de pago</label>
                <select value={newPayMethod} onChange={e => setNewPayMethod(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-orange-500 font-semibold">
                  {['EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'QR', 'OTRO'].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setNewMemberModal(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Cancelar</button>
                <button type="submit" disabled={isProcessing}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50 shadow-sm">
                  {isProcessing ? 'Creando...' : 'Crear Socio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
