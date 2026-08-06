/**
 * @file page.tsx
 * @module app/driver
 * @description App Web de Repartidores para Citiox Enterprise vNext.
 * @responsibility Permitir a los repartidores conectarse, cambiar disponibilidad, ver pedidos asignados, Aceptar/Rechazar entregas y avanzar estados (ASSIGNED -> PICKED_UP -> ON_ROUTE -> DELIVERED).
 * @dependencies lucide-react, DeliveryEngine API
 * @status Stable (FASE 5E - Driver Workflow)
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Truck, CheckCircle, XCircle, Navigation, MapPin, Phone,
  Clock, ShieldAlert, PackageCheck, AlertCircle, RefreshCw, Power
} from 'lucide-react';

interface DriverTask {
  taskId: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  address: string;
  distanceKm: number;
  deliveryCost: number;
  state: 'WAITING_DISPATCH' | 'ASSIGNED' | 'PICKED_UP' | 'ON_ROUTE' | 'DELIVERED';
  createdAt: string;
}

export default function DriverAppPage() {
  const slug = 'parrilla-citiox-demo'; // Negocio piloto por defecto
  const [driverId, setDriverId] = useState<string>('driver-01');
  const [driverName, setDriverName] = useState<string>('Marco Proaño');
  const [driverPhone, setDriverPhone] = useState<string>('0991234567');
  const [status, setStatus] = useState<'DISPONIBLE' | 'DESCANSO' | 'DESCONECTADO'>('DISPONIBLE');

  const [assignedTasks, setAssignedTasks] = useState<DriverTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Cargar estado inicial y registrar repartidor
  useEffect(() => {
    registerDriver();
    const interval = setInterval(fetchDriverData, 5000);
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
        setAssignedTasks(data.tasks || []);
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

  const handleAcceptTask = async (taskId: string) => {
    setActionLoading(taskId);
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
      fetchDriverData();
    } catch (e) {
      console.error('Error aceptando pedido:', e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectTask = async (taskId: string) => {
    setActionLoading(taskId);
    try {
      await fetch(`/api/public/${slug}/driver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REJECT_TASK',
          taskId,
          driverId,
        }),
      });
      fetchDriverData();
    } catch (e) {
      console.error('Error rechazando pedido:', e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateDeliveryState = async (taskId: string, nextState: 'PICKED_UP' | 'ON_ROUTE' | 'DELIVERED') => {
    setActionLoading(taskId);
    try {
      await fetch(`/api/public/${slug}/driver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_DELIVERY_STATE',
          taskId,
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
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
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

      {/* Lista de Tareas Asignadas */}
      <div className="p-4 max-w-md mx-auto space-y-4">
        <h2 className="text-sm font-black uppercase text-slate-400 tracking-wider flex items-center justify-between">
          <span>Pedidos Asignados ({assignedTasks.length})</span>
          {status === 'DISPONIBLE' && (
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-bold animate-pulse">
              ● Esperando nuevos pedidos
            </span>
          )}
        </h2>

        {assignedTasks.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-8 text-center text-slate-500 space-y-3">
            <PackageCheck className="w-12 h-12 mx-auto text-slate-700" />
            <p className="font-bold text-sm text-slate-400">No tienes pedidos asignados actualmente.</p>
            <p className="text-xs text-slate-600">Mantente en estado DISPONIBLE para recibir asignaciones automáticas.</p>
          </div>
        ) : (
          assignedTasks.map((task) => (
            <div
              key={task.taskId}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 animate-in fade-in"
            >
              {/* Encabezado Pedido */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-xs text-slate-400 font-medium">Pedido #{task.orderId}</span>
                  <h3 className="font-extrabold text-white text-base">{task.customerName}</h3>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  {task.state}
                </span>
              </div>

              {/* Datos de Entrega */}
              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                  <span className="font-semibold text-slate-200">{task.address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                  <a href={`tel:${task.customerPhone}`} className="font-bold text-emerald-400 hover:underline">
                    {task.customerPhone}
                  </a>
                </div>
              </div>

              {/* Botones de Acción de Repartidor */}
              {task.state === 'ASSIGNED' && (
                <div className="pt-2 flex gap-2">
                  <button
                    onClick={() => handleRejectTask(task.taskId)}
                    disabled={actionLoading === task.taskId}
                    className="flex-1 py-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Rechazar</span>
                  </button>
                  <button
                    onClick={() => handleAcceptTask(task.taskId)}
                    disabled={actionLoading === task.taskId}
                    className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-all"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Aceptar Pedido</span>
                  </button>
                </div>
              )}

              {task.state === 'ASSIGNED' && (
                <button
                  onClick={() => handleUpdateDeliveryState(task.taskId, 'PICKED_UP')}
                  disabled={actionLoading === task.taskId}
                  className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>Marcar como Recogido en Cocina</span>
                </button>
              )}

              {task.state === 'PICKED_UP' && (
                <button
                  onClick={() => handleUpdateDeliveryState(task.taskId, 'ON_ROUTE')}
                  disabled={actionLoading === task.taskId}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Iniciar Ruta (En Camino)</span>
                </button>
              )}

              {task.state === 'ON_ROUTE' && (
                <button
                  onClick={() => handleUpdateDeliveryState(task.taskId, 'DELIVERED')}
                  disabled={actionLoading === task.taskId}
                  className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Confirmar Pedido Entregado</span>
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
