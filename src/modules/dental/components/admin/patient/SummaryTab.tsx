'use client';

import React from 'react';
import { Stethoscope, ClipboardList, CalendarDays, HeartPulse, ChevronRight, Plus } from 'lucide-react';
import {
  ACTIVE_TREATMENT_STATES, ALLERGIES, MEDICAL_CONDITIONS, HABITS, activeFlags, apptKey, formatApptDate,
  formatDateTime, money, todayKey, treatmentState,
} from '../../../lib/format';
import { Card, CardHeader, Badge, Button } from '../ui';
import type { PatientData } from './types';

export default function SummaryTab({
  data,
  goTo,
  onNewEncounter,
  onNewTreatment,
  onBook,
}: {
  data: PatientData;
  goTo: (tab: 'historia' | 'consultas' | 'tratamientos' | 'citas') => void;
  onNewEncounter: () => void;
  onNewTreatment: () => void;
  onBook: () => void;
}) {
  const { record, appointments } = data;
  const conditions = activeFlags(record?.antecedentesMedicos, MEDICAL_CONDITIONS);
  const allergies = activeFlags(record?.alergias, ALLERGIES);
  const habits = activeFlags(record?.habitos, HABITS);
  const allergyDetail = record?.alergias?.detalle;
  const otherHistory = record?.antecedentesMedicos?.otros;
  const lastEncounter = record?.encounters?.[0];
  const active = (record?.treatments || []).filter((t) => ACTIVE_TREATMENT_STATES.includes(t.estado));
  const pending = active.reduce((s, t) => s + (Number(t.costoEstimado) || 0), 0);
  const today = todayKey();
  const next = appointments
    .filter((a) => apptKey(a.fecha) >= today && !['completed', 'finalizada', 'cancelled', 'cancelada', 'no_show', 'expired', 'rejected'].includes(a.estado))
    .sort((a, b) => apptKey(a.fecha).localeCompare(apptKey(b.fecha)) || a.horaInicio.localeCompare(b.horaInicio))[0];
  const historyEmpty = !record || (!conditions.length && !allergies.length && !record.medicacionActual && !record.grupoSanguineo && !habits.length);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        {/* Salud general */}
        <Card>
          <CardHeader
            title="Salud general"
            icon={<HeartPulse className="h-5 w-5" />}
            action={<button type="button" onClick={() => goTo('historia')} className="text-sm font-medium text-sky-600 hover:text-sky-700">{historyEmpty ? 'Completar' : 'Editar'}</button>}
          />
          {historyEmpty ? (
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              Aún no se registra la historia clínica (alergias, enfermedades, medicación). Complétala antes de cualquier procedimiento.
            </p>
          ) : (
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Alergias</dt>
                <dd className="mt-1 flex flex-wrap gap-1">
                  {allergies.length || allergyDetail
                    ? [...allergies.map((a) => <Badge key={a} tone="rose">{a}</Badge>), allergyDetail ? <span key="d" className="text-slate-700">{allergyDetail}</span> : null]
                    : <span className="text-slate-700">Ninguna conocida</span>}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Enfermedades / condiciones</dt>
                <dd className="mt-1 flex flex-wrap gap-1">
                  {conditions.length ? conditions.map((c) => <Badge key={c} tone="amber">{c}</Badge>) : <span className="text-slate-700">Ninguna</span>}
                  {otherHistory && <span className="text-slate-700">{otherHistory}</span>}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Medicación actual</dt>
                <dd className="mt-1 text-slate-700">{record?.medicacionActual || 'Ninguna'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Hábitos · Grupo sanguíneo</dt>
                <dd className="mt-1 text-slate-700">
                  {[habits.join(', '), record?.grupoSanguineo ? `Grupo ${record.grupoSanguineo}` : null].filter(Boolean).join(' · ') || '—'}
                </dd>
              </div>
            </dl>
          )}
          {record?.observaciones && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{record.observaciones}</p>}
        </Card>

        {/* Última consulta */}
        <Card>
          <CardHeader
            title="Última consulta"
            icon={<Stethoscope className="h-5 w-5" />}
            action={<Button size="sm" variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={onNewEncounter}>Nueva</Button>}
          />
          {lastEncounter ? (
            <button type="button" onClick={() => goTo('consultas')} className="block w-full rounded-xl bg-slate-50 p-3 text-left hover:bg-slate-100">
              <p className="text-xs text-slate-500">{formatDateTime(lastEncounter.fecha)}{lastEncounter.Staff?.name ? ` · ${lastEncounter.Staff.name}` : ''}</p>
              <p className="mt-0.5 font-semibold text-slate-900">{lastEncounter.motivoConsulta}</p>
              {lastEncounter.diagnostico && <p className="text-sm text-slate-600">Diagnóstico: {lastEncounter.diagnostico}</p>}
              {lastEncounter.procedimientoRealizado && <p className="text-sm text-slate-600">Procedimiento: {lastEncounter.procedimientoRealizado}</p>}
              {record!.encounters.length > 1 && (
                <p className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-sky-600">Ver las {record!.encounters.length} consultas <ChevronRight className="h-4 w-4" /></p>
              )}
            </button>
          ) : (
            <p className="text-sm text-slate-500">Todavía no hay consultas registradas.</p>
          )}
        </Card>
      </div>

      <div className="space-y-4">
        {/* Próxima cita */}
        <Card>
          <CardHeader title="Próxima cita" icon={<CalendarDays className="h-5 w-5" />} />
          {next ? (
            <button type="button" onClick={() => goTo('citas')} className="block w-full rounded-xl bg-sky-50 p-3 text-left hover:bg-sky-100">
              <p className="font-semibold first-letter:uppercase text-sky-900">{formatApptDate(next.fecha, { weekday: 'long', day: 'numeric', month: 'long', year: undefined })}</p>
              <p className="text-sm text-sky-800">{next.horaInicio} · {next.service?.nombre || 'Cita'}</p>
              {next.staff?.name && <p className="text-xs text-sky-700">{next.staff.name}</p>}
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-slate-500">No tiene citas agendadas.</p>
              <Button size="sm" className="w-full" onClick={onBook}>Agendar cita</Button>
            </div>
          )}
        </Card>

        {/* Tratamientos */}
        <Card>
          <CardHeader
            title="Plan de tratamiento"
            subtitle={active.length ? `${active.length} pendiente${active.length === 1 ? '' : 's'} · ${money(pending)}` : undefined}
            icon={<ClipboardList className="h-5 w-5" />}
            action={<button type="button" onClick={onNewTreatment} className="text-sm font-medium text-sky-600 hover:text-sky-700">Agregar</button>}
          />
          {active.length ? (
            <ul className="space-y-2">
              {active.slice(0, 5).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                  <span className="min-w-0 truncate">
                    {t.diente && <strong className="mr-1 text-slate-900">{t.diente}</strong>}
                    <span className="text-slate-700">{t.descripcion}</span>
                  </span>
                  <Badge tone={treatmentState(t.estado).tone as any}>{treatmentState(t.estado).label}</Badge>
                </li>
              ))}
              {active.length > 5 && (
                <li>
                  <button type="button" onClick={() => goTo('tratamientos')} className="text-sm font-medium text-sky-600">Ver todos ({active.length})</button>
                </li>
              )}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Sin tratamientos pendientes.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
