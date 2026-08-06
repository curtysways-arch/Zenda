"use client";

import React, { useState } from 'react';
import { Grid, QrCode, Plus, Users, CheckCircle, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';

interface MesaItem {
  id: string;
  code: string;
  name: string;
  capacity: number;
  status: 'LIBRE' | 'OCUPADA' | 'RESERVADA' | 'LIMPIEZA';
  waiterName?: string;
  accountRequested?: boolean;
}

interface KitchenTablesProps {
  slug: string;
  mesas?: MesaItem[];
  onUpdateStatus?: (mesaId: string, newStatus: string) => void;
}

export default function KitchenTables({ slug, mesas = [], onUpdateStatus }: KitchenTablesProps) {
  const [selectedQR, setSelectedQR] = useState<MesaItem | null>(null);

  const defaultMesas: MesaItem[] = mesas.length > 0 ? mesas : [
    { id: '1', code: 'Mesa1', name: 'Mesa 1 (Interior)', capacity: 4, status: 'LIBRE' },
    { id: '2', code: 'Mesa2', name: 'Mesa 2 (Interior)', capacity: 2, status: 'OCUPADA', waiterName: 'Carlos M.' },
    { id: '3', code: 'Mesa3', name: 'Mesa 3 (Terraza)', capacity: 6, status: 'RESERVADA' },
    { id: '4', code: 'Mesa4', name: 'Mesa 4 (VIP)', capacity: 4, status: 'LIMPIEZA' },
  ];

  const getStatusColor = (st: string) => {
    switch (st) {
      case 'LIBRE': return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400';
      case 'OCUPADA': return 'border-amber-500/40 bg-amber-500/10 text-amber-400';
      case 'RESERVADA': return 'border-blue-500/40 bg-blue-500/10 text-blue-400';
      case 'LIMPIEZA': return 'border-purple-500/40 bg-purple-500/10 text-purple-400';
      default: return 'border-slate-800 bg-slate-900 text-slate-400';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Grid className="w-5 h-5 text-amber-500" />
            Plano de Mesas & Códigos QR
          </h3>
          <p className="text-xs text-slate-400">Estado operativo en tiempo real y generador de pedidos por QR</p>
        </div>
      </div>

      {/* Grilla de Mesas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {defaultMesas.map(m => (
          <div key={m.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${getStatusColor(m.status)}`}>
                  {m.status}
                </span>
                <button
                  onClick={() => setSelectedQR(m)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1 font-bold"
                  title="Ver QR de Mesa"
                >
                  <QrCode className="w-4 h-4 text-amber-400" />
                  <span>QR</span>
                </button>
              </div>

              <h4 className="font-bold text-white text-base leading-tight">{m.name}</h4>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  {m.capacity} pers.
                </span>
                {m.waiterName && (
                  <span className="text-amber-400 font-semibold">Mesero: {m.waiterName}</span>
                )}
              </div>
            </div>

            {/* Selector Rápido de Estado */}
            <div className="pt-3 border-t border-slate-800 flex items-center gap-1 overflow-x-auto">
              {(['LIBRE', 'OCUPADA', 'RESERVADA', 'LIMPIEZA'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => onUpdateStatus && onUpdateStatus(m.id, st)}
                  className={`flex-1 py-1 px-1.5 rounded-lg text-[10px] font-bold text-center border transition-all ${
                    m.status === st ? getStatusColor(st) : 'border-slate-800 bg-slate-950 text-slate-500 hover:text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Modal QR de Mesa */}
      {selectedQR && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 max-w-sm w-full p-6 rounded-3xl text-center space-y-4 shadow-2xl">
            <h4 className="font-bold text-lg text-white">QR Pedido a Mesa</h4>
            <p className="text-xs text-slate-400">{selectedQR.name} ({selectedQR.code})</p>

            <div className="p-4 bg-white rounded-2xl inline-block shadow-xl border-4 border-amber-500/20">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`https://citiox.com/${slug}?table=${selectedQR.code}`)}`}
                alt={`QR ${selectedQR.code}`}
                className="w-48 h-48 mx-auto"
              />
            </div>

            <p className="text-[11px] text-amber-400 font-mono break-all bg-slate-950 p-2 rounded-xl border border-slate-800">
              https://citiox.com/{slug}?table={selectedQR.code}
            </p>

            <button
              onClick={() => setSelectedQR(null)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
