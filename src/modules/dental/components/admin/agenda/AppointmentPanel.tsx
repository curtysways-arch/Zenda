'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Check, X, Stethoscope, CalendarClock, MessageCircle, ExternalLink, UserRound, Ban, DoorOpen, CheckCheck, FileText,
} from 'lucide-react';
import { useConfirm } from '@/components/admin/ConfirmContext';
import { api } from '../../../lib/api';
import { apptState, money, todayKey, whatsappLink } from '../../../lib/format';
import { Modal, Button, Badge, Field, inputClass } from '../ui';
import { useDentalOptions } from '../patient/types';
import { AgendaAppt, DONE, INACTIVE, dayLabel, toMin, toHM } from './agendaUtils';

function slots() {
  const out: string[] = [];
  for (let m = 6 * 60; m <= 21 * 60 + 45; m += 15) out.push(toHM(m));
  return out;
}

/**
 * Detalle de una cita en la agenda, con las acciones que tocan según su estado:
 * confirmar, registrar llegada, atender, marcar atendida, reprogramar, cancelar.
 */
export default function AppointmentPanel({
  appt,
  onClose,
  onChanged,
  onError,
}: {
  appt: AgendaAppt | null;
  onClose: () => void;
  onChanged: (message: string) => void;
  onError: (message: string) => void;
}) {
  const { confirm } = useConfirm();
  const [busy, setBusy] = useState(false);
  const [moving, setMoving] = useState(false);
  const { options } = useDentalOptions(Boolean(appt) && moving);
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [staffId, setStaffId] = useState('');
  const [error, setError] = useState('');
  const allSlots = useMemo(slots, []);

  useEffect(() => {
    setMoving(false);
    setError('');
    if (appt) {
      setFecha(new Date(appt.fecha).toISOString().slice(0, 10));
      setHora(appt.horaInicio);
      setStaffId(appt.staffId || '');
    }
  }, [appt]);

  if (!appt) return null;

  const st = apptState(appt.estado);
  const inactive = INACTIVE.includes(appt.estado);
  const done = DONE.includes(appt.estado);
  const pending = ['pending', 'PENDIENTE', 'pendiente'].includes(appt.estado);
  const inChair = ['in_progress', 'client_checked_in'].includes(appt.estado);
  const dayKey = new Date(appt.fecha).toISOString().slice(0, 10);
  const firstName = appt.cliente?.nombre?.split(' ')[0] || '';
  const wa = whatsappLink(
    appt.cliente?.telefono,
    `Hola ${firstName}, te recordamos tu cita ${dayKey === todayKey() ? 'de hoy' : `del ${dayLabel(dayKey, { weekday: 'long', day: 'numeric', month: 'long' }).toLowerCase()}`} a las ${appt.horaInicio}. Si necesitas cambiarla, escríbenos por aquí.`
  );

  const setState = async (estado: string, okMessage: string, ask?: { message: string; title: string; danger?: boolean }) => {
    if (ask) {
      const res = await confirm(ask.message, { title: ask.title, confirmText: 'Sí, continuar', type: ask.danger ? 'danger' : 'warning' });
      if (!(res === true || (typeof res === 'object' && res.confirmed))) return;
    }
    setBusy(true);
    try {
      await api(`/api/appointments/${appt.id}/status`, { method: 'PATCH', json: { estado } });
      onChanged(okMessage);
    } catch (e: any) {
      onError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const reschedule = async () => {
    setError('');
    setBusy(true);
    try {
      const duration = Math.max(10, toMin(appt.horaFin) - toMin(appt.horaInicio));
      await api('/api/admin/dental/appointments', {
        method: 'PATCH',
        json: { id: appt.id, fecha, horaInicio: hora, staffId: staffId || null, duracionMinutos: duration },
      });
      onChanged('Cita reprogramada.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const isToday = fecha === todayKey();
  const nowHM = (() => { const d = new Date(); return toHM(d.getHours() * 60 + d.getMinutes()); })();

  return (
    <Modal
      open
      onClose={onClose}
      title={appt.cliente?.nombre || 'Paciente'}
      description={`${dayLabel(dayKey, { weekday: 'long', day: 'numeric', month: 'long' })} · ${appt.horaInicio} – ${appt.horaFin}`}
      footer={
        moving ? (
          <>
            <Button variant="secondary" onClick={() => setMoving(false)}>Volver</Button>
            <Button onClick={reschedule} loading={busy}>Guardar nuevo horario</Button>
          </>
        ) : undefined
      }
    >
      {moving ? (
        <div className="space-y-4">
          {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nueva fecha">
              <input type="date" className={inputClass} value={fecha} min={todayKey()} onChange={(e) => setFecha(e.target.value)} />
            </Field>
            <Field label="Nueva hora">
              <select className={inputClass} value={hora} onChange={(e) => setHora(e.target.value)}>
                {allSlots.map((s) => <option key={s} value={s} disabled={isToday && s < nowHM}>{s}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Doctor">
            <select className={inputClass} value={staffId} onChange={(e) => setStaffId(e.target.value)}>
              <option value="">Sin asignar</option>
              {options?.staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <p className="text-xs text-slate-500">Se mantiene la misma duración ({toMin(appt.horaFin) - toMin(appt.horaInicio)} min). Te avisaremos si el nuevo horario choca con otra cita.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={st.tone}>{st.label}</Badge>
            {appt.tieneEvolucion && <Badge tone="emerald"><FileText className="h-3 w-3" /> Consulta registrada</Badge>}
            {appt.pagoEstado === 'PAGADO' && <Badge tone="emerald">Pagada</Badge>}
          </div>

          <dl className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-sm">
            <div>
              <dt className="text-slate-500">Servicio</dt>
              <dd className="font-medium text-slate-900">{appt.service?.nombre || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Doctor</dt>
              <dd className="font-medium text-slate-900">{appt.staff?.name || 'Sin asignar'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Teléfono</dt>
              <dd className="font-medium text-slate-900">{appt.cliente?.telefono || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Valor</dt>
              <dd className="font-medium text-slate-900">{Number(appt.total) > 0 ? money(appt.total) : '—'}</dd>
            </div>
            {appt.comentarios && (
              <div className="col-span-2">
                <dt className="text-slate-500">Nota</dt>
                <dd className="text-slate-800">{appt.comentarios}</dd>
              </div>
            )}
          </dl>

          {/* Acción principal según el estado */}
          {!inactive && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {pending && (
                <Button variant="success" icon={<Check className="h-4 w-4" />} loading={busy} onClick={() => setState('confirmed', 'Cita confirmada.')}>
                  Confirmar cita
                </Button>
              )}
              {appt.estado === 'confirmed' && (
                <Button variant="secondary" icon={<DoorOpen className="h-4 w-4" />} loading={busy} onClick={() => setState('in_progress', 'Paciente en atención.')}>
                  Llegó · pasar a atención
                </Button>
              )}
              {inChair && (
                <Button variant="success" icon={<CheckCheck className="h-4 w-4" />} loading={busy} onClick={() => setState('completed', 'Cita marcada como atendida.')}>
                  Marcar atendida
                </Button>
              )}
              {appt.clienteId && !appt.tieneEvolucion && (
                <Link
                  href={`/admin/pacientes/${appt.clienteId}?tab=consultas&nueva=1&cita=${appt.id}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
                >
                  <Stethoscope className="h-4 w-4" /> {done ? 'Registrar consulta' : 'Atender y registrar'}
                </Link>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {appt.clienteId && (
              <Link href={`/admin/pacientes/${appt.clienteId}`} className="inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50">
                <UserRound className="h-4 w-4" /> Ficha
              </Link>
            )}
            {wa && !inactive && !done && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-emerald-700 ring-1 ring-inset ring-slate-200 hover:bg-emerald-50">
                <MessageCircle className="h-4 w-4" /> Recordar
              </a>
            )}
            {!inactive && !done && (
              <button type="button" onClick={() => setMoving(true)} className="inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50">
                <CalendarClock className="h-4 w-4" /> Reprogramar
              </button>
            )}
            <Link href={`/admin/citas/${appt.id}`} className="inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50">
              <ExternalLink className="h-4 w-4" /> Cobro y detalle
            </Link>
          </div>

          {!inactive && !done && (
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              {appt.estado === 'confirmed' && !appt.checkedInAt && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setState('no_show', 'Marcada como "No asistió".', { title: 'No asistió', message: `¿Marcar que ${appt.cliente?.nombre || 'el paciente'} no asistió a la cita?` })}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
                >
                  <Ban className="h-4 w-4" /> No asistió
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => setState('cancelled', 'Cita cancelada.', { title: 'Cancelar cita', message: `¿Cancelar la cita de ${appt.cliente?.nombre || 'este paciente'}? El horario quedará libre.`, danger: true })}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-rose-600 hover:bg-rose-50"
              >
                <X className="h-4 w-4" /> Cancelar cita
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
