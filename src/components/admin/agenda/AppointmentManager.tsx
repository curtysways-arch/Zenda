'use client';
/**
 * Gestión de UNA cita desde el celular: ver todo, avanzar al siguiente paso, finalizar y cobrar,
 * registrar un pago, reprogramar (día, hora y profesional) y cancelar / marcar que no vino.
 * Se usa como hoja inferior desde la agenda y como página en /admin/citas/[id].
 */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  MessageCircle, Phone, Clock, User, Sparkles, CalendarClock, XCircle, UserX, Wallet, Loader2, ChevronLeft, AlertTriangle,
  ArrowUpRight, StickyNote, Check, ChevronRight,
} from 'lucide-react';
import {
  Cita, Sheet, estadoOf, siguientePaso, dateKey, keyToDate, localKey, toMin, toHora, hora12, money, pagado, saldo,
  nombreCliente, telefonoCliente, nombreServicio, waLink, inkOn, isOpen, sinCerrar, field, pagosDe,
} from './agendaShared';

type View = 'main' | 'finish' | 'pay' | 'move' | 'cancel';
const METODOS: [string, string][] = [['EFECTIVO', 'Efectivo'], ['TRANSFERENCIA', 'Transferencia'], ['TARJETA', 'Tarjeta']];

export interface ManagerProps {
  cita: Cita;
  primaryColor: string;
  /** Todas las citas cargadas (para saber qué horarios están ocupados al reprogramar). */
  allCitas?: Cita[];
  staff?: { id: string; name: string }[];
  horario?: { apertura?: string | null; cierre?: string | null };
  negocioNombre?: string;
  /** Avisa el cambio para actualizar la lista sin recargar. */
  onChanged: (id: string, patch: Partial<Cita>, mensaje: string) => void;
  onClose: () => void;
  /** 'sheet' (desde la agenda) o 'page' (pantalla completa). */
  variant?: 'sheet' | 'page';
  /** Abrir directo en una vista (ej. 'finish' desde el botón de la tarjeta). */
  initialView?: 'main' | 'finish' | 'pay' | 'move' | 'cancel';
}

export default function AppointmentManager({ cita, primaryColor, allCitas = [], staff = [], horario, negocioNombre, onChanged, onClose, variant = 'sheet', initialView = 'main' }: ManagerProps) {
  const [view, setView] = useState<View>(initialView);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ink = inkOn(primaryColor);
  const done = () => (variant === 'page' ? setView('main') : onClose());
  const est = estadoOf(cita.estado);
  const paso = siguientePaso(cita);
  const total = Number(cita.total) || 0;
  const yaPagado = pagado(cita);
  const debe = saldo(cita);
  const phone = telefonoCliente(cita);
  const first = nombreCliente(cita).split(' ')[0];
  const fechaTxt = cita.fecha ? format(keyToDate(dateKey(cita.fecha)), "EEEE d 'de' MMMM", { locale: es }) : '';
  const fechaCap = fechaTxt.charAt(0).toUpperCase() + fechaTxt.slice(1);
  const duracion = Number(cita.service?.duracion) || Math.max(15, toMin(cita.horaFin) - toMin(cita.horaInicio)) || 60;
  const recordatorio = waLink(phone, `Hola ${first} 👋 Te recordamos tu cita de ${nombreServicio(cita)} el ${fechaTxt} a las ${hora12(cita.horaInicio)}${negocioNombre ? ` en ${negocioNombre}` : ''}. ¡Te esperamos!`);

  /* ── Llamadas ── */
  const cambiarEstado = async (estado: string, extra: Record<string, any> = {}, mensaje = 'Listo.') => {
    setBusy(true); setError('');
    try {
      const res = await fetch(`/api/appointments/${cita.id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado, ...extra }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'No se pudo actualizar la cita.');
      const patch: any = { estado, updatedAt: new Date().toISOString() };
      if (estado === 'completed' && Number(extra.montoCobrado) > 0) {
        const monto = Number(extra.montoCobrado);
        const otros = pagosDe(cita);
        // El servidor reemplaza el primer pago por el monto cobrado al finalizar.
        const lista = otros.length ? [{ ...otros[0], monto }, ...otros.slice(1)] : [{ id: `tmp-${Date.now()}`, monto, metodo: extra.metodoPago || 'EFECTIVO', fecha: new Date().toISOString() }];
        patch.pagoReserva = lista; patch.pagos = lista; patch.pagoEstado = 'PAGADO';
      }
      onChanged(cita.id, patch, mensaje);
      done();
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  /* ── Vistas ── */
  const header = (title: string) => (
    <button type="button" onClick={() => { setView('main'); setError(''); }} className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800">
      <ChevronLeft size={16} /> {title}
    </button>
  );

  let body: React.ReactNode;
  let footer: React.ReactNode = null;

  if (view === 'finish') {
    body = <FinishForm sugerido={debe > 0 ? debe : total} yaPagado={yaPagado} total={total} busy={busy} primaryColor={primaryColor} ink={ink}
      back={header('Volver')} onSubmit={(monto, metodo) => cambiarEstado('completed', { montoCobrado: monto, metodoPago: metodo }, monto > 0 ? `Cita finalizada. Cobrado ${money(monto)}.` : 'Cita finalizada.')} />;
  } else if (view === 'pay') {
    body = <PayForm cita={cita} sugerido={debe} busy={busy} setBusy={setBusy} setError={setError} primaryColor={primaryColor} ink={ink} back={header('Volver')}
      onDone={(p) => { const lista = [...pagosDe(cita), p]; onChanged(cita.id, { pagoReserva: lista, pagos: lista }, `Pago de ${money(p.monto)} registrado.`); done(); }} />;
  } else if (view === 'move') {
    body = <MoveForm cita={cita} allCitas={allCitas} staff={staff} horario={horario} duracion={duracion} busy={busy} setBusy={setBusy} setError={setError}
      primaryColor={primaryColor} ink={ink} back={header('Volver')}
      onDone={(patch, msg) => { onChanged(cita.id, patch, msg); done(); }} />;
  } else if (view === 'cancel') {
    const puedeNoShow = ['pending', 'confirmed', 'approved'].includes(String(cita.estado)) && !cita.checkedInAt;
    const avisar = waLink(phone, `Hola ${first}, te escribimos de ${negocioNombre || 'nuestro local'} sobre tu cita del ${fechaTxt} a las ${hora12(cita.horaInicio)}.`);
    body = (
      <div>
        {header('Volver')}
        <p className="text-[15px] text-slate-700">¿Qué pasó con la cita de <b>{nombreCliente(cita)}</b>?</p>
        <div className="mt-4 space-y-2">
          <button type="button" disabled={busy} onClick={() => cambiarEstado('cancelled', {}, 'Cita cancelada.')} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 p-4 text-left hover:bg-slate-50 disabled:opacity-60">
            <XCircle size={20} className="shrink-0 text-rose-600" />
            <span><span className="block font-semibold text-slate-900">Cancelar la cita</span><span className="block text-sm text-slate-500">El horario queda libre para otra persona.</span></span>
          </button>
          {puedeNoShow && (
            <button type="button" disabled={busy} onClick={() => cambiarEstado('no_show', {}, 'Marcada como "no vino".')} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 p-4 text-left hover:bg-slate-50 disabled:opacity-60">
              <UserX size={20} className="shrink-0 text-slate-600" />
              <span><span className="block font-semibold text-slate-900">No vino</span><span className="block text-sm text-slate-500">Queda en su historial como inasistencia.</span></span>
            </button>
          )}
        </div>
        {avisar && <a href={avisar} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"><MessageCircle size={15} /> Avisarle por WhatsApp</a>}
      </div>
    );
  } else {
    /* main */
    body = (
      <div className="space-y-4">
        {sinCerrar(cita) && (
          <p className="flex items-start gap-2 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" /> Ya pasó la hora y sigue abierta. Ciérrala para que tus números cuadren.
          </p>
        )}

        {/* Contacto */}
        <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full text-base font-bold" style={{ backgroundColor: `color-mix(in srgb, ${primaryColor} 16%, white)`, color: primaryColor }}>
            {nombreCliente(cita).charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-slate-900">{nombreCliente(cita)}</p>
            <p className="truncate text-sm text-slate-500">{phone || 'Sin celular'}</p>
          </div>
          {recordatorio && <a href={recordatorio} target="_blank" rel="noopener noreferrer" className="flex size-11 items-center justify-center rounded-full bg-white text-green-700 ring-1 ring-slate-200" aria-label="Escribir por WhatsApp" title="Enviar recordatorio por WhatsApp"><MessageCircle size={19} /></a>}
          {phone && <a href={`tel:${phone}`} className="flex size-11 items-center justify-center rounded-full bg-white text-slate-700 ring-1 ring-slate-200" aria-label="Llamar"><Phone size={18} /></a>}
        </div>

        {/* Detalle */}
        <dl className="divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200">
          <Row icon={Sparkles} label="Servicio" value={<>{nombreServicio(cita)} <span className="text-slate-500">· {duracion} min</span></>} />
          {Array.isArray(cita.extraServices) && cita.extraServices.length > 0 && (
            <Row icon={Sparkles} label="Adicionales" value={cita.extraServices.map((x: any) => x.nombre).join(', ')} />
          )}
          <Row icon={User} label="Profesional" value={cita.staff?.name || <span className="text-slate-400">Sin asignar</span>} />
          <Row icon={Clock} label="Horario" value={`${fechaCap}, ${hora12(cita.horaInicio)} – ${hora12(cita.horaFin)}`} />
          {(cita.comentarios || cita.notas) && <Row icon={StickyNote} label="Notas" value={cita.comentarios || cita.notas} />}
        </dl>

        {/* Cobro */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <Money label="Total" value={money(total)} />
          <Money label="Pagado" value={money(yaPagado)} tone={yaPagado > 0 ? 'text-green-700' : undefined} />
          <Money label="Saldo" value={money(debe)} tone={debe > 0 ? 'text-amber-700' : undefined} />
        </div>

        {/* Otras acciones */}
        {isOpen(cita) && (
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setView('move')} className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"><CalendarClock size={17} /> Reprogramar</button>
            <button type="button" onClick={() => setView('cancel')} className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-50"><XCircle size={17} /> Cancelar</button>
          </div>
        )}
        {debe > 0 && cita.estado !== 'cancelled' && (
          <button type="button" onClick={() => setView('pay')} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50">
            <span className="flex items-center gap-2"><Wallet size={17} /> Registrar un pago o abono</span><ChevronRight size={16} className="text-slate-400" />
          </button>
        )}
        {variant === 'sheet' && (
          <Link href={`/admin/citas/${cita.id}`} className="flex items-center justify-center gap-1 pt-1 text-sm font-medium text-slate-500 hover:text-slate-800">Ver ficha completa <ArrowUpRight size={14} /></Link>
        )}
      </div>
    );
    if (paso) {
      footer = (
        <button type="button" disabled={busy} onClick={() => (paso.finalizar ? setView('finish') : cambiarEstado(paso.estado, {}, paso.estado === 'confirmed' ? 'Cita confirmada.' : `${first} está en atención.`))}
          className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[15px] font-bold transition active:scale-[0.99] disabled:opacity-60" style={{ backgroundColor: primaryColor, color: ink }}>
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />} {paso.label}
        </button>
      );
    }
  }

  const title = (
    <span className="flex flex-wrap items-center gap-2">
      {nombreServicio(cita)}
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${est.pill}`}>{est.label}</span>
    </span>
  );
  const subtitle = `${fechaCap} · ${hora12(cita.horaInicio)}`;
  const errorNode = error ? <p role="alert" className="mt-3 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700"><AlertTriangle size={15} className="mt-0.5 shrink-0" /> {error}</p> : null;

  if (variant === 'page') {
    return (
      <div className="mx-auto max-w-lg pb-28">
        <div className="mb-4 flex items-start gap-3">
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-500 ring-1 ring-slate-200" aria-label="Volver"><ChevronLeft size={18} /></button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold leading-tight text-slate-900">{title}</h1>
            <p className="text-sm text-slate-500">{subtitle}</p>
          </div>
        </div>
        <div className="rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{body}{errorNode}</div>
        {footer && <div className="fixed inset-x-0 bottom-16 z-[95] border-t border-slate-100 bg-white/95 px-4 py-3 backdrop-blur md:bottom-0">{footer}</div>}
      </div>
    );
  }
  return <Sheet title={title} subtitle={subtitle} onClose={onClose} footer={footer}>{body}{errorNode}</Sheet>;
}

function Row({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <Icon size={17} className="mt-0.5 shrink-0 text-slate-400" />
      <dt className="sr-only">{label}</dt>
      <dd className="min-w-0 flex-1 text-[15px] text-slate-800">{value}</dd>
    </div>
  );
}

function Money({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-2 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-0.5 text-lg font-bold tabular-nums ${tone || 'text-slate-900'}`}>{value}</p>
    </div>
  );
}

function MetodoChips({ value, onChange, primaryColor }: { value: string; onChange: (v: string) => void; primaryColor: string }) {
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Forma de pago">
      {METODOS.map(([k, l]) => (
        <button key={k} type="button" role="radio" aria-checked={value === k} onClick={() => onChange(k)}
          className="rounded-2xl border py-3 text-sm font-semibold transition"
          style={value === k ? { borderColor: primaryColor, backgroundColor: `color-mix(in srgb, ${primaryColor} 10%, white)`, color: '#0f172a' } : { borderColor: '#e2e8f0', color: '#475569' }}>
          {l}
        </button>
      ))}
    </div>
  );
}

function AmountInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="mt-1.5 flex items-center rounded-2xl border border-slate-200 bg-white px-4 focus-within:border-slate-400 focus-within:ring-4 focus-within:ring-slate-100">
        <span className="text-2xl font-bold text-slate-400">$</span>
        <input inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ''))} className="w-full bg-transparent py-3.5 pl-1 text-3xl font-bold tabular-nums text-slate-900 outline-none" aria-label={label} />
      </div>
    </label>
  );
}

function FinishForm({ sugerido, yaPagado, total, busy, primaryColor, ink, back, onSubmit }: {
  sugerido: number; yaPagado: number; total: number; busy: boolean; primaryColor: string; ink: string; back: React.ReactNode; onSubmit: (monto: number, metodo: string) => void;
}) {
  const [monto, setMonto] = useState(String(Number(sugerido.toFixed(2))));
  const [metodo, setMetodo] = useState('EFECTIVO');
  const n = Number(monto) || 0;
  return (
    <div className="space-y-4">
      {back}
      <AmountInput value={monto} onChange={setMonto} label={yaPagado > 0 ? `Cobra el saldo (ya pagó ${money(yaPagado)} de ${money(total)})` : 'Monto cobrado'} />
      <MetodoChips value={metodo} onChange={setMetodo} primaryColor={primaryColor} />
      <button type="button" disabled={busy} onClick={() => onSubmit(n, metodo)} className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[15px] font-bold disabled:opacity-60" style={{ backgroundColor: primaryColor, color: ink }}>
        {busy ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />} {n > 0 ? `Finalizar y cobrar ${money(n)}` : 'Finalizar sin cobrar'}
      </button>
      {n > 0 && <button type="button" disabled={busy} onClick={() => onSubmit(0, metodo)} className="w-full py-2 text-sm font-medium text-slate-500 hover:text-slate-800">Finalizar sin registrar cobro</button>}
    </div>
  );
}

function PayForm({ cita, sugerido, busy, setBusy, setError, primaryColor, ink, back, onDone }: {
  cita: Cita; sugerido: number; busy: boolean; setBusy: (b: boolean) => void; setError: (s: string) => void; primaryColor: string; ink: string; back: React.ReactNode; onDone: (p: any) => void;
}) {
  const [monto, setMonto] = useState(String(Number(sugerido.toFixed(2))));
  const [metodo, setMetodo] = useState('EFECTIVO');
  const [ref, setRef] = useState('');
  const save = async () => {
    const n = Number(monto) || 0;
    if (n <= 0) return setError('Escribe un monto mayor a cero.');
    setBusy(true); setError('');
    try {
      const res = await fetch(`/api/appointments/${cita.id}/pagos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ monto: n, metodo, referencia: ref.trim() }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'No se pudo registrar el pago.');
      onDone({ id: d.id || `tmp-${Date.now()}`, monto: n, metodo, fecha: new Date().toISOString() });
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-4">
      {back}
      <AmountInput value={monto} onChange={setMonto} label="Monto del pago" />
      <MetodoChips value={metodo} onChange={setMetodo} primaryColor={primaryColor} />
      {metodo !== 'EFECTIVO' && <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Número de comprobante (opcional)" className={field} />}
      <button type="button" disabled={busy} onClick={save} className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[15px] font-bold disabled:opacity-60" style={{ backgroundColor: primaryColor, color: ink }}>
        {busy ? <Loader2 size={18} className="animate-spin" /> : <Wallet size={18} />} Registrar pago
      </button>
    </div>
  );
}

/** Horarios libres de un día para una duración, según el horario del local y las citas ya tomadas. */
export function slotsDelDia(opts: { dia: string; duracion: number; citas: Cita[]; serviceId?: string; staffId?: string | null; excludeId?: string; apertura?: string | null; cierre?: string | null }) {
  const ini = toMin(opts.apertura || '08:00');
  let fin = toMin(opts.cierre || '20:00');
  if (fin <= ini) fin = 24 * 60 - 1;
  const ocupadas = opts.citas.filter((c) => c.id !== opts.excludeId && dateKey(c.fecha) === opts.dia && !['cancelled', 'no_show', 'expired', 'rejected'].includes(String(c.estado))
    && ((opts.serviceId && (c.serviceId === opts.serviceId || c.service?.id === opts.serviceId)) || (opts.staffId && (c.staffId === opts.staffId || c.staff?.id === opts.staffId))));
  const ahora = new Date();
  const esHoy = opts.dia === localKey(ahora);
  const minAhora = ahora.getHours() * 60 + ahora.getMinutes();
  const out: { hora: string; libre: boolean; motivo?: string }[] = [];
  for (let t = ini; t + opts.duracion <= fin; t += 30) {
    const choque = ocupadas.find((c) => toMin(c.horaInicio) < t + opts.duracion && toMin(c.horaFin || c.horaInicio) > t);
    const pasado = esHoy && t < minAhora;
    out.push({ hora: toHora(t), libre: !choque && !pasado, motivo: choque ? 'Ocupado' : pasado ? 'Ya pasó' : undefined });
  }
  return out;
}

export function DayPicker({ value, onChange, primaryColor, citas }: { value: string; onChange: (k: string) => void; primaryColor: string; citas?: Cita[] }) {
  const dias = useMemo(() => Array.from({ length: 21 }, (_, i) => addDays(new Date(), i)), []);
  return (
    <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1" style={{ scrollbarWidth: 'none' }}>
      {dias.map((d) => {
        const k = localKey(d);
        const sel = k === value;
        const n = citas ? citas.filter((c) => dateKey(c.fecha) === k && isOpen(c)).length : 0;
        return (
          <button key={k} type="button" onClick={() => onChange(k)} aria-pressed={sel}
            className="flex w-14 shrink-0 flex-col items-center rounded-2xl border py-2 transition"
            style={sel ? { backgroundColor: primaryColor, borderColor: primaryColor, color: inkOn(primaryColor) } : { borderColor: '#e2e8f0', color: '#0f172a' }}>
            <span className="text-[11px] font-medium uppercase opacity-70">{format(d, 'EEE', { locale: es }).replace('.', '')}</span>
            <span className="text-lg font-bold leading-tight">{format(d, 'd')}</span>
            <span className="text-[10px] opacity-70">{n ? `${n} ${n === 1 ? 'cita' : 'citas'}` : ' '}</span>
          </button>
        );
      })}
    </div>
  );
}

export function SlotGrid({ slots, value, onChange, primaryColor }: { slots: { hora: string; libre: boolean; motivo?: string }[]; value: string; onChange: (h: string) => void; primaryColor: string }) {
  const pasaron = slots.length > 0 && slots.every((s) => s.motivo === 'Ya pasó' || !s.libre) && slots.some((s) => s.motivo === 'Ya pasó');
  slots = slots.filter((s) => s.motivo !== 'Ya pasó');
  if (!slots.length) return <p className="rounded-2xl bg-slate-50 p-4 text-center text-sm text-slate-500">{pasaron ? 'Por hoy ya no quedan horas. Elige otro día arriba.' : 'No hay horarios en este día.'}</p>;
  const libres = slots.filter((s) => s.libre).length;
  return (
    <div>
      <div className="grid grid-cols-4 gap-2">
        {slots.map((s) => {
          const sel = s.hora === value;
          return (
            <button key={s.hora} type="button" disabled={!s.libre} onClick={() => onChange(s.hora)} aria-pressed={sel} title={s.motivo}
              className="rounded-xl border py-2.5 text-sm font-semibold tabular-nums transition disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-300 disabled:line-through"
              style={sel ? { backgroundColor: primaryColor, borderColor: primaryColor, color: inkOn(primaryColor) } : s.libre ? { borderColor: '#e2e8f0', color: '#0f172a' } : undefined}>
              {hora12(s.hora).replace(' ', ' ')}
            </button>
          );
        })}
      </div>
      {libres === 0 && <p className="mt-2 text-center text-sm text-slate-500">No quedan horarios libres este día. Prueba otro.</p>}
    </div>
  );
}

function MoveForm({ cita, allCitas, staff, horario, duracion, busy, setBusy, setError, primaryColor, ink, back, onDone }: {
  cita: Cita; allCitas: Cita[]; staff: { id: string; name: string }[]; horario?: { apertura?: string | null; cierre?: string | null }; duracion: number;
  busy: boolean; setBusy: (b: boolean) => void; setError: (s: string) => void; primaryColor: string; ink: string; back: React.ReactNode;
  onDone: (patch: Partial<Cita>, msg: string) => void;
}) {
  const hoy = localKey(new Date());
  const actual = dateKey(cita.fecha);
  const yaCerro = (() => { const n = new Date(); return n.getHours() * 60 + n.getMinutes() >= toMin(horario?.cierre || '20:00') - 30; })();
  const primerDia = yaCerro ? localKey(addDays(new Date(), 1)) : hoy;
  const [dia, setDia] = useState(actual >= primerDia ? actual : primerDia);
  const [hora, setHora] = useState('');
  const [staffId, setStaffId] = useState<string>(cita.staffId || cita.staff?.id || '');
  const slots = useMemo(() => slotsDelDia({ dia, duracion, citas: allCitas, serviceId: cita.serviceId || cita.service?.id, staffId: staffId || null, excludeId: cita.id, apertura: horario?.apertura, cierre: horario?.cierre }),
    [dia, duracion, allCitas, cita, staffId, horario]);

  const save = async () => {
    if (!hora) return setError('Elige la nueva hora.');
    setBusy(true); setError('');
    try {
      const res = await fetch(`/api/appointments/${cita.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fecha: dia, horaInicio: hora, staffId: staffId || null }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'No se pudo reprogramar.');
      const st = staff.find((s) => s.id === staffId);
      const fechaIso = `${dia}T00:00:00.000Z`;
      onDone({ fecha: fechaIso, horaInicio: d.horaInicio || hora, horaFin: d.horaFin || toHora(toMin(hora) + duracion), staffId: staffId || null, staff: st ? { ...(cita.staff || {}), id: st.id, name: st.name } : null },
        `Cita movida al ${format(keyToDate(dia), "EEEE d", { locale: es })} a las ${hora12(hora)}.`);
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      {back}
      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">Día</p>
        <DayPicker value={dia} onChange={(k) => { setDia(k); setHora(''); }} primaryColor={primaryColor} citas={allCitas} />
      </div>
      {staff.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Profesional</p>
          <div className="flex flex-wrap gap-2">
            {[{ id: '', name: 'Sin asignar' }, ...staff].map((s) => (
              <button key={s.id || 'none'} type="button" onClick={() => { setStaffId(s.id); setHora(''); }} aria-pressed={staffId === s.id}
                className="rounded-full border px-3.5 py-2 text-sm font-medium"
                style={staffId === s.id ? { borderColor: primaryColor, backgroundColor: `color-mix(in srgb, ${primaryColor} 10%, white)`, color: '#0f172a' } : { borderColor: '#e2e8f0', color: '#475569' }}>
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">Hora <span className="font-normal text-slate-500">· dura {duracion} min</span></p>
        <SlotGrid slots={slots} value={hora} onChange={setHora} primaryColor={primaryColor} />
      </div>
      <button type="button" disabled={busy || !hora} onClick={save} className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[15px] font-bold disabled:opacity-50" style={{ backgroundColor: primaryColor, color: ink }}>
        {busy ? <Loader2 size={18} className="animate-spin" /> : <CalendarClock size={18} />} {hora ? `Mover a las ${hora12(hora)}` : 'Elige una hora'}
      </button>
    </div>
  );
}
