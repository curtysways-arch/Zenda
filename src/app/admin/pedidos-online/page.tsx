'use client';

import { useState, useEffect } from 'react';
import { 
  Globe, PackageCheck, Bike, ShoppingBag, Check, X, Clock, MapPin, Phone,
  User, Loader2, AlertCircle, RefreshCw, ChevronRight, DollarSign, Filter,
  MessageCircle, Printer, ExternalLink, Sparkles, Eye, ShieldCheck, AlertTriangle,
  Maximize2, ArrowLeft
} from 'lucide-react';

interface PedidoItem {
  id: string;
  productoId?: string;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
}

interface OrderPayment {
  id: string;
  monto: number;
  montoExcedente?: number;
  estado: string; // PENDIENTE | COMPROBANTE_ENVIADO | PAGO_VERIFICADO | PAGO_RECHAZADO | REEMBOLSO_PENDIENTE | REEMBOLSADO
  metodoDevolucion?: string;
  referenciaDevolucion?: string;
  observacionDevolucion?: string;
  evidences?: Array<{ fileUrl: string }>;
}

interface Pedido {
  id: string;
  codigo?: string;
  numeroPedido?: number;
  nombreCliente: string;
  telefonoCliente: string;
  direccionCliente?: string;
  referenciaCliente?: string;
  tipoEntrega: 'DELIVERY_ORDER' | 'PICKUP_ORDER' | 'TABLE_ORDER' | string;
  estado: string;
  estadoDisponibilidad?: string;
  metodoPago?: string;
  paymentStatus?: string;
  total: number;
  subtotal: number;
  costoEnvio?: number;
  createdAt: string;
  extraInfo?: any;
  items: PedidoItem[];
  payment?: OrderPayment;
}

export default function PedidosOnlinePage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterState, setFilterState] = useState<'PENDING' | 'PREPARING' | 'REFUNDS' | 'ALL'>('ALL');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Estado de Orden Seleccionada para Detalle a Pantalla Completa
  const [fullscreenOrder, setFullscreenOrder] = useState<Pedido | null>(null);

  // Modal de Disponibilidad & Propuesta de Cambios
  const [selectedPrepTime, setSelectedPrepTime] = useState<number>(20);
  const [itemsAvailability, setItemsAvailability] = useState<Record<string, boolean>>({});
  const [disableCatalogProducts, setDisableCatalogProducts] = useState(true);

  // Modal de Confirmación de Reembolso
  const [refundMethod, setRefundMethod] = useState<string>('TRANSFERENCIA');
  const [refundRef, setRefundRef] = useState<string>('');
  const [refundNotes, setRefundNotes] = useState<string>('');

  const fetchOnlineOrders = async () => {
    try {
      const res = await fetch('/api/admin/pedidos');
      if (res.ok) {
        const data = await res.json();
        const onlineOnly = (data || []).filter((p: any) => {
          const ch = (p.extraInfo?.channel || p.extraInfo?.canal || 'WEB').toUpperCase();
          return ch !== 'POS' && ch !== 'MOSTRADOR';
        });
        setPedidos(onlineOnly);

        // Si hay una orden en pantalla completa abierta, refrescar sus datos actualizados
        if (fullscreenOrder) {
          const updatedTarget = onlineOnly.find((p: Pedido) => p.id === fullscreenOrder.id);
          if (updatedTarget) setFullscreenOrder(updatedTarget);
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
    const interval = setInterval(fetchOnlineOrders, 8000);
    return () => clearInterval(interval);
  }, []);

  // Abrir Orden a Pantalla Completa y cargar disponibilidad inicial
  const handleOpenFullscreenOrder = (pedido: Pedido) => {
    setFullscreenOrder(pedido);
    const initialAvailability: Record<string, boolean> = {};
    (pedido.items || []).forEach(it => {
      initialAvailability[it.id] = true;
    });
    setItemsAvailability(initialAvailability);
  };

  // 1. CONFIRMAR DISPONIBILIDAD O ENVIAR PROPUESTA DE CAMBIOS
  const handleSaveDisponibilidad = async (pedidoTarget: Pedido) => {
    setProcessingId(pedidoTarget.id);

    const outOfStockItems = pedidoTarget.items.filter(it => itemsAvailability[it.id] === false);
    const isAllAvailable = outOfStockItems.length === 0;

    try {
      if (isAllAvailable) {
        const res = await fetch('/api/admin/pedidos', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: pedidoTarget.id,
            action: 'CONFIRMAR_DISPONIBILIDAD'
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          alert(`Error al confirmar disponibilidad: ${errData.error || 'Error en el servidor'}`);
          return;
        }
      } else {
        const proposedItems = pedidoTarget.items
          .filter(it => itemsAvailability[it.id] !== false)
          .map(it => ({
            id: it.id,
            productoId: it.productoId,
            nombreProducto: it.nombreProducto,
            cantidad: it.cantidad,
            precioUnitario: it.precioUnitario
          }));

        const outOfStockItemsList = outOfStockItems.map(it => ({
          id: it.id,
          productoId: it.productoId,
          nombreProducto: it.nombreProducto,
          cantidad: it.cantidad,
          precioUnitario: it.precioUnitario
        }));

        const newSubtotal = proposedItems.reduce((sum, it) => sum + ((Number(it.precioUnitario) || 0) * (Number(it.cantidad) || 1)), 0);
        const shippingCost = Number(pedidoTarget.costoEnvio || 0);
        const newTotal = newSubtotal + shippingCost;
        const outOfStockProductIds = outOfStockItems.map(it => it.productoId).filter(Boolean);

        const res = await fetch('/api/admin/pedidos', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: pedidoTarget.id,
            action: 'SOLICITAR_CAMBIOS',
            proposedItems,
            outOfStockItemsList,
            subtotal: newSubtotal,
            total: newTotal,
            outOfStockProductIds,
            disableOutOfStock: disableCatalogProducts
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          alert(`Error al solicitar cambios: ${errData.error || 'Error en el servidor'}`);
          return;
        }
      }

      await fetchOnlineOrders();
    } catch (err) {
      console.error('Error guardando disponibilidad:', err);
    } finally {
      setProcessingId(null);
    }
  };

  // 2. VERIFICAR PAGO
  const handleVerifyPayment = async (pedidoId: string) => {
    setProcessingId(pedidoId);
    try {
      await fetch('/api/admin/pedidos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pedidoId, action: 'VERIFICAR_PAGO' })
      });
      await fetchOnlineOrders();
    } catch (e) {
      console.error('Error verificando pago:', e);
    } finally {
      setProcessingId(null);
    }
  };

  // RECHAZAR PAGO
  const handleRejectPayment = async (pedidoId: string) => {
    const reason = prompt('Motivo de rechazo del pago (ej: Comprobante no legible o monto incorrecto):');
    if (!reason) return;
    setProcessingId(pedidoId);
    try {
      await fetch('/api/admin/pedidos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pedidoId, action: 'RECHAZAR_PAGO', motivoRechazo: reason })
      });
      await fetchOnlineOrders();
    } catch (e) {
      console.error('Error rechazando pago:', e);
    } finally {
      setProcessingId(null);
    }
  };

  // 3. ACEPTACIÓN DEFINITIVA -> Pasa a ACEPTADO -> EN_PREPARACION en Cocina
  const handleAcceptOrderToKitchen = async (pedidoTarget: Pedido) => {
    setProcessingId(pedidoTarget.id);
    try {
      await fetch('/api/admin/pedidos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: pedidoTarget.id,
          action: 'ACEPTAR_PEDIDO',
          prepTimeMinutes: selectedPrepTime
        })
      });
      await fetchOnlineOrders();
    } catch (e) {
      console.error('Error aceptando pedido:', e);
    } finally {
      setProcessingId(null);
    }
  };

  // 4. CONFIRMAR DEVOLUCIÓN FINANCIERA DE REEMBOLSO
  const handleConfirmRefund = async (pedidoTarget: Pedido) => {
    setProcessingId(pedidoTarget.id);
    try {
      await fetch('/api/admin/pedidos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: pedidoTarget.id,
          action: 'CONFIRMAR_DEVOLUCION',
          metodoDevolucion: refundMethod,
          referenciaDevolucion: refundRef,
          observacionDevolucion: refundNotes
        })
      });
      setRefundRef('');
      setRefundNotes('');
      await fetchOnlineOrders();
    } catch (e) {
      console.error('Error procesando devolución:', e);
    } finally {
      setProcessingId(null);
    }
  };

  const openWhatsApp = (phone: string, nombre: string, orderId: string, customMsg?: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? `593${cleanPhone.slice(1)}` : cleanPhone;
    const message = encodeURIComponent(customMsg || `Hola ${nombre}, te saludamos de tu restaurante. Recibimos tu pedido #${orderId} y estamos procesándolo! 🛵💨`);
    window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank');
  };

  const handlePrintTicket = (pedido: Pedido) => {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) return;
    const code = pedido.codigo || pedido.numeroPedido || pedido.id.slice(-6);
    printWindow.document.write(`
      <html>
        <head>
          <title>Ticket Pedido #${code}</title>
          <style>
            body { font-family: monospace; font-size: 12px; padding: 10px; width: 280px; margin: 0 auto; }
            h2 { text-align: center; margin-bottom: 5px; font-size: 16px; }
            .line { border-top: 1px dashed #000; margin: 8px 0; }
            .flex { display: flex; justify-content: space-between; }
            .bold { font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>PEDIDO #${code}</h2>
          <div class="line"></div>
          <p><strong>Cliente:</strong> ${pedido.nombreCliente}</p>
          <p><strong>Telf:</strong> ${pedido.telefonoCliente}</p>
          <p><strong>Tipo:</strong> ${pedido.tipoEntrega}</p>
          ${pedido.direccionCliente ? `<p><strong>Dirección:</strong> ${pedido.direccionCliente}</p>` : ''}
          <div class="line"></div>
          <p class="bold">PRODUCTOS:</p>
          ${(pedido.items || []).map(i => `<div class="flex"><span>${i.cantidad}x ${i.nombreProducto}</span><span>$${((Number(i.precioUnitario) || 0) * i.cantidad).toFixed(2)}</span></div>`).join('')}
          <div class="line"></div>
          <div class="flex bold"><span>TOTAL:</span><span>$${(Number(pedido.total) || 0).toFixed(2)}</span></div>
          <div class="line"></div>
          <p style="text-align:center; font-size:10px;">¡Gracias por tu compra!</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  // Filtrar pedidos por estado
  const filteredOrders = pedidos.filter(p => {
    if (filterState === 'PENDING') return p.estado === 'RECIBIDO' || p.estado === 'CAMBIOS_SOLICITADOS';
    if (filterState === 'PREPARING') return ['ACEPTADO', 'EN_PREPARACION', 'LISTO', 'LISTA'].includes(p.estado);
    if (filterState === 'REFUNDS') return p.payment?.estado === 'REEMBOLSO_PENDIENTE' || Number(p.payment?.montoExcedente || 0) > 0;
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.nombreCliente.toLowerCase().includes(q) ||
        p.telefonoCliente.includes(q) ||
        (p.codigo && p.codigo.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const pendingRefundsCount = pedidos.filter(p => p.payment?.estado === 'REEMBOLSO_PENDIENTE').length;
  const outOfStockCount = pedidos.filter(p => p.estadoDisponibilidad === 'CAMBIOS_SOLICITADOS').length;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto text-slate-900">
      
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white p-5 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight">Gestión Oficial de Pedidos Online</h1>
            <p className="text-xs text-slate-400 font-medium">Haz clic en cualquier tarjeta para abrir la gestión a pantalla completa</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchOnlineOrders}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Actualizar
          </button>
        </div>
      </div>

      {/* ALERTAS GENERALES EN ADMIN */}
      {outOfStockCount > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-900 p-3.5 rounded-2xl flex items-center justify-between text-xs font-bold">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Hay {outOfStockCount} pedido(s) con propuesta de cambio de productos enviada al cliente.</span>
          </span>
          <button onClick={() => setFilterState('PENDING')} className="underline hover:text-amber-950 cursor-pointer">
            Ver Pedidos
          </button>
        </div>
      )}

      {/* FILTROS & TABS */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl gap-1 text-xs font-black">
          <button
            onClick={() => setFilterState('ALL')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer ${filterState === 'ALL' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
          >
            Todos ({pedidos.length})
          </button>
          <button
            onClick={() => setFilterState('PENDING')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer ${filterState === 'PENDING' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
          >
            Nuevos Recibidos
          </button>
          <button
            onClick={() => setFilterState('PREPARING')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer ${filterState === 'PREPARING' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
          >
            En Preparación
          </button>
          <button
            onClick={() => setFilterState('REFUNDS')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer relative ${filterState === 'REFUNDS' ? 'bg-rose-600 text-white shadow-md' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'}`}
          >
            🔴 Reembolsos Pendientes
            {pendingRefundsCount > 0 && (
              <span className="ml-1.5 bg-white text-rose-700 px-1.5 py-0.2 rounded-full text-[10px] font-black">
                {pendingRefundsCount}
              </span>
            )}
          </button>
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Buscar por cliente, teléfono o #pedido..."
          className="px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold w-full sm:w-64 focus:bg-white transition-all"
        />
      </div>

      {/* GRILLA DE PEDIDOS */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500" />
          <p className="text-xs font-black uppercase tracking-widest">Cargando pedidos online...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="py-16 bg-slate-50 border border-dashed border-slate-200 rounded-3xl text-center space-y-2">
          <ShoppingBag className="w-10 h-10 mx-auto text-slate-300" />
          <h3 className="font-extrabold text-slate-700 text-sm">No hay pedidos en este estado</h3>
          <p className="text-xs text-slate-400">Los nuevos pedidos realizados por clientes aparecerán aquí automáticamente.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map(pedido => {
            const isDelivery = pedido.tipoEntrega === 'DELIVERY_ORDER' || pedido.tipoEntrega === 'DOMICILIO';
            const isProdConfirmed = (pedido.estadoDisponibilidad || pedido.extraInfo?.estadoDisponibilidad) === 'PRODUCTOS_CONFIRMADOS' || (pedido.estadoDisponibilidad || pedido.extraInfo?.estadoDisponibilidad) === 'CAMBIOS_ACEPTADOS';
            const isPaymentVerified = pedido.payment?.estado === 'PAGO_VERIFICADO' || pedido.payment?.estado === 'CONFIRMADO';
            const canAcceptOrder = isProdConfirmed && isPaymentVerified && pedido.estado === 'RECIBIDO';
            const hasPendingRefund = pedido.payment?.estado === 'REEMBOLSO_PENDIENTE';

            return (
              <div
                key={pedido.id}
                onClick={() => handleOpenFullscreenOrder(pedido)}
                className={`bg-white rounded-3xl p-5 border shadow-sm space-y-3.5 transition-all hover:shadow-xl hover:scale-[1.01] cursor-pointer relative text-left group ${
                  hasPendingRefund 
                    ? 'border-rose-300 bg-rose-50/30' 
                    : pedido.estado === 'RECIBIDO' 
                    ? 'border-amber-300 ring-2 ring-amber-400/20' 
                    : 'border-slate-200'
                }`}
              >
                {/* Header Pedido */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 flex items-center gap-1">
                      {isDelivery ? '🛵 Delivery Online' : '🏬 Para Retirar'}
                      <Maximize2 className="w-3 h-3 text-slate-400 group-hover:text-amber-600 transition-colors ml-1" />
                    </span>
                    <h3 className="text-lg font-black text-slate-900 leading-tight">
                      #{pedido.codigo || pedido.numeroPedido || pedido.id.slice(-6).toUpperCase()}
                    </h3>
                  </div>

                  <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase border ${
                    pedido.estado === 'EN_PREPARACION'
                      ? 'bg-blue-100 border-blue-300 text-blue-800'
                      : pedido.estado === 'CAMBIOS_SOLICITADOS'
                      ? 'bg-amber-100 border-amber-300 text-amber-900'
                      : pedido.estado === 'RECIBIDO'
                      ? 'bg-amber-400 text-slate-950 border-amber-500'
                      : 'bg-slate-100 border-slate-200 text-slate-700'
                  }`}>
                    {pedido.estado}
                  </span>
                </div>

                {/* Cliente */}
                <div className="space-y-1 text-xs text-slate-600">
                  <p className="font-extrabold text-slate-900">{pedido.nombreCliente}</p>
                  <p className="font-semibold text-slate-500">{pedido.telefonoCliente}</p>
                  {pedido.direccionCliente && (
                    <p className="text-[11px] text-slate-500 truncate">📍 {pedido.direccionCliente}</p>
                  )}
                </div>

                {/* Ítems del Pedido */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1 text-xs">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Productos</span>
                  {pedido.items?.map(it => (
                    <div key={it.id} className="flex justify-between font-bold text-slate-800">
                      <span>{it.cantidad || 1}x {it.nombreProducto}</span>
                      <span>${((Number(it.precioUnitario) || 0) * (Number(it.cantidad) || 1)).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="pt-2 mt-1 border-t border-slate-200 flex justify-between font-black text-slate-900">
                    <span>Total:</span>
                    <span className="text-emerald-600 text-sm">${(Number(pedido.total) || 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* ESTADO PAGO & REEMBOLSO */}
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-100 border border-slate-200 text-[11px] font-extrabold">
                    <span>Pago:</span>
                    <span className={`px-2 py-0.5 rounded-md uppercase text-[10px] ${
                      isPaymentVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                    }`}>
                      {pedido.payment?.estado || 'PENDIENTE'}
                    </span>
                  </div>

                  {hasPendingRefund && (
                    <div className="p-2.5 rounded-xl bg-rose-100 border border-rose-300 text-rose-900 text-xs space-y-1.5 animate-pulse">
                      <div className="flex items-center justify-between font-black">
                        <span>🔴 REEMBOLSO PENDIENTE:</span>
                        <span className="text-sm">${(Number(pedido.payment?.montoExcedente) || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Botón Abrir Pantalla Completa */}
                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenFullscreenOrder(pedido);
                    }}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Maximize2 className="w-4 h-4 text-amber-400" />
                    <span>Gestionar a Pantalla Completa</span>
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL FULLSCREEN DE GESTIÓN DE PEDIDO ── */}
      {fullscreenOrder && (() => {
        const order = fullscreenOrder;
        const isDelivery = order.tipoEntrega === 'DELIVERY_ORDER' || order.tipoEntrega === 'DOMICILIO';
        const isProdConfirmed = (order.estadoDisponibilidad || order.extraInfo?.estadoDisponibilidad) === 'PRODUCTOS_CONFIRMADOS' || (order.estadoDisponibilidad || order.extraInfo?.estadoDisponibilidad) === 'CAMBIOS_ACEPTADOS';
        const isPaymentVerified = order.payment?.estado === 'PAGO_VERIFICADO' || order.payment?.estado === 'CONFIRMADO';
        const canAcceptOrder = isProdConfirmed && isPaymentVerified && order.estado === 'RECIBIDO';
        const hasPendingRefund = order.payment?.estado === 'REEMBOLSO_PENDIENTE';
        const evidenceUrl = order.payment?.evidences?.[0]?.fileUrl;
        const totalVal = Number(order.total) || 0;

        return (
          <div className="fixed inset-0 z-[9999] bg-slate-950/90 backdrop-blur-md overflow-y-auto flex flex-col p-3 sm:p-6 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-6xl mx-auto my-auto shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
              
              {/* HEADER PANTALLA COMPLETA */}
              <div className="bg-slate-900 text-white p-4 sm:p-6 flex items-center justify-between shrink-0 shadow-md">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setFullscreenOrder(null)}
                    className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Volver</span>
                  </button>
                  <div>
                    <span className="text-[10px] font-black uppercase text-amber-400 tracking-widest block">
                      {isDelivery ? '🛵 PEDIDO DELIVERY ONLINE' : '🏬 PEDIDO PARA RETIRAR'}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                      Gestión Pedido #{order.codigo || order.numeroPedido || order.id.slice(-6).toUpperCase()}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1.5 rounded-2xl text-xs font-black uppercase border ${
                    order.estado === 'EN_PREPARACION'
                      ? 'bg-blue-600 border-blue-400 text-white'
                      : order.estado === 'RECIBIDO'
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-slate-800 border-slate-700 text-slate-200'
                  }`}>
                    Estado: {order.estado}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFullscreenOrder(null)}
                    className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* CUERPO DEL MODAL (3 COLUMNAS EN DESKTOP) */}
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 bg-slate-50/50">
                
                {/* COLUMNA 1: INFORMACIÓN DEL CLIENTE Y LOGÍSTICA */}
                <div className="space-y-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs h-fit">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                    <User className="w-4 h-4 text-amber-500" />
                    1. Información del Cliente
                  </h3>

                  <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-900 text-sm">{order.nombreCliente}</span>
                      <button
                        type="button"
                        onClick={() => openWhatsApp(order.telefonoCliente, order.nombreCliente, order.codigo || order.id.slice(-6))}
                        className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl text-[10px] font-black flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp
                      </button>
                    </div>

                    <div className="flex items-center gap-2 text-slate-600 font-semibold pt-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{order.telefonoCliente}</span>
                    </div>

                    {isDelivery && order.direccionCliente && (
                      <div className="pt-2 border-t border-slate-200/80 space-y-1">
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-slate-700 font-semibold flex items-start gap-1">
                            <MapPin className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            {order.direccionCliente}
                          </span>
                        </div>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.direccionCliente)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-black text-amber-600 hover:underline pt-1"
                        >
                          Abrir Ubicación en Google Maps <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Acciones Adicionales */}
                  <div className="pt-2 space-y-2">
                    <button
                      type="button"
                      onClick={() => handlePrintTicket(order)}
                      className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <Printer className="w-4 h-4" />
                      Imprimir Ticket Comanda
                    </button>
                  </div>
                </div>

                {/* COLUMNA 2: GESTIÓN DE DISPONIBILIDAD DE PRODUCTOS (☑ / ☐) */}
                <div className="space-y-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                    <PackageCheck className="w-4 h-4 text-amber-500" />
                    2. Disponibilidad de Productos en Cocina
                  </h3>

                  <p className="text-xs text-slate-500 font-medium">
                    Verifica la existencia de cada producto. Si falta algún ítem, desmárcalo para enviarle la propuesta de cambios al cliente.
                  </p>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {order.items.map(item => {
                      const isAvail = itemsAvailability[item.id] !== false;
                      return (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between p-3.5 rounded-2xl border text-xs transition-all ${
                            isAvail ? 'bg-slate-50 border-slate-200' : 'bg-rose-50 border-rose-200'
                          }`}
                        >
                          <div>
                            <span className="font-extrabold text-slate-900 block">{item.cantidad}x {item.nombreProducto}</span>
                            <span className="text-[10px] text-slate-400">${(Number(item.precioUnitario) || 0).toFixed(2)} c/u</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setItemsAvailability(prev => ({ ...prev, [item.id]: !isAvail }))}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer ${
                              isAvail ? 'bg-emerald-500 text-white shadow-sm' : 'bg-rose-600 text-white shadow-sm'
                            }`}
                          >
                            {isAvail ? '☑ Disponible' : '☐ Agotado'}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="disableCatalogFull"
                      checked={disableCatalogProducts}
                      onChange={e => setDisableCatalogProducts(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                    />
                    <label htmlFor="disableCatalogFull" className="text-xs font-extrabold text-slate-700 cursor-pointer">
                      Desactivar disponibilidad del producto agotado en catálogo
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSaveDisponibilidad(order)}
                    disabled={processingId === order.id}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase rounded-2xl shadow-lg shadow-blue-600/20 cursor-pointer transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {processingId === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Guardar Disponibilidad / Enviar Cambios
                  </button>
                </div>

                {/* COLUMNA 3: VERIFICACIÓN DE PAGO, REEMBOLSO & ACEPTACIÓN DEFINITIVA */}
                <div className="space-y-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-amber-500" />
                      3. Pago & Aceptación del Pedido
                    </h3>

                    {/* Estado del Pago */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-bold">Estado del Pago:</span>
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase ${
                          isPaymentVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                        }`}>
                          {order.payment?.estado || 'PENDIENTE'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between font-black text-slate-900 pt-1 border-t border-slate-200">
                        <span>Total del Pedido:</span>
                        <span className="text-emerald-600 text-base">${totalVal.toFixed(2)}</span>
                      </div>

                      {evidenceUrl && (
                        <div className="pt-2 border-t border-slate-200">
                          <a
                            href={evidenceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <Eye className="w-4 h-4 text-amber-600" /> Ver Comprobante Adjunto
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Botones de Verificación de Pago */}
                    {!isPaymentVerified && order.estado === 'RECIBIDO' && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleVerifyPayment(order.id)}
                          disabled={processingId === order.id}
                          className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase rounded-2xl shadow-md cursor-pointer transition-all"
                        >
                          ✓ Verificar Pago
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectPayment(order.id)}
                          disabled={processingId === order.id}
                          className="py-3 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase rounded-2xl shadow-md cursor-pointer transition-all"
                        >
                          ✕ Rechazar Pago
                        </button>
                      </div>
                    )}

                    {/* Selector de Tiempo de Preparación */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <label className="block text-[11px] font-black uppercase text-slate-500 tracking-wider">
                        ⏰ Tiempo Estimado de Preparación
                      </label>
                      <div className="grid grid-cols-5 gap-1.5">
                        {[15, 20, 30, 45, 60].map(mins => (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => setSelectedPrepTime(mins)}
                            className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                              selectedPrepTime === mins
                                ? 'bg-amber-500 text-white shadow-md scale-[1.05]'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {mins}m
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* GESTIÓN DE REEMBOLSO INDEPENDIENTE (SI APLICA) */}
                    {hasPendingRefund && (
                      <div className="bg-rose-50 p-4 rounded-2xl border border-rose-200 space-y-3 text-xs">
                        <div className="flex items-center justify-between font-black text-rose-950">
                          <span>🔴 REEMBOLSO PENDIENTE:</span>
                          <span className="text-base text-rose-600">${(Number(order.payment?.montoExcedente) || 0).toFixed(2)}</span>
                        </div>

                        <div className="space-y-2">
                          <select
                            value={refundMethod}
                            onChange={e => setRefundMethod(e.target.value)}
                            className="w-full p-2 bg-white border border-rose-200 rounded-xl font-bold text-xs"
                          >
                            <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                            <option value="EFECTIVO">Efectivo en Caja</option>
                            <option value="OTRO">Otro Método</option>
                          </select>
                          <input
                            type="text"
                            value={refundRef}
                            onChange={e => setRefundRef(e.target.value)}
                            placeholder="Nº Comprobante devolución..."
                            className="w-full p-2 bg-white border border-rose-200 rounded-xl font-semibold text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => handleConfirmRefund(order)}
                            disabled={processingId === order.id}
                            className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase rounded-xl shadow-md transition-all cursor-pointer"
                          >
                            Confirmar Devolución ($3.00)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* BOTÓN DEFINITIVO ACEPTAR PEDIDO */}
                  <div className="pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleAcceptOrderToKitchen(order)}
                      disabled={!canAcceptOrder || processingId === order.id}
                      className={`w-full py-4 text-xs font-black uppercase rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-all ${
                        canAcceptOrder
                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-emerald-500/20 active:scale-98 cursor-pointer'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                      }`}
                    >
                      {processingId === order.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Check className="w-5 h-5 stroke-[3]" />
                      )}
                      <span>
                        {canAcceptOrder
                          ? `✅ ACEPTAR PEDIDO Y ENVIAR A COCINA (${selectedPrepTime} MIN)`
                          : 'Aceptar Pedido (Requiere Productos OK + Pago Verificado)'}
                      </span>
                    </button>
                  </div>

                </div>

              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}
