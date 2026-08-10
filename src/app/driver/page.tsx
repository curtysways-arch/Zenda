/**
 * @file page.tsx
 * @module app/driver
 * @description App Web de Repartidores NATIVA para Citiox Enterprise vNext.
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Truck, CheckCircle, XCircle, Navigation, MapPin, Phone,
  Clock, ShieldAlert, PackageCheck, AlertCircle, RefreshCw, Power, DollarSign,
  Map, Sparkles, Store, Building2, ExternalLink, Lock, ArrowLeft, Share2,
  MessageCircle, MoreHorizontal, ChefHat, AlertTriangle, Check
} from 'lucide-react';
import DriverOrderMapModal from '@/components/driver/DriverOrderMapModal';

interface DbOrder {
  id: string;
  numeroPedido: number;
  codigo?: string;
  nombreCliente: string;
  telefonoCliente: string;
  direccionCliente?: string;
  referenciaCliente?: string;
  latitud?: number;
  longitud?: number;
  estado: string;
  total: number;
  costoEnvio?: number;
  paymentStatus?: string;
  createdAt: string;
  extraInfo?: any;
  negocio?: {
    id: string;
    nombre: string;
    slug: string;
    logoUrl?: string;
    direccion?: string;
  };
  items: Array<{
    id?: string;
    nombreProducto: string;
    cantidad: number;
    precioUnitario: number;
  }>;
}

export default function DriverAppPage() {
  const slug = 'parrilla-citiox-demo'; // Negocio piloto por defecto
  const [driverId] = useState<string>('driver-01');
  const [driverName] = useState<string>('Marco Proaño');
  const [driverPhone] = useState<string>('0991234567');
  const [status, setStatus] = useState<'DISPONIBLE' | 'DESCANSO' | 'DESCONECTADO'>('DISPONIBLE');

  const [availableDbOrders, setAvailableDbOrders] = useState<DbOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [nowTime, setNowTime] = useState<number>(Date.now());
  const [inputPins, setInputPins] = useState<{ [orderId: string]: string }>({});

  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<DbOrder | null>(null);

  // Reloj en tiempo real para los contadores
  useEffect(() => {
    const timer = setInterval(() => setNowTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Cargar estado inicial y registrar repartidor
  useEffect(() => {
    registerDriver();
    const interval = setInterval(fetchDriverData, 4000); // Polling cada 4s
    return () => clearInterval(interval);
  }, []);

  const registerDriver = async () => {
    try {
      await fetch(`/api/public/${slug}/driver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REGISTER_OR_UPDATE_DRIVER',
          driverId,
          name: driverName,
          phone: driverPhone,
          vehicleType: 'MOTO',
          status,
        }),
      });
      await fetchDriverData();
    } catch (e) {
      console.error('Error registrando repartidor:', e);
    }
  };

  const fetchDriverData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/public/${slug}/driver?driverId=${driverId}`);
      if (res.ok) {
        const data = await res.json();
        setAvailableDbOrders(data.availableDbOrders || []);
      }
    } catch (e) {
      console.error('Error cargando pedidos de repartidor:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: 'DISPONIBLE' | 'DESCANSO' | 'DESCONECTADO') => {
    setStatus(newStatus);
    try {
      await fetch(`/api/public/${slug}/driver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SET_STATUS',
          driverId,
          status: newStatus,
        }),
      });
      fetchDriverData();
    } catch (e) {
      console.error('Error cambiando estado:', e);
    }
  };

  const handleAcceptOrder = async (orderId: string) => {
    setActionLoading(orderId);
    try {
      await fetch(`/api/public/${slug}/driver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ACCEPT_TASK',
          orderId,
          driverId,
          name: driverName,
          phone: driverPhone,
        }),
      });
      setSelectedOrderForDetail(null);
      fetchDriverData();
    } catch (e) {
      console.error('Error aceptando pedido:', e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkArrived = async (orderId: string) => {
    setActionLoading(orderId);
    try {
      await fetch(`/api/public/${slug}/driver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'MARK_ARRIVED',
          orderId,
          driverId,
          name: driverName,
          phone: driverPhone,
        }),
      });
      fetchDriverData();
    } catch (e) {
      console.error('Error marcando llegada:', e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateState = async (orderId: string, nextState: 'ON_ROUTE' | 'DELIVERED') => {
    setActionLoading(orderId);
    try {
      await fetch(`/api/public/${slug}/driver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_DELIVERY_STATE',
          orderId,
          nextState,
        }),
      });
      fetchDriverData();
    } catch (e) {
      console.error('Error cambiando estado de entrega:', e);
    } finally {
      setActionLoading(null);
    }
  };

  const parseExtraInfo = (extra: any) => {
    if (!extra) return {};
    if (typeof extra === 'string') {
      try { return JSON.parse(extra); } catch { return {}; }
    }
    return extra;
  };

  // Mis pedidos aceptados vs Pedidos disponibles en bolsa de trabajo
  const myAssignedOrders = availableDbOrders.filter(o => {
    const extra = parseExtraInfo(o.extraInfo);
    return extra.assignedDriverId === driverId || 
      ['REPARTIDOR_ASIGNADO', 'REPARTIDOR_EN_LOCAL', 'ENTREGADO_A_REPARTIDOR', 'EN_CAMINO', 'EN_RUTA', 'ESPERANDO_CLIENTE', 'WAITING_CLIENT'].includes(o.estado);
  });

  const openUnassignedOrders = availableDbOrders.filter(o => {
    const extra = parseExtraInfo(o.extraInfo);
    return !extra.assignedDriverId && 
      ['EN_PREPARACION', 'ACEPTADO', 'LISTO'].includes(o.estado);
  });

  const hasActiveOrder = myAssignedOrders.length > 0;

  // Calcular distancia en Km entre local y cliente
  const getDistanceString = (order: DbOrder) => {
    const extra = parseExtraInfo(order.extraInfo);
    const breakdownDist = extra?.pricingBreakdown?.distanceKm;
    if (typeof breakdownDist === 'number' && breakdownDist > 0) {
      return `${breakdownDist.toFixed(1)} km`;
    }
    if (order.latitud && order.longitud) {
      const R = 6371;
      const lat1 = -0.180653;
      const lon1 = -78.467838;
      const dLat = ((order.latitud - lat1) * Math.PI) / 180;
      const dLon = ((order.longitud - lon1) * Math.PI) / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((order.latitud * Math.PI) / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const dist = Math.round(R * c * 10) / 10;
      return `${dist > 0 ? dist : 2.5} km`;
    }
    return '2.8 km aprox.';
  };

  // Calcular cuenta regresiva
  const getCountdownString = (estimatedReadyAt?: string) => {
    if (!estimatedReadyAt) return '15:00';
    const target = new Date(estimatedReadyAt).getTime();
    const diff = Math.max(0, Math.floor((target - nowTime) / 1000));
    const mins = Math.floor(diff / 60);
    const secs = diff % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans pb-32">
      {/* HEADER NATIVO CON LOGO COMPLETO CITIOX DRIVER SIN RECORTES */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-950 text-white p-4 sticky top-0 z-50 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="h-11 w-auto max-w-[140px] flex items-center justify-center shrink-0">
            <img src="/citiox-driver-logo.png" alt="CiTiOX Driver Logo" className="h-full w-auto object-contain rounded-xl shadow-md" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                status === 'DISPONIBLE' ? 'bg-emerald-500/20 text-emerald-300' :
                status === 'DESCANSO' ? 'bg-amber-500/20 text-amber-300' :
                'bg-rose-500/20 text-rose-300'
              }`}>
                {status}
              </span>
            </div>
            <p className="text-xs text-slate-300 font-bold mt-0.5">{driverName} • Repartidor Oficial</p>
          </div>
        </div>

        <button
          onClick={fetchDriverData}
          className="p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-blue-400 transition-all cursor-pointer shadow-md"
          title="Refrescar datos"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* CONDITIONAL VISTA 1: GESTIÓN DE CARRERA ACTIVA */}
      {hasActiveOrder ? (
        myAssignedOrders.map(order => {
          const extra = parseExtraInfo(order.extraInfo);
          const isCashOnDelivery = order.paymentStatus !== 'CONFIRMADO' && order.paymentStatus !== 'PAGO_VERIFICADO';
          const deliveryFee = Number(order.costoEnvio || 2.50).toFixed(2);
          const totalToCollect = Number(order.total || 0).toFixed(2);
          const distanceStr = getDistanceString(order);
          const isHandedOver = (order.estado as string) === 'ENTREGADO_A_REPARTIDOR' || (order.estado as string) === 'EN_CAMINO' || (order.estado as string) === 'EN_RUTA' || Boolean(extra?.isHandedOver || extra?.dispatchStatus === 'DESPACHADO');

          let expectedPickupCode = extra?.pickupCode;
          let expectedDeliveryCode = extra?.deliveryCode;
          if (!expectedPickupCode) {
            let num = 0; const str = (order.id || '') + 'pickup';
            for (let i = 0; i < str.length; i++) num = (num * 31 + str.charCodeAt(i)) % 9000;
            expectedPickupCode = String(1000 + Math.abs(num));
          }
          if (!expectedDeliveryCode) {
            let num = 0; const str = (order.id || '') + 'delivery';
            for (let i = 0; i < str.length; i++) num = (num * 31 + str.charCodeAt(i)) % 9000;
            expectedDeliveryCode = String(1000 + Math.abs(num));
          }

          const enteredPin = inputPins[order.id] || '';
          const isPinValid = enteredPin.trim() === expectedDeliveryCode;

          return (
            <div key={order.id} className="space-y-4">
              {/* CABECERA CURVADA AZUL SIN BORDES */}
              <div className="bg-gradient-to-b from-blue-700 via-blue-800 to-indigo-900 text-white pt-6 pb-16 px-5 rounded-b-[2.5rem] shadow-xl relative">
                <div className="flex items-center justify-between">
                  <button 
                    onClick={() => setSelectedOrderForDetail(null)}
                    className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-6 h-6" />
                  </button>
                  <div className="text-center">
                    <h2 className="text-xl font-black tracking-tight">Entrega en curso</h2>
                    <p className="text-sm text-blue-200 font-bold mt-0.5">Pedido #{order.codigo || order.numeroPedido || order.id.slice(-6).toUpperCase()}</p>
                  </div>
                  <a 
                    href={`tel:${order.telefonoCliente}`}
                    className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all cursor-pointer"
                  >
                    <Phone className="w-6 h-6" />
                  </a>
                </div>
              </div>

              {/* TARJETA HERO FLOTANTE DE ESTADO (SIN BORDES, SOMBRA ELEVADA) */}
              <div className="max-w-md mx-auto px-4 -mt-12 relative z-10">
                <div className="bg-white rounded-3xl p-5 shadow-xl shadow-slate-300/60 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-3xl shadow-lg shadow-blue-500/30">
                      🛵
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-base leading-tight">
                        {order.estado === 'EN_CAMINO' || order.estado === 'EN_RUTA' ? 'En camino al cliente' :
                         order.estado === 'REPARTIDOR_EN_LOCAL' ? 'En el local del restaurante' :
                         order.estado === 'ESPERANDO_CLIENTE' || order.estado === 'WAITING_CLIENT' ? 'Llegaste al destino' :
                         'Repartidor Asignado'}
                      </h3>
                      <p className="text-sm text-slate-500 font-medium mt-1">Lleva tu pedido de forma segura</p>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-3 rounded-2xl text-center shrink-0 min-w-[85px]">
                    <span className="text-base font-black text-blue-600 font-mono block">
                      {getCountdownString(order.extraInfo?.estimatedReadyAt)}
                    </span>
                    <span className="text-xs text-blue-500 font-bold block mt-0.5">min restantes</span>
                  </div>
                </div>
              </div>

              {/* CONTENIDO PRINCIPAL DE TARJETAS NATIVAS SIN BORDES */}
              <div className="max-w-md mx-auto px-4 space-y-4">

                {/* TARJETA 1: 📍 DESTINO */}
                <div className="bg-white rounded-3xl p-5 shadow-md shadow-slate-200/70 space-y-4 text-left">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black uppercase text-blue-600 tracking-wider flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-blue-600" /> DESTINO
                      </span>
                      <h3 className="text-lg font-black text-slate-900 mt-1">{order.nombreCliente}</h3>
                      <p className="text-sm text-slate-600 font-semibold mt-1">{order.direccionCliente || 'Dirección registrada en pedido'}</p>
                      {order.referenciaCliente && (
                        <p className="text-xs text-slate-400 font-medium mt-1">Referencia: {order.referenciaCliente}</p>
                      )}
                    </div>

                    {/* BOTÓN CIRCULAR FLOTANTE NAVEGAR */}
                    {order.direccionCliente && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.direccionCliente)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-16 h-16 rounded-full bg-blue-50 hover:bg-blue-100 flex flex-col items-center justify-center text-blue-600 font-bold shadow-md transition-all shrink-0 cursor-pointer"
                      >
                        <Navigation className="w-6 h-6 fill-blue-600 text-blue-600" />
                        <span className="text-[10px] font-black tracking-wider mt-0.5">NAVEGAR</span>
                      </a>
                    )}
                  </div>

                  {/* 3 COLUMNAS DE ACCIÓN (LLAMAR, DISTANCIA, MENSAJE WHATSAPP) */}
                  <div className="pt-4 border-t border-slate-100 grid grid-cols-3 divide-x divide-slate-100 text-center">
                    <a href={`tel:${order.telefonoCliente}`} className="px-2 py-2 group">
                      <Phone className="w-6 h-6 text-blue-600 mx-auto group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-black text-slate-800 block mt-1.5">Llamar</span>
                    </a>

                    <div className="px-2 py-2">
                      <span className="text-sm font-black text-slate-900 block">{distanceStr}</span>
                      <span className="text-xs text-slate-400 font-semibold block mt-0.5">Distancia</span>
                    </div>

                    <a 
                      href={`https://wa.me/${order.telefonoCliente?.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2 py-2 group"
                    >
                      <MessageCircle className="w-6 h-6 text-blue-600 mx-auto group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-black text-slate-800 block mt-1.5">Mensaje</span>
                    </a>
                  </div>
                </div>

                {/* TARJETA 2: 🛍️ DETALLES DEL PEDIDO */}
                <div className="bg-white rounded-3xl p-5 shadow-md shadow-slate-200/70 space-y-4 text-left">
                  <span className="text-xs font-black uppercase text-blue-600 tracking-wider flex items-center gap-1.5">
                    <PackageCheck className="w-4 h-4 text-blue-600" /> DETALLES DEL PEDIDO
                  </span>

                  <div className="space-y-3 text-sm pt-1">
                    {(order.items || []).map((it, idx) => (
                      <div key={idx} className="flex justify-between items-center text-slate-800 font-semibold">
                        <span>{it.cantidad}x {it.nombreProducto}</span>
                        <span className="font-black text-slate-900">${(Number(it.precioUnitario) * it.cantidad).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center text-slate-500 text-xs font-medium">
                      <span>Empaque</span>
                      <span className="font-bold">${(Number(extra?.packagingCost || 0)).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-base font-black text-slate-900">
                    <span>Total del pedido</span>
                    <span className="text-lg">${totalToCollect}</span>
                  </div>
                </div>

                {/* TARJETA 3: 🛵 INFORMACIÓN DE ENTREGA */}
                <div className="bg-white rounded-3xl p-5 shadow-md shadow-slate-200/70 space-y-4 text-left">
                  <span className="text-xs font-black uppercase text-blue-600 tracking-wider flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-blue-600" /> INFORMACIÓN DE ENTREGA
                  </span>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 font-semibold flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-blue-600" /> Ganancia por envío
                      </span>
                      <span className="font-black text-blue-600 text-lg">+${deliveryFee}</span>
                    </div>

                    <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                      <span className="text-slate-600 font-semibold flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-slate-400" /> Pago del cliente
                      </span>
                      <span className="font-bold text-slate-900">
                        {isCashOnDelivery ? `💰 Efectivo ($${totalToCollect})` : '💳 Pagado Online ($0.00)'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                      <span className="text-slate-600 font-semibold flex items-center gap-2">
                        <Clock className="w-5 h-5 text-slate-400" /> Entrega solicitada
                      </span>
                      <span className="font-bold text-slate-900">Hoy, {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>

                {/* TARJETA 4: 🔔 CLIENTE NOTIFICADO */}
                <div className="bg-blue-50/90 rounded-3xl p-5 flex items-center justify-between text-left shadow-sm">
                  <div className="space-y-1">
                    <span className="text-xs font-black text-blue-900 uppercase tracking-wider block flex items-center gap-1.5">
                      🔔 CLIENTE NOTIFICADO
                    </span>
                    <p className="text-xs text-blue-800 font-semibold">El cliente ha sido notificado que su pedido está en camino.</p>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md">
                    <Check className="w-6 h-6 stroke-[3]" />
                  </div>
                </div>

                {/* TARJETA 5: HERRAMIENTAS */}
                <div className="space-y-2 text-left">
                  <span className="text-xs font-black uppercase text-slate-400 tracking-wider block px-1">
                    HERRAMIENTAS
                  </span>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <button 
                      onClick={() => alert(`Enlace de seguimiento: https://citiox.com/pedido/${order.id}`)}
                      className="bg-white rounded-2xl p-4 text-xs font-black text-slate-800 hover:bg-slate-50 transition-all cursor-pointer flex flex-col items-center gap-2 shadow-md shadow-slate-200/50"
                    >
                      <Share2 className="w-5 h-5 text-blue-600" />
                      <span>Compartir</span>
                    </button>

                    <button 
                      onClick={() => alert('Soporte notificado. El equipo te contactará de inmediato.')}
                      className="bg-white rounded-2xl p-4 text-xs font-black text-slate-800 hover:bg-slate-50 transition-all cursor-pointer flex flex-col items-center gap-2 shadow-md shadow-slate-200/50"
                    >
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                      <span>Problema</span>
                    </button>

                    <button 
                      onClick={() => alert('Para cancelar esta carrera contacta al administrador.')}
                      className="bg-white rounded-2xl p-4 text-xs font-black text-slate-800 hover:bg-slate-50 transition-all cursor-pointer flex flex-col items-center gap-2 shadow-md shadow-slate-200/50"
                    >
                      <XCircle className="w-5 h-5 text-rose-500" />
                      <span>Cancelar</span>
                    </button>
                  </div>
                </div>

                {/* VISTA Y LÓGICA DE VALIDACIÓN DE PIN SEGÚN ESTADO OPERATIVO */}
                {(order.estado === 'REPARTIDOR_EN_LOCAL' || order.estado === 'ENTREGADO_A_REPARTIDOR') && (
                  <div className="bg-white rounded-3xl p-5 shadow-md shadow-slate-200/70 space-y-3 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-amber-600 flex items-center gap-1.5">
                        🔑 PIN Retiro en Local: {expectedPickupCode}
                      </span>
                    </div>

                    <div className={`p-4 rounded-2xl text-xs font-black text-center flex items-center justify-center gap-2 ${
                      isHandedOver 
                        ? 'bg-emerald-50 text-emerald-800' 
                        : 'bg-amber-50 text-amber-900'
                    }`}>
                      <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                      <span>
                        {isHandedOver 
                          ? '📦 ¡Paquete Despachado por Restaurante! Puedes salir en ruta.' 
                          : `⏳ Dicta el PIN (${expectedPickupCode}) al local para que entregue la comanda.`}
                      </span>
                    </div>
                  </div>
                )}

                {(order.estado === 'ESPERANDO_CLIENTE' || order.estado === 'WAITING_CLIENT') && (
                  <div className="bg-white rounded-3xl p-5 shadow-md shadow-slate-200/70 space-y-3 text-left">
                    <span className="text-xs font-black uppercase text-amber-600 flex items-center gap-1.5">
                      🔑 PIN DE CONFIRMACIÓN DEL CLIENTE
                    </span>
                    <input
                      type="text"
                      maxLength={4}
                      value={enteredPin}
                      onChange={e => setInputPins(prev => ({ ...prev, [order.id]: e.target.value.trim() }))}
                      placeholder="Ingresa PIN de 4 dígitos (Ej: 5955)..."
                      className="w-full p-4 bg-slate-50 border-none rounded-2xl text-center text-xl font-black text-slate-900 tracking-widest outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    {enteredPin.length === 4 && !isPinValid && (
                      <p className="text-xs text-rose-600 font-bold text-center">❌ PIN incorrecto. Pide al cliente su código.</p>
                    )}
                    {isPinValid && (
                      <p className="text-xs text-emerald-600 font-bold text-center">✅ ¡PIN Correcto! Puedes confirmar la entrega.</p>
                    )}
                  </div>
                )}

              </div>

              {/* BARRA INFERIOR FIJA CON BOTÓN PRINCIPAL GIGANTE ESTILO IMAGE 1 */}
              <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md z-50 flex items-center gap-3 max-w-md mx-auto shadow-2xl">
                {order.estado === 'REPARTIDOR_ASIGNADO' && (
                  <button
                    onClick={() => handleMarkArrived(order.id)}
                    disabled={actionLoading === order.id}
                    className="flex-1 py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 rounded-2xl text-sm font-black uppercase shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                  >
                    <MapPin className="w-5 h-5 text-slate-950" />
                    <span>📍 Marcar Llegada al Restaurante</span>
                  </button>
                )}

                {(order.estado === 'REPARTIDOR_EN_LOCAL' || order.estado === 'ENTREGADO_A_REPARTIDOR') && (
                  <button
                    onClick={() => handleUpdateState(order.id, 'ON_ROUTE')}
                    disabled={!isHandedOver || actionLoading === order.id}
                    className={`flex-1 py-4 rounded-2xl text-sm font-black uppercase shadow-xl flex items-center justify-center gap-2 transition-all ${
                      isHandedOver
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white cursor-pointer active:scale-98 shadow-blue-500/20'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {isHandedOver ? (
                      <>
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                          <Check className="w-5 h-5 text-white stroke-[3]" />
                        </div>
                        <span>🛵 INICIAR ENTREGA AL CLIENTE</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-5 h-5 text-slate-400 shrink-0" />
                        <span>🔒 ESPERANDO QUE EL LOCAL MARQUE ENTREGA</span>
                      </>
                    )}
                  </button>
                )}

                {(order.estado === 'EN_CAMINO' || order.estado === 'EN_RUTA') && (
                  <button
                    onClick={() => handleUpdateState(order.id, 'WAITING_CLIENT' as any)}
                    disabled={actionLoading === order.id}
                    className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-sm font-black uppercase shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 shadow-blue-500/20"
                  >
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-white" />
                    </div>
                    <span>📍 LLEGUÉ AL DESTINO (EN ESPERA)</span>
                  </button>
                )}

                {(order.estado === 'ESPERANDO_CLIENTE' || order.estado === 'WAITING_CLIENT') && (
                  <button
                    onClick={() => handleUpdateState(order.id, 'DELIVERED')}
                    disabled={!isPinValid || actionLoading === order.id}
                    className={`flex-1 py-4 rounded-2xl text-sm font-black uppercase shadow-xl flex items-center justify-center gap-2 transition-all ${
                      isPinValid
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white cursor-pointer active:scale-98 shadow-blue-500/20'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                      <Check className="w-5 h-5 text-white stroke-[3]" />
                    </div>
                    <div>
                      <span className="block leading-tight">PEDIDO ENTREGADO</span>
                      <span className="text-[10px] font-semibold opacity-90 block">Confirmar entrega al cliente</span>
                    </div>
                  </button>
                )}

                <button 
                  onClick={() => alert(`Acciones adicionales para pedido #${order.numeroPedido}`)}
                  className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-md shadow-slate-200/60"
                >
                  <MoreHorizontal className="w-6 h-6" />
                </button>
              </div>
            </div>
          );
        })
      ) : (
        /* VISTA 2: MODO BÚSQUEDA / BOLSA DE TRABAJO (SOLO SI NO HAY CARRERA ACTIVA) */
        <>
          {/* Selector de Estado de Disponibilidad (SIN BORDES, SOMBRA ELEVADA) */}
          <div className="p-4 max-w-md mx-auto">
            <div className="bg-white rounded-3xl p-5 shadow-md shadow-slate-200/70 space-y-4 text-left">
              <label className="block text-xs font-black uppercase text-slate-500 tracking-wider">
                MI DISPONIBILIDAD ACTUAL
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleStatusChange('DISPONIBLE')}
                  className={`py-4 px-2 rounded-2xl text-xs font-black flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    status === 'DISPONIBLE'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>DISPONIBLE</span>
                </button>
                <button
                  onClick={() => handleStatusChange('DESCANSO')}
                  className={`py-4 px-2 rounded-2xl text-xs font-black flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    status === 'DESCANSO'
                      ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Clock className="w-5 h-5" />
                  <span>DESCANSO</span>
                </button>
                <button
                  onClick={() => handleStatusChange('DESCONECTADO')}
                  className={`py-4 px-2 rounded-2xl text-xs font-black flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    status === 'DESCONECTADO'
                      ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Power className="w-5 h-5" />
                  <span>OFFLINE</span>
                </button>
              </div>
            </div>
          </div>

          {/* PEDIDOS DISPONIBLES EN BOLSA DE TRABAJO */}
          {status === 'DISPONIBLE' && (
            <div className="p-4 max-w-md mx-auto space-y-4 text-left">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-black uppercase text-blue-600 tracking-wider flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-600 animate-spin" />
                  Bolsa de Pedidos Disponibles ({openUnassignedOrders.length})
                </h2>
              </div>

              {openUnassignedOrders.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 text-center text-slate-400 space-y-3 shadow-md shadow-slate-200/70">
                  <PackageCheck className="w-12 h-12 mx-auto text-slate-300" />
                  <p className="font-black text-sm text-slate-800">No hay pedidos disponibles en este momento.</p>
                  <p className="text-xs text-slate-500">Nuevos pedidos aparecerán aquí cuando los restaurantes los acepten.</p>
                </div>
              ) : (
                openUnassignedOrders.map(order => {
                  const deliveryFee = Number(order.costoEnvio || 2.50).toFixed(2);

                  return (
                    <div
                      key={order.id}
                      className="bg-white rounded-3xl p-6 shadow-md shadow-slate-200/70 space-y-4 hover:shadow-lg transition-all cursor-pointer"
                      onClick={() => setSelectedOrderForDetail(order)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black text-slate-900">
                          #{order.codigo || order.numeroPedido || order.id.slice(-6).toUpperCase()}
                        </span>
                        <span className="px-3.5 py-1.5 bg-blue-50 text-blue-600 font-black text-xs rounded-full">
                          +${deliveryFee} Ganancia
                        </span>
                      </div>

                      <div className="space-y-1.5 text-sm text-slate-600">
                        <p className="font-black text-slate-900 text-base">{order.negocio?.nombre || 'Restaurante Citiox'}</p>
                        <p className="font-semibold text-slate-600">📍 Recogida: {order.negocio?.direccion || 'Local Principal'}</p>
                        <p className="font-semibold text-slate-600">📍 Entrega: {order.direccionCliente || 'Domicilio Cliente'}</p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAcceptOrder(order.id);
                        }}
                        disabled={actionLoading === order.id}
                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-sm font-black uppercase shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                      >
                        <Truck className="w-5 h-5 text-white" />
                        <span>Aceptar Carrera (+${deliveryFee})</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}

      {/* MODAL DE MAPA INTERACTIVO Y RUTA */}
      {selectedOrderForDetail && (
        <DriverOrderMapModal
          order={selectedOrderForDetail}
          driverId={driverId}
          hasActiveOrder={hasActiveOrder}
          actionLoading={actionLoading === selectedOrderForDetail.id}
          onAccept={handleAcceptOrder}
          onClose={() => setSelectedOrderForDetail(null)}
        />
      )}
    </div>
  );
}
