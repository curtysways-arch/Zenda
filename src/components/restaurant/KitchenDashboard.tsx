"use client";

import React, { useState, useEffect } from 'react';
import { ChefHat, Clock, CheckCircle2, Flame, ArrowRight, Printer, RefreshCw, AlertCircle, Utensils } from 'lucide-react';

interface KitchenDashboardProps {
  negocioIdOrSlug: string;
  slug?: string;
}

export default function KitchenDashboard({ negocioIdOrSlug, slug }: KitchenDashboardProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterKitchen, setFilterKitchen] = useState<string>('TODAS');
  const targetSlug = slug || negocioIdOrSlug;

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/public/${targetSlug}/orders`);
      const data = await res.json();
      if (data.orders) {
        setOrders(data.orders);
      }
    } catch (err) {
      console.error("Error al cargar comandas de cocina:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000); // Polling automático cada 10s
    return () => clearInterval(interval);
  }, [targetSlug]);

  const updateOrderStatus = async (orderId: string, nextStatus: string) => {
    try {
      const res = await fetch(`/api/public/${targetSlug}/orders`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, estado: nextStatus })
      });
      if (res.ok) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, estado: nextStatus } : o));
      }
    } catch (err) {
      console.error("Error actualizando estado de comanda:", err);
    }
  };

  // Filtrar comandas por columna de estado KDS
  const getOrdersByColumn = (statusKey: string) => {
    return orders.filter(o => {
      const st = (o.estado || 'NUEVA').toUpperCase();
      const extra = typeof o.extraInfo === 'string' ? JSON.parse(o.extraInfo || '{}') : (o.extraInfo || {});
      const kStatus = (extra.kitchenStatus || st).toUpperCase();

      if (statusKey === 'NUEVA') return ['NUEVA', 'BORRADOR', 'PENDIENTE_PAGO', 'PAGO_CONFIRMADO'].includes(kStatus);
      if (statusKey === 'PREPARANDO') return ['PREPARANDO', 'EN_COCINA', 'EN_PREPARACION'].includes(kStatus);
      if (statusKey === 'LISTA') return ['LISTA', 'LISTO'].includes(kStatus);
      if (statusKey === 'ENTREGADA') return ['ENTREGADA', 'ENTREGADO', 'FINALIZADA', 'PAGADA'].includes(kStatus);
      return false;
    });
  };

  const columns = [
    { id: 'NUEVA', title: 'Nueva Comanda', color: 'border-amber-500/50 bg-amber-500/5 text-amber-400', nextStatus: 'EN_COCINA', btnText: 'Aceptar & Cocinar' },
    { id: 'PREPARANDO', title: 'En Preparación', color: 'border-blue-500/50 bg-blue-500/5 text-blue-400', nextStatus: 'LISTA', btnText: 'Marcar Listo' },
    { id: 'LISTA', title: 'Lista para Servir', color: 'border-emerald-500/50 bg-emerald-500/5 text-emerald-400', nextStatus: 'ENTREGADA', btnText: 'Entregar' },
    { id: 'ENTREGADA', title: 'Entregada', color: 'border-slate-700 bg-slate-800/20 text-slate-400', nextStatus: 'FINALIZADA', btnText: 'Archivar' }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 font-sans">
      {/* Header KDS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-600/20 text-amber-400 rounded-2xl border border-amber-500/30">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight italic flex items-center gap-2">
              Kitchen Display System (KDS)
            </h1>
            <p className="text-xs text-slate-400">Tablero interactivo de comandas en tiempo real</p>
          </div>
        </div>

        {/* Filtro Multicocina & Acciones */}
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setFilterKitchen('TODAS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterKitchen === 'TODAS' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
            >
              Todas las Cocinas
            </button>
            <button
              onClick={() => setFilterKitchen('BAR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterKitchen === 'BAR' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
            >
              Bar & Bebidas
            </button>
            <button
              onClick={() => setFilterKitchen('PARRILLA')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterKitchen === 'PARRILLA' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
            >
              Cocina Caliente
            </button>
          </div>

          <button
            onClick={fetchOrders}
            className="p-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-300 hover:text-white transition-all"
            title="Refrescar Comandas"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tablero KDS (4 Columnas) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map(col => {
          const colOrders = getOrdersByColumn(col.id);
          return (
            <div key={col.id} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col h-[calc(100vh-140px)]">
              {/* Header Columna */}
              <div className={`px-3 py-2 rounded-xl border ${col.color} flex items-center justify-between mb-4 font-bold text-xs`}>
                <span>{col.title}</span>
                <span className="w-5 h-5 rounded-full bg-slate-900/80 flex items-center justify-center text-[10px]">
                  {colOrders.length}
                </span>
              </div>

              {/* Lista de Comandas */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                {colOrders.length === 0 ? (
                  <div className="text-center py-12 text-slate-600 text-xs font-medium">
                    Sin comandas
                  </div>
                ) : (
                  colOrders.map(order => {
                    const extra = typeof order.extraInfo === 'string' ? JSON.parse(order.extraInfo || '{}') : (order.extraInfo || {});
                    const channel = extra.channel || 'TABLE';
                    const tableCode = extra.tableCode || order.referenciaCliente || 'S/N';
                    const elapsedTime = Math.round((Date.now() - new Date(order.createdAt).getTime()) / 60000);

                    return (
                      <div key={order.id} className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 rounded-xl space-y-3 shadow-lg transition-all">
                        {/* Cabecera Ticket */}
                        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-amber-400 text-sm">#{order.numeroPedido}</span>
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                              {channel === 'TABLE' ? `Mesa: ${tableCode}` : channel}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                            <Clock className="w-3 h-3 text-amber-500" />
                            <span>{elapsedTime} min</span>
                          </div>
                        </div>

                        {/* Cliente */}
                        <div className="text-xs text-slate-300 font-medium">
                          {order.nombreCliente || 'Cliente'}
                        </div>

                        {/* Items de la Comanda */}
                        <div className="space-y-1.5 py-1">
                          {order.items?.map((item: any) => (
                            <div key={item.id} className="flex items-start justify-between text-xs">
                              <div className="flex items-start gap-2">
                                <span className="font-black text-white bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">
                                  {item.cantidad}x
                                </span>
                                <span className="text-slate-200 leading-tight">{item.nombreProducto}</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Acciones de 1-Clic */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 gap-2">
                          <button
                            onClick={() => window.print()}
                            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-all"
                            title="Imprimir comanda (Opcional)"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {col.nextStatus && (
                            <button
                              onClick={() => updateOrderStatus(order.id, col.nextStatus)}
                              className="flex-1 py-2 px-3 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md"
                            >
                              <span>{col.btnText}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
