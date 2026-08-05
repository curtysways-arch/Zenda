import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

interface StatusStepperProps {
  statuses: string[];
  currentStatus: string;
  onChangeStatus: (newStatus: string) => void;
}

export function StatusStepper({ statuses, currentStatus, onChangeStatus }: StatusStepperProps) {
  const currentIndex = statuses.indexOf(currentStatus);

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
      <h3 className="text-base font-bold text-slate-900">Estado de la Orden (Etapas Operativas)</h3>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {statuses.map((st, idx) => {
          const isDone = idx < currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <button
              key={st}
              onClick={() => onChangeStatus(st)}
              className={`flex-1 min-w-[120px] p-3 rounded-2xl border-2 text-xs font-bold transition-all text-left flex flex-col justify-between space-y-2 ${
                isCurrent
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-md shadow-emerald-500/10'
                  : isDone
                  ? 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                  : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono opacity-60">Paso {idx + 1}</span>
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : isCurrent ? (
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-300" />
                )}
              </div>
              <span className="truncate">{st.replace(/_/g, ' ')}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
