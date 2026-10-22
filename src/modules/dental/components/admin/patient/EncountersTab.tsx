'use client';

import React, { useState } from 'react';
import { Stethoscope, Plus, Printer, ChevronDown } from 'lucide-react';
import { formatDate, formatDateTime } from '../../../lib/format';
import { Button, EmptyState, Badge, cx } from '../ui';

function Section({ title, children, mono }: { title: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      <p className={cx('mt-0.5 whitespace-pre-line text-sm text-slate-700', mono && 'rounded-lg bg-slate-50 p-2.5')}>{children}</p>
    </div>
  );
}

function printPrescription(enc: any, patientName: string, clinicName?: string) {
  const w = window.open('', '_blank', 'width=720,height=900');
  if (!w) return;
  const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Receta</title>
  <style>body{font-family:system-ui,Arial,sans-serif;padding:40px;color:#0f172a}h1{font-size:20px;margin:0}
  .muted{color:#64748b;font-size:13px}.box{border-top:1px solid #e2e8f0;margin-top:20px;padding-top:16px}
  pre{white-space:pre-wrap;font-family:inherit;font-size:15px;line-height:1.6}.sign{margin-top:80px;border-top:1px solid #94a3b8;width:240px;text-align:center;padding-top:6px;font-size:13px}</style>
  </head><body>
  <h1>${esc(clinicName || 'Receta odontológica')}</h1>
  <p class="muted">Fecha: ${esc(formatDate(enc.fecha, { day: '2-digit', month: 'long', year: 'numeric' }))}</p>
  <div class="box"><strong>Paciente:</strong> ${esc(patientName)}${enc.diagnostico ? `<br><strong>Diagnóstico:</strong> ${esc(enc.diagnostico)}` : ''}</div>
  <div class="box"><strong>Rp.</strong><pre>${esc(enc.prescripcion || '')}</pre></div>
  ${enc.indicaciones ? `<div class="box"><strong>Indicaciones</strong><pre>${esc(enc.indicaciones)}</pre></div>` : ''}
  <div class="sign">${esc(enc.Staff?.name || 'Firma del odontólogo')}</div>
  <script>window.onload=()=>{window.print()}</script></body></html>`);
  w.document.close();
}

export default function EncountersTab({
  encounters,
  patientName,
  onNew,
}: {
  encounters: any[];
  patientName: string;
  onNew: () => void;
}) {
  const [openId, setOpenId] = useState<string | null>(encounters[0]?.id || null);

  if (!encounters.length) {
    return (
      <EmptyState
        icon={<Stethoscope className="h-12 w-12" />}
        title="Sin consultas registradas"
        description="Cada vez que atiendas al paciente, registra la consulta: motivo, diagnóstico, procedimiento y receta."
        action={<Button icon={<Plus className="h-4 w-4" />} onClick={onNew}>Registrar consulta</Button>}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{encounters.length} consulta{encounters.length === 1 ? '' : 's'}, de la más reciente a la más antigua.</p>
        <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={onNew}>Registrar consulta</Button>
      </div>

      <ol className="relative space-y-3 border-l-2 border-slate-200 pl-5">
        {encounters.map((enc) => {
          const open = openId === enc.id;
          const vitals = enc.signosVitales || {};
          const hasVitals = Object.values(vitals).some(Boolean);
          const problema = enc.problemaActual?.descripcion;
          return (
            <li key={enc.id} className="relative">
              <span className="absolute -left-[27px] top-4 h-3 w-3 rounded-full border-2 border-white bg-sky-500 ring-2 ring-sky-100" />
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <button type="button" onClick={() => setOpenId(open ? null : enc.id)} className="flex w-full items-start justify-between gap-3 p-4 text-left">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500">{formatDateTime(enc.fecha)}{enc.Staff?.name ? ` · ${enc.Staff.name}` : ''}</p>
                    <p className="mt-0.5 font-semibold text-slate-900">{enc.motivoConsulta}</p>
                    {enc.diagnostico && (
                      <p className="mt-0.5 truncate text-sm text-slate-600">
                        {enc.diagnostico} {enc.codigoCIE && <Badge tone="slate" className="ml-1">{enc.codigoCIE}</Badge>}
                      </p>
                    )}
                  </div>
                  <ChevronDown className={cx('mt-1 h-4 w-4 shrink-0 text-slate-400 transition', open && 'rotate-180')} />
                </button>
                {open && (
                  <div className="space-y-3 border-t border-slate-100 p-4">
                    {hasVitals && (
                      <div className="flex flex-wrap gap-2 text-sm">
                        {vitals.presionArterial && <Badge tone="slate">PA {vitals.presionArterial}</Badge>}
                        {vitals.frecuenciaCardiaca && <Badge tone="slate">Pulso {vitals.frecuenciaCardiaca}</Badge>}
                        {vitals.temperatura && <Badge tone="slate">{vitals.temperatura} °C</Badge>}
                        {vitals.saturacion && <Badge tone="slate">SpO₂ {vitals.saturacion}%</Badge>}
                        {vitals.frecuenciaRespiratoria && <Badge tone="slate">FR {vitals.frecuenciaRespiratoria}</Badge>}
                      </div>
                    )}
                    {problema && <Section title="Síntomas">{problema}</Section>}
                    {enc.examenFisico && <Section title="Examen clínico">{enc.examenFisico}</Section>}
                    {enc.procedimientoRealizado && <Section title="Procedimiento realizado">{enc.procedimientoRealizado}</Section>}
                    {enc.prescripcion && <Section title="Receta" mono>{enc.prescripcion}</Section>}
                    {enc.indicaciones && <Section title="Indicaciones">{enc.indicaciones}</Section>}
                    {enc.proximaCita && (
                      <Section title="Próximo control">{formatDate(enc.proximaCita, { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</Section>
                    )}
                    {enc.prescripcion && (
                      <Button size="sm" variant="secondary" icon={<Printer className="h-4 w-4" />} onClick={() => printPrescription(enc, patientName)}>
                        Imprimir receta
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
