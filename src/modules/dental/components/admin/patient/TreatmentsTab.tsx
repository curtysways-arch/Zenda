'use client';

import React, { useMemo, useState } from 'react';
import { ClipboardList, Plus, Pencil, Trash2, Check, Play } from 'lucide-react';
import { useConfirm } from '@/components/admin/ConfirmContext';
import { api } from '../../../lib/api';
import { ACTIVE_TREATMENT_STATES, TREATMENT_STATES, money, priority, treatmentState, formatDate } from '../../../lib/format';
import { Button, EmptyState, Badge, Card, cx } from '../ui';

export default function TreatmentsTab({
  treatments,
  onNew,
  onEdit,
  onChanged,
  onError,
}: {
  treatments: any[];
  onNew: () => void;
  onEdit: (t: any) => void;
  onChanged: (message: string) => void;
  onError: (message: string) => void;
}) {
  const { confirm } = useConfirm();
  const [busyId, setBusyId] = useState<string | null>(null);

  const totals = useMemo(() => {
    const sum = (list: any[]) => list.reduce((s, t) => s + (Number(t.costoEstimado) || 0), 0);
    const active = treatments.filter((t) => ACTIVE_TREATMENT_STATES.includes(t.estado));
    const done = treatments.filter((t) => t.estado === 'REALIZADO');
    return { pending: sum(active), done: sum(done), activeCount: active.length, doneCount: done.length };
  }, [treatments]);

  const groups = useMemo(() => {
    const order = ['EN_PROCESO', 'PENDIENTE', 'PLANIFICADO', 'REALIZADO', 'CANCELADO'];
    const prio: Record<string, number> = { ALTA: 0, MEDIA: 1, BAJA: 2 };
    return order
      .map((id) => ({
        state: treatmentState(id),
        items: treatments
          .filter((t) => t.estado === id)
          .sort((a, b) => (prio[a.prioridad] ?? 1) - (prio[b.prioridad] ?? 1)),
      }))
      .filter((g) => g.items.length);
  }, [treatments]);

  const setState = async (t: any, estado: string) => {
    setBusyId(t.id);
    try {
      await api('/api/admin/dental/treatments', { method: 'PATCH', json: { id: t.id, estado } });
      onChanged(estado === 'REALIZADO' ? 'Tratamiento marcado como realizado.' : 'Estado actualizado.');
    } catch (e: any) {
      onError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (t: any) => {
    const ok = await confirm(`¿Eliminar "${t.descripcion}" del plan? Esta acción no se puede deshacer.`, {
      title: 'Eliminar tratamiento', confirmText: 'Eliminar', type: 'danger',
    });
    if (!(ok === true || (typeof ok === 'object' && ok.confirmed))) return;
    setBusyId(t.id);
    try {
      await api(`/api/admin/dental/treatments?id=${encodeURIComponent(t.id)}`, { method: 'DELETE' });
      onChanged('Tratamiento eliminado.');
    } catch (e: any) {
      onError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  if (!treatments.length) {
    return (
      <EmptyState
        icon={<ClipboardList className="h-12 w-12" />}
        title="Sin plan de tratamiento"
        description="Agrega los procedimientos que necesita el paciente con su pieza y costo. También puedes crearlos desde los hallazgos del odontograma."
        action={<Button icon={<Plus className="h-4 w-4" />} onClick={onNew}>Agregar tratamiento</Button>}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="!p-4">
          <p className="text-sm text-slate-500">Por realizar</p>
          <p className="text-xl font-bold text-slate-900">{money(totals.pending)}</p>
          <p className="text-xs text-slate-500">{totals.activeCount} procedimiento{totals.activeCount === 1 ? '' : 's'}</p>
        </Card>
        <Card className="!p-4">
          <p className="text-sm text-slate-500">Realizado</p>
          <p className="text-xl font-bold text-emerald-700">{money(totals.done)}</p>
          <p className="text-xs text-slate-500">{totals.doneCount} procedimiento{totals.doneCount === 1 ? '' : 's'}</p>
        </Card>
        <div className="col-span-2 flex items-center sm:col-span-1 sm:justify-end">
          <Button className="w-full sm:w-auto" icon={<Plus className="h-4 w-4" />} onClick={onNew}>Agregar tratamiento</Button>
        </div>
      </div>

      {groups.map((g) => (
        <div key={g.state.id}>
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Badge tone={g.state.tone as any}>{g.state.label}</Badge>
            <span className="font-normal text-slate-400">{g.items.length}</span>
          </p>
          <Card padded={false}>
            <ul className="divide-y divide-slate-100">
              {g.items.map((t) => {
                const p = priority(t.prioridad);
                const busy = busyId === t.id;
                const closed = t.estado === 'REALIZADO' || t.estado === 'CANCELADO';
                return (
                  <li key={t.id} className={cx('flex flex-col gap-3 p-4 sm:flex-row sm:items-center', busy && 'opacity-60')}>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {t.diente && <Badge tone="sky">Pieza {t.diente}{t.superficies ? ` · ${t.superficies}` : ''}</Badge>}
                        <p className={cx('font-semibold', t.estado === 'CANCELADO' ? 'text-slate-400 line-through' : 'text-slate-900')}>{t.descripcion}</p>
                        {!closed && t.prioridad === 'ALTA' && <Badge tone={p.tone as any}>Prioridad alta</Badge>}
                      </div>
                      <p className="mt-0.5 text-sm text-slate-500">
                        {[
                          t.costoEstimado != null ? money(t.costoEstimado) : null,
                          t.Staff?.name || null,
                          t.estado === 'REALIZADO' && t.fechaRealizado ? `Realizado el ${formatDate(t.fechaRealizado)}` : null,
                        ].filter(Boolean).join(' · ')}
                      </p>
                      {t.notas && <p className="mt-1 text-sm text-slate-500">{t.notas}</p>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {t.estado === 'PLANIFICADO' || t.estado === 'PENDIENTE' ? (
                        <Button size="sm" variant="secondary" icon={<Play className="h-3.5 w-3.5" />} disabled={busy} onClick={() => setState(t, 'EN_PROCESO')}>Iniciar</Button>
                      ) : null}
                      {!closed && (
                        <Button size="sm" variant="success" icon={<Check className="h-3.5 w-3.5" />} disabled={busy} onClick={() => setState(t, 'REALIZADO')}>Realizado</Button>
                      )}
                      <select
                        aria-label="Cambiar estado"
                        value={t.estado}
                        disabled={busy}
                        onChange={(e) => setState(t, e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
                      >
                        {TREATMENT_STATES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                      <button type="button" onClick={() => onEdit(t)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Editar">
                        <Pencil className="h-4 w-4" />
                      </button>
                      {t.estado !== 'REALIZADO' && (
                        <button type="button" onClick={() => remove(t)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Eliminar">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      ))}
    </div>
  );
}
