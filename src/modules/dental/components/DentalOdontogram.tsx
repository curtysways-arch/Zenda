'use client';

/**
 * Odontograma interactivo (nomenclatura FDI).
 *
 * Cómo se usa:
 *  1. Elige una condición (Caries, Obturado…).
 *  2. Toca la cara del diente donde aplica. Tocarla otra vez la deja sana.
 *  3. Toca el número del diente para ver su detalle, marcar el diente completo o escribir una nota.
 *  4. Guarda: cada guardado crea una versión nueva; las anteriores quedan en el historial.
 *
 * Las caras se dibujan como en la ficha clínica, vistas de frente al paciente:
 *  - Superiores: vestibular arriba y palatino abajo. Inferiores: lingual arriba y vestibular abajo.
 *  - Mesial siempre hacia la línea media (el centro de la arcada).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Save, RotateCcw, History, StickyNote, X, Plus, Info } from 'lucide-react';
import {
  PERMANENT_TEETH_QUADRANTS,
  DECIDUOUS_TEETH_QUADRANTS,
  DENTAL_CONDITIONS,
  getConditionColor,
  ToothData,
} from '../utils/dentalHelper';

type SurfaceKey = 'vestibular' | 'lingual' | 'mesial' | 'distal' | 'oclusal';
type Mode = 'PERMANENTE' | 'TEMPORAL' | 'MIXTO';

interface DentalOdontogramProps {
  initialPiezas?: Record<string, ToothData>;
  snapshots?: any[];
  onSaveSnapshot?: (piezas: Record<string, ToothData>, titulo?: string, tipo?: Mode) => Promise<void>;
  onCreateTreatment?: (tooth: string, surfaces: string, condition: string) => void;
  readOnly?: boolean;
  patientName?: string;
  defaultMode?: Mode;
}

const SURFACE_NAMES: Record<SurfaceKey, string> = {
  vestibular: 'Vestibular',
  lingual: 'Lingual / Palatino',
  mesial: 'Mesial',
  distal: 'Distal',
  oclusal: 'Oclusal',
};
const SURFACE_SHORT: Record<SurfaceKey, string> = { vestibular: 'V', lingual: 'L', mesial: 'M', distal: 'D', oclusal: 'O' };
const ALL_SURFACES: SurfaceKey[] = ['vestibular', 'mesial', 'oclusal', 'distal', 'lingual'];

/** Dientes que reemplazan todo el diente (no por caras). */
const WHOLE_TOOTH = new Set(['AUSENTE', 'EXTRACCION_INDICADA', 'CORONA', 'IMPLANTE', 'ENDODONCIA', 'PROTESIS']);

function conditionLabel(id?: string) {
  return DENTAL_CONDITIONS.find((c) => c.id === id)?.label.split(' (')[0].split(' /')[0] || 'Sano';
}

function quadrantOf(tooth: string) {
  return Number(tooth[0]);
}
function isUpper(tooth: string) {
  return [1, 2, 5, 6].includes(quadrantOf(tooth));
}
/** Cuadrantes del lado derecho del paciente (se ven a la izquierda de la pantalla). */
function isPatientRight(tooth: string) {
  return [1, 4, 5, 8].includes(quadrantOf(tooth));
}
function isAnterior(tooth: string) {
  const n = Number(tooth[1]);
  return n >= 1 && n <= 3;
}

/** Qué cara anatómica corresponde a cada posición del dibujo (arriba, abajo, izquierda, derecha). */
function surfaceLayout(tooth: string): Record<'top' | 'bottom' | 'left' | 'right', SurfaceKey> {
  const upper = isUpper(tooth);
  const right = isPatientRight(tooth);
  return {
    top: upper ? 'vestibular' : 'lingual',
    bottom: upper ? 'lingual' : 'vestibular',
    left: right ? 'distal' : 'mesial',
    right: right ? 'mesial' : 'distal',
  };
}

function surfaceName(tooth: string, s: SurfaceKey) {
  if (s === 'oclusal') return isAnterior(tooth) ? 'Incisal' : 'Oclusal';
  if (s === 'lingual') return isUpper(tooth) ? 'Palatino' : 'Lingual';
  return SURFACE_NAMES[s];
}

function parsePiezas(raw: unknown): Record<string, ToothData> {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) || {}; } catch { return {}; }
  }
  return raw as Record<string, ToothData>;
}

function toothFindings(t: ToothData | undefined) {
  if (!t) return [] as { condition: string; surfaces: SurfaceKey[] }[];
  if (t.estadoGeneral && t.estadoGeneral !== 'SANO' && WHOLE_TOOTH.has(t.estadoGeneral)) {
    return [{ condition: t.estadoGeneral, surfaces: [] as SurfaceKey[] }];
  }
  const byCond: Record<string, SurfaceKey[]> = {};
  for (const s of ALL_SURFACES) {
    const c = (t.superficies as any)?.[s];
    if (c && c !== 'SANO') (byCond[c] ||= []).push(s);
  }
  return Object.entries(byCond).map(([condition, surfaces]) => ({ condition, surfaces }));
}

export default function DentalOdontogram({
  initialPiezas = {},
  snapshots = [],
  onSaveSnapshot,
  onCreateTreatment,
  readOnly = false,
  patientName,
  defaultMode = 'PERMANENTE',
}: DentalOdontogramProps) {
  const [piezas, setPiezas] = useState<Record<string, ToothData>>(() => parsePiezas(initialPiezas));
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null);
  const [selectedCondition, setSelectedCondition] = useState<string>('CARIES');
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [viewingId, setViewingId] = useState<string>('current');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');

  // Si cambia la versión más reciente (p. ej. después de guardar), mostrarla.
  // Se compara por contenido: el padre puede pasar un objeto nuevo en cada render.
  const initialKey = JSON.stringify(parsePiezas(initialPiezas));
  useEffect(() => {
    setPiezas(JSON.parse(initialKey));
    setDirty(false);
    setViewingId('current');
  }, [initialKey]);

  const historical = viewingId !== 'current';
  const editable = !readOnly && !historical;

  const shown = useMemo(() => {
    if (!historical) return piezas;
    const snap = snapshots.find((s) => s.id === viewingId);
    return parsePiezas(snap?.piezas);
  }, [historical, piezas, snapshots, viewingId]);

  // Avisar antes de salir si hay cambios sin guardar.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const getTooth = (n: string): ToothData => shown[n] || { diente: n, superficies: {}, estadoGeneral: 'SANO' };

  const update = (n: string, fn: (t: ToothData) => ToothData) => {
    if (!editable) return;
    setPiezas((prev) => ({ ...prev, [n]: fn(prev[n] || { diente: n, superficies: {}, estadoGeneral: 'SANO' }) }));
    setDirty(true);
  };

  const paintSurface = (n: string, s: SurfaceKey) => {
    if (!editable) {
      setSelectedTooth(n);
      return;
    }
    if (WHOLE_TOOTH.has(selectedCondition)) {
      setWhole(n, selectedCondition);
      return;
    }
    update(n, (t) => {
      const sup = { ...(t.superficies || {}) } as Record<string, string>;
      sup[s] = sup[s] === selectedCondition ? 'SANO' : selectedCondition;
      // Si el diente estaba marcado como "completo" (corona, ausente…), al pintar caras vuelve a modo por caras.
      const estadoGeneral = t.estadoGeneral && WHOLE_TOOTH.has(t.estadoGeneral) ? 'SANO' : t.estadoGeneral;
      return { ...t, estadoGeneral, superficies: sup };
    });
  };

  const setWhole = (n: string, condition: string) => {
    update(n, (t) => {
      if (condition === 'SANO') return { diente: n, estadoGeneral: 'SANO', superficies: {}, notas: t.notas };
      if (WHOLE_TOOTH.has(condition)) {
        // Volver a tocar la misma condición la quita.
        if (t.estadoGeneral === condition) return { ...t, estadoGeneral: 'SANO' };
        return { ...t, estadoGeneral: condition };
      }
      const sup: Record<string, string> = {};
      ALL_SURFACES.forEach((s) => { sup[s] = condition; });
      return { ...t, estadoGeneral: 'SANO', superficies: sup };
    });
  };

  const setNote = (n: string, notas: string) => update(n, (t) => ({ ...t, notas }));

  const discard = () => {
    setPiezas(JSON.parse(initialKey));
    setDirty(false);
  };

  // La primera evaluación se puede guardar aunque esté todo sano (sirve como registro inicial).
  const canSave = dirty || snapshots.length === 0;

  const save = async () => {
    if (!onSaveSnapshot || !editable) return;
    setSaving(true);
    setError('');
    try {
      await onSaveSnapshot(piezas, title.trim() || undefined, mode);
      setTitle('');
      setDirty(false);
    } catch (e: any) {
      setError(e?.message || 'No se pudo guardar el odontograma.');
    } finally {
      setSaving(false);
    }
  };

  const findings = useMemo(() => {
    return Object.keys(shown)
      .sort((a, b) => Number(a) - Number(b))
      .flatMap((n) => toothFindings(shown[n]).map((f) => ({ tooth: n, ...f })));
  }, [shown]);

  const notedTeeth = useMemo(() => Object.values(shown).filter((t) => t?.notas), [shown]);

  // ── Dibujo de un diente ─────────────────────────────────────────────
  const renderTooth = (n: string) => {
    const t = getTooth(n);
    const sup = (t.superficies || {}) as Record<string, string>;
    const layout = surfaceLayout(n);
    const general = t.estadoGeneral;
    const selected = selectedTooth === n;
    const upper = isUpper(n);

    const poly = (pos: 'top' | 'bottom' | 'left' | 'right' | 'center', points: string) => {
      const s: SurfaceKey = pos === 'center' ? 'oclusal' : layout[pos];
      const cond = sup[s];
      return (
        <polygon
          points={points}
          fill={getConditionColor(cond)}
          stroke="#475569"
          strokeWidth="2.5"
          className={editable ? 'cursor-pointer hover:opacity-70' : ''}
          onClick={(e) => { e.stopPropagation(); paintSurface(n, s); }}
        >
          <title>{`${n} · ${surfaceName(n, s)}: ${conditionLabel(cond)}`}</title>
        </polygon>
      );
    };

    const label = (
      <button
        type="button"
        onClick={() => setSelectedTooth(selected ? null : n)}
        className={`rounded-md px-1 text-[11px] font-semibold leading-5 ${selected ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
      >
        {n}
      </button>
    );

    return (
      <div key={n} className={`flex flex-col items-center gap-0.5 rounded-lg p-0.5 ${selected ? 'bg-sky-50 ring-2 ring-sky-400' : ''}`}>
        {upper && label}
        <div className="relative h-9 w-9 sm:h-10 sm:w-10">
          <svg viewBox="0 0 100 100" className="h-full w-full">
            {poly('top', '0,0 100,0 72,28 28,28')}
            {poly('right', '100,0 100,100 72,72 72,28')}
            {poly('bottom', '100,100 0,100 28,72 72,72')}
            {poly('left', '0,100 0,0 28,28 28,72')}
            {poly('center', '28,28 72,28 72,72 28,72')}
            {(general === 'AUSENTE' || general === 'EXTRACCION_INDICADA') && (
              <path d="M 8,8 L 92,92 M 92,8 L 8,92" stroke={general === 'AUSENTE' ? '#334155' : '#dc2626'} strokeWidth="9" strokeLinecap="round" pointerEvents="none" />
            )}
            {general === 'CORONA' && <circle cx="50" cy="50" r="44" fill="none" stroke="#2563eb" strokeWidth="8" pointerEvents="none" />}
            {general === 'ENDODONCIA' && <line x1="50" y1="6" x2="50" y2="94" stroke="#7c3aed" strokeWidth="9" strokeLinecap="round" pointerEvents="none" />}
            {general === 'IMPLANTE' && <rect x="38" y="10" width="24" height="80" rx="5" fill="#059669" opacity="0.85" pointerEvents="none" />}
            {general === 'PROTESIS' && <path d="M 4,50 L 96,50" stroke="#0891b2" strokeWidth="9" strokeLinecap="round" pointerEvents="none" />}
          </svg>
          {t.notas && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-white" title={t.notas} />}
        </div>
        {!upper && label}
      </div>
    );
  };

  // En pantallas pequeñas cada cuadrante va en su propia fila para que quepa sin desplazarse de lado.
  const row = (left: string[], right: string[], labels: [string, string], deciduous = false) => (
    <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-0">
      <div className="flex flex-col items-center">
        <span className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400 sm:hidden">{labels[0]}</span>
        <div className={`flex gap-0.5 sm:border-r-2 sm:pr-1.5 ${deciduous ? 'sm:border-amber-300' : 'sm:border-slate-300'}`}>{left.map(renderTooth)}</div>
      </div>
      <div className="flex flex-col items-center">
        <span className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400 sm:hidden">{labels[1]}</span>
        <div className="flex gap-0.5 sm:pl-1.5">{right.map(renderTooth)}</div>
      </div>
    </div>
  );

  const selected = selectedTooth ? getTooth(selectedTooth) : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Barra superior */}
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Odontograma</h3>
          <p className="text-sm text-slate-500">
            {editable
              ? 'Elige una condición y toca la cara del diente. Toca el número para ver el detalle.'
              : historical ? 'Estás viendo una versión anterior (solo lectura).' : patientName || ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 text-sm font-medium">
            {(['PERMANENTE', 'MIXTO', 'TEMPORAL'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-lg px-3 py-1.5 ${mode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {m === 'PERMANENTE' ? 'Adulto' : m === 'TEMPORAL' ? 'Niño' : 'Mixta'}
              </button>
            ))}
          </div>
          {snapshots.length > 0 && (
            <label className="flex items-center gap-1.5 text-sm text-slate-600">
              <History className="h-4 w-4 text-slate-400" />
              <select
                value={viewingId}
                onChange={(e) => { setViewingId(e.target.value); setSelectedTooth(null); }}
                className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-sm"
              >
                <option value="current">{dirty ? 'Actual (con cambios sin guardar)' : 'Versión actual'}</option>
                {snapshots.map((s) => (
                  <option key={s.id} value={s.id}>
                    #{s.snapshotNumber} · {s.titulo || 'Evaluación'} · {new Date(s.createdAt).toLocaleDateString('es-EC')}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>

      {historical && (
        <div className="flex items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
          <span className="flex items-center gap-2"><Info className="h-4 w-4 shrink-0" /> Versión anterior. No se puede modificar.</span>
          <button type="button" onClick={() => setViewingId('current')} className="font-semibold underline">Volver a la actual</button>
        </div>
      )}

      {/* Paleta de condiciones */}
      {editable && (
        <div className="border-b border-slate-100 px-4 py-3">
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
            {DENTAL_CONDITIONS.map((c) => {
              const active = selectedCondition === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCondition(c.id)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${
                    active ? 'border-slate-900 bg-slate-900 font-medium text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="h-3 w-3 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: c.color }} />
                  {conditionLabel(c.id)}
                  {WHOLE_TOOTH.has(c.id) && <span className={`text-[10px] ${active ? 'text-white/70' : 'text-slate-400'}`}>diente</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Arcadas */}
      <div className="overflow-x-auto bg-slate-50/60 px-2 py-5 sm:px-4">
        <div className="mx-auto flex w-max flex-col items-center gap-3">
          <div className="hidden w-full justify-between px-2 text-[11px] font-medium uppercase tracking-wide text-slate-400 sm:flex">
            <span>Derecha del paciente</span><span>Izquierda del paciente</span>
          </div>
          {(mode === 'PERMANENTE' || mode === 'MIXTO') && row(PERMANENT_TEETH_QUADRANTS.Q1, PERMANENT_TEETH_QUADRANTS.Q2, ['Superior derecho', 'Superior izquierdo'])}
          {(mode === 'TEMPORAL' || mode === 'MIXTO') && (
            <div className="rounded-xl bg-amber-50/70 px-2 py-2">
              {row(DECIDUOUS_TEETH_QUADRANTS.Q5, DECIDUOUS_TEETH_QUADRANTS.Q6, ['Temporal sup. derecho', 'Temporal sup. izquierdo'], true)}
            </div>
          )}
          <div className="my-1 h-px w-full bg-slate-300" />
          {(mode === 'TEMPORAL' || mode === 'MIXTO') && (
            <div className="rounded-xl bg-amber-50/70 px-2 py-2">
              {row(DECIDUOUS_TEETH_QUADRANTS.Q8, DECIDUOUS_TEETH_QUADRANTS.Q7, ['Temporal inf. derecho', 'Temporal inf. izquierdo'], true)}
            </div>
          )}
          {(mode === 'PERMANENTE' || mode === 'MIXTO') && row(PERMANENT_TEETH_QUADRANTS.Q4, PERMANENT_TEETH_QUADRANTS.Q3, ['Inferior derecho', 'Inferior izquierdo'])}
        </div>
      </div>

      {/* Detalle del diente seleccionado */}
      {selected && selectedTooth && (
        <div className="border-t border-sky-100 bg-sky-50/50 p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Diente {selectedTooth}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {selected.estadoGeneral && WHOLE_TOOTH.has(selected.estadoGeneral) ? (
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs ring-1 ring-slate-200">{conditionLabel(selected.estadoGeneral)} (diente completo)</span>
                ) : (
                  ALL_SURFACES.map((s) => {
                    const c = (selected.superficies as any)?.[s];
                    return (
                      <span key={s} className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs ring-1 ring-slate-200">
                        <span className="h-2 w-2 rounded-full border border-black/10" style={{ backgroundColor: getConditionColor(c) }} />
                        {surfaceName(selectedTooth, s)}: {conditionLabel(c)}
                      </span>
                    );
                  })
                )}
              </div>
            </div>
            <button type="button" onClick={() => setSelectedTooth(null)} className="rounded-lg p-1 text-slate-400 hover:bg-white" aria-label="Cerrar detalle">
              <X className="h-4 w-4" />
            </button>
          </div>

          {editable && (
            <>
              <p className="mb-1.5 text-xs font-medium text-slate-500">Marcar el diente completo como:</p>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {[{ id: 'SANO', color: '#ffffff' }, ...DENTAL_CONDITIONS.filter((c) => c.id !== 'SANO')].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setWhole(selectedTooth, c.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-sm text-slate-700 hover:border-slate-400"
                  >
                    <span className="h-2.5 w-2.5 rounded-full border border-black/10" style={{ backgroundColor: c.color }} />
                    {c.id === 'SANO' ? 'Todo sano' : conditionLabel(c.id)}
                  </button>
                ))}
              </div>
              <label className="block">
                <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500"><StickyNote className="h-3.5 w-3.5" /> Nota del diente</span>
                <input
                  value={selected.notas || ''}
                  onChange={(e) => setNote(selectedTooth, e.target.value.slice(0, 300))}
                  placeholder="Ej. sensibilidad al frío, movilidad grado I…"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
              </label>
            </>
          )}
          {!editable && selected.notas && <p className="text-sm text-slate-700"><strong>Nota:</strong> {selected.notas}</p>}
        </div>
      )}

      {/* Hallazgos */}
      <div className="border-t border-slate-100 p-4">
        <p className="mb-2 text-sm font-semibold text-slate-900">Hallazgos {findings.length > 0 && <span className="font-normal text-slate-400">({findings.length})</span>}</p>
        {findings.length === 0 ? (
          <p className="text-sm text-slate-500">Sin hallazgos registrados: todas las piezas están sanas.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {findings.map((f, i) => {
              const surf = f.surfaces.map((s) => SURFACE_SHORT[s]).join('');
              return (
                <li key={`${f.tooth}-${f.condition}-${i}`} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                  <button type="button" onClick={() => setSelectedTooth(f.tooth)} className="flex min-w-0 items-center gap-2 text-left">
                    <span className="h-3 w-3 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: getConditionColor(f.condition) }} />
                    <span className="font-semibold text-slate-900">{f.tooth}</span>
                    <span className="truncate text-slate-600">{conditionLabel(f.condition)}{surf ? ` · ${surf}` : ''}</span>
                  </button>
                  {onCreateTreatment && !historical && ['CARIES', 'EXTRACCION_INDICADA', 'ENDODONCIA', 'CORONA', 'IMPLANTE', 'PROTESIS', 'SELLANTE'].includes(f.condition) && (
                    <button
                      type="button"
                      onClick={() => onCreateTreatment(f.tooth, surf, f.condition)}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-sky-700 hover:bg-sky-100"
                      title="Agregar al plan de tratamiento"
                    >
                      <Plus className="h-3.5 w-3.5" /> Plan
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {notedTeeth.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-slate-600">
            {notedTeeth.map((t) => (
              <li key={t.diente}><strong className="text-slate-800">{t.diente}:</strong> {t.notas}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Guardar */}
      {editable && onSaveSnapshot && (
        <div className="sticky bottom-0 flex flex-col gap-2 border-t border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nombre de esta evaluación (opcional). Ej. Inicial, Control 6 meses"
            className="w-full flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
          />
          <div className="flex gap-2">
            {dirty && (
              <button type="button" onClick={discard} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 sm:flex-none">
                <RotateCcw className="h-4 w-4" /> Descartar
              </button>
            )}
            <button
              type="button"
              onClick={save}
              disabled={saving || !canSave}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Guardando…' : canSave ? 'Guardar odontograma' : 'Sin cambios'}
            </button>
          </div>
        </div>
      )}
      {error && <p className="border-t border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-800">{error}</p>}
    </div>
  );
}
