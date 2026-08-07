'use client';
// src/app/admin/pedidos-online/page.tsx
// Módulo de Pedidos Online (Citiox Studio)
// Gestiona únicamente pedidos entrantes del Landing Web (Delivery & Pickup).
// Excluye explícitamente órdenes de POS Mostrador y Mesas.

import { useState, useEffect } from 'react';
import { 
  Globe, PackageCheck, Bike, ShoppingBag, Check, X, Clock, MapPin, Phone,
  User, Loader2, AlertCircle, RefreshCw, ChevronRight, DollarSign, Filter
} from 'lucide-react';

interface Pedido {
  id: string;
  codigo?: string;
  nombreCliente: string;
  telefonoCliente: string;
  direccionCliente?: string;
  referenciaCliente?: string;
  tipoEntrega: 'DELIVERY_ORDER' | 'PICKUP_ORDER' | 'TABLE_ORDER';
  estado: string;
  metodoPago?: string;
  paymentStatus?: string;
  total: number;
  subtotal: number;
  costoEnvio?: number;
  createdAt: string;
  items: Array<{
    id: string;
    nombreProducto: string;
    cantidad: number;
    precioUnitario: number;
  }>;
  payment?: any;
}

export default function PedidosOnlinePage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterState, setFilterState] = useState<'PENDING' | 'ACCEPTED' | 'ALL'>('PENDING');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchOnlineOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/pedidos');
      if (res.ok) {
        const data = await res.json();
        // Filtrar únicamente pedidos online (excluir mesas y POS explícito)
        const onlineOnly = (Array.isArray(data) ? data : []).filter((p: Pedido) => {
          const isTable = p.tipoEntrega === 'TABLE_ORDER' || (p as any).mesaCode?.startsWith('Mesa');
          const isPos = (p as any).mesaCode === 'POS' || (p as any).mesaCode === 'POS-Virtual';
          return !isTable && !isPos;
        });
        setPedidos(onlineOnly);
      }
    } catch (e) {
      console.error('Error fetching online orders:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOnlineOrders();
    const interval = setInterval(fetchOnlineOrders, 15000); // Polling cada 15s
    return () => clearInterval(interval);
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setProcessingId(id);
    try {
      const res = await fetch('/api/admin/pedidos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, estado: newStatus })
      });
      if (res.ok) {
        setPedidos(prev => prev.map(p => p.id === id ? { ...p, estado: newStatus } : p));
      } else {
        alert('Error al actualizar estado del pedido');
      }
    } catch (e) {
      console.error(e);
      alert('Error de conexión');
    } finally {
      setProcessingId(null);
    }
  };

  const pendingOrders = pedidos.filter(p => p.estado === 'PENDIENTE' || p.estado === 'PENDING');
  const acceptedOrders = pedidos.filter(p => p.estado === 'EN_PREPARACION' || p.estado === 'ACEPTADO');
  
  const displayedOrders = pedidos.filter(p => {
    if (filterState === 'PENDING') return p.estado === 'PENDIENTE' || p.estado === 'PENDING';
    if (filterState === 'ACCEPTED') return p.estado === 'EN_PREPARACION' || p.estado === 'ACEPTADO';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-orange-100 text-[#ea580c] flex items-center justify-center font-black">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Pedidos Online (Landing Web)</h1>
              <p className="text-xs text-slate-500 font-semibold">Solicitudes entrantes a domicilio y retiro por local</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchOnlineOrders}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs flex items-center gap-1.5 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Tabs Filter */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setFilterState('PENDING')}
          className={`px-4 py-2 rounded-xl font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
            filterState === 'PENDING'
              ? 'bg-[#ea580c] text-white shadow-md shadow-[#ea580c]/20'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Clock className="w-4 h-4" />
          Pendientes por Aceptar
          {pendingOrders.length > 0 && (
            <span className="bg-white text-[#ea580c] px-2 py-0.5 rounded-full text-[10px] font-black">
              {pendingOrders.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setFilterState('ACCEPTED')}
          className={`px-4 py-2 rounded-xl font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
            filterState === 'ACCEPTED'
              ? 'bg-[#ea580c] text-white shadow-md shadow-[#ea580c]/20'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <PackageCheck className="w-4 h-4" />
          Aceptados en Cocina ({acceptedOrders.length})
        </button>

        <button
          onClick={() => setFilterState('ALL')}
          className={`px-4 py-2 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer ${
            filterState === 'ALL'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Todos ({pedidos.length})
        </button>
      </div>

      {/* Orders List / Grid */}
      {loading && pedidos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-8 h-8 text-[#ea580c] animate-spin mb-2" />
          <p className="text-xs font-extrabold uppercase text-slate-400">Cargando pedidos online...</p>
        </div>
      ) : displayedOrders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <Globe className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <h3 className="font-extrabold text-sm text-slate-700">No hay pedidos online en esta categoría</h3>
          <p className="text-xs text-slate-400 font-semibold mt-1">Los nuevos pedidos realizados por los clientes en la tienda online aparecerán aquí.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayedOrders.map(pedido => {
            const isDelivery = pedido.tipoEntrega === 'DELIVERY_ORDER';
            const isPending = pedido.estado === 'PENDIENTE' || pedido.estado === 'PENDING';
            const isPaid = pedido.paymentStatus === 'PAGADO' || pedido.payment?.status === 'PAID';

            return (
              <div
                key={pedido.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between p-4 space-y-4 hover:border-slate-300 transition-all"
              >
                {/* Header Card */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-slate-900">
                        #{pedido.codigo || pedido.id.slice(-6).toUpperCase()}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase flex items-center gap-1 ${
                        isDelivery ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}>
                        {isDelivery ? <Bike className="w-3 h-3" /> : <ShoppingBag className="w-3 h-3" />}
                        {isDelivery ? 'Delivery' : 'Pickup'}
                      </span>
                    </div>
                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                      {new Date(pedido.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                    isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {isPaid ? '💵 Pagado Online' : '⏳ Pendiente Caja'}
                  </span>
                </div>

                {/* Info Cliente */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-slate-900 font-bold">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{pedido.nombreCliente}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 font-semibold">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{pedido.telefonoCliente}</span>
                  </div>
                  {isDelivery && pedido.direccionCliente && (
                    <div className="flex items-start gap-2 text-slate-600 text-[11px] font-medium">
                      <MapPin className="w-3.5 h-3.5 text-[#ea580c] shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{pedido.direccionCliente}</span>
                    </div>
                  )}
                </div>

                {/* Items List */}
                <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 space-y-1 text-xs">
                  <p className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Detalle del Pedido</p>
                  {pedido.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[11px] font-semibold text-slate-700">
                      <span><strong className="text-slate-900">{item.cantidad}x</strong> {item.nombreProducto}</span>
                      <span>${(item.precioUnitario * item.cantidad).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="pt-1.5 mt-1.5 border-t border-slate-200 flex justify-between items-center font-black text-xs text-slate-900">
                    <span>Total Pedido:</span>
                    <span className="text-[#ea580c] text-sm">${(Number(pedido.total) || 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                  {isPending ? (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(pedido.id, 'EN_PREPARACION')}
                        disabled={processingId === pedido.id}
                        className="flex-1 py-2 rounded-xl font-black text-xs uppercase bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                      >
                        {processingId === pedido.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-4 h-4" />}
                        Aceptar y Enviar a Cocina
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(pedido.id, 'CANCELADO')}
                        disabled={processingId === pedido.id}
                        className="p-2 rounded-xl font-bold text-xs bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 cursor-pointer transition-all disabled:opacity-50"
                        title="Rechazar pedido"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <div className="w-full py-1.5 rounded-xl bg-slate-100 text-slate-600 font-extrabold text-[11px] uppercase tracking-wider text-center flex items-center justify-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> Estado: {pedido.estado}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
