/**
 * @file page.tsx
 * @module app/[slug]/admin/delivery
 * @description Módulo Enterprise de Administración de Delivery y Repartidores (FASE 5E).
 * @responsibility Administrar la flota de repartidores, la cola de pedidos pendientes de despacho, asignación manual/automática y configuración de tarifas de delivery por zonas y distancia.
 * @dependencies lucide-react, DeliveryEngine API, BusinessRuntimeResolver
 * @status Stable (FASE 5E - Delivery Management)
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Truck, UserCheck, Clock, MapPin, CheckCircle2, ShieldAlert,
  Send, RefreshCw, Sliders, DollarSign, Navigation, ArrowRight
} from 'lucide-react';
import Link from 'next/link';

interface Driver {
  driverId: string;
  name: string;
  phone: string;
  vehicleType: string;
  status: 'DISPONIBLE' | 'DESCANSO' | 'OCUPADO' | 'DESCONECTADO';
}

interface DeliveryTask {
  taskId: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  address: string;
  distanceKm: number;
  deliveryCost: number;
  driverId?: string;
  state: 'WAITING_DISPATCH' | 'ASSIGNED' | 'PICKED_UP' | 'ON_ROUTE' | 'DELIVERED';
  createdAt: string;
}

export default function DeliveryAdminPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = React.use(params);
  const slug = resolvedParams.slug;

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [tasks, setTasks] = useState<DeliveryTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<string>('');

  // Cargar datos de Delivery Engine
  useEffect(() => {
    fetchDeliveryData();
    const interval = setInterval(fetchDeliveryData, 5000);
    return () => clearInterval(interval);
  }, [slug]);

  const fetchDeliveryData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/public/${slug}/driver`);
      if (res.ok) {
        const data = await res.json();
        setDrivers(data.drivers || []);
        setTasks(data.tasks || []);
      }
    } catch (e) {
      console.error('Error cargando panel de delivery:', e);
    } fontally: {
      setLoading(false);
    }
  };

  const handleManualAssign = async (taskId: string, driverId: string) => {
    if (!driverId) return;
    try {
      await fetch(`/api/public/${slug}/driver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ACCEPT_TASK',
          taskId,
          driverId,
        }),
      });
      fetchDeliveryData();
    } catch (e) {
      console.error('Error en asignación manual:', e);
    }
  };

  const pendingTasks = tasks.filter(t => t.state === 'WAITING_DISPATCH');
  const activeTasks = tasks.filter(t => t.state === 'ASSIGNED' || t.state === 'PICKED_UP' || t.state === 'ON_ROUTE');
  const completedTasks = tasks.filter(t => t.state === 'DELIVERED');

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans p-6 space-y-6">
      {/* Header Admin */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-600/20 text-orange-500 rounded-2xl border border-orange-500/30">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">Panel de Delivery & Logística</h1>
              <p className="text-xs text-slate-400">Citiox Enterprise vNext • Control de Flota y Entregas</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/driver`}
            target="_blank"
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md"
          >
            <Navigation className="w-4 h-4" />
            <span>Abrir App Repartidor</span>
          </Link>
          <button
            onClick={fetchDeliveryData}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Grid de Estado de Flota y Pedidos */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">
            {drivers.filter(d => d.status === 'DISPONIBLE').length}
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold block">Repartidores Libres</span>
            <span className="text-sm font-black text-emerald-400">Listos para Despacho</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black">
            {pendingTasks.length}
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold block">En Cola de Despacho</span>
            <span className="text-sm font-black text-amber-400">Esperando Asignación</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-black">
            {activeTasks.length}
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold block">En Ruta / Recogidos</span>
            <span className="text-sm font-black text-blue-400">En Tránsito</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black">
            {completedTasks.length}
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold block">Entregados Hoy</span>
            <span className="text-sm font-black text-indigo-400">Completados</span>
          </div>
        </div>
      </div>

      {/* Sección Principal: Repartidores & Pedidos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna 1: Repartidores */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-orange-500" />
            <span>Estado de Repartidores ({drivers.length})</span>
          </h2>

          {drivers.length === 0 ? (
            <p className="text-xs text-slate-500">No hay repartidores registrados en este momento.</p>
          ) : (
            <div className="space-y-3">
              {drivers.map(driver => (
                <div key={driver.driverId} className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-sm text-white">{driver.name}</h3>
                    <p className="text-xs text-slate-400">{driver.phone || 'Sin WhatsApp'} • {driver.vehicleType}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase ${
                    driver.status === 'DISPONIBLE' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    driver.status === 'OCUPADO' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {driver.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Columna 2 y 3: Cola de Pedidos y Despacho */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-400" />
            <span>Despacho de Pedidos ({tasks.length})</span>
          </h2>

          {tasks.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <CheckCircle2 className="w-12 h-12 mx-auto text-slate-700" />
              <p className="font-bold text-sm text-slate-400">No hay pedidos pendientes de delivery.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map(task => (
                <div key={task.taskId} className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-white text-sm">Pedido #{task.orderId}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        task.state === 'WAITING_DISPATCH' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        task.state === 'ASSIGNED' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                        task.state === 'ON_ROUTE' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                        'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {task.state}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-300">{task.customerName} • {task.customerPhone}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-orange-400" />
                      {task.address}
                    </p>
                  </div>

                  {/* Asignación Manual */}
                  {task.state === 'WAITING_DISPATCH' && (
                    <div className="flex items-center gap-2 w-full md:w-auto">
                      <select
                        onChange={(e) => setSelectedDriver(e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-none"
                      >
                        <option value="">Seleccionar Repartidor...</option>
                        {drivers.filter(d => d.status === 'DISPONIBLE').map(d => (
                          <option key={d.driverId} value={d.driverId}>{d.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleManualAssign(task.taskId, selectedDriver)}
                        disabled={!selectedDriver}
                        className="px-3.5 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shrink-0"
                      >
                        Asignar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
