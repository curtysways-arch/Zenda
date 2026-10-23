'use client';
/**
 * AGENDA (celular) — pensada para usarla con una mano entre cita y cita.
 *  · Semana arriba con cuántas citas tiene cada día.
 *  · Filtros con su número (por confirmar, confirmadas, en atención…).
 *  · Cada cita muestra la hora, el cliente y el siguiente paso en un botón.
 *  · Tocar la cita abre su ventana de gestión: cobrar, reprogramar, cancelar, WhatsApp.
 *  · "Nueva cita" muestra solo las horas libres.
 */
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Search, X, AlertTriangle, CalendarX2, Users, List, Check, Loader2 } from 'lucide-react';
import AppointmentManager from '@/components/admin/agenda/AppointmentManager';
import NewAppointmentSheet from '@/components/admin/agenda/NewAppointmentSheet';
import {
  Cita, estadoOf, siguientePaso, dateKey, localKey, keyToDate, toMin, hora12, money, sinCerrar, isOpen, nombreCliente, nombreServicio, inkOn, saldo,
} from '@/components/admin/agenda/agendaShared';

interface MobileAgendaProps {
  citas: any[];
  primaryColor: string;
  onConfirm?: (id: string) => void;
  onCancel?: (id: string) => void;
  onUpdateStatus?: (id: string, nuevoEstado: string) => void;
  slug: string;
  highlightedCitas?: Set<string>;
  negocioTipo?: string;
  /** Actualiza una cita en la lista sin recargar. */
  onCitaChange?: (id: string, patch: Partial<Cita>) => void;
  /** Vuelve a pedir la lista (después de crear una cita). */
  onReload?: () => void;
  negocio?: { nombre?: string; horarioApertura?: string | null; horarioCierre?: string | null } | null;
}

type Filtro = 'todas' | 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
const FILTROS: [Filtro, string][] = [
  ['todas', 'Todas'], ['pending', 'Por confirmar'], ['confirmed', 'Confirmadas'], ['in_progress', 'En atención'], ['completed', 'Finalizadas'], ['cancelled', 'Canceladas'],
];
const matchFiltro = (c: Cita, f: Filtro) => {
  const e = String(c.estado || '').toLowerCase();
  if (f === 'todas') return true;
  if (f === 'confirmed') return e === 'confirmed' || e === 'approved';
  if (f === 'in_progress') return e === 'in_progress' || e === 'client_checked_in';
  if (f === 'cancelled') return e === 'cancelled' || e === 'no_show' || e === 'expired';
  return e === f;
};

export default function MobileAgenda({ citas, primaryColor, slug, highlightedCitas, onCitaChange, onReload, negocio }: MobileAgendaProps) {
  const color = /^#|^rgb|^hsl/i.test(primaryColor || '') ? primaryColor : '#0ea5e9';
  const ink = inkOn(color);
  const [dia, setDia] = useState(localKey(new Date()));
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [porProfesional, setPorProfesional] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [q, setQ] = useState('');
  const [verSinCerrar, setVerSinCerrar] = useState(false);
  const [abierta, setAbierta] = useState<{ id: string; view?: 'main' | 'finish' } | null>(null);
  const [nueva, setNueva] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);
  const toastTimer = useRef<any>(null);

  useEffect(() => {
    fetch('/api/staff').then((r) => (r.ok ? r.json() : [])).then((d) => setStaff((Array.isArray(d) ? d : []).filter((s: any) => s.active !== false).map((s: any) => ({ id: s.id, name: s.name || s.nombre })))).catch(() => {});
  }, []);

  // Llegadas desde Inicio: ?nueva=1 abre "Nueva cita"; ?sinCerrar=1 muestra las pendientes de cerrar.
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get('nueva') === '1') setNueva(true);
      if (sp.get('sinCerrar') === '1') setVerSinCerrar(true);
      if (sp.has('nueva') || sp.has('sinCerrar')) {
        sp.delete('nueva'); sp.delete('sinCerrar');
        const qs = sp.toString();
        window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
      }
    } catch { /* sin acceso a la URL */ }
  }, []);

  const notify = (m: string) => {
    setToast(m);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  };

  const fecha = keyToDate(dia);
  const semana = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(fecha, { weekStartsOn: 1 }), i)), [dia]); // eslint-disable-line react-hooks/exhaustive-deps
  const porDia = useMemo(() => {
    const m: Record<string, Cita[]> = {};
    for (const c of citas) { const k = dateKey(c.fecha); (m[k] = m[k] || []).push(c); }
    for (const k of Object.keys(m)) m[k].sort((a, b) => toMin(a.horaInicio) - toMin(b.horaInicio));
    return m;
  }, [citas]);
  const delDia = porDia[dia] || [];
  const conteo = useMemo(() => Object.fromEntries(FILTROS.map(([k]) => [k, delDia.filter((c) => matchFiltro(c, k)).length])) as Record<Filtro, number>, [delDia]);
  const lista = delDia.filter((c) => matchFiltro(c, filtro));
  const ingresoDia = delDia.filter((c) => !['cancelled', 'no_show', 'expired'].includes(String(c.estado))).reduce((s, c) => s + (Number(c.total) || 0), 0);
  const pendientesCerrar = useMemo(() => citas.filter(sinCerrar).sort((a, b) => (dateKey(a.fecha) + a.horaInicio).localeCompare(dateKey(b.fecha) + b.horaInicio)), [citas]);
  const resultados = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 2) return [];
    const d = t.replace(/\D/g, '');
    return citas.filter((c) => nombreCliente(c).toLowerCase().includes(t) || nombreServicio(c).toLowerCase().includes(t) || (d.length >= 3 && String(c.cliente?.telefono || '').replace(/\D/g, '').includes(d)))
      .sort((a, b) => (dateKey(b.fecha) + b.horaInicio).localeCompare(dateKey(a.fecha) + a.horaInicio)).slice(0, 60);
  }, [q, citas]);

  const esHoy = dia === localKey(new Date());
  const ahoraMin = new Date().getHours() * 60 + new Date().getMinutes();
  const citaAbierta = abierta ? citas.find((c) => c.id === abierta.id) : null;

  /** Botón de la tarjeta: avanza directo (confirmar / llegó); finalizar abre el cobro. */
  const avanzar = async (c: Cita) => {
    const paso = siguientePaso(c);
    if (!paso) return;
    if (paso.finalizar) return setAbierta({ id: c.id, view: 'finish' });
    setBusyId(c.id);
    try {
      const res = await fetch(`/api/appointments/${c.id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: paso.estado }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'No se pudo actualizar.');
      onCitaChange?.(c.id, { estado: paso.estado, updatedAt: new Date().toISOString() });
      notify(paso.estado === 'confirmed' ? `Cita de ${nombreCliente(c).split(' ')[0]} confirmada.` : `${nombreCliente(c).split(' ')[0]} está en atención.`);
    } catch (e: any) { notify(e.message); } finally { setBusyId(null); }
  };

  const card = (c: Cita, opts: { conFecha?: boolean } = {}) => {
    const est = estadoOf(c.estado);
    const paso = siguientePaso(c);
    const cerrada = !isOpen(c);
    const atrasada = sinCerrar(c);
    const debe = c.estado === 'completed' ? saldo(c) : 0;
    return (
      <li key={c.id}>
        <div className={`relative flex overflow-hidden rounded-2xl bg-white ring-1 transition ${highlightedCitas?.has(c.id) ? 'ring-2 ring-sky-400' : 'ring-slate-200/80'} ${cerrada ? 'opacity-75' : ''}`}>
          <span className="w-1 shrink-0" style={{ backgroundColor: est.bar }} aria-hidden />
          <button type="button" onClick={() => setAbierta({ id: c.id })} className="flex min-w-0 flex-1 items-stretch gap-3 py-3 pl-3 pr-2 text-left">
            <span className="w-[60px] shrink-0">
              {opts.conFecha && <span className="block text-[11px] font-semibold uppercase text-slate-400">{format(keyToDate(dateKey(c.fecha)), 'd MMM', { locale: es })}</span>}
              <span className="block whitespace-nowrap text-[15px] font-bold tabular-nums leading-tight text-slate-900">{hora12(c.horaInicio).split(' ')[0]}<span className="ml-0.5 text-[11px] font-semibold text-slate-500">{hora12(c.horaInicio).split(' ')[1]}</span></span>
              <span className="block text-xs tabular-nums text-slate-400">{hora12(c.horaFin)}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block truncate text-[15px] font-semibold leading-tight ${cerrada ? 'text-slate-600' : 'text-slate-900'}`}>{nombreCliente(c)}</span>
              <span className="mt-0.5 block truncate text-sm text-slate-500">{nombreServicio(c)}{c.staff?.name ? ` · ${c.staff.name.split(' ')[0]}` : ''}</span>
              <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${est.pill}`}>{est.label}</span>
                {atrasada && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200"><AlertTriangle size={11} /> Sin cerrar</span>}
                {debe > 0 && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">Debe {money(debe)}</span>}
                {Number(c.total) > 0 && <span className="text-xs font-semibold tabular-nums text-slate-500">{money(c.total)}</span>}
              </span>
            </span>
          </button>
          {paso && (
            <div className="flex shrink-0 items-center pr-3">
              <button type="button" disabled={busyId === c.id} onClick={() => avanzar(c)}
                className="inline-flex min-h-[40px] items-center gap-1 rounded-xl px-3 text-sm font-bold transition active:scale-95 disabled:opacity-60"
                style={paso.finalizar ? { backgroundColor: color, color: ink } : { backgroundColor: `color-mix(in srgb, ${color} 12%, white)`, color: '#0f172a' }}>
                {busyId === c.id ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} {paso.finalizar ? 'Cobrar' : paso.label}
              </button>
            </div>
          )}
        </div>
      </li>
    );
  };

  const listaDia = () => {
    if (lista.length === 0) {
      return (
        <div className="rounded-3xl bg-white px-6 py-10 text-center ring-1 ring-slate-200/80">
          <CalendarX2 className="mx-auto text-slate-300" size={30} />
          <p className="mt-3 font-semibold text-slate-800">{filtro === 'todas' ? 'Sin citas este día' : 'Nada en este filtro'}</p>
          <p className="mt-1 text-sm text-slate-500">{filtro === 'todas' ? 'Agenda una cita y aparecerá aquí.' : 'Prueba con "Todas".'}</p>
          {filtro === 'todas'
            ? <button type="button" onClick={() => setNueva(true)} className="mt-4 inline-flex items-center gap-1.5 rounded-2xl px-4 py-3 text-sm font-bold" style={{ backgroundColor: color, color: ink }}><Plus size={16} /> Agendar cita</button>
            : <button type="button" onClick={() => setFiltro('todas')} className="mt-4 text-sm font-semibold text-slate-800 underline">Ver todas</button>}
        </div>
      );
    }
    if (porProfesional) {
      const grupos: Record<string, Cita[]> = {};
      for (const c of lista) { const k = c.staff?.name || 'Sin asignar'; (grupos[k] = grupos[k] || []).push(c); }
      return (
        <div className="space-y-5">
          {Object.entries(grupos).map(([nombre, cs]) => (
            <section key={nombre}>
              <p className="mb-2 flex items-center justify-between px-1 text-sm font-semibold text-slate-800">{nombre}<span className="font-normal text-slate-500">{cs.length} {cs.length === 1 ? 'cita' : 'citas'}</span></p>
              <ul className="space-y-2">{cs.map((c) => card(c))}</ul>
            </section>
          ))}
        </div>
      );
    }
    // Línea de "ahora" en el día de hoy
    const idxAhora = esHoy ? lista.findIndex((c) => toMin(c.horaFin || c.horaInicio) > ahoraMin) : -1;
    return (
      <ul className="space-y-2">
        {lista.map((c, i) => (
          <Fragment key={c.id}>
            {i === idxAhora && i > 0 && (
              <li className="flex items-center gap-2 py-1" aria-hidden>
                <span className="text-xs font-bold" style={{ color }}>Ahora · {hora12(`${Math.floor(ahoraMin / 60)}:${ahoraMin % 60}`)}</span>
                <span className="h-px flex-1" style={{ backgroundColor: color }} />
              </li>
            )}
            {card(c)}
          </Fragment>
        ))}
      </ul>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Encabezado */}
      <div className="sticky top-0 z-[80] border-b border-slate-200/70 bg-slate-50/95 px-4 pb-3 pt-3 backdrop-blur">
        {buscando ? (
          <div className="flex items-center gap-2">
            <label className="relative flex-1">
              <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente, celular o servicio"
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-base outline-none focus:border-slate-400" />
            </label>
            <button type="button" onClick={() => { setBuscando(false); setQ(''); }} className="rounded-xl px-2 py-2 text-sm font-semibold text-slate-600">Cerrar</button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold capitalize tracking-tight text-slate-900">{format(fecha, 'MMMM yyyy', { locale: es })}</h1>
              <div className="ml-auto flex items-center gap-1">
                {!esHoy && <button type="button" onClick={() => setDia(localKey(new Date()))} className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 ring-1 ring-slate-200">Hoy</button>}
                <button type="button" onClick={() => setDia(localKey(addDays(fecha, -7)))} className="rounded-full p-2 text-slate-500 hover:bg-white" aria-label="Semana anterior"><ChevronLeft size={19} /></button>
                <button type="button" onClick={() => setDia(localKey(addDays(fecha, 7)))} className="rounded-full p-2 text-slate-500 hover:bg-white" aria-label="Semana siguiente"><ChevronRight size={19} /></button>
                <button type="button" onClick={() => setBuscando(true)} className="rounded-full p-2 text-slate-500 hover:bg-white" aria-label="Buscar"><Search size={19} /></button>
              </div>
            </div>
            {/* Semana */}
            <div className="mt-2 grid grid-cols-7 gap-1">
              {semana.map((d) => {
                const k = localKey(d);
                const sel = k === dia;
                const hoy = isSameDay(d, new Date());
                const n = (porDia[k] || []).filter((c) => !['cancelled', 'no_show', 'expired'].includes(String(c.estado))).length;
                return (
                  <button key={k} type="button" onClick={() => setDia(k)} aria-pressed={sel} aria-label={format(d, "EEEE d 'de' MMMM", { locale: es })}
                    className="flex flex-col items-center rounded-2xl py-2 transition"
                    style={sel ? { backgroundColor: color, color: ink } : undefined}>
                    <span className={`text-[11px] font-semibold uppercase ${sel ? 'opacity-80' : 'text-slate-400'}`}>{format(d, 'EEEEE', { locale: es })}</span>
                    <span className={`text-lg font-bold leading-tight ${sel ? '' : hoy ? '' : 'text-slate-800'}`} style={!sel && hoy ? { color } : undefined}>{format(d, 'd')}</span>
                    <span className="mt-0.5 flex h-1.5 gap-0.5" aria-hidden>
                      {Array.from({ length: Math.min(3, n) }).map((_, i) => <span key={i} className="size-1.5 rounded-full" style={{ backgroundColor: sel ? ink : color, opacity: sel ? 0.8 : 0.7 }} />)}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="space-y-3 px-4 pt-3">
        {buscando ? (
          q.trim().length < 2 ? <p className="py-8 text-center text-sm text-slate-500">Escribe al menos 2 letras.</p>
            : resultados.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">No hay citas con “{q}”.</p>
              : <ul className="space-y-2">{resultados.map((c) => card(c, { conFecha: true }))}</ul>
        ) : verSinCerrar ? (
          <>
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-900">Citas pasadas sin cerrar</p>
              <button type="button" onClick={() => setVerSinCerrar(false)} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600"><X size={15} /> Cerrar</button>
            </div>
            <p className="text-sm text-slate-500">Marca cada una como finalizada, cancelada o "no vino" para que tus números cuadren.</p>
            {pendientesCerrar.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">Todo al día.</p> : <ul className="space-y-2">{pendientesCerrar.map((c) => card(c, { conFecha: true }))}</ul>}
          </>
        ) : (
          <>
            {pendientesCerrar.length > 0 && (
              <button type="button" onClick={() => setVerSinCerrar(true)} className="flex w-full items-center gap-2 rounded-2xl bg-amber-50 px-3.5 py-3 text-left text-sm text-amber-900 ring-1 ring-amber-200">
                <AlertTriangle size={16} className="shrink-0" />
                <span className="flex-1"><b>{pendientesCerrar.length}</b> {pendientesCerrar.length === 1 ? 'cita pasada sigue abierta' : 'citas pasadas siguen abiertas'}</span>
                <ChevronRight size={16} />
              </button>
            )}

            {/* Día */}
            <div className="flex items-end justify-between gap-2 pt-1">
              <div>
                <p className="text-base font-bold capitalize text-slate-900">{esHoy ? 'Hoy' : format(fecha, 'EEEE d', { locale: es })}</p>
                <p className="text-sm text-slate-500">{delDia.length ? `${conteo.todas} ${conteo.todas === 1 ? 'cita' : 'citas'}${ingresoDia > 0 ? ` · ${money(ingresoDia)} en servicios` : ''}` : 'Día libre'}</p>
              </div>
              {staff.length > 1 && delDia.length > 0 && (
                <div className="inline-flex rounded-xl bg-white p-1 ring-1 ring-slate-200" role="tablist" aria-label="Vista">
                  <button type="button" role="tab" aria-selected={!porProfesional} onClick={() => setPorProfesional(false)} className={`rounded-lg p-1.5 ${!porProfesional ? 'bg-slate-900 text-white' : 'text-slate-500'}`} aria-label="Por hora"><List size={16} /></button>
                  <button type="button" role="tab" aria-selected={porProfesional} onClick={() => setPorProfesional(true)} className={`rounded-lg p-1.5 ${porProfesional ? 'bg-slate-900 text-white' : 'text-slate-500'}`} aria-label="Por profesional"><Users size={16} /></button>
                </div>
              )}
            </div>

            {/* Filtros */}
            {delDia.length > 0 && (
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: 'none' }}>
                {FILTROS.filter(([k]) => k === 'todas' || conteo[k] > 0).map(([k, l]) => (
                  <button key={k} type="button" onClick={() => setFiltro(k)} aria-pressed={filtro === k}
                    className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold transition ${filtro === k ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200'}`}>
                    {l} <span className={filtro === k ? 'text-white/60' : 'text-slate-400'}>{conteo[k]}</span>
                  </button>
                ))}
              </div>
            )}

            {listaDia()}
          </>
        )}
      </div>

      {/* Nueva cita */}
      {!buscando && (
        <button type="button" onClick={() => setNueva(true)} className="fixed bottom-[84px] right-4 z-[96] inline-flex items-center gap-2 rounded-full px-5 py-3.5 text-[15px] font-bold shadow-[0_12px_30px_-10px_rgba(15,23,42,0.5)] transition active:scale-95"
          style={{ backgroundColor: color, color: ink }}>
          <Plus size={19} strokeWidth={2.5} /> Nueva cita
        </button>
      )}

      {toast && (
        <div role="status" className="fixed inset-x-4 top-[max(1rem,env(safe-area-inset-top))] z-[210] mx-auto max-w-sm rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm font-medium text-white shadow-lg">{toast}</div>
      )}

      {citaAbierta && (
        <AppointmentManager
          cita={citaAbierta}
          primaryColor={color}
          allCitas={citas}
          staff={staff}
          horario={{ apertura: negocio?.horarioApertura, cierre: negocio?.horarioCierre }}
          negocioNombre={negocio?.nombre}
          initialView={abierta?.view}
          onChanged={(id, patch, msg) => { onCitaChange?.(id, patch); notify(msg); }}
          onClose={() => setAbierta(null)}
        />
      )}
      {nueva && (
        <NewAppointmentSheet
          primaryColor={color}
          slug={slug}
          dia={dia}
          allCitas={citas}
          horario={{ apertura: negocio?.horarioApertura, cierre: negocio?.horarioCierre }}
          negocioNombre={negocio?.nombre}
          onClose={() => setNueva(false)}
          onCreated={(msg) => { onReload?.(); notify(msg); }}
        />
      )}
    </div>
  );
}
