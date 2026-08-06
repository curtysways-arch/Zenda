'use client';
// src/app/admin/cocina/page.tsx
// Módulo Kitchen Display System (KDS) dentro del Business Admin Citiox para capability: kitchen

import { useState, useEffect } from 'react';
import { Utensils, Clock, CheckCircle2, ChevronRight, Loader2, RefreshCw, ChefHat } from 'lucide-react';

interface KDSOrder {
  id: string;
  numeroPedido: number;
  estado: string;
  tipoEntrega: string;
  extraInfo?: any;
  items: any[];
  createdAt: string;
}

export default function AdminCocinaPage() {
  const [orders, setOrders] = useState<KDSOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEnterprise, setIsEnterprise] = useState(false);
  const [slug, setSlug] = useState('');

  useEffect(() => {
    async function loadNegocio() {
      try {
        const res = await fetch('/api/negocio');
        if (res.ok) {
          const neg = await res.json();
          setSlug(neg.slug);
        }
      } catch (_) {}
    }
    loadNegocio();
  }, []);

  useEffect(() => {
    if (slug) {
      fetchKDS();
      const interval = setInterval(fetchKDS, 8000);
      return () => clearInterval(interval);
    }
  }, [slug]);

  async function fetchKDS() {
    if (!slug) return;
    try {
      const res = await fetch(`/api/${slug}/kitchen`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        setIsEnterprise(Boolean(data.isEnterprise));
      }
    } finally {
      setLoading(false);
    }
  }

  async function advanceOrder(id: string) {
    if (!slug) return;
    await fetch(`/api/${slug}/kitchen/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ advance: true })
    });
    fetchKDS();
  }

  const pendientes = orders.filter(o => ['WAITING_ACCEPTANCE', 'PAGO_CONFIRMADO', 'RECIBIDO'].includes(o.estado));
  const enPreparacion = orders.filter(o => ['CONFIRMED', 'PREPARACION', 'EN_PREPARACION', 'PREPARING'].includes(o.estado));
  const listos = orders.filter(o => ['LISTO', 'READY'].includes(o.estado));

  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-[500px]">
      <Loader2 className="animate-spin text-slate-400 size-8" />
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <ChefHat className="text-amber-500 size-7" />
              Kitchen Display System (KDS Cocina)
            </h1>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
              isEnterprise 
                ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300' 
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}>
              <span className={`size-2 rounded-full ${isEnterprise ? 'bg-purple-600 animate-pulse' : 'bg-slate-400'}`}></span>
              Modo: {isEnterprise ? '● Enterprise Runtime' : '● Legacy'}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">Gestión de comandas activas en tiempo real con actualización automática de 8 segundos</p>
        </div>
        <button onClick={fetchKDS} className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2 hover:bg-slate-50">
          <RefreshCw className="size-4" /> Recargar
        </button>
      </div>

      {/* 3 Columns KDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Column 1: PENDIENTES / POR INICIAR */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-200 pb-3">
            <span className="font-extrabold text-xs text-amber-600 uppercase tracking-wider">⏳ PENDIENTES ({pendientes.length})</span>
          </div>
          {pendientes.map(order => (
            <KDSCard key={order.id} order={order} onAdvance={() => advanceOrder(order.id)} nextLabel="Iniciar Cocina" btnColor="bg-blue-600" />
          ))}
          {pendientes.length === 0 && <p className="text-xs text-slate-400 text-center py-8">Sin comanda pendiente</p>}
        </div>

        {/* Column 2: EN PREPARACIÓN */}
        <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 space-y-4">
          <div className="flex justify-between items-center border-b border-blue-100 pb-3">
            <span className="font-extrabold text-xs text-blue-600 uppercase tracking-wider">🔥 EN COCINA ({enPreparacion.length})</span>
          </div>
          {enPreparacion.map(order => (
            <KDSCard key={order.id} order={order} onAdvance={() => advanceOrder(order.id)} nextLabel="Marcar Listo" btnColor="bg-emerald-600" />
          ))}
          {enPreparacion.length === 0 && <p className="text-xs text-slate-400 text-center py-8">Sin comanda en preparación</p>}
        </div>

        {/* Column 3: LISTO */}
        <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 space-y-4">
          <div className="flex justify-between items-center border-b border-emerald-100 pb-3">
            <span className="font-extrabold text-xs text-emerald-600 uppercase tracking-wider">✅ LISTO EN BARRA ({listos.length})</span>
          </div>
          {listos.map(order => (
            <KDSCard key={order.id} order={order} onAdvance={() => advanceOrder(order.id)} nextLabel="Entregar Pedido" btnColor="bg-slate-700" />
          ))}
          {listos.length === 0 && <p className="text-xs text-slate-400 text-center py-8">Sin comanda lista</p>}
        </div>
      </div>
    </div>
  );
}

function KDSCard({ order, onAdvance, nextLabel, btnColor }: { order: KDSOrder; onAdvance: () => void; nextLabel: string; btnColor: string }) {
  const minsAgo = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60));
  const isUrgent = minsAgo > 10;

  return (
    <div className={`bg-white border-2 rounded-2xl p-4 shadow-sm space-y-3 ${isUrgent ? 'border-rose-400' : 'border-slate-100'}`}>
      <div className="flex justify-between items-center">
        <span className="font-black text-lg text-slate-900">#{order.numeroPedido}</span>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${isUrgent ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
          <Clock className="size-3" /> {minsAgo}m
        </span>
      </div>

      {order.extraInfo?.tableName && (
        <span className="inline-block bg-amber-100 text-amber-800 text-xs font-black px-2.5 py-1 rounded-lg">
          🪑 {order.extraInfo.tableName}
        </span>
      )}

      <div className="space-y-1.5 border-t border-slate-100 pt-3">
        {order.items?.map((item: any, idx: number) => (
          <div key={idx} className="flex justify-between text-xs font-semibold text-slate-800">
            <span>{item.cantidad}x {item.nombreProducto || item.producto?.nombre}</span>
          </div>
        ))}
      </div>

      <button onClick={onAdvance} className={`w-full py-2 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 shadow-sm hover:opacity-90 ${btnColor}`}>
        {nextLabel} <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
