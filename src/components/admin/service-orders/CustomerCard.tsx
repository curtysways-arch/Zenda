import React from 'react';
import { User, Phone, MapPin, Mail, History, ExternalLink } from 'lucide-react';

interface CustomerCardProps {
  cliente: {
    nombre: string;
    telefono: string;
    email?: string;
    direccion?: string;
  };
  historial?: Array<{
    id: string;
    numeroPedido: number;
    total: number;
    estado: string;
    createdAt: string;
  }>;
  onOpenWhatsApp: () => void;
}

export function CustomerCard({ cliente, historial = [], onOpenWhatsApp }: CustomerCardProps) {
  const totalGastado = historial.reduce((sum, h) => sum + (h.total || 0), 0);

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <User className="w-5 h-5 text-emerald-600" /> Información del Cliente
        </h3>
        <button
          onClick={onOpenWhatsApp}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition-colors shadow-sm"
        >
          <Phone className="w-3.5 h-3.5" /> WhatsApp
        </button>
      </div>

      <div className="space-y-2 text-xs">
        <div>
          <p className="text-slate-400 font-semibold">Nombre:</p>
          <p className="text-sm font-bold text-slate-900">{cliente.nombre}</p>
        </div>

        <div>
          <p className="text-slate-400 font-semibold">Teléfono:</p>
          <p className="font-mono text-slate-800 font-bold">{cliente.telefono}</p>
        </div>

        {cliente.email && (
          <div>
            <p className="text-slate-400 font-semibold">Email:</p>
            <p className="text-slate-700">{cliente.email}</p>
          </div>
        )}

        {cliente.direccion && (
          <div>
            <p className="text-slate-400 font-semibold">Dirección:</p>
            <p className="text-slate-700 flex items-start gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
              {cliente.direccion}
            </p>
          </div>
        )}
      </div>

      {/* Historial Resumido */}
      <div className="pt-3 border-t border-slate-100 text-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-slate-700 flex items-center gap-1">
            <History className="w-3.5 h-3.5 text-slate-400" /> Historial de Órdenes ({historial.length})
          </span>
          <span className="font-mono font-bold text-emerald-600">${totalGastado.toFixed(2)} gastados</span>
        </div>

        {historial.length === 0 ? (
          <p className="text-slate-400 text-[11px] italic">Primera visita registrada</p>
        ) : (
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {historial.slice(0, 4).map(h => (
              <div key={h.id} className="p-2 bg-slate-50 rounded-xl flex items-center justify-between text-[11px]">
                <div>
                  <span className="font-bold text-slate-800">#{h.numeroPedido}</span>
                  <span className="text-slate-400 ml-2">{new Date(h.createdAt).toLocaleDateString('es-PE')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-700">${h.total.toFixed(2)}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded-md">
                    {h.estado}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
