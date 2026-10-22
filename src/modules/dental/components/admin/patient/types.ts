'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

export type Patient = {
  id: string;
  nombre: string;
  telefono: string;
  email: string | null;
  fechaNacimiento: string | null;
  identificacion: string | null;
  imagenUrl: string | null;
  createdAt: string;
};

export type ClinicalRecord = {
  id: string;
  numeroHistoria: string | null;
  grupoSanguineo: string | null;
  antecedentesMedicos: Record<string, any> | null;
  alergias: Record<string, any> | null;
  medicacionActual: string | null;
  habitos: Record<string, any> | null;
  observaciones: string | null;
  encounters: any[];
  odontograms: any[];
  treatments: any[];
  documents: any[];
  updatedAt: string;
};

export type PatientData = {
  patient: Patient;
  record: ClinicalRecord | null;
  appointments: any[];
};

export type Options = {
  services: { id: string; nombre: string; precio: number | null; duracion: number }[];
  staff: { id: string; name: string; role: string | null }[];
  myStaffId: string | null;
};

let cache: Options | null = null;
let inflight: Promise<Options> | null = null;

/** Servicios y doctores activos (se cargan una vez por sesión de página). */
export function useDentalOptions(enabled = true) {
  const [options, setOptions] = useState<Options | null>(cache);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!enabled || cache) return;
    inflight = inflight || api<Options>('/api/admin/dental/options').then((d) => {
      cache = { services: d.services || [], staff: d.staff || [], myStaffId: d.myStaffId || null };
      return cache;
    });
    inflight
      .then((o) => setOptions(o))
      .catch((e) => {
        inflight = null;
        setError(e.message);
      });
  }, [enabled]);

  return { options, error };
}
