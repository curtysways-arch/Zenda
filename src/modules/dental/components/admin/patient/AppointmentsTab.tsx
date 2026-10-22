'use client';

import React from 'react';
import Link from 'next/link';
import { CalendarDays, CalendarPlus } from 'lucide-react';
import { apptKey, apptState, formatApptDate, money, todayKey } from '../../../lib/format';
import { Button, Card, EmptyState, Badge } from '../ui';

function Row({ a }: { a: any }) {
  const st = apptState(a.estado);
  return (
    <li className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold first-letter:uppercase text-slate-900">{formatApptDate(a.fecha, { weekday: 'short' })}</p>
          <span className="text-sm text-slate-500">{a.horaInicio}{a.horaFin ? ` – ${a.horaFin}` : ''}</span>
          <Badge tone={st.tone}>{st.label}</Badge>
        </div>
        <p className="truncate text-sm text-slate-500">
          {a.service?.nombre || 'Cita'}{a.staff?.name ? ` · ${a.staff.name}` : ''}{a.comentarios ? ` · ${a.comentarios}` : ''}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {Number(a.total) > 0 && <span className="text-sm font-medium text-slate-700">{money(a.total)}</span>}
        <Link href={`/admin/citas/${a.id}`} className="text-sm font-medium text-sky-600 hover:text-sky-700">Ver cita</Link>
      </div>
    </li>
  );
}

export default function AppointmentsTab({ appointments, onBook }: { appointments: any[]; onBook: () => void }) {
  if (!appointments.length) {
    return (
      <EmptyState
        icon={<CalendarDays className="h-12 w-12" />}
        title="Sin citas"
        description="Agenda la primera cita del paciente."
        action={<Button icon={<CalendarPlus className="h-4 w-4" />} onClick={onBook}>Agendar cita</Button>}
      />
    );
  }

  const today = todayKey();
  const upcoming = appointments
    .filter((a) => apptKey(a.fecha) >= today && !['completed', 'finalizada', 'cancelled', 'cancelada', 'no_show', 'expired', 'rejected'].includes(a.estado))
    .sort((a, b) => apptKey(a.fecha).localeCompare(apptKey(b.fecha)) || a.horaInicio.localeCompare(b.horaInicio));
  const upcomingIds = new Set(upcoming.map((a) => a.id));
  const past = appointments.filter((a) => !upcomingIds.has(a.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">Próximas citas</p>
        <Button size="sm" icon={<CalendarPlus className="h-4 w-4" />} onClick={onBook}>Agendar cita</Button>
      </div>
      {upcoming.length ? (
        <Card padded={false}><ul className="divide-y divide-slate-100">{upcoming.map((a) => <Row key={a.id} a={a} />)}</ul></Card>
      ) : (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-center text-sm text-slate-500">No tiene citas próximas.</p>
      )}

      {past.length > 0 && (
        <>
          <p className="pt-2 text-sm font-semibold text-slate-700">Historial ({past.length})</p>
          <Card padded={false}><ul className="divide-y divide-slate-100">{past.map((a) => <Row key={a.id} a={a} />)}</ul></Card>
        </>
      )}
    </div>
  );
}
