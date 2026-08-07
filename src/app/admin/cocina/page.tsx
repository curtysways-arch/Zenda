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
  const pendientes = orders.filter(o => ['WAITING_ACCEPTANCE', 'PAGO_CONFIRMADO', 'RECIBIDO', 'PENDIENTE'].includes(o.estado));
  const enPreparacion = orders.filter(o => ['CONFIRMED', 'PREPARACION', 'EN_PREPARACION', 'PREPARING'].includes(o.estado));

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
          <p className="text-sm text-slate-500 mt-1">Comandas activas pendientes de preparación en cocina (Actualización en tiempo real)</p>
        </div>
        <button onClick={fetchKDS} className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2 hover:bg-slate-50">
          <RefreshCw className="size-4" /> Recargar
        </button>
      </div>

      {/* 2 Columns Focused KDS: Pendientes + En Preparación */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Column 1: PENDIENTES / POR INICIAR */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-200 pb-3">
            <span className="font-extrabold text-xs text-amber-600 uppercase tracking-wider">⏳ COMANDAS PENDIENTES ({pendientes.length})</span>
          </div>
          {pendientes.map(order => (
            <KDSCard key={order.id} order={order} onAdvance={() => advanceOrder(order.id)} nextLabel="Iniciar Preparación" btnColor="bg-blue-600" />
          ))}
          {pendientes.length === 0 && <p className="text-xs text-slate-400 text-center py-12">No hay comandas pendientes de iniciar</p>}
        </div>

        {/* Column 2: EN PREPARACIÓN */}
        <div className="bg-blue-50/40 border border-blue-100 rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-blue-100 pb-3">
            <span className="font-extrabold text-xs text-blue-600 uppercase tracking-wider">🍳 EN COCINA PREPARANDO ({enPreparacion.length})</span>
          </div>
          {enPreparacion.map(order => (
            <KDSCard key={order.id} order={order} onAdvance={() => advanceOrder(order.id)} nextLabel="Marcar Listo y Despachar" btnColor="bg-emerald-600" />
          ))}
          {enPreparacion.length === 0 && <p className="text-xs text-slate-400 text-center py-12">No hay platos preparándose actualmente en cocina</p>}
        </div>
      </div>
    </div>
  );
}

function KDSCard({ order, onAdvance, nextLabel, btnColor }: { order: KDSOrder; onAdvance: () => void; nextLabel: string; btnColor: string }) {
  const minsAgo = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60));
  const isUrgent = minsAgo > 10;
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  const toggleCheck = (idx: number) => {
    setCheckedItems(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const totalItemsCount = order.items?.length || 0;
  const checkedCount = Object.values(checkedItems).filter(Boolean).length;
  const allChecked = totalItemsCount > 0 && checkedCount === totalItemsCount;

  return (
    <div className={`bg-white border-2 rounded-2xl p-4 shadow-sm space-y-3 transition-all ${isUrgent ? 'border-rose-400' : allChecked ? 'border-emerald-400 bg-emerald-50/20' : 'border-slate-100'}`}>
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

      {/* Checklist Individual de Ítems */}
      <div className="space-y-2 border-t border-slate-100 pt-3">
        {order.items?.map((item: any, idx: number) => {
          const isChecked = Boolean(checkedItems[idx]);
          return (
            <button
              key={idx}
              type="button"
              onClick={() => toggleCheck(idx)}
              className={`w-full flex items-center justify-between text-left p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                isChecked
                  ? 'bg-emerald-100/60 border-emerald-300 text-emerald-950 line-through opacity-80'
                  : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">{isChecked ? '☑' : '☐'}</span>
                <span>{item.cantidad}x {item.nombreProducto || item.producto?.nombre}</span>
              </div>
              {isChecked && <span className="text-[9px] font-black uppercase text-emerald-700">Preparado</span>}
            </button>
          );
        })}
      </div>

      <button
        onClick={onAdvance}
        className={`w-full py-2.5 text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-1 shadow-sm hover:opacity-90 cursor-pointer transition-all ${
          allChecked ? 'bg-emerald-600 shadow-emerald-600/30' : btnColor
        }`}
      >
        {allChecked ? '✅ Toda la orden lista → LISTA' : nextLabel} <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
