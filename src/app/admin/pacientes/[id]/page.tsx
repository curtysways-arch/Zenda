'use client';

import React, { Suspense, use } from 'react';
import PatientDetail from '@/modules/dental/components/admin/patient/PatientDetail';
import { Page, Spinner } from '@/modules/dental/components/admin/ui';

export default function PacienteDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<Page><Spinner label="Cargando ficha del paciente…" /></Page>}>
      <PatientDetail clienteId={id} />
    </Suspense>
  );
}
