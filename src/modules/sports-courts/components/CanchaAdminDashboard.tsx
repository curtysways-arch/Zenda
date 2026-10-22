// src/modules/sports-courts/components/CanchaAdminDashboard.tsx
'use client';
/**
 * Panel de canchas: todo lo del día en una pantalla y con un toque por acción.
 *  - Arriba: lo que pide atención (reservas por confirmar).
 *  - Indicadores: reservas, ocupación, cobrado y por cobrar.
 *  - "Ahora": qué pasa en cada cancha en este momento (solo hoy).
 *  - Lista del día (ideal en el celular) o Agenda por cancha (ideal en computadora).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft, ChevronRight, Plus, Lock, RefreshCw, Check, X, Wallet, Phone, MessageCircle,
  Clock, CalendarDays, List, LayoutGrid, Settings, AlertTriangle, Play, Flag, MoreHorizontal, Zap,
} from 'lucide-react';
import ResourceScheduleGrid, { GridAppointmentItem } from '@/components/admin/ResourceScheduleGrid';
import AppointmentDrawer from '@/components/admin/AppointmentDrawer';
import QuickBlockModal from '@/components/admin/QuickBlockModal';
import QuickBookingModal from '@/components/admin/QuickBookingModal';
import { OperableResource } from '@/core/resources/types';

export interface CanchaAdminDashboardProps {
  negocio: any;
}

type Settings = { autoConfirm: boolean; minutosParaConfirmar: number; apertura: string; cierre: string };

const money = (n: any) => `$${(Number(n) || 0).toFixed(2)}`;
const todayEc = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil' }).format(new Date());
const addDays = (dateStr: string, n: number) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
};
const toMin = (t: string) => {
  const m = String(t || '').match(/^(\d{1,2}):(\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : 0;
};
const nowMinEc = () => {
  const s = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Guayaquil', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
  return toMin(s);
};
const isPending = (s: string) => ['pending', 'PENDIENTE', 'pendiente', 'solicitada'].includes(String(s));
const isCancelled = (s: string) => ['cancelled', 'CANCELADA', 'rejected', 'RECHAZADA', 'expired', 'EXPIRADA', 'no_show'].includes(String(s));
const waUrl = (phone?: string) => {
  if (!phone) return null;
  let d = phone.replace(/\D/g, '');
  if (d.startsWith('0')) d = '593' + d.slice(1);
  return d.length >= 9 ? `https://wa.me/${d}` : null;
};

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Por confirmar', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  confirmed: { label: 'Confirmada', cls: 'bg-sky-50 text-sky-700 ring-sky-200' },
  client_checked_in: { label: 'Llegó', cls: 'bg-violet-50 text-violet-700 ring-violet-200' },
  in_progress: { label: 'Jugando', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  completed: { label: 'Terminada', cls: 'bg-slate-100 text-slate-600 ring-slate-200' },
  no_show: { label: 'No vino', cls: 'bg-rose-50 text-rose-700 ring-rose-200' },
  cancelled: { label: 'Cancelada', cls: 'bg-slate-100 text-slate-500 ring-slate-200' },
};

export default function CanchaAdminDashboard({ negocio }: CanchaAdminDashboardProps) {
  const brand: string = negocio?.colorPrimario || '#16a34a';
  const [today, setToday] = useState(todayEc());
  const [date, setDate] = useState(today);
  const [resources, setResources] = useState<OperableResource[]>([]);
  const [appointments, setAppointments] = useState<GridAppointmentItem[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'lista' | 'agenda'>('lista');
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; err?: boolean } | null>(null);
  const [nowMin, setNowMin] = useState(nowMinEc());

  const [drawer, setDrawer] = useState<GridAppointmentItem | null>(null);
  const [reserve, setReserve] = useState<{ resourceId: string; time: string } | null>(null);
  const [block, setBlock] = useState<{ resourceId: string; time: string } | null>(null);
  const [pay, setPay] = useState<GridAppointmentItem | null>(null);
  const [confirmAct, setConfirmAct] = useState<{ app: GridAppointmentItem; estado: string; title: string; text: string; ok: string } | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Vista por defecto: lista en el celular, agenda en la computadora (y se recuerda)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('canchas_view');
      if (saved === 'lista' || saved === 'agenda') setView(saved);
      else if (window.innerWidth >= 1024) setView('agenda');
    } catch {}
  }, []);
  const changeView = (v: 'lista' | 'agenda') => {
    setView(v);
    try { localStorage.setItem('canchas_view', v); } catch {}
  };

  const notify = (msg: string, err = false) => {
    setToast({ msg, err });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async (d: string, quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await fetch(`/api/admin/canchas/grilla?date=${d}`, { cache: 'no-store' });
      if (res.ok) {
        const j = await res.json();
        setResources(j.resources || []);
        setAppointments(j.appointments || []);
        if (j.settings) setSettings(j.settings);
        if (j.today) setToday(j.today);
        setDrawer((prev) => (prev ? (j.appointments || []).find((a: any) => a.id === prev.id) || prev : null));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(date); }, [date, load]);
  // Se actualiza solo cada 30 s (llegan reservas de la web)
  useEffect(() => {
    const t = setInterval(() => { load(date, true); setNowMin(nowMinEc()); }, 30000);
    return () => clearInterval(t);
  }, [date, load]);

  const setEstado = async (app: GridAppointmentItem, estado: string) => {
    setBusy(app.id);
    try {
      const r = await fetch(`/api/appointments/${app.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) notify(d.error || 'No se pudo actualizar.', true);
      else notify({ confirmed: 'Reserva confirmada. Le avisamos al cliente.', cancelled: 'Reserva cancelada.', in_progress: 'A jugar.', completed: 'Turno terminado.', no_show: 'Marcada como no vino.' }[estado] || 'Listo.');
      await load(date, true);
    } finally {
      setBusy(null);
    }
  };

  /* ── Derivados ── */
  const reservas = appointments.filter((a) => !a.isBlock && a.status !== 'blocked');
  const activas = reservas.filter((a) => !isCancelled(a.status));
  const pendientes = activas.filter((a) => isPending(a.status));
  const cobrado = activas.reduce((s, a) => s + Number(a.totalPagado || 0), 0);
  const porCobrar = activas.reduce((s, a) => s + Number(a.saldoPendiente ?? Math.max(0, Number(a.price || 0) - Number(a.totalPagado || 0))), 0);

  const apertura = settings?.apertura || '08:00';
  const cierre = settings?.cierre || '22:00';
  const openMin = toMin(apertura);
  let closeMin = toMin(cierre);
  if (closeMin <= openMin) closeMin += 24 * 60;
  const horasDia = Math.max(1, (closeMin - openMin) / 60) * Math.max(1, resources.length);
  const horasOcupadas = activas.reduce((s, a) => {
    let e = toMin(a.endTime);
    const st = toMin(a.startTime);
    if (e <= st) e += 24 * 60;
    return s + (e - st) / 60;
  }, 0);
  const ocupacion = Math.min(100, Math.round((horasOcupadas / horasDia) * 100));

  const isToday = date === today;
  const ahora = useMemo(() => {
    if (!isToday) return [];
    return resources.map((r) => {
      const items = appointments.filter((a) => a.resourceId === r.id && !isCancelled(a.status));
      const current = items.find((a) => toMin(a.startTime) <= nowMin && nowMin < (toMin(a.endTime) || 24 * 60));
      const next = items.filter((a) => toMin(a.startTime) > nowMin).sort((a, b) => a.startTime.localeCompare(b.startTime))[0];
      return { r, current, next };
    });
  }, [isToday, resources, appointments, nowMin]);

  const lista = [...appointments].sort((a, b) => a.startTime.localeCompare(b.startTime) || String(a.canchaNombre).localeCompare(String(b.canchaNombre)));
  const courtName = (id: string) => resources.find((r) => r.id === id)?.name || 'Cancha';
  const startHour = Math.max(0, Math.floor(openMin / 60));
  const endHour = Math.min(24, Math.ceil(closeMin / 60));
  const granularity = resources.some((r: any) => Number(r.metadata?.duracion) === 90) ? 90 : 60;

  const fechaLarga = (() => {
    const [y, m, d] = date.split('-').map(Number);
    const s = new Date(y, m - 1, d).toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  })();

  return (
    <div className="space-y-5 pb-16">
      {/* Encabezado + fecha */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-slate-500">{negocio?.nombre || 'Mis canchas'}</p>
          <h1 className="text-2xl font-bold text-slate-900">{isToday ? 'Hoy' : date === addDays(today, 1) ? 'Mañana' : 'Reservas'} · <span className="font-medium text-slate-600">{fechaLarga}</span></h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-white ring-1 ring-slate-200 rounded-xl">
            <button onClick={() => setDate(addDays(date, -1))} className="p-2.5 text-slate-500 hover:text-slate-900" aria-label="Día anterior"><ChevronLeft size={18} /></button>
            <button onClick={() => setDate(today)} className={`px-3 py-2 text-sm font-semibold rounded-lg ${isToday ? 'text-white' : 'text-slate-700'}`} style={isToday ? { backgroundColor: brand } : undefined}>Hoy</button>
            <button onClick={() => setDate(addDays(today, 1))} className={`px-3 py-2 text-sm font-semibold rounded-lg ${date === addDays(today, 1) ? 'text-white' : 'text-slate-700'}`} style={date === addDays(today, 1) ? { backgroundColor: brand } : undefined}>Mañana</button>
            <label className="relative p-2.5 text-slate-500 hover:text-slate-900 cursor-pointer" aria-label="Elegir fecha">
              <CalendarDays size={18} />
              <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
            </label>
            <button onClick={() => setDate(addDays(date, 1))} className="p-2.5 text-slate-500 hover:text-slate-900" aria-label="Día siguiente"><ChevronRight size={18} /></button>
          </div>
          <button
            onClick={() => setReserve({ resourceId: resources[0]?.id || '', time: isToday ? `${String(Math.min(23, Math.floor(nowMin / 60) + 1)).padStart(2, '0')}:00` : apertura })}
            disabled={!resources.length}
            style={{ backgroundColor: brand }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
          >
            <Plus size={16} /> Nueva reserva
          </button>
          <button onClick={() => setBlock({ resourceId: resources[0]?.id || '', time: apertura })} disabled={!resources.length} className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white ring-1 ring-slate-200 text-slate-700 text-sm font-medium disabled:opacity-50">
            <Lock size={15} /> Bloquear
          </button>
          <button onClick={() => setShowSettings(true)} className="p-2.5 rounded-xl bg-white ring-1 ring-slate-200 text-slate-600" aria-label="Ajustes"><Settings size={16} /></button>
          <button onClick={() => load(date)} className="p-2.5 rounded-xl bg-white ring-1 ring-slate-200 text-slate-600" aria-label="Actualizar"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
        </div>
      </div>

      {/* Sin canchas */}
      {!loading && resources.length === 0 && (
        <div className="bg-white rounded-2xl ring-1 ring-slate-200 p-8 text-center">
          <p className="font-semibold text-slate-900">Primero crea tus canchas</p>
          <p className="text-sm text-slate-500 mt-1">Ponles nombre, tipo y precio por hora. Después ya puedes recibir reservas.</p>
          <Link href="/admin/canchas" style={{ backgroundColor: brand }} className="inline-flex mt-4 px-4 py-2.5 rounded-xl text-white text-sm font-semibold">Crear canchas</Link>
        </div>
      )}

      {/* Confirmación manual: avisar que las reservas web vencen */}
      {settings && !settings.autoConfirm && resources.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl bg-slate-900 text-white">
          <Zap size={18} className="text-amber-300 shrink-0" />
          <p className="flex-1 text-sm">
            Las reservas de tu página quedan <b>por confirmar</b> y se anulan si no respondes en {settings.minutosParaConfirmar} min. Para no perder clientes, confírmalas automáticamente.
          </p>
          <button
            onClick={async () => {
              const r = await fetch('/api/admin/canchas/grilla', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'SET_AUTO_CONFIRM', autoConfirm: true }) });
              if (r.ok) { notify('Listo: las reservas de tu página se confirman solas.'); load(date, true); } else notify('No se pudo guardar.', true);
            }}
            className="px-4 py-2 rounded-xl bg-white text-slate-900 text-sm font-semibold shrink-0"
          >
            Confirmar automáticamente
          </button>
        </div>
      )}

      {/* Por confirmar */}
      {pendientes.length > 0 && (
        <section className="rounded-2xl ring-1 ring-amber-200 bg-amber-50/60">
          <p className="px-4 pt-3 pb-1 text-sm font-semibold text-amber-900 flex items-center gap-2">
            <AlertTriangle size={16} /> {pendientes.length === 1 ? '1 reserva por confirmar' : `${pendientes.length} reservas por confirmar`}
          </p>
          <ul className="divide-y divide-amber-100">
            {pendientes.map((a) => (
              <li key={a.id} className="px-4 py-2.5 flex flex-wrap items-center gap-3">
                <span className="font-mono text-sm font-semibold text-slate-900">{a.startTime}–{a.endTime}</span>
                <span className="flex-1 min-w-[140px] text-sm text-slate-700">{a.clientName} · {courtName(a.resourceId)}</span>
                <span className="text-sm font-semibold tabular-nums">{money(a.price)}</span>
                <div className="flex gap-2">
                  <button disabled={busy === a.id} onClick={() => setEstado(a, 'confirmed')} style={{ backgroundColor: brand }} className="px-3 py-1.5 rounded-lg text-white text-sm font-semibold disabled:opacity-60">Confirmar</button>
                  <button disabled={busy === a.id} onClick={() => setConfirmAct({ app: a, estado: 'cancelled', title: 'Rechazar reserva', text: `${a.clientName} · ${a.startTime}. Le avisaremos que no pudo confirmarse.`, ok: 'Rechazar' })} className="px-3 py-1.5 rounded-lg bg-white ring-1 ring-slate-200 text-sm text-slate-600">Rechazar</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Indicadores */}
      {resources.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Reservas', value: String(activas.length), sub: pendientes.length ? `${pendientes.length} por confirmar` : 'Todas confirmadas' },
            { label: 'Ocupación', value: `${ocupacion}%`, sub: `${horasOcupadas.toFixed(horasOcupadas % 1 ? 1 : 0)} de ${Math.round(horasDia)} horas` },
            { label: 'Cobrado', value: money(cobrado), sub: 'Pagos registrados' },
            { label: 'Por cobrar', value: money(porCobrar), sub: 'Saldo de las reservas', warn: porCobrar > 0 },
          ].map((k) => (
            <div key={k.label} className="bg-white rounded-2xl ring-1 ring-slate-200/80 p-4">
              <p className="text-sm text-slate-500">{k.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{k.value}</p>
              <p className={`text-xs mt-0.5 ${k.warn ? 'text-amber-600' : 'text-slate-500'}`}>{k.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Ahora */}
      {isToday && ahora.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {ahora.map(({ r, current, next }) => {
            const blocked = current && (current.isBlock || current.status === 'blocked');
            return (
              <button
                key={r.id}
                onClick={() => (current && !blocked ? setDrawer(current) : setReserve({ resourceId: r.id, time: `${String(Math.min(23, Math.floor(nowMin / 60) + (nowMin % 60 ? 1 : 0))).padStart(2, '0')}:00` }))}
                className={`shrink-0 min-w-[190px] text-left rounded-2xl p-3 ring-1 ${current ? (blocked ? 'bg-slate-100 ring-slate-200' : 'bg-emerald-50 ring-emerald-200') : 'bg-white ring-slate-200'}`}
              >
                <span className="flex items-center gap-2">
                  <span className={`size-2 rounded-full ${current ? (blocked ? 'bg-slate-400' : 'bg-emerald-500 animate-pulse') : 'bg-sky-400'}`} />
                  <span className="font-semibold text-sm text-slate-900 truncate">{r.name}</span>
                </span>
                <span className="block text-xs text-slate-600 mt-1">
                  {current
                    ? blocked ? `Bloqueada hasta ${current.endTime}` : `${current.clientName} · hasta ${current.endTime}`
                    : 'Libre ahora'}
                </span>
                <span className="block text-xs text-slate-400">{next ? `Próxima ${next.startTime}` : 'Sin más reservas hoy'}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Vista */}
      {resources.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl text-sm">
            <button onClick={() => changeView('lista')} className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 ${view === 'lista' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}><List size={15} /> Lista</button>
            <button onClick={() => changeView('agenda')} className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 ${view === 'agenda' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}><LayoutGrid size={15} /> Agenda</button>
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">{view === 'agenda' ? 'Toca un espacio libre para reservar o bloquear.' : 'Toca una reserva para ver el detalle.'}</p>
        </div>
      )}

      {resources.length > 0 && view === 'lista' && (
        lista.length === 0 ? (
          <div className="bg-white rounded-2xl ring-1 ring-slate-200 p-10 text-center">
            <p className="font-medium text-slate-700">{loading ? 'Cargando…' : 'No hay reservas este día'}</p>
            <p className="text-sm text-slate-500 mt-1">Comparte tu página para recibir reservas o crea una aquí.</p>
          </div>
        ) : (
          <ul className="bg-white rounded-2xl ring-1 ring-slate-200/80 divide-y divide-slate-100">
            {lista.map((a) => (
              <BookingRow
                key={a.id}
                a={a}
                court={courtName(a.resourceId)}
                brand={brand}
                busy={busy === a.id}
                isPast={isToday && toMin(a.endTime) <= nowMin && toMin(a.endTime) > toMin(a.startTime)}
                onOpen={() => (a.isBlock || a.status === 'blocked' ? null : setDrawer(a))}
                onEstado={(estado) => setEstado(a, estado)}
                onPay={() => setPay(a)}
                onAsk={(estado, title, text, ok) => setConfirmAct({ app: a, estado, title, text, ok })}
                onUnblock={async () => {
                  await fetch('/api/admin/canchas/grilla', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'UNBLOCK', id: a.id }) });
                  notify('Horario desbloqueado.');
                  load(date, true);
                }}
              />
            ))}
          </ul>
        )
      )}

      {resources.length > 0 && view === 'agenda' && (
        <ResourceScheduleGrid
          resources={resources}
          appointments={appointments}
          selectedDate={date}
          onDateChange={setDate}
          onSlotClick={(resourceId, time) => setReserve({ resourceId, time })}
          onAppointmentClick={(a) => setDrawer(a)}
          onBlockClick={(resourceId, time) => setBlock({ resourceId, time })}
          granularityMinutes={granularity}
          startHour={startHour}
          endHour={endHour}
          enableNightLightingFee={false}
          labels={{ resourceNameSingular: 'Cancha', resourceNamePlural: 'Canchas' }}
        />
      )}

      {/* Modales */}
      <AppointmentDrawer
        appointment={drawer}
        isOpen={!!drawer}
        onClose={() => setDrawer(null)}
        onUpdateStatus={async (id, estado) => { const a = appointments.find((x) => x.id === id); if (a) await setEstado(a, estado); }}
        onUpdatePayment={async () => { await load(date, true); }}
        onDeleteBlock={async (id) => {
          await fetch('/api/admin/canchas/grilla', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'UNBLOCK', id }) });
          load(date, true);
        }}
        onRefresh={() => load(date, true)}
      />

      <QuickBookingModal
        isOpen={!!reserve}
        onClose={() => setReserve(null)}
        resources={resources}
        selectedResourceId={reserve?.resourceId}
        selectedDate={date}
        selectedTime={reserve?.time}
        onBookingCreated={() => { notify('Reserva creada.'); load(date, true); }}
      />

      <QuickBlockModal
        isOpen={!!block}
        onClose={() => setBlock(null)}
        resources={resources}
        selectedResourceId={block?.resourceId}
        selectedDate={date}
        selectedTime={block?.time}
        onBlockCreated={() => { notify('Horario bloqueado.'); load(date, true); }}
      />

      {pay && (
        <PayModal
          a={pay}
          brand={brand}
          onClose={() => setPay(null)}
          onDone={() => { setPay(null); notify('Pago registrado.'); load(date, true); }}
          onError={(m) => notify(m, true)}
        />
      )}

      {confirmAct && (
        <div className="fixed inset-0 z-[70] bg-black/40 flex items-end sm:items-center justify-center" onClick={() => setConfirmAct(null)}>
          <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-lg">{confirmAct.title}</h3>
            <p className="text-sm text-slate-600">{confirmAct.text}</p>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setConfirmAct(null)} className="flex-1 py-3 rounded-xl ring-1 ring-slate-200 font-medium">Volver</button>
              <button
                onClick={async () => { const c = confirmAct; setConfirmAct(null); await setEstado(c.app, c.estado); }}
                className={`flex-1 py-3 rounded-xl text-white font-semibold ${['cancelled', 'no_show'].includes(confirmAct.estado) ? 'bg-rose-600' : ''}`}
                style={!['cancelled', 'no_show'].includes(confirmAct.estado) ? { backgroundColor: brand } : undefined}
              >
                {confirmAct.ok}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettings && settings && (
        <SettingsModal
          brand={brand}
          settings={settings}
          onClose={() => setShowSettings(false)}
          onSaved={(s) => { setSettings((p) => (p ? { ...p, ...s } : p)); setShowSettings(false); notify('Ajustes guardados.'); }}
          onError={(m) => notify(m, true)}
        />
      )}

      {toast && (
        <div className={`fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[90] px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg ${toast.err ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

/* ── Fila de la lista del día ───────────────────────────────────────────── */

function BookingRow({ a, court, brand, busy, isPast, onOpen, onEstado, onPay, onAsk, onUnblock }: {
  a: GridAppointmentItem; court: string; brand: string; busy: boolean; isPast: boolean;
  onOpen: () => void; onEstado: (estado: string) => void; onPay: () => void;
  onAsk: (estado: string, title: string, text: string, ok: string) => void; onUnblock: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const isBlock = a.isBlock || a.status === 'blocked';
  if (isBlock) {
    return (
      <li className="px-4 py-3 flex items-center gap-3 bg-slate-50/70">
        <span className="font-mono text-sm text-slate-500 w-24 shrink-0">{a.startTime}–{a.endTime}</span>
        <span className="flex-1 text-sm text-slate-500 flex items-center gap-1.5"><Lock size={14} /> {court} · {a.motivo || a.clientName || 'Bloqueada'}</span>
        <button onClick={onUnblock} className="text-sm text-slate-500 hover:text-slate-900">Desbloquear</button>
      </li>
    );
  }
  const st = STATUS[a.status] || STATUS.confirmed;
  const saldo = Number(a.saldoPendiente ?? Math.max(0, Number(a.price || 0) - Number(a.totalPagado || 0)));
  const paid = saldo <= 0.009 && Number(a.price || 0) > 0;
  const dead = isCancelled(a.status);
  const wa = waUrl(a.clientPhone);

  let primary: { label: string; Icon: any; run: () => void } | null = null;
  if (!dead) {
    if (isPending(a.status)) primary = { label: 'Confirmar', Icon: Check, run: () => onEstado('confirmed') };
    else if (['confirmed', 'client_checked_in'].includes(a.status) && !isPast) primary = { label: 'Empezó', Icon: Play, run: () => onEstado('in_progress') };
    else if (a.status === 'in_progress' || (a.status === 'confirmed' && isPast)) primary = { label: 'Terminar', Icon: Flag, run: () => onEstado(a.status === 'confirmed' ? 'in_progress' : 'completed') };
  }

  return (
    <li className={`px-4 py-3 ${dead ? 'opacity-50' : ''}`}>
      <div className="flex items-start gap-3">
        <button onClick={onOpen} className="w-24 shrink-0 text-left">
          <span className="block font-mono text-sm font-semibold text-slate-900">{a.startTime}–{a.endTime}</span>
          <span className="block text-xs text-slate-500 truncate">{court}</span>
        </button>
        <button onClick={onOpen} className="flex-1 min-w-0 text-left">
          <span className="block text-sm font-semibold text-slate-900 truncate">{a.clientName}</span>
          <span className="flex flex-wrap items-center gap-1.5 mt-0.5">
            <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md ring-1 ${st.cls}`}>{st.label}</span>
            {Number(a.price || 0) > 0 && (
              <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${paid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                {paid ? `Pagado ${money(a.price)}` : `Por cobrar ${money(saldo)}`}
              </span>
            )}
          </span>
        </button>
        <div className="flex items-center gap-1.5 shrink-0">
          {!dead && !paid && Number(a.price || 0) > 0 && (
            <button onClick={onPay} className="px-2.5 py-1.5 rounded-lg ring-1 ring-slate-200 text-sm font-medium text-slate-700 flex items-center gap-1"><Wallet size={14} /> <span className="hidden sm:inline">Cobrar</span></button>
          )}
          {primary && (
            <button disabled={busy} onClick={primary.run} style={{ backgroundColor: brand }} className="px-2.5 py-1.5 rounded-lg text-white text-sm font-semibold flex items-center gap-1 disabled:opacity-60">
              <primary.Icon size={14} /> <span className="hidden sm:inline">{primary.label}</span>
            </button>
          )}
          <div className="relative">
            <button onClick={() => setMenu((m) => !m)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700" aria-label="Más acciones"><MoreHorizontal size={18} /></button>
            {menu && (
              <div className="absolute right-0 top-8 z-20 w-48 bg-white rounded-xl shadow-lg ring-1 ring-slate-200 py-1 text-sm" onMouseLeave={() => setMenu(false)}>
                {wa && <a href={wa} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50"><MessageCircle size={15} /> WhatsApp</a>}
                {a.clientPhone && <a href={`tel:${a.clientPhone}`} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50"><Phone size={15} /> Llamar</a>}
                <button onClick={() => { setMenu(false); onOpen(); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50"><Clock size={15} /> Ver detalle</button>
                {!dead && (
                  <>
                    <button onClick={() => { setMenu(false); onAsk('no_show', 'Marcar que no vino', `${a.clientName} · ${a.startTime}. Queda en su historial.`, 'No vino'); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-rose-600"><X size={15} /> No vino</button>
                    <button onClick={() => { setMenu(false); onAsk('cancelled', 'Cancelar reserva', `${a.clientName} · ${a.startTime}. El horario queda libre.`, 'Cancelar reserva'); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-rose-600"><X size={15} /> Cancelar</button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

/* ── Cobrar ──────────────────────────────────────────────────────────────── */

function PayModal({ a, brand, onClose, onDone, onError }: { a: GridAppointmentItem; brand: string; onClose: () => void; onDone: () => void; onError: (m: string) => void }) {
  const saldo = Number(a.saldoPendiente ?? Math.max(0, Number(a.price || 0) - Number(a.totalPagado || 0)));
  const [monto, setMonto] = useState(saldo.toFixed(2));
  const [metodo, setMetodo] = useState('EFECTIVO');
  const [saving, setSaving] = useState(false);
  return (
    <div className="fixed inset-0 z-[70] bg-black/40 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Cobrar · {a.clientName}</h3>
          <button onClick={onClose} className="p-1 text-slate-400" aria-label="Cerrar"><X size={18} /></button>
        </div>
        <p className="text-sm text-slate-500">{a.startTime}–{a.endTime} · Total {money(a.price)} · Pagado {money(a.totalPagado)}</p>
        <div className="grid grid-cols-3 gap-2">
          {['EFECTIVO', 'TRANSFERENCIA', 'TARJETA'].map((m) => (
            <button
              key={m}
              onClick={() => setMetodo(m)}
              style={metodo === m ? { borderColor: brand, color: brand, backgroundColor: `${brand}0D` } : undefined}
              className={`py-2 rounded-xl border-2 text-sm font-medium ${metodo === m ? '' : 'border-slate-200 text-slate-600'}`}
            >
              {m.charAt(0) + m.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <label className="block">
          <span className="text-sm text-slate-600">Monto</span>
          <input value={monto} onChange={(e) => setMonto(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" className="mt-1 w-full px-3 py-2.5 rounded-xl ring-1 ring-slate-200 text-lg font-semibold outline-none focus:ring-2" />
        </label>
        <button
          disabled={saving || !(Number(monto) > 0)}
          onClick={async () => {
            setSaving(true);
            try {
              const r = await fetch(`/api/appointments/${a.id}/pagos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ monto: Number(monto), metodo }) });
              const d = await r.json().catch(() => ({}));
              if (!r.ok) return onError(d.error || 'No se pudo registrar el pago.');
              onDone();
            } finally {
              setSaving(false);
            }
          }}
          style={{ backgroundColor: brand }}
          className="w-full py-3 rounded-xl text-white font-semibold disabled:opacity-60"
        >
          {saving ? 'Guardando…' : `Registrar ${money(Number(monto) || 0)}`}
        </button>
      </div>
    </div>
  );
}

/* ── Ajustes ─────────────────────────────────────────────────────────────── */

function SettingsModal({ brand, settings, onClose, onSaved, onError }: {
  brand: string; settings: Settings; onClose: () => void; onSaved: (s: Partial<Settings>) => void; onError: (m: string) => void;
}) {
  const [auto, setAuto] = useState(settings.autoConfirm);
  const [mins, setMins] = useState(settings.minutosParaConfirmar || 30);
  const [saving, setSaving] = useState(false);
  return (
    <div className="fixed inset-0 z-[70] bg-black/40 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Ajustes de reservas</h3>
          <button onClick={onClose} className="p-1 text-slate-400" aria-label="Cerrar"><X size={18} /></button>
        </div>
        <p className="text-sm font-medium text-slate-700">Reservas que llegan por tu página</p>
        <div className="space-y-2">
          <button onClick={() => setAuto(true)} style={auto ? { borderColor: brand, backgroundColor: `${brand}0D` } : undefined} className={`w-full text-left p-3 rounded-xl border-2 ${auto ? '' : 'border-slate-200'}`}>
            <span className="block font-semibold">Confirmar automáticamente <span className="text-xs font-normal text-emerald-600">(recomendado)</span></span>
            <span className="block text-sm text-slate-500">Si el horario está libre, el cliente queda reservado al instante.</span>
          </button>
          <button onClick={() => setAuto(false)} style={!auto ? { borderColor: brand, backgroundColor: `${brand}0D` } : undefined} className={`w-full text-left p-3 rounded-xl border-2 ${!auto ? '' : 'border-slate-200'}`}>
            <span className="block font-semibold">Las confirmo yo</span>
            <span className="block text-sm text-slate-500">Si no respondes a tiempo, la reserva se anula y el horario se libera.</span>
            {!auto && (
              <span className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                Tengo
                <select value={mins} onChange={(e) => setMins(Number(e.target.value))} className="px-2 py-1 rounded-lg ring-1 ring-slate-200 bg-white" onClick={(e) => e.stopPropagation()}>
                  {[10, 15, 30, 60, 120].map((m) => <option key={m} value={m}>{m < 60 ? `${m} min` : `${m / 60} h`}</option>)}
                </select>
                para confirmar
              </span>
            )}
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Horario de atención: {settings.apertura} a {settings.cierre}. Se cambia en <Link href="/admin/config" className="underline">Configuración</Link>. Tus canchas y precios, en <Link href="/admin/canchas" className="underline">Canchas</Link>.
        </p>
        <button
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            try {
              const r = await fetch('/api/admin/canchas/grilla', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'SET_AUTO_CONFIRM', autoConfirm: auto, minutos: mins }) });
              const d = await r.json().catch(() => ({}));
              if (!r.ok) return onError(d.error || 'No se pudo guardar.');
              onSaved({ autoConfirm: d.autoConfirm, minutosParaConfirmar: d.minutosParaConfirmar });
            } finally {
              setSaving(false);
            }
          }}
          style={{ backgroundColor: brand }}
          className="w-full py-3 rounded-xl text-white font-semibold disabled:opacity-60"
        >
          Guardar
        </button>
      </div>
    </div>
  );
}
