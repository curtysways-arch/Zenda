import React, { useState, useEffect } from 'react';
import { User, Phone, MapPin, Mail, History, ExternalLink, Lock } from 'lucide-react';

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
  isPlanFree?: boolean;
}

export function CustomerCard({ cliente, historial = [], onOpenWhatsApp, isPlanFree: isPlanFreeProp }: CustomerCardProps) {
  const [internalFree, setInternalFree] = useState<boolean>(isPlanFreeProp ?? false);

  useEffect(() => {
    if (isPlanFreeProp !== undefined) {
      setInternalFree(isPlanFreeProp);
      return;
    }
    fetch('/api/features')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.communications_module === false) {
          setInternalFree(true);
        }
      })
      .catch(() => {});
  }, [isPlanFreeProp]);

  const isFree = isPlanFreeProp !== undefined ? isPlanFreeProp : internalFree;
  const totalGastado = historial.reduce((sum, h) => sum + (h.total || 0), 0);

  const maskPhone = (phone?: string) => {
    if (!phone) return '***';
    const cleaned = phone.trim();
    if (cleaned.length <= 4) return '***';
    const last3 = cleaned.slice(-3);
    const prefix = cleaned.startsWith('+') ? cleaned.slice(0, 4) : cleaned.slice(0, 2);
    return `${prefix} *** *** ${last3}`;
  };

  const maskName = (name?: string) => {
    if (!name) return '***';
    return name.split(' ').map(part => part.length > 0 ? `${part[0]}***` : '***').join(' ');
  };

  const maskEmail = (email?: string) => {
    if (!email) return '***';
    const [user, domain] = email.split('@');
    return `${user ? user[0] : ''}***@***.${domain?.split('.').pop() || 'com'}`;
  };

  const maskAddress = (address?: string) => {
    if (!address) return '***';
    const parts = address.split(' ');
    return parts.slice(0, 2).join(' ') + ' *** ***';
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <User className="w-5 h-5 text-emerald-600" /> Información del Cliente
        </h3>
        {isFree ? (
          <div 
            title="La comunicación directa y datos de contacto están protegidos en el Plan Free"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-700 border border-amber-500/30 rounded-xl text-xs font-bold select-none"
          >
            <Lock className="w-3.5 h-3.5 text-amber-600" /> Plan Pro
          </div>
        ) : (
          <button
            onClick={onOpenWhatsApp}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition-colors shadow-sm"
          >
            <Phone className="w-3.5 h-3.5" /> WhatsApp
          </button>
        )}
      </div>

      {isFree && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
          <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold block">Protección de Datos Activa</span>
            <span className="text-xs text-amber-800/80 leading-tight block">
              En el <strong>Plan Free</strong> la información de contacto y métricas del cliente están protegidas. Actualiza a Pro para desbloquear datos completos y comunicación.
            </span>
          </div>
        </div>
      )}

      <div className="space-y-2 text-xs">
        <div>
          <p className="text-slate-400 font-semibold">Nombre:</p>
          <p className={`text-sm font-bold text-slate-900 ${isFree ? 'filter blur-[3.5px] select-none' : ''}`}>
            {isFree ? maskName(cliente.nombre) : cliente.nombre}
          </p>
        </div>

        <div>
          <p className="text-slate-400 font-semibold">Teléfono:</p>
          <p className={`font-mono text-slate-800 font-bold ${isFree ? 'filter blur-[3.5px] select-none' : ''}`}>
            {isFree ? maskPhone(cliente.telefono) : cliente.telefono}
          </p>
        </div>

        {cliente.email && (
          <div>
            <p className="text-slate-400 font-semibold">Email:</p>
            <p className={`text-slate-700 ${isFree ? 'filter blur-[3.5px] select-none' : ''}`}>
              {isFree ? maskEmail(cliente.email) : cliente.email}
            </p>
          </div>
        )}

        {cliente.direccion && (
          <div>
            <p className="text-slate-400 font-semibold">Dirección:</p>
            <p className={`text-slate-700 flex items-start gap-1 ${isFree ? 'filter blur-[3.5px] select-none' : ''}`}>
              <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
              {isFree ? maskAddress(cliente.direccion) : cliente.direccion}
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
          <span className={`font-mono font-bold text-emerald-600 ${isFree ? 'filter blur-[2px] select-none' : ''}`}>
            {isFree ? '*** gastados' : `$${totalGastado.toFixed(2)} gastados`}
          </span>
        </div>

        {historial.length === 0 ? (
          <p className="text-slate-400 text-xs ">Primera visita registrada</p>
        ) : (
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {historial.slice(0, 4).map(h => (
              <div key={h.id} className="p-2 bg-slate-50 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-800">#{h.numeroPedido}</span>
                  <span className="text-slate-400 ml-2">{new Date(h.createdAt).toLocaleDateString('es-PE')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-mono font-bold text-slate-700 ${isFree ? 'filter blur-[2px] select-none' : ''}`}>
                    {isFree ? '$***' : `$${h.total.toFixed(2)}`}
                  </span>
                  <span className="text-xs px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded-md">
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
