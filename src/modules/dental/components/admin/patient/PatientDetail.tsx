'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Sparkles, FileHeart, Smile, Stethoscope, ClipboardList, FolderOpen, CalendarDays,
  Pencil, CalendarPlus, Phone, MessageCircle, AlertTriangle,
} from 'lucide-react';
import { api } from '../../../lib/api';
import {
  ACTIVE_TREATMENT_STATES, ALLERGIES, MEDICAL_CONDITIONS, activeFlags, ageFrom, formatDate, initials, whatsappLink,
} from '../../../lib/format';
import DentalOdontogram from '../../DentalOdontogram';
import { Page, Avatar, Badge, Button, Spinner, ErrorBox, Tabs, useToast } from '../ui';
import PatientFormModal from '../PatientFormModal';
import type { PatientData } from './types';
import SummaryTab from './SummaryTab';
import HistoryTab from './HistoryTab';
import EncountersTab from './EncountersTab';
import TreatmentsTab from './TreatmentsTab';
import FilesTab from './FilesTab';
import AppointmentsTab from './AppointmentsTab';
import EncounterModal from './EncounterModal';
import TreatmentModal, { SUGGESTED_PROCEDURE, type TreatmentDraft } from './TreatmentModal';
import BookingModal from './BookingModal';

type TabKey = 'resumen' | 'historia' | 'odontograma' | 'consultas' | 'tratamientos' | 'archivos' | 'citas';
const TAB_KEYS: TabKey[] = ['resumen', 'historia', 'odontograma', 'consultas', 'tratamientos', 'archivos', 'citas'];

export default function PatientDetail({ clienteId }: { clienteId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const [data, setData] = useState<PatientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const initialTab = searchParams.get('tab') as TabKey | null;
  const [tab, setTab] = useState<TabKey>(initialTab && TAB_KEYS.includes(initialTab) ? initialTab : 'resumen');
  const [historyDirty, setHistoryDirty] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [encounterOpen, setEncounterOpen] = useState(searchParams.get('nueva') === '1');
  const [encounterApptId] = useState<string | null>(searchParams.get('cita'));
  const [bookingOpen, setBookingOpen] = useState(false);
  const [treatmentDraft, setTreatmentDraft] = useState<TreatmentDraft | null>(null);
  const [treatmentOpen, setTreatmentOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api<PatientData>(`/api/admin/dental/patients/${clienteId}`);
      setData(d);
      setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [clienteId]);

  useEffect(() => { load(); }, [load]);

  // Mensaje de bienvenida tras registrar un paciente, y limpiar parámetros de la URL.
  useEffect(() => {
    if (searchParams.get('nuevo') === '1') toast.show('Paciente registrado. Ahora puedes completar su historia clínica.');
    if (searchParams.toString()) router.replace(`/admin/pacientes/${clienteId}${initialTab && initialTab !== 'resumen' ? `?tab=${initialTab}` : ''}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeTab = (t: TabKey) => {
    if (tab === 'historia' && historyDirty && t !== 'historia') {
      if (!window.confirm('Tienes cambios sin guardar en la historia clínica. ¿Salir sin guardar?')) return;
      setHistoryDirty(false);
    }
    setTab(t);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const done = (message: string) => {
    toast.show(message);
    load();
  };
  const fail = (message: string) => toast.show(message, 'error');

  const record = data?.record || null;
  const patient = data?.patient;

  const latestOdontogram = record?.odontograms?.[0];
  const age = ageFrom(patient?.fechaNacimiento);
  const defaultMode = latestOdontogram?.tipo || (age !== null && age < 6 ? 'TEMPORAL' : age !== null && age < 13 ? 'MIXTO' : 'PERMANENTE');

  const alerts = useMemo(() => {
    const list = activeFlags(record?.alergias, ALLERGIES).join(', ');
    const detail = record?.alergias?.detalle;
    const text = list && detail ? `${list} (${detail})` : list || detail || '';
    return { allergies: text, conditions: activeFlags(record?.antecedentesMedicos, MEDICAL_CONDITIONS) };
  }, [record]);

  const activeTreatments = (record?.treatments || []).filter((t) => ACTIVE_TREATMENT_STATES.includes(t.estado)).length;

  const saveOdontogram = async (piezas: any, titulo?: string, tipo?: string) => {
    await api('/api/admin/dental/odontograms', { method: 'POST', json: { clienteId, piezas, titulo, tipo } });
    done('Odontograma guardado.');
  };

  const openTreatment = (draft: TreatmentDraft | null) => {
    setTreatmentDraft(draft);
    setTreatmentOpen(true);
  };

  if (loading) return <Page><Spinner label="Cargando ficha del paciente…" /></Page>;
  if (error && !data) {
    return (
      <Page>
        <ErrorBox message={error} onRetry={() => { setLoading(true); load(); }} />
        <Button variant="secondary" onClick={() => router.push('/admin/pacientes')}>Volver a pacientes</Button>
      </Page>
    );
  }
  if (!data || !patient) return null;

  const wa = whatsappLink(patient.telefono);

  return (
    <Page>
      {/* Encabezado del paciente */}
      <div className="space-y-3">
        <button type="button" onClick={() => router.push('/admin/pacientes')} className="text-sm font-medium text-slate-500 hover:text-slate-800">
          ← Pacientes
        </button>
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar text={initials(patient.nombre)} size="lg" />
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold text-slate-900 sm:text-2xl">{patient.nombre}</h1>
              <p className="text-sm text-slate-500">
                {[
                  age !== null ? `${age} años` : null,
                  patient.identificacion ? `C.I. ${patient.identificacion}` : null,
                  record?.numeroHistoria || null,
                  `Paciente desde ${formatDate(patient.createdAt, { month: 'short', year: 'numeric', day: undefined })}`,
                ].filter(Boolean).join(' · ')}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {patient.telefono && (
                  <a href={`tel:${patient.telefono}`} className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-sky-700">
                    <Phone className="h-3.5 w-3.5" /> {patient.telefono}
                  </a>
                )}
                {wa && (
                  <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100">
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </a>
                )}
                {patient.email && <span className="truncate text-sm text-slate-500">{patient.email}</span>}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:flex [&>button]:px-2 sm:[&>button]:px-4">
            <Button variant="secondary" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditOpen(true)}>
              <span className="hidden sm:inline">Editar datos</span><span className="sm:hidden">Editar</span>
            </Button>
            <Button variant="secondary" icon={<CalendarPlus className="h-4 w-4" />} onClick={() => setBookingOpen(true)}>
              Agendar
            </Button>
            <Button icon={<Stethoscope className="h-4 w-4" />} onClick={() => setEncounterOpen(true)}>
              Consulta
            </Button>
          </div>
        </div>

        {/* Alertas médicas, siempre visibles */}
        {(alerts.allergies || alerts.conditions.length > 0) && (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm">
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            {alerts.allergies && <span className="font-semibold text-rose-800">Alergia: {alerts.allergies}</span>}
            {alerts.conditions.map((c) => <Badge key={c} tone="amber">{c}</Badge>)}
          </div>
        )}
      </div>

      <Tabs<TabKey>
        value={tab}
        onChange={changeTab}
        tabs={[
          { id: 'resumen', label: 'Resumen', icon: <Sparkles className="h-4 w-4" /> },
          { id: 'historia', label: 'Historia clínica', icon: <FileHeart className="h-4 w-4" /> },
          { id: 'odontograma', label: 'Odontograma', icon: <Smile className="h-4 w-4" /> },
          { id: 'consultas', label: 'Consultas', icon: <Stethoscope className="h-4 w-4" />, count: record?.encounters.length },
          { id: 'tratamientos', label: 'Tratamientos', icon: <ClipboardList className="h-4 w-4" />, count: activeTreatments },
          { id: 'archivos', label: 'Archivos', icon: <FolderOpen className="h-4 w-4" />, count: record?.documents.length },
          { id: 'citas', label: 'Citas', icon: <CalendarDays className="h-4 w-4" />, count: data.appointments.length },
        ]}
      />

      {tab === 'resumen' && (
        <SummaryTab
          data={data}
          goTo={changeTab}
          onNewEncounter={() => setEncounterOpen(true)}
          onNewTreatment={() => openTreatment(null)}
          onBook={() => setBookingOpen(true)}
        />
      )}
      {tab === 'historia' && <HistoryTab clienteId={clienteId} record={record} onSaved={done} onDirtyChange={setHistoryDirty} />}
      {tab === 'odontograma' && (
        <DentalOdontogram
          initialPiezas={latestOdontogram?.piezas || {}}
          snapshots={record?.odontograms || []}
          onSaveSnapshot={saveOdontogram}
          onCreateTreatment={(tooth, surfaces, condition) =>
            openTreatment({ diente: tooth, superficies: surfaces, descripcion: SUGGESTED_PROCEDURE[condition] || '', prioridad: condition === 'CARIES' || condition === 'EXTRACCION_INDICADA' ? 'ALTA' : 'MEDIA' })
          }
          patientName={patient.nombre}
          defaultMode={defaultMode as any}
        />
      )}
      {tab === 'consultas' && (
        <EncountersTab encounters={record?.encounters || []} patientName={patient.nombre} onNew={() => setEncounterOpen(true)} />
      )}
      {tab === 'tratamientos' && (
        <TreatmentsTab
          treatments={record?.treatments || []}
          onNew={() => openTreatment(null)}
          onEdit={(t) => openTreatment({ ...t })}
          onChanged={done}
          onError={fail}
        />
      )}
      {tab === 'archivos' && <FilesTab clienteId={clienteId} documents={record?.documents || []} onChanged={done} onError={fail} />}
      {tab === 'citas' && <AppointmentsTab appointments={data.appointments} onBook={() => setBookingOpen(true)} />}

      <PatientFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        initial={patient}
        onSaved={() => { setEditOpen(false); done('Datos del paciente actualizados.'); }}
      />
      <EncounterModal
        open={encounterOpen}
        onClose={() => setEncounterOpen(false)}
        clienteId={clienteId}
        appointments={data.appointments}
        defaultAppointmentId={encounterApptId}
        onSaved={(m) => { setEncounterOpen(false); setTab('consultas'); done(m); }}
      />
      <TreatmentModal
        open={treatmentOpen}
        onClose={() => setTreatmentOpen(false)}
        clienteId={clienteId}
        draft={treatmentDraft}
        onSaved={(m) => { setTreatmentOpen(false); done(m); }}
      />
      <BookingModal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        clienteId={clienteId}
        patientName={patient.nombre}
        onSaved={(m) => { setBookingOpen(false); done(m); }}
      />

      {toast.node}
    </Page>
  );
}
