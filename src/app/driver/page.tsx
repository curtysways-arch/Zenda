/**
 * @file page.tsx
 * @module app/driver
 * @description App Web de Repartidores NATIVA para Citiox Enterprise vNext con Multi-pestañas (Inicio, Ganancias, Historial, Negocios, Perfil y Cerrar Sesión).
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Truck, CheckCircle, XCircle, Navigation, MapPin, Phone,
  Clock, ShieldAlert, PackageCheck, AlertCircle, RefreshCw, Power, DollarSign,
  Map, Sparkles, Store, Building2, ExternalLink, Lock, ArrowLeft, Share2,
  MessageCircle, MoreHorizontal, ChefHat, AlertTriangle, Check,
  TrendingUp, History, User, LogOut, ChevronRight, Star, Award, FileText,
  Filter, Search, Calendar, CreditCard, ShieldCheck
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
  const [activeTab, setActiveTab] = useState<'INICIO' | 'GANANCIAS' | 'HISTORIAL' | 'NEGOCIOS' | 'PERFIL'>('INICIO');

  const [availableDbOrders, setAvailableDbOrders] = useState<DbOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [nowTime, setNowTime] = useState<number>(Date.now());
  const [inputPins, setInputPins] = useState<{ [orderId: string]: string }>({});

  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<DbOrder | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [historySearch, setHistorySearch] = useState('');

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

  const completedOrders = availableDbOrders.filter(o => o.estado === 'ENTREGADO');

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

  // Lista de Negocios Asociados en la red Citiox
  const registeredBusinesses = [
    { id: '1', nombre: 'La Parrilla Citiox', direccion: 'Av. Principal 123, Quito', telefono: '0991234567', activo: true, ordenesHoy: 14, logo: '🥩' },
    { id: '2', nombre: 'Pizzeria Gourmet Citiox', direccion: 'Plaza Central 456, Quito', telefono: '0998765432', activo: true, ordenesHoy: 9, logo: '🍕' },
    { id: '3', nombre: 'Citiox Burger & Grill', direccion: 'Calle Los Pinos 789, Quito', telefono: '0995554433', activo: true, ordenesHoy: 18, logo: '🍔' },
    { id: '4', nombre: 'Sushi Roll Express', direccion: 'Av. Amazonas N34, Quito', telefono: '0992221100', activo: true, ordenesHoy: 6, logo: '🍣' },
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans pb-32">
      {/* HEADER NATIVO CON LOGO COMPLETO CITIOX DRIVER SIN RECORTES */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-950 text-white p-4 sticky top-0 z-50 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('PERFIL')}>
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

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* PESTAÑA 1: INICIO Y GESTIÓN DE CARRERAS */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'INICIO' && (
        <>
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
                  <div className="fixed bottom-16 left-0 right-0 p-4 bg-white/95 backdrop-blur-md z-40 flex items-center gap-3 max-w-md mx-auto shadow-2xl">
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
            /* VISTA 2: MODO BÚSQUEDA / BOLSA DE TRABAJO */
            <>
              {/* Selector de Estado de Disponibilidad */}
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
        </>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* PESTAÑA 2: GANANCIAS Y MÉTRICAS FINANCIERAS */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'GANANCIAS' && (
        <div className="p-4 max-w-md mx-auto space-y-4 text-left animate-in fade-in duration-300">
          <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 shadow-xl space-y-4 relative overflow-hidden">
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
          <div className="bg-white rounded-3xl p-5 shadow-md shadow-slate-200/70 space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">
              DESGLOSE DE DÍAS RECIENTES
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl">
                <div>
                  <h4 className="font-black text-sm text-slate-900">Hoy (Domingo)</h4>
                  <p className="text-xs text-slate-500 font-medium">5 entregas realizadas</p>
                </div>
                <span className="text-base font-black text-blue-600">+$34.50</span>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl">
                <div>
                  <h4 className="font-black text-sm text-slate-900">Ayer (Sábado)</h4>
                  <p className="text-xs text-slate-500 font-medium">8 entregas realizadas</p>
                </div>
                <span className="text-base font-black text-slate-800">+$52.00</span>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl">
                <div>
                  <h4 className="font-black text-sm text-slate-900">Viernes</h4>
                  <p className="text-xs text-slate-500 font-medium">7 entregas realizadas</p>
                </div>
                <span className="text-base font-black text-slate-800">+$48.00</span>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl">
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
      {/* PESTAÑA 3: HISTORIAL DE ENTREGAS COMPLETADAS */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'HISTORIAL' && (
        <div className="p-4 max-w-md mx-auto space-y-4 text-left animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-4 shadow-md shadow-slate-200/70 flex items-center gap-3">
            <Search className="w-5 h-5 text-slate-400 shrink-0" />
            <input
              type="text"
              value={historySearch}
              onChange={e => setHistorySearch(e.target.value)}
              placeholder="Buscar por cliente o código de pedido..."
              className="w-full text-sm font-semibold bg-transparent outline-none text-slate-900"
            />
          </div>

          <div className="space-y-3">
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
                <div key={h.id} className="bg-white rounded-3xl p-5 shadow-md shadow-slate-200/70 space-y-3">
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
      {/* PESTAÑA 4: NEGOCIOS REGISTRADOS EN LA RED */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'NEGOCIOS' && (
        <div className="p-4 max-w-md mx-auto space-y-4 text-left animate-in fade-in duration-300">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black uppercase text-blue-600 tracking-wider flex items-center gap-2">
              <Store className="w-5 h-5 text-blue-600" /> Negocios Aliados Registrados ({registeredBusinesses.length})
            </h2>
          </div>

          <div className="space-y-3">
            {registeredBusinesses.map(b => (
              <div key={b.id} className="bg-white rounded-3xl p-5 shadow-md shadow-slate-200/70 space-y-3">
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
      {/* PESTAÑA 5: PERFIL DEL REPARTIDOR Y CERRAR SESIÓN */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'PERFIL' && (
        <div className="p-4 max-w-md mx-auto space-y-4 text-left animate-in fade-in duration-300">
          {/* FICHA DE REPARTIDOR */}
          <div className="bg-white rounded-3xl p-6 shadow-md shadow-slate-200/70 text-center space-y-4 relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white mx-auto flex items-center justify-center font-black text-2xl shadow-xl shadow-blue-500/20">
              MP
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-900">{driverName}</h2>
              <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mt-0.5">Repartidor Oficial • ID: DRIVER-01</p>
            </div>

            <div className="flex items-center justify-center gap-1 text-amber-500 font-black text-base">
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
              <span>4.95</span>
              <span className="text-xs text-slate-400 font-semibold ml-1">(184 entregas)</span>
            </div>
          </div>

          {/* INFORMACIÓN DEL VEHÍCULO Y DOCUMENTOS */}
          <div className="bg-white rounded-3xl p-5 shadow-md shadow-slate-200/70 space-y-4">
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

      {/* BARRA NATIVA DE NAVEGACIÓN INFERIOR DE PESTAÑAS (TAB BAR) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 z-50 px-3 py-2 flex items-center justify-around max-w-md mx-auto shadow-2xl">
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
    </div>
  );
}
