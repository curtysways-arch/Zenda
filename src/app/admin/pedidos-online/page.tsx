'use client';
// src/app/admin/pedidos-online/page.tsx
// Módulo de Pedidos Online (Citiox Studio)
// Gestiona únicamente pedidos entrantes del Landing Web (Delivery & Pickup).
// Excluye explícitamente órdenes de POS Mostrador y Mesas.

import { useState, useEffect } from 'react';
import { 
  Globe, PackageCheck, Bike, ShoppingBag, Check, X, Clock, MapPin, Phone,
  User, Loader2, AlertCircle, RefreshCw, ChevronRight, DollarSign, Filter,
  MessageCircle, Printer, ExternalLink, Sparkles
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
  extraInfo?: any;
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
  const [filterState, setFilterState] = useState<'PENDING' | 'PREPARING' | 'COMPLETED' | 'ALL'>('PENDING');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Estados de Alerta Sonora y Pantalla Completa
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [alertOrder, setAlertOrder] = useState<Pedido | null>(null);
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());

  // Estados del Modal de Revisión y Tiempo de Despacho
  const [reviewingOrder, setReviewingOrder] = useState<Pedido | null>(null);
  const [selectedPrepTime, setSelectedPrepTime] = useState<number>(20);
  const [itemsAvailability, setItemsAvailability] = useState<Record<string, boolean>>({});

  // Sintetizador Web Audio API para la alarma sonora
  const triggerAlarmSound = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  };

  const openWhatsApp = (phone: string, nombre: string, orderId: string, customMsg?: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? `593${cleanPhone.slice(1)}` : cleanPhone;
    const message = encodeURIComponent(customMsg || `Hola ${nombre}, te saludamos de tu restaurante. Confirmamos que recibimos tu pedido #${orderId} de la tienda online y ya está en preparación! 🛵💨`);
    window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank');
  };

  const handlePrintTicket = (pedido: Pedido) => {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Ticket Pedido #${pedido.codigo || pedido.id.slice(-6)}</title>
          <style>
            body { font-family: monospace; font-size: 12px; padding: 10px; width: 280px; margin: 0 auto; }
            h2 { text-align: center; margin-bottom: 5px; font-size: 16px; }
            .line { border-top: 1px dashed #000; margin: 8px 0; }
            .flex { display: flex; justify-content: space-between; }
            .bold { font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>PEDIDO ONLINE WEB</h2>
          <div class="line"></div>
          <div><strong>Código:</strong> #${pedido.codigo || pedido.id.slice(-6).toUpperCase()}</div>
          <div><strong>Cliente:</strong> ${pedido.nombreCliente}</div>
          <div><strong>Teléfono:</strong> ${pedido.telefonoCliente}</div>
          <div><strong>Tipo:</strong> ${pedido.tipoEntrega === 'DELIVERY_ORDER' ? 'DELIVERY A DOMICILIO' : 'RETIRO EN LOCAL'}</div>
          ${pedido.direccionCliente ? `<div><strong>Dirección:</strong> ${pedido.direccionCliente}</div>` : ''}
          <div><strong>Fecha:</strong> ${new Date(pedido.createdAt).toLocaleString()}</div>
          <div class="line"></div>
          <div class="bold">ITEMS:</div>
          ${pedido.items.map(i => `<div class="flex"><span>${i.cantidad}x ${i.nombreProducto}</span><span>$${(i.precioUnitario * i.cantidad).toFixed(2)}</span></div>`).join('')}
          <div class="line"></div>
          <div class="flex bold"><span>TOTAL:</span><span>$${Number(pedido.total).toFixed(2)}</span></div>
          <div class="line"></div>
          <div style="text-align: center;">¡Gracias por tu pedido!</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  const isPosOrTableOrder = (p: any): boolean => {
    const extra = typeof p.extraInfo === 'string' ? JSON.parse(p.extraInfo || '{}') : (p.extraInfo || {});

    // 1. Si el canal es explícitamente WEB / LANDING_WEB, es un pedido online legítimo
    const channel = String(extra.channel || extra.canal || '').toUpperCase();
    const origin = String(extra.origin || extra.source || '').toUpperCase();
    
    const isExplicitWeb = channel === 'WEB' || channel === 'LANDING_WEB' || origin === 'LANDING_WEB' || origin === 'PUBLIC_CATALOG' || extra.isWebOrder === true;

    if (isExplicitWeb) {
      // Verificar que no sea de mesa
      if (p.tipoEntrega === 'TABLE_ORDER' || p.tipoEntrega === 'MESA') return true;
      return false; // Aceptado en Pedidos Online
    }

    // 2. Cualquier otra orden (POS, Caja, Mesas, Seeder histórico de métricas) se EXCLUYE de Pedidos Online
    return true;
  };

  const fetchOnlineOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/pedidos');
      if (res.ok) {
        const data = await res.json();
        const onlineOnly = (Array.isArray(data) ? data : []).filter((p: Pedido) => !isPosOrTableOrder(p));
        setPedidos(onlineOnly);

        // Detectar si hay un nuevo pedido PENDIENTE para disparar la Alerta Fullscreen
        const newUnack = onlineOnly.find((p: Pedido) => 
          (p.estado === 'PENDIENTE' || p.estado === 'WAITING_CONFIRMATION') && 
          !acknowledgedIds.has(p.id)
        );

        if (newUnack && alertOrder?.id !== newUnack.id) {
          setAlertOrder(newUnack);
          triggerAlarmSound();
        }
      }
    } catch (e) {
      console.error('Error fetching online orders:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOnlineOrders();
    const interval = setInterval(fetchOnlineOrders, 8000); // Polling cada 8s
    return () => clearInterval(interval);
  }, [acknowledgedIds, soundEnabled, alertOrder]);

  const handleOpenReview = (pedido: Pedido) => {
    // Si estaba la alerta sonar sonando, la cerramos
    if (alertOrder?.id === pedido.id) {
      setAcknowledgedIds(prev => new Set(prev).add(pedido.id));
      setAlertOrder(null);
    }
    setReviewingOrder(pedido);
    setSelectedPrepTime(20);
    const initialAvail: Record<string, boolean> = {};
    pedido.items.forEach(item => {
      initialAvail[item.id] = true;
    });
    setItemsAvailability(initialAvail);
  };

  const handleConfirmAcceptOrder = async () => {
    if (!reviewingOrder) return;
    setProcessingId(reviewingOrder.id);
    try {
      const res = await fetch('/api/admin/pedidos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: reviewingOrder.id,
          estado: 'EN_PREPARACION',
          prepTimeMinutes: selectedPrepTime,
          extraInfoUpdates: {
            itemsAvailability
          }
        })
      });
      if (res.ok) {
        setPedidos(prev => prev.map(p => p.id === reviewingOrder.id ? { ...p, estado: 'EN_PREPARACION' } : p));
        // Enviar notificación a WhatsApp del cliente
        openWhatsApp(
          reviewingOrder.telefonoCliente,
          reviewingOrder.nombreCliente,
          reviewingOrder.codigo || reviewingOrder.id.slice(-6),
          `Hola ${reviewingOrder.nombreCliente}, tu pedido #${reviewingOrder.codigo || reviewingOrder.id.slice(-6)} de la tienda web ha sido ACEPTADO! 👨‍🍳 Tiempo estimado de entrega: ${selectedPrepTime} minutos.`
        );
        setReviewingOrder(null);
      } else {
        alert('Error al aceptar el pedido');
      }
    } catch (e) {
      console.error(e);
      alert('Error de conexión');
    } finally {
      setProcessingId(null);
    }
  };

  const isPendingState = (st: string) => 
    ['PENDIENTE', 'PENDING', 'WAITING_CONFIRMATION', 'POR_CONFIRMAR'].includes((st || '').toUpperCase());

  const isPreparingOrActiveState = (st: string) => 
    ['EN_PREPARACION', 'PREPARANDO', 'ACEPTADO', 'RECIBIDO', 'LISTO', 'REPARTIDOR_ASIGNADO', 'REPARTIDOR_EN_LOCAL', 'ENTREGADO_A_REPARTIDOR', 'EN_CAMINO', 'EN_RUTA', 'DESPACHADO', 'DRIVER_ASSIGNED'].includes((st || '').toUpperCase());

  const isCompletedState = (st: string) => 
    ['ENTREGADO', 'FINALIZADO', 'COMPLETADO', 'CANCELADO', 'RECHAZADO'].includes((st || '').toUpperCase());

  const pendingOrders = pedidos.filter(p => isPendingState(p.estado));
  const preparingOrders = pedidos.filter(p => isPreparingOrActiveState(p.estado));
  const completedOrders = pedidos.filter(p => isCompletedState(p.estado));

  // Detectar pedidos a domicilio aceptados sin repartidor asignado tras > 3 minutos
  const unassignedTimeoutOrders = preparingOrders.filter(p => {
    if (p.tipoEntrega !== 'DELIVERY_ORDER') return false;
    const extra = typeof p.extraInfo === 'string' ? JSON.parse(p.extraInfo || '{}') : (p.extraInfo || {});
    if (extra.assignedDriverId) return false;
    const createdAtTime = new Date(p.createdAt).getTime();
    const elapsedMinutes = (Date.now() - createdAtTime) / (1000 * 60);
    return elapsedMinutes > 3;
  });

  const displayedOrders = pedidos.filter(p => {
    const matchSearch = !searchQuery || 
      p.nombreCliente.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.telefonoCliente.includes(searchQuery) ||
      (p.codigo && p.codigo.toLowerCase().includes(searchQuery.toLowerCase())) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchSearch) return false;

    if (filterState === 'PENDING') return isPendingState(p.estado);
    if (filterState === 'PREPARING') return isPreparingOrActiveState(p.estado);
    if (filterState === 'COMPLETED') return isCompletedState(p.estado);
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Header Premium */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-[#ea580c] text-white flex items-center justify-center font-black shadow-md shadow-orange-500/20">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Pedidos Online (Landing Web)</h1>
              <span className="bg-amber-100 text-amber-900 font-extrabold text-[10px] uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-600" /> Exclusivo Web Client
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Gestiona pedidos entrantes directo desde tu Landing Page Web (Delivery & Pickup)</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar cliente, tel, código..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="px-3 py-2 pl-8 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#ea580c] w-48 sm:w-64"
            />
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
          </div>
          <button
            onClick={fetchOnlineOrders}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-950 text-white font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Tabs Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setFilterState('PENDING')}
          className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
            filterState === 'PENDING'
              ? 'bg-[#ea580c] text-white shadow-lg shadow-[#ea580c]/25 scale-[1.02]'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Clock className="w-4 h-4 text-amber-300" />
          Pendientes por Aceptar
          {pendingOrders.length > 0 ? (
            <span className="bg-white text-[#ea580c] px-2 py-0.5 rounded-full text-[10px] font-black animate-pulse">
              {pendingOrders.length}
            </span>
          ) : (
            <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-[10px] font-bold">0</span>
          )}
        </button>

        <button
          onClick={() => setFilterState('PREPARING')}
          className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
            filterState === 'PREPARING'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/25 scale-[1.02]'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <PackageCheck className="w-4 h-4 text-amber-200" />
          En Preparación / En Camino
          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
            {preparingOrders.length}
          </span>
        </button>

        <button
          onClick={() => setFilterState('COMPLETED')}
          className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
            filterState === 'COMPLETED'
              ? 'bg-emerald-700 text-white shadow-lg shadow-emerald-700/25 scale-[1.02]'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Check className="w-4 h-4 text-emerald-300" />
          Completados / Entregados ({completedOrders.length})
        </button>

        <button
          onClick={() => setFilterState('ALL')}
          className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
            filterState === 'ALL'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Todos ({pedidos.length})
        </button>
      </div>

      {/* Orders Grid */}
      {loading && pedidos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <Loader2 className="w-8 h-8 text-[#ea580c] animate-spin mb-3" />
          <p className="text-xs font-black uppercase text-slate-500 tracking-wider">Cargando solicitudes online...</p>
        </div>
      ) : displayedOrders.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="size-16 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
            <Globe className="w-8 h-8" />
          </div>
          <h3 className="font-extrabold text-base text-slate-800">No hay pedidos online en esta sección</h3>
          <p className="text-xs text-slate-400 font-medium max-w-md mx-auto mt-1">
            Los nuevos pedidos realizados por los clientes en tu tienda web aparecerán automáticamente aquí en tiempo real.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayedOrders.map(pedido => {
            const isDelivery = pedido.tipoEntrega === 'DELIVERY_ORDER';
            const isPending = pedido.estado === 'PENDIENTE' || pedido.estado === 'PENDING';
            const isPreparing = pedido.estado === 'EN_PREPARACION' || pedido.estado === 'ACEPTADO';
            const isPaid = pedido.paymentStatus === 'PAGADO' || pedido.payment?.status === 'PAID';

            return (
              <div
                key={pedido.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between p-4 space-y-3 relative group"
              >
                {/* Visual Accent Top Bar */}
                <div className={`h-1.5 -mx-4 -mt-4 mb-1 ${
                  isPending ? 'bg-[#ea580c]' : isPreparing ? 'bg-amber-500' : 'bg-emerald-500'
                }`} />

                {/* Header Card */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-2.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-slate-900">
                        #{pedido.codigo || pedido.id.slice(-6).toUpperCase()}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase flex items-center gap-1 ${
                        isDelivery ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}>
                        {isDelivery ? <Bike className="w-3 h-3" /> : <ShoppingBag className="w-3 h-3" />}
                        {isDelivery ? 'Delivery Web' : 'Retiro en Local'}
                      </span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {new Date(pedido.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                    isPaid ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-900 border border-amber-200'
                  }`}>
                    {isPaid ? '💵 Pagado Online' : '💰 Pago al Recibir'}
                  </span>
                </div>

                {/* Info Cliente */}
                <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-slate-900 font-extrabold text-xs">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{pedido.nombreCliente}</span>
                    </div>
                    <button
                      onClick={() => openWhatsApp(pedido.telefonoCliente, pedido.nombreCliente, pedido.codigo || pedido.id.slice(-6))}
                      className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-md text-[9px] font-black flex items-center gap-1 cursor-pointer transition-colors"
                      title="Abrir chat en WhatsApp"
                    >
                      <MessageCircle className="w-3 h-3 text-emerald-600" /> WhatsApp
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-600 font-bold text-[11px]">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{pedido.telefonoCliente}</span>
                  </div>

                  {isDelivery && pedido.direccionCliente && (
                    <div className="flex items-start justify-between gap-1 pt-1 border-t border-slate-200/60">
                      <div className="flex items-start gap-1 text-slate-700 text-[10px] font-semibold">
                        <MapPin className="w-3.5 h-3.5 text-[#ea580c] shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{pedido.direccionCliente}</span>
                      </div>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pedido.direccionCliente)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#ea580c] hover:underline text-[9px] font-bold shrink-0 flex items-center gap-0.5"
                      >
                        Mapa <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Items List */}
                <div className="bg-white rounded-xl p-2.5 border border-slate-150 space-y-1 text-xs">
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Detalle del Pedido Online</p>
                  {pedido.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[11px] font-bold text-slate-800">
                      <span><strong className="text-[#ea580c]">{item.cantidad}x</strong> {item.nombreProducto}</span>
                      <span>${(item.precioUnitario * item.cantidad).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="pt-2 mt-2 border-t border-slate-100 flex justify-between items-center font-black text-xs text-slate-900">
                    <span>TOTAL A COBRAR:</span>
                    <span className="text-[#ea580c] text-base font-black">${(Number(pedido.total) || 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5">
                  {isPending ? (
                    <>
                      <button
                        onClick={() => handleOpenReview(pedido)}
                        disabled={processingId === pedido.id}
                        className="flex-1 py-2 rounded-xl font-black text-xs uppercase bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                      >
                        {processingId === pedido.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-4 h-4" />}
                        Revisar y Asignar Tiempo
                      </button>
                      <button
                        onClick={() => handlePrintTicket(pedido)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
                        title="Imprimir ticket"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('¿Deseas rechazar este pedido?')) {
                            fetch('/api/admin/pedidos', {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ id: pedido.id, estado: 'CANCELADO' })
                            }).then(() => fetchOnlineOrders());
                          }
                        }}
                        disabled={processingId === pedido.id}
                        className="p-2 rounded-xl font-bold text-xs bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 cursor-pointer transition-all disabled:opacity-50"
                        title="Rechazar pedido"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <div className="w-full flex items-center justify-between gap-2">
                      <button
                        onClick={() => handlePrintTicket(pedido)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5" /> Ticket
                      </button>
                      <span className="text-[10px] font-black uppercase px-2 py-1 rounded-lg bg-slate-100 text-slate-700">
                        Estado: {pedido.estado}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* BANNER DE ALERTA POR TIMEOUT DE REPARTIDORES (>3 MIN SINO SE HA TOMADO) */}
      {unassignedTimeoutOrders.length > 0 && (
        <div className="bg-gradient-to-r from-rose-600 to-red-700 text-white p-4 rounded-2xl shadow-xl flex items-center justify-between gap-3 animate-pulse border-2 border-red-400">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/20 text-white font-black">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-black text-sm uppercase">¡ALERTA DE REPARTIDORES UNASSIGNED!</h4>
              <p className="text-xs font-semibold text-rose-100">
                Hay {unassignedTimeoutOrders.length} pedido(s) a domicilio en preparación sin repartidor asignado tras más de 3 minutos.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ALERTA FULLSCREEN CON SONIDO DE NUEVO PEDIDO ENTRANTE */}
      {alertOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border-4 border-[#ea580c] space-y-5 text-center relative overflow-hidden">
            <div className="bg-gradient-to-r from-[#ea580c] to-amber-500 text-white py-3 px-4 -mx-6 -mt-6 mb-2 flex items-center justify-between">
              <span className="font-black text-xs uppercase flex items-center gap-1.5 animate-pulse">
                <Sparkles className="w-4 h-4" /> ¡NUEVO PEDIDO WEB ENTRANTE!
              </span>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="px-2.5 py-1 bg-black/20 hover:bg-black/30 text-white rounded-lg text-[10px] font-black cursor-pointer"
              >
                {soundEnabled ? '🔊 Sonido Alarma ON' : '🔇 Mute'}
              </button>
            </div>

            <div className="size-20 mx-auto rounded-full bg-orange-100 text-[#ea580c] flex items-center justify-center font-black animate-bounce shadow-xl">
              <Globe className="w-10 h-10" />
            </div>

            <div>
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">Código de Pedido</span>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">#{alertOrder.codigo || alertOrder.id.slice(-6).toUpperCase()}</h2>
              <p className="text-sm font-extrabold text-[#ea580c] mt-1">{alertOrder.nombreCliente} • {alertOrder.telefonoCliente}</p>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs text-slate-700 font-bold justify-between flex items-center">
              <span>{alertOrder.items.length} producto(s) en pedido:</span>
              <span className="text-base font-black text-[#ea580c]">${Number(alertOrder.total).toFixed(2)}</span>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                onClick={() => handleOpenReview(alertOrder)}
                className="flex-1 py-3.5 bg-[#ea580c] hover:bg-orange-700 text-white font-black text-sm uppercase rounded-2xl shadow-xl shadow-orange-600/30 cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" /> Atender Pedido Ahora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: REVISIÓN DE PEDIDO & SELECCIÓN DE TIEMPO DE DESPACHO */}
      {reviewingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-[#ea580c]">Revisión & Confirmación de Cocina</span>
                <h3 className="text-lg font-black text-slate-900">Pedido #{reviewingOrder.codigo || reviewingOrder.id.slice(-6).toUpperCase()}</h3>
              </div>
              <button
                onClick={() => setReviewingOrder(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selector de Tiempo de Preparación */}
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase text-slate-600 tracking-wider">
                ⏰ Tiempo Estimado de Preparación / Entrega
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[15, 20, 30, 45, 60].map(mins => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setSelectedPrepTime(mins)}
                    className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      selectedPrepTime === mins
                        ? 'bg-[#ea580c] text-white shadow-md shadow-orange-600/20 scale-[1.05]'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {mins} min
                  </button>
                ))}
              </div>
            </div>

            {/* Ajuste de Disponibilidad de Ítems */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-xs font-black uppercase text-slate-600 tracking-wider">
                📦 Disponibilidad de Productos en Cocina
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {reviewingOrder.items.map(item => {
                  const isAvailable = itemsAvailability[item.id] ?? true;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                    >
                      <span className="font-bold text-slate-800">{item.cantidad}x {item.nombreProducto}</span>
                      <button
                        type="button"
                        onClick={() => setItemsAvailability(prev => ({ ...prev, [item.id]: !isAvailable }))}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                          isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {isAvailable ? 'Disponible 🟢' : 'Agotado 🔴'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Botón de Confirmación */}
            <div className="pt-3 border-t border-slate-100">
              <button
                onClick={handleConfirmAcceptOrder}
                disabled={processingId === reviewingOrder.id}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              >
                {processingId === reviewingOrder.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Confirmar y Enviar a Cocina / Repartidores ({selectedPrepTime} min)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
