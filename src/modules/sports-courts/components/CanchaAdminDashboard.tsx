// src/modules/sports-courts/components/CanchaAdminDashboard.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Rocket, 
  Calendar as CalendarIcon, 
  DollarSign, 
  Users, 
  TrendingUp, 
  Activity, 
  Clock, 
  Plus, 
  Trophy, 
  Dribbble, 
  Lock, 
  Tag, 
  Mail, 
  Layout, 
  Contact, 
  Settings, 
  Building2, 
  Package, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Zap,
  BarChart2,
  Wrench,
  ExternalLink,
  Layers
} from 'lucide-react';
import ResourceScheduleGrid, { GridAppointmentItem } from '@/components/admin/ResourceScheduleGrid';
import AppointmentDrawer from '@/components/admin/AppointmentDrawer';
import QuickBlockModal from '@/components/admin/QuickBlockModal';
import QuickBookingModal from '@/components/admin/QuickBookingModal';
import { OperableResource } from '@/core/resources/types';

export interface CanchaAdminDashboardProps {
  negocio: any;
}

export default function CanchaAdminDashboard({ negocio }: CanchaAdminDashboardProps) {
  const isDemo = negocio?.isDemo !== false;

  // Estado de fecha actual
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Pestaña activa de tiempo: 'today' | 'tomorrow' | 'week'
  const [timeTab, setTimeTab] = useState<'today' | 'tomorrow' | 'week'>('today');

  // Datos de la Grilla
  const [resources, setResources] = useState<OperableResource[]>([]);
  const [appointments, setAppointments] = useState<GridAppointmentItem[]>([]);
  const [stats, setStats] = useState<{
    totalReservas: number;
    pendientes: number;
    ingresos: number;
    ocupacionPercent: number;
    occupancyByHour: Record<string, number>;
  }>({
    totalReservas: 0,
    pendientes: 0,
    ingresos: 0,
    ocupacionPercent: 0,
    occupancyByHour: {},
  });

  const [loading, setLoading] = useState(true);
  const [granularity, setGranularity] = useState<number>(60); // 60 o 90 min
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');

  // Modales y Drawer
  const [selectedAppointment, setSelectedAppointment] = useState<GridAppointmentItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
  const [modalResourceId, setModalResourceId] = useState<string>('');
  const [modalTime, setModalTime] = useState<string>('08:00');

  // Reloj en vivo para la sección "AHORA"
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hh = now.getHours().toString().padStart(2, '0');
      const mm = now.getMinutes().toString().padStart(2, '0');
      setCurrentTimeStr(`${hh}:${mm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Cargar datos de la grilla
  const fetchData = async (date: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/canchas/grilla?date=${date}`);
      if (res.ok) {
        const d = await res.json();
        setResources(d.resources || []);
        const newApps = d.appointments || [];
        setAppointments(newApps);
        setSelectedAppointment((prev) => {
          if (!prev) return null;
          const found = newApps.find((a: GridAppointmentItem) => a.id === prev.id);
          return found || prev;
        });
        if (d.stats) setStats(d.stats);
      }
    } catch (e) {
      console.error('Error cargando grilla de canchas:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedDate);
  }, [selectedDate]);

  // Manejo de navegación temporal (Días de la semana)
  const todayDateStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const weekDays = useMemo(() => {
    const curr = new Date(selectedDate + 'T00:00:00');
    // Generar 5 días alrededor de la fecha seleccionada
    const days = [];
    const base = new Date();
    for (let i = -2; i <= 2; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const dStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('es-ES', { weekday: 'short' });
      const dayNum = d.getDate();
      days.push({
        dateStr: dStr,
        dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1, 3),
        dayNum,
        isToday: dStr === todayDateStr,
      });
    }
    return days;
  }, [selectedDate, todayDateStr]);

  const handleSelectDay = (dStr: string) => {
    setSelectedDate(dStr);
    if (dStr === todayDateStr) setTimeTab('today');
    else setTimeTab('week');
  };

  const handlePrevDay = () => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleSetToday = () => {
    setSelectedDate(todayDateStr);
    setTimeTab('today');
  };

  const handleSetTomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const tomStr = d.toISOString().split('T')[0];
    setSelectedDate(tomStr);
    setTimeTab('tomorrow');
  };

  // Click en Celda Libre -> Abrir modal de reserva
  const handleSlotClick = (resourceId: string, time: string) => {
    setModalResourceId(resourceId);
    setModalTime(time);
    setIsReserveModalOpen(true);
  };

  // Click en Bloquear Celda
  const handleBlockClick = (resourceId: string, time: string) => {
    setModalResourceId(resourceId);
    setModalTime(time);
    setIsBlockModalOpen(true);
  };

  // Click en Cita existente -> Abrir Drawer lateral
  const handleAppointmentClick = (app: GridAppointmentItem) => {
    setSelectedAppointment(app);
    setIsDrawerOpen(true);
  };

  // Acciones en Drawer
  const handleUpdateStatus = async (appId: string, newStatus: string) => {
    await fetch(`/api/appointments/${appId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: newStatus }),
    });
    fetchData(selectedDate);
    if (selectedAppointment && selectedAppointment.id === appId) {
      setSelectedAppointment({ ...selectedAppointment, status: newStatus as any });
    }
  };

  const handleUpdatePayment = async (appId: string, newPayment: string) => {
    // Si la reserva tiene pago directo
    await fetch(`/api/appointments/${appId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pagoEstado: newPayment }),
    });
    fetchData(selectedDate);
    if (selectedAppointment && selectedAppointment.id === appId) {
      setSelectedAppointment({ ...selectedAppointment, pagoEstado: newPayment });
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    await fetch('/api/admin/canchas/grilla', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'UNBLOCK', id: blockId }),
    });
    fetchData(selectedDate);
  };

  // Monitoreo en vivo: Determinar estado actual de cada cancha (Módulo "AHORA")
  const currentCourtsStatus = useMemo(() => {
    if (!currentTimeStr) return [];
    const [currentH, currentM] = currentTimeStr.split(':').map(Number);
    const currentTotalMin = currentH * 60 + currentM;

    return resources.map((r) => {
      // Buscar si tiene turno activo en este minuto exacto
      const activeApp = appointments.find((app) => {
        if (app.resourceId !== r.id) return false;
        const [sH, sM] = app.startTime.split(':').map(Number);
        const [eH, eM] = app.endTime.split(':').map(Number);
        const startMin = sH * 60 + sM;
        const endMin = eH * 60 + eM;
        return currentTotalMin >= startMin && currentTotalMin < endMin;
      });

      // Próxima reserva del día
      const upcoming = appointments
        .filter((app) => {
          if (app.resourceId !== r.id) return false;
          const [sH, sM] = app.startTime.split(':').map(Number);
          return (sH * 60 + sM) > currentTotalMin;
        })
        .sort((a, b) => a.startTime.localeCompare(b.startTime))[0];

      return {
        resource: r,
        activeApp,
        upcoming,
      };
    });
  }, [resources, appointments, currentTimeStr]);

  const canchasDisponiblesAhora = currentCourtsStatus.filter((c) => !c.activeApp).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-32 space-y-8">
      {/* 1. TOP BAR DEMO AMBER (si aplica) */}
      {isDemo && (
        <div className="bg-amber-500 text-slate-950 px-6 py-2 flex items-center justify-between gap-4 shadow-sm z-[40]">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full justify-between">
            <div className="flex items-center gap-2">
              <Rocket className="size-4" />
              <span className="text-xs font-black uppercase tracking-wider">
                Modo Demo Activo — Vista Previa Operativa
              </span>
            </div>
            <Link
              href="/register"
              className="bg-white text-slate-950 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all shadow-sm"
            >
              Activar Mi Negocio
            </Link>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-8 space-y-8">
        {/* 2. HEADER Y NAVEGACIÓN TEMPORAL */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                Centro de Operaciones
              </span>
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight uppercase italic">
              Canchas Deportivas
            </h1>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Control en vivo de turnos, estado de canchas y gestión de clientes
            </p>
          </div>

          {/* Navegación de Fechas Rápida */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {/* Botones Hoy / Mañana */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl w-full sm:w-auto justify-center">
              <button
                onClick={handleSetToday}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  selectedDate === todayDateStr
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hoy
              </button>
              <button
                onClick={handleSetTomorrow}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  timeTab === 'tomorrow'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Mañana
              </button>
            </div>

            {/* Selector de Días con Flechas */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-2xl shadow-xs">
              <button
                onClick={handlePrevDay}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors"
                title="Día Anterior"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex items-center gap-1 px-1">
                {weekDays.map((d) => (
                  <button
                    key={d.dateStr}
                    onClick={() => handleSelectDay(d.dateStr)}
                    className={`flex flex-col items-center px-3 py-1.5 rounded-xl text-center transition-all ${
                      selectedDate === d.dateStr
                        ? 'bg-slate-900 text-white font-black shadow-xs'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span className="text-[9px] uppercase tracking-wider opacity-80">{d.dayName}</span>
                    <span className="text-xs font-bold leading-tight">{d.dayNum}</span>
                    {d.isToday && (
                      <span className={`size-1.5 rounded-full mt-0.5 ${selectedDate === d.dateStr ? 'bg-emerald-400' : 'bg-emerald-600'}`} />
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={handleNextDay}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors"
                title="Día Siguiente"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Botón Recargar */}
            <button
              onClick={() => fetchData(selectedDate)}
              className="p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-all shadow-xs"
              title="Actualizar datos"
            >
              <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 3. MÉTRICAS CLAVE DE OPERACIÓN (5 KPIs de Alto Impacto) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
              Reservas Hoy
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-slate-900">{stats.totalReservas}</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase">Turnos</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
              Ocupación
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-emerald-600">{stats.ocupacionPercent}%</span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                Estimada
              </span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
              Ingresos
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-slate-900">${stats.ingresos.toLocaleString()}</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase">Día</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
              Por Confirmar
            </span>
            <div className="flex items-baseline justify-between">
              <span className={`text-3xl font-black ${stats.pendientes > 0 ? 'text-amber-500' : 'text-slate-900'}`}>
                {stats.pendientes}
              </span>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                Pendientes
              </span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
              Canchas Libres
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-emerald-600">{canchasDisponiblesAhora}</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase">
                de {resources.length}
              </span>
            </div>
          </div>
        </div>

        {/* 4. SECCIÓN "AHORA" — MONITOREO EN TIEMPO REAL */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="size-3 rounded-full bg-emerald-500 animate-ping" />
              <div>
                <h2 className="text-lg font-black uppercase tracking-tight text-slate-900 flex items-center gap-2">
                  AHORA <span className="font-mono text-emerald-600">— {currentTimeStr || '18:30'}</span>
                </h2>
                <p className="text-xs text-slate-500 font-semibold">
                  Visión inmediata de qué ocurre en cada una de tus canchas en este minuto
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/admin/canchas"
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <Settings size={14} /> Administrar Canchas
              </Link>
            </div>
          </div>

          {/* Tarjetas por Cancha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentCourtsStatus.length === 0 ? (
              <div className="col-span-full py-8 text-center text-slate-400 text-xs font-bold">
                No tienes canchas registradas. Crea tu primera cancha en el menú Canchas.
              </div>
            ) : (
              currentCourtsStatus.map(({ resource, activeApp, upcoming }) => {
                const isBlocked = activeApp?.isBlock || activeApp?.status === 'blocked';
                const isOccupied = !!activeApp && !isBlocked;

                return (
                  <div
                    key={resource.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      isBlocked
                        ? 'bg-slate-900 border-slate-800 text-white'
                        : isOccupied
                        ? 'bg-emerald-50/70 border-emerald-200/90 text-slate-900'
                        : 'bg-white border-slate-200 hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`size-3 rounded-full ${
                          isBlocked ? 'bg-slate-400' : isOccupied ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                        }`} />
                        <h3 className="font-black text-sm uppercase tracking-tight">
                          {resource.name}
                        </h3>
                      </div>
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isBlocked
                          ? 'bg-slate-800 text-slate-300'
                          : isOccupied
                          ? 'bg-emerald-200/80 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {isBlocked ? 'Mantenimiento' : isOccupied ? 'En Uso' : 'Disponible'}
                      </span>
                    </div>

                    {/* Estado del Turno Actual */}
                    {activeApp ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs">
                            {isBlocked ? activeApp.motivo || 'Bloqueada' : activeApp.clientName}
                          </span>
                          <span className="font-mono text-xs font-bold">
                            {activeApp.startTime} – {activeApp.endTime}
                          </span>
                        </div>
                        {!isBlocked && (
                          <div className="flex items-center justify-between text-[10px] text-slate-600">
                            <span>{activeApp.serviceName}</span>
                            <span className="font-black text-emerald-700">
                              {activeApp.pagoEstado === 'PAGADO' ? '✓ Pagado' : '$ Pago Pendiente'}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-xs text-slate-500 font-semibold">Cancha libre en este momento</p>
                        {upcoming ? (
                          <p className="text-[11px] text-slate-600">
                            Próximo turno: <strong>{upcoming.startTime}</strong> ({upcoming.clientName})
                          </p>
                        ) : (
                          <p className="text-[10px] text-slate-400 italic">Sin más reservas programadas hoy</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 5. GRILLA OPERATIVA (LA PROTAGONISTA) */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 italic">
                Grilla de Turnos por Cancha
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Haz clic en una celda libre para reservar o bloquear, o en una reserva para gestionarla
              </p>
            </div>

            {/* Controles de Grilla */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl text-xs font-bold text-slate-600 shadow-xs">
                <span className="px-2 text-[10px] text-slate-400 uppercase">Franja:</span>
                <button
                  onClick={() => setGranularity(60)}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    granularity === 60 ? 'bg-slate-900 text-white font-black' : 'hover:bg-slate-100'
                  }`}
                >
                  60m
                </button>
                <button
                  onClick={() => setGranularity(90)}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    granularity === 90 ? 'bg-slate-900 text-white font-black' : 'hover:bg-slate-100'
                  }`}
                >
                  90m (Pádel)
                </button>
              </div>

              <button
                onClick={() => {
                  setModalResourceId(resources[0]?.id || '');
                  setModalTime('10:00');
                  setIsReserveModalOpen(true);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs transition-all"
              >
                <Plus size={14} /> Nueva Reserva
              </button>
            </div>
          </div>

          <ResourceScheduleGrid
            resources={resources}
            appointments={appointments}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onSlotClick={handleSlotClick}
            onAppointmentClick={handleAppointmentClick}
            onBlockClick={handleBlockClick}
            granularityMinutes={granularity}
            enableNightLightingFee={true}
            nightLightingStartHour={18}
          />
        </div>

        {/* 6. OCUPACIÓN POR HORA (ANÁLISIS OPERATIVO RÁPIDO) */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
                <BarChart2 size={18} />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base uppercase tracking-tight">
                  Curva de Ocupación Horaria
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Detecta fácilmente horas pico y horarios con baja demanda para aplicar promociones
                </p>
              </div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Total Canchas: {resources.length}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
            {Object.entries(stats.occupancyByHour || {}).map(([hour, count]) => {
              const maxCourts = Math.max(resources.length, 1);
              const pct = Math.min(Math.round((count / maxCourts) * 100), 100);
              const isPeak = pct >= 80;
              const isDead = pct === 0;

              return (
                <div
                  key={hour}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    isPeak
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : isDead
                      ? 'bg-slate-50 border-slate-200/60 text-slate-400'
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  <span className="text-[11px] font-mono font-bold block">{hour}:00</span>
                  <div className="w-full bg-slate-200/60 rounded-full h-1.5 my-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isPeak ? 'bg-emerald-600' : 'bg-slate-700'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-black block">
                    {count} {count === 1 ? 'cancha' : 'canchas'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 7. MODALES Y DRAWER LATERAL */}
      <AppointmentDrawer
        appointment={selectedAppointment}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onUpdateStatus={handleUpdateStatus}
        onUpdatePayment={handleUpdatePayment}
        onDeleteBlock={handleDeleteBlock}
        onRefresh={() => fetchData(selectedDate)}
      />

      <QuickBookingModal
        isOpen={isReserveModalOpen}
        onClose={() => setIsReserveModalOpen(false)}
        resources={resources}
        selectedResourceId={modalResourceId}
        selectedDate={selectedDate}
        selectedTime={modalTime}
        onBookingCreated={() => fetchData(selectedDate)}
      />

      <QuickBlockModal
        isOpen={isBlockModalOpen}
        onClose={() => setIsBlockModalOpen(false)}
        resources={resources}
        selectedResourceId={modalResourceId}
        selectedDate={selectedDate}
        selectedTime={modalTime}
        onBlockCreated={() => fetchData(selectedDate)}
      />
    </div>
  );
}
