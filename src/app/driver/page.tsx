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

      {/* SECCIÓN 1: PEDIDOS DISPONIBLES EN BOLSA DE TRABAJO */}
      {status === 'DISPONIBLE' && openUnassignedOrders.length > 0 && (
        <div className="p-4 max-w-md mx-auto space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
              Bolsa de Pedidos Disponibles ({openUnassignedOrders.length})
            </h2>
          </div>

          {openUnassignedOrders.map(order => {
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
                    <h3 className="font-extrabold text-amber-300 text-xs mt-1">{order.nombreCliente}</h3>
                  </div>
                  <div className="bg-amber-400 text-slate-950 px-2.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 shadow-md">
                    <DollarSign className="w-3.5 h-3.5" /> Ganancia: ${deliveryFee}
                  </div>
                </div>

                {/* Detalles de Dirección, Distancia y Contenido de Mochila */}
                <div className="space-y-1.5 text-xs text-slate-300 bg-slate-950/70 p-3 rounded-xl border border-amber-500/20">
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">{order.direccionCliente || 'Dirección de Entrega'}</span>
                      {order.referenciaCliente && (
                        <p className="text-[10px] text-slate-400 font-medium">Ref: {order.referenciaCliente}</p>
                      )}
                    </div>
                  </div>

                  {itemsSummary && (
                    <div className="flex items-start gap-1.5 text-[11px] text-slate-300 pt-1 border-t border-slate-800">
                      <PackageCheck className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">Paquete: <strong>{itemsSummary}</strong></span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Prep. Cocina: <strong>{getCountdownString(extra?.estimatedReadyAt)}</strong></span>
                    </div>
                    <span className="text-emerald-400 font-bold">📍 {distanceStr}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleAcceptOrder(order.id)}
                  disabled={actionLoading === order.id}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs uppercase rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <CheckCircle className="w-4 h-4" />
                  Tomar este Pedido (${deliveryFee})
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* SECCIÓN 2: MIS PEDIDOS ACEPTADOS EN CURSO */}
      <div className="p-4 max-w-md mx-auto space-y-4">
        <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center justify-between">
          <span>Mis Entregas en Curso ({myAssignedOrders.length})</span>
          {status === 'DISPONIBLE' && (
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-bold animate-pulse">
              ● Monitoreando GPS
            </span>
          )}
        </h2>

        {myAssignedOrders.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-8 text-center text-slate-500 space-y-3">
            <PackageCheck className="w-12 h-12 mx-auto text-slate-700" />
            <p className="font-bold text-sm text-slate-400">No tienes entregas activas en curso.</p>
            <p className="text-xs text-slate-600">Revisa la Bolsa de Pedidos o mantente DISPONIBLE.</p>
          </div>
        ) : (
          myAssignedOrders.map((order) => {
            const isCashOnDelivery = order.paymentStatus !== 'PAGADO' && order.paymentStatus !== 'PAID';
            const deliveryFee = Number(order.costoEnvio || 2.50).toFixed(2);
            const totalToCollect = isCashOnDelivery ? Number(order.total).toFixed(2) : '0.00';

            return (
              <div
                key={order.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 relative"
              >
                {/* Header Card */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-xs text-slate-400 font-bold">Pedido #{order.codigo || order.id.slice(-6).toUpperCase()}</span>
                    <h3 className="font-extrabold text-white text-base">{order.nombreCliente}</h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-orange-500/20 text-orange-400 border border-orange-500/30">
                    {order.estado}
                  </span>
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

                {/* Tarjeta Financiera de Cobro / Ganancias */}
                <div className={`p-3.5 rounded-xl border space-y-1.5 text-xs ${
                  isCashOnDelivery 
                    ? 'bg-amber-950/40 border-amber-500/40 text-amber-200' 
                    : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                }`}>
                  <div className="flex justify-between items-center font-black">
                    <span>COBRO AL CLIENTE:</span>
                    <span className="text-sm">{isCashOnDelivery ? `💰 EFECTIVO: $${totalToCollect}` : '💳 $0.00 (PAGADO ONLINE)'}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] font-bold border-t border-slate-800 pt-1.5">
                    <span>TU GANANCIA DE ENVÍO:</span>
                    <span className="text-emerald-400 text-xs font-black">+${deliveryFee}</span>
                  </div>
                  <p className="text-[10px] font-medium text-slate-400">
                    {isCashOnDelivery 
                      ? ' Cobras la suma total en efectivo al cliente. Conservas tu envío y entregas el saldo del producto al restaurante.' 
                      : ' El cliente ya pagó online. Recibes el costo de envío del restaurante al entregar.'}
                  </p>
                </div>

                {/* Datos del Cliente & Mapa */}
                <div className="space-y-2 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <div className="flex items-start justify-between gap-1">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                      <div>
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
                        className="text-orange-400 hover:underline text-[10px] font-bold shrink-0 flex items-center gap-0.5"
                      >
                        <Map className="w-3 h-3" /> GPS
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

                {order.estado === 'REPARTIDOR_EN_LOCAL' && (
                  <div className="p-3 bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-extrabold text-center flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                    <span>En el Local • Esperando entrega del paquete por Cocina</span>
                  </div>
                )}

                {order.estado === 'ENTREGADO_A_REPARTIDOR' && (
                  <button
                    onClick={() => handleUpdateState(order.id, 'ON_ROUTE')}
                    disabled={actionLoading === order.id}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 shadow-xl cursor-pointer active:scale-95 transition-all"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>🛵 Iniciar Ruta de Entrega al Cliente</span>
                  </button>
                )}

                {order.estado === 'EN_CAMINO' || order.estado === 'EN_RUTA' ? (
                  <button
                    onClick={() => handleUpdateState(order.id, 'DELIVERED')}
                    disabled={actionLoading === order.id}
                    className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 shadow-xl cursor-pointer active:scale-95 transition-all"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>✅ Confirmar Entregado al Cliente</span>
                  </button>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
