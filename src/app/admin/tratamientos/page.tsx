'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ClipboardList, Check, ChevronRight } from 'lucide-react';
import { api } from '@/modules/dental/lib/api';
import { ACTIVE_TREATMENT_STATES, TREATMENT_STATES, formatDate, money, normalize, priority, treatmentState } from '@/modules/dental/lib/format';
import {
  Page, PageHeader, Card, SearchInput, FilterChips, Spinner, ErrorBox, EmptyState, Badge, Button, StatCard, useToast, cx,
} from '@/modules/dental/components/admin/ui';

type Filter = 'ABIERTOS' | 'ALTA' | 'REALIZADO' | 'CANCELADO' | 'TODOS';

export default function TratamientosPage() {
  const toast = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('ABIERTOS');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api<{ treatments: any[] }>('/api/admin/dental/treatments');
      setItems(d.treatments || []);
      setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setState = async (t: any, estado: string) => {
    setBusyId(t.id);
    try {
      await api('/api/admin/dental/treatments', { method: 'PATCH', json: { id: t.id, estado } });
      toast.show(estado === 'REALIZADO' ? 'Marcado como realizado.' : 'Estado actualizado.');
      await load();
    } catch (e: any) {
      toast.show(e.message, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const stats = useMemo(() => {
    const open = items.filter((t) => ACTIVE_TREATMENT_STATES.includes(t.estado));
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const doneMonth = items.filter((t) => t.estado === 'REALIZADO' && t.fechaRealizado && new Date(t.fechaRealizado) >= monthStart);
    const sum = (l: any[]) => l.reduce((s, t) => s + (Number(t.costoEstimado) || 0), 0);
    return {
      open: open.length,
      openAmount: sum(open),
      high: open.filter((t) => t.prioridad === 'ALTA').length,
      doneMonth: doneMonth.length,
      doneMonthAmount: sum(doneMonth),
      patients: new Set(open.map((t) => t.ClinicalRecord?.clienteId)).size,
    };
  }, [items]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return items.filter((t) => {
      if (filter === 'ABIERTOS' && !ACTIVE_TREATMENT_STATES.includes(t.estado)) return false;
      if (filter === 'ALTA' && !(ACTIVE_TREATMENT_STATES.includes(t.estado) && t.prioridad === 'ALTA')) return false;
      if (filter === 'REALIZADO' && t.estado !== 'REALIZADO') return false;
      if (filter === 'CANCELADO' && t.estado !== 'CANCELADO') return false;
      if (!q) return true;
      return (
        normalize(t.ClinicalRecord?.Cliente?.nombre || '').includes(q) ||
        normalize(t.descripcion || '').includes(q) ||
        (t.diente || '').includes(q)
      );
    });
  }, [items, query, filter]);

  return (
    <Page>
      <PageHeader
        title="Planes de tratamiento"
        description="Todos los procedimientos pendientes y realizados de tus pacientes. Para agregar uno, entra a la ficha del paciente."
        icon={<ClipboardList className="h-5 w-5" />}
      />

      {error && <ErrorBox message={error} onRetry={load} />}

      {loading ? <Spinner label="Cargando tratamientos…" /> : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Abiertos" value={stats.open} hint={`${stats.patients} paciente${stats.patients === 1 ? '' : 's'}`} tone="violet" />
            <StatCard label="Por realizar" value={money(stats.openAmount)} hint="Presupuesto pendiente" tone="emerald" />
            <StatCard label="Prioridad alta" value={stats.high} hint="Atender primero" tone={stats.high ? 'rose' : 'slate'} />
            <StatCard label="Realizados este mes" value={stats.doneMonth} hint={money(stats.doneMonthAmount)} tone="sky" />
          </div>

          <div className="space-y-3">
            <SearchInput value={query} onChange={setQuery} placeholder="Buscar por paciente, procedimiento o pieza…" />
            <FilterChips<Filter>
              value={filter}
              onChange={setFilter}
              options={[
                { id: 'ABIERTOS', label: 'Abiertos', count: stats.open },
                { id: 'ALTA', label: 'Prioridad alta', count: stats.high },
                { id: 'REALIZADO', label: 'Realizados', count: items.filter((t) => t.estado === 'REALIZADO').length },
                { id: 'CANCELADO', label: 'Cancelados', count: items.filter((t) => t.estado === 'CANCELADO').length },
                { id: 'TODOS', label: 'Todos', count: items.length },
              ]}
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="h-12 w-12" />}
              title={items.length ? 'Nada en esta vista' : 'Aún no hay tratamientos'}
              description={items.length ? 'Prueba con otro filtro o búsqueda.' : 'Abre la ficha de un paciente y agrega su plan de tratamiento, o créalo desde los hallazgos del odontograma.'}
              action={!items.length ? <Link href="/admin/pacientes" className="text-sm font-semibold text-sky-600">Ir a pacientes</Link> : undefined}
            />
          ) : (
            <Card padded={false}>
              <ul className="divide-y divide-slate-100">
                {filtered.map((t) => {
                  const st = treatmentState(t.estado);
                  const p = priority(t.prioridad);
                  const open = ACTIVE_TREATMENT_STATES.includes(t.estado);
                  return (
                    <li key={t.id} className={cx('flex flex-col gap-3 p-4 sm:flex-row sm:items-center', busyId === t.id && 'opacity-60')}>
                      <div className="min-w-0 flex-1">
                        <Link href={`/admin/pacientes/${t.ClinicalRecord?.clienteId}?tab=tratamientos`} className="group inline-flex items-center gap-1 text-sm font-semibold text-sky-700 hover:underline">
                          {t.ClinicalRecord?.Cliente?.nombre || 'Paciente'} <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2">
                          {t.diente && <Badge tone="sky">Pieza {t.diente}{t.superficies ? ` · ${t.superficies}` : ''}</Badge>}
                          <span className={cx('font-medium', t.estado === 'CANCELADO' ? 'text-slate-400 line-through' : 'text-slate-900')}>{t.descripcion}</span>
                          <Badge tone={st.tone as any}>{st.label}</Badge>
                          {open && t.prioridad === 'ALTA' && <Badge tone={p.tone as any}>Alta</Badge>}
                        </div>
                        <p className="mt-0.5 text-sm text-slate-500">
                          {[
                            t.costoEstimado != null ? money(t.costoEstimado) : null,
                            t.Staff?.name,
                            t.estado === 'REALIZADO' && t.fechaRealizado ? `Realizado ${formatDate(t.fechaRealizado)}` : `Creado ${formatDate(t.createdAt)}`,
                          ].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {open && (
                          <Button size="sm" variant="success" icon={<Check className="h-3.5 w-3.5" />} disabled={busyId === t.id} onClick={() => setState(t, 'REALIZADO')}>
                            Realizado
                          </Button>
                        )}
                        <select
                          aria-label="Cambiar estado"
                          value={t.estado}
                          disabled={busyId === t.id}
                          onChange={(e) => setState(t, e.target.value)}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
                        >
                          {TREATMENT_STATES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </>
      )}
      {toast.node}
    </Page>
  );
}
