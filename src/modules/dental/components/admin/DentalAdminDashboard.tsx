'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CalendarDays, Users, ClipboardList, Clock, UserPlus, CalendarPlus, ChevronRight,
  MessageCircle, Stethoscope, FolderOpen, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import { api } from '../../lib/api';
import { apptState, money, relativeApptDay, whatsappLink, initials } from '../../lib/format';
import { Page, Card, CardHeader, StatCard, Badge, Spinner, ErrorBox, ButtonLink, Avatar, EmptyState, cx } from './ui';

interface DentalAdminDashboardProps {
  negocioNombre?: string;
  primaryColor?: string;
}

type Stats = {
  citasHoy: number;
  atendidasHoy: number;
  porConfirmar: number;
  proximos7Dias: number;
  pacientesTotal: number;
  pacientesNuevosMes: number;
  tratamientosEnProceso: number;
  presupuestoPendiente: number;
};

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
}

export default function DentalAdminDashboard({ negocioNombre }: DentalAdminDashboardProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [agenda, setAgenda] = useState<any[]>([]);
  const [proximas, setProximas] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await api<any>('/api/admin/dental/dashboard-stats');
      setStats(data.stats);
      setAgenda(data.agendaHoy || []);
      setProximas(data.proximasCitas || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Refrescar cada 2 minutos para ver nuevas reservas sin recargar.
    const t = setInterval(load, 120000);
    return () => clearInterval(t);
  }, [load]);

  const todayLabel = new Date().toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' });
  const pendientesHoy = agenda.filter((c) => !['completed', 'finalizada'].includes(c.estado));

  return (
    <Page>
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium first-letter:uppercase text-slate-500">{todayLabel}</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {greeting()}{negocioNombre ? <span className="text-slate-400"> · {negocioNombre}</span> : null}
          </h1>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <ButtonLink href="/admin/pacientes?nuevo=1" variant="secondary" icon={<UserPlus className="h-4 w-4" />}>
            Nuevo paciente
          </ButtonLink>
          <ButtonLink href="/admin/citas/nueva" icon={<CalendarPlus className="h-4 w-4" />}>
            Agendar cita
          </ButtonLink>
        </div>
      </div>

      {error && <ErrorBox message={error} onRetry={load} />}

      {loading ? (
        <Spinner label="Cargando el resumen del día…" />
      ) : stats && (
        <>
          {/* Indicadores */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Citas de hoy"
              value={stats.citasHoy}
              hint={stats.citasHoy ? `${stats.atendidasHoy} atendida${stats.atendidasHoy === 1 ? '' : 's'}` : 'Agenda libre'}
              icon={<CalendarDays className="h-5 w-5" />}
              href="/admin/citas"
            />
            <StatCard
              label="Por confirmar"
              value={stats.porConfirmar}
              hint={stats.porConfirmar ? 'Revisa y confirma' : 'Todo confirmado'}
              icon={<Clock className="h-5 w-5" />}
              tone={stats.porConfirmar ? 'amber' : 'emerald'}
              href="/admin/citas"
            />
            <StatCard
              label="Pacientes"
              value={stats.pacientesTotal}
              hint={`${stats.pacientesNuevosMes} nuevo${stats.pacientesNuevosMes === 1 ? '' : 's'} este mes`}
              icon={<Users className="h-5 w-5" />}
              tone="violet"
              href="/admin/pacientes"
            />
            <StatCard
              label="Tratamientos abiertos"
              value={stats.tratamientosEnProceso}
              hint={stats.presupuestoPendiente ? `${money(stats.presupuestoPendiente)} por realizar` : 'Sin presupuestos pendientes'}
              icon={<ClipboardList className="h-5 w-5" />}
              tone="emerald"
              href="/admin/tratamientos"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* Agenda de hoy */}
            <Card className="lg:col-span-2">
              <CardHeader
                title="Agenda de hoy"
                subtitle={agenda.length ? `${pendientesHoy.length} por atender de ${agenda.length}` : undefined}
                icon={<CalendarDays className="h-5 w-5" />}
                action={
                  <Link href="/admin/citas" className="inline-flex items-center gap-1 text-sm font-medium text-sky-600 hover:text-sky-700">
                    Ver agenda <ChevronRight className="h-4 w-4" />
                  </Link>
                }
              />
              {agenda.length === 0 ? (
                <EmptyState
                  icon={<CalendarDays className="h-10 w-10" />}
                  title="No hay citas para hoy"
                  description="Las citas que agendes o que tus pacientes reserven en tu página aparecerán aquí."
                  action={<ButtonLink href="/admin/citas/nueva" size="sm" icon={<CalendarPlus className="h-4 w-4" />}>Agendar cita</ButtonLink>}
                />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {agenda.map((c) => {
                    const st = apptState(c.estado);
                    const done = ['completed', 'finalizada'].includes(c.estado);
                    const wa = whatsappLink(c.cliente?.telefono, `Hola ${c.cliente?.nombre?.split(' ')[0] || ''}, te recordamos tu cita de hoy a las ${c.horaInicio}.`);
                    return (
                      <li key={c.id} className={cx('flex flex-col gap-3 py-3 sm:flex-row sm:items-center', done && 'opacity-60')}>
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div className="w-14 shrink-0 text-center">
                            <p className="text-base font-bold text-slate-900">{c.horaInicio}</p>
                            <p className="text-xs text-slate-400">{c.horaFin}</p>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate font-semibold text-slate-900">{c.cliente?.nombre || 'Paciente'}</p>
                              <Badge tone={st.tone}>{st.label}</Badge>
                              {c.tieneEvolucion && (
                                <Badge tone="emerald"><CheckCircle2 className="h-3 w-3" /> Con evolución</Badge>
                              )}
                            </div>
                            <p className="truncate text-sm text-slate-500">
                              {c.service?.nombre || 'Consulta'}{c.staff?.name ? ` · ${c.staff.name}` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 sm:shrink-0">
                          {wa && !done && (
                            <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center rounded-xl p-2 text-emerald-600 ring-1 ring-inset ring-slate-200 hover:bg-emerald-50" title="Escribir por WhatsApp">
                              <MessageCircle className="h-4 w-4" />
                            </a>
                          )}
                          {c.clienteId && (
                            <>
                              <ButtonLink href={`/admin/pacientes/${c.clienteId}`} size="sm" variant="secondary" className="flex-1 sm:flex-none">
                                Ficha
                              </ButtonLink>
                              {!c.tieneEvolucion && (
                                <ButtonLink
                                  href={`/admin/pacientes/${c.clienteId}?tab=consultas&nueva=1&cita=${c.id}`}
                                  size="sm"
                                  className="flex-1 sm:flex-none"
                                  icon={<Stethoscope className="h-4 w-4" />}
                                >
                                  Atender
                                </ButtonLink>
                              )}
                            </>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            <div className="space-y-5">
              {/* Próximos días */}
              <Card>
                <CardHeader title="Próximos 7 días" icon={<Clock className="h-5 w-5" />} />
                {proximas.length === 0 ? (
                  <p className="py-4 text-center text-sm text-slate-500">Sin citas en los próximos días.</p>
                ) : (
                  <ul className="space-y-2">
                    {proximas.map((c) => (
                      <li key={c.id}>
                        <Link href={`/admin/pacientes/${c.clienteId}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-slate-50">
                          <Avatar text={initials(c.cliente?.nombre)} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-900">{c.cliente?.nombre || 'Paciente'}</p>
                            <p className="truncate text-xs text-slate-500">{c.service?.nombre || 'Consulta'}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-xs font-semibold first-letter:uppercase text-slate-700">{relativeApptDay(c.fecha)}</p>
                            <p className="text-xs text-slate-500">{c.horaInicio}</p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              {/* Accesos */}
              <Card>
                <CardHeader title="Accesos rápidos" />
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { href: '/admin/pacientes', label: 'Pacientes', desc: 'Fichas, historia clínica y odontograma', icon: Users, tone: 'bg-sky-50 text-sky-600' },
                    { href: '/admin/tratamientos', label: 'Planes de tratamiento', desc: 'Pendientes y presupuestos', icon: ClipboardList, tone: 'bg-emerald-50 text-emerald-600' },
                    { href: '/admin/documentos', label: 'Radiografías y archivos', desc: 'Todos los archivos clínicos', icon: FolderOpen, tone: 'bg-amber-50 text-amber-600' },
                  ].map((a) => (
                    <Link key={a.href} href={a.href} className="group flex items-center gap-3 rounded-xl p-2.5 hover:bg-slate-50">
                      <span className={cx('flex h-10 w-10 items-center justify-center rounded-xl', a.tone)}>
                        <a.icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900">{a.label}</p>
                        <p className="truncate text-xs text-slate-500">{a.desc}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500" />
                    </Link>
                  ))}
                </div>
              </Card>

              {stats.porConfirmar > 0 && (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    Tienes <strong>{stats.porConfirmar}</strong> cita{stats.porConfirmar === 1 ? '' : 's'} por confirmar.{' '}
                    <Link href="/admin/citas" className="font-semibold underline">Revisarlas</Link>
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </Page>
  );
}
