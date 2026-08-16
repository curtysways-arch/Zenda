'use client';

import React, { useState, useEffect } from 'react';
import {
  Truck, Navigation, Clock, UserCheck, ShieldCheck, MapPin, Printer, RefreshCw,
  Search, CheckCircle2, ChevronRight, AlertCircle, Phone, ArrowLeft, Bike, ShoppingBag, Utensils, X, Building, QrCode, ClipboardList
} from 'lucide-react';

interface OrderItem {
  id: string;
  nombreProducto: string;
  precioUnitario: number;
  cantidad: number;
}

interface Order {
  id: string;
  numeroPedido: number;
  tipoEntrega: string;
  nombreCliente: string;
  telefonoCliente: string;
  direccionCliente?: string;
  referenciaCliente?: string;
  latitud?: number;
  longitud?: number;
  subtotal: number;
  costoEnvio: number;
  total: number;
  estado: string;
  createdAt: string;
  items: OrderItem[];
}

interface DispatchResource {
  resourceId: string;
  name: string;
  phone?: string;
  type: 'HUMAN' | 'VEHICLE' | 'COURIER' | 'EXTERNAL_PROVIDER' | 'AUTOMATED';
  status: 'DISPONIBLE' | 'OCUPADO' | 'EN_RUTA' | 'DESCONECTADO';
}

interface DispatchTask {
  taskId: string;
  orderId: string;
  channel: string;
  status: string;
  dispatchResourceId?: string;
  assignedResource?: DispatchResource;
}

export default function AdminDespachoPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tasks, setTasks] = useState<DispatchTask[]>([]);
  const [resources, setResources] = useState<DispatchResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterChannel, setFilterChannel] = useState<'ALL' | 'DELIVERY' | 'TABLE' | 'PICKUP'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modales
  const [selectedOrderForAssign, setSelectedOrderForAssign] = useState<Order | null>(null);
  const [selectedOrderForMap, setSelectedOrderForMap] = useState<Order | null>(null);
  const [selectedOrderForPrint, setSelectedOrderForPrint] = useState<Order | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDespachoData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/despacho');
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        setTasks(data.dispatchTasks || []);
        setResources(data.resources || []);
      }
    } catch (err) {
      console.error('Error cargando datos de despacho:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDespachoData();
    const interval = setInterval(fetchDespachoData, 15000);
    return () => clearInterval(interval);
  }, []);

  // Filtrado de pedidos
  const filteredOrders = orders.filter(order => {
    const t = (order.tipoEntrega || '').toUpperCase();
    const ref = (order.referenciaCliente || '').toLowerCase();
    const isTable = t === 'MESA' || t === 'TABLE' || t === 'TABLE_ORDER' || ref.includes('mesa');
    const isDelivery = t === 'DOMICILIO' || t === 'DELIVERY' || t === 'DELIVERY_ORDER';
    const isPickup = t === 'RETIRO' || t === 'PICKUP' || t === 'PICKUP_ORDER' || (!isTable && !isDelivery);

    if (filterChannel === 'DELIVERY' && !isDelivery) return false;
    if (filterChannel === 'TABLE' && !isTable) return false;
    if (filterChannel === 'PICKUP' && !isPickup) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = order.nombreCliente.toLowerCase().includes(q);
      const matchNum = String(order.numeroPedido).includes(q);
      const matchPhone = (order.telefonoCliente || '').includes(q);
      if (!matchName && !matchNum && !matchPhone) return false;
    }
    return true;
  });

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'LISTO':
      case 'LISTA':
        return <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[10px] font-black rounded-lg uppercase tracking-wider">Listo para Despacho</span>;
      case 'REPARTIDOR_ASIGNADO':
        return <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 text-[10px] font-black rounded-lg uppercase tracking-wider">Recurso Asignado</span>;
      case 'EN_CAMINO':
      case 'EN_RUTA':
        return <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-[10px] font-black rounded-lg uppercase tracking-wider flex items-center gap-1"><Truck className="size-3 animate-pulse" /> En Ruta</span>;
      case 'ENTREGADO':
      case 'ENTREGADO_MESA':
      case 'RETIRADO':
        return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-lg uppercase tracking-wider">Entregado</span>;
      default:
        return <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-[10px] font-black rounded-lg uppercase tracking-wider">{estado}</span>;
    }
  };

  const handleAssignResource = async (resourceId: string) => {
    if (!selectedOrderForAssign) return;
    try {
      setActionLoading(true);
      const task = tasks.find(t => t.orderId === selectedOrderForAssign.id);
      const res = await fetch('/api/admin/despacho', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ASSIGN_RESOURCE',
          orderId: selectedOrderForAssign.id,
          taskId: task?.taskId,
          resourceId
        })
      });
      if (res.ok) {
        setSelectedOrderForAssign(null);
        await fetchDespachoData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartRoute = async (orderId: string) => {
    try {
      setActionLoading(true);
      const task = tasks.find(t => t.orderId === orderId);
      await fetch('/api/admin/despacho', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'START_DISPATCH',
          orderId,
          taskId: task?.taskId
        })
      });
      await fetchDespachoData();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteDelivery = async (orderId: string) => {
    try {
      setActionLoading(true);
      const task = tasks.find(t => t.orderId === orderId);
      await fetch('/api/admin/despacho', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'COMPLETE_DISPATCH',
          orderId,
          taskId: task?.taskId
        })
      });
      await fetchDespachoData();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 space-y-6 text-left">
      {/* Header Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-2xl">
            <ClipboardList className="size-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Órdenes del Día & Historial General</h1>
              <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-md uppercase">Listado Oficial</span>
            </div>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Listado completo de todas las órdenes creadas en el día (Mesa, Para Llevar, Delivery) con sus estados y detalles.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDespachoData}
            disabled={loading}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer disabled:opacity-50"
            title="Recargar Despacho"
          >
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Bar de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-1.5 w-full sm:w-auto bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setFilterChannel('ALL')}
            className={`px-3.5 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${filterChannel === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:bg-slate-200'}`}
          >
            Todos ({orders.length})
          </button>
          <button
            onClick={() => setFilterChannel('DELIVERY')}
            className={`px-3.5 py-1.5 text-xs font-black rounded-lg transition-all flex items-center gap-1 cursor-pointer ${filterChannel === 'DELIVERY' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:bg-slate-200'}`}
          >
            <Bike className="size-3.5 text-indigo-600" /> Delivery
          </button>
          <button
            onClick={() => setFilterChannel('TABLE')}
            className={`px-3.5 py-1.5 text-xs font-black rounded-lg transition-all flex items-center gap-1 cursor-pointer ${filterChannel === 'TABLE' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:bg-slate-200'}`}
          >
            <Utensils className="size-3.5 text-orange-600" /> En Mesa
          </button>
          <button
            onClick={() => setFilterChannel('PICKUP')}
            className={`px-3.5 py-1.5 text-xs font-black rounded-lg transition-all flex items-center gap-1 cursor-pointer ${filterChannel === 'PICKUP' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:bg-slate-200'}`}
          >
            <ShoppingBag className="size-3.5 text-emerald-600" /> Para Llevar
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="size-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por cliente o # pedido..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-slate-900"
          />
        </div>
      </div>

      {/* Grilla de Pedidos para Despacho */}
      {loading && orders.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200/80 text-center text-slate-400">
          <RefreshCw className="size-8 animate-spin mx-auto mb-3 text-slate-300" />
          <p className="text-xs font-bold">Cargando tablero de despacho...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200/80 text-center space-y-2">
          <CheckCircle2 className="size-10 text-emerald-500 mx-auto" />
          <h3 className="text-sm font-black text-slate-800">¡Al día! No hay despachos pendientes</h3>
          <p className="text-xs text-slate-400">Todos los pedidos han sido asignados o entregados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map(order => {
            const task = tasks.find(t => t.orderId === order.id);
            const assignedResource = task?.assignedResource;

            return (
              <div key={order.id} className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-2xs hover:shadow-md transition-shadow space-y-4">
                {/* Header Card */}
                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Pedido #{order.numeroPedido}</span>
                    <span className="text-sm font-black text-slate-900">{order.nombreCliente}</span>
                    <span className="text-xs text-slate-500 font-semibold block">{order.telefonoCliente}</span>
                  </div>
                  <div>
                    {getStatusBadge(order.estado)}
                  </div>
                </div>

                {/* Info de Entrega & Dirección */}
                <div className="space-y-2 text-xs font-semibold text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-bold text-slate-400 uppercase">Modo:</span>
                    <span className="font-black text-slate-900">{order.tipoEntrega}</span>
                  </div>

                  {order.direccionCliente && (
                    <div className="flex gap-2 items-start text-xs pt-1 border-t border-slate-200/60">
                      <MapPin className="size-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2 font-bold text-slate-800">{order.direccionCliente}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-1 border-t border-slate-200/60 text-xs">
                    <span className="font-bold text-slate-500">Total a Cobrar:</span>
                    <span className="font-black text-emerald-600 text-sm">${(Number(order.total) || 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* Recurso Logístico Asignado */}
                {assignedResource ? (
                  <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <UserCheck className="size-4 text-indigo-600" />
                      <div>
                        <span className="font-black text-indigo-950 block">{assignedResource.name}</span>
                        <span className="text-[10px] font-bold text-indigo-700 uppercase">{assignedResource.type}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedOrderForAssign(order)}
                      className="text-[10px] font-black text-indigo-700 hover:underline uppercase"
                    >
                      Cambiar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedOrderForAssign(order)}
                    className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <UserCheck className="size-4" /> Asignar Recurso / Repartidor
                  </button>
                )}

                {/* Botones de Acción de Despacho */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setSelectedOrderForPrint(order)}
                    className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Printer className="size-3.5" /> Guía
                  </button>

                  {order.latitud && order.longitud && (
                    <button
                      onClick={() => setSelectedOrderForMap(order)}
                      className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Navigation className="size-3.5 text-indigo-600" /> GPS
                    </button>
                  )}

                  {order.estado === 'REPARTIDOR_ASIGNADO' && (
                    <button
                      onClick={() => handleStartRoute(order.id)}
                      disabled={actionLoading}
                      className="col-span-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs active:scale-95"
                    >
                      Marcar Salida (En Ruta)
                    </button>
                  )}

                  {(order.estado === 'EN_CAMINO' || order.estado === 'EN_RUTA' || order.estado === 'REPARTIDOR_ASIGNADO' || order.estado === 'LISTO' || order.estado === 'LISTA') && (
                    <button
                      onClick={() => handleCompleteDelivery(order.id)}
                      disabled={actionLoading}
                      className="col-span-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs active:scale-95"
                    >
                      Confirmar Entrega Completada
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Asignar Recurso Logístico */}
      {selectedOrderForAssign && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">Asignar Recurso Logístico</h3>
                <p className="text-xs text-slate-500 font-semibold">Pedido #{selectedOrderForAssign.numeroPedido} - {selectedOrderForAssign.nombreCliente}</p>
              </div>
              <button onClick={() => setSelectedOrderForAssign(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Recursos Disponibles</label>
              {resources.map(res => (
                <button
                  key={res.resourceId}
                  onClick={() => handleAssignResource(res.resourceId)}
                  disabled={actionLoading}
                  className="w-full p-3 bg-slate-50 hover:bg-indigo-50/70 border border-slate-200 hover:border-indigo-300 rounded-2xl flex items-center justify-between transition-all cursor-pointer group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-xl border border-slate-200 group-hover:border-indigo-300 text-indigo-600">
                      <Truck className="size-4" />
                    </div>
                    <div>
                      <span className="font-black text-xs text-slate-900 block group-hover:text-indigo-950">{res.name}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{res.type} • {res.phone || 'Sin teléfono'}</span>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>

            <button
              onClick={() => setSelectedOrderForAssign(null)}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black transition-all cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* MODAL: Guía de Despacho Impresora */}
      {selectedOrderForPrint && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-5 shadow-2xl animate-in zoom-in-95 duration-200 font-mono text-xs">
            <div className="text-center space-y-1 border-b border-dashed border-slate-300 pb-4">
              <h2 className="text-base font-black text-slate-900 uppercase">GUÍA DE DESPACHO</h2>
              <p className="text-[10px] text-slate-500 font-bold">CITIOX ENTERPRISE LOGISTICS</p>
              <p className="text-xs font-black text-slate-800">PEDIDO #{selectedOrderForPrint.numeroPedido}</p>
            </div>

            <div className="space-y-2 border-b border-dashed border-slate-300 pb-4">
              <p><strong className="uppercase">Cliente:</strong> {selectedOrderForPrint.nombreCliente}</p>
              <p><strong className="uppercase">Teléfono:</strong> {selectedOrderForPrint.telefonoCliente}</p>
              {selectedOrderForPrint.direccionCliente && (
                <p><strong className="uppercase">Dirección:</strong> {selectedOrderForPrint.direccionCliente}</p>
              )}
              <p><strong className="uppercase">Modo:</strong> {selectedOrderForPrint.tipoEntrega}</p>
            </div>

            <div className="space-y-1 border-b border-dashed border-slate-300 pb-4">
              <p className="font-bold border-b border-slate-200 pb-1">ITEMS:</p>
              {selectedOrderForPrint.items.map(item => (
                <div key={item.id} className="flex justify-between">
                  <span>{item.cantidad}x {item.nombreProducto}</span>
                  <span>${((Number(item.precioUnitario) || 0) * item.cantidad).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between font-black text-sm pt-1">
              <span>TOTAL A COBRAR:</span>
              <span>${(Number(selectedOrderForPrint.total) || 0).toFixed(2)}</span>
            </div>

            <div className="pt-2 flex gap-2 font-sans">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="size-4" /> Imprimir
              </button>
              <button
                onClick={() => setSelectedOrderForPrint(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Visualizador GPS */}
      {selectedOrderForMap && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">Coordenadas GPS de Entrega</h3>
                <p className="text-xs text-slate-500 font-semibold">Cliente: {selectedOrderForMap.nombreCliente}</p>
              </div>
              <button onClick={() => setSelectedOrderForMap(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="size-5" />
              </button>
            </div>

            <div className="bg-slate-100 p-4 rounded-2xl space-y-2 text-xs font-mono border border-slate-200">
              <p><strong>Latitud:</strong> {selectedOrderForMap.latitud}</p>
              <p><strong>Longitud:</strong> {selectedOrderForMap.longitud}</p>
              <p><strong>Dirección:</strong> {selectedOrderForMap.direccionCliente || 'Sin especificación'}</p>
            </div>

            <a
              href={`https://www.google.com/maps/search/?api=1&query=${selectedOrderForMap.latitud},${selectedOrderForMap.longitud}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-600/20"
            >
              <Navigation className="size-4" /> Abrir Ruta GPS en Google Maps
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
