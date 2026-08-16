'use client';
// src/app/admin/cocina/page.tsx
// Módulo Kitchen Display System (KDS) dentro del Business Admin Citiox para capability: kitchen

import { useState, useEffect } from 'react';
import { Utensils, Clock, CheckCircle2, ChevronRight, Loader2, RefreshCw, ChefHat, Bike, ShoppingBag, MapPin } from 'lucide-react';

interface KDSOrder {
  id: string;
  numeroPedido: number;
  codigo?: string;
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
      const interval = setInterval(fetchKDS, 5000); // Polling 5s
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

  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-[500px]">
      <Loader2 className="animate-spin text-slate-400 size-8" />
    </div>
  );

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header Comandas KDS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <ChefHat className="text-amber-500 size-8" />
              Pantalla de Cocina (KDS Comandas)
            </h1>
            <span className="bg-amber-100 text-amber-900 border border-amber-300 text-xs font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
              <span className="size-2 rounded-full bg-amber-600 animate-pulse" />
              Comandas Activas en Cocina ({orders.length})
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Visualización optimizada de comandas activas para chefs. Marca los platos como listos para despachar al repartidor o barra.
          </p>
        </div>

        <button
          onClick={fetchKDS}
          className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 shadow-md cursor-pointer transition-all active:scale-95"
        >
          <RefreshCw className="size-4" /> Recargar Comandas
        </button>
      </div>

      {/* Grid Optimizado Multicolumna Exclusivo de Pedidos en Preparación */}
      {orders.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center text-slate-400 space-y-3 shadow-sm">
          <ChefHat className="size-16 mx-auto text-slate-300" />
          <h3 className="font-extrabold text-base text-slate-700">Sin comandas activas en cocina</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Los pedidos aceptados desde el panel de Pedidos Online aparecerán aquí automáticamente para ser preparados.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {orders.map(order => (
            <KDSCard key={order.id} order={order} onAdvance={() => advanceOrder(order.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function KDSCard({ order, onAdvance }: { order: KDSOrder; onAdvance: () => void }) {
  const minsAgo = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60));
  const isUrgent = minsAgo > 12;
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  const toggleCheck = (idx: number) => {
    setCheckedItems(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const totalItemsCount = order.items?.length || 0;
  const checkedCount = Object.values(checkedItems).filter(Boolean).length;
  const allChecked = totalItemsCount > 0 && checkedCount === totalItemsCount;
  const isDelivery = ['DELIVERY_ORDER', 'DOMICILIO', 'DELIVERY'].includes((order.tipoEntrega || '').toUpperCase());
  
  // Extraer información de Mesa y Recomendaciones para Cocina
  const extra = (order.extraInfo as any) || {};
  const rawTable = extra.mesaCode || extra.tableName || (order as any).referenciaCliente || (order as any).referencia || '';
  const mesaLabel = rawTable ? (rawTable.toLowerCase().includes('mesa') ? rawTable : `Mesa ${rawTable}`) : null;
  const isTableOrder = Boolean(mesaLabel) || ['TABLE_ORDER', 'MESA', 'TABLE'].includes((order.tipoEntrega || '').toUpperCase());
  const kitchenNotes = extra.kitchenNotes || (order as any).notas || (order as any).observaciones || null;

  return (
    <div className={`bg-white border-2 rounded-3xl p-4 shadow-sm space-y-3.5 flex flex-col justify-between transition-all ${
      isUrgent ? 'border-rose-500 bg-rose-50/10' : allChecked ? 'border-emerald-500 bg-emerald-50/20' : 'border-slate-200'
    }`}>
      {/* Header Comanda */}
      <div className="space-y-2 border-b border-slate-100 pb-3">
        <div className="flex items-center justify-between">
          <span className="font-black text-xl text-slate-900 tracking-tight">
            #{order.codigo || order.numeroPedido || order.id.slice(-6).toUpperCase()}
          </span>
          <span className={`text-xs font-black px-2.5 py-1 rounded-xl flex items-center gap-1.5 ${
            isUrgent ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-100 text-slate-700'
          }`}>
            <Clock className="size-3.5" /> {minsAgo} min
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {isTableOrder ? (
            /* BADGE DESTACADO DE MESA (SIN MOSTRAR RETIRO) */
            <span className="bg-amber-100 text-amber-950 border border-amber-300 text-[11px] font-black px-2.5 py-0.5 rounded-lg flex items-center gap-1 shadow-2xs">
              🍽️ {mesaLabel || 'En Mesa'}
            </span>
          ) : isDelivery ? (
            <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-lg flex items-center gap-1">
              <Bike className="size-3" /> Delivery
            </span>
          ) : (
            <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-lg flex items-center gap-1">
              <ShoppingBag className="size-3" /> Para Llevar
            </span>
          )}
        </div>

        {/* BLOQUE DE RECOMENDACIÓN / NOTAS PARA COCINA */}
        {kitchenNotes && (
          <div className="mt-2 bg-amber-50 border-2 border-amber-300/90 rounded-2xl p-2.5 space-y-1 text-left">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 flex items-center gap-1">
              <ChefHat className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
              📝 RECOMENDACIÓN PARA COCINA:
            </span>
            <p className="text-xs font-black text-amber-950 bg-white/90 p-2 rounded-xl border border-amber-200 leading-snug">
              "{kitchenNotes}"
            </p>
          </div>
        )}
      </div>

      {/* Checklist de Productos de la Comanda */}
      <div className="space-y-2 flex-1">
        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
          Platos a Preparar ({checkedCount}/{totalItemsCount}):
        </span>
        {order.items?.map((item: any, idx: number) => {
          const isChecked = Boolean(checkedItems[idx]);
          return (
            <button
              key={idx}
              type="button"
              onClick={() => toggleCheck(idx)}
              className={`w-full flex items-center justify-between text-left p-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                isChecked
                  ? 'bg-emerald-100/70 border-emerald-300 text-emerald-950 line-through opacity-80'
                  : 'bg-slate-50 border-slate-200 text-slate-900 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`text-base font-bold ${isChecked ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {isChecked ? '☑' : '☐'}
                </span>
                <span><strong className="text-amber-600 text-sm">{item.cantidad}x</strong> {item.nombreProducto || item.producto?.nombre}</span>
              </div>
              {isChecked && <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-200/60 px-1.5 py-0.5 rounded">Listo</span>}
            </button>
          );
        })}
      </div>

      {/* Botón de Acción Principal */}
      <button
        onClick={onAdvance}
        className={`w-full py-3 text-white text-xs font-black uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all active:scale-95 ${
          allChecked 
            ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30' 
            : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
        }`}
      >
        <CheckCircle2 className="size-4" />
        <span>MARCAR LISTO Y DESPACHAR</span>
      </button>
    </div>
  );
}
