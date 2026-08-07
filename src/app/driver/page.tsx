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
  Map, Sparkles
} from 'lucide-react';

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
  items: Array<{
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
      ['REPARTIDOR_ASIGNADO', 'REPARTIDOR_EN_LOCAL', 'ENTREGADO_A_REPARTIDOR', 'EN_CAMINO', 'EN_RUTA'].includes(o.estado);
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

      {/* MODAL DE REVISIÓN DE DETALLES DE CARRERA (PRE-ACEPTACIÓN) */}
      {selectedOrderForDetail && (() => {
        const deliveryFee = Number(selectedOrderForDetail.costoEnvio || 2.50).toFixed(2);
        const extra = parseExtraInfo(selectedOrderForDetail.extraInfo);
        const itemsSummary = (selectedOrderForDetail.items || []).map(i => `${i.cantidad}x ${i.nombreProducto}`).join(', ');
        const distanceStr = getDistanceString(selectedOrderForDetail);
        const isCashOnDelivery = selectedOrderForDetail.paymentStatus !== 'PAGADO' && selectedOrderForDetail.paymentStatus !== 'PAID';
        const totalToCollect = isCashOnDelivery ? Number(selectedOrderForDetail.total).toFixed(2) : '0.00';

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-amber-500/40 space-y-4 relative text-left">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-xs font-black uppercase text-amber-400 flex items-center gap-1">
                    <Store className="w-3.5 h-3.5 text-amber-400" /> {selectedOrderForDetail.negocio?.nombre || 'Restaurante Citiox'}
                  </span>
                  <h3 className="text-lg font-black text-white">Pedido #{selectedOrderForDetail.codigo || selectedOrderForDetail.id.slice(-6).toUpperCase()}</h3>
                </div>
                <button
                  onClick={() => setSelectedOrderForDetail(null)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="bg-amber-400 text-slate-950 p-3 rounded-2xl flex items-center justify-between font-black text-sm shadow-md">
                <span>TU GANANCIA DE ENVÍO:</span>
                <span className="text-base font-black">+${deliveryFee}</span>
              </div>

              <div className="space-y-2.5 text-xs text-slate-300">
                {/* Punto 1: Recogida en Local */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-orange-400 tracking-wider flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-orange-400" /> 1. Recogida en Local (Restaurante):
                    </span>
                    {selectedOrderForDetail.negocio?.direccion && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedOrderForDetail.negocio.direccion)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-orange-400 hover:underline text-[10px] font-bold flex items-center gap-1"
                      >
                        <span>GPS Local</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                  <p className="font-bold text-slate-100 text-xs">{selectedOrderForDetail.negocio?.direccion || 'Local del Restaurante'}</p>
                </div>

                {/* Punto 2: Entrega a Cliente */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" /> 2. Entrega a Destino (Cliente):
                    </span>
                    {selectedOrderForDetail.direccionCliente && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedOrderForDetail.direccionCliente)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-400 hover:underline text-[10px] font-bold flex items-center gap-1"
                      >
                        <span>GPS Cliente</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                  <p className="font-bold text-slate-100 text-xs">{selectedOrderForDetail.direccionCliente || 'Sin dirección registrada'}</p>
                  {selectedOrderForDetail.referenciaCliente && (
                    <p className="text-[10px] text-slate-400 font-medium">Ref: {selectedOrderForDetail.referenciaCliente}</p>
                  )}
                </div>

                {/* Desglose de Distancias */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] font-bold text-slate-400 block">Distancia a Recoger:</span>
                    <span className="font-black text-amber-300">📍 ~1.2 km</span>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] font-bold text-slate-400 block">Distancia a Entregar:</span>
                    <span className="font-black text-emerald-300">🏁 {distanceStr}</span>
                  </div>
                </div>

                {/* Detalle de Productos */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Detalle de Productos en Paquete:</span>
                  <p className="font-bold text-slate-200 text-xs">{itemsSummary || 'Sin productos registrados'}</p>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  onClick={() => handleAcceptOrder(selectedOrderForDetail.id)}
                  disabled={actionLoading === selectedOrderForDetail.id || hasActiveOrder}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs uppercase rounded-2xl shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="w-5 h-5" />
                  {hasActiveOrder ? '⚠️ Ya tienes 1 entrega activa' : `🟢 ACEPTAR ESTA CARRERA (Ganancia $${deliveryFee})`}
                </button>
                <button
                  onClick={() => setSelectedOrderForDetail(null)}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase rounded-2xl transition-colors cursor-pointer"
                >
                  Volver a la Bolsa
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* SECCIÓN 2: GESTIÓN DE MIS PEDIDOS ACEPTADOS EN CURSO (ÚNICAMENTE SI HAY CARRERA ACTIVA) */}
      {hasActiveOrder && (
        <div className="p-4 max-w-md mx-auto space-y-4">
          <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center justify-between">
            <span>Mi Entrega en Curso ({myAssignedOrders.length})</span>
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-bold animate-pulse">
              ● Monitoreando GPS
            </span>
          </h2>

          {myAssignedOrders.map((order) => {
            const isCashOnDelivery = order.paymentStatus !== 'PAGADO' && order.paymentStatus !== 'PAID';
            const deliveryFee = Number(order.costoEnvio || 2.50).toFixed(2);
            const totalToCollect = isCashOnDelivery ? Number(order.total).toFixed(2) : '0.00';

            return (
              <div
                key={order.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 relative"
              >
                {/* Header Card con Nombre del Negocio */}
                <div className="border-b border-slate-800 pb-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-bold">Pedido #{order.codigo || order.id.slice(-6).toUpperCase()}</span>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-orange-500/20 text-orange-400 border border-orange-500/30">
                      {order.estado}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-300 font-extrabold text-sm">
                    <Store className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{order.negocio?.nombre || 'Restaurante Citiox'}</span>
                  </div>
                  <h3 className="font-extrabold text-white text-xs">Cliente: {order.nombreCliente}</h3>
                </div>

                {/* Contador Regresivo de Despacho / Llegada */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                    <span className="text-xs font-bold text-slate-400">Tiempo de Llegada al Local:</span>
                  </div>
                  <span className="font-black text-sm text-amber-400 font-mono">
                    {getCountdownString(order.extraInfo?.estimatedReadyAt)}
                  </span>
                </div>

                {/* Tarjeta Financiera de Cobro (Visible directamente al estar En Ruta) */}
                {['EN_CAMINO', 'EN_RUTA', 'DELIVERED', 'ENTREGADO'].includes(order.estado) ? (
                  <div className={`p-3.5 rounded-xl border space-y-1.5 text-xs ${
                    isCashOnDelivery 
                      ? 'bg-amber-950/40 border-amber-500/40 text-amber-200' 
                      : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                  }`}>
                    <div className="flex justify-between items-center font-black">
                      <span>COBRO AL CLIENTE EN DESTINO:</span>
                      <span className="text-sm">{isCashOnDelivery ? `💰 EFECTIVO: $${totalToCollect}` : '💳 $0.00 (PAGADO ONLINE)'}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-bold border-t border-slate-800 pt-1.5">
                      <span>TU GANANCIA DE ENVÍO:</span>
                      <span className="text-emerald-400 text-xs font-black">+${deliveryFee}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/90 text-xs flex justify-between items-center font-bold">
                    <span className="text-slate-400">TU GANANCIA DE ENVÍO:</span>
                    <span className="text-emerald-400 text-sm font-black">+${deliveryFee}</span>
                  </div>
                )}

                {/* Datos del Negocio (Recogida) & Datos del Cliente (Entrega) */}
                <div className="space-y-2.5 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  {/* Punto 1: Recogida */}
                  <div className="flex items-start justify-between gap-1 pb-2 border-b border-slate-800">
                    <div className="flex items-start gap-2">
                      <Building2 className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] font-black uppercase text-orange-400 block">1. Recogida (Restaurante):</span>
                        <span className="font-semibold text-slate-200">{order.negocio?.direccion || 'Local del Restaurante'}</span>
                      </div>
                    </div>
                    {order.negocio?.direccion && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.negocio.direccion)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-orange-400 hover:underline text-[10px] font-bold shrink-0 flex items-center gap-0.5"
                      >
                        <Map className="w-3 h-3" /> GPS Local
                      </a>
                    )}
                  </div>

                  {/* Punto 2: Entrega */}
                  <div className="flex items-start justify-between gap-1">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] font-black uppercase text-emerald-400 block">2. Entrega (Cliente):</span>
                        <span className="font-semibold text-slate-200">{order.direccionCliente || 'Sin dirección registrada'}</span>
                        {order.referenciaCliente && (
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">Ref: {order.referenciaCliente}</p>
                        )}
                      </div>
                    </div>
                    {order.direccionCliente && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.direccionCliente)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-400 hover:underline text-[10px] font-bold shrink-0 flex items-center gap-0.5"
                      >
                        <Map className="w-3 h-3" /> GPS Cliente
                      </a>
                    )}
                  </div>

                  {(order.items || []).length > 0 && (
                    <div className="flex items-start gap-1.5 text-[11px] text-slate-300 pt-1.5 border-t border-slate-800">
                      <PackageCheck className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">Paquete: <strong>{(order.items || []).map(i => `${i.cantidad}x ${i.nombreProducto}`).join(', ')}</strong></span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-800">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                      <a href={`tel:${order.telefonoCliente}`} className="font-bold text-emerald-400 hover:underline">
                        {order.telefonoCliente}
                      </a>
                    </div>
                    <span className="text-[11px] font-bold text-amber-400">📍 Distancia: {getDistanceString(order)}</span>
                  </div>
                </div>

                {/* BOTONERA DE ACCIÓN Y AVANCE DE PASOS */}
                {order.estado === 'REPARTIDOR_ASIGNADO' && (
                  <button
                    onClick={() => handleMarkArrived(order.id)}
                    disabled={actionLoading === order.id}
                    className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 shadow-xl cursor-pointer active:scale-95 transition-all"
                  >
                    <MapPin className="w-4 h-4" />
                    <span>📍 Marcar Llegada al Restaurante</span>
                  </button>
                )}

                {(order.estado === 'REPARTIDOR_EN_LOCAL' || order.estado === 'ENTREGADO_A_REPARTIDOR') && (() => {
                  const isHandedOver = order.estado === 'ENTREGADO_A_REPARTIDOR';
                  return (
                    <div className="space-y-2">
                      <div className={`p-2.5 rounded-xl text-xs font-extrabold text-center flex items-center justify-center gap-2 border ${
                        isHandedOver 
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 animate-pulse' 
                          : 'bg-amber-500/20 border-amber-500/30 text-amber-300 animate-pulse'
                      }`}>
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span>
                          {isHandedOver 
                            ? '📦 Paquete Entregado por Restaurante • ¡Listo para salir!' 
                            : '⏳ En el local • Esperando confirmación de entrega por el negocio...'}
                        </span>
                      </div>
                      <button
                        onClick={() => handleUpdateState(order.id, 'ON_ROUTE')}
                        disabled={!isHandedOver || actionLoading === order.id}
                        className={`w-full py-3.5 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 shadow-xl transition-all ${
                          isHandedOver
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white cursor-pointer active:scale-95'
                            : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                        }`}
                      >
                        <Navigation className="w-4 h-4" />
                        <span>{isHandedOver ? '🛵 INICIAR ENTREGA' : '⏳ ESPERANDO ENTREGA DEL NEGOCIO'}</span>
                      </button>
                    </div>
                  );
                })()}

                {(order.estado === 'EN_CAMINO' || order.estado === 'EN_RUTA') && (
                  <div className="space-y-2">
                    <div className="p-2.5 bg-blue-500/20 border border-blue-500/30 rounded-xl text-blue-300 text-xs font-extrabold text-center flex items-center justify-center gap-2">
                      <Navigation className="w-4 h-4 text-blue-400 animate-pulse" />
                      <span>🚀 En Ruta • Viajando a la dirección del cliente</span>
                    </div>
                    <button
                      onClick={() => handleUpdateState(order.id, 'DELIVERED')}
                      disabled={actionLoading === order.id}
                      className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 shadow-xl cursor-pointer active:scale-95 transition-all"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>✅ Confirmar Entregado al Cliente</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
