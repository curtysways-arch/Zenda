'use client';

import React, { useState, useMemo } from 'react';
import { 
  Smile, ShieldAlert, History, Save, CheckCircle2, RotateCcw, 
  Eye, FileText, AlertCircle, Sparkles, Layers, Info, Calendar, User
} from 'lucide-react';
import { 
  PERMANENT_TEETH_QUADRANTS, 
  DECIDUOUS_TEETH_QUADRANTS, 
  DENTAL_CONDITIONS,
  getConditionColor,
  ToothData,
  DentalSurfaceState
} from '../utils/dentalHelper';

interface DentalOdontogramProps {
  initialPiezas?: Record<string, ToothData>;
  snapshots?: any[];
  onSaveSnapshot?: (piezas: Record<string, ToothData>, titulo?: string) => Promise<void>;
  readOnly?: boolean;
  patientName?: string;
}

type SurfaceKey = 'vestibular' | 'lingual' | 'mesial' | 'distal' | 'oclusal';

export default function DentalOdontogram({
  initialPiezas = {},
  snapshots = [],
  onSaveSnapshot,
  readOnly = false,
  patientName
}: DentalOdontogramProps) {
  const [piezas, setPiezas] = useState<Record<string, ToothData>>(initialPiezas);
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null);
  const [selectedCondition, setSelectedCondition] = useState<string>('CARIES');
  const [dentitionMode, setDentitionMode] = useState<'PERMANENTE' | 'TEMPORAL' | 'MIXTO'>('PERMANENTE');
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>('current');
  const [snapshotTitle, setSnapshotTitle] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const isHistoricalView = selectedSnapshotId !== 'current';

  // Cuando cambia el snapshot seleccionado
  const handleSnapshotChange = (snapId: string) => {
    setSelectedSnapshotId(snapId);
    if (snapId === 'current') {
      setPiezas(initialPiezas);
    } else {
      const found = snapshots.find(s => s.id === snapId);
      if (found) {
        let pData = found.piezas;
        if (typeof pData === 'string') {
          try { pData = JSON.parse(pData); } catch { pData = {}; }
        }
        setPiezas(pData || {});
      }
    }
  };

  // Obtener estado de un diente
  const getToothData = (toothNum: string): ToothData => {
    return piezas[toothNum] || { diente: toothNum, superficies: {}, estadoGeneral: 'SANO' };
  };

  // Aplicar condición a una superficie específica
  const handleSurfaceClick = (toothNum: string, surface: SurfaceKey, e: React.MouseEvent) => {
    e.stopPropagation();
    if (readOnly || isHistoricalView) return;

    setPiezas(prev => {
      const current = prev[toothNum] || { diente: toothNum, superficies: {}, estadoGeneral: 'SANO' };
      const currentSurfaces = { ...(current.superficies || {}) };

      // Si ya tiene esa condición, volver a SANO, sino asignar la seleccionada
      const newCond = currentSurfaces[surface] === selectedCondition ? 'SANO' : selectedCondition;
      currentSurfaces[surface] = newCond;

      return {
        ...prev,
        [toothNum]: {
          ...current,
          superficies: currentSurfaces,
        }
      };
    });
  };

  // Aplicar condición a todo el diente
  const handleWholeToothCondition = (toothNum: string, condition: string) => {
    if (readOnly || isHistoricalView) return;

    setPiezas(prev => {
      const current = prev[toothNum] || { diente: toothNum, superficies: {} };
      if (condition === 'SANO') {
        return {
          ...prev,
          [toothNum]: {
            diente: toothNum,
            estadoGeneral: 'SANO',
            superficies: {
              vestibular: 'SANO',
              lingual: 'SANO',
              mesial: 'SANO',
              distal: 'SANO',
              oclusal: 'SANO'
            }
          }
        };
      }

      return {
        ...prev,
        [toothNum]: {
          ...current,
          estadoGeneral: condition,
          superficies: {
            vestibular: condition,
            lingual: condition,
            mesial: condition,
            distal: condition,
            oclusal: condition
          }
        }
      };
    });
  };

  const handleSave = async () => {
    if (!onSaveSnapshot || readOnly || isHistoricalView) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      await onSaveSnapshot(piezas, snapshotTitle || `Evaluación ${new Date().toLocaleDateString('es-ES')}`);
      setSaveSuccess(true);
      setSnapshotTitle('');
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Renderizar un diente en SVG anatómico con 5 superficies
  const renderToothSVG = (toothNum: string) => {
    const data = getToothData(toothNum);
    const surfaces = data.superficies || {};
    const general = data.estadoGeneral;

    const isSelected = selectedTooth === toothNum;
    const isMissing = general === 'AUSENTE';
    const isExtraction = general === 'EXTRACCION_INDICADA';
    const isImplant = general === 'IMPLANTE';
    const isCrown = general === 'CORONA';
    const isEndo = general === 'ENDODONCIA';

    // Colores de superficies
    const colorTop = getConditionColor(surfaces.vestibular);
    const colorBottom = getConditionColor(surfaces.lingual);
    const colorLeft = getConditionColor(surfaces.mesial);
    const colorRight = getConditionColor(surfaces.distal);
    const colorCenter = getConditionColor(surfaces.oclusal);

    return (
      <div 
        key={toothNum} 
        className={`flex flex-col items-center p-1.5 rounded-xl cursor-pointer transition-all duration-150 select-none ${
          isSelected 
            ? 'bg-sky-100 ring-2 ring-sky-500 shadow-md scale-105' 
            : 'hover:bg-slate-100 hover:shadow-xs'
        }`}
        onClick={() => setSelectedTooth(toothNum)}
      >
        <span className="text-[11px] font-black text-slate-700 mb-1">
          {toothNum}
        </span>

        <div className="relative w-11 h-11">
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xs">
            {/* Superficie Superior / Vestibular */}
            <polygon
              points="0,0 100,0 75,25 25,25"
              fill={colorTop}
              stroke="#334155"
              strokeWidth="2"
              className="hover:opacity-80 transition-opacity"
              onClick={(e) => handleSurfaceClick(toothNum, 'vestibular', e)}
            />

            {/* Superficie Derecha / Distal */}
            <polygon
              points="100,0 100,100 75,75 75,25"
              fill={colorRight}
              stroke="#334155"
              strokeWidth="2"
              className="hover:opacity-80 transition-opacity"
              onClick={(e) => handleSurfaceClick(toothNum, 'distal', e)}
            />

            {/* Superficie Inferior / Lingual */}
            <polygon
              points="100,100 0,100 25,75 75,75"
              fill={colorBottom}
              stroke="#334155"
              strokeWidth="2"
              className="hover:opacity-80 transition-opacity"
              onClick={(e) => handleSurfaceClick(toothNum, 'lingual', e)}
            />

            {/* Superficie Izquierda / Mesial */}
            <polygon
              points="0,100 0,0 25,25 25,75"
              fill={colorLeft}
              stroke="#334155"
              strokeWidth="2"
              className="hover:opacity-80 transition-opacity"
              onClick={(e) => handleSurfaceClick(toothNum, 'mesial', e)}
            />

            {/* Superficie Central / Oclusal */}
            <polygon
              points="25,25 75,25 75,75 25,75"
              fill={colorCenter}
              stroke="#334155"
              strokeWidth="2"
              className="hover:opacity-80 transition-opacity"
              onClick={(e) => handleSurfaceClick(toothNum, 'oclusal', e)}
            />

            {/* Símbolos clínicos sobrepuestos */}
            {isMissing && (
              <path
                d="M 5,5 L 95,95 M 95,5 L 5,95"
                stroke="#334155"
                strokeWidth="7"
                strokeLinecap="round"
              />
            )}

            {isExtraction && (
              <path
                d="M 5,5 L 95,95 M 95,5 L 5,95"
                stroke="#dc2626"
                strokeWidth="7"
                strokeLinecap="round"
              />
            )}

            {isCrown && (
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="none"
                stroke="#2563eb"
                strokeWidth="5"
                strokeDasharray="4,2"
              />
            )}

            {isEndo && (
              <line
                x1="50"
                y1="5"
                x2="50"
                y2="95"
                stroke="#8b5cf6"
                strokeWidth="6"
                strokeLinecap="round"
              />
            )}

            {isImplant && (
              <rect
                x="40"
                y="15"
                width="20"
                height="70"
                rx="4"
                fill="#059669"
                opacity="0.8"
              />
            )}
          </svg>
        </div>

        {/* Indicador de notas */}
        {data.notas && (
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1" title={data.notas} />
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      
      {/* ─── BARRA DE HERRAMIENTAS SUPERIOR ─────────────────────────── */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-sky-100 text-sky-700">
              <Smile className="w-5 h-5" />
            </span>
            <h3 className="text-lg font-black text-slate-900">
              Odontograma Digital Interactivo (FDI)
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {patientName ? `Paciente: ${patientName} • ` : ''}
            Haz clic en una condición y luego sobre cualquier cara del diente para diagnosticar.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Selector de Dentición */}
          <div className="inline-flex p-1 rounded-xl bg-slate-200/80 text-xs font-bold text-slate-700">
            <button
              type="button"
              onClick={() => setDentitionMode('PERMANENTE')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                dentitionMode === 'PERMANENTE' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Permanente (Adultos)
            </button>
            <button
              type="button"
              onClick={() => setDentitionMode('TEMPORAL')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                dentitionMode === 'TEMPORAL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Temporal (Niños)
            </button>
            <button
              type="button"
              onClick={() => setDentitionMode('MIXTO')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                dentitionMode === 'MIXTO' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mixto
            </button>
          </div>

          {/* Historial de Snapshots */}
          {snapshots.length > 0 && (
            <div className="flex items-center gap-1.5">
              <History className="w-4 h-4 text-slate-400" />
              <select
                value={selectedSnapshotId}
                onChange={(e) => handleSnapshotChange(e.target.value)}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 shadow-2xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
              >
                <option value="current">● Odontograma Actual (Editable)</option>
                {snapshots.map((snap, sIdx) => (
                  <option key={snap.id} value={snap.id}>
                    Snapshot #{snapshots.length - sIdx}: {snap.titulo || 'Evaluación'} ({new Date(snap.createdAt).toLocaleDateString('es-ES')})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Alerta si está viendo un snapshot histórico */}
      {isHistoricalView && (
        <div className="p-3 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs font-semibold flex items-center justify-between px-5">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Estás consultando un registro histórico inmutable de odontograma. No se sobrescribirá.</span>
          </div>
          <button
            type="button"
            onClick={() => handleSnapshotChange('current')}
            className="text-amber-800 underline hover:text-amber-950 font-bold"
          >
            Volver al Odontograma Actual
          </button>
        </div>
      )}

      {/* ─── PALETA DE CONDICIONES CLÍNICAS ──────────────────────────── */}
      {!readOnly && !isHistoricalView && (
        <div className="p-4 border-b border-slate-100 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Condición Activa para Pintar:
            </span>
            <span className="text-xs text-slate-500">
              Color Rojo = Patología • Color Azul = Tratamiento Previo
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {DENTAL_CONDITIONS.map((cond) => {
              const isSelected = selectedCondition === cond.id;
              return (
                <button
                  key={cond.id}
                  type="button"
                  onClick={() => setSelectedCondition(cond.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    isSelected
                      ? `${cond.bg} ring-2 ring-offset-1 shadow-xs scale-105`
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span 
                    className="w-3 h-3 rounded-full border border-black/10 shrink-0"
                    style={{ backgroundColor: cond.color }}
                  />
                  <span>{cond.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── TABLERO GRÁFICO ODONTOGRAMA ─────────────────────────────── */}
      <div className="p-6 overflow-x-auto bg-slate-50/40">
        <div className="min-w-[700px] flex flex-col items-center gap-6">

          {/* CUADRANTES SUPERIORES PERMANENTES (Q1 & Q2) */}
          {(dentitionMode === 'PERMANENTE' || dentitionMode === 'MIXTO') && (
            <div className="w-full bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex justify-between items-center mb-2 px-3 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                <span>Cuadrante 1 (Superior Derecho)</span>
                <span>Maxilar Superior</span>
                <span>Cuadrante 2 (Superior Izquierdo)</span>
              </div>
              <div className="flex items-center justify-center gap-1">
                {/* Q1: 18 -> 11 */}
                <div className="flex items-center gap-1 border-r-2 border-slate-300 pr-2">
                  {PERMANENT_TEETH_QUADRANTS.Q1.map(t => renderToothSVG(t))}
                </div>
                {/* Q2: 21 -> 28 */}
                <div className="flex items-center gap-1 pl-2">
                  {PERMANENT_TEETH_QUADRANTS.Q2.map(t => renderToothSVG(t))}
                </div>
              </div>
            </div>
          )}

          {/* CUADRANTES TEMPORALES / INFANTILES (Q5 & Q6, Q8 & Q7) */}
          {(dentitionMode === 'TEMPORAL' || dentitionMode === 'MIXTO') && (
            <div className="w-full max-w-2xl bg-amber-50/50 p-4 rounded-2xl border border-amber-200/70 shadow-2xs">
              <div className="flex justify-between items-center mb-2 px-3 text-[11px] font-black text-amber-700 uppercase tracking-wider">
                <span>Dentición Temporal Superior (55-51 | 61-65)</span>
                <span>Infantil</span>
              </div>
              <div className="flex items-center justify-center gap-1 mb-4">
                <div className="flex items-center gap-1 border-r-2 border-amber-300 pr-2">
                  {DECIDUOUS_TEETH_QUADRANTS.Q5.map(t => renderToothSVG(t))}
                </div>
                <div className="flex items-center gap-1 pl-2">
                  {DECIDUOUS_TEETH_QUADRANTS.Q6.map(t => renderToothSVG(t))}
                </div>
              </div>

              <div className="flex justify-between items-center mb-2 px-3 text-[11px] font-black text-amber-700 uppercase tracking-wider">
                <span>Dentición Temporal Inferior (85-81 | 71-75)</span>
              </div>
              <div className="flex items-center justify-center gap-1">
                <div className="flex items-center gap-1 border-r-2 border-amber-300 pr-2">
                  {DECIDUOUS_TEETH_QUADRANTS.Q8.map(t => renderToothSVG(t))}
                </div>
                <div className="flex items-center gap-1 pl-2">
                  {DECIDUOUS_TEETH_QUADRANTS.Q7.map(t => renderToothSVG(t))}
                </div>
              </div>
            </div>
          )}

          {/* CUADRANTES INFERIORES PERMANENTES (Q4 & Q3) */}
          {(dentitionMode === 'PERMANENTE' || dentitionMode === 'MIXTO') && (
            <div className="w-full bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-center gap-1">
                {/* Q4: 48 -> 41 */}
                <div className="flex items-center gap-1 border-r-2 border-slate-300 pr-2">
                  {PERMANENT_TEETH_QUADRANTS.Q4.map(t => renderToothSVG(t))}
                </div>
                {/* Q3: 31 -> 38 */}
                <div className="flex items-center gap-1 pl-2">
                  {PERMANENT_TEETH_QUADRANTS.Q3.map(t => renderToothSVG(t))}
                </div>
              </div>
              <div className="flex justify-between items-center mt-2 px-3 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                <span>Cuadrante 4 (Inferior Derecho)</span>
                <span>Mandíbula Inferior</span>
                <span>Cuadrante 3 (Inferior Izquierdo)</span>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ─── PANEL INSPECTOR DE DIENTE SELECCIONADO ─────────────────── */}
      {selectedTooth && (
        <div className="p-5 bg-sky-50/60 border-t border-sky-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-sky-600 text-white font-black text-xs">
                Pieza Dental #{selectedTooth}
              </span>
              <span className="text-sm font-bold text-slate-800">
                Detalle & Superficies Clínicas
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-600">
              <span>Vestibular: <strong>{getToothData(selectedTooth).superficies?.vestibular || 'SANO'}</strong></span>
              <span>•</span>
              <span>Lingual: <strong>{getToothData(selectedTooth).superficies?.lingual || 'SANO'}</strong></span>
              <span>•</span>
              <span>Mesial: <strong>{getToothData(selectedTooth).superficies?.mesial || 'SANO'}</strong></span>
              <span>•</span>
              <span>Distal: <strong>{getToothData(selectedTooth).superficies?.distal || 'SANO'}</strong></span>
              <span>•</span>
              <span>Oclusal: <strong>{getToothData(selectedTooth).superficies?.oclusal || 'SANO'}</strong></span>
            </div>
          </div>

          {!readOnly && !isHistoricalView && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleWholeToothCondition(selectedTooth, 'SANO')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-50"
              >
                Marcar Todo Sano
              </button>
              <button
                type="button"
                onClick={() => handleWholeToothCondition(selectedTooth, 'AUSENTE')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
              >
                Diente Ausente
              </button>
              <button
                type="button"
                onClick={() => handleWholeToothCondition(selectedTooth, 'EXTRACCION_INDICADA')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-rose-700 border border-rose-300 hover:bg-rose-50"
              >
                Extracción
              </button>
              <button
                type="button"
                onClick={() => handleWholeToothCondition(selectedTooth, 'CORONA')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-blue-700 border border-blue-300 hover:bg-blue-50"
              >
                Corona
              </button>
              <button
                type="button"
                onClick={() => handleWholeToothCondition(selectedTooth, 'IMPLANTE')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-teal-700 border border-teal-300 hover:bg-teal-50"
              >
                Implante
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── BARRA DE ACCIÓN / GUARDAR SNAPSHOT ──────────────────────── */}
      {!readOnly && !isHistoricalView && onSaveSnapshot && (
        <div className="p-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              value={snapshotTitle}
              onChange={(e) => setSnapshotTitle(e.target.value)}
              placeholder="Motivo del snapshot (ej. Control mensual, Inicial)..."
              className="w-full sm:w-80 px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {saveSuccess && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4" />
                Snapshot guardado en la historia clínica
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-sky-600 hover:bg-sky-700 active:scale-95 disabled:opacity-50 transition-all shadow-md"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Guardando...' : 'Guardar Nuevo Snapshot Odontograma'}</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
