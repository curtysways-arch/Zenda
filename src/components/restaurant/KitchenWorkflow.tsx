"use client";

import React from 'react';
import { ArrowRight, CheckCircle, Clock, Flame, PackageCheck, AlertCircle } from 'lucide-react';

interface KitchenWorkflowProps {
  currentStatus: string;
  onStatusChange?: (newStatus: string) => void;
}

export default function KitchenWorkflow({ currentStatus, onStatusChange }: KitchenWorkflowProps) {
  const workflowStatuses = [
    { id: 'NUEVA', label: 'Nueva', icon: Clock, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
    { id: 'CONFIRMADA', label: 'Confirmada', icon: CheckCircle, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
    { id: 'EN_COCINA', label: 'En Cocina', icon: Flame, color: 'text-orange-400 bg-orange-500/10 border-orange-500/30' },
    { id: 'PREPARANDO', label: 'Preparando', icon: Flame, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
    { id: 'LISTA', label: 'Lista', icon: PackageCheck, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
    { id: 'ENTREGADA', label: 'Entregada', icon: CheckCircle, color: 'text-slate-400 bg-slate-800 border-slate-700' },
    { id: 'PAGADA', label: 'Pagada', icon: CheckCircle, color: 'text-green-400 bg-green-500/10 border-green-500/30' },
    { id: 'FINALIZADA', label: 'Finalizada', icon: CheckCircle, color: 'text-slate-500 bg-slate-900 border-slate-800' }
  ];

  const currentIdx = workflowStatuses.findIndex(s => s.id === currentStatus.toUpperCase());

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-2 scrollbar-none">
      {workflowStatuses.map((st, idx) => {
        const Icon = st.icon;
        const isCurrent = idx === currentIdx;
        const isPassed = idx < currentIdx;

        return (
          <React.Fragment key={st.id}>
            <button
              onClick={() => onStatusChange && onStatusChange(st.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold whitespace-nowrap transition-all ${
                isCurrent ? `${st.color} shadow-lg scale-105` : (isPassed ? 'text-slate-400 border-slate-800 bg-slate-900/50' : 'text-slate-600 border-slate-900 bg-slate-950')
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{st.label}</span>
            </button>
            {idx < workflowStatuses.length - 1 && (
              <ArrowRight className="w-3 h-3 text-slate-700 shrink-0" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
