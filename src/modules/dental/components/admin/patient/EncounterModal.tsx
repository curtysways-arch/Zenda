'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { api } from '../../../lib/api';
import { apptKey, todayKey } from '../../../lib/format';
import { Modal, Field, Button, inputClass, cx } from '../ui';
import { useDentalOptions } from './types';

const MOTIVOS = ['Control', 'Valoración inicial', 'Dolor', 'Limpieza', 'Urgencia', 'Continuación de tratamiento'];

/** Diagnósticos frecuentes (CIE-10) para autocompletar. */
const CIE_COMUNES = [
  ['K02.1', 'Caries de la dentina'],
  ['K02.9', 'Caries dental, no especificada'],
  ['K03.6', 'Depósitos (cálculo) en los dientes'],
  ['K04.0', 'Pulpitis'],
  ['K04.1', 'Necrosis de la pulpa'],
  ['K04.7', 'Absceso periapical sin fístula'],
  ['K05.1', 'Gingivitis crónica'],
  ['K05.3', 'Periodontitis crónica'],
  ['K07.6', 'Trastornos de la articulación temporomandibular'],
  ['K08.1', 'Pérdida de dientes por accidente, extracción o enfermedad periodontal'],
  ['K01.1', 'Dientes impactados'],
  ['S02.5', 'Fractura de los dientes'],
  ['Z01.2', 'Examen odontológico'],
];

export default function EncounterModal({
  open,
  onClose,
  clienteId,
  appointments,
  defaultAppointmentId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  clienteId: string;
  appointments: any[];
  defaultAppointmentId?: string | null;
  onSaved: (message: string) => void;
}) {
  const { options } = useDentalOptions(open);
  const [motivo, setMotivo] = useState('');
  const [staffId, setStaffId] = useState('');
  const [appointmentId, setAppointmentId] = useState('');
  const [markCompleted, setMarkCompleted] = useState(true);
  const [showVitals, setShowVitals] = useState(false);
  const [vitals, setVitals] = useState({ presionArterial: '', frecuenciaCardiaca: '', temperatura: '', saturacion: '' });
  const [problema, setProblema] = useState('');
  const [examen, setExamen] = useState('');
  const [diagnostico, setDiagnostico] = useState('');
  const [cie, setCie] = useState('');
  const [procedimiento, setProcedimiento] = useState('');
  const [prescripcion, setPrescripcion] = useState('');
  const [indicaciones, setIndicaciones] = useState('');
  const [proximaCita, setProximaCita] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Citas que se pueden vincular: las de hoy y las de los últimos 7 días que no estén canceladas.
  const linkable = useMemo(() => {
    const today = todayKey();
    const [y, m, d] = today.split('-').map(Number);
    const weekAgo = new Date(Date.UTC(y, m - 1, d - 7)).toISOString().slice(0, 10);
    return appointments.filter((a) => {
      const k = apptKey(a.fecha);
      return k <= today && k >= weekAgo && !['cancelled', 'cancelada', 'CANCELADA', 'rejected', 'expired', 'no_show'].includes(a.estado);
    });
  }, [appointments]);

  // Inicializar el formulario solo al abrir (no cuando cambian los datos de fondo).
  const wasOpen = useRef(false);
  useEffect(() => {
    if (!open) { wasOpen.current = false; return; }
    if (wasOpen.current) return;
    wasOpen.current = true;
    setMotivo('');
    setProblema('');
    setExamen('');
    setDiagnostico('');
    setCie('');
    setProcedimiento('');
    setPrescripcion('');
    setIndicaciones('');
    setProximaCita('');
    setVitals({ presionArterial: '', frecuenciaCardiaca: '', temperatura: '', saturacion: '' });
    setShowVitals(false);
    setError('');
    const pre = defaultAppointmentId && linkable.find((a) => a.id === defaultAppointmentId);
    const todays = linkable.find((a) => apptKey(a.fecha) === todayKey());
    const chosen = pre || todays || null;
    setAppointmentId(chosen ? chosen.id : '');
    setMarkCompleted(true);
    if (chosen?.service?.nombre) setMotivo(chosen.service.nombre);
    if (chosen?.staff?.id) setStaffId(chosen.staff.id);
  }, [open, defaultAppointmentId, linkable]);

  useEffect(() => {
    if (open && !staffId && options?.myStaffId) setStaffId(options.myStaffId);
  }, [open, options, staffId]);

  const onCieChange = (value: string) => {
    setCie(value);
    const match = CIE_COMUNES.find(([code]) => code.toLowerCase() === value.trim().toLowerCase());
    if (match && !diagnostico) setDiagnostico(match[1]);
  };

  const linked = linkable.find((a) => a.id === appointmentId);
  const linkedDone = linked && ['completed', 'finalizada'].includes(linked.estado);

  const submit = async () => {
    setError('');
    if (!motivo.trim()) return setError('Escribe el motivo de la consulta.');
    setSaving(true);
    try {
      await api('/api/admin/dental/encounters', {
        method: 'POST',
        json: {
          clienteId,
          appointmentId: appointmentId || undefined,
          staffId: staffId || undefined,
          motivoConsulta: motivo,
          problemaActual: { descripcion: problema },
          signosVitales: vitals,
          examenFisico: examen,
          diagnostico,
          codigoCIE: cie,
          procedimientoRealizado: procedimiento,
          prescripcion,
          indicaciones,
          proximaCita: proximaCita || undefined,
        },
      });
      let msg = 'Consulta guardada en la historia clínica.';
      if (linked && markCompleted && !linkedDone) {
        try {
          await api(`/api/appointments/${linked.id}/status`, { method: 'PATCH', json: { estado: 'completed' } });
          msg = 'Consulta guardada y cita marcada como atendida.';
        } catch {
          msg = 'Consulta guardada. No se pudo marcar la cita como atendida; hazlo desde la agenda.';
        }
      }
      onSaved(msg);
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
      size="lg"
      title="Registrar consulta"
      description="Lo que se hizo hoy con el paciente. Queda guardado en su historia clínica."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} loading={saving}>Guardar consulta</Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}

        <Field label="Motivo de la consulta" required>
          <input className={inputClass} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej. Dolor en molar superior derecho" />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {MOTIVOS.map((m) => (
              <button key={m} type="button" onClick={() => setMotivo(m)} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200">
                {m}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Doctor que atiende">
            <select className={inputClass} value={staffId} onChange={(e) => setStaffId(e.target.value)}>
              <option value="">Sin especificar</option>
              {options?.staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Cita relacionada" hint={linkable.length ? undefined : 'No hay citas recientes para vincular'}>
            <select className={inputClass} value={appointmentId} onChange={(e) => setAppointmentId(e.target.value)} disabled={!linkable.length}>
              <option value="">Ninguna (consulta sin cita)</option>
              {linkable.map((a) => (
                <option key={a.id} value={a.id}>
                  {apptKey(a.fecha) === todayKey() ? 'Hoy' : apptKey(a.fecha)} {a.horaInicio} · {a.service?.nombre || 'Cita'}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {linked && !linkedDone && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={markCompleted} onChange={(e) => setMarkCompleted(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-sky-600" />
            Marcar la cita como atendida
          </label>
        )}

        <Field label="Síntomas / historia del problema">
          <textarea className={inputClass} rows={2} value={problema} onChange={(e) => setProblema(e.target.value)} placeholder="Desde cuándo, qué siente, qué lo empeora…" />
        </Field>

        <div className="rounded-xl border border-slate-200">
          <button type="button" onClick={() => setShowVitals((v) => !v)} className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium text-slate-700">
            Signos vitales <span className="ml-1 font-normal text-slate-400">(opcional)</span>
            <ChevronDown className={cx('ml-auto h-4 w-4 text-slate-400 transition', showVitals && 'rotate-180')} />
          </button>
          {showVitals && (
            <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-3 sm:grid-cols-4">
              {([
                ['presionArterial', 'Presión', '120/80'],
                ['frecuenciaCardiaca', 'Pulso', '75'],
                ['temperatura', 'Temp. °C', '36.5'],
                ['saturacion', 'SpO₂ %', '98'],
              ] as const).map(([key, label, ph]) => (
                <label key={key} className="block">
                  <span className="mb-1 block text-xs text-slate-500">{label}</span>
                  <input className={inputClass} value={(vitals as any)[key]} placeholder={ph} onChange={(e) => setVitals((v) => ({ ...v, [key]: e.target.value }))} />
                </label>
              ))}
            </div>
          )}
        </div>

        <Field label="Examen clínico">
          <textarea className={inputClass} rows={2} value={examen} onChange={(e) => setExamen(e.target.value)} placeholder="Hallazgos al examinar: encías, piezas, oclusión…" />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Diagnóstico" className="sm:col-span-2">
            <input className={inputClass} value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)} placeholder="Ej. Pulpitis irreversible pieza 16" />
          </Field>
          <Field label="Código CIE-10" hint="Escribe o elige">
            <input className={inputClass} list="cie-dental" value={cie} onChange={(e) => onCieChange(e.target.value)} placeholder="K04.0" />
            <datalist id="cie-dental">
              {CIE_COMUNES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
            </datalist>
          </Field>
        </div>

        <Field label="Procedimiento realizado">
          <textarea className={inputClass} rows={2} value={procedimiento} onChange={(e) => setProcedimiento(e.target.value)} placeholder="Ej. Anestesia infiltrativa, apertura cameral, pulpectomía…" />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Receta">
            <textarea className={inputClass} rows={3} value={prescripcion} onChange={(e) => setPrescripcion(e.target.value)} placeholder="Ej. Amoxicilina 500 mg cada 8 h por 7 días" />
          </Field>
          <Field label="Indicaciones para el paciente">
            <textarea className={inputClass} rows={3} value={indicaciones} onChange={(e) => setIndicaciones(e.target.value)} placeholder="Ej. No comer en 2 horas, dieta blanda…" />
          </Field>
        </div>

        <Field label="Próximo control" hint="Fecha sugerida para volver (no agenda la cita)">
          <input type="date" className={inputClass} value={proximaCita} min={todayKey()} onChange={(e) => setProximaCita(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
