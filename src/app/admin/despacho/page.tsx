'use client';

import React, { useState, useEffect } from 'react';
import {
  Truck, Navigation, Clock, MapPin, Printer, RefreshCw,
  Search, CheckCircle2, ChevronRight, Phone, Bike, ShoppingBag, Utensils, X, ClipboardList, DollarSign, CreditCard
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
  extraInfo?: any;
  payment?: any;
}

export default function AdminDespachoPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipoNegocio, setTipoNegocio] = useState<string>('');
  const [filterChannel, setFilterChannel] = useState<'ALL' | 'DELIVERY' | 'TABLE' | 'PICKUP'>('ALL');

  useEffect(() => {
    fetch('/api/negocio')
      .then(res => res.json())
      .then(data => {
        if (data?.tipoNegocio) setTipoNegocio((data.tipoNegocio || '').toUpperCase());
      })
      .catch(() => {});
  }, []);

  const isStore = tipoNegocio === 'TIENDA' || tipoNegocio === 'STORE' || tipoNegocio === 'PRODUCTOS' || tipoNegocio === 'E-COMMERCE';
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState<'today' | 'yesterday' | 'all' | 'custom'>('today');
  const [customDate, setCustomDate] = useState<string>('');
  const [selectedOrderForMap, setSelectedOrderForMap] = useState<Order | null>(null);
  const [selectedOrderForPrint, setSelectedOrderForPrint] = useState<Order | null>(null);
  const [selectedOrderForPayModal, setSelectedOrderForPayModal] = useState<Order | null>(null);
  const [payMethod, setPayMethod] = useState<'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'MIXTO' | 'OTRO'>('EFECTIVO');
  const [payMontoRecibido, setPayMontoRecibido] = useState<string>('');

  const fetchDespachoData = async () => {
    try {
      setLoading(true);
      const dParam = filterDate === 'custom' ? (customDate || 'today') : filterDate;
      const res = await fetch(`/api/admin/despacho?date=${dParam}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error('Error cargando datos de despacho:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPayModal = (order: Order) => {
    const computedTotal = order.items.reduce((sum, it) => sum + (Number(it.precioUnitario) || 0) * (Number(it.cantidad) || 1), 0);
    const displayTotal = computedTotal > 0 ? computedTotal : (Number(order.total) || 0);

    let extra: any = {};
    if (typeof order.extraInfo === 'string') {
      try { extra = JSON.parse(order.extraInfo); } catch {}
    } else if (order.extraInfo && typeof order.extraInfo === 'object') {
      extra = order.extraInfo;
    }

    const rawMontoRecibido = extra.montoRecibido ?? order.payment?.montoPagado ?? 0;
    const isInitialPaid = extra.paymentStatus === 'PAGADO' || order.payment?.estado === 'CONFIRMADO';

    const montoPagado = extra.montoPagadoAcumulado !== undefined 
      ? Number(extra.montoPagadoAcumulado) 
      : (isInitialPaid ? Math.min(Number(rawMontoRecibido) || displayTotal, displayTotal) : 0);

    const saldoPendiente = extra.saldoPendiente !== undefined 
      ? Number(extra.saldoPendiente) 
      : Math.max(0, Math.round((displayTotal - montoPagado) * 100) / 100);

    const amountToPay = montoPagado > 0 ? saldoPendiente : displayTotal;

    setSelectedOrderForPayModal(order);
    setPayMethod('EFECTIVO');
    setPayMontoRecibido(amountToPay.toFixed(2));
  };

  const handleConfirmPayment = async () => {
    if (!selectedOrderForPayModal) return;
    const order = selectedOrderForPayModal;
    const computedTotal = order.items.reduce((sum, it) => sum + (Number(it.precioUnitario) || 0) * (Number(it.cantidad) || 1), 0);
    const displayTotal = computedTotal > 0 ? computedTotal : (Number(order.total) || 0);

    let extra: any = {};
    if (typeof order.extraInfo === 'string') {
      try { extra = JSON.parse(order.extraInfo); } catch {}
    } else if (order.extraInfo && typeof order.extraInfo === 'object') {
      extra = order.extraInfo;
    }

    const rawMontoRecibido = extra.montoRecibido ?? order.payment?.montoPagado ?? 0;
    const isInitialPaid = extra.paymentStatus === 'PAGADO' || order.payment?.estado === 'CONFIRMADO';

    const montoPagado = extra.montoPagadoAcumulado !== undefined 
      ? Number(extra.montoPagadoAcumulado) 
      : (isInitialPaid ? Math.min(Number(rawMontoRecibido) || displayTotal, displayTotal) : 0);

    const saldoPendiente = extra.saldoPendiente !== undefined 
      ? Number(extra.saldoPendiente) 
      : Math.max(0, Math.round((displayTotal - montoPagado) * 100) / 100);

    const amountToPay = montoPagado > 0 ? saldoPendiente : displayTotal;
    const numRecibido = parseFloat(payMontoRecibido) || amountToPay;
    const numVuelto = Math.max(0, numRecibido - amountToPay);

    try {
      const res = await fetch('/api/admin/pedidos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: order.id,
          action: 'MARCAR_PAGADO',
          metodoPago: payMethod,
          montoRecibido: numRecibido,
          vuelto: numVuelto
        })
      });
      if (res.ok) {
        setSelectedOrderForPayModal(null);
        await fetchDespachoData();
      }
    } catch (err) {
      console.error('Error al registrar cobro:', err);
    }
  };

  const handleUpdateOrderState = async (orderId: string, newEstado: string) => {
    try {
      const res = await fetch('/api/admin/pedidos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: orderId,
          estado: newEstado
        })
      });
      if (res.ok) {
        await fetchDespachoData();
      }
    } catch (err) {
      console.error('Error actualizando estado del pedido:', err);
    }
  };

  useEffect(() => {
    fetchDespachoData();
    const interval = setInterval(fetchDespachoData, 15000);
    return () => clearInterval(interval);
  }, [filterDate, customDate]);

  const filteredOrders = orders.filter(order => {
    const t = (order.tipoEntrega || '').toUpperCase();
    const ref = (order.referenciaCliente || '').toLowerCase();
    const isTable    = t === 'MESA' || t === 'TABLE' || t === 'TABLE_ORDER' || ref.includes('mesa');
    const isDelivery = t === 'DOMICILIO' || t === 'DELIVERY' || t === 'DELIVERY_ORDER';
    const isPickup   = !isTable && !isDelivery;

    if (filterChannel === 'DELIVERY' && !isDelivery) return false;
    if (filterChannel === 'TABLE'    && !isTable)    return false;
    if (filterChannel === 'PICKUP'   && !isPickup)   return false;

    // Filtro por fecha estricto en el cliente (Garantiza exactitud de vista)
    const oDate = new Date(order.createdAt);
    const ordDateStr = `${oDate.getFullYear()}-${String(oDate.getMonth() + 1).padStart(2, '0')}-${String(oDate.getDate()).padStart(2, '0')}`;
    
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    const yesterdayStr = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, '0')}-${String(yest.getDate()).padStart(2, '0')}`;

    if (filterDate === 'yesterday') {
      if (ordDateStr !== yesterdayStr) return false;
    } else if (filterDate === 'today') {
      const isActive = ['PENDIENTE', 'EN_PREPARACION', 'PREPARADO', 'EN_CAMINO', 'EN_MESA', 'POR_COBRAR'].includes(order.estado);
      if (ordDateStr !== todayStr && !isActive) return false;
    } else if (filterDate === 'custom' && customDate) {
      if (ordDateStr !== customDate) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        order.nombreCliente.toLowerCase().includes(q) ||
        String(order.numeroPedido).includes(q) ||
        (order.telefonoCliente || '').includes(q)
      );
    }
    return true;
  });

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'EN_PREPARACION':
      case 'PREPARANDO':
        return <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black rounded-lg uppercase tracking-wider whitespace-nowrap">En Preparación</span>;
      case 'RECIBIDO':
      case 'PENDIENTE':
      case 'WAITING_CONFIRMATION':
        return <span className="px-2 py-0.5 bg-blue-100 text-blue-900 border border-blue-300 text-[10px] font-black rounded-lg uppercase tracking-wider whitespace-nowrap">Recibido</span>;
      case 'LISTO':
      case 'LISTA':
        return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black rounded-lg uppercase tracking-wider whitespace-nowrap">Listo</span>;
      case 'REPARTIDOR_ASIGNADO':
        return <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 border border-indigo-200 text-[10px] font-black rounded-lg uppercase tracking-wider whitespace-nowrap">Asignado</span>;
      case 'EN_CAMINO':
      case 'EN_RUTA':
        return <span className="px-2 py-0.5 bg-sky-100 text-sky-800 border border-sky-200 text-[10px] font-black rounded-lg uppercase tracking-wider whitespace-nowrap flex items-center gap-1"><Truck className="size-2.5 animate-pulse" />En Ruta</span>;
      case 'ENTREGADO':
      case 'ENTREGADO_MESA':
      case 'RETIRADO':
        return <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-black rounded-lg uppercase tracking-wider whitespace-nowrap">Entregado</span>;
      default:
        return <span className="px-2 py-0.5 bg-slate-50 text-slate-600 border border-slate-200 text-[10px] font-semibold rounded-lg uppercase tracking-wider whitespace-nowrap">{estado}</span>;
    }
  };

  const getChannelInfo = (order: Order) => {
    const t = (order.tipoEntrega || '').toUpperCase();
    const ref = (order.referenciaCliente || '').toLowerCase();
    const isTable    = t === 'MESA' || t === 'TABLE' || t === 'TABLE_ORDER' || ref.includes('mesa');
    const isDelivery = t === 'DOMICILIO' || t === 'DELIVERY' || t === 'DELIVERY_ORDER';

    let cleanMesaName = '';
    if (isTable) {
      if (order.referenciaCliente) {
        cleanMesaName = order.referenciaCliente.replace(/^Mesa:\s*/i, '').replace(/^Mesa\s+/i, 'Mesa ');
      }
      if (!cleanMesaName || cleanMesaName.toLowerCase() === 'mesa') {
        cleanMesaName = 'Mesa';
      }
    }

    if (isTable)    return { label: isStore ? '🛒 Venta Presencial' : `🍽️ ${cleanMesaName}`, color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
    if (isDelivery) return { label: isStore ? '📦 Envío a Domicilio' : '🛵 Delivery',       color: 'bg-amber-50 text-amber-800 border-amber-200' };
    return              { label: isStore ? '🛍️ Retiro en Tienda' : '🛍️ Para Llevar',      color: 'bg-sky-50 text-sky-800 border-sky-200' };
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 space-y-6 text-left">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-2xl shrink-0">
            <ClipboardList className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                {isStore ? 'Órdenes de Venta & Despachos' : 'Órdenes del Día'}
              </h1>
              <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-md uppercase tracking-wider">
                {isStore ? 'Tienda Online' : 'Historial Oficial'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              {isStore 
                ? 'Envío a Domicilio · Retiro en Tienda · Despachos e-commerce — estados de entrega y pagos.' 
                : 'Mesa · Para Llevar · Delivery — todos los estados, forma de pago y detalles completos.'}
            </p>
          </div>
        </div>
        <button
          onClick={fetchDespachoData}
          disabled={loading}
          className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer disabled:opacity-50 self-start sm:self-center"
        >
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ── FILTROS (CANAL & FECHA) ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        {/* Filtros por Canal */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { key: 'ALL',      label: `Todos (${orders.length})`, icon: null },
            { key: 'DELIVERY', label: isStore ? 'Envío a Domicilio' : 'Delivery', icon: <Truck className="size-3.5 text-amber-500" /> },
            { key: 'PICKUP',   label: isStore ? 'Retiro en Tienda' : 'Para Llevar', icon: <ShoppingBag className="size-3.5 text-sky-600" /> },
            { key: 'TABLE',    label: isStore ? 'Venta Presencial' : 'En Mesa', icon: <Utensils className="size-3.5 text-emerald-600" /> },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilterChannel(f.key as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer border ${
                filterChannel === f.key
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-400'
              }`}
            >
              {f.icon}{f.label}
            </button>
          ))}
        </div>

        {/* Filtros por Fecha & Búsqueda */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Selector Rápido de Fecha */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setFilterDate('today')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                filterDate === 'today' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => setFilterDate('yesterday')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                filterDate === 'yesterday' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ayer
            </button>
            <button
              type="button"
              onClick={() => setFilterDate('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                filterDate === 'all' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todas
            </button>
          </div>

          {/* Input de Fecha Específica (Calendario) */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
            <span className="text-[10px] font-black text-slate-400 uppercase">📅 Fecha:</span>
            <input
              type="date"
              value={customDate}
              onChange={e => {
                setCustomDate(e.target.value);
                if (e.target.value) setFilterDate('custom');
              }}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
            />
          </div>

          {/* Búsqueda */}
          <div className="relative w-full sm:w-48">
            <Search className="size-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar cliente o #..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-400 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* ── LISTADO ── */}
      {loading && orders.length === 0 ? (
        <div className="bg-white p-16 rounded-3xl border border-slate-200/80 text-center">
          <RefreshCw className="size-8 animate-spin mx-auto mb-3 text-slate-300" />
          <p className="text-xs font-bold text-slate-400">Cargando órdenes...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white p-16 rounded-3xl border border-slate-200/80 text-center space-y-2">
          <CheckCircle2 className="size-10 text-emerald-400 mx-auto" />
          <h3 className="text-sm font-black text-slate-800">No hay órdenes para mostrar</h3>
          <p className="text-xs text-slate-400">Las órdenes creadas en la jornada aparecerán aquí automáticamente.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          {/* Encabezado tabla — desktop */}
          <div className="hidden lg:grid grid-cols-[56px_1fr_100px_120px_130px_130px_100px_80px] gap-2.5 px-6 py-3 bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest items-center">
            <span>#</span>
            <span>Cliente</span>
            <span>Hora</span>
            <span>Canal</span>
            <span>Estado</span>
            <span>Estado Pago</span>
            <span className="text-right">Total</span>
            <span></span>
          </div>

          {filteredOrders.map((order, idx) => {
            const computedTotal = order.items.reduce(
              (sum, it) => sum + (Number(it.precioUnitario) || 0) * (Number(it.cantidad) || 1), 0
            );
            const displayTotal = computedTotal > 0 ? computedTotal : (Number(order.total) || 0);
            const channel = getChannelInfo(order);
            const dateObj = new Date(order.createdAt);
            const hora = dateObj.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
            const fechaStr = dateObj.toLocaleDateString('es-EC', { day: '2-digit', month: 'short' });

            let extra: any = {};
            if (typeof order.extraInfo === 'string') {
              try { extra = JSON.parse(order.extraInfo); } catch { extra = {}; }
            } else if (order.extraInfo && typeof order.extraInfo === 'object') {
              extra = order.extraInfo;
            }

            const metodoPago = extra.metodoPago || order.payment?.method?.nombre || 'EFECTIVO';
            const rawMontoRecibido = extra.montoRecibido ?? order.payment?.montoPagado ?? null;
            const vuelto = extra.vuelto ?? order.payment?.montoExcedente ?? null;

            const isInitialPaid = extra.paymentStatus === 'PAGADO' || order.payment?.estado === 'CONFIRMADO' || order.payment?.estado === 'PAGO_VERIFICADO';

            const montoPagado = extra.montoPagadoAcumulado !== undefined 
              ? Number(extra.montoPagadoAcumulado) 
              : (isInitialPaid ? Math.min(Number(rawMontoRecibido) || displayTotal, displayTotal) : 0);

            const saldoPendiente = extra.saldoPendiente !== undefined 
              ? Number(extra.saldoPendiente) 
              : Math.max(0, Math.round((displayTotal - montoPagado) * 100) / 100);

            const isParcial = montoPagado > 0 && saldoPendiente > 0.01;
            const isPagadoTotal = saldoPendiente <= 0.01 && (isInitialPaid || (extra.origin === 'POS_CAJA' && extra.paymentStatus !== 'PENDIENTE'));

            return (
              <details key={order.id} className={`group border-b border-slate-100 last:border-0 ${idx % 2 !== 0 ? 'bg-slate-50/40' : ''}`}>
                <summary className="list-none cursor-pointer select-none">
                  {/* Desktop row */}
                  <div className="hidden lg:grid grid-cols-[56px_1fr_115px_120px_130px_130px_100px_80px] gap-2.5 items-center px-6 py-4 hover:bg-indigo-50/30 transition-colors">
                    <span className="text-xs font-black text-slate-400">#{order.numeroPedido}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-900 truncate">{order.nombreCliente}</p>
                      <p className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                        <Phone className="size-2.5 shrink-0" />
                        <span className="truncate">{order.telefonoCliente}</span>
                      </p>
                    </div>
                    <div className="flex flex-col text-[11px] font-semibold text-slate-600">
                      <span className="flex items-center gap-1 text-slate-900 font-extrabold">
                        <Clock className="size-3 text-indigo-500 shrink-0" />
                        {hora}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold pl-4 uppercase">
                        {fechaStr}
                      </span>
                    </div>
                    <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg border inline-flex items-center w-fit ${channel.color}`}>
                      {channel.label}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {getStatusBadge(order.estado)}
                      {['LISTO', 'LISTA', 'READY'].includes((order.estado || '').toUpperCase()) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleUpdateOrderState(order.id, 'FINALIZADO');
                          }}
                          className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-emerald-400 font-black text-[9px] uppercase tracking-wider rounded-md transition-all cursor-pointer shadow-xs flex items-center gap-1 shrink-0"
                          title="Entregar al cliente y finalizar pedido"
                        >
                          <CheckCircle2 className="size-3 text-emerald-400" />
                          <span>Finalizar</span>
                        </button>
                      )}
                    </div>
                    <div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border inline-flex items-center uppercase ${
                        isPagadoTotal
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : isParcial
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : 'bg-rose-100 text-rose-900 border-rose-300'
                      }`}>
                        {isPagadoTotal ? '✓ PAGADO' : isParcial ? '⏳ PARCIAL' : '🔴 PENDIENTE'}
                      </span>
                    </div>
                    <span className="text-sm font-black text-emerald-700 text-right">${displayTotal.toFixed(2)}</span>
                    <div className="flex items-center gap-1.5 justify-end">
                      <button
                        onClick={e => { e.preventDefault(); setSelectedOrderForPrint(order); }}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
                        title="Ver guía"
                      >
                        <Printer className="size-3.5" />
                      </button>
                      {order.latitud && order.longitud && (
                        <button
                          onClick={e => { e.preventDefault(); setSelectedOrderForMap(order); }}
                          className="p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-all cursor-pointer"
                          title="GPS"
                        >
                          <Navigation className="size-3.5" />
                        </button>
                      )}
                      <ChevronRight className="size-4 text-slate-300 group-open:rotate-90 transition-transform duration-200" />
                    </div>
                  </div>

                  {/* Mobile row */}
                  <div className="lg:hidden px-4 py-4 hover:bg-indigo-50/20 transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">#{order.numeroPedido} · {hora}</p>
                        <p className="text-sm font-black text-slate-900 truncate">{order.nombreCliente}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {getStatusBadge(order.estado)}
                        <div className="flex items-center gap-1">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${channel.color}`}>{channel.label}</span>
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase ${
                            isPagadoTotal ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : isParcial ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-rose-100 text-rose-900 border-rose-300'
                          }`}>
                            {isPagadoTotal ? 'PAGADO' : isParcial ? 'PARCIAL' : 'PENDIENTE'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-semibold">{order.items.length} producto(s)</span>
                      <span className="text-sm font-black text-emerald-700">${displayTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </summary>

                {/* Detalle expandido */}
                <div className="px-4 lg:px-6 py-5 bg-gradient-to-b from-indigo-50/30 to-white border-t border-indigo-100/60">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Productos */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Productos del pedido</p>
                      {order.items.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">Sin ítems registrados</p>
                      ) : (
                        <div className="space-y-1">
                          {order.items.map(item => (
                            <div key={item.id} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="w-6 h-6 bg-indigo-100 text-indigo-800 text-[10px] font-black rounded-md flex items-center justify-center shrink-0">
                                  {item.cantidad}
                                </span>
                                <span className="text-xs font-semibold text-slate-800 truncate">{item.nombreProducto}</span>
                              </div>
                              <span className="text-xs font-black text-slate-700 ml-2 shrink-0">
                                ${((Number(item.precioUnitario) || 0) * (Number(item.cantidad) || 1)).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex justify-between items-center pt-3 border-t border-slate-200 mt-2">
                        <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Total</span>
                        <span className="text-lg font-black text-emerald-700">${displayTotal.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Info entrega & pago */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 flex flex-col gap-3">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Detalles de Entrega & Pago</p>
                      <div className="space-y-2.5 text-xs font-semibold text-slate-700">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-bold">Canal / Ubicación</span>
                          <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-md border ${channel.color}`}>{channel.label}</span>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                          <span className="text-slate-400 font-bold">Forma de Pago</span>
                          <span className="font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                            {metodoPago === 'EFECTIVO' ? '💵 Efectivo' : metodoPago === 'TRANSFERENCIA' ? '🏦 Transferencia' : metodoPago === 'TARJETA' ? '💳 Tarjeta' : metodoPago}
                          </span>
                        </div>

                        {montoPagado > 0 && (
                          <div className="flex items-center justify-between text-emerald-800">
                            <span className="text-slate-400 font-bold">Monto Cobrado</span>
                            <span className="font-black bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-emerald-700">${montoPagado.toFixed(2)}</span>
                          </div>
                        )}

                        {saldoPendiente > 0 && (
                          <div className="flex items-center justify-between text-amber-800">
                            <span className="text-slate-400 font-bold">Saldo Pendiente</span>
                            <span className="font-black bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-amber-700">${saldoPendiente.toFixed(2)}</span>
                          </div>
                        )}

                        {vuelto !== null && Number(vuelto) > 0 && (
                          <div className="flex items-center justify-between text-slate-600">
                            <span className="font-semibold">Cambio / Vuelto</span>
                            <span className="font-bold text-slate-800">${Number(vuelto).toFixed(2)}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                          <span className="text-slate-400 font-bold">Estado de Pago</span>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase border ${
                              isPagadoTotal ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : isParcial ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-rose-100 text-rose-900 border-rose-300'
                            }`}>
                              {isPagadoTotal ? 'PAGADO' : isParcial ? 'PARCIALMENTE PAGADO' : 'PENDIENTE EN CAJA'}
                            </span>
                            {!isPagadoTotal && (
                              <button
                                type="button"
                                onClick={() => handleOpenPayModal(order)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm flex items-center gap-1"
                              >
                                <DollarSign className="size-3" /> Gestionar Pago
                              </button>
                            )}
                          </div>
                        </div>

                        {order.direccionCliente && (
                          <div className="flex items-start gap-2 pt-1 border-t border-slate-100">
                            <MapPin className="size-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span className="text-xs font-semibold text-slate-800">{order.direccionCliente}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 mt-auto pt-2 border-t border-slate-100">
                        <button
                          onClick={() => setSelectedOrderForPrint(order)}
                          className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Printer className="size-3.5" /> Ver Guía
                        </button>
                        {order.latitud && order.longitud && (
                          <button
                            onClick={() => setSelectedOrderForMap(order)}
                            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Navigation className="size-3.5" /> GPS
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      )}

      {/* ── MODAL: Guía de Despacho ── */}
      {selectedOrderForPrint && (() => {
        const ct = selectedOrderForPrint.items.reduce(
          (sum, it) => sum + (Number(it.precioUnitario) || 0) * (Number(it.cantidad) || 1), 0
        );
        const dt = ct > 0 ? ct : (Number(selectedOrderForPrint.total) || 0);

        let extra: any = {};
        if (typeof selectedOrderForPrint.extraInfo === 'string') {
          try { extra = JSON.parse(selectedOrderForPrint.extraInfo); } catch { extra = {}; }
        } else if (selectedOrderForPrint.extraInfo && typeof selectedOrderForPrint.extraInfo === 'object') {
          extra = selectedOrderForPrint.extraInfo;
        }

        const metodo = extra.metodoPago || selectedOrderForPrint.payment?.method?.nombre || 'EFECTIVO';
        const recibido = extra.montoRecibido ?? selectedOrderForPrint.payment?.montoPagado ?? null;
        const vuelto = extra.vuelto ?? selectedOrderForPrint.payment?.montoExcedente ?? null;

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl font-mono text-xs">
              <div className="text-center border-b border-dashed border-slate-300 pb-4 space-y-1">
                <h2 className="text-sm font-black text-slate-900 uppercase">Guía de Despacho</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Citiox Enterprise</p>
                <p className="font-black text-slate-800">PEDIDO #{selectedOrderForPrint.numeroPedido}</p>
              </div>

              <div className="space-y-1 border-b border-dashed border-slate-300 pb-4">
                <p><strong>Cliente:</strong> {selectedOrderForPrint.nombreCliente}</p>
                <p><strong>Teléfono:</strong> {selectedOrderForPrint.telefonoCliente}</p>
                {selectedOrderForPrint.direccionCliente && <p><strong>Dirección:</strong> {selectedOrderForPrint.direccionCliente}</p>}
                <p><strong>Pago:</strong> {metodo}</p>
                {recibido !== null && Number(recibido) > 0 && <p><strong>Paga con:</strong> ${Number(recibido).toFixed(2)}</p>}
                {vuelto !== null && Number(vuelto) > 0 && <p><strong>Cambio:</strong> ${Number(vuelto).toFixed(2)}</p>}
              </div>

              <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-4">
                <p className="font-bold uppercase mb-2">Items:</p>
                {selectedOrderForPrint.items.map(item => (
                  <div key={item.id} className="flex justify-between">
                    <span>{item.cantidad}x {item.nombreProducto}</span>
                    <span>${((Number(item.precioUnitario) || 0) * (Number(item.cantidad) || 1)).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between font-black text-sm">
                <span>TOTAL:</span>
                <span className="text-emerald-700">${dt.toFixed(2)}</span>
              </div>

              <div className="flex gap-2 font-sans pt-1">
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="size-4" /> Imprimir
                </button>
                <button
                  onClick={() => setSelectedOrderForPrint(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── MODAL: GESTIONAR PAGO / COBRO ── */}
      {selectedOrderForPayModal && (() => {
        const order = selectedOrderForPayModal;
        const computedTotal = order.items.reduce((sum, it) => sum + (Number(it.precioUnitario) || 0) * (Number(it.cantidad) || 1), 0);
        const displayTotal = computedTotal > 0 ? computedTotal : (Number(order.total) || 0);

        let extra: any = {};
        if (typeof order.extraInfo === 'string') {
          try { extra = JSON.parse(order.extraInfo); } catch {}
        } else if (order.extraInfo && typeof order.extraInfo === 'object') {
          extra = order.extraInfo;
        }

        const rawMontoRecibido = extra.montoRecibido ?? order.payment?.montoPagado ?? 0;
        const isInitialPaid = extra.paymentStatus === 'PAGADO' || order.payment?.estado === 'CONFIRMADO';

        const montoPagado = extra.montoPagadoAcumulado !== undefined 
          ? Number(extra.montoPagadoAcumulado) 
          : (isInitialPaid ? Math.min(Number(rawMontoRecibido) || displayTotal, displayTotal) : 0);

        const saldoPendiente = extra.saldoPendiente !== undefined 
          ? Number(extra.saldoPendiente) 
          : Math.max(0, Math.round((displayTotal - montoPagado) * 100) / 100);

        const amountToPay = montoPagado > 0 ? saldoPendiente : displayTotal;
        const rec = parseFloat(payMontoRecibido) || amountToPay;
        const vuelt = Math.max(0, Math.round((rec - amountToPay) * 100) / 100);

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
              <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider block">
                    Gestión de Cobro
                  </span>
                  <h3 className="text-base font-black text-slate-900">
                    Orden #{order.numeroPedido} — {order.nombreCliente}
                  </h3>
                </div>
                <button onClick={() => setSelectedOrderForPayModal(null)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                  <X className="size-5" />
                </button>
              </div>

              {/* Resumen del Importe a Cobrar */}
              <div className="p-3.5 rounded-2xl bg-slate-900 text-white space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-bold">Consumo Total del Pedido:</span>
                  <span className="font-extrabold text-white">${displayTotal.toFixed(2)}</span>
                </div>
                {montoPagado > 0 && (
                  <div className="flex justify-between items-center text-xs text-emerald-400 font-bold">
                    <span>✓ Cobrado Anteriormente:</span>
                    <span>${montoPagado.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-800">
                  <span className="font-black text-amber-400 uppercase tracking-wider">Total a Cobrar Ahora:</span>
                  <span className="font-black text-emerald-400 text-xl">${amountToPay.toFixed(2)}</span>
                </div>
              </div>

              {/* Método de Pago */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                  Método de Pago
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'EFECTIVO', label: '💵 Efectivo' },
                    { id: 'TRANSFERENCIA', label: '🏦 Transf.' },
                    { id: 'TARJETA', label: '💳 Tarjeta' },
                    { id: 'MIXTO', label: '🔀 Mixto' },
                    { id: 'OTRO', label: '⚡ Otro' }
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPayMethod(m.id as any)}
                      className={`py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                        payMethod === m.id
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Monto Recibido y Cambio */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Monto Recibido ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={payMontoRecibido}
                  onChange={e => setPayMontoRecibido(e.target.value)}
                  className="w-full text-base font-black p-3 border border-slate-200 rounded-xl bg-slate-50 outline-none text-slate-900"
                />

                {/* Accesos Rápidos */}
                <div className="flex gap-1.5 pt-1">
                  {[amountToPay, 10, 20, 50, 100]
                    .filter((v, i, self) => v >= amountToPay && self.indexOf(v) === i)
                    .map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setPayMontoRecibido(val.toFixed(2))}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-[11px] rounded-lg transition-colors"
                      >
                        ${val.toFixed(2)}
                      </button>
                    ))}
                </div>
              </div>

              {/* Vuelto / Cambio */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex justify-between items-center text-xs">
                <span className="font-extrabold text-emerald-900">Vuelto / Cambio a entregar:</span>
                <span className="font-black text-emerald-700 text-lg">${vuelt.toFixed(2)}</span>
              </div>

              {/* Botones de Confirmación */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrderForPayModal(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPayment}
                  disabled={rec < amountToPay - 0.01}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md disabled:opacity-40 cursor-pointer"
                >
                  ✓ Confirmar Pago
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── MODAL: GPS ── */}
      {selectedOrderForMap && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">Ubicación GPS del Cliente</h3>
                <p className="text-xs text-slate-500 font-semibold">{selectedOrderForMap.nombreCliente}</p>
              </div>
              <button onClick={() => setSelectedOrderForMap(null)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="size-5" />
              </button>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl space-y-2 text-xs font-mono border border-slate-200">
              <p><strong>Latitud:</strong> {selectedOrderForMap.latitud}</p>
              <p><strong>Longitud:</strong> {selectedOrderForMap.longitud}</p>
              <p><strong>Dirección:</strong> {selectedOrderForMap.direccionCliente || 'Sin especificación'}</p>
            </div>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${selectedOrderForMap.latitud},${selectedOrderForMap.longitud}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Navigation className="size-4" /> Abrir en Google Maps
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
