/**
 * @file page.tsx
 * @module app/driver
 * @description App Web de Repartidores para Citiox Enterprise vNext.
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
    if (!estimatedReadyAt) return '15:00 min';
    const target = new Date(estimatedReadyAt).getTime();
    const diff = Math.max(0, Math.floor((target - nowTime) / 1000));
    const mins = Math.floor(diff / 60);
    const secs = diff % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} min`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans pb-12">
      {/* Top Header App */}
      <div className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-50 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center font-black text-white shadow-lg">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight text-white">{driverName}</h1>
            <p className="text-xs text-slate-400">Repartidor Oficial • La Parrilla Citiox</p>
          </div>
        </div>

        <button
          onClick={fetchDriverData}
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          title="Refrescar datos"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* CONDITIONAL VISTA 1: VENTANA EXCLUSIVA DE GESTIÓN DE CARRERA ACTIVA */}
      {hasActiveOrder ? (
        <div className="p-4 max-w-md mx-auto space-y-4">
          <div className="bg-emerald-950/40 border border-emerald-500/40 p-3.5 rounded-2xl flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs font-black uppercase text-emerald-300 tracking-wider">Gestión de Carrera Activa</span>
            </div>
            <span className="text-[10px] font-extrabold text-slate-400">1 Pedido en Curso</span>
          </div>
        </div>
      ) : (
        /* VISTA 2: MODO BÚSQUEDA / BOLSA DE TRABAJO (SOLO SI NO HAY CARRERA ACTIVA) */
        <>
          {/* Selector de Estado de Disponibilidad */}
          <div className="p-4 max-w-md mx-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
              <label className="block text-xs font-black uppercase text-slate-400 tracking-wider">
                Mi Disponibilidad Actual
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleStatusChange('DISPONIBLE')}
                  className={`py-3 px-2 rounded-xl text-xs font-black flex flex-col items-center gap-1 transition-all ${
                    status === 'DISPONIBLE'
                      ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>DISPONIBLE</span>
                </button>
                <button
                  onClick={() => handleStatusChange('DESCANSO')}
                  className={`py-3 px-2 rounded-xl text-xs font-black flex flex-col items-center gap-1 transition-all ${
                    status === 'DESCANSO'
                      ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>DESCANSO</span>
                </button>
                <button
                  onClick={() => handleStatusChange('DESCONECTADO')}
                  className={`py-3 px-2 rounded-xl text-xs font-black flex flex-col items-center gap-1 transition-all ${
                    status === 'DESCONECTADO'
                      ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  <Power className="w-4 h-4" />
                  <span>OFFLINE</span>
                </button>
              </div>
            </div>
          </div>

          {/* PEDIDOS DISPONIBLES EN BOLSA DE TRABAJO */}
          {status === 'DISPONIBLE' && (
            <div className="p-4 max-w-md mx-auto space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                  Bolsa de Pedidos Disponibles ({openUnassignedOrders.length})
                </h2>
              </div>

              {openUnassignedOrders.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 space-y-2">
                  <PackageCheck className="w-10 h-10 mx-auto text-slate-700" />
                  <p className="font-bold text-xs text-slate-400">No hay pedidos disponibles en este momento.</p>
                  <p className="text-[11px] text-slate-600">Nuevos pedidos aparecerán aquí cuando los restaurantes los acepten.</p>
                </div>
              ) : (
                openUnassignedOrders.map(order => {
                  const deliveryFee = Number(order.costoEnvio || 2.50).toFixed(2);
                  const extra = parseExtraInfo(order.extraInfo);
                  const itemsSummary = (order.items || []).map(i => `${i.cantidad}x ${i.nombreProducto}`).join(', ');
                  const distanceStr = getDistanceString(order);

                  return (
                    <div
                      key={order.id}
                      className="bg-gradient-to-br from-slate-900 to-amber-950/40 border border-amber-500/40 rounded-2xl p-4 shadow-xl space-y-3 relative overflow-hidden"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-white">#{order.codigo || order.id.slice(-6).toUpperCase()}</span>
                            <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Navigation className="w-3 h-3 text-amber-400" /> {distanceStr}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-300 mt-1">
                            <Store className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="truncate">{order.negocio?.nombre || 'Restaurante Citiox'}</span>
                          </div>
                        </div>
                        <div className="bg-amber-400 text-slate-950 px-2.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 shadow-md">
                          <DollarSign className="w-3.5 h-3.5" /> Ganancia: ${deliveryFee}
                        </div>
                      </div>

                      {/* Detalles de Dirección, Recogida, Distancia y Contenido de Mochila */}
                      <div className="space-y-2 text-xs text-slate-300 bg-slate-950/70 p-3 rounded-xl border border-amber-500/20">
                        {/* Dirección de Recogida */}
                        <div className="flex items-start justify-between gap-1 pb-1.5 border-b border-slate-800">
                          <div className="flex items-start gap-1.5 truncate">
                            <Building2 className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-[10px] font-black uppercase text-orange-400 block">Recogida (Local):</span>
                              <span className="font-semibold text-slate-200">{order.negocio?.direccion || 'Local del Restaurante'}</span>
                            </div>
                          </div>
                          {order.negocio?.direccion && (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.negocio.direccion)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-orange-400 hover:underline font-bold shrink-0 text-[10px] flex items-center gap-0.5"
                            >
                              GPS Local <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>

                        {/* Dirección de Entrega */}
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex items-start gap-1.5">
                            <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-[10px] font-black uppercase text-emerald-400 block">Entrega (Cliente):</span>
                              <span className="font-semibold text-slate-200">{order.direccionCliente || 'Dirección de Entrega'}</span>
                              {order.referenciaCliente && (
                                <p className="text-[10px] text-slate-400 font-medium">Ref: {order.referenciaCliente}</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {itemsSummary && (
                          <div className="flex items-start gap-1.5 text-[11px] text-slate-300 pt-1.5 border-t border-slate-800">
                            <PackageCheck className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                            <span className="line-clamp-2">Paquete: <strong>{itemsSummary}</strong></span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-slate-800 font-bold">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            <span>Cocina: <strong>{getCountdownString(extra?.estimatedReadyAt)}</strong></span>
                          </div>
                          <span className="text-amber-300">📍 Recogida: ~1.2 km</span>
                          <span className="text-emerald-400">🏁 Entrega: {distanceStr}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedOrderForDetail(order)}
                        className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs uppercase rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                      >
                        <Navigation className="w-4 h-4" />
                        <span>👁️ Ver Detalles y Ruta (${deliveryFee})</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}

      {/* MODAL / PANTALLA COMPLETA DE REVISIÓN DE DETALLES DE CARRERA CON MAPA INTERACTIVO Y BOTÓN FIJO */}
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
