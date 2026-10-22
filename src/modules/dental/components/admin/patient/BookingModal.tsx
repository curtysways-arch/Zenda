'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { UserPlus, X, Search } from 'lucide-react';
import PhoneInput from '@/components/ui/PhoneInput';
import { api, ApiError } from '../../../lib/api';
import { todayKey, money, normalize, initials } from '../../../lib/format';
import { Modal, Field, Button, Avatar, inputClass, cx } from '../ui';
import { useDentalOptions } from './types';

const DURATIONS = [15, 30, 45, 60, 90, 120];

function timeSlots() {
  const out: string[] = [];
  for (let m = 6 * 60; m <= 21 * 60 + 45; m += 15) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }
  return out;
}

function durationLabel(d: number) {
  if (d < 60) return `${d} min`;
  const h = Math.floor(d / 60), m = d % 60;
  return m ? `${h} h ${m}` : `${h} h`;
}

type PatientLite = { id: string; nombre: string; telefono: string; identificacion?: string | null };

/**
 * Agendar una cita. Desde la ficha recibe el paciente; desde la agenda permite
 * buscarlo o registrarlo en el momento, y llega con fecha, hora y doctor ya elegidos.
 */
export default function BookingModal({
  open,
  onClose,
  clienteId,
  patientName,
  preset,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  clienteId?: string;
  patientName?: string;
  preset?: { fecha?: string; hora?: string; staffId?: string | null } | null;
  onSaved: (message: string) => void;
}) {
  const { options, error: optionsError } = useDentalOptions(open);
  const [serviceId, setServiceId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [fecha, setFecha] = useState(todayKey());
  const [hora, setHora] = useState('09:00');
  const [duracion, setDuracion] = useState(30);
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const slots = useMemo(timeSlots, []);

  // Selección de paciente (solo cuando no viene de la ficha)
  const needsPatient = !clienteId;
  const [patients, setPatients] = useState<PatientLite[] | null>(null);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<PatientLite | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const wasOpen = useRef(false);
  useEffect(() => {
    if (!open) { wasOpen.current = false; return; }
    if (wasOpen.current) return;
    wasOpen.current = true;
    const now = new Date();
    const next = Math.ceil((now.getHours() * 60 + now.getMinutes() + 15) / 15) * 15;
    const nextHM = `${String(Math.floor(next / 60)).padStart(2, '0')}:${String(next % 60).padStart(2, '0')}`;
    setFecha(preset?.fecha || todayKey());
    setHora(preset?.hora && slots.includes(preset.hora) ? preset.hora : slots.includes(nextHM) ? nextHM : '09:00');
    setStaffId(preset?.staffId || '');
    setNotas('');
    setError('');
    setQuery('');
    setPicked(null);
    setCreating(false);
    setNewName('');
    setNewPhone('');
    if (needsPatient) {
      api<{ patients: PatientLite[] }>('/api/admin/dental/patients')
        .then((d) => setPatients(d.patients || []))
        .catch(() => setPatients([]));
    }
  }, [open, preset, slots, needsPatient]);

  useEffect(() => {
    if (!open || !options) return;
    if (!serviceId && options.services[0]) {
      setServiceId(options.services[0].id);
      setDuracion(options.services[0].duracion || 30);
    }
    if (!staffId && !preset?.staffId && options.myStaffId) setStaffId(options.myStaffId);
  }, [open, options, serviceId, staffId, preset]);

  const matches = useMemo(() => {
    if (!patients) return [];
    const q = normalize(query.trim());
    const digits = query.replace(/\D/g, '');
    if (!q) return patients.slice(0, 6);
    return patients
      .filter((p) => normalize(p.nombre).includes(q) || (digits.length >= 3 && ((p.telefono || '').replace(/\D/g, '').includes(digits) || (p.identificacion || '').includes(digits))))
      .slice(0, 6);
  }, [patients, query]);

  const service = options?.services.find((s) => s.id === serviceId);
  const isToday = fecha === todayKey();
  const nowHM = (() => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; })();

  const resolvePatientId = async (): Promise<string | null> => {
    if (clienteId) return clienteId;
    if (picked) return picked.id;
    if (creating) {
      if (!newName.trim()) { setError('Escribe el nombre del paciente nuevo.'); return null; }
      if (newPhone.replace(/\D/g, '').length < 10) { setError('Escribe el teléfono completo del paciente nuevo.'); return null; }
      try {
        const d = await api<any>('/api/admin/dental/patients', { method: 'POST', json: { nombre: newName.trim(), telefono: newPhone } });
        return d.patient.id;
      } catch (e: any) {
        // Si ya existía con ese teléfono, usar ese paciente en vez de duplicarlo.
        if (e instanceof ApiError && e.data?.existingId) return e.data.existingId;
        setError(e.message);
        return null;
      }
    }
    setError('Elige el paciente o registra uno nuevo.');
    return null;
  };

  const submit = async () => {
    setError('');
    if (!serviceId) return setError('Elige el servicio.');
    if (isToday && hora < nowHM) return setError('Esa hora ya pasó. Elige una hora posterior.');
    setSaving(true);
    try {
      const pid = await resolvePatientId();
      if (!pid) return;
      await api('/api/admin/dental/appointments', {
        method: 'POST',
        json: { clienteId: pid, serviceId, staffId: staffId || undefined, fecha, horaInicio: hora, duracionMinutos: duracion, comentarios: notas },
      });
      onSaved('Cita agendada.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Agendar cita"
      description={patientName || undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} loading={saving} disabled={!options?.services.length}>Agendar</Button>
        </>
      }
    >
      <div className="space-y-4">
        {(error || optionsError) && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error || optionsError}</div>}

        {needsPatient && (
          <div>
            <span className="mb-1 block text-sm font-medium text-slate-700">Paciente <span className="text-rose-500">*</span></span>
            {picked ? (
              <div className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 p-2.5">
                <Avatar text={initials(picked.nombre)} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{picked.nombre}</p>
                  <p className="truncate text-xs text-slate-500">{picked.telefono}</p>
                </div>
                <button type="button" onClick={() => setPicked(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-white" aria-label="Cambiar paciente">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : creating ? (
              <div className="space-y-3 rounded-xl border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">Paciente nuevo</p>
                  <button type="button" onClick={() => setCreating(false)} className="text-sm font-medium text-sky-600">Buscar existente</button>
                </div>
                <input className={inputClass} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre completo" />
                <PhoneInput value={newPhone} onChange={setNewPhone} placeholder="099 123 4567" />
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200">
                <div className="relative border-b border-slate-100">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar por nombre, teléfono o cédula…"
                    className="w-full rounded-t-xl bg-transparent py-2.5 pl-9 pr-3 text-sm focus:outline-none"
                  />
                </div>
                <ul className="max-h-56 overflow-y-auto p-1">
                  {patients === null ? (
                    <li className="px-3 py-3 text-sm text-slate-400">Cargando pacientes…</li>
                  ) : matches.length === 0 ? (
                    <li className="px-3 py-3 text-sm text-slate-500">{query ? 'Nadie coincide con la búsqueda.' : 'Aún no hay pacientes.'}</li>
                  ) : (
                    matches.map((p) => (
                      <li key={p.id}>
                        <button type="button" onClick={() => setPicked(p)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-50">
                          <Avatar text={initials(p.nombre)} size="sm" />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-slate-900">{p.nombre}</span>
                            <span className="block truncate text-xs text-slate-500">{p.telefono || 'Sin teléfono'}</span>
                          </span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
                <button
                  type="button"
                  onClick={() => { setCreating(true); if (query && !/\d{3}/.test(query)) setNewName(query); }}
                  className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2.5 text-sm font-medium text-sky-700 hover:bg-sky-50"
                >
                  <UserPlus className="h-4 w-4" /> Registrar paciente nuevo
                </button>
              </div>
            )}
          </div>
        )}

        {options && options.services.length === 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Primero crea tus servicios (consulta, limpieza…).{' '}
            <Link href="/admin/servicios" className="font-semibold underline">Ir a Servicios y precios</Link>
          </div>
        ) : (
          <Field label="Servicio" required>
            <select
              className={inputClass}
              value={serviceId}
              onChange={(e) => {
                setServiceId(e.target.value);
                const s = options?.services.find((x) => x.id === e.target.value);
                if (s?.duracion) setDuracion(s.duracion);
              }}
            >
              {options?.services.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}{s.precio != null ? ` · ${money(s.precio)}` : ''}</option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Doctor">
          <select className={inputClass} value={staffId} onChange={(e) => setStaffId(e.target.value)}>
            <option value="">Cualquier doctor disponible</option>
            {options?.staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha" required>
            <input type="date" className={inputClass} value={fecha} min={todayKey()} onChange={(e) => setFecha(e.target.value)} />
          </Field>
          <Field label="Hora" required>
            <select className={inputClass} value={hora} onChange={(e) => setHora(e.target.value)}>
              {slots.map((s) => (
                <option key={s} value={s} disabled={isToday && s < nowHM}>{s}</option>
              ))}
            </select>
          </Field>
        </div>

        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">Duración</span>
          <div className="flex flex-wrap gap-1.5">
            {Array.from(new Set([...DURATIONS, duracion])).sort((a, b) => a - b).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDuracion(d)}
                className={cx('rounded-lg px-3 py-1.5 text-sm ring-1 ring-inset', duracion === d ? 'bg-sky-600 text-white ring-sky-600' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50')}
              >
                {durationLabel(d)}
              </button>
            ))}
          </div>
          {service?.duracion ? <p className="mt-1 text-xs text-slate-500">Duración habitual de este servicio: {service.duracion} min</p> : null}
        </div>

        <Field label="Nota para la cita" hint="Opcional">
          <input className={inputClass} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ej. Control post endodoncia" />
        </Field>

        <p className="text-xs text-slate-500">Si el doctor o el paciente ya tienen una cita en ese horario, te avisaremos antes de guardarla.</p>
      </div>
    </Modal>
  );
}
