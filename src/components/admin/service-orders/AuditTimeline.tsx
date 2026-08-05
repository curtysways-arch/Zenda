import React from 'react';
import { History, Clock, User, ShieldCheck, FileText } from 'lucide-react';

interface AuditItem {
  id: string;
  type?: string;
  action: string;
  user: string;
  timestamp: string;
}

interface AuditTimelineProps {
  timeline: AuditItem[];
  createdAt: string;
}

export function AuditTimeline({ timeline = [], createdAt }: AuditTimelineProps) {
  const events = [
    {
      id: 'init',
      action: 'Orden de Servicio Creada (Recepción)',
      user: 'Sistema',
      timestamp: createdAt,
    },
    ...timeline,
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
        <History className="w-5 h-5 text-purple-600" /> Línea de Tiempo & Auditoría
      </h3>

      <div className="relative pl-6 space-y-4 before:absolute before:left-2 font-sans before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
        {events.map((ev, idx) => (
          <div key={ev.id || idx} className="relative text-xs space-y-0.5">
            <div className="absolute -left-6 top-0.5 w-3 h-3 rounded-full bg-purple-600 border-2 border-white ring-2 ring-purple-100" />
            <div className="flex items-center justify-between">
              <p className="font-bold text-slate-800">{ev.action}</p>
              <span className="text-[10px] text-slate-400 font-mono">
                {new Date(ev.timestamp).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">Registrado por: <strong className="text-slate-700">{ev.user}</strong></p>
          </div>
        ))}
      </div>
    </div>
  );
}
