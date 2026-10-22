'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Users, UserPlus, AlertTriangle, ChevronRight, CalendarClock, ClipboardList, Phone } from 'lucide-react';
import { api } from '@/modules/dental/lib/api';
import { ageFrom, formatApptDate, initials, money, normalize, relativeApptDay } from '@/modules/dental/lib/format';
import {
  Page, PageHeader, Button, SearchInput, FilterChips, Spinner, ErrorBox, EmptyState, Avatar, Badge, Card,
} from '@/modules/dental/components/admin/ui';
import PatientFormModal from '@/modules/dental/components/admin/PatientFormModal';

type Patient = {
  id: string;
  nombre: string;
  telefono: string;
  email: string | null;
  fechaNacimiento: string | null;
  identificacion: string | null;
  numeroHistoria: string | null;
  alertAlergia: boolean;
  alertCondicion: boolean;
  tratamientosActivos: number;
  presupuestoPendiente: number;
  totalCitas: number;
  ultimaVisita: string | null;
  proximaCita: { fecha: string; hora: string } | null;
  createdAt: string;
};

type Filter = 'todos' | 'proxima' | 'tratamiento' | 'alertas' | 'sinVisita';

const SIX_MONTHS = 1000 * 60 * 60 * 24 * 182;

function PacientesInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('todos');
  const [newOpen, setNewOpen] = useState(searchParams.get('nuevo') === '1');

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await api<{ patients: Patient[] }>('/api/admin/dental/patients');
      setPatients(data.patients || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const now = Date.now();
    return {
      todos: patients.length,
      proxima: patients.filter((p) => p.proximaCita).length,
      tratamiento: patients.filter((p) => p.tratamientosActivos > 0).length,
      alertas: patients.filter((p) => p.alertAlergia || p.alertCondicion).length,
      sinVisita: patients.filter((p) => !p.proximaCita && (!p.ultimaVisita || now - new Date(p.ultimaVisita).getTime() > SIX_MONTHS)).length,
    };
  }, [patients]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    const qDigits = query.replace(/\D/g, '');
    const now = Date.now();
    return patients.filter((p) => {
      if (filter === 'proxima' && !p.proximaCita) return false;
      if (filter === 'tratamiento' && p.tratamientosActivos === 0) return false;
      if (filter === 'alertas' && !(p.alertAlergia || p.alertCondicion)) return false;
      if (filter === 'sinVisita' && (p.proximaCita || (p.ultimaVisita && now - new Date(p.ultimaVisita).getTime() <= SIX_MONTHS))) return false;
      if (!q) return true;
      return (
        normalize(p.nombre).includes(q) ||
        (p.email || '').toLowerCase().includes(q) ||
        (p.numeroHistoria || '').toLowerCase().includes(q) ||
        (qDigits.length >= 3 && ((p.telefono || '').replace(/\D/g, '').includes(qDigits) || (p.identificacion || '').includes(qDigits)))
      );
    });
  }, [patients, query, filter]);

  const closeNew = () => {
    setNewOpen(false);
    if (searchParams.get('nuevo')) router.replace('/admin/pacientes');
  };

  return (
    <Page>
      <PageHeader
        title="Pacientes"
        description="Busca un paciente para ver su ficha, historia clínica, odontograma y tratamientos."
        icon={<Users className="h-5 w-5" />}
        actions={<Button icon={<UserPlus className="h-4 w-4" />} onClick={() => setNewOpen(true)}>Nuevo paciente</Button>}
      />

      <div className="space-y-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Buscar por nombre, teléfono, cédula o N° de historia…" />
        <FilterChips<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { id: 'todos', label: 'Todos', count: counts.todos },
            { id: 'proxima', label: 'Con cita próxima', count: counts.proxima },
            { id: 'tratamiento', label: 'Tratamiento abierto', count: counts.tratamiento },
            { id: 'alertas', label: 'Con alertas médicas', count: counts.alertas },
            { id: 'sinVisita', label: 'Sin visita hace 6 meses', count: counts.sinVisita },
          ]}
        />
      </div>

      {error && <ErrorBox message={error} onRetry={load} />}

      {loading ? (
        <Spinner label="Cargando pacientes…" />
      ) : filtered.length === 0 ? (
        patients.length === 0 ? (
          <EmptyState
            icon={<Users className="h-12 w-12" />}
            title="Aún no tienes pacientes"
            description="Registra tu primer paciente. Los que reserven desde tu página también aparecerán aquí."
            action={<Button icon={<UserPlus className="h-4 w-4" />} onClick={() => setNewOpen(true)}>Registrar paciente</Button>}
          />
        ) : (
          <EmptyState
            title="Ningún paciente coincide"
            description="Prueba con otro nombre o número, o cambia el filtro."
            action={<Button variant="secondary" onClick={() => { setQuery(''); setFilter('todos'); }}>Limpiar búsqueda</Button>}
          />
        )
      ) : (
        <Card padded={false} className="overflow-hidden">
          {/* Encabezado de tabla (solo escritorio) */}
          <div className="hidden grid-cols-12 gap-4 border-b border-slate-100 bg-slate-50 px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
            <span className="col-span-4">Paciente</span>
            <span className="col-span-2">Contacto</span>
            <span className="col-span-2">Última visita</span>
            <span className="col-span-2">Próxima cita</span>
            <span className="col-span-2">Tratamiento</span>
          </div>
          <ul className="divide-y divide-slate-100">
            {filtered.map((p) => {
              const age = ageFrom(p.fechaNacimiento);
              return (
                <li key={p.id}>
                  <Link href={`/admin/pacientes/${p.id}`} className="group grid grid-cols-1 gap-2 px-4 py-3.5 hover:bg-sky-50/40 md:grid-cols-12 md:items-center md:gap-4 md:px-5">
                    <div className="flex min-w-0 items-center gap-3 md:col-span-4">
                      <Avatar text={initials(p.nombre)} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-semibold text-slate-900">{p.nombre}</p>
                          {(p.alertAlergia || p.alertCondicion) && (
                            <span title={p.alertAlergia ? 'Tiene alergias registradas' : 'Tiene condiciones médicas'}>
                              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs text-slate-500">
                          {[p.numeroHistoria, age !== null ? `${age} años` : null].filter(Boolean).join(' · ') || 'Sin historia clínica aún'}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-sky-500 md:hidden" />
                    </div>

                    <div className="flex items-center gap-1.5 pl-[52px] text-sm text-slate-600 md:col-span-2 md:pl-0">
                      <Phone className="h-3.5 w-3.5 text-slate-400 md:hidden" />
                      <span className="truncate">{p.telefono || '—'}</span>
                    </div>

                    <div className="hidden text-sm text-slate-600 md:col-span-2 md:block">
                      {p.ultimaVisita ? formatApptDate(p.ultimaVisita) : <span className="text-slate-400">Nunca</span>}
                    </div>

                    <div className="pl-[52px] md:col-span-2 md:pl-0">
                      {p.proximaCita ? (
                        <Badge tone="sky"><CalendarClock className="h-3 w-3" /> {relativeApptDay(p.proximaCita.fecha)} · {p.proximaCita.hora}</Badge>
                      ) : (
                        <span className="hidden text-sm text-slate-400 md:inline">—</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pl-[52px] md:col-span-2 md:pl-0">
                      {p.tratamientosActivos > 0 ? (
                        <span className="inline-flex items-center gap-1.5 text-sm text-slate-700">
                          <ClipboardList className="h-3.5 w-3.5 text-emerald-600" />
                          {p.tratamientosActivos} abierto{p.tratamientosActivos === 1 ? '' : 's'}
                          {p.presupuestoPendiente > 0 && <span className="text-slate-400">· {money(p.presupuestoPendiente)}</span>}
                        </span>
                      ) : (
                        <span className="hidden text-sm text-slate-400 md:inline">—</span>
                      )}
                      <ChevronRight className="hidden h-4 w-4 text-slate-300 group-hover:text-sky-500 md:block" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-slate-100 bg-slate-50 px-5 py-2.5 text-xs text-slate-500">
            {filtered.length} de {patients.length} paciente{patients.length === 1 ? '' : 's'}
          </div>
        </Card>
      )}

      <PatientFormModal
        open={newOpen}
        onClose={closeNew}
        onSaved={(p) => {
          setNewOpen(false);
          router.push(`/admin/pacientes/${p.id}?nuevo=1`);
        }}
      />
    </Page>
  );
}

export default function PacientesPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <PacientesInner />
    </Suspense>
  );
}
