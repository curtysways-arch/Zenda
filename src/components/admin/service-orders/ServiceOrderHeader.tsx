import React from 'react';
import { Calendar, Clock, Sparkles, Tag, Layers } from 'lucide-react';

interface ServiceOrderHeaderProps {
  numeroPedido: number;
  estado: string;
  estadoBadgeBg: string;
  fechaRecepcion: string;
  fechaEntregaEstimada: string;
  prioridad?: string;
  tipoEntrega?: string;
}

export function ServiceOrderHeader({
  numeroPedido,
  estado,
  estadoBadgeBg,
  fechaRecepcion,
  fechaEntregaEstimada,
  prioridad,
  tipoEntrega,
}: ServiceOrderHeaderProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-md shadow-emerald-500/20">
            #{numeroPedido}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900">Orden de Servicio #{numeroPedido}</h1>
              {prioridad === 'Urgente' && (
                <span className="px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs font-bold rounded-full">
                  ⚡ Urgente
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
              <span>Canal: <strong>{tipoEntrega === 'DOMICILIO' ? '🛵 Domicilio' : '🏪 Recepción Local'}</strong></span>
              <span>•</span>
              <span>Recepción: {fechaRecepcion}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`px-4 py-2 rounded-2xl border text-sm font-black shadow-sm ${estadoBadgeBg}`}>
            {estado.replace(/_/g, ' ')}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
        <div className="flex items-center gap-2 text-slate-600">
          <Calendar className="w-4 h-4 text-emerald-600" />
          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase">Recepción</p>
            <p className="font-bold text-slate-800">{fechaRecepcion}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <Clock className="w-4 h-4 text-amber-600" />
          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase">Entrega Estimada</p>
            <p className="font-bold text-slate-800">{fechaEntregaEstimada}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <Tag className="w-4 h-4 text-indigo-600" />
          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase">Prioridad</p>
            <p className="font-bold text-slate-800">{prioridad || 'Normal'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <Layers className="w-4 h-4 text-purple-600" />
          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase">Motor</p>
            <p className="font-bold text-slate-800">ServiceEngine v1.0</p>
          </div>
        </div>
      </div>
    </div>
  );
}
