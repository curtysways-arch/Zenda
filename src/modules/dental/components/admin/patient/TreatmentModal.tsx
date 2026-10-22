'use client';

import React, { useEffect, useRef, useState } from 'react';
import { api } from '../../../lib/api';
import { PRIORITIES, TREATMENT_STATES } from '../../../lib/format';
import { Modal, Field, Button, inputClass, cx } from '../ui';
import { useDentalOptions } from './types';

export type TreatmentDraft = {
  id?: string;
  descripcion?: string;
  diente?: string | null;
  superficies?: string | null;
  costoEstimado?: number | null;
  prioridad?: string | null;
  estado?: string;
  notas?: string | null;
  serviceId?: string | null;
  staffId?: string | null;
};

const FACES = [
  { id: 'V', label: 'Vestibular' },
  { id: 'M', label: 'Mesial' },
  { id: 'O', label: 'Oclusal / Incisal' },
  { id: 'D', label: 'Distal' },
  { id: 'L', label: 'Lingual / Palatino' },
];

/** Sugerencia de procedimiento según el hallazgo del odontograma. */
export const SUGGESTED_PROCEDURE: Record<string, string> = {
  CARIES: 'Restauración con resina',
  EXTRACCION_INDICADA: 'Extracción',
  ENDODONCIA: 'Endodoncia',
  CORONA: 'Corona',
  IMPLANTE: 'Implante dental',
  PROTESIS: 'Prótesis',
  SELLANTE: 'Sellante de fosas y fisuras',
};

export default function TreatmentModal({
  open,
  onClose,
  clienteId,
  draft,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  clienteId: string;
  draft?: TreatmentDraft | null;
  onSaved: (message: string) => void;
}) {
  const isEdit = Boolean(draft?.id);
  const { options } = useDentalOptions(open);
  const [descripcion, setDescripcion] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [diente, setDiente] = useState('');
  const [caras, setCaras] = useState<string[]>([]);
  const [costo, setCosto] = useState('');
  const [prioridad, setPrioridad] = useState('MEDIA');
  const [estado, setEstado] = useState('PLANIFICADO');
  const [staffId, setStaffId] = useState('');
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const wasOpen = useRef(false);
  useEffect(() => {
    if (!open) { wasOpen.current = false; return; }
    if (wasOpen.current) return;
    wasOpen.current = true;
    setDescripcion(draft?.descripcion || '');
    setServiceId(draft?.serviceId || '');
    setDiente(draft?.diente || '');
    setCaras((draft?.superficies || '').toUpperCase().replace(/[^VMODL]/g, '').split('').filter(Boolean));
    setCosto(draft?.costoEstimado != null ? String(draft.costoEstimado) : '');
    setPrioridad(draft?.prioridad || 'MEDIA');
    setEstado(draft?.estado || 'PLANIFICADO');
    setStaffId(draft?.staffId || '');
    setNotas(draft?.notas || '');
    setError('');
  }, [open, draft]);

  const pickService = (id: string) => {
    setServiceId(id);
    const s = options?.services.find((x) => x.id === id);
    if (s) {
      if (!descripcion.trim()) setDescripcion(s.nombre);
      if (!costo && s.precio != null) setCosto(String(s.precio));
    }
  };

  const toggleFace = (f: string) => setCaras((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));

  const submit = async () => {
    setError('');
    if (!descripcion.trim()) return setError('Describe el procedimiento.');
    if (diente && !diente.split(/[\s,;]+/).filter(Boolean).every((p) => /^[1-8][1-8]$/.test(p))) {
      return setError('La pieza dental debe ser un número de 2 dígitos (FDI), ej. 16 o 11, 21.');
    }
    if (costo && (isNaN(Number(costo)) || Number(costo) < 0)) return setError('El costo no es válido.');
    setSaving(true);
    try {
      const payload = {
        descripcion,
        diente,
        superficies: FACES.map((f) => f.id).filter((f) => caras.includes(f)).join(''),
        costoEstimado: costo === '' ? null : Number(costo),
        prioridad,
        notas,
        staffId: staffId || null,
      };
      if (isEdit) {
        await api('/api/admin/dental/treatments', { method: 'PATCH', json: { id: draft!.id, ...payload, estado } });
      } else {
        await api('/api/admin/dental/treatments', { method: 'POST', json: { clienteId, ...payload, estado, serviceId: serviceId || undefined } });
      }
      onSaved(isEdit ? 'Tratamiento actualizado.' : 'Tratamiento agregado al plan.');
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
      title={isEdit ? 'Editar tratamiento' : 'Agregar al plan de tratamiento'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} loading={saving}>{isEdit ? 'Guardar cambios' : 'Agregar'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}

        {!isEdit && options && options.services.length > 0 && (
          <Field label="Servicio de tu lista" hint="Opcional: completa el nombre y el precio">
            <select className={inputClass} value={serviceId} onChange={(e) => pickService(e.target.value)}>
              <option value="">Elegir un servicio…</option>
              {options.services.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}{s.precio != null ? ` · $${Number(s.precio).toFixed(2)}` : ''}</option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Procedimiento" required>
          <input className={inputClass} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej. Restauración con resina" />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Pieza dental (FDI)" hint="Ej. 16, o varias: 11, 21">
            <input className={inputClass} value={diente} onChange={(e) => setDiente(e.target.value)} inputMode="numeric" placeholder="16" />
          </Field>
          <Field label="Costo estimado (USD)">
            <input className={inputClass} value={costo} onChange={(e) => setCosto(e.target.value)} inputMode="decimal" placeholder="0.00" />
          </Field>
        </div>

        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">Caras del diente</span>
          <div className="flex flex-wrap gap-1.5">
            {FACES.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => toggleFace(f.id)}
                className={cx('rounded-lg px-3 py-1.5 text-sm ring-1 ring-inset', caras.includes(f.id) ? 'bg-sky-600 text-white ring-sky-600' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50')}
                title={f.label}
              >
                <strong>{f.id}</strong> <span className="hidden sm:inline">· {f.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <span className="mb-1 block text-sm font-medium text-slate-700">Prioridad</span>
            <div className="inline-flex w-full rounded-xl bg-slate-100 p-1">
              {PRIORITIES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPrioridad(p.id)}
                  className={cx('flex-1 rounded-lg px-3 py-1.5 text-sm font-medium', prioridad === p.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <Field label="Estado">
            <select className={inputClass} value={estado} onChange={(e) => setEstado(e.target.value)}>
              {TREATMENT_STATES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Doctor responsable">
          <select className={inputClass} value={staffId} onChange={(e) => setStaffId(e.target.value)}>
            <option value="">Sin asignar</option>
            {options?.staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>

        <Field label="Notas">
          <textarea className={inputClass} rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Material, número de sesiones, observaciones…" />
        </Field>
      </div>
    </Modal>
  );
}
