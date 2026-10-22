'use client';

import React, { useEffect, useState } from 'react';
import { Save, HeartPulse, AlertTriangle, Coffee, NotebookPen } from 'lucide-react';
import { api } from '../../../lib/api';
import { ALLERGIES, HABITS, MEDICAL_CONDITIONS, formatDateTime } from '../../../lib/format';
import { Card, CardHeader, Field, Button, ToggleChip, inputClass, cx } from '../ui';
import type { ClinicalRecord } from './types';

const BLOOD = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

/** Anamnesis: antecedentes, alergias, medicación y hábitos. */
export default function HistoryTab({
  clienteId,
  record,
  onSaved,
  onDirtyChange,
}: {
  clienteId: string;
  record: ClinicalRecord | null;
  onSaved: (message: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [antecedentes, setAntecedentes] = useState<Record<string, any>>({});
  const [alergias, setAlergias] = useState<Record<string, any>>({});
  const [habitos, setHabitos] = useState<Record<string, any>>({});
  const [grupo, setGrupo] = useState('');
  const [medicacion, setMedicacion] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setAntecedentes(record?.antecedentesMedicos || {});
    setAlergias(record?.alergias || {});
    setHabitos(record?.habitos || {});
    setGrupo(record?.grupoSanguineo || '');
    setMedicacion(record?.medicacionActual || '');
    setObservaciones(record?.observaciones || '');
    setDirty(false);
  }, [record]);

  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  const mark = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setDirty(true); };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await api('/api/admin/dental/records', {
        method: 'POST',
        json: {
          clienteId,
          grupoSanguineo: grupo,
          antecedentesMedicos: antecedentes,
          alergias,
          habitos,
          medicacionActual: medicacion,
          observaciones,
        },
      });
      setDirty(false);
      onSaved('Historia clínica guardada.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Antecedentes médicos" subtitle="Marca lo que el paciente tiene o ha tenido." icon={<HeartPulse className="h-5 w-5" />} />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {MEDICAL_CONDITIONS.map((c) => (
            <ToggleChip
              key={c.id}
              label={c.label}
              tone="amber"
              checked={antecedentes[c.id] === true}
              onChange={(v) => mark(setAntecedentes)({ ...antecedentes, [c.id]: v })}
            />
          ))}
        </div>
        <Field label="Otros antecedentes" className="mt-3">
          <input
            className={inputClass}
            value={antecedentes.otros || ''}
            onChange={(e) => mark(setAntecedentes)({ ...antecedentes, otros: e.target.value })}
            placeholder="Cirugías, hospitalizaciones, otras enfermedades…"
          />
        </Field>
      </Card>

      <Card>
        <CardHeader title="Alergias" subtitle="Se muestran como alerta en la ficha del paciente." icon={<AlertTriangle className="h-5 w-5" />} />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ALLERGIES.map((a) => (
            <ToggleChip
              key={a.id}
              label={a.label}
              checked={alergias[a.id] === true}
              onChange={(v) => mark(setAlergias)({ ...alergias, [a.id]: v })}
            />
          ))}
        </div>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Detalle de alergias">
            <input
              className={inputClass}
              value={alergias.detalle || ''}
              onChange={(e) => mark(setAlergias)({ ...alergias, detalle: e.target.value })}
              placeholder="Ej. Penicilina: urticaria"
            />
          </Field>
          <Field label="Medicación actual">
            <input className={inputClass} value={medicacion} onChange={(e) => mark(setMedicacion)(e.target.value)} placeholder="Ej. Losartán 50 mg diario" />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Hábitos y datos generales" icon={<Coffee className="h-5 w-5" />} />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {HABITS.map((h) => (
            <ToggleChip
              key={h.id}
              label={h.label}
              tone="sky"
              checked={habitos[h.id] === true}
              onChange={(v) => mark(setHabitos)({ ...habitos, [h.id]: v })}
            />
          ))}
        </div>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Grupo sanguíneo">
            <select className={inputClass} value={grupo} onChange={(e) => mark(setGrupo)(e.target.value)}>
              <option value="">No sabe / no indicado</option>
              {BLOOD.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Observaciones" icon={<NotebookPen className="h-5 w-5" />} />
        <textarea
          className={inputClass}
          rows={3}
          value={observaciones}
          onChange={(e) => mark(setObservaciones)(e.target.value)}
          placeholder="Información importante para cualquier doctor que atienda al paciente…"
        />
      </Card>

      <div className={cx(
        'flex flex-col gap-2 rounded-2xl border bg-white/95 p-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between',
        // Solo se queda fija abajo cuando hay algo que guardar.
        dirty ? 'sticky bottom-20 z-10 border-amber-200 shadow-lg lg:bottom-4' : 'border-slate-200'
      )}>
        <p className="text-sm text-slate-500">
          {error ? <span className="text-rose-700">{error}</span>
            : dirty ? <span className="font-medium text-amber-700">Tienes cambios sin guardar.</span>
              : record?.updatedAt ? `Última actualización: ${formatDateTime(record.updatedAt)}` : 'Aún no se ha llenado la historia clínica.'}
        </p>
        <Button onClick={save} loading={saving} disabled={!dirty} icon={<Save className="h-4 w-4" />}>Guardar historia clínica</Button>
      </div>
    </div>
  );
}
