'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, CalendarPlus, List, Clock, AlertTriangle, CalendarDays } from 'lucide-react';
import { api } from '../../../lib/api';
import { apptState } from '../../../lib/format';
import { Page, Button, Badge, Spinner, ErrorBox, useToast, cx } from '../ui';
import BookingModal from '../patient/BookingModal';
import AppointmentPanel from './AppointmentPanel';
import {
  AgendaAppt, AgendaBlock, DONE, INACTIVE, addDays, dayLabel, layoutLanes, stateBorder, stateStyle, toHM, toMin, weekStart,
} from './agendaUtils';

type Data = {
  today: string;
  nowTime: string;
  hours: { open: string; close: string };
  pendingTotal: number;
  staff: { id: string; name: string; role: string | null }[];
  blocks: AgendaBlock[];
  appointments: AgendaAppt[];
};

type View = 'dia' | 'semana';
const PX = 1.4; // píxeles por minuto (30 min = 42 px)
const UNASSIGNED = '__sin_doctor__';

function keyOf(fecha: string) {
  return new Date(fecha).toISOString().slice(0, 10);
}

function useIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const q = window.matchMedia('(max-width: 767px)');
    const on = () => setM(q.matches);
    on();
    q.addEventListener('change', on);
    return () => q.removeEventListener('change', on);
  }, []);
  return m;
}

export default function DentalAgenda() {
  const toast = useToast();
  const isMobile = useIsMobile();
  const [view, setView] = useState<View>('dia');
  const [date, setDate] = useState<string | null>(null);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [doctorFilter, setDoctorFilter] = useState<string>('ALL');
  const [showCancelled, setShowCancelled] = useState(false);
  const [selected, setSelected] = useState<AgendaAppt | null>(null);
  const [booking, setBooking] = useState<{ fecha?: string; hora?: string; staffId?: string | null } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const didScroll = useRef(false);

  const effectiveView: View = isMobile ? 'dia' : view;
  const anchor = date || data?.today || null;
  const range = useMemo(() => {
    if (!anchor) return null;
    if (effectiveView === 'semana') {
      const from = weekStart(anchor);
      return { from, to: addDays(from, 6) };
    }
    return { from: anchor, to: anchor };
  }, [anchor, effectiveView]);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const qs = range ? `?from=${range.from}&to=${range.to}` : '';
      const d = await api<Data>(`/api/admin/dental/agenda${qs}`);
      setData(d);
      if (!date) setDate(d.today);
      setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [range, date]);

  useEffect(() => { load(); }, [range?.from, range?.to]); // eslint-disable-line react-hooks/exhaustive-deps

  // Actualizar sola cada minuto y al volver a la pestaña (nuevas reservas desde la página web).
  useEffect(() => {
    const t = setInterval(() => load(true), 60000);
    const onFocus = () => load(true);
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(t); window.removeEventListener('focus', onFocus); };
  }, [load]);

  const appts = useMemo(() => {
    if (!data) return [];
    return data.appointments.filter((a) => {
      if (!showCancelled && INACTIVE.includes(a.estado)) return false;
      if (doctorFilter !== 'ALL') {
        if (doctorFilter === UNASSIGNED ? a.staffId : a.staffId !== doctorFilter) return false;
      }
      return true;
    });
  }, [data, showCancelled, doctorFilter]);

  // Rango de horas visible: horario de la clínica, ampliado si hay citas fuera de él.
  const grid = useMemo(() => {
    const open = toMin(data?.hours.open || '08:00');
    const close = toMin(data?.hours.close || '19:00');
    let start = Math.floor(Math.min(open, ...appts.map((a) => toMin(a.horaInicio))) / 60) * 60;
    let end = Math.ceil(Math.max(close, ...appts.map((a) => toMin(a.horaFin))) / 60) * 60;
    if (!Number.isFinite(start) || start >= end) { start = 8 * 60; end = 19 * 60; }
    return { start, end, open, close };
  }, [data, appts]);

  const hasUnassigned = useMemo(() => (data?.appointments || []).some((a) => !a.staffId && !INACTIVE.includes(a.estado)), [data]);

  const columns = useMemo(() => {
    if (!data || !range) return [];
    if (effectiveView === 'semana') {
      return Array.from({ length: 7 }, (_, i) => {
        const k = addDays(range.from, i);
        return { id: k, title: dayLabel(k, { weekday: 'short' }), subtitle: dayLabel(k, { day: 'numeric', month: 'short' }), day: k, staffId: null as string | null };
      });
    }
    const docs = data.staff
      .filter((s) => doctorFilter === 'ALL' || doctorFilter === s.id)
      .map((s) => ({ id: s.id, title: s.name, subtitle: s.role && s.role !== 'DENTISTA' ? s.role : 'Odontólogo/a', day: range.from, staffId: s.id as string | null }));
    if ((doctorFilter === 'ALL' && hasUnassigned) || doctorFilter === UNASSIGNED || docs.length === 0) {
      docs.push({ id: UNASSIGNED, title: data.staff.length ? 'Sin doctor asignado' : 'Citas', subtitle: '', day: range.from, staffId: null });
    }
    return docs;
  }, [data, range, effectiveView, doctorFilter, hasUnassigned]);

  const itemsFor = (col: { id: string; day: string }) =>
    appts.filter((a) => keyOf(a.fecha) === col.day && (effectiveView === 'semana' || (col.id === UNASSIGNED ? !a.staffId : a.staffId === col.id)));

  const blocksFor = (col: { id: string; day: string; staffId: string | null }) =>
    (data?.blocks || []).filter((b) => keyOf(b.fecha) === col.day && (effectiveView === 'semana' || !b.staffId || b.staffId === col.staffId));

  // Llevar la vista a la hora actual (o al inicio del horario) la primera vez.
  useEffect(() => {
    if (!data || !scrollRef.current || didScroll.current) return;
    didScroll.current = true;
    const target = anchor === data.today ? toMin(data.nowTime) - 60 : grid.open;
    scrollRef.current.scrollTop = Math.max(0, (target - grid.start) * PX);
  }, [data, grid, anchor]);

  const dayAppts = useMemo(() => appts.filter((a) => range && keyOf(a.fecha) >= range.from && keyOf(a.fecha) <= range.to), [appts, range]);
  const summary = useMemo(() => ({
    total: dayAppts.filter((a) => !INACTIVE.includes(a.estado)).length,
    pending: dayAppts.filter((a) => ['pending', 'PENDIENTE', 'pendiente'].includes(a.estado)).length,
    done: dayAppts.filter((a) => DONE.includes(a.estado)).length,
  }), [dayAppts]);

  const go = (delta: number) => anchor && setDate(addDays(anchor, effectiveView === 'semana' ? delta * 7 : delta));

  const onGridClick = (e: React.MouseEvent<HTMLDivElement>, col: { day: string; staffId: string | null }) => {
    if (e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const min = grid.start + Math.floor((e.clientY - rect.top) / PX / 15) * 15;
    setBooking({ fecha: col.day, hora: toHM(min), staffId: col.staffId });
  };

  const changed = (message: string) => {
    setSelected(null);
    setBooking(null);
    toast.show(message);
    load(true);
  };

  const title = anchor
    ? effectiveView === 'semana' && range
      ? `${dayLabel(range.from, { day: 'numeric', month: 'short' })} – ${dayLabel(range.to, { day: 'numeric', month: 'short', year: 'numeric' })}`
      : dayLabel(anchor, { weekday: 'long', day: 'numeric', month: 'long' })
    : 'Agenda';
  const isToday = anchor === data?.today;
  const nowMin = data ? toMin(data.nowTime) : 0;
  const hours: number[] = [];
  for (let m = grid.start; m < grid.end; m += 60) hours.push(m);
  const gridHeight = (grid.end - grid.start) * PX;

  return (
    <Page className="max-w-[1400px]">
      {/* Encabezado */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{isToday ? 'Hoy' : effectiveView === 'semana' ? 'Semana' : 'Agenda'}</p>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xl bg-white ring-1 ring-inset ring-slate-200">
            <button type="button" onClick={() => go(-1)} className="rounded-l-xl p-2.5 text-slate-600 hover:bg-slate-50" aria-label="Anterior"><ChevronLeft className="h-4 w-4" /></button>
            <button type="button" onClick={() => data && setDate(data.today)} disabled={isToday} className="border-x border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:text-slate-400">Hoy</button>
            <button type="button" onClick={() => go(1)} className="rounded-r-xl p-2.5 text-slate-600 hover:bg-slate-50" aria-label="Siguiente"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <label className="relative inline-flex items-center rounded-xl bg-white p-2.5 text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50" title="Elegir fecha">
            <CalendarDays className="h-4 w-4" />
            <input type="date" value={anchor || ''} onChange={(e) => e.target.value && setDate(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Elegir fecha" />
          </label>
          <div className="hidden rounded-xl bg-slate-100 p-1 text-sm font-medium md:inline-flex">
            {(['dia', 'semana'] as View[]).map((v) => (
              <button key={v} type="button" onClick={() => setView(v)} className={cx('rounded-lg px-3 py-1.5', view === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}>
                {v === 'dia' ? 'Día' : 'Semana'}
              </button>
            ))}
          </div>
          <Button icon={<CalendarPlus className="h-4 w-4" />} onClick={() => setBooking({ fecha: anchor && anchor >= (data?.today || '') ? anchor : data?.today })}>
            Nueva cita
          </Button>
        </div>
      </div>

      {/* Resumen y filtros */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {[{ id: 'ALL', name: 'Todos los doctores' }, ...(data?.staff || []), ...(hasUnassigned ? [{ id: UNASSIGNED, name: 'Sin doctor' }] : [])].map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDoctorFilter(d.id)}
              className={cx('shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition', doctorFilter === d.id ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50')}
            >
              {d.name}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
          <span><strong className="text-slate-900">{summary.total}</strong> cita{summary.total === 1 ? '' : 's'}</span>
          {summary.pending > 0 && <span className="text-amber-700"><strong>{summary.pending}</strong> por confirmar</span>}
          <span className="text-emerald-700"><strong>{summary.done}</strong> atendida{summary.done === 1 ? '' : 's'}</span>
          <label className="inline-flex items-center gap-1.5">
            <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
            Ver canceladas
          </label>
          <Link href="/admin/citas?vista=lista" className="inline-flex items-center gap-1 font-medium text-sky-700 hover:underline"><List className="h-4 w-4" /> Lista completa</Link>
        </div>
      </div>

      {data && data.pendingTotal > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Hay {data.pendingTotal} solicitud{data.pendingTotal === 1 ? '' : 'es'} de cita por confirmar (hoy y próximos días). Tócalas en la agenda para confirmarlas.
        </div>
      )}

      {error && <ErrorBox message={error} onRetry={() => load()} />}

      {loading && !data ? (
        <Spinner label="Cargando agenda…" />
      ) : isMobile ? (
        /* ── Celular: lista del día ── */
        <MobileDay
          appts={dayAppts.filter((a) => keyOf(a.fecha) === anchor)}
          blocks={(data?.blocks || []).filter((b) => anchor && keyOf(b.fecha) === anchor)}
          isToday={isToday}
          nowMin={nowMin}
          onSelect={setSelected}
          onNew={() => setBooking({ fecha: anchor && anchor >= (data?.today || '') ? anchor : data?.today })}
        />
      ) : (
        /* ── Escritorio: grilla por doctor (día) o por día (semana) ── */
        <div className={cx('overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm', loading && 'opacity-70')}>
          <div ref={scrollRef} className="max-h-[calc(100vh-290px)] min-h-[420px] overflow-auto">
            <div className="sticky top-0 z-30 flex border-b border-slate-200 bg-slate-50">
              <div className="sticky left-0 z-10 w-16 shrink-0 bg-slate-50" />
              {columns.map((c) => (
                <div key={c.id} className={cx('min-w-[160px] flex-1 border-l border-slate-200 px-3 py-2.5', effectiveView === 'semana' && c.day === data?.today && 'bg-sky-50')}>
                  <p className={cx('truncate text-sm font-semibold', effectiveView === 'semana' && c.day === data?.today ? 'text-sky-700' : 'text-slate-900')}>{c.title}</p>
                  {c.subtitle && <p className="truncate text-xs text-slate-500">{c.subtitle}</p>}
                </div>
              ))}
            </div>
            <div className="flex" style={{ height: gridHeight }}>
              {/* Horas */}
              <div className="sticky left-0 z-20 w-16 shrink-0 bg-white">
                {hours.map((m) => (
                  <span key={m} className="absolute right-2 -translate-y-1/2 text-xs tabular-nums text-slate-400" style={{ top: (m - grid.start) * PX }}>
                    {m === grid.start ? '' : toHM(m)}
                  </span>
                ))}
              </div>
              {columns.map((col) => (
                <div
                  key={col.id}
                  onClick={(e) => onGridClick(e, col)}
                  className="relative min-w-[160px] flex-1 cursor-copy border-l border-slate-200"
                  style={{
                    backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${30 * PX - 1}px, rgb(241 245 249) ${30 * PX - 1}px, rgb(241 245 249) ${30 * PX}px)`,
                  }}
                  title="Toca un espacio libre para agendar"
                >
                  {/* Fuera del horario de atención */}
                  {grid.open > grid.start && <div className="pointer-events-none absolute inset-x-0 top-0 bg-slate-100/70" style={{ height: (grid.open - grid.start) * PX }} />}
                  {grid.close < grid.end && <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-slate-100/70" style={{ height: (grid.end - grid.close) * PX }} />}

                  {/* Bloqueos */}
                  {blocksFor(col).map((b) => (
                    <div
                      key={b.id}
                      className="pointer-events-none absolute inset-x-1 overflow-hidden rounded-lg border border-dashed border-slate-300 px-2 py-1 text-xs text-slate-500"
                      style={{
                        top: (toMin(b.horaInicio) - grid.start) * PX,
                        height: Math.max(18, (toMin(b.horaFin) - toMin(b.horaInicio)) * PX),
                        backgroundImage: 'repeating-linear-gradient(45deg, rgb(248 250 252) 0, rgb(248 250 252) 6px, rgb(241 245 249) 6px, rgb(241 245 249) 12px)',
                      }}
                    >
                      {b.motivo || 'No disponible'}
                    </div>
                  ))}

                  {/* Línea de la hora actual */}
                  {col.day === data?.today && nowMin >= grid.start && nowMin <= grid.end && (
                    <div className="pointer-events-none absolute inset-x-0 z-[4] border-t-2 border-rose-500" style={{ top: (nowMin - grid.start) * PX }}>
                      <span className="absolute -left-1 -top-[5px] h-2 w-2 rounded-full bg-rose-500" />
                    </div>
                  )}

                  {/* Citas */}
                  {layoutLanes(itemsFor(col)).map(({ item: a, lane, lanes }) => {
                    const top = (toMin(a.horaInicio) - grid.start) * PX;
                    const height = Math.max(24, (toMin(a.horaFin) - toMin(a.horaInicio)) * PX - 2);
                    const compact = height < 44;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setSelected(a)}
                        className={cx('absolute z-[5] flex flex-col items-stretch justify-start overflow-hidden rounded-lg border-l-4 px-2 py-1 text-left shadow-sm ring-1 ring-black/5 transition hover:z-20 hover:shadow-md', stateStyle(a.estado))}
                        style={{ top, height, left: `calc(${(lane / lanes) * 100}% + 3px)`, width: `calc(${100 / lanes}% - 6px)` }}
                        title={`${a.horaInicio}–${a.horaFin} · ${a.cliente?.nombre || ''} · ${a.service?.nombre || ''} · ${apptState(a.estado).label}`}
                      >
                        <p className={cx('truncate text-xs font-semibold', compact && 'inline')}>
                          <span className="tabular-nums opacity-70">{a.horaInicio}</span> {a.cliente?.nombre || 'Paciente'}
                        </p>
                        {!compact && <p className="truncate text-xs opacity-80">{a.service?.nombre}{effectiveView === 'semana' && a.staff?.name ? ` · ${a.staff.name}` : ''}</p>}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500">
            {[['bg-amber-500', 'Por confirmar'], ['bg-sky-500', 'Confirmada'], ['bg-violet-500', 'En atención'], ['bg-emerald-500', 'Atendida']].map(([c, l]) => (
              <span key={l} className="inline-flex items-center gap-1.5"><span className={cx('h-2.5 w-2.5 rounded-sm', c)} />{l}</span>
            ))}
            <span className="ml-auto">Toca un espacio libre para agendar en ese horario.</span>
          </div>
        </div>
      )}

      <AppointmentPanel appt={selected} onClose={() => setSelected(null)} onChanged={changed} onError={(m) => toast.show(m, 'error')} />
      <BookingModal open={Boolean(booking)} onClose={() => setBooking(null)} preset={booking} onSaved={changed} />
      {toast.node}
    </Page>
  );
}

/** Vista del día en celular: lista por hora, fácil de tocar. */
function MobileDay({
  appts, blocks, isToday, nowMin, onSelect, onNew,
}: {
  appts: AgendaAppt[];
  blocks: AgendaBlock[];
  isToday: boolean;
  nowMin: number;
  onSelect: (a: AgendaAppt) => void;
  onNew: () => void;
}) {
  const items = [...appts].sort((a, b) => toMin(a.horaInicio) - toMin(b.horaInicio));
  if (!items.length && !blocks.length) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
        <Clock className="mb-3 h-10 w-10 text-slate-300" />
        <p className="font-semibold text-slate-700">Sin citas este día</p>
        <p className="mt-1 text-sm text-slate-500">Agenda una cita o cambia de día con las flechas.</p>
        <Button className="mt-4" icon={<CalendarPlus className="h-4 w-4" />} onClick={onNew}>Nueva cita</Button>
      </div>
    );
  }
  // Citas y bloqueos en un solo listado ordenado por hora.
  const entries = [
    ...items.map((a) => ({ kind: 'appt' as const, start: toMin(a.horaInicio), appt: a })),
    ...blocks.map((b) => ({ kind: 'block' as const, start: toMin(b.horaInicio), block: b })),
  ].sort((x, y) => x.start - y.start);
  let nowShown = !isToday;
  return (
    <ul className="space-y-2">
      {entries.map((e) => {
        const showNow = !nowShown && e.start >= nowMin;
        if (showNow) nowShown = true;
        const nowLine = showNow ? (
          <li className="flex items-center gap-2 py-1 text-xs font-semibold text-rose-600">
            <span className="h-2 w-2 rounded-full bg-rose-500" /> Ahora
            <span className="h-px flex-1 bg-rose-200" />
          </li>
        ) : null;
        if (e.kind === 'block') {
          return (
            <React.Fragment key={e.block.id}>
              {nowLine}
              <li className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-500">
                <span className="font-medium tabular-nums">{e.block.horaInicio}–{e.block.horaFin}</span> · {e.block.motivo || 'No disponible'}
              </li>
            </React.Fragment>
          );
        }
        const a = e.appt;
        const st = apptState(a.estado);
        return (
          <React.Fragment key={a.id}>
            {nowLine}
            <li>
              <button type="button" onClick={() => onSelect(a)} className={cx('flex w-full items-stretch gap-3 rounded-2xl border-l-4 bg-white p-3 text-left shadow-sm ring-1 ring-black/5', stateBorder(a.estado))}>
                <div className="w-12 shrink-0">
                  <p className="text-sm font-bold tabular-nums text-slate-900">{a.horaInicio}</p>
                  <p className="text-xs tabular-nums text-slate-400">{a.horaFin}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">{a.cliente?.nombre || 'Paciente'}</p>
                  <p className="truncate text-sm text-slate-500">{a.service?.nombre}{a.staff?.name ? ` · ${a.staff.name}` : ''}</p>
                  <div className="mt-1"><Badge tone={st.tone}>{st.label}</Badge></div>
                </div>
              </button>
            </li>
          </React.Fragment>
        );
      })}
    </ul>
  );
}
