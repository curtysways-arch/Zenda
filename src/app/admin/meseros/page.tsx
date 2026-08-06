"use client";

import React, { useEffect, useState } from 'react';
import { Users, Utensils, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AdminMeserosPage() {
  const [slug, setSlug] = useState<string>('demo');
  const [waiterName, setWaiterName] = useState<string>('Carlos M.');
  const [waiterData, setWaiterData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchWaiterData = async (currentSlug: string, name: string) => {
    if (!name) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/${currentSlug}/waiter?waiterName=${encodeURIComponent(name)}`);
      const data = await res.json();
      if (data.success) {
        setWaiterData(data);
      }
    } catch (err) {
      console.error("Error al cargar datos de mesero:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch('/api/admin/current-business')
      .then(res => res.json())
      .then(data => {
        const s = data.negocio?.slug || 'demo';
        setSlug(s);
        fetchWaiterData(s, waiterName);
      })
      .catch(() => fetchWaiterData('demo', waiterName));
  }, []);

  return (
    <div className="p-6 bg-slate-950 min-h-screen text-white font-sans space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-600/20 text-amber-400 rounded-2xl border border-amber-500/30">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-white italic">Consola de Meseros</h1>
            <p className="text-xs text-slate-400">Vista filtrada por zonas, comandas asignadas y estado de cocina</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
          <span className="text-xs font-bold text-slate-400">Mesero Activo:</span>
          <input
            type="text"
            value={waiterName}
            onChange={(e) => setWaiterName(e.target.value)}
            onBlur={() => fetchWaiterData(slug, waiterName)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-amber-400 focus:outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500 text-xs font-bold">Cargando mesero...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Mesas Asignadas */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              <Utensils className="w-4 h-4 text-amber-500" />
              Sus Mesas ({waiterData?.mesas?.length || 0})
            </h3>
            {waiterData?.mesas?.length === 0 ? (
              <div className="text-center py-8 text-slate-600 text-xs">Sin mesas asignadas actualmente</div>
            ) : (
              <div className="space-y-2">
                {waiterData?.mesas?.map((m: any) => (
                  <div key={m.id} className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-white">{m.name}</h4>
                      <span className="text-[10px] text-slate-400">Capacidad: {m.capacity} pers.</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      {m.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Órdenes del Mesero */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              <Clock className="w-4 h-4 text-amber-500" />
              Comandas en Cocina ({waiterData?.orders?.length || 0})
            </h3>
            {waiterData?.orders?.length === 0 ? (
              <div className="text-center py-8 text-slate-600 text-xs">No hay comandas activas para sus mesas</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {waiterData?.orders?.map((o: any) => {
                  const extra = typeof o.extraInfo === 'string' ? JSON.parse(o.extraInfo || '{}') : (o.extraInfo || {});
                  return (
                    <div key={o.id} className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-1.5">
                        <span className="font-black text-amber-400">#{o.numeroPedido}</span>
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                          {extra.kitchenStatus || o.estado}
                        </span>
                      </div>
                      <div className="text-xs text-slate-300">
                        {o.referenciaCliente || 'Mesa'} - {o.nombreCliente}
                      </div>
                      <div className="text-[11px] text-slate-400 space-y-0.5">
                        {o.items?.map((it: any) => (
                          <div key={it.id} className="flex justify-between">
                            <span>{it.cantidad}x {it.nombreProducto}</span>
                            <span className="text-slate-300 font-bold">${(it.precioUnitario * it.cantidad).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
