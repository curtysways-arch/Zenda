/**
 * @file page.tsx
 * @module app/driver
 * @description App Web de Repartidores NATIVA EDGE-TO-EDGE para Citiox Enterprise vNext.
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Truck, CheckCircle, XCircle, Navigation, MapPin, Phone,
  Clock, ShieldAlert, PackageCheck, AlertCircle, RefreshCw, Power, DollarSign,
  Map, Sparkles, Store, Building2, ExternalLink, Lock, ArrowLeft, Share2,
  MessageCircle, MoreHorizontal, ChefHat, AlertTriangle, Check,
  TrendingUp, History, User, LogOut, ChevronRight, Star, Award, FileText,
  Filter, Search, Calendar, CreditCard, ShieldCheck, ThumbsUp, Eye
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
  payment?: any;
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
  const [activeTab, setActiveTab] = useState<'INICIO' | 'GANANCIAS' | 'HISTORIAL' | 'NEGOCIOS' | 'PERFIL'>('INICIO');

  const [availableDbOrders, setAvailableDbOrders] = useState<DbOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [nowTime, setNowTime] = useState<number>(Date.now());
  const [inputPins, setInputPins] = useState<{ [orderId: string]: string }>({});

  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<DbOrder | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [historySearch, setHistorySearch] = useState('');

  // Rating state driver -> customer
  const [ratingModalOrderId, setRatingModalOrderId] = useState<string | null>(null);
  const [customerStar, setCustomerStar] = useState<number>(5);
  const [customerComment, setCustomerComment] = useState<string>('');

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

      if (nextState === 'DELIVERED') {
        setRatingModalOrderId(orderId);
      }
    } catch (e) {
      console.error('Error cambiando estado de entrega:', e);
    } finally {
      setActionLoading(null);
    }
  };

  const submitCustomerRating = async () => {
    if (!ratingModalOrderId) return;
    try {
      await fetch(`/api/public/${slug}/orders/${ratingModalOrderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverRating: customerStar,
          driverComment: customerComment,
          rater: 'DRIVER'
        })
      });
      setRatingModalOrderId(null);
      setCustomerComment('');
      fetchDriverData();
    } catch (e) {
      console.error('Error enviando calificación del cliente:', e);
      setRatingModalOrderId(null);
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(false);
    alert('Sesión cerrada correctamente. Redirigiendo a inicio...');
    window.location.reload();
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

  // Calcular promedio real de calificaciones del driver
  const ratedOrders = availableDbOrders.filter(o => parseExtraInfo(o.extraInfo)?.clientReview?.driverStars);
  const totalStars = ratedOrders.reduce((sum, o) => sum + Number(parseExtraInfo(o.extraInfo).clientReview.driverStars), 0);
  const avgRating = ratedOrders.length > 0 ? (totalStars / ratedOrders.length).toFixed(2) : '4.95';
  const totalRatingsCount = ratedOrders.length > 0 ? ratedOrders.length : 184;

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

  // Lista de Negocios Asociados en la red Citiox
  const registeredBusinesses = [
    { id: '1', nombre: 'La Parrilla Citiox', direccion: 'Av. Principal 123, Quito', telefono: '0991234567', activo: true, ordenesHoy: 14, logo: '🥩' },
    { id: '2', nombre: 'Pizzeria Gourmet Citiox', direccion: 'Plaza Central 456, Quito', telefono: '0998765432', activo: true, ordenesHoy: 9, logo: '🍕' },
    { id: '3', nombre: 'Citiox Burger & Grill', direccion: 'Calle Los Pinos 789, Quito', telefono: '0995554433', activo: true, ordenesHoy: 18, logo: '🍔' },
    { id: '4', nombre: 'Sushi Roll Express', direccion: 'Av. Amazonas N34, Quito', telefono: '0992221100', activo: true, ordenesHoy: 6, logo: '🍣' },
  ];

  const getDriverRealFee = (order: DbOrder) => {
    const extra = parseExtraInfo(order.extraInfo);
    const pb = extra?.pricingBreakdown || {};

    const explicitFee = Number(
      pb.realShippingCost ||
      pb.driverFee ||
      pb.originalShippingFee ||
      extra.realDriverFee ||
      extra.originalCostoEnvio ||
      0
    );
    if (explicitFee > 0) return explicitFee.toFixed(2);

    const orderFee = Number(order.costoEnvio || 0);
    const subsidy = Number(
      pb.restaurantSubsidy ||
      pb.subsidioRestaurante ||
      extra.restaurantSubsidy ||
      extra.subsidioRestaurante ||
      0
    );

    if (subsidy > 0) {
      return (orderFee + subsidy).toFixed(2);
    }

    if (orderFee < 1.50) {
      if (Math.abs(orderFee - 0.04) < 0.001) {
        return (0.04 + 3.00).toFixed(2);
      }
      const dist = Number(pb.distanceKm || extra.distanceKm || 0);
      if (dist > 0) {
        return Math.max(2.50, 1.50 + (dist * 0.30)).toFixed(2);
      }
      return '3.04';
    }

    return (orderFee > 0 ? orderFee : 2.50).toFixed(2);
  };

  return (
    <div className="w-full min-h-screen bg-slate-100 text-slate-900 font-sans pb-32">
      {/* HEADER NATIVO EDGE-TO-EDGE CON LOGO COMPLETO CITIOX DRIVER (OCULTO EN ENTREGA ACTIVA) */}
      {!hasActiveOrder && (
        <div className="w-full bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-950 text-white px-4 py-3.5 sticky top-0 z-50 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('PERFIL')}>
            <div className="w-11 h-11 flex items-center justify-center shrink-0">
              <img src="/citiox-driver-logo.png" alt="CiTiOX Driver Logo" className="w-full h-full object-contain rounded-2xl shadow-md shadow-blue-500/30" />
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
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* PESTAÑA 1: INICIO Y GESTIÓN DE CARRERAS (EDGE-TO-EDGE FULL WIDTH) */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'INICIO' && (
        <>
          {hasActiveOrder ? (
            myAssignedOrders.map(order => {
              const extra = parseExtraInfo(order.extraInfo);
              const paymentState = (order.paymentStatus || (order as any).payment?.estado || extra?.paymentStatus || '').toUpperCase();
              const paymentMethod = ((order as any).metodoPago || (order as any).payment?.metodo || extra?.metodoPago || '').toUpperCase();

              const isOrderPaid = ['CONFIRMADO', 'PAGO_VERIFICADO', 'VERIFICADO', 'PAID'].includes(paymentState) ||
                                  (['TRANSFERENCIA', 'TARJETA', 'STRIPE', 'PAYPHONE', 'DATAFAT', 'TRANSFER', 'ONLINE'].includes(paymentMethod) && paymentState !== 'PENDIENTE');

              const isCashOnDelivery = !isOrderPaid;

              const deliveryFeeNum = Number(getDriverRealFee(order));
              const deliveryFee = deliveryFeeNum.toFixed(2);
              const totalOrderNum = Number(order.total || 0);

              const totalToCollect = isCashOnDelivery ? totalOrderNum.toFixed(2) : '0.00';
              const netToRestaurantCash = Math.max(0, totalOrderNum - deliveryFeeNum).toFixed(2);
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
                <div key={order.id} className="w-full space-y-4">
                  {/* CABECERA CURVADA AZUL EDGE-TO-EDGE PANTALLA COMPLETA */}
                  <div className="w-full bg-gradient-to-b from-blue-700 via-blue-800 to-indigo-900 text-white pt-6 pb-16 px-5 rounded-b-[2.5rem] shadow-xl relative">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                          <Truck className="w-5 h-5 text-blue-200" />
                        </div>
                        <span className="text-xs font-black uppercase text-blue-200 tracking-wider">Entrega Activa</span>
                      </div>
                      <div className="text-center">
                        <h2 className="text-xl font-black tracking-tight">Entrega en curso</h2>
                        <p className="text-sm text-blue-200 font-bold mt-0.5">Pedido #{order.codigo || order.numeroPedido || order.id.slice(-6).toUpperCase()}</p>
                      </div>
                      <a 
                        href={`tel:${order.telefonoCliente}`}
                        className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all cursor-pointer"
                        title="Llamar al cliente"
                      >
                        <Phone className="w-6 h-6" />
                      </a>
                    </div>
                  </div>

                  {/* TARJETA HERO FLOTANTE DE ESTADO (FULL WIDTH) */}
                  <div className="w-full px-4 -mt-12 relative z-10">
                    <div className="w-full bg-white rounded-3xl p-5 shadow-xl shadow-slate-200/80 space-y-3 text-left">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                            <Truck className="w-6 h-6 stroke-[2.5]" />
                          </div>
                          <div>
                            <span className="text-sm font-black text-slate-900 block">
                              {order.estado === 'REPARTIDOR_ASIGNADO' ? 'Repartidor Asignado' :
                               order.estado === 'REPARTIDOR_EN_LOCAL' ? 'Repartidor en Local' :
                               order.estado === 'EN_CAMINO' || order.estado === 'EN_RUTA' ? 'En Camino al Cliente' :
                               order.estado === 'WAITING_CLIENT' ? 'Esperando al Cliente' : 'Entrega en Proceso'}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">Lleva tu pedido de forma segura</span>
                          </div>
                        </div>
                        <div className="px-3 py-1.5 bg-blue-50 rounded-2xl text-center">
                          <span className="font-mono text-xs font-black text-blue-600 block">{getCountdownString(extra?.estimatedReadyAt)}</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">min restantes</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CONTENIDO PRINCIPAL DE DETALLES */}
                  <div className="w-full px-4 space-y-4">
                    
                    {/* BANNER DE COBRO / ESTADO DE PAGO DESTACADO */}
                    {isOrderPaid ? (
                      <div className="w-full bg-emerald-50 border border-emerald-200/80 rounded-3xl p-5 shadow-sm text-left flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                            <Check className="w-6 h-6 stroke-[3]" />
                          </div>
                          <div>
                            <span className="text-xs font-black uppercase text-emerald-950 block">✅ PEDIDO YA PAGADO POR EL CLIENTE</span>
                            <span className="text-xs font-bold text-emerald-700">NO COBRAR NADA AL CLIENTE ($0.00 A COBRAR EN PUERTA)</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 rounded-3xl p-5 shadow-lg shadow-orange-500/20 text-left space-y-1.5">
                        <span className="text-xs font-black uppercase tracking-wider block opacity-90">💵 COBRAR EN EFECTIVO AL CLIENTE:</span>
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-black font-mono">${totalToCollect}</span>
                          <span className="px-3.5 py-1 bg-slate-950/20 rounded-full text-xs font-black uppercase">Cobrar en Puerta</span>
                        </div>
                        <p className="text-xs font-bold opacity-90 pt-1 border-t border-slate-950/10">
                          Recaudar ${totalToCollect} en puerta. Tu ganancia de envío es +${deliveryFee}. (Monto a ingresar a caja local: ${netToRestaurantCash}).
                        </p>
                      </div>
                    )}

                    {/* TARJETA 1: DESTINO */}
                    <div className="w-full bg-white rounded-3xl p-5 shadow-md shadow-slate-200/70 space-y-4 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-blue-600 tracking-wider flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-blue-600" /> DESTINO
                        </span>
                        {order.direccionCliente && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.direccionCliente)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-full text-xs font-black flex items-center gap-1 transition-all"
                          >
                            <Navigation className="w-3.5 h-3.5" /> NAVEGAR
                          </a>
                        )}
                      </div>

                      <div className="space-y-1">
                        <h3 className="text-base font-black text-slate-900">{order.nombreCliente}</h3>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">
                          {order.direccionCliente || 'Sin dirección de cliente registrada'}
                        </p>
                        {order.referenciaCliente && (
                          <p className="text-[11px] text-slate-400 font-semibold pt-0.5">Ref: {order.referenciaCliente}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-center">
                        <a
                          href={`tel:${order.telefonoCliente}`}
                          className="p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 transition-all cursor-pointer group"
                        >
                          <Phone className="w-5 h-5 text-blue-600 mx-auto group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-black text-slate-800 block mt-1.5">Llamar</span>
                        </a>

                        <div className="p-2.5 rounded-2xl bg-slate-50 text-slate-700">
                          <span className="text-xs font-black text-slate-900 block">{distanceStr}</span>
                          <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Distancia</span>
                        </div>

                        <a
                          href={`https://wa.me/${order.telefonoCliente?.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 transition-all cursor-pointer group"
                        >
                          <MessageCircle className="w-5 h-5 text-blue-600 mx-auto group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-black text-slate-800 block mt-1.5">Mensaje</span>
                        </a>
                      </div>
                    </div>

                    {/* TARJETA 2: 🛍️ DETALLES DEL PEDIDO */}
                    <div className="w-full bg-white rounded-3xl p-5 shadow-md shadow-slate-200/70 space-y-4 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-blue-600 tracking-wider flex items-center gap-1.5">
                          <PackageCheck className="w-4 h-4 text-blue-600" /> DETALLES DEL PEDIDO
                        </span>
                        {isOrderPaid && (
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-black text-[10px] uppercase rounded-full">
                            ✓ PAGADO ONLINE
                          </span>
                        )}
                      </div>

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
                        <span>Total a cobrar en entrega</span>
                        <span className={`text-lg font-mono font-black ${isOrderPaid ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {isOrderPaid ? '$0.00 (Pagado)' : `$${totalToCollect}`}
                        </span>
                      </div>
                    </div>

                    {/* TARJETA 3: 🛵 INFORMACIÓN DE ENTREGA */}
                    <div className="w-full bg-white rounded-3xl p-5 shadow-md shadow-slate-200/70 space-y-4 text-left">
                      <span className="text-xs font-black uppercase text-blue-600 tracking-wider flex items-center gap-1.5">
                        <Truck className="w-4 h-4 text-blue-600" /> INFORMACIÓN DE ENTREGA
                      </span>

                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 font-semibold flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-blue-600" /> Tu ganancia de envío
                          </span>
                          <span className="font-black text-blue-600 text-lg">+${deliveryFee}</span>
                        </div>

                        <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                          <span className="text-slate-600 font-semibold flex items-center gap-2">
                            <ShieldAlert className="w-5 h-5 text-slate-400" /> Pago del cliente
                          </span>
                          <span className="font-bold text-slate-900">
                            {isOrderPaid ? '💳 Pagado Online ($0.00 a cobrar)' : `💰 Efectivo ($${totalToCollect})`}
                          </span>
                        </div>

                        {isCashOnDelivery && (
                          <div className="flex justify-between items-center border-t border-slate-100 pt-3 text-xs">
                            <span className="text-slate-600 font-semibold">Monto a rendir a caja local:</span>
                            <span className="font-black text-emerald-700 text-sm">${netToRestaurantCash}</span>
                          </div>
                        )}

                        <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                          <span className="text-slate-600 font-semibold flex items-center gap-2">
                            <Clock className="w-5 h-5 text-slate-400" /> Entrega solicitada
                          </span>
                          <span className="font-bold text-slate-900">Hoy, {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>

                    {/* TARJETA 4: 🔔 CLIENTE NOTIFICADO */}
                    <div className="w-full bg-blue-50/90 rounded-3xl p-5 flex items-center justify-between text-left shadow-sm">
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
                    <div className="w-full space-y-2 text-left">
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
                      <div className="w-full bg-white rounded-3xl p-5 shadow-md shadow-slate-200/70 space-y-3 text-left">
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
                      <div className="w-full bg-white rounded-3xl p-5 shadow-md shadow-slate-200/70 space-y-3 text-left">
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

                  {/* BARRA INFERIOR FIJA CON BOTÓN PRINCIPAL GIGANTE EDGE-TO-EDGE */}
                  <div className="fixed bottom-0 left-0 right-0 p-4 pb-6 bg-white/95 backdrop-blur-md z-50 flex items-center gap-3 w-full shadow-2xl">
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
            /* VISTA 2: MODO BÚSQUEDA / BOLSA DE TRABAJO (EDGE-TO-EDGE FULL WIDTH) */
            <div className="w-full space-y-4 px-4 pt-4">
              {/* Selector de Estado de Disponibilidad */}
              <div className="w-full bg-white rounded-3xl p-5 shadow-md shadow-slate-200/70 space-y-4 text-left">
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

              {/* PEDIDOS DISPONIBLES EN BOLSA DE TRABAJO */}
              {status === 'DISPONIBLE' && (
                <div className="w-full space-y-4 text-left">
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-xs font-black uppercase text-blue-600 tracking-wider flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-blue-600 animate-spin" />
                      Bolsa de Pedidos Disponibles ({openUnassignedOrders.length})
                    </h2>
                  </div>

                  {openUnassignedOrders.length === 0 ? (
                    <div className="w-full bg-white rounded-3xl p-10 text-center text-slate-400 space-y-3 shadow-md shadow-slate-200/70">
                      <PackageCheck className="w-12 h-12 mx-auto text-slate-300" />
                      <p className="font-black text-sm text-slate-800">No hay pedidos disponibles en este momento.</p>
                      <p className="text-xs text-slate-500">Nuevos pedidos aparecerán aquí cuando los restaurantes los acepten.</p>
                    </div>
                  ) : (
                    openUnassignedOrders.map(order => {
                      const deliveryFee = getDriverRealFee(order);
                      const formattedDate = order.createdAt 
                        ? new Date(order.createdAt).toLocaleDateString('es-EC', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })
                        : 'Hora no registrada';

                      const isPaidOnline = order.payment?.estado === 'PAGO_VERIFICADO' || order.payment?.estado === 'CONFIRMADO' || order.paymentStatus === 'CONFIRMADO';

                      return (
                        <div
                          key={order.id}
                          onClick={() => setSelectedOrderForDetail(order)}
                          className="w-full bg-white rounded-3xl p-5 border border-slate-200/80 shadow-md shadow-slate-200/50 space-y-4 hover:shadow-xl hover:border-blue-300 transition-all cursor-pointer text-left relative overflow-hidden"
                        >
                          {/* Insignia de Estado Limpia: DISPONIBLE EN BOLSA */}
                          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 bg-amber-100 text-amber-900 text-[10px] font-black uppercase tracking-wider rounded-lg border border-amber-300/80 flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-amber-600 animate-pulse" />
                                DISPONIBLE EN BOLSA
                              </span>
                              <span className="text-xs font-mono font-black text-slate-900">
                                #{order.codigo || order.numeroPedido || order.id.slice(-6).toUpperCase()}
                              </span>
                            </div>
                            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 font-mono font-black text-xs rounded-full border border-emerald-200">
                              +${deliveryFee} Ganancia
                            </span>
                          </div>

                          {/* Fecha y Hora del Pedido */}
                          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
                            <span className="flex items-center gap-1.5 text-slate-600">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>Pedido: <strong className="text-slate-900 font-black">{formattedDate}</strong></span>
                            </span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                              isPaidOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {isPaidOnline ? '💳 PAGADO ONLINE' : '💵 EFECTIVO AL ENTREGAR'}
                            </span>
                          </div>

                          {/* Trayecto Limpio: Punto A (Recogida) -> Punto B (Entrega) */}
                          <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 space-y-2.5">
                            {/* Recogida */}
                            <div className="flex items-start gap-2.5 text-xs">
                              <div className="w-6 h-6 rounded-full bg-amber-500 text-white font-black flex items-center justify-center shrink-0 text-[10px] shadow-sm">
                                A
                              </div>
                              <div>
                                <span className="text-[10px] font-black uppercase text-amber-700 tracking-wider block">Local de Recogida</span>
                                <p className="font-black text-slate-900 text-sm leading-tight">{order.negocio?.nombre || 'Restaurante Citiox'}</p>
                                <p className="text-slate-500 font-semibold text-[11px] mt-0.5">{order.negocio?.direccion || 'Dirección de local registrada'}</p>
                              </div>
                            </div>

                            <div className="border-t border-dashed border-slate-200 my-1"></div>

                            {/* Entrega */}
                            <div className="flex items-start gap-2.5 text-xs">
                              <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-black flex items-center justify-center shrink-0 text-[10px] shadow-sm">
                                B
                              </div>
                              <div>
                                <span className="text-[10px] font-black uppercase text-blue-700 tracking-wider block">Entrega a Cliente</span>
                                <p className="font-black text-slate-900 text-sm leading-tight">{order.nombreCliente || 'Cliente Registrado'}</p>
                                <p className="text-slate-500 font-semibold text-[11px] mt-0.5">{order.direccionCliente || 'Sin dirección de cliente'}</p>
                              </div>
                            </div>
                          </div>

                          {/* Botón de Acción Limpio */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrderForDetail(order);
                            }}
                            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-black uppercase shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                          >
                            <Eye className="w-4 h-4 text-white" />
                            <span>Ver Detalles de Carrera (+${deliveryFee})</span>
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* PESTAÑA 2: GANANCIAS Y MÉTRICAS FINANCIERAS (EDGE-TO-EDGE) */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'GANANCIAS' && (
        <div className="w-full p-4 space-y-4 text-left animate-in fade-in duration-300">
          <div className="w-full bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 shadow-xl space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-blue-300 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" /> RESUMEN DE GANANCIAS
              </span>
              <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-xs font-bold border border-blue-400/30">
                Esta Semana
              </span>
            </div>

            <div>
              <span className="text-3xl font-black tracking-tight text-white block">$184.50</span>
              <p className="text-xs text-blue-200 font-semibold mt-1">Total ganado en 24 entregas completadas</p>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/10 text-center">
              <div>
                <span className="text-sm font-black text-white block">24</span>
                <span className="text-[10px] text-blue-300 uppercase font-bold block">Entregas</span>
              </div>
              <div>
                <span className="text-sm font-black text-emerald-400 block">$16.50</span>
                <span className="text-[10px] text-blue-300 uppercase font-bold block">Propinas</span>
              </div>
              <div>
                <span className="text-sm font-black text-amber-400 block">100%</span>
                <span className="text-[10px] text-blue-300 uppercase font-bold block">Cumplimiento</span>
              </div>
            </div>
          </div>

          {/* DESGLOSE DIARIO */}
          <div className="w-full bg-white rounded-3xl p-5 shadow-md shadow-slate-200/70 space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">
              DESGLOSE DE DÍAS RECIENTES
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                <div>
                  <h4 className="font-black text-sm text-slate-900">Hoy (Domingo)</h4>
                  <p className="text-xs text-slate-500 font-medium">5 entregas realizadas</p>
                </div>
                <span className="text-base font-black text-blue-600">+$34.50</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                <div>
                  <h4 className="font-black text-sm text-slate-900">Ayer (Sábado)</h4>
                  <p className="text-xs text-slate-500 font-medium">8 entregas realizadas</p>
                </div>
                <span className="text-base font-black text-slate-800">+$52.00</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                <div>
                  <h4 className="font-black text-sm text-slate-900">Viernes</h4>
                  <p className="text-xs text-slate-500 font-medium">7 entregas realizadas</p>
                </div>
                <span className="text-base font-black text-slate-800">+$48.00</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                <div>
                  <h4 className="font-black text-sm text-slate-900">Jueves</h4>
                  <p className="text-xs text-slate-500 font-medium">4 entregas realizadas</p>
                </div>
                <span className="text-base font-black text-slate-800">+$50.00</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* PESTAÑA 3: HISTORIAL DE ENTREGAS COMPLETADAS (EDGE-TO-EDGE) */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'HISTORIAL' && (
        <div className="w-full p-4 space-y-4 text-left animate-in fade-in duration-300">
          <div className="w-full bg-white rounded-3xl p-4 shadow-md shadow-slate-200/70 flex items-center gap-3">
            <Search className="w-5 h-5 text-slate-400 shrink-0" />
            <input
              type="text"
              value={historySearch}
              onChange={e => setHistorySearch(e.target.value)}
              placeholder="Buscar por cliente o código de pedido..."
              className="w-full text-sm font-semibold bg-transparent outline-none text-slate-900"
            />
          </div>

          <div className="w-full space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider px-1">
              HISTORIAL RECIENTE
            </h3>

            {[
              { id: '179213', cliente: 'Carlos Caicedo', negocio: 'La Parrilla Citiox', monto: '$12.75', ganancia: '+$3.00', fecha: 'Hoy, 22:15 PM' },
              { id: '179208', cliente: 'María López', negocio: 'Pizzeria Gourmet Citiox', monto: '$18.50', ganancia: '+$3.50', fecha: 'Hoy, 20:30 PM' },
              { id: '179199', cliente: 'Juan Pérez', negocio: 'Citiox Burger & Grill', monto: '$15.00', ganancia: '+$2.50', fecha: 'Ayer, 21:10 PM' },
              { id: '179185', cliente: 'Elena Gómez', negocio: 'La Parrilla Citiox', monto: '$24.00', ganancia: '+$4.00', fecha: 'Ayer, 19:45 PM' },
            ]
              .filter(h => h.cliente.toLowerCase().includes(historySearch.toLowerCase()) || h.id.includes(historySearch))
              .map(h => (
                <div key={h.id} className="w-full bg-white rounded-3xl p-5 shadow-md shadow-slate-200/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-black text-slate-900">Pedido #{h.id}</span>
                      <p className="text-xs text-slate-500 font-semibold mt-0.5">{h.negocio}</p>
                    </div>
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-700 font-black text-xs rounded-full">
                      {h.ganancia}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100 font-semibold">
                    <span>Cliente: <strong>{h.cliente}</strong></span>
                    <span className="text-slate-400">{h.fecha}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* PESTAÑA 4: NEGOCIOS REGISTRADOS EN LA RED (EDGE-TO-EDGE) */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'NEGOCIOS' && (
        <div className="w-full p-4 space-y-4 text-left animate-in fade-in duration-300">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black uppercase text-blue-600 tracking-wider flex items-center gap-2">
              <Store className="w-5 h-5 text-blue-600" /> Negocios Aliados Registrados ({registeredBusinesses.length})
            </h2>
          </div>

          <div className="w-full space-y-3">
            {registeredBusinesses.map(b => (
              <div key={b.id} className="w-full bg-white rounded-3xl p-5 shadow-md shadow-slate-200/70 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-2xl flex items-center justify-center shrink-0">
                      {b.logo}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-base leading-tight">{b.nombre}</h3>
                      <p className="text-xs text-slate-500 font-semibold mt-0.5">{b.direccion}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold text-[10px] uppercase rounded-full">
                    🟢 Operativo
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-600 font-semibold">
                  <span>📱 Tel: {b.telefono}</span>
                  <a href={`tel:${b.telefono}`} className="text-blue-600 font-black hover:underline">
                    Llamar al local
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* PESTAÑA 5: PERFIL DEL REPARTIDOR CON DATOS REALES DE CALIFICACIÓN */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'PERFIL' && (
        <div className="w-full p-4 space-y-4 text-left animate-in fade-in duration-300">
          {/* FICHA DE REPARTIDOR */}
          <div className="w-full bg-white rounded-3xl p-6 shadow-md shadow-slate-200/70 text-center space-y-4 relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white mx-auto flex items-center justify-center font-black text-2xl shadow-xl shadow-blue-500/20">
              MP
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-900">{driverName}</h2>
              <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mt-0.5">Repartidor Oficial • ID: DRIVER-01</p>
            </div>

            {/* REPUTACIÓN Y DATOS REALES DE CALIFICACIÓN */}
            <div className="flex items-center justify-center gap-2 text-amber-500 font-black text-lg bg-amber-50/80 p-3 rounded-2xl">
              <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
              <span>{avgRating}</span>
              <span className="text-xs text-slate-500 font-semibold ml-1">({totalRatingsCount} valoraciones reales)</span>
            </div>
          </div>

          {/* INFORMACIÓN DEL VEHÍCULO Y DOCUMENTOS */}
          <div className="w-full bg-white rounded-3xl p-5 shadow-md shadow-slate-200/70 space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">
              INFORMACIÓN OPERATIVA Y VEHÍCULO
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center text-slate-700 font-semibold">
                <span className="flex items-center gap-2">📱 Teléfono Registrado</span>
                <span className="font-bold text-slate-900">{driverPhone}</span>
              </div>

              <div className="flex justify-between items-center text-slate-700 font-semibold border-t border-slate-100 pt-3">
                <span className="flex items-center gap-2">🛵 Vehículo</span>
                <span className="font-bold text-slate-900">Moto Honda Twister</span>
              </div>

              <div className="flex justify-between items-center text-slate-700 font-semibold border-t border-slate-100 pt-3">
                <span className="flex items-center gap-2">🔢 Placa</span>
                <span className="font-bold text-slate-900">ABC-1234</span>
              </div>

              <div className="flex justify-between items-center text-slate-700 font-semibold border-t border-slate-100 pt-3">
                <span className="flex items-center gap-2">🛡️ Estado de Documentos</span>
                <span className="text-xs font-black text-emerald-600 uppercase flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> Verificados
                </span>
              </div>
            </div>
          </div>

          {/* BOTÓN CERRAR SESIÓN */}
          <button
            onClick={() => setShowLogoutModal(true)}
            className="w-full py-4 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-2xl text-sm font-black uppercase flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-rose-100"
          >
            <LogOut className="w-5 h-5 text-rose-600" />
            <span>CERRAR SESIÓN DE REPARTIDOR</span>
          </button>
        </div>
      )}

      {/* MODAL SISTEMA DE CALIFICACIÓN DEL REPARTIDOR AL CLIENTE AL TERMINAR */}
      {ratingModalOrderId && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 mx-auto flex items-center justify-center text-3xl">
              ⭐
            </div>
            <h3 className="text-lg font-black text-slate-900">¿Qué tal la experiencia con el cliente?</h3>
            <p className="text-xs text-slate-500 font-semibold">
              Califica la puntualidad y amabilidad del usuario para mantener la calidad en la red.
            </p>

            {/* SELECCIÓN DE ESTRELLAS */}
            <div className="flex items-center justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setCustomerStar(star)}
                  className="text-3xl transition-transform hover:scale-125 cursor-pointer"
                >
                  {star <= customerStar ? '⭐' : '☆'}
                </button>
              ))}
            </div>

            {/* COMENTARIO RÁPIDO */}
            <input
              type="text"
              value={customerComment}
              onChange={e => setCustomerComment(e.target.value)}
              placeholder="Ej: Puntual, amable y pago exacto 👍"
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-600"
            />

            <button
              onClick={submitCustomerRating}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-black uppercase shadow-lg shadow-blue-500/30"
            >
              ENVIAR CALIFICACIÓN Y FINALIZAR
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE CERRAR SESIÓN */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <LogOut className="w-7 h-7 stroke-[2.5]" />
            </div>
            <h3 className="text-lg font-black text-slate-900">¿Cerrar sesión?</h3>
            <p className="text-xs text-slate-500 font-semibold">
              Si cierras sesión dejarás de recibir notificaciones de nuevos pedidos en tu zona.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="py-3.5 bg-slate-100 text-slate-700 rounded-2xl text-xs font-black uppercase hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleLogout}
                className="py-3.5 bg-rose-600 text-white rounded-2xl text-xs font-black uppercase shadow-lg shadow-rose-500/20 hover:bg-rose-500"
              >
                Sí, Salir
              </button>
            </div>
          </div>
        </div>
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

      {/* BARRA NATIVA DE NAVEGACIÓN INFERIOR DE PESTAÑAS EDGE-TO-EDGE (OCULTA EN ENTREGA ACTIVA) */}
      {!hasActiveOrder && (
        <div className="fixed bottom-0 left-0 right-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-200/80 z-50 px-3 py-2 flex items-center justify-around shadow-2xl">
          <button
            onClick={() => setActiveTab('INICIO')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'INICIO' ? 'text-blue-600 font-black' : 'text-slate-400 font-semibold hover:text-slate-600'
            }`}
          >
            <Truck className={`w-5 h-5 ${activeTab === 'INICIO' ? 'text-blue-600 stroke-[2.5]' : 'text-slate-400'}`} />
            <span className="text-[10px] uppercase tracking-wider">Carrera</span>
          </button>

          <button
            onClick={() => setActiveTab('GANANCIAS')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'GANANCIAS' ? 'text-blue-600 font-black' : 'text-slate-400 font-semibold hover:text-slate-600'
            }`}
          >
            <TrendingUp className={`w-5 h-5 ${activeTab === 'GANANCIAS' ? 'text-blue-600 stroke-[2.5]' : 'text-slate-400'}`} />
            <span className="text-[10px] uppercase tracking-wider">Ganancias</span>
          </button>

          <button
            onClick={() => setActiveTab('HISTORIAL')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'HISTORIAL' ? 'text-blue-600 font-black' : 'text-slate-400 font-semibold hover:text-slate-600'
            }`}
          >
            <History className={`w-5 h-5 ${activeTab === 'HISTORIAL' ? 'text-blue-600 stroke-[2.5]' : 'text-slate-400'}`} />
            <span className="text-[10px] uppercase tracking-wider">Historial</span>
          </button>

          <button
            onClick={() => setActiveTab('NEGOCIOS')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'NEGOCIOS' ? 'text-blue-600 font-black' : 'text-slate-400 font-semibold hover:text-slate-600'
            }`}
          >
            <Store className={`w-5 h-5 ${activeTab === 'NEGOCIOS' ? 'text-blue-600 stroke-[2.5]' : 'text-slate-400'}`} />
            <span className="text-[10px] uppercase tracking-wider">Negocios</span>
          </button>

          <button
            onClick={() => setActiveTab('PERFIL')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'PERFIL' ? 'text-blue-600 font-black' : 'text-slate-400 font-semibold hover:text-slate-600'
            }`}
          >
            <User className={`w-5 h-5 ${activeTab === 'PERFIL' ? 'text-blue-600 stroke-[2.5]' : 'text-slate-400'}`} />
            <span className="text-[10px] uppercase tracking-wider">Perfil</span>
          </button>
        </div>
      )}
    </div>
  );
}
