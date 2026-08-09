'use client';

import { useState, useEffect } from 'react';
import { 
  Globe, PackageCheck, Bike, ShoppingBag, Check, X, Clock, MapPin, Phone,
  User, Loader2, AlertCircle, RefreshCw, ChevronRight, DollarSign, Filter,
  MessageCircle, Printer, ExternalLink, Sparkles, Eye, ShieldCheck, AlertTriangle
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

  // Alerta Sonora y Pantalla Completa
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [alertOrder, setAlertOrder] = useState<Pedido | null>(null);

  // Modal de Disponibilidad & Propuesta de Cambios
  const [reviewingOrder, setReviewingOrder] = useState<Pedido | null>(null);
  const [selectedPrepTime, setSelectedPrepTime] = useState<number>(20);
  const [itemsAvailability, setItemsAvailability] = useState<Record<string, boolean>>({});
  const [disableCatalogProducts, setDisableCatalogProducts] = useState(true);

  // Modal de Confirmación de Reembolso
  const [refundingOrder, setRefundingOrder] = useState<Pedido | null>(null);
  const [refundMethod, setRefundMethod] = useState<string>('TRANSFERENCIA');
  const [refundRef, setRefundRef] = useState<string>('');
  const [refundNotes, setRefundNotes] = useState<string>('');

  const fetchOnlineOrders = async () => {
    try {
      const res = await fetch('/api/admin/pedidos');
      if (res.ok) {
        const data = await res.json();
        // Filtrar pedidos de canal web / online
        const onlineOnly = (data || []).filter((p: any) => {
          const ch = (p.extraInfo?.channel || p.extraInfo?.canal || 'WEB').toUpperCase();
          return ch !== 'POS' && ch !== 'MOSTRADOR';
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
    const interval = setInterval(fetchOnlineOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  // Abrir Modal de Revisión y cargar disponibilidad inicial (☑ todo disponible por defecto)
  const handleOpenReview = (pedido: Pedido) => {
    setReviewingOrder(pedido);
    const initialAvailability: Record<string, boolean> = {};
    (pedido.items || []).forEach(it => {
      initialAvailability[it.id] = true;
    });
    setItemsAvailability(initialAvailability);
  };

  // 1. CONFIRMAR DISPONIBILIDAD O ENVIAR PROPUESTA DE CAMBIOS
  const handleSaveDisponibilidad = async () => {
    if (!reviewingOrder) return;
    setProcessingId(reviewingOrder.id);

    const outOfStockItems = reviewingOrder.items.filter(it => itemsAvailability[it.id] === false);
    const isAllAvailable = outOfStockItems.length === 0;

    try {
      if (isAllAvailable) {
        // Todo disponible -> PRODUCTOS_CONFIRMADOS
        await fetch('/api/admin/pedidos', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: reviewingOrder.id,
            action: 'CONFIRMAR_DISPONIBILIDAD'
          })
        });
      } else {
        // Producto agotado -> Enviar propuesta de cambios a cliente (NO genera reembolso aún)
        const proposedItems = reviewingOrder.items
          .filter(it => itemsAvailability[it.id] !== false)
          .map(it => ({
            id: it.id,
            productoId: it.productoId,
            nombreProducto: it.nombreProducto,
            cantidad: it.cantidad,
            precioUnitario: it.precioUnitario
          }));

        const newSubtotal = proposedItems.reduce((sum, it) => sum + (it.precioUnitario * it.cantidad), 0);
        const shippingCost = Number(reviewingOrder.costoEnvio || 0);
        const newTotal = newSubtotal + shippingCost;
        const outOfStockProductIds = outOfStockItems.map(it => it.productoId).filter(Boolean);

        await fetch('/api/admin/pedidos', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: reviewingOrder.id,
            action: 'SOLICITAR_CAMBIOS',
            proposedItems,
            subtotal: newSubtotal,
            total: newTotal,
            outOfStockProductIds,
            disableOutOfStock: disableCatalogProducts
          })
        });
      }

      setReviewingOrder(null);
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
  const handleAcceptOrderToKitchen = async (pedido: Pedido) => {
    setProcessingId(pedido.id);
    try {
      await fetch('/api/admin/pedidos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: pedido.id,
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

  // 4. CONFIRMAR DEVOLUCIÓN FINANCIERA DE REEMBOLSO (REEMBOLSO_PENDIENTE -> REEMBOLSADO)
  const handleConfirmRefund = async () => {
    if (!refundingOrder) return;
    setProcessingId(refundingOrder.id);
    try {
      await fetch('/api/admin/pedidos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: refundingOrder.id,
          action: 'CONFIRMAR_DEVOLUCION',
          metodoDevolucion: refundMethod,
          referenciaDevolucion: refundRef,
          observacionDevolucion: refundNotes
        })
      });
      setRefundingOrder(null);
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
            <p className="text-xs text-slate-400 font-medium">Revisión de disponibilidad, verificación de pago y cocina</p>
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
            const isProdConfirmed = pedido.estadoDisponibilidad === 'PRODUCTOS_CONFIRMADOS' || pedido.estadoDisponibilidad === 'CAMBIOS_ACEPTADOS';
            const isPaymentVerified = pedido.payment?.estado === 'PAGO_VERIFICADO' || pedido.payment?.estado === 'CONFIRMADO';
            const canAcceptOrder = isProdConfirmed && isPaymentVerified && pedido.estado === 'RECIBIDO';
            const hasPendingRefund = pedido.payment?.estado === 'REEMBOLSO_PENDIENTE';

            return (
              <div
                key={pedido.id}
                className={`bg-white rounded-3xl p-5 border shadow-sm space-y-3.5 transition-all hover:shadow-md relative text-left ${
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
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 block">
                      {isDelivery ? '🛵 Delivery Online' : '🏬 Para Retirar'}
                    </span>
                    <h3 className="text-lg font-black text-slate-900 leading-tight">
                      #{pedido.codigo || pedido.id.slice(-6).toUpperCase()}
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
                      <span>{it.cantidad}x {it.nombreProducto}</span>
                      <span>${(it.precioUnitario * it.cantidad).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="pt-2 mt-1 border-t border-slate-200 flex justify-between font-black text-slate-900">
                    <span>Total:</span>
                    <span className="text-emerald-600 text-sm">${pedido.total.toFixed(2)}</span>
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
                        <span className="text-sm">${pedido.payment?.montoExcedente?.toFixed(2)}</span>
                      </div>
                      <button
                        onClick={() => setRefundingOrder(pedido)}
                        className="w-full py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-black text-[10px] uppercase shadow-md transition-colors cursor-pointer"
                      >
                        Confirmar Devolución
                      </button>
                    </div>
                  )}
                </div>

                {/* PASOS DE CONTROL (REVISIÓN DE DISPONIBILIDAD -> PAGO -> ACEPTACIÓN) */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  
                  {/* Step 1: Disponibilidad */}
                  {pedido.estado === 'RECIBIDO' && (
                    <button
                      onClick={() => handleOpenReview(pedido)}
                      disabled={processingId === pedido.id}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <PackageCheck className="w-4 h-4" />
                      <span>Revisar Disponibilidad (☑ / ☐)</span>
                    </button>
                  )}

                  {/* Step 2: Verificación de Pago */}
                  {pedido.estado === 'RECIBIDO' && !isPaymentVerified && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleVerifyPayment(pedido.id)}
                        disabled={processingId === pedido.id}
                        className="py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase rounded-xl shadow-sm transition-all cursor-pointer"
                      >
                        ✓ Verificar Pago
                      </button>
                      <button
                        onClick={() => handleRejectPayment(pedido.id)}
                        disabled={processingId === pedido.id}
                        className="py-2 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase rounded-xl shadow-sm transition-all cursor-pointer"
                      >
                        ✕ Rechazar Pago
                      </button>
                    </div>
                  )}

                  {/* Step 3: Botón Definitivo [ ✅ Aceptar Pedido ] */}
                  {canAcceptOrder && (
                    <button
                      onClick={() => handleAcceptOrderToKitchen(pedido)}
                      disabled={processingId === pedido.id}
                      className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs uppercase rounded-2xl shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                    >
                      <Check className="w-5 h-5 stroke-[3]" />
                      <span>✅ Aceptar Pedido (Enviar a Cocina)</span>
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: REVISIÓN DE DISPONIBILIDAD & PROPUESTA DE CAMBIOS */}
      {reviewingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-600">Revisión de Productos</span>
                <h3 className="text-base font-black text-slate-900">Pedido #{reviewingOrder.codigo || reviewingOrder.id.slice(-6).toUpperCase()}</h3>
              </div>
              <button onClick={() => setReviewingOrder(null)} className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 font-medium">
              Marca los productos disponibles. Si desmarcas algún producto agotado, se enviará la propuesta de cambios al cliente.
            </p>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {reviewingOrder.items.map(item => {
                const isAvail = itemsAvailability[item.id] !== false;
                return (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 bg-slate-50 text-xs">
                    <span className="font-bold text-slate-900">{item.cantidad}x {item.nombreProducto}</span>
                    <button
                      type="button"
                      onClick={() => setItemsAvailability(prev => ({ ...prev, [item.id]: !isAvail }))}
                      className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer ${
                        isAvail ? 'bg-emerald-500 text-white' : 'bg-rose-600 text-white'
                      }`}
                    >
                      {isAvail ? '☑ Disponible' : '☐ Agotado'}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Opción rápida de desactivar en catálogo */}
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
              <input
                type="checkbox"
                id="disableCatalog"
                checked={disableCatalogProducts}
                onChange={e => setDisableCatalogProducts(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded cursor-pointer"
              />
              <label htmlFor="disableCatalog" className="text-xs font-extrabold text-slate-700 cursor-pointer">
                Desactivar disponibilidad del producto agotado en catálogo
              </label>
            </div>

            <div className="pt-3 border-t border-slate-100 flex gap-2">
              <button
                onClick={handleSaveDisponibilidad}
                disabled={processingId === reviewingOrder.id}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase rounded-2xl shadow-lg transition-all cursor-pointer"
              >
                Guardar Disponibilidad / Enviar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRMAR DEVOLUCIÓN DE REEMBOLSO INDEPENDIENTE */}
      {refundingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-left border-2 border-rose-300">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-rose-600">Gestión Financiera de Reembolso</span>
                <h3 className="text-base font-black text-slate-900">Pedido #{refundingOrder.codigo || refundingOrder.id.slice(-6).toUpperCase()}</h3>
              </div>
              <button onClick={() => setRefundingOrder(null)} className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-rose-50 p-3 rounded-2xl border border-rose-200 flex items-center justify-between text-xs font-black text-rose-950">
              <span>MONTO A DEVOLVER:</span>
              <span className="text-base text-rose-600">${refundingOrder.payment?.montoExcedente?.toFixed(2)}</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Método de Devolución</label>
                <select
                  value={refundMethod}
                  onChange={e => setRefundMethod(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                  <option value="EFECTIVO">Efectivo en Caja</option>
                  <option value="OTRO">Otro Método</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Número de Comprobante / Referencia</label>
                <input
                  type="text"
                  value={refundRef}
                  onChange={e => setRefundRef(e.target.value)}
                  placeholder="Ej: Transf #982341"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Observación</label>
                <input
                  type="text"
                  value={refundNotes}
                  onChange={e => setRefundNotes(e.target.value)}
                  placeholder="Devolución efectuada por ítem no disponible"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <button
                onClick={handleConfirmRefund}
                disabled={processingId === refundingOrder.id}
                className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase rounded-2xl shadow-lg transition-all cursor-pointer"
              >
                Confirmar Devolución ($3.00)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
