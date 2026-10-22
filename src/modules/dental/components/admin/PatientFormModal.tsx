'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import PhoneInput from '@/components/ui/PhoneInput';
import { api, ApiError } from '../../lib/api';
import { birthInputValue, todayKey } from '../../lib/format';
import { Modal, Field, Button, inputClass } from './ui';

export type PatientFormValues = {
  id?: string;
  nombre?: string;
  telefono?: string;
  email?: string | null;
  identificacion?: string | null;
  fechaNacimiento?: string | Date | null;
};

/**
 * Formulario para registrar o editar un paciente.
 * Al crear: si el teléfono o la cédula ya existen, ofrece abrir esa ficha en vez de duplicar.
 */
export default function PatientFormModal({
  open,
  onClose,
  initial,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  initial?: PatientFormValues | null;
  onSaved: (patient: { id: string; nombre: string }) => void;
}) {
  const isEdit = Boolean(initial?.id);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [identificacion, setIdentificacion] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [existingId, setExistingId] = useState<string | null>(null);

  // Cargar los valores solo al abrir (el padre puede re-renderizar con un objeto nuevo).
  const wasOpen = useRef(false);
  useEffect(() => {
    if (!open) { wasOpen.current = false; return; }
    if (wasOpen.current) return;
    wasOpen.current = true;
    setNombre(initial?.nombre || '');
    setTelefono(initial?.telefono || '');
    setEmail(initial?.email || '');
    setIdentificacion(initial?.identificacion || '');
    setFechaNacimiento(birthInputValue(initial?.fechaNacimiento));
    setError('');
    setExistingId(null);
  }, [open, initial]);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');
    setExistingId(null);
    if (!nombre.trim()) return setError('Escribe el nombre del paciente.');
    if (telefono.replace(/\D/g, '').length < 10) return setError('Escribe el teléfono completo.');

    setSaving(true);
    try {
      const payload = {
        nombre: nombre.trim(),
        telefono,
        email: email.trim(),
        identificacion: identificacion.trim(),
        fechaNacimiento: fechaNacimiento || '',
      };
      const data = isEdit
        ? await api<any>(`/api/admin/dental/patients/${initial!.id}`, { method: 'PATCH', json: payload })
        : await api<any>('/api/admin/dental/patients', { method: 'POST', json: payload });
      onSaved(data.patient);
    } catch (err: any) {
      setError(err.message);
      if (err instanceof ApiError && err.data?.existingId) setExistingId(err.data.existingId);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar datos del paciente' : 'Nuevo paciente'}
      description={isEdit ? undefined : 'Con nombre y teléfono es suficiente. Lo demás puedes completarlo después.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => submit()} loading={saving}>{isEdit ? 'Guardar cambios' : 'Registrar paciente'}</Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {error}
            {existingId && (
              <Link href={`/admin/pacientes/${existingId}`} className="ml-1 font-semibold underline">
                Abrir su ficha
              </Link>
            )}
          </div>
        )}

        <Field label="Nombre completo" required>
          <input className={inputClass} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. María José Andrade" autoComplete="off" />
        </Field>

        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">Teléfono / WhatsApp <span className="text-rose-500">*</span></span>
          <PhoneInput value={telefono} onChange={setTelefono} placeholder="099 123 4567" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Cédula" hint="Opcional">
            <input className={inputClass} value={identificacion} onChange={(e) => setIdentificacion(e.target.value.replace(/\s/g, ''))} inputMode="numeric" placeholder="0912345678" />
          </Field>
          <Field label="Fecha de nacimiento" hint="Para calcular la edad">
            <input type="date" className={inputClass} value={fechaNacimiento} max={todayKey()} onChange={(e) => setFechaNacimiento(e.target.value)} />
          </Field>
        </div>

        <Field label="Correo electrónico" hint="Opcional">
          <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="paciente@correo.com" />
        </Field>

        {/* Permite enviar con Enter */}
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  );
}
